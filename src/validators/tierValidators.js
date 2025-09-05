/**
 * Tier Validators
 * Input validation schemas for tier-related operations
 */

const Joi = require('joi');

// Common validation patterns
const uuidPattern = Joi.string().uuid({ version: 'uuidv4' });
const slugPattern = Joi.string().pattern(/^[a-z0-9-]+$/).min(2).max(100);
const hexColorPattern = Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/);
const tierStatusPattern = Joi.string().valid('active', 'inactive', 'archived');

// Benefit object schema
const benefitSchema = Joi.object({
  type: Joi.string().required().min(1).max(50),
  value: Joi.string().required().min(1).max(100),
  description: Joi.string().required().min(1).max(200)
});

/**
 * Create tier validation schema
 */
const createTierSchema = {
  body: Joi.object({
    name: Joi.string().required().min(1).max(100).trim(),
    slug: slugPattern.required(),
    description: Joi.string().optional().allow('').max(500).trim(),
    min_points_required: Joi.number().integer().min(0).required(),
    max_points_required: Joi.number().integer().min(0).optional().allow(null)
      .when('min_points_required', {
        is: Joi.exist(),
        then: Joi.number().min(Joi.ref('min_points_required'))
      }),
    color: hexColorPattern.optional().default('#000000'),
    sort_order: Joi.number().integer().min(0).optional(),
    status: tierStatusPattern.optional().default('active'),
    benefits: Joi.array().items(benefitSchema).optional().default([]),
    metadata: Joi.object().optional().default({})
  }).required()
};

/**
 * Update tier validation schema
 */
const updateTierSchema = {
  params: Joi.object({
    brandId: uuidPattern.required(),
    id: uuidPattern.required()
  }).required(),
  body: Joi.object({
    name: Joi.string().min(1).max(100).trim().optional(),
    slug: slugPattern.optional(),
    description: Joi.string().allow('').max(500).trim().optional(),
    min_points_required: Joi.number().integer().min(0).optional(),
    max_points_required: Joi.number().integer().min(0).optional().allow(null),
    color: hexColorPattern.optional(),
    sort_order: Joi.number().integer().min(0).optional(),
    status: tierStatusPattern.optional(),
    benefits: Joi.array().items(benefitSchema).optional(),
    metadata: Joi.object().optional()
  }).min(1).required() // At least one field must be provided
};

/**
 * Get tier validation schema
 */
const getTierSchema = {
  params: Joi.object({
    brandId: uuidPattern.required(),
    id: uuidPattern.required()
  }).required()
};

/**
 * List tiers validation schema
 */
const listTiersSchema = {
  params: Joi.object({
    brandId: uuidPattern.required()
  }).required(),
  query: Joi.object({
    status: tierStatusPattern.optional(),
    includeInactive: Joi.boolean().optional().default(false),
    sort_by: Joi.string().valid('name', 'sort_order', 'min_points_required', 'created_at').optional().default('sort_order'),
    sort_order: Joi.string().valid('asc', 'desc').optional().default('asc')
  }).optional()
};

/**
 * Delete tier validation schema
 */
const deleteTierSchema = {
  params: Joi.object({
    brandId: uuidPattern.required(),
    id: uuidPattern.required()
  }).required()
};

/**
 * Get tier statistics validation schema
 */
const getTierStatisticsSchema = {
  params: Joi.object({
    brandId: uuidPattern.required(),
    id: uuidPattern.required()
  }).required()
};

/**
 * Get tier members validation schema
 */
const getTierMembersSchema = {
  params: Joi.object({
    brandId: uuidPattern.required(),
    id: uuidPattern.required()
  }).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    search: Joi.string().optional().allow('').max(100),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
    sort_by: Joi.string().valid('first_name', 'last_name', 'email', 'points_balance', 'created_at', 'last_activity_at').optional().default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').optional().default('desc')
  }).optional()
};

/**
 * Create default tiers validation schema
 */
const createDefaultTiersSchema = {
  params: Joi.object({
    brandId: uuidPattern.required()
  }).required()
};

/**
 * Reorder tiers validation schema
 */
