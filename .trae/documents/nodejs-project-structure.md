# Node.js Project Structure - Best Practices

## Project Folder Structure

```
engage-service/
├── src/
│   ├── config/
│   │   ├── database.js          # Database configuration with pooling
│   │   ├── jwt.js               # JWT configuration
│   │   ├── performance.js       # Database performance settings
│   │   └── index.js             # Main config exports
│   ├── controllers/
│   │   ├── auth.controller.js   # Authentication endpoints
│   │   ├── brand.controller.js  # Brand management
│   │   ├── user.controller.js   # User management
│   │   ├── member.controller.js # Member operations
│   │   ├── wheel.controller.js  # Lucky wheel operations
│   │   ├── mission.controller.js# Mission/quest operations
│   │   ├── transaction.controller.js # Transaction management
│   │   └── admin.controller.js  # Admin operations
│   ├── services/
│   │   ├── auth.service.js      # Authentication business logic
│   │   ├── brand.service.js     # Brand business logic
│   │   ├── member.service.js    # Member business logic
│   │   ├── wheel.service.js     # Wheel spinning logic
│   │   ├── mission.service.js   # Mission completion logic
│   │   ├── transaction.service.js # Transaction processing
│   │   ├── notification.service.js # Notification handling
│   │   └── audit.service.js     # Audit logging
│   ├── repositories/
│   │   ├── base.repository.js   # Base repository class
│   │   ├── brand.repository.js  # Brand data access
│   │   ├── user.repository.js   # User data access
│   │   ├── member.repository.js # Member data access
│   │   ├── wheel.repository.js  # Wheel data access
│   │   ├── mission.repository.js# Mission data access
│   │   └── transaction.repository.js # Transaction data access
│   ├── middleware/
│   │   ├── auth.middleware.js   # JWT authentication
│   │   ├── brand.middleware.js  # Brand context
│   │   ├── validation.middleware.js # Request validation
│   │   ├── rateLimit.middleware.js # Rate limiting
│   │   ├── cors.middleware.js   # CORS configuration
│   │   └── error.middleware.js  # Error handling
│   ├── routes/
│   │   ├── auth.routes.js       # Authentication routes
│   │   ├── brand.routes.js      # Brand routes
│   │   ├── user.routes.js       # User routes
│   │   ├── member.routes.js     # Member routes
│   │   ├── wheel.routes.js      # Wheel routes
│   │   ├── mission.routes.js    # Mission routes
│   │   ├── transaction.routes.js# Transaction routes
│   │   ├── admin.routes.js      # Admin routes
│   │   └── index.js             # Route aggregator
│   ├── validators/
│   │   ├── auth.validator.js    # Auth request validation
│   │   ├── brand.validator.js   # Brand validation schemas
│   │   ├── member.validator.js  # Member validation
│   │   ├── wheel.validator.js   # Wheel validation
│   │   └── mission.validator.js # Mission validation
│   ├── utils/
│   │   ├── logger.js            # Winston logger setup
│   │   ├── response.js          # Standardized API responses
│   │   ├── encryption.js        # Password hashing utilities
│   │   ├── jwt.js               # JWT token utilities
│   │   ├── probability.js       # Wheel probability calculations
│   │   ├── dbMonitor.js         # Database performance monitoring
│   │   ├── maintenance.js       # Database maintenance utilities
│   │   └── constants.js         # Application constants
│   ├── database/
│   │   ├── connection.js        # Database connection pool
│   │   ├── migrations/          # Database migration files
│   │   │   ├── 001_create_brands.sql
│   │   │   ├── 002_create_users.sql
│   │   │   ├── 003_create_members.sql
│   │   │   ├── 004_create_partitions.sql
│   │   │   ├── 005_create_indexes.sql
│   │   │   ├── 006_create_materialized_views.sql
│   │   │   └── ...
│   │   ├── seeds/               # Database seed files
│   │   │   ├── brands.sql
│   │   │   └── membership_tiers.sql
│   │   ├── maintenance/         # Database maintenance scripts
│   │   │   ├── partition_manager.js
│   │   │   ├── index_optimizer.js
│   │   │   └── cleanup_tasks.js
│   │   └── monitoring/          # Performance monitoring
│   │       ├── query_analyzer.js
│   │       └── performance_metrics.js
│   └── app.js                   # Express app setup
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── utils/
│   ├── integration/
│   │   ├── auth.test.js
│   │   ├── wheel.test.js
│   │   └── mission.test.js
│   └── fixtures/
│       └── testData.js
├── docs/
│   ├── api/
│   │   └── swagger.yaml         # API documentation
│   └── deployment/
│       └── docker-compose.yml
├── logs/
│   ├── app.log
│   ├── error.log
│   └── audit.log
├── uploads/                     # File upload directory
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── .gitignore
├── package.json
├── package-lock.json
├── server.js                    # Application entry point
├── ecosystem.config.js          # PM2 configuration
├── cron-jobs.js                 # Database maintenance cron jobs
└── README.md
```

