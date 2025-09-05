/**
 * Wheel Validators
 * Joi schemas for wheel and spin-related requests
 */

const Joi = require('joi');
const { constants } = require('../utils');
const { VALIDATION_RULES, WHEEL_ITEM_TYPES } = constants;

/**
 * Wheel item validation schema (reusable)
 */
const wheelItemSchema = Joi.object({
  name: Joi.string()
    .max(VALIDATION_RULES.WHEEL_ITEM_NAME_MAX_LENGTH)
    .trim()
    .required()
    .messages({
      'string.empty': 'Item name is required',
      'string.max': `Item name must not exceed ${VALIDATION_RULES.WHEEL_ITEM_NAME_MAX_LENGTH} characters`,
      'any.required': 'Item name is required'
    }),
    
  type: Joi.string()
    .valid(...Object.values(WHEEL_ITEM_TYPES))
    .required()
    .messages({
      'any.only': `Item type must be one of: ${Object.values(WHEEL_ITEM_TYPES).join(', ')}`,
      'any.required': 'Item type is required'
    }),
    
  value: Joi.number()
    .min(0)
    .max(VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION)
    .default(0)
    .messages({
      'number.min': 'Item value cannot be negative',
      'number.max': `Item value cannot exceed ${VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION}`
    }),
    
  probability: Joi.number()
    .min(VALIDATION_RULES.MIN_PROBABILITY)
    .max(VALIDATION_RULES.MAX_PROBABILITY)
    .required()
    .messages({
      'number.min': `Probability must be at least ${VALIDATION_RULES.MIN_PROBABILITY}`,
      'number.max': `Probability cannot exceed ${VALIDATION_RULES.MAX_PROBABILITY}`,
      'any.required': 'Probability is required'
    }),
    
  color: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .default('#007bff')
    .messages({
      'string.pattern.base': 'Color must be a valid hex color code (e.g., #FF0000)'
    }),
    
  icon: Joi.string()
    .max(100)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Icon must not exceed 100 characters'
    }),
    
  description: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
    
  position: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Position cannot be negative',
      'number.integer': 'Position must be a whole number'
    }),
    
  is_active: Joi.boolean()
    .default(true)
});

/**
 * Create wheel validation schema
 */
const createWheelSchema = {
  body: Joi.object({
    name: Joi.string()
      .max(255)
      .trim()
      .required()
      .messages({
        'string.empty': 'Wheel name is required',
        'string.max': 'Wheel name must not exceed 255 characters',
        'any.required': 'Wheel name is required'
      }),
      
    description: Joi.string()
      .max(1000)
      .trim()
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description must not exceed 1000 characters'
      }),
      
    max_spins_per_day: Joi.number()
      .integer()
      .min(1)
      .max(VALIDATION_RULES.MAX_DAILY_SPINS)
      .default(3)
      .messages({
        'number.min': 'Maximum spins per day must be at least 1',
        'number.max': `Maximum spins per day cannot exceed ${VALIDATION_RULES.MAX_DAILY_SPINS}`,
        'number.integer': 'Maximum spins per day must be a whole number'
      }),
      
    spin_cooldown_minutes: Joi.number()
      .integer()
      .min(0)
      .max(1440) // 24 hours
      .default(60)
      .messages({
        'number.min': 'Spin cooldown cannot be negative',
        'number.max': 'Spin cooldown cannot exceed 1440 minutes (24 hours)',
        'number.integer': 'Spin cooldown must be a whole number'
      }),
      
    start_date: Joi.date()
      .iso()
      .optional()
      .messages({
        'date.format': 'Start date must be in ISO format'
      }),
      
    end_date: Joi.date()
      .iso()
      .min(Joi.ref('start_date'))
      .optional()
      .messages({
        'date.format': 'End date must be in ISO format',
        'date.min': 'End date must be after start date'
      }),
      
    is_active: Joi.boolean()
      .default(true),
      
    items: Joi.array()
      .items(wheelItemSchema)
      .min(2)
      .max(20)
      .required()
      .custom((value, helpers) => {
        // Validate that probabilities sum to 1.0
        const totalProbability = value.reduce((sum, item) => sum + item.probability, 0);
        const tolerance = 0.001; // Allow small floating point errors
        
        if (Math.abs(totalProbability - 1.0) > tolerance) {
          return helpers.error('array.probabilitySum', { totalProbability });
        }
        
        return value;
      })
      .messages({
        'array.min': 'Wheel must have at least 2 items',
        'array.max': 'Wheel cannot have more than 20 items',
        'array.probabilitySum': 'Item probabilities must sum to 1.0 (current sum: {{#totalProbability}})',
        'any.required': 'Wheel items are required'
      })
  })
};

/**
 * Update wheel validation schema
 */
const updateWheelSchema = {
  body: Joi.object({
    name: Joi.string()
      .max(255)
      .trim()
      .optional()
      .messages({
        'string.max': 'Wheel name must not exceed 255 characters'
      }),
      
    description: Joi.string()
      .max(1000)
      .trim()
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description must not exceed 1000 characters'
      }),
      
    max_spins_per_day: Joi.number()
      .integer()
      .min(1)
      .max(VALIDATION_RULES.MAX_DAILY_SPINS)
      .optional()
      .messages({
        'number.min': 'Maximum spins per day must be at least 1',
        'number.max': `Maximum spins per day cannot exceed ${VALIDATION_RULES.MAX_DAILY_SPINS}`,
        'number.integer': 'Maximum spins per day must be a whole number'
      }),
      
    spin_cooldown_minutes: Joi.number()
      .integer()
      .min(0)
      .max(1440)
      .optional()
      .messages({
        'number.min': 'Spin cooldown cannot be negative',
        'number.max': 'Spin cooldown cannot exceed 1440 minutes (24 hours)',
        'number.integer': 'Spin cooldown must be a whole number'
      }),
      
    start_date: Joi.date()
      .iso()
      .optional()
      .messages({
        'date.format': 'Start date must be in ISO format'
      }),
      
    end_date: Joi.date()
      .iso()
      .min(Joi.ref('start_date'))
      .optional()
      .messages({
        'date.format': 'End date must be in ISO format',
        'date.min': 'End date must be after start date'
      }),
      
    is_active: Joi.boolean().optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Wheel ID must be a valid UUID',
        'any.required': 'Wheel ID is required'
      })
  })
};

