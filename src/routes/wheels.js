/**
 * Wheel Routes
 * Handles wheel and spin-related API endpoints
 */

const express = require('express');
const { WheelController } = require('../controllers');
const { auth, validation, rateLimit, brandContext } = require('../middleware');
const { wheelValidators } = require('../validators');

const router = express.Router({ mergeParams: true }); // mergeParams to access brandId from parent router

/**
 * @route   POST /api/brands/:brandId/wheels
 * @desc    Create a new wheel
 * @access  Private (Brand Admin)
 */
router.post('/',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.createWheelSchema),
  WheelController.createWheel
);

/**
 * @route   GET /api/brands/:brandId/wheels
 * @desc    List wheels with pagination and filtering
 * @access  Private (Brand Admin)
 */
router.get('/',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.listWheelsSchema, 'query'),
  WheelController.listWheels
);

/**
 * @route   POST /api/brands/:brandId/wheels/validate-probabilities
 * @desc    Validate wheel probabilities
 * @access  Private (Brand Admin)
 */
router.post('/validate-probabilities',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.validateWheelProbabilitiesSchema),
  WheelController.validateWheelProbabilities
);

/**
 * @route   GET /api/brands/:brandId/wheels/:id
 * @desc    Get wheel by ID
 * @access  Private (Brand Admin)
 */
router.get('/:id',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.getWheelSchema),
  WheelController.getWheelById
);

/**
 * @route   PUT /api/brands/:brandId/wheels/:id
 * @desc    Update wheel
 * @access  Private (Brand Admin)
 */
router.put('/:id',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.updateWheelSchema),
  WheelController.updateWheel
);

/**
 * @route   PUT /api/brands/:brandId/wheels/:id/items
 * @desc    Update wheel items
 * @access  Private (Brand Admin)
 */
router.put('/:id/items',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.updateWheelItemsSchema),
  WheelController.updateWheelItems
);

/**
 * @route   DELETE /api/brands/:brandId/wheels/:id
 * @desc    Delete wheel
 * @access  Private (Brand Admin)
 */
router.delete('/:id',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.deleteWheelSchema),
  WheelController.deleteWheel
);

/**
 * @route   POST /api/brands/:brandId/wheels/:id/spin
 * @desc    Spin wheel for member
 * @access  Public (with brand context and rate limiting)
 */
router.post('/:id/spin',
  brandContext.optionalBrandContext,
  rateLimit.wheelSpinRateLimit,
  validation.validate(wheelValidators.spinWheelSchema),
  WheelController.spinWheel
);

/**
 * @route   GET /api/brands/:brandId/wheels/:id/eligibility/:memberId
 * @desc    Check spin eligibility for member
 * @access  Public (with brand context)
 */
router.get('/:id/eligibility/:memberId',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.checkSpinEligibilitySchema),
  WheelController.checkSpinEligibility
);

/**
 * @route   GET /api/brands/:brandId/wheels/:id/spins
 * @desc    Get spin history for wheel
 * @access  Private (Brand Admin)
 */
router.get('/:id/spins',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.getSpinHistorySchema, 'query'),
  WheelController.getSpinHistory
);

/**
 * @route   GET /api/brands/:brandId/wheels/:id/statistics
 * @desc    Get wheel statistics
 * @access  Private (Brand Admin)
 */
router.get('/:id/statistics',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.getWheelStatisticsSchema, 'query'),
  WheelController.getWheelStatistics
);

/**
 * @route   GET /api/brands/:brandId/wheels/:id/items/performance
 * @desc    Get item performance statistics
 * @access  Private (Brand Admin)
 */
router.get('/:id/items/performance',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.getItemPerformanceSchema, 'query'),
  WheelController.getItemPerformance
);

/**
 * @route   GET /api/brands/:brandId/wheels/:id/members/:memberId/daily-count
 * @desc    Get member daily spin count
 * @access  Public (with brand context)
 */
router.get('/:id/members/:memberId/daily-count',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.getMemberDailySpinCountSchema),
  WheelController.getMemberDailySpinCount
);

/**
 * @route   GET /api/brands/:brandId/wheels/:id/dashboard
 * @desc    Get wheel dashboard data
 * @access  Private (Brand Admin)
 */
router.get('/:id/dashboard',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  WheelController.getWheelDashboard
);

/**
 * @route   POST /api/brands/:brandId/wheels/:id/clone
 * @desc    Clone wheel
 * @access  Private (Brand Admin)
 */
router.post('/:id/clone',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  WheelController.cloneWheel
);

/**
 * @route   POST /api/brands/:brandId/wheels/:id/activate
 * @desc    Activate wheel
 * @access  Private (Brand Admin)
 */
router.post('/:id/activate',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  WheelController.activateWheel
);

/**
 * @route   POST /api/brands/:brandId/wheels/:id/deactivate
 * @desc    Deactivate wheel
 * @access  Private (Brand Admin)
 */
router.post('/:id/deactivate',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  WheelController.deactivateWheel
);

/**
 * @route   GET /api/brands/:brandId/wheels/:id/leaderboard
 * @desc    Get wheel leaderboard
 * @access  Private (Brand Admin)
 */
router.get('/:id/leaderboard',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  WheelController.getWheelLeaderboard
);

/**
 * @route   GET /api/brands/:brandId/wheels/:id/export
 * @desc    Export wheel data
 * @access  Private (Brand Admin)
 */
router.get('/:id/export',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  WheelController.exportWheelData
);

/**
 * @route   GET /api/brands/:brandId/members/:memberId/spins
 * @desc    Get member spin history
 * @access  Private (Brand Admin) or Public (for own spins)
 */
router.get('/members/:memberId/spins',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.getMemberSpinHistorySchema, 'query'),
  WheelController.getMemberSpinHistory
);

module.exports = router;