## Key Configuration Files

### Database Configuration (`src/config/database.js`)

```javascript
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

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};
```

### Environment Configuration (`.env`)

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database Configuration
DB_HOST=54.250.29.129
DB_PORT=5432
DB_NAME=EngageCore
DB_USER=postgres
DB_PASSWORD=123456
DB_MAX_CONNECTIONS=20

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=7d

# Database Performance Configuration
DB_POOL_MIN=10
DB_POOL_MAX=50
DB_IDLE_TIMEOUT=60000
DB_CONNECTION_TIMEOUT=5000
DB_STATEMENT_TIMEOUT=30000

# File Upload Configuration
UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
ERROR_LOG_FILE=logs/error.log
AUDIT_LOG_FILE=logs/audit.log

# Brand Settings
DEFAULT_BRAND_SLUG=default
MAX_DAILY_SPINS=3
DEFAULT_MEMBER_POINTS=0
```

### Package.json Dependencies

```json
{
  "name": "engage-service",
  "version": "1.0.0",
  "description": "Lucky Wheel Engagement Service Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "migrate": "node src/database/migrate.js",
    "seed": "node src/database/seed.js",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "node-cron": "^3.0.2",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "joi": "^17.9.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "multer": "^1.4.5-lts.1",
    "winston": "^3.10.0",
    "winston-daily-rotate-file": "^4.7.1",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0",
    "moment": "^2.29.4",
    "lodash": "^4.17.21",
    "express-validator": "^7.0.1",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "supertest": "^6.3.3",
    "eslint": "^8.46.0",
    "eslint-config-airbnb-base": "^15.0.0",
    "eslint-plugin-import": "^2.28.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Application Entry Point (`server.js`)

```javascript
require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const db = require('./src/config/database');

const PORT = process.env.PORT || 3000;

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    db.pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    db.pool.end();
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = server;
```

### Express App Setup (`src/app.js`)

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const errorMiddleware = require('./middleware/error.middleware');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorMiddleware);

module.exports = app;
```

### Base Repository Pattern (`src/repositories/base.repository.js`)

```javascript
const db = require('../config/database');
const logger = require('../utils/logger');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding ${this.tableName} by id:`, error);
      throw error;
    }
  }

  async findAll(conditions = {}, limit = 100, offset = 0) {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      let paramIndex = 1;

      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map(key => {
            params.push(conditions[key]);
            return `${key} = $${paramIndex++}`;
          })
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
      }

      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(limit, offset);

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`Error finding all ${this.tableName}:`, error);
      throw error;
    }
  }

  async create(data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${this.tableName} (${keys.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating ${this.tableName}:`, error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = keys
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [id, ...values]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error updating ${this.tableName}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error deleting ${this.tableName}:`, error);
      throw error;
    }
  }

  async count(conditions = {}) {
    try {
      let query = `SELECT COUNT(*) FROM ${this.tableName}`;
      const params = [];
      let paramIndex = 1;

      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map(key => {
            params.push(conditions[key]);
            return `${key} = $${paramIndex++}`;
          })
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error(`Error counting ${this.tableName}:`, error);
      throw error;
    }
  }
}

module.exports = BaseRepository;
```

### Database Performance Monitoring Utility (`src/utils/dbMonitor.js`)

```javascript
const db = require('../config/database');
const logger = require('./logger');

class DatabaseMonitor {
  // Monitor connection pool status
  static async getPoolStatus() {
    try {
      const result = await db.query(`
        SELECT 
          state,
          COUNT(*) as connections,
          MAX(state_change) as last_change
        FROM pg_stat_activity 
        WHERE datname = $1
        GROUP BY state
      `, [process.env.DB_NAME || 'EngageCore']);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting pool status:', error);
      throw error;
    }
  }

  // Get slow queries
  static async getSlowQueries(limit = 10) {
    try {
      const result = await db.query(`
        SELECT 
          query,
          mean_exec_time,
          calls,
          total_exec_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        ORDER BY mean_exec_time DESC 
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting slow queries:', error);
      throw error;
    }
  }

  // Get table sizes
  static async getTableSizes() {
    try {
      const result = await db.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting table sizes:', error);
      throw error;
    }
  }

  // Monitor index usage
  static async getIndexUsage() {
    try {
      const result = await db.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch,
          pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
        FROM pg_stat_user_indexes 
        ORDER BY idx_scan DESC
      `);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting index usage:', error);
      throw error;
    }
  }

  // Get cache hit ratio
  static async getCacheHitRatio() {
    try {
      const result = await db.query(`
        SELECT 
          'index hit rate' as name,
          (sum(idx_blks_hit)) / nullif(sum(idx_blks_hit + idx_blks_read),0) as ratio
        FROM pg_statio_user_indexes
        UNION ALL
        SELECT 
          'table hit rate' as name,
          sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read),0) as ratio
        FROM pg_statio_user_tables
      `);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting cache hit ratio:', error);
      throw error;
    }
  }
}

module.exports = DatabaseMonitor;
```

