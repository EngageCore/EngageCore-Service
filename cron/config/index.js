
require('dotenv').config();

let sharedConfig = null;


const standaloneConfig = {
  // Database configuration
  database: {
    host: process.env.DB_HOST || '54.250.29.129',
    port: parseInt(process.env.DB_PORT) || 5433,
    database: process.env.DB_NAME || 'EngageCore',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000
  },


  cron: {
    enabled: process.env.CRON_ENABLED !== 'false',
    timezone: process.env.TZ || 'UTC',
    
    jobs: {
      transactionSync: {
        enabled: process.env.TRANSACTION_SYNC_ENABLED !== 'false',
        schedule: process.env.TRANSACTION_SYNC_SCHEDULE || '*/15 * * * *',
        timeout: parseInt(process.env.TRANSACTION_SYNC_TIMEOUT) || 300000,
        retries: parseInt(process.env.TRANSACTION_SYNC_RETRIES) || 3
      },
      
      dataCleanup: {
        enabled: process.env.DATA_CLEANUP_ENABLED === 'true',
        schedule: process.env.DATA_CLEANUP_SCHEDULE || '0 2 * * *',
        timeout: parseInt(process.env.DATA_CLEANUP_TIMEOUT) || 600000
      }
    }
  },

 
  externalApi: {
    baseUrl: process.env.EXTERNAL_API_URL || 'https://ez4playsg.net/api/v1/index.php',
    accessId: process.env.EXTERNAL_ACCESS_ID || '333178324',
    accessToken: process.env.EXTERNAL_ACCESS_TOKEN || 'c881af557f19eb837741d6963720d099afa909899b740b83f8676c279ce03f34',
    timeout: parseInt(process.env.EXTERNAL_API_TIMEOUT) || 30000,
    retries: parseInt(process.env.EXTERNAL_API_RETRIES) || 3,
    retryDelay: parseInt(process.env.EXTERNAL_API_RETRY_DELAY) || 1000
  },


  app: {
    name: 'EngageCore Cron',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  }
};

// Export shared config if available, otherwise use standalone
module.exports = sharedConfig || standaloneConfig;