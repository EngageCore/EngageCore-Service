/**
 * Auth Routes
 * Handles authentication-related API endpoints
 */

const express = require('express');
const { AuthController } = require('../controllers');
const { auth, validation, rateLimit } = require('../middleware');
const { authValidators } = require('../validators');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register',
  rateLimit.authRateLimit,
  validation.validate(authValidators.registerSchema),
  AuthController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login',
  rateLimit.authRateLimit,
  validation.validate(authValidators.loginSchema),
  AuthController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh',
  rateLimit.generalRateLimit,
  validation.validate(authValidators.refreshTokenSchema),
  AuthController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    User logout
 * @access  Private
 */
router.post('/logout',
  auth.authenticate,
  validation.validate(authValidators.logoutSchema),
  AuthController.logout
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password',
  rateLimit.passwordResetRateLimit,
  validation.validate(authValidators.forgotPasswordSchema),
  AuthController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password',
  rateLimit.passwordResetRateLimit,
  validation.validate(authValidators.resetPasswordSchema),
  AuthController.resetPassword
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password',
  auth.authenticate,
  rateLimit.generalRateLimit,
  validation.validate(authValidators.changePasswordSchema),
  AuthController.changePassword
);


/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
  auth.authenticate,
  AuthController.getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  auth.authenticate,
  rateLimit.generalRateLimit,
  validation.validate(authValidators.updateProfileSchema),
  AuthController.updateProfile
);



/**
 * @route   GET /api/auth/status
 * @desc    Get authentication status
 * @access  Private
 */
router.get('/status',
  auth.authenticate,
  AuthController.getAuthStatus
);

/**
 * @route   POST /api/auth/validate-token
 * @desc    Validate token
 * @access  Private
 */
router.post('/validate-token',
  auth.authenticate,
  AuthController.validateToken
);

module.exports = router;