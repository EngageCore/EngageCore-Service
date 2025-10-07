/**
 * Error Codes Enum
 * Centralized error codes with descriptions and HTTP status mappings
 * Includes both general error codes and service-specific error codes
 */

// Import service-specific error codes
const {
  SERVICE_ERROR_CODES,
  SERVICE_ERROR_DESCRIPTIONS,
  SERVICE_ERROR_HTTP_STATUS,
  getServiceFromErrorCode,
  getErrorCodesForService,
  generateServiceErrorCode,
  getServiceErrorDetails,
  isServiceSpecificError,
  getAllServiceErrorCodes
} = require('./ServiceErrorCodes');

// HTTP Status Codes (to avoid circular dependency)
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Authentication Error Codes
 */
const AUTHENTICATION_ERRORS = {
  // Invalid login credentials provided
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  // JWT token has expired and needs refresh
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  // JWT token is malformed or invalid
  TOKEN_INVALID: 'TOKEN_INVALID',
  // User lacks permission to access resource
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
};

/**
 * Validation Error Codes
 */
const VALIDATION_ERRORS = {
  // General validation failure
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  // Required field is missing from request
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  // Data format is invalid (email, phone, etc.)
  INVALID_FORMAT: 'INVALID_FORMAT',
};

/**
 * Business Logic Error Codes
 */
const BUSINESS_LOGIC_ERRORS = {
  // Member doesn't have enough points for transaction
  INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  // Member has exceeded daily wheel spin limit
  DAILY_SPIN_LIMIT_EXCEEDED: 'DAILY_SPIN_LIMIT_EXCEEDED',
  // Mission has already been completed by member
  MISSION_ALREADY_COMPLETED: 'MISSION_ALREADY_COMPLETED',
  // Wheel is not currently active for spinning
  WHEEL_NOT_ACTIVE: 'WHEEL_NOT_ACTIVE',
  // Member doesn't meet eligibility criteria
  MEMBER_NOT_ELIGIBLE: 'MEMBER_NOT_ELIGIBLE',
};

/**
 * Resource Error Codes
 */
const RESOURCE_ERRORS = {
  // Requested resource was not found
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  // Resource already exists (duplicate creation)
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  // Resource conflict (concurrent modification)
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
};

/**
 * System Error Codes
 */
const SYSTEM_ERRORS = {
  // Database connection or query error
  DATABASE_ERROR: 'DATABASE_ERROR',
  // External service integration error
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  // Generic internal server error
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  // Rate limit exceeded for requests
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
};

/**
 * Combined Error Codes Object
 * Includes both general and service-specific error codes
 */
const ERROR_CODES = {
  ...AUTHENTICATION_ERRORS,
  ...VALIDATION_ERRORS,
  ...BUSINESS_LOGIC_ERRORS,
  ...RESOURCE_ERRORS,
  ...SYSTEM_ERRORS,
  ...SERVICE_ERROR_CODES,
};

/**
 * Error Code to HTTP Status Code Mapping
 * Includes both general and service-specific error codes
 */
