/**
 * Admin Routes
 * Handles administrative API endpoints for system management
 */

const express = require('express');
const { AdminController } = require('../controllers');
const { auth, validation, rateLimit } = require('../middleware');
const { adminValidators } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get system dashboard overview
 * @access  Private (Super Admin)
 */
router.get('/dashboard',
  auth.authenticate,
  auth.authorize(['super_admin']),
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
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getSystemAnalyticsSchema, 'query'),
  AdminController.getSystemAnalytics
);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get system audit logs
 * @access  Private (Super Admin)
 */
router.get('/audit-logs',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getAuditLogsSchema, 'query'),
  AdminController.getAuditLogs
);

/**
 * @route   GET /api/admin/health
 * @desc    Get system health status
 * @access  Private (Super Admin)
 */
router.get('/health',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  AdminController.getSystemHealth
);

/**
 * @route   GET /api/admin/reports
 * @desc    Get system reports
 * @access  Private (Super Admin)
 */
router.get('/reports',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getSystemReportsSchema, 'query'),
  AdminController.getSystemReports
);

/**
 * @route   GET /api/admin/settings
 * @desc    Get system settings
 * @access  Private (Super Admin)
 */
router.get('/settings',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  AdminController.getSystemSettings
);

/**
 * @route   PUT /api/admin/settings
 * @desc    Update system settings
 * @access  Private (Super Admin)
 */
router.put('/settings',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.updateSystemSettingsSchema),
  AdminController.updateSystemSettings
);

/**
 * @route   GET /api/admin/statistics
 * @desc    Get system statistics
 * @access  Private (Super Admin)
 */
router.get('/statistics',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getSystemStatisticsSchema, 'query'),
  AdminController.getSystemStatistics
);

/**
 * @route   GET /api/admin/users/analytics
 * @desc    Get user analytics
 * @access  Private (Super Admin)
 */
router.get('/users/analytics',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getUserAnalyticsSchema, 'query'),
  AdminController.getUserAnalytics
);

/**
 * @route   GET /api/admin/brands/analytics
 * @desc    Get brand analytics
 * @access  Private (Super Admin)
 */
router.get('/brands/analytics',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getBrandAnalyticsSchema, 'query'),
  AdminController.getBrandAnalytics
);

/**
 * @route   GET /api/admin/members/analytics
 * @desc    Get member analytics
 * @access  Private (Super Admin)
 */
router.get('/members/analytics',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getMemberAnalyticsSchema, 'query'),
  AdminController.getMemberAnalytics
);

/**
 * @route   GET /api/admin/transactions/analytics
 * @desc    Get transaction analytics
 * @access  Private (Super Admin)
 */
router.get('/transactions/analytics',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getTransactionAnalyticsSchema, 'query'),
  AdminController.getTransactionAnalytics
);

/**
 * @route   GET /api/admin/engagement/analytics
 * @desc    Get engagement analytics
 * @access  Private (Super Admin)
 */
router.get('/engagement/analytics',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getEngagementAnalyticsSchema, 'query'),
  AdminController.getEngagementAnalytics
);

/**
 * @route   GET /api/admin/performance
 * @desc    Get system performance metrics
 * @access  Private (Super Admin)
 */
router.get('/performance',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getSystemPerformanceSchema, 'query'),
  AdminController.getSystemPerformance
);

/**
 * @route   GET /api/admin/configuration
 * @desc    Get system configuration
 * @access  Private (Super Admin)
 */
router.get('/configuration',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  AdminController.getSystemConfiguration
);

/**
 * @route   PUT /api/admin/configuration
 * @desc    Update system configuration
 * @access  Private (Super Admin)
 */
router.put('/configuration',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.updateSystemConfigurationSchema),
  AdminController.updateSystemConfiguration
);

/**
 * @route   GET /api/admin/logs
 * @desc    Get system logs
 * @access  Private (Super Admin)
 */
router.get('/logs',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.getSystemLogsSchema, 'query'),
  AdminController.getSystemLogs
);

/**
 * @route   POST /api/admin/cache/clear
 * @desc    Clear system cache
 * @access  Private (Super Admin)
 */
router.post('/cache/clear',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.clearCacheSchema),
  AdminController.clearCache
);

/**
 * @route   POST /api/admin/maintenance
 * @desc    Perform system maintenance
 * @access  Private (Super Admin)
 */
router.post('/maintenance',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.performMaintenanceSchema),
  AdminController.performMaintenance
);

/**
 * @route   GET /api/admin/backup/status
 * @desc    Get backup status
 * @access  Private (Super Admin)
 */
router.get('/backup/status',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  AdminController.getBackupStatus
);

/**
 * @route   POST /api/admin/backup/create
 * @desc    Create system backup
 * @access  Private (Super Admin)
 */
router.post('/backup/create',
  auth.authenticate,
  auth.authorize(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(adminValidators.createBackupSchema),
  AdminController.createBackup
);

module.exports = router;