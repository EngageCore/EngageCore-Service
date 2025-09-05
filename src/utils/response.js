const logger = require('./logger');

/**
 * Standard API response structure
 */
class ApiResponse {
  constructor(success, message, data = null, meta = null) {
    this.success = success;
    this.message = message;
    this.timestamp = new Date().toISOString();
    
    if (data !== null) {
      this.data = data;
    }
    
    if (meta !== null) {
      this.meta = meta;
    }
  }
}

/**
 * Success response helper
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {*} data - Response data
 * @param {Object} meta - Additional metadata
 * @param {Number} statusCode - HTTP status code
 */
const success = (res, message = 'Success', data = null, meta = null, statusCode = 200) => {
  const response = new ApiResponse(true, message, data, meta);
  
  logger.debug('API Success Response', {
    statusCode,
    message,
    hasData: data !== null,
    hasMeta: meta !== null
  });
  
  return res.status(statusCode).json(response);
};

/**
 * Error response helper
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {*} errors - Error details
 * @param {Number} statusCode - HTTP status code
 */
const error = (res, message = 'An error occurred', errors = null, statusCode = 500) => {
  const response = new ApiResponse(false, message);
  
  if (errors !== null) {
    response.errors = errors;
  }
  
  logger.error('API Error Response', {
    statusCode,
    message,
    errors
  });
  
  return res.status(statusCode).json(response);
};

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Array|Object} validationErrors - Validation error details
 * @param {String} message - Custom error message
 */
const validationError = (res, validationErrors, message = 'Validation failed') => {
  const response = new ApiResponse(false, message);
  response.errors = validationErrors;
  
  logger.warn('Validation Error', {
    message,
    errors: validationErrors
  });
  
  return res.status(422).json(response);
};

/**
 * Unauthorized response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const unauthorized = (res, message = 'Unauthorized access') => {
  logger.security('Unauthorized Access Attempt', {
    message,
    timestamp: new Date().toISOString()
  });
  
  return error(res, message, null, 401);
};

/**
 * Forbidden response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const forbidden = (res, message = 'Access forbidden') => {
  logger.security('Forbidden Access Attempt', {
    message,
    timestamp: new Date().toISOString()
  });
  
  return error(res, message, null, 403);
};

/**
 * Not found response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const notFound = (res, message = 'Resource not found') => {
  return error(res, message, null, 404);
};

/**
 * Conflict response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {*} details - Conflict details
 */
const conflict = (res, message = 'Resource conflict', details = null) => {
  return error(res, message, details, 409);
};

/**
 * Too many requests response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const tooManyRequests = (res, message = 'Too many requests') => {
  logger.security('Rate Limit Exceeded', {
    message,
    timestamp: new Date().toISOString()
  });
  
  return error(res, message, null, 429);
};

/**
 * Server error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Error} err - Error object
 */
const serverError = (res, message = 'Internal server error', err = null) => {
  if (err) {
    logger.error('Server Error', {
      message,
      error: err.message,
      stack: err.stack
    });
  }
  
  // Don't expose internal error details in production
  const errorDetails = process.env.NODE_ENV === 'development' && err ? {
    error: err.message,
    stack: err.stack
  } : null;
  
  return error(res, message, errorDetails, 500);
};

/**
 * Paginated response helper
 * @param {Object} res - Express response object
 * @param {Array} data - Response data
 * @param {Object} pagination - Pagination info
 * @param {String} message - Success message
 */
const paginated = (res, data, pagination, message = 'Data retrieved successfully') => {
  const meta = {
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1
    }
  };
  
  return success(res, message, data, meta);
};

/**
 * Created response helper
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {*} data - Created resource data
 */
const created = (res, message = 'Resource created successfully', data = null) => {
  return success(res, message, data, null, 201);
};

/**
 * Updated response helper
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {*} data - Updated resource data
 */
const updated = (res, message = 'Resource updated successfully', data = null) => {
  return success(res, message, data);
};

/**
 * Deleted response helper
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 */
const deleted = (res, message = 'Resource deleted successfully') => {
  return success(res, message, null, null, 204);
};

/**
 * No content response helper
 * @param {Object} res - Express response object
 */
const noContent = (res) => {
  return res.status(204).send();
};

module.exports = {
  ApiResponse,
  success,
  error,
  validationError,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  serverError,
  paginated,
  created,
  updated,
  deleted,
  noContent
};