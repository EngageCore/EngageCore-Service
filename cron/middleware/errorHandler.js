/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

const { response, logger, constants } = require('../utils');
const { HTTP_STATUS, ERROR_CODES, ENVIRONMENTS } = constants;

/**
 * Custom Application Error class
 */
class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = ERROR_CODES.INTERNAL_SERVER_ERROR, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error class
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED);
    this.errors = errors;
  }
}

/**
 * Database Error class
 */
class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.DATABASE_ERROR);
    this.originalError = originalError;
  }
}

/**
 * Authentication Error class
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED_ACCESS);
  }
}

/**
 * Authorization Error class
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.UNAUTHORIZED_ACCESS);
  }
}

/**
 * Not Found Error class
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
  }
}

/**
 * Conflict Error class
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, HTTP_STATUS.CONFLICT, ERROR_CODES.RESOURCE_CONFLICT);
  }
}

/**
 * Rate Limit Error class
 */
class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.TOO_MANY_REQUESTS);
  }
}

/**
 * External Service Error class
 */
class ExternalServiceError extends AppError {
  constructor(message = 'External service error', service = 'unknown') {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.EXTERNAL_SERVICE_ERROR);
    this.service = service;
  }
}

/**
 * Handle different types of errors
 * @param {Error} error - Error object
 * @param {object} req - Express request object
 * @returns {object} - Formatted error response
 */
const handleError = (error, req) => {
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let code = ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';
  let errors = [];
  let details = null;

  // Handle custom application errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    
    if (error instanceof ValidationError) {
      errors = error.errors;
    }
    
    if (error instanceof ExternalServiceError) {
      details = { service: error.service };
    }
  }
  // Handle PostgreSQL errors
  else if (error.code && typeof error.code === 'string') {
    switch (error.code) {
      case '23505': // Unique violation
        statusCode = HTTP_STATUS.CONFLICT;
        code = ERROR_CODES.RESOURCE_ALREADY_EXISTS;
        message = 'Resource already exists';
        break;
        
      case '23503': // Foreign key violation
        statusCode = HTTP_STATUS.BAD_REQUEST;
        code = ERROR_CODES.VALIDATION_FAILED;
        message = 'Invalid reference to related resource';
        break;
        
      case '23502': // Not null violation
        statusCode = HTTP_STATUS.BAD_REQUEST;
        code = ERROR_CODES.REQUIRED_FIELD_MISSING;
        message = 'Required field is missing';
        break;
        
      case '22001': // String data right truncation
        statusCode = HTTP_STATUS.BAD_REQUEST;
        code = ERROR_CODES.VALIDATION_FAILED;
        message = 'Data too long for field';
        break;
        
      case '08003': // Connection does not exist
      case '08006': // Connection failure
        statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
        code = ERROR_CODES.DATABASE_ERROR;
        message = 'Database connection error';
        break;
        
      default:
        statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        code = ERROR_CODES.DATABASE_ERROR;
        message = 'Database error occurred';
    }
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = ERROR_CODES.TOKEN_INVALID;
    message = 'Invalid token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = ERROR_CODES.TOKEN_EXPIRED;
    message = 'Token expired';
  }
  // Handle Joi validation errors
  else if (error.name === 'ValidationError' && error.details) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_FAILED;
    message = 'Validation failed';
    errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: 'validation'
    }));
  }
  // Handle multer errors (file upload)
  else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_FAILED;
    message = 'File too large';
  }
  else if (error.code === 'LIMIT_FILE_COUNT') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_FAILED;
    message = 'Too many files';
  }
  else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_FAILED;
    message = 'Unexpected file field';
  }
  // Handle syntax errors
  else if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.INVALID_FORMAT;
    message = 'Invalid JSON format';
  }
  // Handle cast errors (invalid ObjectId, etc.)
  else if (error.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.INVALID_FORMAT;
    message = 'Invalid ID format';
  }

  return {
    statusCode,
    code,
    message,
    errors,
    details,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };
};

/**
 * Log error with appropriate level
 * @param {Error} error - Error object
 * @param {object} req - Express request object
 * @param {object} errorResponse - Formatted error response
 */
const logError = (error, req, errorResponse) => {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      brandId: req.brand?.id
    },
    response: {
      statusCode: errorResponse.statusCode,
      code: errorResponse.code
    }
  };

  // Log at different levels based on error type
  if (errorResponse.statusCode >= 500) {
    logger.error('Server error occurred', logData);
  } else if (errorResponse.statusCode >= 400) {
    logger.warn('Client error occurred', logData);
  } else {
    logger.info('Error handled', logData);
  }

  // Log security-related errors
  if ([
    ERROR_CODES.UNAUTHORIZED_ACCESS,
    ERROR_CODES.TOKEN_INVALID,
    ERROR_CODES.TOKEN_EXPIRED,
    ERROR_CODES.TOO_MANY_REQUESTS
  ].includes(errorResponse.code)) {
    logger.logSecurity('Security-related error', {
      ...logData,
      securityEvent: true
    });
  }
};

/**
 * Main error handling middleware
 * @param {Error} error - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const errorHandler = (error, req, res, next) => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  const errorResponse = handleError(error, req);
  
  // Log the error
  logError(error, req, errorResponse);

  // Send error response
  const responseData = {
    success: false,
    error: errorResponse.message,
    code: errorResponse.code,
    timestamp: errorResponse.timestamp
  };

  // Add validation errors if present
  if (errorResponse.errors && errorResponse.errors.length > 0) {
    responseData.errors = errorResponse.errors;
  }

  // Add additional details if present
  if (errorResponse.details) {
    responseData.details = errorResponse.details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === ENVIRONMENTS.DEVELOPMENT) {
    responseData.stack = error.stack;
    responseData.path = errorResponse.path;
    responseData.method = errorResponse.method;
  }

  res.status(errorResponse.statusCode).json(responseData);
};

/**
 * Handle 404 errors (route not found)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 * @param {function} fn - Async function to wrap
 * @returns {function} - Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    process: 'uncaughtException'
  });
  
  // Give time for logging then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack
    } : reason,
    promise: promise.toString(),
    process: 'unhandledRejection'
  });
  
  // Give time for logging then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

/**
 * Graceful shutdown handler
 * @param {string} signal - Signal received
 */
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Close server and database connections
  // This would be implemented based on your server setup
  
  setTimeout(() => {
    logger.info('Graceful shutdown completed');
    process.exit(0);
  }, 5000);
};

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  
  // Middleware functions
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Utility functions
  handleError,
  logError,
  gracefulShutdown
};