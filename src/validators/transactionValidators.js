/**
 * Transaction Validators
 * Joi schemas for transaction-related requests
 */

const Joi = require('joi');
const { constants } = require('../utils');
const { VALIDATION_RULES, TRANSACTION_TYPES } = constants;

/**
 * Create transaction validation schema
 */
const createTransactionSchema = {
  body: Joi.object({
    member_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      }),
      
    type: Joi.string()
      .valid(...Object.values(TRANSACTION_TYPES))
      .required()
      .messages({
        'any.only': `Transaction type must be one of: ${Object.values(TRANSACTION_TYPES).join(', ')}`,
        'any.required': 'Transaction type is required'
      }),
      
    points: Joi.number()
      .integer()
      .min(-VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION)
      .max(VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION)
      .required()
      .messages({
        'number.min': `Points cannot be less than -${VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION}`,
        'number.max': `Points cannot exceed ${VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION}`,
        'number.integer': 'Points must be a whole number',
        'any.required': 'Points amount is required'
      }),
      
    description: Joi.string()
      .max(500)
      .trim()
      .optional()
      .allow('')
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
      }),
      
    status: Joi.string()
      .valid('pending', 'completed', 'failed', 'cancelled', 'reversed')
      .default('completed')
      .messages({
        'any.only': 'Status must be one of: pending, completed, failed, cancelled, reversed'
      }),
      
    metadata: Joi.object()
      .optional()
      .messages({
        'object.base': 'Metadata must be an object'
      })
  })
};

/**
 * Update transaction validation schema
 */
const updateTransactionSchema = {
  body: Joi.object({
    status: Joi.string()
      .valid('pending', 'completed', 'failed', 'cancelled', 'reversed')
      .optional()
      .messages({
        'any.only': 'Status must be one of: pending, completed, failed, cancelled, reversed'
      }),
      
    description: Joi.string()
      .max(500)
      .trim()
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description must not exceed 500 characters'
      }),
      
    metadata: Joi.object()
      .optional()
      .messages({
        'object.base': 'Metadata must be an object'
      })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Transaction ID must be a valid UUID',
        'any.required': 'Transaction ID is required'
      })
  })
};

/**
 * Get transaction validation schema
 */
const getTransactionSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Transaction ID must be a valid UUID',
        'any.required': 'Transaction ID is required'
      })
  })
};

/**
 * List transactions validation schema
 */
const listTransactionsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    member_id: Joi.string().uuid().optional(),
    type: Joi.string().valid(...Object.values(TRANSACTION_TYPES)).optional(),
    status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled', 'reversed').optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    min_points: Joi.number().integer().optional(),
    max_points: Joi.number().integer().min(Joi.ref('min_points')).optional(),
    reference_type: Joi.string().max(100).optional(),
    sort_by: Joi.string().valid('created_at', 'points', 'type', 'status').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Get member transactions validation schema
 */
const getMemberTransactionsSchema = {
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
    type: Joi.string().valid(...Object.values(TRANSACTION_TYPES)).optional(),
    status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled', 'reversed').optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    sort_by: Joi.string().valid('created_at', 'points', 'type').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Get transaction statistics validation schema
 */
const getTransactionStatisticsSchema = {
  query: Joi.object({
    member_id: Joi.string().uuid().optional(),
    type: Joi.string().valid(...Object.values(TRANSACTION_TYPES)).optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').default('monthly')
  })
};

/**
 * Get transaction trends validation schema
 */
const getTransactionTrendsSchema = {
  query: Joi.object({
    period: Joi.string().valid('daily', 'weekly', 'monthly').default('daily'),
    days: Joi.number().integer().min(1).max(365).default(30),
    type: Joi.string().valid(...Object.values(TRANSACTION_TYPES)).optional()
  })
};

/**
 * Get top spending members validation schema
 */
const getTopSpendingMembersSchema = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    type: Joi.string().valid('points_spent').default('points_spent')
  })
};

/**
 * Get transaction type breakdown validation schema
 */
const getTransactionTypeBreakdownSchema = {
  query: Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional()
  })
};

/**
 * Reverse transaction validation schema
 */
const reverseTransactionSchema = {
  body: Joi.object({
    reason: Joi.string()
      .max(500)
      .trim()
      .required()
      .messages({
        'string.empty': 'Reason for reversal is required',
        'string.max': 'Reason must not exceed 500 characters',
        'any.required': 'Reason for reversal is required'
      })
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Transaction ID must be a valid UUID',
        'any.required': 'Transaction ID is required'
      })
  })
};

