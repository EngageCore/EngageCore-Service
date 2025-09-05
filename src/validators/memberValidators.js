/**
 * Member Validators
 * Joi schemas for member-related requests
 */

const Joi = require('joi');
const { constants } = require('../utils');
const { VALIDATION_RULES } = constants;

/**
 * Create member validation schema
 */
const createMemberSchema = {
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
      
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .allow(null, '')
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
      
    date_of_birth: Joi.date()
      .max('now')
      .optional()
      .messages({
        'date.max': 'Date of birth cannot be in the future'
      }),
      
    gender: Joi.string()
      .valid('male', 'female', 'other', 'prefer_not_to_say')
      .optional()
      .messages({
        'any.only': 'Gender must be one of: male, female, other, prefer_not_to_say'
      }),
      
    address: Joi.object({
      street: Joi.string().optional().allow(''),
      city: Joi.string().optional().allow(''),
      state: Joi.string().optional().allow(''),
      postal_code: Joi.string().optional().allow(''),
      country: Joi.string().optional().allow('')
    }).optional(),
    
    preferences: Joi.object({
      language: Joi.string().length(2).default('en'),
      timezone: Joi.string().default('UTC'),
      email_notifications: Joi.boolean().default(true),
      sms_notifications: Joi.boolean().default(false),
      marketing_emails: Joi.boolean().default(true)
    }).optional(),
    
    points_balance: Joi.number()
      .integer()
      .min(0)
      .max(VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION)
      .default(0)
      .messages({
        'number.min': 'Points balance cannot be negative',
        'number.max': `Points balance cannot exceed ${VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION}`,
        'number.integer': 'Points balance must be a whole number'
      }),
      
    tier_id: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.uuid': 'Tier ID must be a valid UUID'
      }),
      
    referral_code: Joi.string()
      .alphanum()
      .length(8)
      .optional()
      .messages({
        'string.alphanum': 'Referral code must contain only letters and numbers',
        'string.length': 'Referral code must be exactly 8 characters long'
      }),
      
    referred_by: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.uuid': 'Referred by must be a valid member UUID'
      }),
      
    external_id: Joi.string()
      .max(255)
      .optional()
      .messages({
        'string.max': 'External ID must not exceed 255 characters'
      }),
      
    metadata: Joi.object().optional()
  })
};

/**
 * Update member validation schema
 */
const updateMemberSchema = {
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
      
    email: Joi.string()
      .email()
      .max(VALIDATION_RULES.EMAIL_MAX_LENGTH)
      .lowercase()
      .trim()
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address',
        'string.max': `Email must not exceed ${VALIDATION_RULES.EMAIL_MAX_LENGTH} characters`
      }),
      
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .allow(null, '')
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
      
    date_of_birth: Joi.date()
      .max('now')
      .optional()
      .messages({
        'date.max': 'Date of birth cannot be in the future'
      }),
      
    gender: Joi.string()
      .valid('male', 'female', 'other', 'prefer_not_to_say')
      .optional()
      .messages({
        'any.only': 'Gender must be one of: male, female, other, prefer_not_to_say'
      }),
      
    address: Joi.object({
      street: Joi.string().optional().allow(''),
      city: Joi.string().optional().allow(''),
      state: Joi.string().optional().allow(''),
      postal_code: Joi.string().optional().allow(''),
      country: Joi.string().optional().allow('')
    }).optional(),
    
    preferences: Joi.object({
      language: Joi.string().length(2).optional(),
      timezone: Joi.string().optional(),
      email_notifications: Joi.boolean().optional(),
      sms_notifications: Joi.boolean().optional(),
      marketing_emails: Joi.boolean().optional()
    }).optional(),
    
    tier_id: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.uuid': 'Tier ID must be a valid UUID'
      }),
      
    status: Joi.string()
      .valid('active', 'inactive', 'suspended', 'banned')
      .optional()
      .messages({
        'any.only': 'Status must be one of: active, inactive, suspended, banned'
      }),
      
    external_id: Joi.string()
      .max(255)
      .optional()
      .messages({
        'string.max': 'External ID must not exceed 255 characters'
      }),
      
    metadata: Joi.object().optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      })
  })
};

/**
 * Get member validation schema
 */
const getMemberSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      })
  })
};

/**
 * List members validation schema
 */
const listMembersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(255).optional().allow(''),
    tier_id: Joi.string().uuid().optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'banned').optional(),
    sort_by: Joi.string().valid('first_name', 'last_name', 'email', 'points_balance', 'total_points_earned', 'created_at', 'last_activity_at').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc'),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional()
  })
};

