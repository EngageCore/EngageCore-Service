/**
 * Mission Validators
 * Joi schemas for mission-related requests
 */

const Joi = require('joi');
const { constants } = require('../utils');
const { VALIDATION_RULES, MISSION_TYPES, MISSION_STATUS } = constants;

/**
 * Create mission validation schema
 */
const createMissionSchema = {
  body: Joi.object({
    title: Joi.string()
      .max(VALIDATION_RULES.MISSION_TITLE_MAX_LENGTH)
      .trim()
      .required()
      .messages({
        'string.empty': 'Mission title is required',
        'string.max': `Mission title must not exceed ${VALIDATION_RULES.MISSION_TITLE_MAX_LENGTH} characters`,
        'any.required': 'Mission title is required'
      }),
      
    description: Joi.string()
      .max(VALIDATION_RULES.MISSION_DESCRIPTION_MAX_LENGTH)
      .trim()
      .required()
      .messages({
        'string.empty': 'Mission description is required',
        'string.max': `Mission description must not exceed ${VALIDATION_RULES.MISSION_DESCRIPTION_MAX_LENGTH} characters`,
        'any.required': 'Mission description is required'
      }),
      
    type: Joi.string()
      .valid(...Object.values(MISSION_TYPES))
      .required()
      .messages({
        'any.only': `Mission type must be one of: ${Object.values(MISSION_TYPES).join(', ')}`,
        'any.required': 'Mission type is required'
      }),
      
    difficulty: Joi.string()
      .valid('easy', 'medium', 'hard')
      .default('medium')
      .messages({
        'any.only': 'Difficulty must be one of: easy, medium, hard'
      }),
      
    reward_points: Joi.number()
      .integer()
      .min(1)
      .max(VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION)
      .required()
      .messages({
        'number.min': 'Reward points must be at least 1',
        'number.max': `Reward points cannot exceed ${VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION}`,
        'number.integer': 'Reward points must be a whole number',
        'any.required': 'Reward points are required'
      }),
      
    requirements: Joi.object({
      action: Joi.string().required().messages({
        'any.required': 'Action requirement is required'
      }),
      target_value: Joi.number().min(1).optional(),
      conditions: Joi.object().optional()
    }).required().messages({
      'any.required': 'Mission requirements are required'
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
      
    max_completions: Joi.number()
      .integer()
      .min(1)
      .optional()
      .messages({
        'number.min': 'Maximum completions must be at least 1',
        'number.integer': 'Maximum completions must be a whole number'
      }),
      
    priority: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .default(5)
      .messages({
        'number.min': 'Priority must be at least 1',
        'number.max': 'Priority cannot exceed 10',
        'number.integer': 'Priority must be a whole number'
      }),
      
    tags: Joi.array()
      .items(Joi.string().max(50))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Cannot have more than 10 tags',
        'string.max': 'Each tag must not exceed 50 characters'
      }),
      
    icon: Joi.string()
      .max(100)
      .optional()
      .allow(null, '')
      .messages({
        'string.max': 'Icon must not exceed 100 characters'
      }),
      
    image_url: Joi.string()
      .uri()
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Image URL must be a valid URL'
      }),
      
    is_featured: Joi.boolean()
      .default(false),
      
    auto_assign: Joi.boolean()
      .default(true),
      
    status: Joi.string()
      .valid(...Object.values(MISSION_STATUS))
      .default(MISSION_STATUS.ACTIVE)
      .messages({
        'any.only': `Status must be one of: ${Object.values(MISSION_STATUS).join(', ')}`
      }),
      
    metadata: Joi.object().optional()
  })
};

/**
 * Update mission validation schema
 */
