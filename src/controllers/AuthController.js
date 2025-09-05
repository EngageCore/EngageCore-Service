/**
 * Auth Controller
 * Handles authentication-related HTTP requests
 */

const { AuthService } = require('../services');
const { response, logger } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');

class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = asyncHandler(async (req, res) => {
    const userData = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await this.authService.register(userData, context);

    logger.info('User registration successful', {
      userId: result.user.id,
      email: result.user.email
    });

    return response.success(res, {
      message: 'User registered successfully',
      data: result
    }, 201);
  });

  /**
   * User login
   * POST /api/auth/login
   */
  login = asyncHandler(async (req, res) => {
    const { email, password, remember_me } = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await this.authService.login(email, password, context);

    // Set secure cookie if remember_me is true
    if (remember_me) {
      res.cookie('refresh_token', result.tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }

    logger.info('User login successful', {
      userId: result.user.id,
      email: result.user.email
    });

    return response.success(res, {
      message: 'Login successful',
      data: result
    });
  });

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refreshToken = asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;
    const refreshToken = refresh_token || req.cookies.refresh_token;
    
    if (!refreshToken) {
      return response.error(res, 'Refresh token is required', 400);
    }

    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await this.authService.refreshToken(refreshToken, context);

    logger.info('Token refresh successful', {
      ip: req.ip
    });

    return response.success(res, {
      message: 'Token refreshed successfully',
      data: result
    });
  });

  /**
   * User logout
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const token = req.token;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.authService.logout(userId, token, context);

    // Clear refresh token cookie
    res.clearCookie('refresh_token');

    logger.info('User logout successful', {
      userId
    });

    return response.success(res, {
      message: 'Logout successful'
    });
  });

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.authService.forgotPassword(email, context);

    logger.info('Password reset requested', {
      email
    });

    return response.success(res, {
      message: 'If the email exists, a password reset link has been sent'
    });
  });

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { token, new_password } = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.authService.resetPassword(token, new_password, context);

    logger.info('Password reset successful', {
      ip: req.ip
    });

    return response.success(res, {
      message: 'Password reset successful'
    });
  });

  /**
   * Change user password
   * POST /api/auth/change-password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.authService.changePassword(userId, current_password, new_password, context);

    logger.info('Password change successful', {
      userId
    });

    return response.success(res, {
      message: 'Password changed successfully'
    });
  });

  /**
   * Verify email address
   * POST /api/auth/verify-email
   */
  verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.authService.verifyEmail(token, context);

    logger.info('Email verification successful', {
      ip: req.ip
    });

    return response.success(res, {
      message: 'Email verified successfully'
    });
  });

  /**
   * Resend email verification
   * POST /api/auth/resend-verification
   */
  resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.authService.resendVerification(email, context);

    logger.info('Email verification resent', {
      email
    });

    return response.success(res, {
      message: 'Verification email sent'
    });
  });

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const user = await this.authService.getProfile(userId);

    return response.success(res, {
      message: 'Profile retrieved successfully',
      data: { user }
    });
  });

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const updateData = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const user = await this.authService.updateProfile(userId, updateData, context);

    logger.info('Profile update successful', {
      userId
    });

    return response.success(res, {
      message: 'Profile updated successfully',
      data: { user }
    });
  });

  /**
   * Setup 2FA
   * POST /api/auth/setup-2fa
   */
  setup2FA = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const userId = req.user.id;

    // This would integrate with a 2FA service
    // For now, we'll just return a success response
    logger.info('2FA setup requested', {
      userId
    });

    return response.success(res, {
      message: '2FA setup successful',
      data: {
        secret: 'MOCK_SECRET_KEY', // In production, this would be a real secret
        qr_code: 'data:image/png;base64,mock_qr_code' // Mock QR code
      }
    });
  });

  /**
   * Verify 2FA
   * POST /api/auth/verify-2fa
   */
  verify2FA = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const userId = req.user.id;

    // This would verify the 2FA code
    // For now, we'll just return a success response
    logger.info('2FA verification requested', {
      userId
    });

    return response.success(res, {
      message: '2FA verified successfully'
    });
  });

  /**
   * Get authentication status
   * GET /api/auth/status
   */
  getAuthStatus = asyncHandler(async (req, res) => {
    const user = req.user;

    return response.success(res, {
      message: 'Authentication status retrieved',
      data: {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          email_verified: !!user.email_verified_at
        }
      }
    });
  });

  /**
   * Validate token
   * POST /api/auth/validate-token
   */
  validateToken = asyncHandler(async (req, res) => {
    // If we reach here, the token is valid (middleware already validated it)
    const user = req.user;

    return response.success(res, {
      message: 'Token is valid',
      data: {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          brand_id: user.brand_id
        }
      }
    });
  });
}

module.exports = new AuthController();