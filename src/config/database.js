const { Pool } = require('pg');
const logger = require('../utils/logger');

// PostgreSQL connection configuration optimized for millions of records
const dbConfig = {
  host: process.env.DB_HOST || '54.250.29.129',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'EngageCore',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  
  // Optimized connection pool settings for high concurrency
  max: parseInt(process.env.DB_POOL_MAX) || 50,        // Maximum connections in pool
  min: parseInt(process.env.DB_POOL_MIN) || 10,        // Minimum connections to maintain
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 60000,     // Close idle connections after 1 minute
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000, // Wait 5 seconds for connection
  maxUses: 10000,                                      // Close connection after 10k uses
  
  // Performance optimizations
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000, // 30 second query timeout
  query_timeout: 30000,
  
  // SSL and security
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Application name for monitoring
  application_name: 'engage-service',
  
  // Additional performance settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection only in non-test environments and when not in serverless
// Skip immediate connection test for Vercel/serverless environments
const shouldTestConnection = process.env.NODE_ENV !== 'test' && 
                            !process.env.VERCEL && 
                            !process.env.AWS_LAMBDA_FUNCTION_NAME &&
                            process.env.DB_TEST_ON_STARTUP !== 'false';

if (shouldTestConnection) {
  // Use a timeout to prevent hanging in serverless environments
  const connectionTimeout = setTimeout(() => {
    logger.warn('Database connection test timed out - continuing without immediate verification');
  }, 5000);

  pool.connect((err, client, release) => {
    clearTimeout(connectionTimeout);
    if (err) {
      logger.warn('Database connection test failed - will retry on first query', {
        error: err.message,
        host: dbConfig.host,
        database: dbConfig.database
      });
      return;
    }
    logger.info('Database connected successfully');
    release();
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Closing database pool...');
  pool.end(() => {
    logger.info('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Closing database pool...');
  pool.end(() => {
    logger.info('Database pool closed');
    process.exit(0);
  });
});

// Connection retry helper
const connectWithRetry = async (maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      return client;
    } catch (error) {
      logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed`, {
        error: error.message,
        attempt,
        maxRetries
      });
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

// Enhanced query method with retry logic
const queryWithRetry = async (text, params = [], maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (error) {
      logger.warn(`Query attempt ${attempt}/${maxRetries} failed`, {
        error: error.message,
        query: text.substring(0, 100) + '...',
        attempt
      });
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
};

module.exports = {
  pool,
  query: queryWithRetry,
  getClient: connectWithRetry,
  
  // Legacy method for backward compatibility
  connect: () => pool.connect(),
  
  // Health check method
  healthCheck: async () => {
    try {
      const client = await connectWithRetry(1, 0); // Single attempt for health check
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      client.release();
      return {
        status: 'healthy',
        timestamp: result.rows[0].current_time,
        version: result.rows[0].db_version,
        poolStats: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },
  
  // Transaction helper
  transaction: async (callback) => {
    const client = await connectWithRetry();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};