const updateMissionSchema = {
  body: Joi.object({
    title: Joi.string()
      .max(VALIDATION_RULES.MISSION_TITLE_MAX_LENGTH)
      .trim()
      .optional()
      .messages({
        'string.max': `Mission title must not exceed ${VALIDATION_RULES.MISSION_TITLE_MAX_LENGTH} characters`
      }),
      
    description: Joi.string()
      .max(VALIDATION_RULES.MISSION_DESCRIPTION_MAX_LENGTH)
      .trim()
      .optional()
      .messages({
        'string.max': `Mission description must not exceed ${VALIDATION_RULES.MISSION_DESCRIPTION_MAX_LENGTH} characters`
      }),
      
    type: Joi.string()
      .valid(...Object.values(MISSION_TYPES))
      .optional()
      .messages({
        'any.only': `Mission type must be one of: ${Object.values(MISSION_TYPES).join(', ')}`
      }),
      
    difficulty: Joi.string()
      .valid('easy', 'medium', 'hard')
      .optional()
      .messages({
        'any.only': 'Difficulty must be one of: easy, medium, hard'
      }),
      
    reward_points: Joi.number()
      .integer()
      .min(1)
      .max(VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION)
      .optional()
      .messages({
        'number.min': 'Reward points must be at least 1',
        'number.max': `Reward points cannot exceed ${VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION}`,
        'number.integer': 'Reward points must be a whole number'
      }),
      
    requirements: Joi.object({
      action: Joi.string().required(),
      target_value: Joi.number().min(1).optional(),
      conditions: Joi.object().optional()
    }).optional(),
    
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
      
    max_completions: Joi.number()
      .integer()
      .min(1)
      .optional()
      .messages({
        'number.min': 'Maximum completions must be at least 1',
        'number.integer': 'Maximum completions must be a whole number'
      }),
      
    priority: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .optional()
      .messages({
        'number.min': 'Priority must be at least 1',
        'number.max': 'Priority cannot exceed 10',
        'number.integer': 'Priority must be a whole number'
      }),
      
    tags: Joi.array()
      .items(Joi.string().max(50))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Cannot have more than 10 tags',
        'string.max': 'Each tag must not exceed 50 characters'
      }),
      
    icon: Joi.string()
      .max(100)
      .optional()
      .allow(null, '')
      .messages({
        'string.max': 'Icon must not exceed 100 characters'
      }),
      
    image_url: Joi.string()
      .uri()
      .optional()
      .allow(null, '')
      .messages({
        'string.uri': 'Image URL must be a valid URL'
      }),
      
    is_featured: Joi.boolean().optional(),
    auto_assign: Joi.boolean().optional(),
    
    status: Joi.string()
      .valid(...Object.values(MISSION_STATUS))
      .optional()
      .messages({
        'any.only': `Status must be one of: ${Object.values(MISSION_STATUS).join(', ')}`
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
        'string.uuid': 'Mission ID must be a valid UUID',
        'any.required': 'Mission ID is required'
      })
  })
};

/**
 * Get mission validation schema
 */
const getMissionSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Mission ID must be a valid UUID',
        'any.required': 'Mission ID is required'
      })
  })
};

/**
 * List missions validation schema
 */
const listMissionsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(255).optional().allow(''),
    type: Joi.string().valid(...Object.values(MISSION_TYPES)).optional(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
    status: Joi.string().valid(...Object.values(MISSION_STATUS)).optional(),
    is_featured: Joi.boolean().optional(),
    sort_by: Joi.string().valid('title', 'type', 'difficulty', 'reward_points', 'priority', 'created_at', 'start_date', 'end_date').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc'),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional()
  })
};

/**
 * Delete mission validation schema
 */
const deleteMissionSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Mission ID must be a valid UUID',
        'any.required': 'Mission ID is required'
      })
  })
};

/**
 * Complete mission validation schema
 */
const completeMissionSchema = {
  body: Joi.object({
    member_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      }),
      
    completion_data: Joi.object()
      .optional()
      .messages({
        'object.base': 'Completion data must be an object'
      }),
      
    notes: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Notes must not exceed 500 characters'
      })
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Mission ID must be a valid UUID',
        'any.required': 'Mission ID is required'
      })
  })
};

/**
 * Get member missions validation schema
 */
