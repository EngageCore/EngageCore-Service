/**
 * Validation Middleware
 * Handles request validation using Joi schemas
 */

const Joi = require('joi');
const { response, logger, constants, validation } = require('../utils');
const { HTTP_STATUS, ERROR_CODES } = constants;

/**
 * Validate request data against Joi schema
 * @param {object} schema - Joi schema object with body, params, query properties
 * @param {object} options - Validation options
 * @returns {function} - Middleware function
 */
const validate = (schema, options = {}) => {
  const defaultOptions = {
    abortEarly: false, // Return all validation errors
    allowUnknown: false, // Don't allow unknown fields
    stripUnknown: true, // Remove unknown fields
    ...options
  };

  return (req, res, next) => {
    const errors = [];
    
    try {
      // Validate request body
      if (schema.body) {
        const { error, value } = schema.body.validate(req.body, defaultOptions);
        if (error) {
          errors.push(...error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: 'body'
          })));
        } else {
          req.body = value;
        }
      }

      // Validate request parameters
      if (schema.params) {
        const { error, value } = schema.params.validate(req.params, defaultOptions);
        if (error) {
          errors.push(...error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: 'params'
          })));
        } else {
          req.params = value;
        }
      }

      // Validate query parameters
      if (schema.query) {
        const { error, value } = schema.query.validate(req.query, defaultOptions);
        if (error) {
          errors.push(...error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: 'query'
          })));
        } else {
          req.query = value;
        }
      }

      // Validate request headers
      if (schema.headers) {
        const { error, value } = schema.headers.validate(req.headers, {
          ...defaultOptions,
          allowUnknown: true // Headers often have many unknown fields
        });
        if (error) {
          errors.push(...error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: 'headers'
          })));
        }
      }

      // If there are validation errors, return them
      if (errors.length > 0) {
        logger.warn('Request validation failed', {
          errors,
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return response.validationError(res, 'Validation failed', errors, ERROR_CODES.VALIDATION_FAILED);
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
      });
      
      return response.serverError(res, 'Validation error occurred');
    }
  };
};

/**
 * Validate file upload
 * @param {object} options - Upload validation options
 * @returns {function} - Middleware function
 */