/**
 * Delete member validation schema
 */
const deleteMemberSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      })
  })
};

/**
 * Update member points validation schema
 */
const updateMemberPointsSchema = {
  body: Joi.object({
    points: Joi.number()
      .integer()
      .min(-VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION)
      .max(VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION)
      .required()
      .messages({
        'number.min': `Points adjustment cannot be less than -${VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION}`,
        'number.max': `Points adjustment cannot exceed ${VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION}`,
        'number.integer': 'Points must be a whole number',
        'any.required': 'Points adjustment is required'
      }),
      
    type: Joi.string()
      .valid('points_earned', 'points_spent', 'points_awarded', 'points_deducted', 'admin_adjustment')
      .required()
      .messages({
        'any.only': 'Transaction type must be one of: points_earned, points_spent, points_awarded, points_deducted, admin_adjustment',
        'any.required': 'Transaction type is required'
      }),
      
    description: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Description must not exceed 500 characters'
      }),
      
    reference_id: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.uuid': 'Reference ID must be a valid UUID'
      }),
      
    reference_type: Joi.string()
      .max(100)
      .optional()
      .messages({
        'string.max': 'Reference type must not exceed 100 characters'
      })
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      })
  })
};

/**
 * Get member statistics validation schema
 */
const getMemberStatisticsSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      })
  }),
  
  query: Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').default('monthly')
  })
};

/**
 * Get member transactions validation schema
 */
const getMemberTransactionsSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      })
  }),
  
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    type: Joi.string().valid('points_earned', 'points_spent', 'points_awarded', 'points_deducted', 'wheel_win', 'mission_reward', 'bonus_points', 'referral_bonus', 'tier_upgrade_bonus', 'admin_adjustment').optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    sort_by: Joi.string().valid('created_at', 'points', 'type').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Check email availability validation schema
 */
const checkEmailAvailabilitySchema = {
  query: Joi.object({
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
      
    exclude_id: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.uuid': 'Exclude ID must be a valid UUID'
      })
  })
};

/**
 * Import members validation schema
 */
const importMembersSchema = {
  body: Joi.object({
    members: Joi.array()
      .items(
        Joi.object({
          first_name: Joi.string().min(VALIDATION_RULES.NAME_MIN_LENGTH).max(VALIDATION_RULES.NAME_MAX_LENGTH).trim().required(),
          last_name: Joi.string().min(VALIDATION_RULES.NAME_MIN_LENGTH).max(VALIDATION_RULES.NAME_MAX_LENGTH).trim().required(),
          email: Joi.string().email().max(VALIDATION_RULES.EMAIL_MAX_LENGTH).lowercase().trim().required(),
          phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow(null, ''),
          points_balance: Joi.number().integer().min(0).max(VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION).default(0),
          external_id: Joi.string().max(255).optional()
        })
      )
      .min(1)
      .max(1000)
      .required()
      .messages({
        'array.min': 'At least one member must be provided',
        'array.max': 'Cannot import more than 1000 members at once',
        'any.required': 'Members array is required'
      }),
      
    skip_duplicates: Joi.boolean().default(true),
    send_welcome_email: Joi.boolean().default(false)
  })
};

/**
 * Export members validation schema
 */
const exportMembersSchema = {
  query: Joi.object({
    format: Joi.string().valid('csv', 'xlsx', 'json').default('csv'),
    tier_id: Joi.string().uuid().optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'banned').optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    fields: Joi.array().items(
      Joi.string().valid('first_name', 'last_name', 'email', 'phone', 'points_balance', 'total_points_earned', 'tier_name', 'status', 'created_at', 'last_activity_at')
    ).optional()
  })
};

/**
 * Get member leaderboard validation schema
 */
const getMemberLeaderboardSchema = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    period: Joi.string().valid('all_time', 'monthly', 'weekly').default('all_time'),
    order_by: Joi.string().valid('total_points_earned', 'points_balance').default('total_points_earned')
  })
};

module.exports = {
  createMemberSchema,
  updateMemberSchema,
  getMemberSchema,
  listMembersSchema,
  deleteMemberSchema,
  updateMemberPointsSchema,
  getMemberStatisticsSchema,
  getMemberTransactionsSchema,
  checkEmailAvailabilitySchema,
  importMembersSchema,
  exportMembersSchema,
  getMemberLeaderboardSchema
};