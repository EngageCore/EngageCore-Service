/**
 * Enums Index
 * Central export point for all enums including service-specific error codes
 */

const {
  // General error codes
  ERROR_CODES,
  AUTHENTICATION_ERRORS,
  VALIDATION_ERRORS,
  BUSINESS_LOGIC_ERRORS,
  RESOURCE_ERRORS,
  SYSTEM_ERRORS,
  ERROR_STATUS_MAP,
  ERROR_DESCRIPTIONS,
  HTTP_STATUS,
  
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
} = require('./ErrorCodes');

module.exports = {
  // General Error Codes
  ERROR_CODES,
  AUTHENTICATION_ERRORS,
  VALIDATION_ERRORS,
  BUSINESS_LOGIC_ERRORS,
  RESOURCE_ERRORS,
  SYSTEM_ERRORS,
  ERROR_STATUS_MAP,
  ERROR_DESCRIPTIONS,
  HTTP_STATUS,
  
  // Service-Specific Error Codes
  SERVICE_ERROR_CODES,
  SERVICE_ERROR_DESCRIPTIONS,
  SERVICE_ERROR_HTTP_STATUS,
  
  // General Helper Functions
  getErrorDetails,
  isValidErrorCode,
  getErrorCodesByCategory,
  getHttpStatus,
  isClientError,
  isServerError,
  
  // Service-Specific Helper Functions
  getServiceFromErrorCode,
  getErrorCodesForService,
  generateServiceErrorCode,
  getServiceErrorDetails,
  isServiceSpecificError,
  getAllServiceErrorCodes,
};