const getMemberMissionsSchema = {
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
    type: Joi.string().valid(...Object.values(MISSION_TYPES)).optional(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
    status: Joi.string().valid('available', 'completed', 'expired').default('available'),
    sort_by: Joi.string().valid('title', 'difficulty', 'reward_points', 'priority', 'created_at').default('priority'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Get mission completions validation schema
 */
const getMissionCompletionsSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Mission ID must be a valid UUID',
        'any.required': 'Mission ID is required'
      })
  }),
  
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    member_id: Joi.string().uuid().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    sort_by: Joi.string().valid('completed_at', 'reward_points').default('completed_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Get member mission completions validation schema
 */
const getMemberMissionCompletionsSchema = {
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
    mission_type: Joi.string().valid(...Object.values(MISSION_TYPES)).optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    sort_by: Joi.string().valid('completed_at', 'reward_points').default('completed_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Claim mission reward validation schema
 */
const claimMissionRewardSchema = {
  params: Joi.object({
    completion_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Completion ID must be a valid UUID',
        'any.required': 'Completion ID is required'
      })
  })
};

/**
 * Get mission statistics validation schema
 */
const getMissionStatisticsSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Mission ID must be a valid UUID',
        'any.required': 'Mission ID is required'
      })
  }),
  
  query: Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').default('monthly')
  })
};

/**
 * Get brand mission statistics validation schema
 */
const getBrandMissionStatisticsSchema = {
  query: Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').default('monthly'),
    type: Joi.string().valid(...Object.values(MISSION_TYPES)).optional(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional()
  })
};

/**
 * Get top performing missions validation schema
 */
const getTopPerformingMissionsSchema = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    order_by: Joi.string().valid('completion_count', 'unique_participants', 'points_awarded').default('completion_count')
  })
};

/**
 * Check mission completion eligibility validation schema
 */
const checkMissionEligibilitySchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Mission ID must be a valid UUID',
        'any.required': 'Mission ID is required'
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
 * Bulk create missions validation schema
 */
const bulkCreateMissionsSchema = {
  body: Joi.object({
    missions: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().max(VALIDATION_RULES.MISSION_TITLE_MAX_LENGTH).trim().required(),
          description: Joi.string().max(VALIDATION_RULES.MISSION_DESCRIPTION_MAX_LENGTH).trim().required(),
          type: Joi.string().valid(...Object.values(MISSION_TYPES)).required(),
          difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
          reward_points: Joi.number().integer().min(1).max(VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION).required(),
          requirements: Joi.object({
            action: Joi.string().required(),
            target_value: Joi.number().min(1).optional(),
            conditions: Joi.object().optional()
          }).required(),
          priority: Joi.number().integer().min(1).max(10).default(5),
          tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
          auto_assign: Joi.boolean().default(true)
        })
      )
      .min(1)
      .max(50)
      .required()
      .messages({
        'array.min': 'At least one mission must be provided',
        'array.max': 'Cannot create more than 50 missions at once',
        'any.required': 'Missions array is required'
      })
  })
};

/**
 * Assign mission to member validation schema
 */
const assignMissionToMemberSchema = {
  body: Joi.object({
    member_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      }),
      
    due_date: Joi.date()
      .iso()
      .min('now')
      .optional()
      .messages({
        'date.format': 'Due date must be in ISO format',
        'date.min': 'Due date must be in the future'
      })
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Mission ID must be a valid UUID',
        'any.required': 'Mission ID is required'
      })
  })
};

module.exports = {
  createMissionSchema,
  updateMissionSchema,
  getMissionSchema,
  listMissionsSchema,
  deleteMissionSchema,
  completeMissionSchema,
  getMemberMissionsSchema,
  getMissionCompletionsSchema,
  getMemberMissionCompletionsSchema,
  claimMissionRewardSchema,
  getMissionStatisticsSchema,
  getBrandMissionStatisticsSchema,
  getTopPerformingMissionsSchema,
  checkMissionEligibilitySchema,
  bulkCreateMissionsSchema,
  assignMissionToMemberSchema
};