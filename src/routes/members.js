/**
 * Member Routes
 * Handles member-related API endpoints
 */

const express = require('express');
const { MemberController } = require('../controllers');
const { auth, validation, rateLimit, brandContext } = require('../middleware');
const { memberValidators } = require('../validators');

const router = express.Router({ mergeParams: true }); // mergeParams to access brandId from parent router

/**
 * @route   POST /api/brands/:brandId/members
 * @desc    Create a new member
 * @access  Private (Brand Admin)
 */
router.post('/',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.createMemberSchema),
  MemberController.createMember
);

/**
 * @route   GET /api/brands/:brandId/members
 * @desc    List members with pagination and filtering
 * @access  Private (Brand Admin)
 */
router.get('/',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.listMembersSchema, 'query'),
  MemberController.listMembers
);

/**
 * @route   GET /api/brands/:brandId/members/statistics
 * @desc    Get member statistics
 * @access  Private (Brand Admin)
 */
router.get('/statistics',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.getMemberStatisticsSchema, 'query'),
  MemberController.getMemberStatistics
);

/**
 * @route   GET /api/brands/:brandId/members/check-email/:email
 * @desc    Check email availability
 * @access  Private (Brand Admin)
 */
router.get('/check-email/:email',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.checkEmailAvailabilitySchema),
  MemberController.checkEmailAvailability
);

/**
 * @route   POST /api/brands/:brandId/members/import
 * @desc    Import members from CSV/Excel
 * @access  Private (Brand Admin)
 */
router.post('/import',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.uploadRateLimit,
  validation.validate(memberValidators.importMembersSchema),
  MemberController.importMembers
);

/**
 * @route   GET /api/brands/:brandId/members/export
 * @desc    Export members data
 * @access  Private (Brand Admin)
 */
router.get('/export',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.exportMembersSchema, 'query'),
  MemberController.exportMembers
);

/**
 * @route   GET /api/brands/:brandId/members/leaderboard
 * @desc    Get member leaderboard
 * @access  Private (Brand Admin)
 */
router.get('/leaderboard',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.getMemberLeaderboardSchema, 'query'),
  MemberController.getMemberLeaderboard
);

/**
 * @route   PUT /api/brands/:brandId/members/bulk
 * @desc    Bulk update members
 * @access  Private (Brand Admin)
 */
router.put('/bulk',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  MemberController.bulkUpdateMembers
);

/**
 * @route   GET /api/brands/:brandId/members/:id
 * @desc    Get member by ID
 * @access  Private (Brand Admin)
 */
router.get('/:id',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.getMemberSchema),
  MemberController.getMemberById
);

/**
 * @route   PUT /api/brands/:brandId/members/:id
 * @desc    Update member
 * @access  Private (Brand Admin)
 */
router.put('/:id',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.updateMemberSchema),
  MemberController.updateMember
);

/**
 * @route   DELETE /api/brands/:brandId/members/:id
 * @desc    Delete member
 * @access  Private (Brand Admin)
 */
router.delete('/:id',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.deleteMemberSchema),
  MemberController.deleteMember
);

/**
 * @route   POST /api/brands/:brandId/members/:id/points
 * @desc    Update member points
 * @access  Private (Brand Admin)
 */
router.post('/:id/points',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.updateMemberPointsSchema),
  MemberController.updateMemberPoints
);

/**
 * @route   GET /api/brands/:brandId/members/:id/transactions
 * @desc    Get member transactions
 * @access  Private (Brand Admin)
 */
router.get('/:id/transactions',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.getMemberTransactionsSchema, 'query'),
  MemberController.getMemberTransactions
);

/**
 * @route   GET /api/brands/:brandId/members/:id/tier-progress
 * @desc    Get member tier progress
 * @access  Private (Brand Admin)
 */
router.get('/:id/tier-progress',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.getMemberTierProgressSchema),
  MemberController.getMemberTierProgress
);

/**
 * @route   POST /api/brands/:brandId/members/:id/tier-upgrade
 * @desc    Manual tier upgrade for member
 * @access  Private (Brand Admin)
 */
router.post('/:id/tier-upgrade',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.manualTierUpgradeSchema),
  MemberController.manualTierUpgrade
);

/**
 * @route   GET /api/brands/:brandId/members/:id/tier-history
 * @desc    Get member tier history
 * @access  Private (Brand Admin)
 */
router.get('/:id/tier-history',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.getMemberTierHistorySchema),
  MemberController.getMemberTierHistory
);

/**
 * @route   GET /api/brands/:brandId/members/:id/profile
 * @desc    Get member profile (public endpoint for members)
 * @access  Public (with brand context)
 */
router.get('/:id/profile',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  MemberController.getMemberProfile
);

/**
 * @route   GET /api/brands/:brandId/members/:id/dashboard
 * @desc    Get member dashboard data
 * @access  Private (Brand Admin)
 */
router.get('/:id/dashboard',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  MemberController.getMemberDashboard
);

/**
 * @route   POST /api/brands/:brandId/members/:id/activate
 * @desc    Activate member
 * @access  Private (Brand Admin)
 */
router.post('/:id/activate',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  MemberController.activateMember
);

/**
 * @route   POST /api/brands/:brandId/members/:id/deactivate
 * @desc    Deactivate member
 * @access  Private (Brand Admin)
 */
router.post('/:id/deactivate',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  MemberController.deactivateMember
);

/**
 * @route   GET /api/brands/:brandId/members/:id/activity
 * @desc    Get member activity log
 * @access  Private (Brand Admin)
 */
router.get('/:id/activity',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  MemberController.getMemberActivity
);

module.exports = router;