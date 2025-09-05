/**
 * Brand Validators
 * Joi schemas for brand-related requests
 */

const Joi = require('joi');
const { constants } = require('../utils');
const { VALIDATION_RULES, BRAND_STATUS } = constants;

/**
 * Create brand validation schema
 */
const createBrandSchema = {
  body: Joi.object({
    name: Joi.string()
      .min(VALIDATION_RULES.BRAND_NAME_MIN_LENGTH)
      .max(VALIDATION_RULES.BRAND_NAME_MAX_LENGTH)
      .trim()
      .required()
      .messages({
        'string.empty': 'Brand name is required',
        'string.min': `Brand name must be at least ${VALIDATION_RULES.BRAND_NAME_MIN_LENGTH} characters long`,
        'string.max': `Brand name must not exceed ${VALIDATION_RULES.BRAND_NAME_MAX_LENGTH} characters`,
        'any.required': 'Brand name is required'
      }),
      
    slug: Joi.string()
      .min(VALIDATION_RULES.BRAND_SLUG_MIN_LENGTH)
      .max(VALIDATION_RULES.BRAND_SLUG_MAX_LENGTH)
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.empty': 'Brand slug is required',
        'string.min': `Brand slug must be at least ${VALIDATION_RULES.BRAND_SLUG_MIN_LENGTH} characters long`,
        'string.max': `Brand slug must not exceed ${VALIDATION_RULES.BRAND_SLUG_MAX_LENGTH} characters`,
        'string.pattern.base': 'Brand slug can only contain lowercase letters, numbers, and hyphens',
        'any.required': 'Brand slug is required'
      }),
      
    description: Joi.string()
      .max(2000)
      .trim()
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description must not exceed 2000 characters'
      }),
      
    website_url: Joi.string()
      .uri()
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Website URL must be a valid URL'
      }),
      
    logo_url: Joi.string()
      .uri()
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Logo URL must be a valid URL'
      }),
      
    favicon_url: Joi.string()
      .uri()
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Favicon URL must be a valid URL'
      }),
      
    contact_email: Joi.string()
      .email()
      .optional()
      .allow(null, '')
      .messages({
        'string.email': 'Contact email must be a valid email address'
      }),
      
    contact_phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .allow(null, '')
      .messages({
        'string.pattern.base': 'Contact phone must be a valid phone number'
      }),
      
    address: Joi.object({
      street: Joi.string().optional().allow(''),
      city: Joi.string().optional().allow(''),
      state: Joi.string().optional().allow(''),
      postal_code: Joi.string().optional().allow(''),
      country: Joi.string().optional().allow('')
    }).optional(),
    
    settings: Joi.object({
      wheel_config: Joi.object({
        max_daily_spins: Joi.number().integer().min(1).max(50).default(3),
        spin_cooldown_minutes: Joi.number().integer().min(0).max(1440).default(60),
        default_items: Joi.array().items(
          Joi.object({
            name: Joi.string().required(),
            type: Joi.string().valid('points', 'discount', 'product', 'coupon', 'cash', 'bonus_spin', 'tier_upgrade', 'nothing', 'empty').required(),
            value: Joi.number().min(0).default(0),
            probability: Joi.number().min(0).max(1).required()
          })
        ).optional()
      }).optional(),
      
      mission_config: Joi.object({
        daily_mission_limit: Joi.number().integer().min(1).max(20).default(5),
        weekly_mission_limit: Joi.number().integer().min(1).max(10).default(3),
        auto_assign_missions: Joi.boolean().default(true),
        default_point_rewards: Joi.object({
          easy: Joi.number().integer().min(1).default(10),
          medium: Joi.number().integer().min(1).default(25),
          hard: Joi.number().integer().min(1).default(50)
        }).optional()
      }).optional(),
      
      point_config: Joi.object({
        currency_name: Joi.string().max(50).default('Points'),
        currency_symbol: Joi.string().max(10).default('pts'),
        point_expiry_days: Joi.number().integer().min(0).default(365),
        minimum_redemption: Joi.number().integer().min(1).default(100),
        welcome_bonus: Joi.number().integer().min(0).default(50)
      }).optional(),
      
      notification_config: Joi.object({
        email_notifications: Joi.boolean().default(true),
        push_notifications: Joi.boolean().default(true),
        sms_notifications: Joi.boolean().default(false),
        marketing_emails: Joi.boolean().default(true)
      }).optional(),
      
      theme_config: Joi.object({
        primary_color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#007bff'),
        secondary_color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#6c757d'),
        accent_color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#28a745'),
        background_color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#ffffff'),
        text_color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#212529'),
        logo_url: Joi.string().uri().optional().allow(null, ''),
        favicon_url: Joi.string().uri().optional().allow(null, '')
      }).optional()
    }).optional()
  })
};

