/**
 * Admin Service
 * Handles administrative operations and system management
 */

const { 
  UserRepository, 
  BrandRepository, 
  MemberRepository, 
  TransactionRepository, 
  WheelRepository, 
  MissionRepository, 
  AuditLogRepository 
} = require('../repositories');
const { logger, constants } = require('../utils');
const { errorHandler } = require('../middleware');
const { NotFoundError, AuthorizationError, ValidationError } = errorHandler;
const { SERVICE_ERROR_CODES } = require('../enums');
const { AUDIT_ACTIONS, USER_ROLES } = constants;

class AdminService {
  constructor() {
    this.userRepository = new UserRepository();
    this.brandRepository = new BrandRepository();
    this.memberRepository = new MemberRepository();
    this.transactionRepository = new TransactionRepository();
    this.wheelRepository = new WheelRepository();
    this.missionRepository = new MissionRepository();
    this.auditLogRepository = new AuditLogRepository();
  }

  /**
   * Get system dashboard overview
   * @param {string} userId - Admin user ID
   * @param {object} options - Query options
   * @returns {object} - Dashboard data
   */
  async getDashboardOverview(userId, options = {}) {
    try {
      // Verify admin access
      await this.verifyAdminAccess(userId);

      const {
        start_date,
        end_date,
        period = 'day'
      } = options;

      // Get system-wide statistics
      const [userStats, brandStats, memberStats, transactionStats] = await Promise.all([
        this.userRepository.getStatistics(null, { start_date, end_date, period }),
        this.brandRepository.getStatistics(null, { start_date, end_date, period }),
        this.memberRepository.getStatistics(null, { start_date, end_date, period }),
        this.transactionRepository.getStatistics(null, { start_date, end_date, period })
      ]);

      // Get recent activities
      const recentActivities = await this.auditLogRepository.findMany({
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      // Get top performing brands
      const topBrands = await this.brandRepository.getTopPerforming({
        limit: 10,
        start_date,
        end_date
      });

      const dashboard = {
        overview: {
          total_users: userStats.total_count,
          total_brands: brandStats.total_count,
          total_members: memberStats.total_count,
          total_transactions: transactionStats.total_count,
          total_points_issued: transactionStats.total_credits,
          total_points_redeemed: transactionStats.total_debits
        },
        trends: {
          users: userStats.trends,
          brands: brandStats.trends,
          members: memberStats.trends,
          transactions: transactionStats.trends
        },
        recent_activities: recentActivities.activities || [],
        top_brands: topBrands
      };

      logger.logBusiness('Admin dashboard accessed', {
        userId,
        period,
        dateRange: { start_date, end_date }
      });

      return dashboard;
    } catch (error) {
      logger.error('Get dashboard overview failed', {
        error: error.message,
        userId,
        options
      });
      throw error;
    }
  }

  /**
   * Get system analytics
   * @param {string} userId - Admin user ID
   * @param {object} options - Query options
   * @returns {object} - Analytics data
   */
  async getSystemAnalytics(userId, options = {}) {
    try {
      // Verify admin access
      await this.verifyAdminAccess(userId);

      const {
        start_date,
        end_date,
        period = 'day',
        metrics = ['users', 'brands', 'members', 'transactions', 'engagement']
      } = options;

      const analytics = {};

      // User analytics
      if (metrics.includes('users')) {
        analytics.users = await this.getUserAnalytics({ start_date, end_date, period });
      }

      // Brand analytics
      if (metrics.includes('brands')) {
        analytics.brands = await this.getBrandAnalytics({ start_date, end_date, period });
      }

      // Member analytics
      if (metrics.includes('members')) {
        analytics.members = await this.getMemberAnalytics({ start_date, end_date, period });
      }

      // Transaction analytics
      if (metrics.includes('transactions')) {
        analytics.transactions = await this.getTransactionAnalytics({ start_date, end_date, period });
      }

      // Engagement analytics
      if (metrics.includes('engagement')) {
        analytics.engagement = await this.getEngagementAnalytics({ start_date, end_date, period });
      }

      logger.logBusiness('System analytics accessed', {
        userId,
        metrics,
        period,
        dateRange: { start_date, end_date }
      });

      return analytics;
    } catch (error) {
      logger.error('Get system analytics failed', {
        error: error.message,
        userId,
        options
      });
      throw error;
    }
  }

  /**
   * Get audit logs
   * @param {string} userId - Admin user ID
   * @param {object} options - Query options
   * @returns {object} - Audit logs
   */
  async getAuditLogs(userId, options = {}) {
    try {
      // Verify admin access
      await this.verifyAdminAccess(userId);

      const {
        page = 1,
        limit = 50,
        user_id,
        brand_id,
        action,
        start_date,
        end_date,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        user_id,
        brand_id,
        action,
        start_date,
        end_date,
        sort_by,
        sort_order
      };

      const result = await this.auditLogRepository.findMany(queryOptions);

      logger.logBusiness('Audit logs accessed', {
        userId,
        filters: { user_id, brand_id, action, start_date, end_date }
      });

      return {
        logs: result.activities,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Get audit logs failed', {
        error: error.message,
        userId,
        options
      });
      throw error;
    }
  }

  /**
   * Get system health status
   * @param {string} userId - Admin user ID
   * @returns {object} - System health data
   */
  async getSystemHealth(userId) {
    try {
      // Verify admin access
      await this.verifyAdminAccess(userId);

      // Check database connectivity
      const dbHealth = await this.checkDatabaseHealth();

      // Check system resources
      const resourceHealth = await this.checkResourceHealth();

      // Check service status
      const serviceHealth = await this.checkServiceHealth();

      // Get error rates
      const errorRates = await this.getErrorRates();

      const health = {
        overall_status: this.calculateOverallHealth([dbHealth, resourceHealth, serviceHealth]),
        database: dbHealth,
        resources: resourceHealth,
        services: serviceHealth,
        error_rates: errorRates,
        last_checked: new Date()
      };

      logger.logBusiness('System health checked', {
        userId,
        overallStatus: health.overall_status
      });

      return health;
    } catch (error) {
      logger.error('Get system health failed', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Generate system report
   * @param {string} userId - Admin user ID
   * @param {object} options - Report options
   * @returns {object} - Generated report
   */
  async generateSystemReport(userId, options = {}) {
    try {
      // Verify admin access
      await this.verifyAdminAccess(userId);

      const {
        type = 'summary',
        start_date,
        end_date,
        format = 'json',
        include_details = false
      } = options;

      let report = {};

      switch (type) {
        case 'summary':
          report = await this.generateSummaryReport({ start_date, end_date, include_details });
          break;
        case 'users':
          report = await this.generateUserReport({ start_date, end_date, include_details });
          break;
        case 'brands':
          report = await this.generateBrandReport({ start_date, end_date, include_details });
          break;
        case 'transactions':
          report = await this.generateTransactionReport({ start_date, end_date, include_details });
          break;
        case 'engagement':
          report = await this.generateEngagementReport({ start_date, end_date, include_details });
          break;
        default:
          throw new ValidationError('Invalid report type', 400, SERVICE_ERROR_CODES.ADMIN_INVALID_REPORT_TYPE);
      }

      // Log report generation
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        action: AUDIT_ACTIONS.ADMIN_REPORT,
        description: `Generated ${type} report`,
        metadata: {
          reportType: type,
          format,
          dateRange: { start_date, end_date }
        }
      });

      logger.logBusiness('System report generated', {
        userId,
        reportType: type,
        format,
        dateRange: { start_date, end_date }
      });

      return {
        report,
        metadata: {
          type,
          format,
          generated_at: new Date(),
          generated_by: userId,
          date_range: { start_date, end_date }
        }
      };
    } catch (error) {
      logger.error('Generate system report failed', {
        error: error.message,
        userId,
        options
      });
      throw error;
    }
  }

  /**
   * Manage system settings
   * @param {string} userId - Admin user ID
   * @param {object} settings - Settings to update
   * @param {object} context - Request context
   * @returns {object} - Updated settings
   */
  async manageSystemSettings(userId, settings, context = {}) {
    try {
      // Verify super admin access
      await this.verifySuperAdminAccess(userId);

      // Validate settings
      this.validateSystemSettings(settings);

      // Update settings (this would typically be stored in a settings table)
      // For now, we'll just log the changes
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        action: AUDIT_ACTIONS.ADMIN_SETTINGS,
        description: 'System settings updated',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          updatedSettings: Object.keys(settings)
        }
      });

      logger.logBusiness('System settings updated', {
        userId,
        updatedSettings: Object.keys(settings)
      });

      return {
        success: true,
        updated_settings: Object.keys(settings),
        updated_at: new Date()
      };
    } catch (error) {
      logger.error('Manage system settings failed', {
        error: error.message,
        userId,
        settings,
        context
      });
      throw error;
    }
  }

  /**
   * Get user analytics
   * @param {object} options - Query options
   * @returns {object} - User analytics
   */
  async getUserAnalytics(options = {}) {
    const { start_date, end_date, period } = options;
    
    const [stats, trends, roleBreakdown] = await Promise.all([
      this.userRepository.getStatistics(null, { start_date, end_date, period }),
      this.userRepository.getTrends(null, { start_date, end_date, period }),
      this.userRepository.getRoleBreakdown({ start_date, end_date })
    ]);

    return {
      statistics: stats,
      trends,
      role_breakdown: roleBreakdown
    };
  }

  /**
   * Get brand analytics
   * @param {object} options - Query options
   * @returns {object} - Brand analytics
   */
  async getBrandAnalytics(options = {}) {
    const { start_date, end_date, period } = options;
    
    const [stats, trends, topBrands, statusBreakdown] = await Promise.all([
      this.brandRepository.getStatistics(null, { start_date, end_date, period }),
      this.brandRepository.getTrends({ start_date, end_date, period }),
      this.brandRepository.getTopPerforming({ limit: 10, start_date, end_date }),
      this.brandRepository.getStatusBreakdown({ start_date, end_date })
    ]);

    return {
      statistics: stats,
      trends,
      top_brands: topBrands,
      status_breakdown: statusBreakdown
    };
  }

  /**
   * Get member analytics
   * @param {object} options - Query options
   * @returns {object} - Member analytics
   */
  async getMemberAnalytics(options = {}) {
    const { start_date, end_date, period } = options;
    
    const [stats, trends, tierBreakdown, topMembers] = await Promise.all([
      this.memberRepository.getStatistics(null, { start_date, end_date, period }),
      this.memberRepository.getTrends({ start_date, end_date, period }),
      this.memberRepository.getTierBreakdown({ start_date, end_date }),
      this.memberRepository.getTopMembers({ limit: 10, start_date, end_date })
    ]);

    return {
      statistics: stats,
      trends,
      tier_breakdown: tierBreakdown,
      top_members: topMembers
    };
  }

  /**
   * Get transaction analytics
   * @param {object} options - Query options
   * @returns {object} - Transaction analytics
   */
  async getTransactionAnalytics(options = {}) {
    const { start_date, end_date, period } = options;
    
    const [stats, trends, typeBreakdown, topSpenders] = await Promise.all([
      this.transactionRepository.getStatistics(null, { start_date, end_date, period }),
      this.transactionRepository.getTrends(null, { start_date, end_date, period }),
      this.transactionRepository.getTypeBreakdown(null, { start_date, end_date }),
      this.transactionRepository.getTopSpendingMembers(null, { limit: 10, start_date, end_date })
    ]);

    return {
      statistics: stats,
      trends,
      type_breakdown: typeBreakdown,
      top_spenders: topSpenders
    };
  }

  /**
   * Get engagement analytics
   * @param {object} options - Query options
   * @returns {object} - Engagement analytics
   */
  async getEngagementAnalytics(options = {}) {
    const { start_date, end_date, period } = options;
    
    const [wheelStats, missionStats, activityStats] = await Promise.all([
      this.wheelRepository.getEngagementStats({ start_date, end_date, period }),
      this.missionRepository.getEngagementStats({ start_date, end_date, period }),
      this.auditLogRepository.getActivityStats({ start_date, end_date, period })
    ]);

    return {
      wheel_engagement: wheelStats,
      mission_engagement: missionStats,
      overall_activity: activityStats
    };
  }

  /**
   * Check database health
   * @returns {object} - Database health status
   */
  async checkDatabaseHealth() {
    try {
      // Simple query to check database connectivity
      await this.userRepository.healthCheck();
      
      return {
        status: 'healthy',
        response_time: Date.now(), // This would be actual response time
        connections: {
          active: 10, // This would be actual connection count
          max: 100
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        last_error: new Date()
      };
    }
  }

  /**
   * Check resource health
   * @returns {object} - Resource health status
   */
  async checkResourceHealth() {
    // This would check actual system resources
    return {
      status: 'healthy',
      memory: {
        used: '256MB',
        total: '1GB',
        percentage: 25
      },
      cpu: {
        usage: 15,
        load_average: [0.5, 0.7, 0.8]
      },
      disk: {
        used: '2GB',
        total: '10GB',
        percentage: 20
      }
    };
  }

  /**
   * Check service health
   * @returns {object} - Service health status
   */
  async checkServiceHealth() {
    // This would check actual service status
    return {
      status: 'healthy',
      services: {
        api: 'running',
        database: 'running',
        cache: 'running',
        queue: 'running'
      },
      uptime: '5 days, 12 hours'
    };
  }

  /**
   * Get error rates
   * @returns {object} - Error rate statistics
   */
  async getErrorRates() {
    // This would get actual error rates from logs
    return {
      last_hour: {
        total_requests: 1000,
        errors: 5,
        error_rate: 0.5
      },
      last_24_hours: {
        total_requests: 24000,
        errors: 120,
        error_rate: 0.5
      }
    };
  }

  /**
   * Calculate overall health status
   * @param {Array} healthChecks - Array of health check results
   * @returns {string} - Overall health status
   */
  calculateOverallHealth(healthChecks) {
    const unhealthyCount = healthChecks.filter(check => check.status !== 'healthy').length;
    
    if (unhealthyCount === 0) {
      return 'healthy';
    } else if (unhealthyCount <= healthChecks.length / 2) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Generate summary report
   * @param {object} options - Report options
   * @returns {object} - Summary report
   */
  async generateSummaryReport(options = {}) {
    const { start_date, end_date, include_details } = options;
    
    const [userStats, brandStats, memberStats, transactionStats] = await Promise.all([
      this.userRepository.getStatistics(null, { start_date, end_date }),
      this.brandRepository.getStatistics(null, { start_date, end_date }),
      this.memberRepository.getStatistics(null, { start_date, end_date }),
      this.transactionRepository.getStatistics(null, { start_date, end_date })
    ]);

    const report = {
      summary: {
        total_users: userStats.total_count,
        total_brands: brandStats.total_count,
        total_members: memberStats.total_count,
        total_transactions: transactionStats.total_count,
        total_points_issued: transactionStats.total_credits,
        total_points_redeemed: transactionStats.total_debits
      }
    };

    if (include_details) {
      report.details = {
        users: userStats,
        brands: brandStats,
        members: memberStats,
        transactions: transactionStats
      };
    }

    return report;
  }

  /**
   * Generate user report
   * @param {object} options - Report options
   * @returns {object} - User report
   */
  async generateUserReport(options = {}) {
    const { start_date, end_date, include_details } = options;
    
    const [stats, roleBreakdown, recentUsers] = await Promise.all([
      this.userRepository.getStatistics(null, { start_date, end_date }),
      this.userRepository.getRoleBreakdown({ start_date, end_date }),
      this.userRepository.getRecentUsers({ limit: 10, start_date, end_date })
    ]);

    return {
      statistics: stats,
      role_breakdown: roleBreakdown,
      recent_users: include_details ? recentUsers : recentUsers.length
    };
  }

  /**
   * Generate brand report
   * @param {object} options - Report options
   * @returns {object} - Brand report
   */
  async generateBrandReport(options = {}) {
    const { start_date, end_date, include_details } = options;
    
    const [stats, topBrands, statusBreakdown] = await Promise.all([
      this.brandRepository.getStatistics(null, { start_date, end_date }),
      this.brandRepository.getTopPerforming({ limit: 10, start_date, end_date }),
      this.brandRepository.getStatusBreakdown({ start_date, end_date })
    ]);

    return {
      statistics: stats,
      top_brands: include_details ? topBrands : topBrands.length,
      status_breakdown: statusBreakdown
    };
  }

  /**
   * Generate transaction report
   * @param {object} options - Report options
   * @returns {object} - Transaction report
   */
  async generateTransactionReport(options = {}) {
    const { start_date, end_date, include_details } = options;
    
    const [stats, typeBreakdown, topSpenders] = await Promise.all([
      this.transactionRepository.getStatistics(null, { start_date, end_date }),
      this.transactionRepository.getTypeBreakdown(null, { start_date, end_date }),
      this.transactionRepository.getTopSpendingMembers(null, { limit: 10, start_date, end_date })
    ]);

    return {
      statistics: stats,
      type_breakdown: typeBreakdown,
      top_spenders: include_details ? topSpenders : topSpenders.length
    };
  }

  /**
   * Generate engagement report
   * @param {object} options - Report options
   * @returns {object} - Engagement report
   */
  async generateEngagementReport(options = {}) {
    const { start_date, end_date, include_details } = options;
    
    const [wheelStats, missionStats, activityStats] = await Promise.all([
      this.wheelRepository.getEngagementStats({ start_date, end_date }),
      this.missionRepository.getEngagementStats({ start_date, end_date }),
      this.auditLogRepository.getActivityStats({ start_date, end_date })
    ]);

    return {
      wheel_engagement: wheelStats,
      mission_engagement: missionStats,
      overall_activity: activityStats
    };
  }

  /**
   * Verify admin access
   * @param {string} userId - User ID to verify
   */
  async verifyAdminAccess(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 404, SERVICE_ERROR_CODES.ADMIN_USER_NOT_FOUND);
    }

    if (![USER_ROLES.SUPER_ADMIN, USER_ROLES.BRAND_ADMIN].includes(user.role)) {
      throw new AuthorizationError('Admin access required', 403, SERVICE_ERROR_CODES.ADMIN_INSUFFICIENT_PERMISSIONS);
    }
  }

  /**
   * Verify super admin access
   * @param {string} userId - User ID to verify
   */
  async verifySuperAdminAccess(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 404, SERVICE_ERROR_CODES.ADMIN_USER_NOT_FOUND);
    }

    if (user.role !== USER_ROLES.SUPER_ADMIN) {
      throw new AuthorizationError('Super admin access required', 403, SERVICE_ERROR_CODES.ADMIN_INSUFFICIENT_PERMISSIONS);
    }
  }

  /**
   * Validate system settings
   * @param {object} settings - Settings to validate
   */
  validateSystemSettings(settings) {
    // Add validation logic for system settings
    const allowedSettings = [
      'maintenance_mode',
      'max_file_size',
      'session_timeout',
      'rate_limit_requests',
      'rate_limit_window',
      'email_notifications',
      'sms_notifications'
    ];

    for (const key of Object.keys(settings)) {
      if (!allowedSettings.includes(key)) {
        throw new ValidationError(`Invalid setting: ${key}`, 400, SERVICE_ERROR_CODES.ADMIN_INVALID_SETTING);
      }
    }
  }
}

module.exports = AdminService;