/**
 * Update wheel items validation schema
 */
const updateWheelItemsSchema = {
  body: Joi.object({
    items: Joi.array()
      .items(wheelItemSchema.keys({
        id: Joi.string().uuid().optional() // Allow existing item IDs for updates
      }))
      .min(2)
      .max(20)
      .required()
      .custom((value, helpers) => {
        // Validate that probabilities sum to 1.0
        const totalProbability = value.reduce((sum, item) => sum + item.probability, 0);
        const tolerance = 0.001;
        
        if (Math.abs(totalProbability - 1.0) > tolerance) {
          return helpers.error('array.probabilitySum', { totalProbability });
        }
        
        return value;
      })
      .messages({
        'array.min': 'Wheel must have at least 2 items',
        'array.max': 'Wheel cannot have more than 20 items',
        'array.probabilitySum': 'Item probabilities must sum to 1.0 (current sum: {{#totalProbability}})',
        'any.required': 'Wheel items are required'
      })
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Wheel ID must be a valid UUID',
        'any.required': 'Wheel ID is required'
      })
  })
};

/**
 * Get wheel validation schema
 */
const getWheelSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Wheel ID must be a valid UUID',
        'any.required': 'Wheel ID is required'
      })
  })
};

/**
 * List wheels validation schema
 */
const listWheelsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(255).optional().allow(''),
    is_active: Joi.boolean().optional(),
    sort_by: Joi.string().valid('name', 'created_at', 'updated_at', 'max_spins_per_day').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Delete wheel validation schema
 */
const deleteWheelSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Wheel ID must be a valid UUID',
        'any.required': 'Wheel ID is required'
      })
  })
};

/**
 * Spin wheel validation schema
 */
const spinWheelSchema = {
  body: Joi.object({
    member_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      })
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Wheel ID must be a valid UUID',
        'any.required': 'Wheel ID is required'
      })
  })
};

/**
 * Get spin history validation schema
 */
const getSpinHistorySchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Wheel ID must be a valid UUID',
        'any.required': 'Wheel ID is required'
      })
  }),
  
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    member_id: Joi.string().uuid().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    is_winner: Joi.boolean().optional(),
    sort_by: Joi.string().valid('created_at', 'result_value').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Get member spin history validation schema
 */
const getMemberSpinHistorySchema = {
  params: Joi.object({
    member_id: Joi.string()
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
    wheel_id: Joi.string().uuid().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    is_winner: Joi.boolean().optional(),
    sort_by: Joi.string().valid('created_at', 'result_value').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Get wheel statistics validation schema
 */
const getWheelStatisticsSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Wheel ID must be a valid UUID',
        'any.required': 'Wheel ID is required'
      })
  }),
  
  query: Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').default('monthly')
  })
};

/**
 * Get item performance validation schema
 */
const getItemPerformanceSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Wheel ID must be a valid UUID',
        'any.required': 'Wheel ID is required'
      })
  }),
  
  query: Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional()
  })
};

/**
 * Check member spin eligibility validation schema
 */
const checkSpinEligibilitySchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Wheel ID must be a valid UUID',
        'any.required': 'Wheel ID is required'
      }),
      
    member_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      })
  })
};

/**
 * Get member daily spin count validation schema
 */
const getMemberDailySpinCountSchema = {
  params: Joi.object({
    member_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      })
  }),
  
  query: Joi.object({
    date: Joi.date().iso().default(() => new Date().toISOString().split('T')[0]),
    wheel_id: Joi.string().uuid().optional()
  })
};

/**
 * Validate wheel probabilities validation schema
 */
const validateWheelProbabilitiesSchema = {
  body: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          probability: Joi.number()
            .min(VALIDATION_RULES.MIN_PROBABILITY)
            .max(VALIDATION_RULES.MAX_PROBABILITY)
            .required()
        })
      )
      .min(2)
      .required()
      .custom((value, helpers) => {
        const totalProbability = value.reduce((sum, item) => sum + item.probability, 0);
        const tolerance = 0.001;
        
        if (Math.abs(totalProbability - 1.0) > tolerance) {
          return helpers.error('array.probabilitySum', { totalProbability });
        }
        
        return value;
      })
      .messages({
        'array.min': 'At least 2 items are required',
        'array.probabilitySum': 'Item probabilities must sum to 1.0 (current sum: {{#totalProbability}})',
        'any.required': 'Items array is required'
      })
  })
};

module.exports = {
  createWheelSchema,
  updateWheelSchema,
  updateWheelItemsSchema,
  getWheelSchema,
  listWheelsSchema,
  deleteWheelSchema,
  spinWheelSchema,
  getSpinHistorySchema,
  getMemberSpinHistorySchema,
  getWheelStatisticsSchema,
  getItemPerformanceSchema,
  checkSpinEligibilitySchema,
  getMemberDailySpinCountSchema,
  validateWheelProbabilitiesSchema
};