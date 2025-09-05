/**
 * User Service
 * Handles user management business logic
 */

const { UserRepository, BrandRepository, AuditLogRepository } = require('../repositories');
const { logger, constants, encryption } = require('../utils');
const { errorHandler } = require('../middleware');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = errorHandler;
const { AUDIT_ACTIONS, USER_ROLES, USER_STATUS } = constants;

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
    this.brandRepository = new BrandRepository();
    this.auditLogRepository = new AuditLogRepository();
  }

  /**
   * Create a new user
   * @param {object} userData - User creation data
   * @param {string} creatorId - User ID creating the user
   * @param {object} context - Request context
   * @returns {object} - Created user
   */
  async createUser(userData, creatorId, context = {}) {
    try {
      // Check if email is already taken
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictError('Email address is already registered');
      }

      // Validate brand access if brand_id is provided
      if (userData.brand_id) {
        const brand = await this.brandRepository.findById(userData.brand_id);
        if (!brand) {
          throw new NotFoundError('Brand not found');
        }

        // Check if creator has access to this brand
        const creatorHasAccess = await this.userRepository.hasAccessToBrand(creatorId, userData.brand_id);
        if (!creatorHasAccess) {
          throw new AuthorizationError('Access denied to this brand');
        }
      }

      // Hash password
      const hashedPassword = await encryption.hashPassword(userData.password);

      // Create user data
      const userToCreate = {
        ...userData,
        password_hash: hashedPassword,
        status: userData.status || USER_STATUS.ACTIVE,
        email_verification_token: encryption.generateEmailVerificationToken(),
        email_verification_expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        created_by: creatorId
      };

      // Remove plain password from data
      delete userToCreate.password;
      delete userToCreate.confirm_password;

      // Create user
      const user = await this.userRepository.create(userToCreate);

      // Log user creation
      await this.auditLogRepository.logUserAction({
        user_id: creatorId,
        brand_id: user.brand_id,
        action: AUDIT_ACTIONS.USER_CREATE,
        description: 'User created successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          createdUserId: user.id,
          createdUserEmail: user.email,
          createdUserRole: user.role
        }
      });

      logger.logBusiness('User created', {
        userId: user.id,
        email: user.email,
        role: user.role,
        brandId: user.brand_id,
        createdBy: creatorId
      });

      // Remove sensitive data from response
      const { password_hash, email_verification_token, ...userResponse } = user;
      return userResponse;
    } catch (error) {
      logger.error('User creation failed', {
        error: error.message,
        userData: { ...userData, password: '[REDACTED]' },
        creatorId,
        context
      });
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @param {string} requesterId - User ID making the request
   * @returns {object} - User data
   */
  async getUserById(userId, requesterId) {
    try {
      const user = await this.userRepository.findWithBrand(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if requester has permission to view this user
      const canView = await this.canViewUser(requesterId, userId);
      if (!canView) {
        throw new AuthorizationError('Access denied to view this user');
      }

      // Remove sensitive data from response
      const { password_hash, email_verification_token, password_reset_token, ...userResponse } = user;
      return userResponse;
    } catch (error) {
      logger.error('Get user failed', {
        error: error.message,
        userId,
        requesterId
      });
      throw error;
    }
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {object} updateData - Update data
   * @param {string} updaterId - User ID updating the user
   * @param {object} context - Request context
   * @returns {object} - Updated user
   */
  async updateUser(userId, updateData, updaterId, context = {}) {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Check if updater has permission to update this user
      const canUpdate = await this.canUpdateUser(updaterId, userId);
      if (!canUpdate) {
        throw new AuthorizationError('Access denied to update this user');
      }

      // Check email availability if email is being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const isEmailAvailable = await this.userRepository.isEmailAvailable(updateData.email, userId);
        if (!isEmailAvailable) {
          throw new ConflictError('Email address is already in use');
        }
      }

      // Validate brand access if brand_id is being updated
      if (updateData.brand_id && updateData.brand_id !== existingUser.brand_id) {
        const brand = await this.brandRepository.findById(updateData.brand_id);
        if (!brand) {
          throw new NotFoundError('Brand not found');
        }

        const updaterHasAccess = await this.userRepository.hasAccessToBrand(updaterId, updateData.brand_id);
        if (!updaterHasAccess) {
          throw new AuthorizationError('Access denied to this brand');
        }
      }

      // Validate role changes
      if (updateData.role && updateData.role !== existingUser.role) {
        const canChangeRole = await this.canChangeUserRole(updaterId, existingUser.role, updateData.role);
        if (!canChangeRole) {
          throw new AuthorizationError('Access denied to change user role');
        }
      }

      // Update user
      const updatedUser = await this.userRepository.update(userId, updateData);

      // Log user update
      await this.auditLogRepository.logUserAction({
        user_id: updaterId,
        brand_id: existingUser.brand_id,
        action: AUDIT_ACTIONS.USER_UPDATE,
        description: 'User updated successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          updatedUserId: userId,
          updatedUserEmail: updatedUser.email,
          updatedFields: Object.keys(updateData)
        }
      });

      logger.logBusiness('User updated', {
        userId,
        email: updatedUser.email,
        updatedFields: Object.keys(updateData),
        updatedBy: updaterId
      });

      // Remove sensitive data from response
      const { password_hash, email_verification_token, password_reset_token, ...userResponse } = updatedUser;
      return userResponse;
    } catch (error) {
      logger.error('User update failed', {
        error: error.message,
        userId,
        updateData: { ...updateData, password: '[REDACTED]' },
        updaterId,
        context
      });
      throw error;
    }
  }

  /**
   * List users with pagination and filtering
   * @param {object} options - Query options
   * @param {string} requesterId - User ID making the request
   * @returns {object} - Paginated users list
   */
  async listUsers(options = {}, requesterId) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        role,
        status,
        brand_id,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      // Get requester's accessible brands
      const requester = await this.userRepository.findById(requesterId);
      if (!requester) {
        throw new NotFoundError('Requester not found');
      }

      let accessibleBrandIds = [];
      if (requester.role === USER_ROLES.SUPER_ADMIN) {
        // Super admin can see all users
        accessibleBrandIds = null;
      } else {
        // Get brands the requester has access to
        const userBrands = await this.userRepository.getUserBrands(requesterId);
        accessibleBrandIds = userBrands.map(brand => brand.id);
        
        if (accessibleBrandIds.length === 0) {
          return {
            users: [],
            pagination: {
              page: 1,
              limit,
              total: 0,
              pages: 0
            }
          };
        }
      }

      // Build query options
      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        role,
        status,
        brand_id,
        sort_by,
        sort_order,
        accessible_brand_ids: accessibleBrandIds
      };

      const result = await this.userRepository.findMany(queryOptions);

      // Remove sensitive data from each user
      const users = result.users.map(user => {
        const { password_hash, email_verification_token, password_reset_token, ...userResponse } = user;
        return userResponse;
      });

      return {
        users,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('List users failed', {
        error: error.message,
        options,
        requesterId
      });
      throw error;
    }
  }

  /**
   * Delete user
   * @param {string} userId - User ID
   * @param {string} deleterId - User ID deleting the user
   * @param {object} context - Request context
   */
  async deleteUser(userId, deleterId, context = {}) {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Check if deleter has permission to delete this user
      const canDelete = await this.canDeleteUser(deleterId, userId);
      if (!canDelete) {
        throw new AuthorizationError('Access denied to delete this user');
      }

      // Prevent self-deletion
      if (userId === deleterId) {
        throw new ValidationError('Cannot delete your own account');
      }

      // Soft delete the user
      await this.userRepository.softDelete(userId);

      // Log user deletion
      await this.auditLogRepository.logUserAction({
        user_id: deleterId,
        brand_id: existingUser.brand_id,
        action: AUDIT_ACTIONS.USER_DELETE,
        description: 'User deleted successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          deletedUserId: userId,
          deletedUserEmail: existingUser.email,
          deletedUserRole: existingUser.role
        }
      });

      logger.logBusiness('User deleted', {
        userId,
        email: existingUser.email,
        role: existingUser.role,
        deletedBy: deleterId
      });
    } catch (error) {
      logger.error('User deletion failed', {
        error: error.message,
        userId,
        deleterId,
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
   * @param {string} requesterId - User ID making the request
   * @param {object} context - Request context
   */
  async changeUserPassword(userId, currentPassword, newPassword, requesterId, context = {}) {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if requester has permission to change this user's password
      const canChangePassword = await this.canChangeUserPassword(requesterId, userId);
      if (!canChangePassword) {
        throw new AuthorizationError('Access denied to change user password');
      }

      // If changing own password, verify current password
      if (userId === requesterId) {
        const isCurrentPasswordValid = await encryption.comparePassword(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
          throw new ValidationError('Current password is incorrect');
        }
      }

      // Hash new password
      const hashedPassword = await encryption.hashPassword(newPassword);

      // Update password
      await this.userRepository.updatePassword(userId, hashedPassword);

      // Log password change
      await this.auditLogRepository.logUserAction({
        user_id: requesterId,
        brand_id: user.brand_id,
        action: AUDIT_ACTIONS.USER_CHANGE_PASSWORD,
        description: 'User password changed',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          targetUserId: userId,
          targetUserEmail: user.email
        }
      });

      logger.logBusiness('User password changed', {
        userId,
        email: user.email,
        changedBy: requesterId
      });
    } catch (error) {
      logger.error('User password change failed', {
        error: error.message,
        userId,
        requesterId,
        context
      });
      throw error;
    }
  }

  /**
   * Get user statistics
   * @param {string} brandId - Brand ID (optional)
   * @param {object} options - Query options
   * @param {string} requesterId - User ID making the request
   * @returns {object} - User statistics
   */
  async getUserStatistics(brandId, options = {}, requesterId) {
    try {
      // Check if requester has access to the brand
      if (brandId) {
        const hasAccess = await this.userRepository.hasAccessToBrand(requesterId, brandId);
        if (!hasAccess) {
          throw new AuthorizationError('Access denied to this brand');
        }
      }

      const {
        start_date,
        end_date,
        period = 'day'
      } = options;

      const statistics = await this.userRepository.getStatistics(brandId, {
        start_date,
        end_date,
        period
      });

      return statistics;
    } catch (error) {
      logger.error('Get user statistics failed', {
        error: error.message,
        brandId,
        options,
        requesterId
      });
      throw error;
    }
  }

  /**
   * Get user activity log
   * @param {string} userId - User ID
   * @param {object} options - Query options
   * @param {string} requesterId - User ID making the request
   * @returns {object} - User activity log
   */
  async getUserActivityLog(userId, options = {}, requesterId) {
    try {
      // Check if requester has permission to view this user's activity
      const canView = await this.canViewUser(requesterId, userId);
      if (!canView) {
        throw new AuthorizationError('Access denied to view user activity');
      }

      const {
        page = 1,
        limit = 10,
        action,
        start_date,
        end_date,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        user_id: userId,
        action,
        start_date,
        end_date,
        sort_by,
        sort_order
      };

      const result = await this.auditLogRepository.findMany(queryOptions);

      return {
        activities: result.activities,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Get user activity log failed', {
        error: error.message,
        userId,
        options,
        requesterId
      });
      throw error;
    }
  }

  /**
   * Update user status
   * @param {string} userId - User ID
   * @param {string} status - New status
   * @param {string} updaterId - User ID updating the status
   * @param {object} context - Request context
   * @returns {object} - Updated user
   */
  async updateUserStatus(userId, status, updaterId, context = {}) {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Check if updater has permission to update this user's status
      const canUpdate = await this.canUpdateUser(updaterId, userId);
      if (!canUpdate) {
        throw new AuthorizationError('Access denied to update user status');
      }

      // Validate status
      if (!Object.values(USER_STATUS).includes(status)) {
        throw new ValidationError('Invalid user status');
      }

      // Prevent self-deactivation
      if (userId === updaterId && status === USER_STATUS.INACTIVE) {
        throw new ValidationError('Cannot deactivate your own account');
      }

      // Update user status
      const updatedUser = await this.userRepository.update(userId, { status });

      // Log status update
      await this.auditLogRepository.logUserAction({
        user_id: updaterId,
        brand_id: existingUser.brand_id,
        action: AUDIT_ACTIONS.USER_UPDATE,
        description: `User status changed to ${status}`,
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          targetUserId: userId,
          targetUserEmail: existingUser.email,
          oldStatus: existingUser.status,
          newStatus: status
        }
      });

      logger.logBusiness('User status updated', {
        userId,
        email: existingUser.email,
        oldStatus: existingUser.status,
        newStatus: status,
        updatedBy: updaterId
      });

      // Remove sensitive data from response
      const { password_hash, email_verification_token, password_reset_token, ...userResponse } = updatedUser;
      return userResponse;
    } catch (error) {
      logger.error('User status update failed', {
        error: error.message,
        userId,
        status,
        updaterId,
        context
      });
      throw error;
    }
  }

  /**
   * Check if user can view another user
   * @param {string} viewerId - Viewer user ID
   * @param {string} targetUserId - Target user ID
   * @returns {boolean} - Whether viewer can view target user
   */
  async canViewUser(viewerId, targetUserId) {
    try {
      // Users can always view themselves
      if (viewerId === targetUserId) {
        return true;
      }

      const viewer = await this.userRepository.findById(viewerId);
      const targetUser = await this.userRepository.findById(targetUserId);

      if (!viewer || !targetUser) {
        return false;
      }

      // Super admin can view all users
      if (viewer.role === USER_ROLES.SUPER_ADMIN) {
        return true;
      }

      // Brand admin can view users in their brand
      if (viewer.role === USER_ROLES.BRAND_ADMIN && viewer.brand_id === targetUser.brand_id) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Can view user check failed', {
        error: error.message,
        viewerId,
        targetUserId
      });
      return false;
    }
  }

  /**
   * Check if user can update another user
   * @param {string} updaterId - Updater user ID
   * @param {string} targetUserId - Target user ID
   * @returns {boolean} - Whether updater can update target user
   */
  async canUpdateUser(updaterId, targetUserId) {
    try {
      // Users can always update themselves (with restrictions)
      if (updaterId === targetUserId) {
        return true;
      }

      const updater = await this.userRepository.findById(updaterId);
      const targetUser = await this.userRepository.findById(targetUserId);

      if (!updater || !targetUser) {
        return false;
      }

      // Super admin can update all users
      if (updater.role === USER_ROLES.SUPER_ADMIN) {
        return true;
      }

      // Brand admin can update users in their brand (except other brand admins)
      if (updater.role === USER_ROLES.BRAND_ADMIN && 
          updater.brand_id === targetUser.brand_id &&
          targetUser.role !== USER_ROLES.BRAND_ADMIN &&
          targetUser.role !== USER_ROLES.SUPER_ADMIN) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Can update user check failed', {
        error: error.message,
        updaterId,
        targetUserId
      });
      return false;
    }
  }

  /**
   * Check if user can delete another user
   * @param {string} deleterId - Deleter user ID
   * @param {string} targetUserId - Target user ID
   * @returns {boolean} - Whether deleter can delete target user
   */
  async canDeleteUser(deleterId, targetUserId) {
    try {
      // Users cannot delete themselves
      if (deleterId === targetUserId) {
        return false;
      }

      const deleter = await this.userRepository.findById(deleterId);
      const targetUser = await this.userRepository.findById(targetUserId);

      if (!deleter || !targetUser) {
        return false;
      }

      // Super admin can delete all users except other super admins
      if (deleter.role === USER_ROLES.SUPER_ADMIN && targetUser.role !== USER_ROLES.SUPER_ADMIN) {
        return true;
      }

      // Brand admin can delete regular users in their brand
      if (deleter.role === USER_ROLES.BRAND_ADMIN && 
          deleter.brand_id === targetUser.brand_id &&
          targetUser.role === USER_ROLES.USER) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Can delete user check failed', {
        error: error.message,
        deleterId,
        targetUserId
      });
      return false;
    }
  }

  /**
   * Check if user can change another user's role
   * @param {string} changerId - Changer user ID
   * @param {string} currentRole - Current role
   * @param {string} newRole - New role
   * @returns {boolean} - Whether changer can change role
   */
  async canChangeUserRole(changerId, currentRole, newRole) {
    try {
      const changer = await this.userRepository.findById(changerId);
      if (!changer) {
        return false;
      }

      // Super admin can change any role except to super admin
      if (changer.role === USER_ROLES.SUPER_ADMIN && newRole !== USER_ROLES.SUPER_ADMIN) {
        return true;
      }

      // Brand admin can only change regular users to brand users and vice versa
      if (changer.role === USER_ROLES.BRAND_ADMIN &&
          [USER_ROLES.USER, USER_ROLES.BRAND_USER].includes(currentRole) &&
          [USER_ROLES.USER, USER_ROLES.BRAND_USER].includes(newRole)) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Can change user role check failed', {
        error: error.message,
        changerId,
        currentRole,
        newRole
      });
      return false;
    }
  }

  /**
   * Check if user can change another user's password
   * @param {string} changerId - Changer user ID
   * @param {string} targetUserId - Target user ID
   * @returns {boolean} - Whether changer can change password
   */
  async canChangeUserPassword(changerId, targetUserId) {
    try {
      // Users can always change their own password
      if (changerId === targetUserId) {
        return true;
      }

      const changer = await this.userRepository.findById(changerId);
      const targetUser = await this.userRepository.findById(targetUserId);

      if (!changer || !targetUser) {
        return false;
      }

      // Super admin can change any user's password
      if (changer.role === USER_ROLES.SUPER_ADMIN) {
        return true;
      }

      // Brand admin can change passwords of users in their brand (except other admins)
      if (changer.role === USER_ROLES.BRAND_ADMIN && 
          changer.brand_id === targetUser.brand_id &&
          ![USER_ROLES.BRAND_ADMIN, USER_ROLES.SUPER_ADMIN].includes(targetUser.role)) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Can change user password check failed', {
        error: error.message,
        changerId,
        targetUserId
      });
      return false;
    }
  }
}

module.exports = UserService;