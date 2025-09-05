/**
 * User Routes
 * Handles user management API endpoints
 */

const express = require('express');
const { UserController } = require('../controllers');
const { auth, validation, rateLimit } = require('../middleware');
const { userValidators } = require('../validators');

const router = express.Router();

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (Super Admin)
 */
router.post('/',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.createUserSchema),
  UserController.createUser
);

/**
 * @route   GET /api/users
 * @desc    List users with pagination and filtering
 * @access  Private (Super Admin)
 */
router.get('/',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.listUsersSchema, 'query'),
  UserController.listUsers
);

/**
 * @route   GET /api/users/statistics
 * @desc    Get user statistics
 * @access  Private (Super Admin)
 */
router.get('/statistics',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.getUserStatisticsSchema, 'query'),
  UserController.getUserStatistics
);

/**
 * @route   GET /api/users/current
 * @desc    Get current user profile
 * @access  Private (Authenticated User)
 */
router.get('/current',
  auth.authenticate,
  rateLimit.generalRateLimit,
  UserController.getCurrentUser
);

/**
 * @route   PUT /api/users/current
 * @desc    Update current user profile
 * @access  Private (Authenticated User)
 */
router.put('/current',
  auth.authenticate,
  rateLimit.generalRateLimit,
  validation.validate(userValidators.updateCurrentUserSchema),
  UserController.updateCurrentUser
);

/**
 * @route   GET /api/users/current/dashboard
 * @desc    Get current user dashboard
 * @access  Private (Authenticated User)
 */
router.get('/current/dashboard',
  auth.authenticate,
  rateLimit.generalRateLimit,
  UserController.getUserDashboard
);

/**
 * @route   GET /api/users/current/sessions
 * @desc    Get current user sessions
 * @access  Private (Authenticated User)
 */
router.get('/current/sessions',
  auth.authenticate,
  rateLimit.generalRateLimit,
  UserController.getUserSessions
);

/**
 * @route   POST /api/users/bulk-update
 * @desc    Bulk update users
 * @access  Private (Super Admin)
 */
router.post('/bulk-update',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.bulkUpdateUsersSchema),
  UserController.bulkUpdateUsers
);

/**
 * @route   GET /api/users/export
 * @desc    Export users
 * @access  Private (Super Admin)
 */
router.get('/export',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.exportUsersSchema, 'query'),
  UserController.exportUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Super Admin)
 */
router.get('/:id',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.getUserSchema),
  UserController.getUserById
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Super Admin)
 */
router.put('/:id',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.updateUserSchema),
  UserController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Super Admin)
 */
router.delete('/:id',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.deleteUserSchema),
  UserController.deleteUser
);

/**
 * @route   POST /api/users/:id/change-password
 * @desc    Change user password
 * @access  Private (Super Admin)
 */
router.post('/:id/change-password',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.changeUserPasswordSchema),
  UserController.changeUserPassword
);

/**
 * @route   GET /api/users/:id/activity-log
 * @desc    Get user activity log
 * @access  Private (Super Admin)
 */
router.get('/:id/activity-log',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.getUserActivityLogSchema, 'query'),
  UserController.getUserActivityLog
);

/**
 * @route   POST /api/users/:id/update-status
 * @desc    Update user status
 * @access  Private (Super Admin)
 */
router.post('/:id/update-status',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.updateUserStatusSchema),
  UserController.updateUserStatus
);

/**
 * @route   POST /api/users/:id/activate
 * @desc    Activate user
 * @access  Private (Super Admin)
 */
router.post('/:id/activate',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.activateUserSchema),
  UserController.activateUser
);

/**
 * @route   POST /api/users/:id/deactivate
 * @desc    Deactivate user
 * @access  Private (Super Admin)
 */
router.post('/:id/deactivate',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.deactivateUserSchema),
  UserController.deactivateUser
);

/**
 * @route   GET /api/users/:id/permissions
 * @desc    Get user permissions
 * @access  Private (Super Admin)
 */
router.get('/:id/permissions',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.getUserPermissionsSchema),
  UserController.getUserPermissions
);

/**
 * @route   GET /api/users/:id/roles
 * @desc    Get user roles
 * @access  Private (Super Admin)
 */
router.get('/:id/roles',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(userValidators.getUserRolesSchema),
  UserController.getUserRoles
);

module.exports = router;