/**
 * Update brand validation schema
 */
const updateBrandSchema = {
  body: Joi.object({
    name: Joi.string()
      .min(VALIDATION_RULES.BRAND_NAME_MIN_LENGTH)
      .max(VALIDATION_RULES.BRAND_NAME_MAX_LENGTH)
      .trim()
      .optional()
      .messages({
        'string.min': `Brand name must be at least ${VALIDATION_RULES.BRAND_NAME_MIN_LENGTH} characters long`,
        'string.max': `Brand name must not exceed ${VALIDATION_RULES.BRAND_NAME_MAX_LENGTH} characters`
      }),
      
    slug: Joi.string()
      .min(VALIDATION_RULES.BRAND_SLUG_MIN_LENGTH)
      .max(VALIDATION_RULES.BRAND_SLUG_MAX_LENGTH)
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .lowercase()
      .trim()
      .optional()
      .messages({
        'string.min': `Brand slug must be at least ${VALIDATION_RULES.BRAND_SLUG_MIN_LENGTH} characters long`,
        'string.max': `Brand slug must not exceed ${VALIDATION_RULES.BRAND_SLUG_MAX_LENGTH} characters`,
        'string.pattern.base': 'Brand slug can only contain lowercase letters, numbers, and hyphens'
      }),
      
    description: Joi.string()
      .max(2000)
      .trim()
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description must not exceed 2000 characters'
      }),
      
    website_url: Joi.string()
      .uri()
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Website URL must be a valid URL'
      }),
      
    logo_url: Joi.string()
      .uri()
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Logo URL must be a valid URL'
      }),
      
    favicon_url: Joi.string()
      .uri()
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Favicon URL must be a valid URL'
      }),
      
    contact_email: Joi.string()
      .email()
      .optional()
      .allow(null, '')
      .messages({
        'string.email': 'Contact email must be a valid email address'
      }),
      
    contact_phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .allow(null, '')
      .messages({
        'string.pattern.base': 'Contact phone must be a valid phone number'
      }),
      
    address: Joi.object({
      street: Joi.string().optional().allow(''),
      city: Joi.string().optional().allow(''),
      state: Joi.string().optional().allow(''),
      postal_code: Joi.string().optional().allow(''),
      country: Joi.string().optional().allow('')
    }).optional(),
    
    status: Joi.string()
      .valid('active', 'inactive', 'suspended', 'pending_approval')
      .optional()
      .messages({
        'any.only': 'Status must be one of: active, inactive, suspended, pending_approval'
      })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Brand ID must be a valid UUID',
        'any.required': 'Brand ID is required'
      })
  })
};

/**
 * Update brand settings validation schema
 */
