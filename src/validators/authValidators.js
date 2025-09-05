/**
 * Authentication Validators
 * Joi schemas for authentication-related requests
 */

const Joi = require('joi');
const { constants } = require('../utils');
const { VALIDATION_RULES, USER_ROLES } = constants;

/**
 * User registration validation schema
 */
const registerSchema = {
  body: Joi.object({
    first_name: Joi.string()
      .min(VALIDATION_RULES.NAME_MIN_LENGTH)
      .max(VALIDATION_RULES.NAME_MAX_LENGTH)
      .trim()
      .required()
      .messages({
        'string.empty': 'First name is required',
        'string.min': `First name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters long`,
        'string.max': `First name must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`,
        'any.required': 'First name is required'
      }),
      
    last_name: Joi.string()
      .min(VALIDATION_RULES.NAME_MIN_LENGTH)
      .max(VALIDATION_RULES.NAME_MAX_LENGTH)
      .trim()
      .required()
      .messages({
        'string.empty': 'Last name is required',
        'string.min': `Last name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters long`,
        'string.max': `Last name must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`,
        'any.required': 'Last name is required'
      }),
      
    email: Joi.string()
      .email()
      .max(VALIDATION_RULES.EMAIL_MAX_LENGTH)
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
        'string.max': `Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`,
        'any.required': 'Email is required'
      }),
      
    password: Joi.string()
      .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH)
      .max(VALIDATION_RULES.PASSWORD_MAX_LENGTH)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/)
      .required()
      .messages({
        'string.empty': 'Password is required',
        'string.min': `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`,
        'string.max': `Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`,
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
      
    confirm_password: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      }),
      
    role: Joi.string()
      .valid(...Object.values(USER_ROLES))
      .default(USER_ROLES.BRAND_USER)
      .messages({
        'any.only': 'Invalid user role'
      }),
      
    brand_id: Joi.string()
      .uuid()
      .when('role', {
        is: Joi.valid(USER_ROLES.SUPER_ADMIN),
        then: Joi.optional(),
        otherwise: Joi.required()
      })
      .messages({
        'string.uuid': 'Brand ID must be a valid UUID',
        'any.required': 'Brand ID is required for non-super-admin users'
      }),
      
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
      
    timezone: Joi.string()
      .optional()
      .default('UTC'),
      
    language: Joi.string()
      .length(2)
      .optional()
      .default('en')
      .messages({
        'string.length': 'Language code must be 2 characters long'
      })
  })
};

/**
 * User login validation schema
 */
const loginSchema = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
      
    password: Joi.string()
      .required()
      .messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
      }),
      
    remember_me: Joi.boolean()
      .optional()
      .default(false)
  })
};

/**
 * Password reset request validation schema
 */
const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  })
};

/**
 * Password reset validation schema
 */
const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'string.empty': 'Reset token is required',
        'any.required': 'Reset token is required'
      }),
      
    password: Joi.string()
      .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH)
      .max(VALIDATION_RULES.PASSWORD_MAX_LENGTH)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/)
      .required()
      .messages({
        'string.empty': 'Password is required',
        'string.min': `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`,
        'string.max': `Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`,
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
      
    confirm_password: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      })
  })
};

/**
 * Change password validation schema
 */
const changePasswordSchema = {
  body: Joi.object({
    current_password: Joi.string()
      .required()
      .messages({
        'string.empty': 'Current password is required',
        'any.required': 'Current password is required'
      }),
      
    new_password: Joi.string()
      .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH)
      .max(VALIDATION_RULES.PASSWORD_MAX_LENGTH)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/)
      .invalid(Joi.ref('current_password'))
      .required()
      .messages({
        'string.empty': 'New password is required',
        'string.min': `New password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`,
        'string.max': `New password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`,
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.invalid': 'New password must be different from current password',
        'any.required': 'New password is required'
      }),
      
    confirm_new_password: Joi.string()
      .valid(Joi.ref('new_password'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match new password',
        'any.required': 'New password confirmation is required'
      })
  })
};

/**
 * Email verification validation schema
 */
const verifyEmailSchema = {
  body: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'string.empty': 'Verification token is required',
        'any.required': 'Verification token is required'
      })
  })
};

/**
 * Resend verification email validation schema
 */
const resendVerificationSchema = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  })
};

/**
 * Refresh token validation schema
 */
const refreshTokenSchema = {
  body: Joi.object({
    refresh_token: Joi.string()
      .required()
      .messages({
        'string.empty': 'Refresh token is required',
        'any.required': 'Refresh token is required'
      })
  })
};

/**
 * Logout validation schema
 */
const logoutSchema = {
  body: Joi.object({
    refresh_token: Joi.string()
      .optional()
      .messages({
        'string.empty': 'Refresh token cannot be empty'
      })
  })
};

/**
 * Update profile validation schema
 */
const updateProfileSchema = {
  body: Joi.object({
    first_name: Joi.string()
      .min(VALIDATION_RULES.NAME_MIN_LENGTH)
      .max(VALIDATION_RULES.NAME_MAX_LENGTH)
      .trim()
      .optional()
      .messages({
        'string.min': `First name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters long`,
        'string.max': `First name must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`
      }),
      
    last_name: Joi.string()
      .min(VALIDATION_RULES.NAME_MIN_LENGTH)
      .max(VALIDATION_RULES.NAME_MAX_LENGTH)
      .trim()
      .optional()
      .messages({
        'string.min': `Last name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters long`,
        'string.max': `Last name must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`
      }),
      
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .allow(null, '')
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
      
    timezone: Joi.string()
      .optional(),
      
    language: Joi.string()
      .length(2)
      .optional()
      .messages({
        'string.length': 'Language code must be 2 characters long'
      }),
      
    avatar_url: Joi.string()
      .uri()
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Avatar URL must be a valid URL'
      })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })
};

/**
 * Two-factor authentication setup validation schema
 */
const setup2FASchema = {
  body: Joi.object({
    code: Joi.string()
      .length(6)
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        'string.empty': 'Verification code is required',
        'string.length': 'Verification code must be 6 digits',
        'string.pattern.base': 'Verification code must contain only digits',
        'any.required': 'Verification code is required'
      })
  })
};

/**
 * Two-factor authentication verification validation schema
 */
const verify2FASchema = {
  body: Joi.object({
    code: Joi.string()
      .length(6)
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        'string.empty': 'Verification code is required',
        'string.length': 'Verification code must be 6 digits',
        'string.pattern.base': 'Verification code must contain only digits',
        'any.required': 'Verification code is required'
      })
  })
};

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  refreshTokenSchema,
  logoutSchema,
  updateProfileSchema,
  setup2FASchema,
  verify2FASchema
};