/**
 * Bulk create transactions validation schema
 */
const bulkCreateTransactionsSchema = {
  body: Joi.object({
    transactions: Joi.array()
      .items(
        Joi.object({
          member_id: Joi.string().uuid().required(),
          type: Joi.string().valid(...Object.values(TRANSACTION_TYPES)).required(),
          points: Joi.number().integer().min(-VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION).max(VALIDATION_RULES.MAX_POINTS_PER_TRANSACTION).required(),
          description: Joi.string().max(500).optional().allow(''),
          reference_id: Joi.string().uuid().optional(),
          reference_type: Joi.string().max(100).optional(),
          metadata: Joi.object().optional()
        })
      )
      .min(1)
      .max(1000)
      .required()
      .messages({
        'array.min': 'At least one transaction must be provided',
        'array.max': 'Cannot create more than 1000 transactions at once',
        'any.required': 'Transactions array is required'
      }),
      
    validate_balances: Joi.boolean().default(true),
    skip_notifications: Joi.boolean().default(false)
  })
};

/**
 * Export transactions validation schema
 */
const exportTransactionsSchema = {
  query: Joi.object({
    format: Joi.string().valid('csv', 'xlsx', 'json').default('csv'),
    member_id: Joi.string().uuid().optional(),
    type: Joi.string().valid(...Object.values(TRANSACTION_TYPES)).optional(),
    status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled', 'reversed').optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    fields: Joi.array().items(
      Joi.string().valid('id', 'member_id', 'member_name', 'type', 'points', 'description', 'status', 'reference_id', 'reference_type', 'created_at')
    ).optional()
  })
};

/**
 * Get member points balance validation schema
 */
const getMemberPointsBalanceSchema = {
  params: Joi.object({
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
 * Validate transaction amount validation schema
 */
const validateTransactionAmountSchema = {
  body: Joi.object({
    member_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required'
      }),
      
    points: Joi.number()
      .integer()
      .required()
      .messages({
        'number.integer': 'Points must be a whole number',
        'any.required': 'Points amount is required'
      }),
      
    type: Joi.string()
      .valid(...Object.values(TRANSACTION_TYPES))
      .required()
      .messages({
        'any.only': `Transaction type must be one of: ${Object.values(TRANSACTION_TYPES).join(', ')}`,
        'any.required': 'Transaction type is required'
      })
  })
};

/**
 * Get pending transactions validation schema
 */
const getPendingTransactionsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    member_id: Joi.string().uuid().optional(),
    type: Joi.string().valid(...Object.values(TRANSACTION_TYPES)).optional(),
    older_than_hours: Joi.number().integer().min(1).optional(),
    sort_by: Joi.string().valid('created_at', 'points', 'type').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('asc')
  })
};

/**
 * Process pending transaction validation schema
 */
const processPendingTransactionSchema = {
  body: Joi.object({
    action: Joi.string()
      .valid('approve', 'reject')
      .required()
      .messages({
        'any.only': 'Action must be either approve or reject',
        'any.required': 'Action is required'
      }),
      
    reason: Joi.string()
      .max(500)
      .when('action', {
        is: 'reject',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.max': 'Reason must not exceed 500 characters',
        'any.required': 'Reason is required when rejecting a transaction'
      })
  }),
  
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Transaction ID must be a valid UUID',
        'any.required': 'Transaction ID is required'
      })
  })
};

/**
 * Get transaction summary validation schema
 */
const getTransactionSummarySchema = {
  query: Joi.object({
    member_id: Joi.string().uuid().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    group_by: Joi.string().valid('type', 'status', 'date').default('type')
  })
};

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
  getTransactionSchema,
  listTransactionsSchema,
  getMemberTransactionsSchema,
  getTransactionStatisticsSchema,
  getTransactionTrendsSchema,
  getTopSpendingMembersSchema,
  getTransactionTypeBreakdownSchema,
  reverseTransactionSchema,
  bulkCreateTransactionsSchema,
  exportTransactionsSchema,
  getMemberPointsBalanceSchema,
  validateTransactionAmountSchema,
  getPendingTransactionsSchema,
  processPendingTransactionSchema,
  getTransactionSummarySchema
};