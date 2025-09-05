/**
 * Tier Routes
 * Handles membership tier-related API endpoints
 */

const express = require('express');
const { TierController } = require('../controllers');
const { auth, validation, rateLimit, brandContext } = require('../middleware');
const { tierValidators } = require('../validators');

const router = express.Router({ mergeParams: true }); // mergeParams to access brandId from parent router

/**
 * @route   POST /api/brands/:brandId/tiers
 * @desc    Create a new membership tier
 * @access  Private (Brand Admin)
 */
router.post('/',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.createTierSchema),
  TierController.createTier
);

/**
 * @route   GET /api/brands/:brandId/tiers
 * @desc    List membership tiers for a brand
 * @access  Private (Brand Admin)
 */
router.get('/',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.listTiersSchema),
  TierController.listTiers
);

/**
 * @route   POST /api/brands/:brandId/tiers/default
 * @desc    Create default tiers for a brand (Bronze, Silver, Gold, Platinum)
 * @access  Private (Brand Admin)
 */
router.post('/default',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.createDefaultTiersSchema),
  TierController.createDefaultTiers
);

/**
 * @route   PUT /api/brands/:brandId/tiers/reorder
 * @desc    Reorder tiers (update sort_order)
 * @access  Private (Brand Admin)
 */
router.put('/reorder',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.reorderTiersSchema),
  TierController.reorderTiers
);

/**
 * @route   GET /api/brands/:brandId/tiers/progression
 * @desc    Get tier progression information
 * @access  Private (Brand Admin)
 */
router.get('/progression',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.getTierProgressionSchema),
  TierController.getTierProgression
);

/**
 * @route   GET /api/brands/:brandId/tiers/analytics
 * @desc    Get tier analytics and insights
 * @access  Private (Brand Admin)
 */
router.get('/analytics',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.getTierAnalyticsSchema),
  TierController.getTierAnalytics
);

/**
 * @route   GET /api/brands/:brandId/tiers/:id
 * @desc    Get tier by ID
 * @access  Private (Brand Admin)
 */
router.get('/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.getTierSchema),
  TierController.getTierById
);

/**
 * @route   PUT /api/brands/:brandId/tiers/:id
 * @desc    Update tier
 * @access  Private (Brand Admin)
 */
router.put('/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.updateTierSchema),
  TierController.updateTier
);

/**
 * @route   DELETE /api/brands/:brandId/tiers/:id
 * @desc    Delete tier (soft delete - archive)
 * @access  Private (Brand Admin)
 */
router.delete('/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.deleteTierSchema),
  TierController.deleteTier
);

/**
 * @route   GET /api/brands/:brandId/tiers/:id/statistics
 * @desc    Get tier statistics (member count, upgrades, etc.)
 * @access  Private (Brand Admin)
 */
router.get('/:id/statistics',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.getTierStatisticsSchema),
  TierController.getTierStatistics
);

/**
 * @route   GET /api/brands/:brandId/tiers/:id/members
 * @desc    Get members in a specific tier
 * @access  Private (Brand Admin)
 */
router.get('/:id/members',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.getTierMembersSchema),
  TierController.getTierMembers
);

/**
 * @route   GET /api/brands/:brandId/tiers/:id/benefits
 * @desc    Get tier benefits
 * @access  Private (Brand Admin)
 */
router.get('/:id/benefits',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.getTierBenefitsSchema),
  TierController.getTierBenefits
);

/**
 * @route   PUT /api/brands/:brandId/tiers/:id/benefits
 * @desc    Update tier benefits
 * @access  Private (Brand Admin)
 */
router.put('/:id/benefits',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.updateTierBenefitsSchema),
  TierController.updateTierBenefits
);

/**
 * @route   POST /api/brands/:brandId/tiers/:id/duplicate
 * @desc    Duplicate an existing tier
 * @access  Private (Brand Admin)
 */
router.post('/:id/duplicate',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.duplicateTierSchema),
  TierController.duplicateTier
);

/**
 * @route   POST /api/brands/:brandId/tiers/bulk-assign
 * @desc    Bulk assign tiers to members
 * @access  Private (Brand Admin)
 */
router.post('/bulk-assign',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.bulkTierAssignmentSchema),
  TierController.bulkTierAssignment
);

// Public endpoints (with brand context validation)

/**
 * @route   GET /api/brands/:brandId/tiers/public/list
 * @desc    Get public tier information (for member-facing apps)
 * @access  Public (with brand context)
 */
router.get('/public/list',
  brandContext.validateBrandOwnership,
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.listTiersSchema),
  TierController.getPublicTiers
);

/**
 * @route   GET /api/brands/:brandId/tiers/public/progression
 * @desc    Get public tier progression (for member-facing apps)
 * @access  Public (with brand context)
 */
router.get('/public/progression',
  brandContext.validateBrandOwnership,
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.getTierProgressionSchema),
  TierController.getTierProgression
);

module.exports = router;
