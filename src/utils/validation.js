/**
 * Validation Utilities
 */

const { VALIDATION_RULES, USER_ROLES, WHEEL_ITEM_TYPES } = require('./constants');
const logger = require('./logger');

/**
 * Email validation using regex
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= VALIDATION_RULES.EMAIL_MAX_LENGTH;
};

/**
 * Password strength validation
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with isValid and errors
 */
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`);
  }
  
  if (password.length > VALIDATION_RULES.PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`);
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Phone number validation (international format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone number
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

/**
 * URL validation
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Brand slug validation (alphanumeric, hyphens, underscores)
 * @param {string} slug - Slug to validate
 * @returns {boolean} - True if valid slug
 */
const isValidSlug = (slug) => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && 
         slug.length >= VALIDATION_RULES.BRAND_SLUG_MIN_LENGTH && 
         slug.length <= VALIDATION_RULES.BRAND_SLUG_MAX_LENGTH;
};

/**
 * UUID validation
 * @param {string} uuid - UUID to validate
 * @returns {boolean} - True if valid UUID
 */
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Date validation (ISO format)
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if valid date
 */
const isValidDate = (date) => {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date.slice(0, 10);
};

/**
 * Validate user role
 * @param {string} role - Role to validate
 * @returns {boolean} - True if valid role
 */
const isValidUserRole = (role) => {
  return Object.values(USER_ROLES).includes(role);
};

/**
 * Validate wheel item type
 * @param {string} type - Wheel item type to validate
 * @returns {boolean} - True if valid type
 */
const isValidWheelItemType = (type) => {
  return Object.values(WHEEL_ITEM_TYPES).includes(type);
};

/**
 * Validate probability value (0-1)
 * @param {number} probability - Probability to validate
 * @returns {boolean} - True if valid probability
 */
const isValidProbability = (probability) => {
  return typeof probability === 'number' && 
         probability >= VALIDATION_RULES.MIN_PROBABILITY && 
         probability <= VALIDATION_RULES.MAX_PROBABILITY;
};

/**
 * Validate points value
 * @param {number} points - Points to validate
 * @returns {boolean} - True if valid points
 */
const isValidPoints = (points) => {
  return typeof points === 'number' && 
         points >= 0 && 
         points <= VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION && 
         Number.isInteger(points);
};

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {object} - Validated pagination parameters
 */
const validatePagination = (page, limit) => {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(
    Math.max(1, parseInt(limit) || 20),
    100
  );
  
  return {
    page: validatedPage,
    limit: validatedLimit,
    offset: (validatedPage - 1) * validatedLimit
  };
};

/**
 * Validate sort parameters
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc/desc)
 * @param {array} allowedFields - Allowed fields for sorting
 * @returns {object} - Validated sort parameters
 */
const validateSort = (sortBy, sortOrder, allowedFields = []) => {
  const validSortBy = allowedFields.includes(sortBy) ? sortBy : allowedFields[0] || 'created_at';
  const validSortOrder = ['asc', 'desc'].includes(sortOrder?.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';
  
  return {
    sortBy: validSortBy,
    sortOrder: validSortOrder
  };
};

/**
 * Validate file upload
 * @param {object} file - File object
 * @param {array} allowedTypes - Allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {object} - Validation result
 */
const validateFileUpload = (file, allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  const errors = [];
  
  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }
  
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  if (file.size > maxSize) {
    errors.push(`File size ${file.size} bytes exceeds maximum allowed size of ${maxSize} bytes`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate hex color code
 * @param {string} color - Color code to validate
 * @returns {boolean} - True if valid hex color
 */
const isValidHexColor = (color) => {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
};

/**
 * Validate JSON string
 * @param {string} jsonString - JSON string to validate
 * @returns {object} - Validation result with parsed data
 */
const validateJSON = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    return {
      isValid: true,
      data: parsed,
      errors: []
    };
  } catch (error) {
    return {
      isValid: false,
      data: null,
      errors: [`Invalid JSON: ${error.message}`]
    };
  }
};

/**
 * Validate array of probabilities sum to 1.0
 * @param {array} probabilities - Array of probability values
 * @returns {object} - Validation result
 */
const validateProbabilitySum = (probabilities) => {
  if (!Array.isArray(probabilities) || probabilities.length === 0) {
    return {
      isValid: false,
      errors: ['Probabilities must be a non-empty array']
    };
  }
  
  const sum = probabilities.reduce((acc, prob) => acc + (parseFloat(prob) || 0), 0);
  const tolerance = 0.001; // Allow small floating point errors
  
  if (Math.abs(sum - 1.0) > tolerance) {
    return {
      isValid: false,
      errors: [`Probabilities must sum to 1.0, current sum: ${sum.toFixed(3)}`]
    };
  }
  
  return {
    isValid: true,
    errors: []
  };
};

/**
 * Sanitize string input (remove HTML tags, trim whitespace)
 * @param {string} input - Input string to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input, maxLength = null) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove HTML tags and trim whitespace
  let sanitized = input.replace(/<[^>]*>/g, '').trim();
  
  // Truncate if maxLength is specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }
  
  return sanitized;
};

/**
 * Validate and sanitize search query
 * @param {string} query - Search query
 * @returns {object} - Validation result with sanitized query
 */
const validateSearchQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return {
      isValid: false,
      sanitizedQuery: '',
      errors: ['Search query is required']
    };
  }
  
  const sanitized = sanitizeString(query, 255);
  
  if (sanitized.length < 2) {
    return {
      isValid: false,
      sanitizedQuery: sanitized,
      errors: ['Search query must be at least 2 characters long']
    };
  }
  
  return {
    isValid: true,
    sanitizedQuery: sanitized,
    errors: []
  };
};

/**
 * Validate time range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {object} - Validation result
 */
const validateTimeRange = (startDate, endDate) => {
  const errors = [];
  
  if (!isValidDate(startDate)) {
    errors.push('Invalid start date format');
  }
  
  if (!isValidDate(endDate)) {
    errors.push('Invalid end date format');
  }
  
  if (errors.length === 0) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      errors.push('Start date must be before end date');
    }
    
    // Check if date range is not too large (e.g., max 1 year)
    const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (end - start > maxRangeMs) {
      errors.push('Date range cannot exceed 1 year');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Log validation errors
 * @param {string} context - Context where validation failed
 * @param {array} errors - Array of error messages
 * @param {object} data - Data that failed validation
 */
const logValidationErrors = (context, errors, data = null) => {
  logger.warn('Validation failed', {
    context,
    errors,
    data: data ? JSON.stringify(data) : null
  });
};

module.exports = {
  isValidEmail,
  validatePasswordStrength,
  isValidPhone,
  isValidUrl,
  isValidSlug,
  isValidUUID,
  isValidDate,
  isValidUserRole,
  isValidWheelItemType,
  isValidProbability,
  isValidPoints,
  validatePagination,
  validateSort,
  validateFileUpload,
  isValidHexColor,
  validateJSON,
  validateProbabilitySum,
  sanitizeString,
  validateSearchQuery,
  validateTimeRange,
  logValidationErrors
};