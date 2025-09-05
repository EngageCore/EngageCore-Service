const database = require('./database');
const jwt = require('./jwt');

module.exports = {
  database,
  jwt,
  
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1'
  },
  
  // File upload configuration
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880, // 5MB
    allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif'],
    destination: 'uploads/'
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    errorFile: process.env.ERROR_LOG_FILE || 'logs/error.log',
    auditFile: process.env.AUDIT_LOG_FILE || 'logs/audit.log'
  },
  
  // Brand configuration
  brand: {
    defaultSlug: process.env.DEFAULT_BRAND_SLUG || 'default',
    maxDailySpins: parseInt(process.env.MAX_DAILY_SPINS) || 3,
    defaultMemberPoints: parseInt(process.env.DEFAULT_MEMBER_POINTS) || 0
  },
  
  // CORS configuration
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001']
  }
};