const reorderTiersSchema = {
  params: Joi.object({
    brandId: uuidPattern.required()
  }).required(),
  body: Joi.object({
    tierOrders: Joi.array().items(
      Joi.object({
        id: uuidPattern.required(),
        sort_order: Joi.number().integer().min(0).required()
      })
    ).min(1).required()
  }).required()
};

/**
 * Get tier benefits validation schema
 */
const getTierBenefitsSchema = {
  params: Joi.object({
    brandId: uuidPattern.required(),
    id: uuidPattern.required()
  }).required()
};

/**
 * Update tier benefits validation schema
 */
const updateTierBenefitsSchema = {
  params: Joi.object({
    brandId: uuidPattern.required(),
    id: uuidPattern.required()
  }).required(),
  body: Joi.object({
    benefits: Joi.array().items(benefitSchema).required()
  }).required()
};

/**
 * Get tier progression validation schema
 */
const getTierProgressionSchema = {
  params: Joi.object({
    brandId: uuidPattern.required()
  }).required()
};

/**
 * Duplicate tier validation schema
 */
const duplicateTierSchema = {
  params: Joi.object({
    brandId: uuidPattern.required(),
    id: uuidPattern.required()
  }).required(),
  body: Joi.object({
    name: Joi.string().min(1).max(100).trim().optional(),
    slug: slugPattern.optional()
  }).optional()
};

/**
 * Member tier progress validation schema
 */
const getMemberTierProgressSchema = {
  params: Joi.object({
    brandId: uuidPattern.required(),
    memberId: uuidPattern.required()
  }).required()
};

/**
 * Manual tier upgrade validation schema
 */
const manualTierUpgradeSchema = {
  params: Joi.object({
    brandId: uuidPattern.required(),
    memberId: uuidPattern.required()
  }).required(),
  body: Joi.object({
    new_tier_id: uuidPattern.required(),
    reason: Joi.string().valid(
      'admin_adjustment', 'manual_upgrade', 'manual_downgrade', 
      'promotion', 'demotion', 'system_correction'
    ).optional().default('admin_adjustment'),
    notes: Joi.string().max(500).optional().allow('')
  }).required()
};

/**
 * Get member tier history validation schema
 */
const getMemberTierHistorySchema = {
  params: Joi.object({
    brandId: uuidPattern.required(),
    memberId: uuidPattern.required()
  }).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    from_date: Joi.date().iso().optional(),
    to_date: Joi.date().iso().min(Joi.ref('from_date')).optional(),
    reason: Joi.string().valid(
      'points_earned', 'points_deducted', 'admin_adjustment', 
      'manual_upgrade', 'manual_downgrade', 'system_correction', 
      'migration', 'promotion', 'demotion'
    ).optional()
  }).optional()
};

/**
 * Bulk tier assignment validation schema
 */
const bulkTierAssignmentSchema = {
  params: Joi.object({
    brandId: uuidPattern.required()
  }).required(),
  body: Joi.object({
    assignments: Joi.array().items(
      Joi.object({
        member_id: uuidPattern.required(),
        tier_id: uuidPattern.required(),
        reason: Joi.string().max(100).optional().default('bulk_assignment'),
        notes: Joi.string().max(500).optional().allow('')
      })
    ).min(1).max(100).required() // Limit bulk operations
  }).required()
};

/**
 * Tier analytics validation schema
 */
const getTierAnalyticsSchema = {
  params: Joi.object({
    brandId: uuidPattern.required()
  }).required(),
  query: Joi.object({
    period: Joi.string().valid('7d', '30d', '90d', '1y').optional().default('30d'),
    include_inactive: Joi.boolean().optional().default(false)
  }).optional()
};

module.exports = {
  createTierSchema,
  updateTierSchema,
  getTierSchema,
  listTiersSchema,
  deleteTierSchema,
  getTierStatisticsSchema,
  getTierMembersSchema,
  createDefaultTiersSchema,
  reorderTiersSchema,
  getTierBenefitsSchema,
  updateTierBenefitsSchema,
  getTierProgressionSchema,
  duplicateTierSchema,
  getMemberTierProgressSchema,
  manualTierUpgradeSchema,
  getMemberTierHistorySchema,
  bulkTierAssignmentSchema,
  getTierAnalyticsSchema
};