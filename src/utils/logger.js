const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
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

// Create daily rotate file transport for general logs
const dailyRotateFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
  level: process.env.LOG_LEVEL || 'info'
});

// Create daily rotate file transport for error logs
const errorRotateFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
  level: 'error'
});

// Create daily rotate file transport for audit logs
const auditRotateFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'audit-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '90d',
  format: fileFormat
});

// Create the main logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'engage-service' },
  transports: [
    dailyRotateFileTransport,
    errorRotateFileTransport
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Create audit logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: { service: 'engage-service-audit' },
  transports: [auditRotateFileTransport]
});

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