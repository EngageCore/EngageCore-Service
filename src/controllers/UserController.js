/**
 * User Controller
 * Handles user-related HTTP requests
 */

const { UserService } = require('../services');
const { response, logger } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');

class UserController {
  constructor() {
    this.userService = new UserService();
  }

  /**
   * Create a new user
   * POST /api/users
   */
  createUser = asyncHandler(async (req, res) => {
    const userData = req.body;
    const creatorId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const user = await this.userService.createUser(userData, creatorId, context);

    logger.info('User created successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      createdBy: creatorId
    });

    return response.success(res, {
      message: 'User created successfully',
      data: { user }
    }, 201);
  });

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;

    const user = await this.userService.getUserById(id, requesterId);

    return response.success(res, {
      message: 'User retrieved successfully',
      data: { user }
    });
  });

  /**
   * Update user
   * PUT /api/users/:id
   */
  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const updaterId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const user = await this.userService.updateUser(id, updateData, updaterId, context);

    logger.info('User updated successfully', {
      userId: id,
      updatedBy: updaterId
    });

    return response.success(res, {
      message: 'User updated successfully',
      data: { user }
    });
  });

  /**
   * List users with pagination and filtering
   * GET /api/users
   */
  listUsers = asyncHandler(async (req, res) => {
    const options = req.query;
    const requesterId = req.user.id;

    const result = await this.userService.listUsers(options, requesterId);

    return response.success(res, {
      message: 'Users retrieved successfully',
      data: result
    });
  });

  /**
   * Delete user
   * DELETE /api/users/:id
   */
  deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleterId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.userService.deleteUser(id, deleterId, context);

    logger.info('User deleted successfully', {
      userId: id,
      deletedBy: deleterId
    });

    return response.success(res, {
      message: 'User deleted successfully'
    });
  });

  /**
   * Change user password
   * POST /api/users/:id/change-password
   */
  changeUserPassword = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { current_password, new_password } = req.body;
    const requesterId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // For self password change, current_password is required
    if (id === requesterId && !current_password) {
      return response.error(res, 'Current password is required', 400);
    }

    if (!new_password) {
      return response.error(res, 'New password is required', 400);
    }

    await this.userService.changeUserPassword(id, current_password, new_password, requesterId, context);

    logger.info('User password changed successfully', {
      userId: id,
      changedBy: requesterId
    });

    return response.success(res, {
      message: 'Password changed successfully'
    });
  });

  /**
   * Get user statistics
   * GET /api/users/statistics
   */
  getUserStatistics = asyncHandler(async (req, res) => {
    const { brand_id } = req.query;
    const options = req.query;
    const requesterId = req.user.id;

    const statistics = await this.userService.getUserStatistics(brand_id, options, requesterId);

    return response.success(res, {
      message: 'User statistics retrieved successfully',
      data: { statistics }
    });
  });

  /**
   * Get user activity log
   * GET /api/users/:id/activity
   */
  getUserActivityLog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const options = req.query;
    const requesterId = req.user.id;

    const result = await this.userService.getUserActivityLog(id, options, requesterId);

    return response.success(res, {
      message: 'User activity log retrieved successfully',
      data: result
    });
  });

  /**
   * Update user status
   * POST /api/users/:id/status
   */
  updateUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updaterId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!status) {
      return response.error(res, 'Status is required', 400);
    }

    const user = await this.userService.updateUserStatus(id, status, updaterId, context);

    logger.info('User status updated successfully', {
      userId: id,
      newStatus: status,
      updatedBy: updaterId
    });

    return response.success(res, {
      message: 'User status updated successfully',
      data: { user }
    });
  });

  /**
   * Get current user profile
   * GET /api/users/me
   */
  getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const user = await this.userService.getUserById(userId, userId);

    return response.success(res, {
      message: 'Current user retrieved successfully',
      data: { user }
    });
  });

  /**
   * Update current user profile
   * PUT /api/users/me
   */
  updateCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const updateData = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Remove sensitive fields that users shouldn't be able to update themselves
    delete updateData.role;
    delete updateData.status;
    delete updateData.brand_id;

    const user = await this.userService.updateUser(userId, updateData, userId, context);

    logger.info('Current user updated successfully', {
      userId
    });

    return response.success(res, {
      message: 'Profile updated successfully',
      data: { user }
    });
  });

  /**
   * Get user dashboard data
   * GET /api/users/:id/dashboard
   */
  getUserDashboard = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const options = req.query;
    const requesterId = req.user.id;

    const [user, activityLog, statistics] = await Promise.all([
      this.userService.getUserById(id, requesterId),
      this.userService.getUserActivityLog(id, { limit: 10 }, requesterId),
      this.userService.getUserStatistics(user.brand_id, options, requesterId)
    ]);

    const dashboard = {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        status: user.status,
        brand: user.brand,
        last_login_at: user.last_login_at,
        created_at: user.created_at
      },
      recent_activities: activityLog.activities,
      statistics: {
        total_logins: statistics.total_logins || 0,
        actions_this_month: statistics.actions_this_month || 0,
        last_active: user.last_login_at
      },
      summary: {
        account_age_days: Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)),
        is_active: user.status === 'active',
        email_verified: !!user.email_verified_at
      },
      last_updated: new Date()
    };

    return response.success(res, {
      message: 'User dashboard data retrieved successfully',
      data: { dashboard }
    });
  });

  /**
   * Activate user
   * POST /api/users/:id/activate
   */
  activateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updaterId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const user = await this.userService.updateUserStatus(id, 'active', updaterId, context);

    logger.info('User activated successfully', {
      userId: id,
      activatedBy: updaterId
    });

    return response.success(res, {
      message: 'User activated successfully',
      data: { user }
    });
  });

  /**
   * Deactivate user
   * POST /api/users/:id/deactivate
   */
  deactivateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updaterId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const user = await this.userService.updateUserStatus(id, 'inactive', updaterId, context);

    logger.info('User deactivated successfully', {
      userId: id,
      deactivatedBy: updaterId
    });

    return response.success(res, {
      message: 'User deactivated successfully',
      data: { user }
    });
  });

  /**
   * Get user permissions
   * GET /api/users/:id/permissions
   */
  getUserPermissions = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;

    // Get user to verify access
    const user = await this.userService.getUserById(id, requesterId);

    // This would typically get user permissions from a permissions system
    // For now, we'll return role-based permissions
    const permissions = {
      user_id: user.id,
      role: user.role,
      permissions: {
        can_create_users: ['super_admin', 'brand_admin'].includes(user.role),
        can_update_users: ['super_admin', 'brand_admin'].includes(user.role),
        can_delete_users: ['super_admin'].includes(user.role),
        can_manage_brands: ['super_admin'].includes(user.role),
        can_view_analytics: ['super_admin', 'brand_admin'].includes(user.role),
        can_export_data: ['super_admin', 'brand_admin'].includes(user.role)
      },
      brand_access: user.brand ? [user.brand.id] : [],
      last_updated: new Date()
    };

    return response.success(res, {
      message: 'User permissions retrieved successfully',
      data: { permissions }
    });
  });

  /**
   * Get user roles list
   * GET /api/users/roles
   */
  getUserRoles = asyncHandler(async (req, res) => {
    const requesterId = req.user.id;
    const requester = await this.userService.getUserById(requesterId, requesterId);

    // Return available roles based on requester's role
    let availableRoles = [];
    
    if (requester.role === 'super_admin') {
      availableRoles = [
        { value: 'user', label: 'User', description: 'Basic user with limited access' },
        { value: 'brand_user', label: 'Brand User', description: 'User with brand-specific access' },
        { value: 'brand_admin', label: 'Brand Admin', description: 'Administrator for a specific brand' }
      ];
    } else if (requester.role === 'brand_admin') {
      availableRoles = [
        { value: 'user', label: 'User', description: 'Basic user with limited access' },
        { value: 'brand_user', label: 'Brand User', description: 'User with brand-specific access' }
      ];
    }

    return response.success(res, {
      message: 'User roles retrieved successfully',
      data: { roles: availableRoles }
    });
  });

  /**
   * Bulk update users
   * PUT /api/users/bulk
   */
  bulkUpdateUsers = asyncHandler(async (req, res) => {
    const { user_ids, update_data } = req.body;
    const updaterId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!user_ids || !Array.isArray(user_ids)) {
      return response.error(res, 'User IDs array is required', 400);
    }

    if (!update_data || typeof update_data !== 'object') {
      return response.error(res, 'Update data is required', 400);
    }

    const results = {
      total: user_ids.length,
      updated: 0,
      errors: []
    };

    for (let i = 0; i < user_ids.length; i++) {
      try {
        await this.userService.updateUser(user_ids[i], update_data, updaterId, context);
        results.updated++;
      } catch (error) {
        results.errors.push({
          user_id: user_ids[i],
          error: error.message
        });
      }
    }

    logger.info('Bulk user update completed', {
      results,
      updatedBy: updaterId
    });

    return response.success(res, {
      message: 'Bulk user update completed',
      data: { results }
    });
  });

  /**
   * Export users data
   * GET /api/users/export
   */
  exportUsers = asyncHandler(async (req, res) => {
    const options = req.query;
    const requesterId = req.user.id;

    // Get users list with export options
    const result = await this.userService.listUsers({
      ...options,
      limit: 10000 // Large limit for export
    }, requesterId);

    // Filter sensitive data for export
    const exportData = result.users.map(user => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      status: user.status,
      brand_name: user.brand?.name,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      email_verified: !!user.email_verified_at
    }));

    logger.info('Users export completed', {
      count: exportData.length,
      format: options.format,
      exportedBy: requesterId
    });

    return response.success(res, {
      message: 'Users exported successfully',
      data: { 
        users: exportData,
        count: exportData.length,
        exported_at: new Date()
      }
    });
  });

  /**
   * Get user session info
   * GET /api/users/:id/sessions
   */
  getUserSessions = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;

    // Verify access to user
    await this.userService.getUserById(id, requesterId);

    // This would typically get active sessions from a session store
    // For now, we'll return mock data
    const sessions = [
      {
        id: 'session_1',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: 'New York, US',
        created_at: new Date(),
        last_activity: new Date(),
        is_current: true
      },
      {
        id: 'session_2',
        ip_address: '192.168.1.101',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        location: 'New York, US',
        created_at: new Date(Date.now() - 86400000),
        last_activity: new Date(Date.now() - 3600000),
        is_current: false
      }
    ];

    return response.success(res, {
      message: 'User sessions retrieved successfully',
      data: { 
        sessions,
        total_sessions: sessions.length,
        active_sessions: sessions.filter(s => s.is_current).length
      }
    });
  });
}

module.exports = new UserController();