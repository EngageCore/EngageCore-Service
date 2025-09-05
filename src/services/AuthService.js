/**
 * Authentication Service
 * Handles authentication business logic
 */

const { UserRepository, AuditLogRepository } = require('../repositories');
const { encryption, jwt, logger, constants } = require('../utils');
const { errorHandler } = require('../middleware');
const { AuthenticationError, ValidationError, NotFoundError, ConflictError } = errorHandler;
const { SERVICE_ERROR_CODES } = require('../enums');
const { USER_ROLES, AUDIT_ACTIONS } = constants;

class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.auditLogRepository = new AuditLogRepository();
  }

  /**
   * Register a new user
   * @param {object} userData - User registration data
   * @param {object} context - Request context (IP, user agent, etc.)
   * @returns {object} - Created user and tokens
   */
  async register(userData, context = {}) {
    try {
      // Check if email is already taken
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictError('Email address is already registered', SERVICE_ERROR_CODES.AUTH_EMAIL_ALREADY_REGISTERED);
      }

      // Hash password
      const hashedPassword = await encryption.hashPassword(userData.password);

      // Create user data
      const userToCreate = {
        ...userData,
        password_hash: hashedPassword,
        status: 'pending_verification',
        email_verification_token: encryption.generateEmailVerificationToken(),
        email_verification_expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      // Remove plain password from data
      delete userToCreate.password;
      delete userToCreate.confirm_password;

      // Create user
      const user = await this.userRepository.create(userToCreate);

      // Generate tokens
      const accessToken = jwt.generateAccessToken(user.id, user.role);
      const refreshToken = jwt.generateRefreshToken(user.id);

      // Log registration
      await this.auditLogRepository.logUserAction({
        user_id: user.id,
        brand_id: user.brand_id,
        action: AUDIT_ACTIONS.USER_REGISTER,
        description: 'User registered successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          email: user.email,
          role: user.role
        }
      });

      logger.logBusiness('User registered', {
        userId: user.id,
        email: user.email,
        role: user.role,
        brandId: user.brand_id
      });

      // Remove sensitive data from response
      const { password_hash, email_verification_token, ...userResponse } = user;

      return {
        user: userResponse,
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 3600 // 1 hour
        }
      };
    } catch (error) {
      logger.error('User registration failed', {
        error: error.message,
        email: userData.email,
        context
      });
      throw error;
    }
  }

  /**
   * Authenticate user login
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {object} context - Request context
   * @returns {object} - User and tokens
   */
  async login(email, password, context = {}) {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        await this.auditLogRepository.logUserAction({
          action: AUDIT_ACTIONS.USER_LOGIN,
          description: 'Login attempt with non-existent email',
          ip_address: context.ip,
          user_agent: context.userAgent,
          status: 'error',
          metadata: { email }
        });
        throw new AuthenticationError('Invalid email or password', SERVICE_ERROR_CODES.AUTH_INVALID_CREDENTIALS);
      }

      // Check password
      const isPasswordValid = await encryption.comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        await this.auditLogRepository.logUserAction({
          user_id: user.id,
          brand_id: user.brand_id,
          action: AUDIT_ACTIONS.USER_LOGIN,
          description: 'Login attempt with invalid password',
          ip_address: context.ip,
          user_agent: context.userAgent,
          status: 'error',
          metadata: { email }
        });
        throw new AuthenticationError('Invalid email or password', SERVICE_ERROR_CODES.AUTH_INVALID_CREDENTIALS);
      }

      // Check if user is active
      if (user.status !== 'active' && user.status !== 'pending_verification') {
        await this.auditLogRepository.logUserAction({
          user_id: user.id,
          brand_id: user.brand_id,
          action: AUDIT_ACTIONS.USER_LOGIN,
          description: `Login attempt with ${user.status} account`,
          ip_address: context.ip,
          user_agent: context.userAgent,
          status: 'error',
          metadata: { email, status: user.status }
        });
        throw new AuthenticationError('Account is not active', SERVICE_ERROR_CODES.AUTH_ACCOUNT_NOT_ACTIVE);
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = jwt.generateAccessToken(user.id, user.role);
      const refreshToken = jwt.generateRefreshToken(user.id);

      // Log successful login
      await this.auditLogRepository.logUserAction({
        user_id: user.id,
        brand_id: user.brand_id,
        action: AUDIT_ACTIONS.USER_LOGIN,
        description: 'User logged in successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          email: user.email,
          role: user.role
        }
      });

      logger.logBusiness('User logged in', {
        userId: user.id,
        email: user.email,
        role: user.role,
        brandId: user.brand_id
      });

      // Remove sensitive data from response
      const { password_hash, email_verification_token, password_reset_token, ...userResponse } = user;

      return {
        user: userResponse,
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 3600 // 1 hour
        }
      };
    } catch (error) {
      logger.error('User login failed', {
        error: error.message,
        email,
        context
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @param {object} context - Request context
   * @returns {object} - New tokens
   */
  async refreshToken(refreshToken, context = {}) {
    try {
      // Verify refresh token
      const decoded = jwt.verifyRefreshToken(refreshToken);
      if (!decoded) {
        throw new AuthenticationError('Invalid refresh token', SERVICE_ERROR_CODES.AUTH_INVALID_REFRESH_TOKEN);
      }

      // Get user
      const user = await this.userRepository.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        throw new AuthenticationError('User not found or inactive', SERVICE_ERROR_CODES.AUTH_USER_NOT_FOUND_OR_INACTIVE);
      }

      // Generate new tokens
      const newAccessToken = jwt.generateAccessToken(user.id, user.role);
      const newRefreshToken = jwt.generateRefreshToken(user.id);

      logger.logBusiness('Token refreshed', {
        userId: user.id,
        email: user.email
      });

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer',
        expires_in: 3600
      };
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
        context
      });
      throw error;
    }
  }

  /**
   * Logout user
   * @param {string} userId - User ID
   * @param {string} token - Access token to blacklist
   * @param {object} context - Request context
   */
  async logout(userId, token, context = {}) {
    try {
      // Blacklist the token
      jwt.blacklistToken(token);

      // Log logout
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        action: AUDIT_ACTIONS.USER_LOGOUT,
        description: 'User logged out',
        ip_address: context.ip,
        user_agent: context.userAgent
      });

      logger.logBusiness('User logged out', { userId });
    } catch (error) {
      logger.error('Logout failed', {
        error: error.message,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @param {object} context - Request context
   */
  async forgotPassword(email, context = {}) {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not
        logger.logSecurity('Password reset requested for non-existent email', {
          email,
          ip: context.ip
        });
        return;
      }

      // Generate reset token
      const resetToken = encryption.generatePasswordResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token
      await this.userRepository.setResetToken(email, resetToken, resetExpires);

      // Log password reset request
      await this.auditLogRepository.logUserAction({
        user_id: user.id,
        brand_id: user.brand_id,
        action: AUDIT_ACTIONS.USER_CHANGE_PASSWORD,
        description: 'Password reset requested',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: { email }
      });

      logger.logBusiness('Password reset requested', {
        userId: user.id,
        email: user.email
      });

      // In a real application, you would send an email here
      // For now, we'll just log the token (remove in production)
      logger.info('Password reset token generated', {
        userId: user.id,
        token: resetToken // Remove this in production
      });
    } catch (error) {
      logger.error('Password reset request failed', {
        error: error.message,
        email,
        context
      });
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @param {object} context - Request context
   */
  async resetPassword(token, newPassword, context = {}) {
    try {
      // Find user by reset token
      const user = await this.userRepository.findByResetToken(token);
      if (!user) {
        throw new AuthenticationError('Invalid or expired reset token', SERVICE_ERROR_CODES.AUTH_INVALID_RESET_TOKEN);
      }

      // Hash new password
      const hashedPassword = await encryption.hashPassword(newPassword);

      // Update password and clear reset token
      await this.userRepository.updatePassword(user.id, hashedPassword);
      await this.userRepository.clearResetToken(user.id);

      // Log password reset
      await this.auditLogRepository.logUserAction({
        user_id: user.id,
        brand_id: user.brand_id,
        action: AUDIT_ACTIONS.USER_CHANGE_PASSWORD,
        description: 'Password reset completed',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: { email: user.email }
      });

      logger.logBusiness('Password reset completed', {
        userId: user.id,
        email: user.email
      });
    } catch (error) {
      logger.error('Password reset failed', {
        error: error.message,
        context
      });
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {object} context - Request context
   */
  async changePassword(userId, currentPassword, newPassword, context = {}) {
    try {
      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found', SERVICE_ERROR_CODES.AUTH_USER_NOT_FOUND);
      }

      // Verify current password
      const isCurrentPasswordValid = await encryption.comparePassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError('Current password is incorrect', SERVICE_ERROR_CODES.AUTH_CURRENT_PASSWORD_INCORRECT);
      }

      // Hash new password
      const hashedPassword = await encryption.hashPassword(newPassword);

      // Update password
      await this.userRepository.updatePassword(user.id, hashedPassword);

      // Log password change
      await this.auditLogRepository.logUserAction({
        user_id: user.id,
        brand_id: user.brand_id,
        action: AUDIT_ACTIONS.USER_CHANGE_PASSWORD,
        description: 'Password changed successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: { email: user.email }
      });

      logger.logBusiness('Password changed', {
        userId: user.id,
        email: user.email
      });
    } catch (error) {
      logger.error('Password change failed', {
        error: error.message,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Verify email address
   * @param {string} token - Verification token
   * @param {object} context - Request context
   */
  async verifyEmail(token, context = {}) {
    try {
      // Find user by verification token
      const user = await this.userRepository.findByVerificationToken(token);
      if (!user) {
        throw new AuthenticationError('Invalid or expired verification token', SERVICE_ERROR_CODES.AUTH_INVALID_VERIFICATION_TOKEN);
      }

      // Verify email
      await this.userRepository.verifyEmail(user.id);

      // Log email verification
      await this.auditLogRepository.logUserAction({
        user_id: user.id,
        brand_id: user.brand_id,
        action: AUDIT_ACTIONS.USER_UPDATE_PROFILE,
        description: 'Email verified successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: { email: user.email }
      });

      logger.logBusiness('Email verified', {
        userId: user.id,
        email: user.email
      });
    } catch (error) {
      logger.error('Email verification failed', {
        error: error.message,
        context
      });
      throw error;
    }
  }

  /**
   * Resend email verification
   * @param {string} email - User email
   * @param {object} context - Request context
   */
  async resendVerification(email, context = {}) {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new NotFoundError('User not found', SERVICE_ERROR_CODES.AUTH_USER_NOT_FOUND);
      }

      if (user.email_verified_at) {
        throw new ValidationError('Email is already verified', SERVICE_ERROR_CODES.AUTH_EMAIL_ALREADY_VERIFIED);
      }

      // Generate new verification token
      const verificationToken = encryption.generateEmailVerificationToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update verification token
      await this.userRepository.setVerificationToken(user.id, verificationToken, verificationExpires);

      logger.logBusiness('Email verification resent', {
        userId: user.id,
        email: user.email
      });

      // In a real application, you would send an email here
      logger.info('Email verification token generated', {
        userId: user.id,
        token: verificationToken // Remove this in production
      });
    } catch (error) {
      logger.error('Resend verification failed', {
        error: error.message,
        email,
        context
      });
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {object} updateData - Profile update data
   * @param {object} context - Request context
   * @returns {object} - Updated user
   */
  async updateProfile(userId, updateData, context = {}) {
    try {
      // Get current user
      const currentUser = await this.userRepository.findById(userId);
      if (!currentUser) {
        throw new NotFoundError('User not found');
      }

      // Check if email is being changed and is available
      if (updateData.email && updateData.email !== currentUser.email) {
        const isEmailAvailable = await this.userRepository.isEmailAvailable(updateData.email, userId);
        if (!isEmailAvailable) {
          throw new ConflictError('Email address is already in use', SERVICE_ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE);
        }
      }

      // Update user
      const updatedUser = await this.userRepository.update(userId, updateData);

      // Log profile update
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: currentUser.brand_id,
        action: AUDIT_ACTIONS.USER_UPDATE_PROFILE,
        description: 'Profile updated successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          updatedFields: Object.keys(updateData)
        }
      });

      logger.logBusiness('Profile updated', {
        userId,
        updatedFields: Object.keys(updateData)
      });

      // Remove sensitive data from response
      const { password_hash, email_verification_token, password_reset_token, ...userResponse } = updatedUser;
      return userResponse;
    } catch (error) {
      logger.error('Profile update failed', {
        error: error.message,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {object} - User profile
   */
  async getProfile(userId) {
    try {
      const user = await this.userRepository.findWithBrand(userId);
      if (!user) {
        throw new NotFoundError('User not found', SERVICE_ERROR_CODES.AUTH_USER_NOT_FOUND);
      }

      // Remove sensitive data from response
      const { password_hash, email_verification_token, password_reset_token, ...userResponse } = user;
      return userResponse;
    } catch (error) {
      logger.error('Get profile failed', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

module.exports = AuthService;