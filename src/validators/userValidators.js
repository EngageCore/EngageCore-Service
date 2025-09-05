/**
 * User Validators
 * Joi schemas for user-related requests
 */

const Joi = require('joi');
const { constants } = require('../utils');
const { VALIDATION_RULES, USER_ROLES } = constants;

/**
 * Create user validation schema
 */
const createUserSchema = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required'
      }),
      
    password: Joi.string()
      .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH)
      .max(VALIDATION_RULES.PASSWORD_MAX_LENGTH)
      .required()
      .messages({
        'string.min': `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`,
        'string.max': `Password must not exceed ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`,
        'any.required': 'Password is required'
      }),
      
    first_name: Joi.string()
      .min(1)
      .max(50)
      .trim()
      .required()
      .messages({
        'string.empty': 'First name is required',
        'string.max': 'First name must not exceed 50 characters',
        'any.required': 'First name is required'
      }),
      
    last_name: Joi.string()
      .min(1)
      .max(50)
      .trim()
      .required()
      .messages({
        'string.empty': 'Last name is required',
        'string.max': 'Last name must not exceed 50 characters',
        'any.required': 'Last name is required'
      }),
      
    role: Joi.string()
      .valid(...Object.values(USER_ROLES))
      .required()
      .messages({
        'any.only': 'Role must be a valid user role',
        'any.required': 'Role is required'
      }),
      
    brand_id: Joi.string()
      .uuid()
      .optional()
      .allow(null)
      .messages({
        'string.uuid': 'Brand ID must be a valid UUID'
      })
  })
};

/**
 * List users validation schema
 */
const listUsersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional().allow(''),
    role: Joi.string().valid(...Object.values(USER_ROLES)).optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
    brand_id: Joi.string().uuid().optional(),
    sort_by: Joi.string().valid('created_at', 'updated_at', 'email', 'first_name', 'last_name').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Get user validation schema
 */
const getUserSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.uuid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required'
    })
  })
};

/**
 * Update user validation schema
 */
const updateUserSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    first_name: Joi.string().min(1).max(50).trim().optional(),
    last_name: Joi.string().min(1).max(50).trim().optional(),
    role: Joi.string().valid(...Object.values(USER_ROLES)).optional(),
    brand_id: Joi.string().uuid().optional().allow(null),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional()
  })
};

/**
 * Delete user validation schema
 */
const deleteUserSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  })
};

/**
 * Update current user validation schema
 */
const updateCurrentUserSchema = {
  body: Joi.object({
    first_name: Joi.string().min(1).max(50).trim().optional(),
    last_name: Joi.string().min(1).max(50).trim().optional()
  })
};

/**
 * Change user password validation schema
 */
const changeUserPasswordSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    new_password: Joi.string()
      .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH)
      .max(VALIDATION_RULES.PASSWORD_MAX_LENGTH)
      .required()
  })
};

/**
 * Get user statistics validation schema
 */
const getUserStatisticsSchema = {
  query: Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'year').default('month'),
    brand_id: Joi.string().uuid().optional()
  })
};

/**
 * Get user activity log validation schema
 */
const getUserActivityLogSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    action_type: Joi.string().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional()
  })
};

/**
 * Update user status validation schema
 */
const updateUserStatusSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'suspended').required(),
    reason: Joi.string().max(500).optional().allow('')
  })
};

/**
 * Bulk update users validation schema
 */
const bulkUpdateUsersSchema = {
  body: Joi.object({
    user_ids: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
    updates: Joi.object({
      status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
      role: Joi.string().valid(...Object.values(USER_ROLES)).optional(),
      brand_id: Joi.string().uuid().optional().allow(null)
    }).min(1).required()
  })
};

/**
 * Export users validation schema
 */
const exportUsersSchema = {
  query: Joi.object({
    format: Joi.string().valid('csv', 'xlsx').default('csv'),
    role: Joi.string().valid(...Object.values(USER_ROLES)).optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
    brand_id: Joi.string().uuid().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional()
  })
};

module.exports = {
  createUserSchema,
  listUsersSchema,
  getUserSchema,
  updateUserSchema,
  deleteUserSchema,
  updateCurrentUserSchema,
  changeUserPasswordSchema,
  getUserStatisticsSchema,
  getUserActivityLogSchema,
  updateUserStatusSchema,
  bulkUpdateUsersSchema,
  exportUsersSchema
};