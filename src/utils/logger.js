const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Detect if we're running in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY || process.env.FUNCTION_NAME;

// Only create logs directory if not in serverless environment
let logsDir;
if (!isServerless) {
  logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create file transports only if not in serverless environment
let dailyRotateFileTransport, errorRotateFileTransport, auditRotateFileTransport;

if (!isServerless) {
  // Create daily rotate file transport for general logs
  dailyRotateFileTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
    level: process.env.LOG_LEVEL || 'info'
  });

  // Create daily rotate file transport for error logs
  errorRotateFileTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: fileFormat,
    level: 'error'
  });

  // Create daily rotate file transport for audit logs
  auditRotateFileTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '90d',
    format: fileFormat
  });
}

// Create the main logger
const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'engage-service' },
  transports: []
};

// Add file transports only if not in serverless environment
if (!isServerless && dailyRotateFileTransport && errorRotateFileTransport) {
  loggerConfig.transports.push(dailyRotateFileTransport, errorRotateFileTransport);
  loggerConfig.exceptionHandlers = [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  ];
  loggerConfig.rejectionHandlers = [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
  ];
}

const logger = winston.createLogger(loggerConfig);

// Add console transport for development or serverless environments
if (process.env.NODE_ENV !== 'production' || isServerless) {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: isServerless ? (process.env.LOG_LEVEL || 'info') : 'debug'
  }));
}

// Create audit logger
const auditLoggerConfig = {
  level: 'info',
  format: fileFormat,
  defaultMeta: { service: 'engage-service-audit' },
  transports: []
};

// Add appropriate transport based on environment
if (!isServerless && auditRotateFileTransport) {
  auditLoggerConfig.transports.push(auditRotateFileTransport);
} else {
  // In serverless environments, use console for audit logs
  auditLoggerConfig.transports.push(new winston.transports.Console({
    format: consoleFormat
  }));
}

const auditLogger = winston.createLogger(auditLoggerConfig);

// Helper methods
logger.audit = (message, meta = {}) => {
  auditLogger.info(message, {
    ...meta,
    timestamp: new Date().toISOString(),
    type: 'audit'
  });
};

// Database query logger
logger.query = (query, params, duration) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Database Query', {
      query: query.replace(/\s+/g, ' ').trim(),
      params,
      duration: `${duration}ms`
    });
  }
};

// Database query logger (alias for compatibility)
logger.logQuery = logger.query;

// HTTP request logger
logger.http = (req, res, duration) => {
  const { method, url, ip, headers } = req;
  const { statusCode } = res;
  
  logger.info('HTTP Request', {
    method,
    url,
    ip,
    userAgent: headers['user-agent'],
    statusCode,
    duration: `${duration}ms`
  });
};

// Security event logger
logger.security = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
  
  // Also log to audit
  auditLogger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    type: 'security'
  });
};

// Performance logger
logger.performance = (operation, duration, details = {}) => {
  if (duration > 1000) { // Log slow operations (> 1 second)
    logger.warn('Slow Operation', {
      operation,
      duration: `${duration}ms`,
      ...details
    });
  } else {
    logger.debug('Performance', {
      operation,
      duration: `${duration}ms`,
      ...details
    });
  }
};

// Business logic logger
logger.business = (event, details = {}) => {
  logger.info('Business Event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
  
  // Also log to audit for important business events
  auditLogger.info('Business Event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    type: 'business'
  });
};

module.exports = logger;