const validateFileUpload = (options = {}) => {
  const {
    required = false,
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    maxFiles = 1,
    fieldName = 'file'
  } = options;

  return (req, res, next) => {
    try {
      const files = req.files;
      const file = req.file;
      
      // Check if file is required
      if (required && !file && (!files || files.length === 0)) {
        return response.validationError(res, 'File is required', [
          { field: fieldName, message: 'File is required', type: 'file' }
        ], ERROR_CODES.REQUIRED_FIELD_MISSING);
      }

      // If no file provided and not required, continue
      if (!file && (!files || files.length === 0)) {
        return next();
      }

      const filesToValidate = files || [file];
      const errors = [];

      // Check number of files
      if (filesToValidate.length > maxFiles) {
        errors.push({
          field: fieldName,
          message: `Maximum ${maxFiles} file(s) allowed`,
          type: 'file'
        });
      }

      // Validate each file
      filesToValidate.forEach((uploadedFile, index) => {
        if (!uploadedFile) return;

        const fieldPath = files ? `${fieldName}[${index}]` : fieldName;
        
        // Validate file size
        if (uploadedFile.size > maxSize) {
          errors.push({
            field: fieldPath,
            message: `File size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`,
            type: 'file'
          });
        }

        // Validate file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(uploadedFile.mimetype)) {
          errors.push({
            field: fieldPath,
            message: `File type ${uploadedFile.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
            type: 'file'
          });
        }
      });

      if (errors.length > 0) {
        logger.warn('File upload validation failed', {
          errors,
          fileCount: filesToValidate.length,
          path: req.path,
          ip: req.ip
        });
        
        return response.validationError(res, 'File validation failed', errors, ERROR_CODES.VALIDATION_FAILED);
      }

      next();
    } catch (error) {
      logger.error('File upload validation error', {
        error: error.message,
        path: req.path,
        ip: req.ip
      });
      
      return response.serverError(res, 'File validation error occurred');
    }
  };
};

/**
 * Validate pagination parameters
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validatePagination = (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const validated = validation.validatePagination(page, limit);
    
    // Update query with validated values
    req.query.page = validated.page;
    req.query.limit = validated.limit;
    req.query.offset = validated.offset;
    
    next();
  } catch (error) {
    logger.error('Pagination validation error', {
      error: error.message,
      query: req.query,
      path: req.path
    });
    
    return response.serverError(res, 'Pagination validation error');
  }
};

/**
 * Validate sort parameters
 * @param {array} allowedFields - Allowed fields for sorting
 * @returns {function} - Middleware function
 */
const validateSort = (allowedFields = []) => {
  return (req, res, next) => {
    try {
      const { sortBy, sortOrder } = req.query;
      const validated = validation.validateSort(sortBy, sortOrder, allowedFields);
      
      // Update query with validated values
      req.query.sortBy = validated.sortBy;
      req.query.sortOrder = validated.sortOrder;
      
      next();
    } catch (error) {
      logger.error('Sort validation error', {
        error: error.message,
        query: req.query,
        allowedFields,
        path: req.path
      });
      
      return response.serverError(res, 'Sort validation error');
    }
  };
};

/**
 * Validate search query
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateSearch = (req, res, next) => {
  try {
    const { search } = req.query;
    
    if (search) {
      const validated = validation.validateSearchQuery(search);
      
      if (!validated.isValid) {
        return response.validationError(res, 'Invalid search query', [
          { field: 'search', message: validated.errors[0], type: 'query' }
        ], ERROR_CODES.VALIDATION_FAILED);
      }
      
      req.query.search = validated.sanitizedQuery;
    }
    
    next();
  } catch (error) {
    logger.error('Search validation error', {
      error: error.message,
      query: req.query,
      path: req.path
    });
    
    return response.serverError(res, 'Search validation error');
  }
};

/**
 * Validate date range
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateDateRange = (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (startDate || endDate) {
      if (!startDate || !endDate) {
        return response.validationError(res, 'Both startDate and endDate are required', [
          { field: 'startDate', message: 'Start date is required when using date range', type: 'query' },
          { field: 'endDate', message: 'End date is required when using date range', type: 'query' }
        ], ERROR_CODES.VALIDATION_FAILED);
      }
      
      const validated = validation.validateTimeRange(startDate, endDate);
      
      if (!validated.isValid) {
        return response.validationError(res, 'Invalid date range', 
          validated.errors.map(error => ({
            field: 'dateRange',
            message: error,
            type: 'query'
          })),
          ERROR_CODES.VALIDATION_FAILED
        );
      }
    }
    
    next();
  } catch (error) {
    logger.error('Date range validation error', {
      error: error.message,
      query: req.query,
      path: req.path
    });
    
    return response.serverError(res, 'Date range validation error');
  }
};

/**
 * Sanitize request data
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const sanitizeRequest = (req, res, next) => {
  try {
    // Sanitize string fields in body
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          req.body[key] = validation.sanitizeString(value);
        }
      }
    }
    
    // Sanitize string fields in query
    if (req.query && typeof req.query === 'object') {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.query[key] = validation.sanitizeString(value);
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('Request sanitization error', {
      error: error.message,
      path: req.path
    });
    
    return response.serverError(res, 'Request sanitization error');
  }
};

/**
 * Validate JSON payload
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateJson = (req, res, next) => {
  try {
    // Check if content-type is JSON
    const contentType = req.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // Express already parsed JSON, but check if it's valid
      if (req.body === undefined) {
        return response.validationError(res, 'Invalid JSON payload', [
          { field: 'body', message: 'Request body must be valid JSON', type: 'body' }
        ], ERROR_CODES.INVALID_FORMAT);
      }
    }
    
    next();
  } catch (error) {
    logger.error('JSON validation error', {
      error: error.message,
      path: req.path,
      contentType: req.get('content-type')
    });
    
    return response.validationError(res, 'Invalid JSON payload', [
      { field: 'body', message: 'Request body must be valid JSON', type: 'body' }
    ], ERROR_CODES.INVALID_FORMAT);
  }
};

/**
 * Create custom validation middleware
 * @param {function} validator - Custom validation function
 * @param {string} errorMessage - Error message for validation failure
 * @returns {function} - Middleware function
 */
const customValidation = (validator, errorMessage = 'Validation failed') => {
  return async (req, res, next) => {
    try {
      const result = await validator(req);
      
      if (result === true) {
        return next();
      }
      
      // If result is an object with validation details
      if (typeof result === 'object' && result.isValid === false) {
        return response.validationError(res, errorMessage, result.errors || [], ERROR_CODES.VALIDATION_FAILED);
      }
      
      // If result is false or falsy
      return response.validationError(res, errorMessage, [], ERROR_CODES.VALIDATION_FAILED);
    } catch (error) {
      logger.error('Custom validation error', {
        error: error.message,
        path: req.path,
        validator: validator.name
      });
      
      return response.serverError(res, 'Custom validation error');
    }
  };
};

module.exports = {
  validate,
  validateFileUpload,
  validatePagination,
  validateSort,
  validateSearch,
  validateDateRange,
  sanitizeRequest,
  validateJson,
  customValidation
};