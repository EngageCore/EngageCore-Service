/**
 * Main Configuration Index
 * Exports all configuration modules
 */

require('dotenv').config();

module.exports = {
  // Database configuration
  database: {
    host: process.env.DB_HOST || '54.250.29.129',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'EngageCore',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 5,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
    runMigrationsOnStart: process.env.RUN_MIGRATIONS_ON_START === 'true'
  },
  
  // Server configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    bodyLimit: process.env.BODY_LIMIT || '10mb',
    shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000,
    timezone: process.env.TZ || 'UTC'
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
    cookieSecret: process.env.JWT_COOKIE_SECRET || 'your-super-secret-cookie-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  
  // Additional configuration options
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true'
  },
  
  jobs: {
    enabled: process.env.JOBS_ENABLED !== 'false' // Default to true
  },
  
  cleanup: {
    auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90,
    spinRetentionDays: parseInt(process.env.SPIN_RETENTION_DAYS) || 365,
    missionGracePeriodDays: parseInt(process.env.MISSION_GRACE_PERIOD_DAYS) || 30,
    failedTransactionRetentionDays: parseInt(process.env.FAILED_TRANSACTION_RETENTION_DAYS) || 30
  },
  
  webhook: {
    proxyUrl: process.env.WEBHOOK_PROXY_URL
  }
};