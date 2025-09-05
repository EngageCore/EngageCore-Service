/**
 * Admin Portal Routes
 * Handles back office administrative API endpoints
 */

const express = require('express');
const { 
  AdminController, 
  UserController, 
  BrandController, 
  MemberController, 
  MissionController, 
  WheelController, 
  TransactionController,
  TierController 
} = require('../controllers');
const { auth, validation, rateLimit, brandContext } = require('../middleware');
const { 
  adminValidators, 
  userValidators, 
  brandValidators, 
  memberValidators, 
  missionValidators, 
  wheelValidators, 
  transactionValidators,
  tierValidators 
} = require('../validators');

const router = express.Router();

// =============================================================================
// SYSTEM ADMINISTRATION ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get system dashboard overview
 * @access  Private (Super Admin)
 */
router.get('/dashboard',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  AdminController.getSystemDashboard
);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get system analytics
 * @access  Private (Super Admin)
 */
router.get('/analytics',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getSystemAnalyticsSchema, 'query'),
  AdminController.getSystemAnalytics
);

/**
 * @route   GET /api/admin/health
 * @desc    Get system health status
 * @access  Private (Super Admin)
 */
router.get('/health',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  AdminController.getSystemHealth
);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get system audit logs
 * @access  Private (Super Admin)
 */
router.get('/audit-logs',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getAuditLogsSchema, 'query'),
  AdminController.getAuditLogs
);

// =============================================================================
// USER MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/users
 * @desc    List all users
 * @access  Private (Super Admin)
 */
router.get('/users',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.listUsersSchema, 'query'),
  UserController.listUsers
);

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user
 * @access  Private (Super Admin)
 */
router.post('/users',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.createUserSchema),
  UserController.createUser
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Super Admin)
 */
router.get('/users/:id',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.getUserSchema),
  UserController.getUserById
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Private (Super Admin)
 */
router.put('/users/:id',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.updateUserSchema),
  UserController.updateUser
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Super Admin)
 */
router.delete('/users/:id',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.deleteUserSchema),
  UserController.deleteUser
);

// =============================================================================
// BRAND MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/brands
 * @desc    List all brands
 * @access  Private (Super Admin, Brand Admin)
 */
router.get('/brands',
  auth.authenticate,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.listBrandsSchema, 'query'),
  BrandController.listBrands
);

/**
 * @route   POST /api/admin/brands
 * @desc    Create a new brand
 * @access  Private (Super Admin)
 */
router.post('/brands',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.createBrandSchema),
  BrandController.createBrand
);

/**
 * @route   GET /api/admin/brands/:id
 * @desc    Get brand by ID
 * @access  Private (Super Admin, Brand Admin)
 */
router.get('/brands/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.getBrandSchema),
  BrandController.getBrandById
);

/**
 * @route   PUT /api/admin/brands/:id
 * @desc    Update brand
 * @access  Private (Super Admin, Brand Admin)
 */
router.put('/brands/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.updateBrandSchema),
  BrandController.updateBrand
);

// =============================================================================
// MEMBER MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/brands/:brandId/members
 * @desc    List brand members
 * @access  Private (Super Admin, Brand Admin)
 */
router.get('/brands/:brandId/members',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.listMembersSchema, 'query'),
  MemberController.listMembers
);

/**
 * @route   POST /api/admin/brands/:brandId/members
 * @desc    Create a new member
 * @access  Private (Super Admin, Brand Admin)
 */
router.post('/brands/:brandId/members',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.createMemberSchema),
  MemberController.createMember
);

/**
 * @route   GET /api/admin/brands/:brandId/members/:id
 * @desc    Get member by ID
 * @access  Private (Super Admin, Brand Admin)
 */
router.get('/brands/:brandId/members/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.getMemberSchema),
  MemberController.getMemberById
);

/**
 * @route   PUT /api/admin/brands/:brandId/members/:id
 * @desc    Update member
 * @access  Private (Super Admin, Brand Admin)
 */
router.put('/brands/:brandId/members/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.updateMemberSchema),
  MemberController.updateMember
);

// =============================================================================
// MISSION MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/brands/:brandId/missions
 * @desc    List brand missions
 * @access  Private (Super Admin, Brand Admin)
 */
router.get('/brands/:brandId/missions',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.listMissionsSchema, 'query'),
  MissionController.listMissions
);

/**
 * @route   POST /api/admin/brands/:brandId/missions
 * @desc    Create a new mission
 * @access  Private (Super Admin, Brand Admin)
 */
router.post('/brands/:brandId/missions',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.createMissionSchema),
  MissionController.createMission
);

// =============================================================================
// WHEEL MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/brands/:brandId/wheels
 * @desc    List brand wheels
 * @access  Private (Super Admin, Brand Admin)
 */
router.get('/brands/:brandId/wheels',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.listWheelsSchema, 'query'),
  WheelController.listWheels
);

/**
 * @route   POST /api/admin/brands/:brandId/wheels
 * @desc    Create a new wheel
 * @access  Private (Super Admin, Brand Admin)
 */
router.post('/brands/:brandId/wheels',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.createWheelSchema),
  WheelController.createWheel
);

// =============================================================================
// TRANSACTION MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/brands/:brandId/transactions
 * @desc    List brand transactions
 * @access  Private (Super Admin, Brand Admin)
 */
router.get('/brands/:brandId/transactions',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.listTransactionsSchema, 'query'),
  TransactionController.listTransactions
);

// =============================================================================
// TIER MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/brands/:brandId/tiers
 * @desc    List brand tiers
 * @access  Private (Super Admin, Brand Admin)
 */
router.get('/brands/:brandId/tiers',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.listTiersSchema, 'query'),
  TierController.listTiers
);

/**
 * @route   POST /api/admin/brands/:brandId/tiers
 * @desc    Create a new tier
 * @access  Private (Super Admin, Brand Admin)
 */
router.post('/brands/:brandId/tiers',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(tierValidators.createTierSchema),
  TierController.createTier
);

module.exports = router;