const updateBrandSettingsSchema = {
  body: Joi.object({
    wheel_config: Joi.object({
      max_daily_spins: Joi.number().integer().min(1).max(50).optional(),
      spin_cooldown_minutes: Joi.number().integer().min(0).max(1440).optional(),
      default_items: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          type: Joi.string().valid('points', 'discount', 'product', 'coupon', 'cash', 'bonus_spin', 'tier_upgrade', 'nothing', 'empty').required(),
          value: Joi.number().min(0).default(0),
          probability: Joi.number().min(0).max(1).required()
        })
      ).optional()
    }).optional(),
    
    mission_config: Joi.object({
      daily_mission_limit: Joi.number().integer().min(1).max(20).optional(),
      weekly_mission_limit: Joi.number().integer().min(1).max(10).optional(),
      auto_assign_missions: Joi.boolean().optional(),
      default_point_rewards: Joi.object({
        easy: Joi.number().integer().min(1).optional(),
        medium: Joi.number().integer().min(1).optional(),
        hard: Joi.number().integer().min(1).optional()
      }).optional()
    }).optional(),
    
    point_config: Joi.object({
      currency_name: Joi.string().max(50).optional(),
      currency_symbol: Joi.string().max(10).optional(),
      point_expiry_days: Joi.number().integer().min(0).optional(),
      minimum_redemption: Joi.number().integer().min(1).optional(),
      welcome_bonus: Joi.number().integer().min(0).optional()
    }).optional(),
    
    notification_config: Joi.object({
      email_notifications: Joi.boolean().optional(),
      push_notifications: Joi.boolean().optional(),
      sms_notifications: Joi.boolean().optional(),
      marketing_emails: Joi.boolean().optional()
    }).optional(),
    
    theme_config: Joi.object({
      primary_color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      secondary_color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      accent_color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      background_color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      text_color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      logo_url: Joi.string().uri().optional().allow(null, ''),
      favicon_url: Joi.string().uri().optional().allow(null, '')
    }).optional()
  }).min(1).messages({
    'object.min': 'At least one configuration section must be provided'
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Brand ID must be a valid UUID',
        'any.required': 'Brand ID is required'
      })
  })
};

/**
 * Get brand validation schema
 */
const getBrandSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Brand ID must be a valid UUID',
        'any.required': 'Brand ID is required'
      })
  })
};

/**
 * Get brand by slug validation schema
 */
const getBrandBySlugSchema = {
  params: Joi.object({
    slug: Joi.string()
      .min(VALIDATION_RULES.BRAND_SLUG_MIN_LENGTH)
      .max(VALIDATION_RULES.BRAND_SLUG_MAX_LENGTH)
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .required()
      .messages({
        'string.min': `Brand slug must be at least ${VALIDATION_RULES.BRAND_SLUG_MIN_LENGTH} characters long`,
        'string.max': `Brand slug must not exceed ${VALIDATION_RULES.BRAND_SLUG_MAX_LENGTH} characters`,
        'string.pattern.base': 'Brand slug can only contain lowercase letters, numbers, and hyphens',
        'any.required': 'Brand slug is required'
      })
  })
};

/**
 * List brands validation schema
 */
const listBrandsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(255).optional().allow(''),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'pending_approval').optional(),
    sort_by: Joi.string().valid('name', 'slug', 'created_at', 'updated_at').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Delete brand validation schema
 */
const deleteBrandSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Brand ID must be a valid UUID',
        'any.required': 'Brand ID is required'
      })
  })
};

/**
 * Check brand slug availability validation schema
 */
const checkSlugAvailabilitySchema = {
  query: Joi.object({
    slug: Joi.string()
      .min(VALIDATION_RULES.BRAND_SLUG_MIN_LENGTH)
      .max(VALIDATION_RULES.BRAND_SLUG_MAX_LENGTH)
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .required()
      .messages({
        'string.min': `Brand slug must be at least ${VALIDATION_RULES.BRAND_SLUG_MIN_LENGTH} characters long`,
        'string.max': `Brand slug must not exceed ${VALIDATION_RULES.BRAND_SLUG_MAX_LENGTH} characters`,
        'string.pattern.base': 'Brand slug can only contain lowercase letters, numbers, and hyphens',
        'any.required': 'Brand slug is required'
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
 * Upload brand logo validation schema
 */
const uploadLogoSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Brand ID must be a valid UUID',
        'any.required': 'Brand ID is required'
      })
  })
};

/**
 * Get brand statistics validation schema
 */
const getBrandStatisticsSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Brand ID must be a valid UUID',
        'any.required': 'Brand ID is required'
      })
  }),
  
  query: Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').default('monthly')
  })
};

module.exports = {
  createBrandSchema,
  updateBrandSchema,
  updateBrandSettingsSchema,
  getBrandSchema,
  getBrandBySlugSchema,
  listBrandsSchema,
  deleteBrandSchema,
  checkSlugAvailabilitySchema,
  uploadLogoSchema,
  getBrandStatisticsSchema
};