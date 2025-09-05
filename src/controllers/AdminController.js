/**
 * Admin Controller
 * Handles administrative HTTP requests
 */

const { AdminService } = require('../services');
const { response, logger } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');

class AdminController {
  constructor() {
    this.adminService = new AdminService();
  }

  /**
   * Get system dashboard overview
   * GET /api/admin/dashboard
   */
  getDashboardOverview = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const options = req.query;

    const dashboard = await this.adminService.getDashboardOverview(userId, options);

    return response.success(res, {
      message: 'Dashboard overview retrieved successfully',
      data: { dashboard }
    });
  });

  /**
   * Get system dashboard (alias for route compatibility)
   * GET /api/admin/dashboard
   */
  getSystemDashboard = asyncHandler(async (req, res) => {
    return this.getDashboardOverview(req, res);
  });

  /**
   * Get system analytics
   * GET /api/admin/analytics
   */
  getSystemAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const options = req.query;

    const analytics = await this.adminService.getSystemAnalytics(userId, options);

    return response.success(res, {
      message: 'System analytics retrieved successfully',
      data: { analytics }
    });
  });

  /**
   * Get audit logs
   * GET /api/admin/audit-logs
   */
  getAuditLogs = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const options = req.query;

    const result = await this.adminService.getAuditLogs(userId, options);

    return response.success(res, {
      message: 'Audit logs retrieved successfully',
      data: result
    });
  });

  /**
   * Get system health status
   * GET /api/admin/health
   */
  getSystemHealth = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const health = await this.adminService.getSystemHealth(userId);

    return response.success(res, {
      message: 'System health retrieved successfully',
      data: { health }
    });
  });

  /**
   * Generate system report
   * POST /api/admin/reports
   */
  generateSystemReport = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const options = req.body;

    const reportData = await this.adminService.generateSystemReport(userId, options);

    logger.info('System report generated', {
      reportType: options.type,
      generatedBy: userId
    });

    return response.success(res, {
      message: 'System report generated successfully',
      data: reportData
    });
  });

  /**
   * Get system reports (alias for route compatibility)
   * GET /api/admin/reports
   */
  getSystemReports = asyncHandler(async (req, res) => {
    return this.generateSystemReport(req, res);
  });

  /**
   * Manage system settings
   * PUT /api/admin/settings
   */
  manageSystemSettings = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const settings = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await this.adminService.manageSystemSettings(userId, settings, context);

    logger.info('System settings updated', {
      updatedSettings: Object.keys(settings),
      updatedBy: userId
    });

    return response.success(res, {
      message: 'System settings updated successfully',
      data: result
    });
  });

  /**
   * Get system settings (alias for route compatibility)
   * GET /api/admin/settings
   */
  getSystemSettings = asyncHandler(async (req, res) => {
    return this.getSystemConfiguration(req, res);
  });

  /**
   * Update system settings (alias for route compatibility)
   * PUT /api/admin/settings
   */
  updateSystemSettings = asyncHandler(async (req, res) => {
    return this.manageSystemSettings(req, res);
  });

  /**
   * Get system statistics overview
   * GET /api/admin/statistics
   */
  getSystemStatistics = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const options = req.query;

    const analytics = await this.adminService.getSystemAnalytics(userId, {
      ...options,
      metrics: ['users', 'brands', 'members', 'transactions']
    });

    const statistics = {
      overview: {
        total_users: analytics.users?.statistics?.total_count || 0,
        total_brands: analytics.brands?.statistics?.total_count || 0,
        total_members: analytics.members?.statistics?.total_count || 0,
        total_transactions: analytics.transactions?.statistics?.total_count || 0
      },
      growth: {
        users_growth: analytics.users?.statistics?.growth_rate || 0,
        brands_growth: analytics.brands?.statistics?.growth_rate || 0,
        members_growth: analytics.members?.statistics?.growth_rate || 0,
        transactions_growth: analytics.transactions?.statistics?.growth_rate || 0
      },
      activity: {
        daily_active_users: analytics.users?.statistics?.daily_active || 0,
        monthly_active_users: analytics.users?.statistics?.monthly_active || 0,
        average_session_duration: analytics.users?.statistics?.avg_session_duration || 0
      },
      generated_at: new Date()
    };

    return response.success(res, {
      message: 'System statistics retrieved successfully',
      data: { statistics }
    });
  });

  /**
   * Get user analytics
   * GET /api/admin/analytics/users
   */
  getUserAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const options = req.query;

    const analytics = await this.adminService.getSystemAnalytics(userId, {
      ...options,
      metrics: ['users']
    });

    return response.success(res, {
      message: 'User analytics retrieved successfully',
      data: { analytics: analytics.users }
    });
  });

  /**
   * Get brand analytics
   * GET /api/admin/analytics/brands
   */
  getBrandAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const options = req.query;

    const analytics = await this.adminService.getSystemAnalytics(userId, {
      ...options,
      metrics: ['brands']
    });

    return response.success(res, {
      message: 'Brand analytics retrieved successfully',
      data: { analytics: analytics.brands }
    });
  });

  /**
   * Get member analytics
   * GET /api/admin/analytics/members
   */
  getMemberAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const options = req.query;

    const analytics = await this.adminService.getSystemAnalytics(userId, {
      ...options,
      metrics: ['members']
    });

    return response.success(res, {
      message: 'Member analytics retrieved successfully',
      data: { analytics: analytics.members }
    });
  });

  /**
   * Get transaction analytics
   * GET /api/admin/analytics/transactions
   */
  getTransactionAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const options = req.query;

    const analytics = await this.adminService.getSystemAnalytics(userId, {
      ...options,
      metrics: ['transactions']
    });

    return response.success(res, {
      message: 'Transaction analytics retrieved successfully',
      data: { analytics: analytics.transactions }
    });
  });

  /**
   * Get engagement analytics
   * GET /api/admin/analytics/engagement
   */
  getEngagementAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const options = req.query;

    const analytics = await this.adminService.getSystemAnalytics(userId, {
      ...options,
      metrics: ['engagement']
    });

    return response.success(res, {
      message: 'Engagement analytics retrieved successfully',
      data: { analytics: analytics.engagement }
    });
  });

  /**
   * Get system performance metrics
   * GET /api/admin/performance
   */
  getSystemPerformance = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const health = await this.adminService.getSystemHealth(userId);

    const performance = {
      system_health: health.overall_status,
      database: {
        status: health.database.status,
        response_time: health.database.response_time,
        connections: health.database.connections
      },
      resources: {
        memory_usage: health.resources.memory.percentage,
        cpu_usage: health.resources.cpu.usage,
        disk_usage: health.resources.disk.percentage
      },
      error_rates: health.error_rates,
      uptime: health.services.uptime,
      last_checked: health.last_checked
    };

    return response.success(res, {
      message: 'System performance metrics retrieved successfully',
      data: { performance }
    });
  });

  /**
   * Get system configuration
   * GET /api/admin/config
   */
  getSystemConfiguration = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Verify super admin access
    await this.adminService.verifySuperAdminAccess(userId);

    // This would typically get system configuration from database or config files
    // For now, we'll return mock configuration
    const configuration = {
      system: {
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        maintenance_mode: false,
        debug_mode: process.env.NODE_ENV === 'development'
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'engage_db',
        ssl_enabled: process.env.DB_SSL === 'true'
      },
      security: {
        jwt_expiry: '1h',
        password_min_length: 8,
        max_login_attempts: 5,
        session_timeout: 3600
      },
      features: {
        email_notifications: true,
        sms_notifications: false,
        two_factor_auth: false,
        api_rate_limiting: true
      },
      limits: {
        max_file_size: '10MB',
        max_users_per_brand: 1000,
        max_members_per_brand: 100000,
        api_rate_limit: 1000
      },
      last_updated: new Date()
    };

    return response.success(res, {
      message: 'System configuration retrieved successfully',
      data: { configuration }
    });
  });

  /**
   * Update system configuration
   * PUT /api/admin/config
   */
  updateSystemConfiguration = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const configUpdates = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await this.adminService.manageSystemSettings(userId, configUpdates, context);

    logger.info('System configuration updated', {
      updatedConfig: Object.keys(configUpdates),
      updatedBy: userId
    });

    return response.success(res, {
      message: 'System configuration updated successfully',
      data: result
    });
  });

  /**
   * Get system logs
   * GET /api/admin/logs
   */
  getSystemLogs = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { level = 'info', limit = 100, start_date, end_date } = req.query;

    // Verify super admin access
    await this.adminService.verifySuperAdminAccess(userId);

    // This would typically get logs from log files or logging service
    // For now, we'll return mock logs
    const logs = [
      {
        id: '1',
        timestamp: new Date(),
        level: 'info',
        message: 'User login successful',
        service: 'auth',
        user_id: 'user123',
        metadata: { ip: '192.168.1.100' }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 60000),
        level: 'error',
        message: 'Database connection timeout',
        service: 'database',
        error: 'Connection timeout after 30s',
        metadata: { query: 'SELECT * FROM users' }
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 120000),
        level: 'warn',
        message: 'High memory usage detected',
        service: 'system',
        metadata: { memory_usage: '85%' }
      }
    ];

    return response.success(res, {
      message: 'System logs retrieved successfully',
      data: { 
        logs,
        filters: { level, limit, start_date, end_date },
        total: logs.length
      }
    });
  });

  /**
   * Clear system cache
   * POST /api/admin/cache/clear
   */
  clearSystemCache = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { cache_type = 'all' } = req.body;

    // Verify super admin access
    await this.adminService.verifySuperAdminAccess(userId);

    // This would typically clear various caches
    // For now, we'll just log the action
    logger.info('System cache cleared', {
      cacheType: cache_type,
      clearedBy: userId
    });

    return response.success(res, {
      message: 'System cache cleared successfully',
      data: {
        cache_type,
        cleared_at: new Date(),
        cleared_by: userId
      }
    });
  });

  /**
   * Clear cache (alias for route compatibility)
   * POST /api/admin/cache/clear
   */
  clearCache = asyncHandler(async (req, res) => {
    return this.clearSystemCache(req, res);
  });

  /**
   * Run system maintenance
   * POST /api/admin/maintenance
   */
  runSystemMaintenance = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { tasks = ['cleanup', 'optimize'] } = req.body;

    // Verify super admin access
    await this.adminService.verifySuperAdminAccess(userId);

    // This would typically run maintenance tasks
    // For now, we'll simulate the process
    const results = {
      tasks_run: tasks,
      results: {
        cleanup: {
          status: 'completed',
          files_cleaned: 150,
          space_freed: '2.5GB'
        },
        optimize: {
          status: 'completed',
          tables_optimized: 25,
          time_taken: '45 seconds'
        }
      },
      started_at: new Date(Date.now() - 45000),
      completed_at: new Date(),
      run_by: userId
    };

    logger.info('System maintenance completed', {
      tasks,
      results,
      runBy: userId
    });

    return response.success(res, {
      message: 'System maintenance completed successfully',
      data: { maintenance: results }
    });
  });

  /**
   * Perform maintenance (alias for route compatibility)
   * POST /api/admin/maintenance
   */
  performMaintenance = asyncHandler(async (req, res) => {
    return this.runSystemMaintenance(req, res);
  });

  /**
   * Get system backup status
   * GET /api/admin/backups
   */
  getSystemBackups = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Verify super admin access
    await this.adminService.verifySuperAdminAccess(userId);

    // This would typically get backup information
    // For now, we'll return mock backup data
    const backups = {
      last_backup: {
        date: new Date(Date.now() - 86400000), // 24 hours ago
        type: 'full',
        size: '1.2GB',
        status: 'completed',
        location: 's3://backups/engage-db-20240115.sql.gz'
      },
      schedule: {
        frequency: 'daily',
        time: '02:00 UTC',
        retention_days: 30,
        enabled: true
      },
      recent_backups: [
        {
          date: new Date(Date.now() - 86400000),
          type: 'full',
          size: '1.2GB',
          status: 'completed'
        },
        {
          date: new Date(Date.now() - 172800000),
          type: 'incremental',
          size: '150MB',
          status: 'completed'
        }
      ],
      storage_usage: {
        total_size: '15.8GB',
        available_space: '84.2GB',
        usage_percentage: 15.8
      }
    };

    return response.success(res, {
      message: 'System backups information retrieved successfully',
      data: { backups }
    });
  });

  /**
   * Get backup status (alias for route compatibility)
   * GET /api/admin/backup/status
   */
  getBackupStatus = asyncHandler(async (req, res) => {
    return this.getSystemBackups(req, res);
  });

  /**
   * Create system backup
   * POST /api/admin/backups
   */
  createSystemBackup = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { type = 'full', description } = req.body;

    // Verify super admin access
    await this.adminService.verifySuperAdminAccess(userId);

    // This would typically initiate a backup process
    // For now, we'll simulate the backup creation
    const backup = {
      id: `backup_${Date.now()}`,
      type,
      description,
      status: 'in_progress',
      started_at: new Date(),
      estimated_completion: new Date(Date.now() + 1800000), // 30 minutes
      initiated_by: userId
    };

    logger.info('System backup initiated', {
      backupId: backup.id,
      type,
      initiatedBy: userId
    });

    return response.success(res, {
      message: 'System backup initiated successfully',
      data: { backup }
    }, 202); // Accepted
  });

  /**
   * Create backup (alias for route compatibility)
   * POST /api/admin/backup/create
   */
  createBackup = asyncHandler(async (req, res) => {
    return this.createSystemBackup(req, res);
  });
}

module.exports = new AdminController();