/**
 * Admin Validators
 * Joi schemas for admin-related requests
 */

const Joi = require('joi');

/**
 * Get system analytics validation schema
 */
const getSystemAnalyticsSchema = {
  query: Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    metrics: Joi.array().items(Joi.string()).optional()
  })
};

/**
 * Get audit logs validation schema
 */
const getAuditLogsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    action_type: Joi.string().optional(),
    user_id: Joi.string().uuid().optional(),
    resource_type: Joi.string().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    sort_by: Joi.string().valid('created_at', 'action_type', 'user_id').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Get system reports validation schema
 */
const getSystemReportsSchema = {
  query: Joi.object({
    report_type: Joi.string().valid('users', 'brands', 'members', 'transactions', 'engagement').required(),
    period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    format: Joi.string().valid('json', 'csv', 'xlsx').default('json'),
    brand_id: Joi.string().uuid().optional()
  })
};

/**
 * Update system settings validation schema
 */
const updateSystemSettingsSchema = {
  body: Joi.object({
    maintenance_mode: Joi.boolean().optional(),
    registration_enabled: Joi.boolean().optional(),
    email_notifications: Joi.boolean().optional(),
    sms_notifications: Joi.boolean().optional(),
    max_brands_per_user: Joi.number().integer().min(1).optional(),
    session_timeout: Joi.number().integer().min(300).max(86400).optional(), // 5 minutes to 24 hours
    rate_limit_requests: Joi.number().integer().min(10).max(10000).optional(),
    rate_limit_window: Joi.number().integer().min(60).max(3600).optional(), // 1 minute to 1 hour
    backup_retention_days: Joi.number().integer().min(1).max(365).optional(),
    log_retention_days: Joi.number().integer().min(1).max(365).optional()
  })
};

/**
 * Get system statistics validation schema
 */
const getSystemStatisticsSchema = {
  query: Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
    include_trends: Joi.boolean().default(true),
    compare_previous: Joi.boolean().default(false)
  })
};

/**
 * Get user analytics validation schema
 */
const getUserAnalyticsSchema = {
  query: Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    group_by: Joi.string().valid('day', 'week', 'month', 'role', 'brand').default('day'),
    brand_id: Joi.string().uuid().optional()
  })
};

/**
 * Get brand analytics validation schema
 */
const getBrandAnalyticsSchema = {
  query: Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    group_by: Joi.string().valid('day', 'week', 'month', 'status').default('day'),
    include_inactive: Joi.boolean().default(false)
  })
};

/**
 * Get member analytics validation schema
 */
const getMemberAnalyticsSchema = {
  query: Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    group_by: Joi.string().valid('day', 'week', 'month', 'tier', 'brand').default('day'),
    brand_id: Joi.string().uuid().optional(),
    tier_id: Joi.string().uuid().optional()
  })
};

/**
 * Get transaction analytics validation schema
 */
const getTransactionAnalyticsSchema = {
  query: Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    group_by: Joi.string().valid('day', 'week', 'month', 'type', 'brand').default('day'),
    transaction_type: Joi.string().valid('earn', 'redeem', 'bonus', 'penalty').optional(),
    brand_id: Joi.string().uuid().optional()
  })
};

/**
 * Get engagement analytics validation schema
 */
const getEngagementAnalyticsSchema = {
  query: Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    group_by: Joi.string().valid('day', 'week', 'month', 'activity_type', 'brand').default('day'),
    activity_type: Joi.string().valid('wheel_spin', 'mission_complete', 'login', 'transaction').optional(),
    brand_id: Joi.string().uuid().optional()
  })
};

/**
 * Get system performance validation schema
 */
const getSystemPerformanceSchema = {
  query: Joi.object({
    period: Joi.string().valid('hour', 'day', 'week').default('day'),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    metrics: Joi.array().items(
      Joi.string().valid('cpu', 'memory', 'disk', 'network', 'database', 'response_time')
    ).optional()
  })
};

/**
 * Get system configuration validation schema
 */
const getSystemConfigurationSchema = {
  query: Joi.object({
    section: Joi.string().valid('database', 'cache', 'email', 'storage', 'security').optional()
  })
};

/**
 * Update system configuration validation schema
 */
const updateSystemConfigurationSchema = {
  body: Joi.object({
    section: Joi.string().valid('database', 'cache', 'email', 'storage', 'security').required(),
    configuration: Joi.object().required()
  })
};

/**
 * Backup system validation schema
 */
const backupSystemSchema = {
  body: Joi.object({
    backup_type: Joi.string().valid('full', 'incremental', 'database_only').default('full'),
    include_uploads: Joi.boolean().default(true),
    compress: Joi.boolean().default(true)
  })
};

/**
 * Restore system validation schema
 */
const restoreSystemSchema = {
  body: Joi.object({
    backup_id: Joi.string().required(),
    restore_type: Joi.string().valid('full', 'database_only', 'uploads_only').default('full'),
    confirm: Joi.boolean().valid(true).required()
  })
};

/**
 * Maintenance mode validation schema
 */
const setMaintenanceModeSchema = {
  body: Joi.object({
    enabled: Joi.boolean().required(),
    message: Joi.string().max(500).optional().allow(''),
    estimated_duration: Joi.number().integer().min(0).optional(), // in minutes
    allowed_ips: Joi.array().items(Joi.string().ip()).optional()
  })
};

module.exports = {
  getSystemAnalyticsSchema,
  getAuditLogsSchema,
  getSystemReportsSchema,
  updateSystemSettingsSchema,
  getSystemStatisticsSchema,
  getUserAnalyticsSchema,
  getBrandAnalyticsSchema,
  getMemberAnalyticsSchema,
  getTransactionAnalyticsSchema,
  getEngagementAnalyticsSchema,
  getSystemPerformanceSchema,
  getSystemConfigurationSchema,
  updateSystemConfigurationSchema,
  backupSystemSchema,
  restoreSystemSchema,
  setMaintenanceModeSchema
};