const ERROR_STATUS_MAP = {
  // Authentication Errors (401 Unauthorized)
  [ERROR_CODES.INVALID_CREDENTIALS]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_CODES.TOKEN_EXPIRED]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_CODES.TOKEN_INVALID]: HTTP_STATUS.UNAUTHORIZED,
  [ERROR_CODES.UNAUTHORIZED_ACCESS]: HTTP_STATUS.UNAUTHORIZED,

  // Validation Errors (400 Bad Request)
  [ERROR_CODES.VALIDATION_FAILED]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.REQUIRED_FIELD_MISSING]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.INVALID_FORMAT]: HTTP_STATUS.BAD_REQUEST,

  // Business Logic Errors (400 Bad Request)
  [ERROR_CODES.INSUFFICIENT_POINTS]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.DAILY_SPIN_LIMIT_EXCEEDED]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.MISSION_ALREADY_COMPLETED]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.WHEEL_NOT_ACTIVE]: HTTP_STATUS.BAD_REQUEST,
  [ERROR_CODES.MEMBER_NOT_ELIGIBLE]: HTTP_STATUS.BAD_REQUEST,

  // Resource Errors
  [ERROR_CODES.RESOURCE_NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: HTTP_STATUS.CONFLICT,
  [ERROR_CODES.RESOURCE_CONFLICT]: HTTP_STATUS.CONFLICT,

  // System Errors
  [ERROR_CODES.DATABASE_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: HTTP_STATUS.SERVICE_UNAVAILABLE,
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [ERROR_CODES.TOO_MANY_REQUESTS]: HTTP_STATUS.TOO_MANY_REQUESTS,
  
  // Service-specific error codes
  ...SERVICE_ERROR_HTTP_STATUS,
};

/**
 * Error Code Descriptions
 * Includes both general and service-specific error descriptions
 */
const ERROR_DESCRIPTIONS = {
  [ERROR_CODES.INVALID_CREDENTIALS]: 'The provided email or password is incorrect',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  [ERROR_CODES.TOKEN_INVALID]: 'Invalid authentication token provided',
  [ERROR_CODES.UNAUTHORIZED_ACCESS]: 'You do not have permission to access this resource',
  
  [ERROR_CODES.VALIDATION_FAILED]: 'The submitted data failed validation checks',
  [ERROR_CODES.REQUIRED_FIELD_MISSING]: 'One or more required fields are missing',
  [ERROR_CODES.INVALID_FORMAT]: 'The data format is invalid or incorrect',
  
  [ERROR_CODES.INSUFFICIENT_POINTS]: 'You do not have enough points for this transaction',
  [ERROR_CODES.DAILY_SPIN_LIMIT_EXCEEDED]: 'You have reached your daily spin limit',
  [ERROR_CODES.MISSION_ALREADY_COMPLETED]: 'This mission has already been completed',
  [ERROR_CODES.WHEEL_NOT_ACTIVE]: 'The wheel is not currently available for spinning',
  [ERROR_CODES.MEMBER_NOT_ELIGIBLE]: 'You are not eligible for this action',
  
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'The requested resource could not be found',
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: 'A resource with this identifier already exists',
  [ERROR_CODES.RESOURCE_CONFLICT]: 'There was a conflict while processing this resource',
  
  [ERROR_CODES.DATABASE_ERROR]: 'A database error occurred while processing your request',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'An external service is currently unavailable',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An internal server error occurred',
  [ERROR_CODES.TOO_MANY_REQUESTS]: 'Too many requests. Please try again later',
  
  // Service-specific error descriptions
  ...SERVICE_ERROR_DESCRIPTIONS,
};

/**
 * Get error details by error code (supports both general and service-specific codes)
 * @param {string} errorCode - The error code
 * @returns {object} Error details including status code, description, and service info
 */
const getErrorDetails = (errorCode) => {
  // Check if it's a service-specific error first
  if (isServiceSpecificError(errorCode)) {
    return getServiceErrorDetails(errorCode);
  }
  
  // Fall back to general error codes
  return {
    code: errorCode,
    statusCode: ERROR_STATUS_MAP[errorCode] || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    description: ERROR_DESCRIPTIONS[errorCode] || 'An unknown error occurred',
    service: null
  };
};

/**
 * Check if error code exists (supports both general and service-specific codes)
 * @param {string} errorCode - The error code to check
 * @returns {boolean} True if error code exists
 */
const isValidErrorCode = (errorCode) => {
  return Object.values(ERROR_CODES).includes(errorCode);
};

/**
 * Get HTTP status code for error code
 * @param {string} errorCode - The error code
 * @returns {number} HTTP status code
 */
const getHttpStatus = (errorCode) => {
  return ERROR_STATUS_MAP[errorCode] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
};

/**
 * Check if error is client-side (4xx)
 * @param {string} errorCode - The error code
 * @returns {boolean} True if client error
 */
const isClientError = (errorCode) => {
  const status = getHttpStatus(errorCode);
  return status >= 400 && status < 500;
};

/**
 * Check if error is server-side (5xx)
 * @param {string} errorCode - The error code
 * @returns {boolean} True if server error
 */
const isServerError = (errorCode) => {
  const status = getHttpStatus(errorCode);
  return status >= 500;
};

/**
 * Get all error codes by category (includes service-specific codes)
 * @returns {object} Error codes organized by category
 */
const getErrorCodesByCategory = () => {
  return {
    authentication: AUTHENTICATION_ERRORS,
    validation: VALIDATION_ERRORS,
    businessLogic: BUSINESS_LOGIC_ERRORS,
    resource: RESOURCE_ERRORS,
    system: SYSTEM_ERRORS,
    services: getAllServiceErrorCodes(),
  };
};

module.exports = {
  // General error codes
  ERROR_CODES,
  AUTHENTICATION_ERRORS,
  VALIDATION_ERRORS,
  BUSINESS_LOGIC_ERRORS,
  RESOURCE_ERRORS,
  SYSTEM_ERRORS,
  ERROR_STATUS_MAP,
  ERROR_DESCRIPTIONS,
  
  // Service-specific error codes
  SERVICE_ERROR_CODES,
  SERVICE_ERROR_DESCRIPTIONS,
  SERVICE_ERROR_HTTP_STATUS,
  
  // Helper functions
  getErrorDetails,
  isValidErrorCode,
  getErrorCodesByCategory,
  getHttpStatus,
  isClientError,
  isServerError,
  
  // Service-specific helper functions
  getServiceFromErrorCode,
  getErrorCodesForService,
  generateServiceErrorCode,
  getServiceErrorDetails,
  isServiceSpecificError,
  getAllServiceErrorCodes,
};

// Re-export HTTP_STATUS for convenience
module.exports.HTTP_STATUS = HTTP_STATUS;