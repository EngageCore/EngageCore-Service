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

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error acquiring client', err.stack);
    return;
  }
  logger.info('Database connected successfully');
  release();
});

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

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  
  // Transaction helper
  transaction: async (callback) => {
    const client = await pool.connect();
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