### Database Maintenance Utility (`src/utils/maintenance.js`)

```javascript
const db = require('../config/database');
const logger = require('./logger');
const cron = require('node-cron');

class DatabaseMaintenance {
  // Create new partition for next month
  static async createNextMonthPartition(tableName) {
    try {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      
      const startDate = nextMonth.toISOString().split('T')[0];
      const endDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1)
        .toISOString().split('T')[0];
      
      const partitionName = `${tableName}_${nextMonth.getFullYear()}_${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${tableName}
        FOR VALUES FROM ('${startDate}') TO ('${endDate}')
      `);
      
      logger.info(`Created partition ${partitionName}`);
    } catch (error) {
      logger.error(`Error creating partition for ${tableName}:`, error);
      throw error;
    }
  }

  // Drop old partitions (keep 2 years of data)
  static async dropOldPartitions(tableName, monthsToKeep = 24) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
      
      const result = await db.query(`
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename LIKE '${tableName}_%' 
        AND schemaname = 'public'
      `);
      
      for (const row of result.rows) {
        const match = row.tablename.match(/_([0-9]{4})_([0-9]{2})$/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]);
          const partitionDate = new Date(year, month - 1, 1);
          
          if (partitionDate < cutoffDate) {
            await db.query(`DROP TABLE IF EXISTS ${row.tablename}`);
            logger.info(`Dropped old partition ${row.tablename}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Error dropping old partitions for ${tableName}:`, error);
      throw error;
    }
  }

  // Refresh materialized views
  static async refreshMaterializedViews() {
    try {
      const views = ['daily_engagement_stats', 'member_leaderboard'];
      
      for (const view of views) {
        await db.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
        logger.info(`Refreshed materialized view ${view}`);
      }
    } catch (error) {
      logger.error('Error refreshing materialized views:', error);
      throw error;
    }
  }

  // Vacuum and analyze tables
  static async vacuumAnalyze() {
    try {
      const tables = ['spin_history', 'transactions', 'user_action_logs', 'members'];
      
      for (const table of tables) {
        await db.query(`VACUUM (ANALYZE, VERBOSE) ${table}`);
        logger.info(`Vacuumed and analyzed ${table}`);
      }
    } catch (error) {
      logger.error('Error during vacuum analyze:', error);
      throw error;
    }
  }

  // Update table statistics
  static async updateStatistics() {
    try {
      await db.query('ANALYZE');
      logger.info('Updated table statistics');
    } catch (error) {
      logger.error('Error updating statistics:', error);
      throw error;
    }
  }

  // Schedule maintenance tasks
  static scheduleMaintenance() {
    // Daily at 2 AM - Update statistics and refresh materialized views
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting daily maintenance...');
      try {
        await this.updateStatistics();
        await this.refreshMaterializedViews();
        logger.info('Daily maintenance completed');
      } catch (error) {
        logger.error('Daily maintenance failed:', error);
      }
    });

    // Weekly on Sunday at 3 AM - Full vacuum and partition management
    cron.schedule('0 3 * * 0', async () => {
      logger.info('Starting weekly maintenance...');
      try {
        await this.vacuumAnalyze();
        await this.createNextMonthPartition('spin_history');
        await this.createNextMonthPartition('transactions');
        await this.dropOldPartitions('spin_history');
        await this.dropOldPartitions('transactions');
        logger.info('Weekly maintenance completed');
      } catch (error) {
        logger.error('Weekly maintenance failed:', error);
      }
    });

    logger.info('Database maintenance scheduled');
  }
}

module.exports = DatabaseMaintenance;
```

### Cron Jobs Setup (`cron-jobs.js`)

```javascript
require('dotenv').config();
const DatabaseMaintenance = require('./src/utils/maintenance');
const logger = require('./src/utils/logger');

// Start maintenance scheduling
DatabaseMaintenance.scheduleMaintenance();

logger.info('Database maintenance cron jobs initialized');

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down cron jobs...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Shutting down cron jobs...');
  process.exit(0);
});
```

### PM2 Configuration (`ecosystem.config.js`)

```javascript
module.exports = {
  apps: [{
    name: 'engage-service',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

This structure follows Node.js best practices with:

* **Separation of Concerns**: Controllers, services, repositories

* **Configuration Management**: Environment-based config

* **Error Handling**: Centralized error middleware

* **Security**: Helmet, CORS, rate limiting

* **Logging**: Structured logging with Winston

* **Database**: Connection pooling with PostgreSQL

* **Testing**: Unit an

