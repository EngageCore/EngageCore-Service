/**
 * Application Constants
 */

// User Roles
const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  BRAND_ADMIN: 'brand_admin',
  BRAND_MANAGER: 'brand_manager',
  BRAND_USER: 'brand_user',
  MEMBER: 'member'
};

// User Role Hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN]: 100,
  [USER_ROLES.BRAND_ADMIN]: 80,
  [USER_ROLES.BRAND_MANAGER]: 60,
  [USER_ROLES.BRAND_USER]: 40,
  [USER_ROLES.MEMBER]: 20
};

// Permissions
const PERMISSIONS = {
  // Brand permissions
  BRAND_CREATE: 'brand:create',
  BRAND_READ: 'brand:read',
  BRAND_UPDATE: 'brand:update',
  BRAND_DELETE: 'brand:delete',
  BRAND_MANAGE: 'brand:manage',
  
  // User permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE_ROLES: 'user:manage_roles',
  
  // Member permissions
  MEMBER_CREATE: 'member:create',
  MEMBER_READ: 'member:read',
  MEMBER_UPDATE: 'member:update',
  MEMBER_DELETE: 'member:delete',
  MEMBER_MANAGE_TIERS: 'member:manage_tiers',
  
  // Wheel permissions
  WHEEL_CREATE: 'wheel:create',
  WHEEL_READ: 'wheel:read',
  WHEEL_UPDATE: 'wheel:update',
  WHEEL_DELETE: 'wheel:delete',
  WHEEL_SPIN: 'wheel:spin',
  WHEEL_CONFIGURE: 'wheel:configure',
  
  // Mission permissions
  MISSION_CREATE: 'mission:create',
  MISSION_READ: 'mission:read',
  MISSION_UPDATE: 'mission:update',
  MISSION_DELETE: 'mission:delete',
  MISSION_COMPLETE: 'mission:complete',
  
  // Transaction permissions
  TRANSACTION_CREATE: 'transaction:create',
  TRANSACTION_READ: 'transaction:read',
  TRANSACTION_UPDATE: 'transaction:update',
  TRANSACTION_DELETE: 'transaction:delete',
  
  // Admin permissions
  ADMIN_DASHBOARD: 'admin:dashboard',
  ADMIN_ANALYTICS: 'admin:analytics',
  ADMIN_AUDIT_LOGS: 'admin:audit_logs',
  ADMIN_SYSTEM_CONFIG: 'admin:system_config'
};

// Default role permissions
const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: [
    // All permissions
    ...Object.values(PERMISSIONS)
  ],
  
  [USER_ROLES.BRAND_ADMIN]: [
    PERMISSIONS.BRAND_READ,
    PERMISSIONS.BRAND_UPDATE,
    PERMISSIONS.BRAND_MANAGE,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_MANAGE_ROLES,
    PERMISSIONS.MEMBER_CREATE,
    PERMISSIONS.MEMBER_READ,
    PERMISSIONS.MEMBER_UPDATE,
    PERMISSIONS.MEMBER_DELETE,
    PERMISSIONS.MEMBER_MANAGE_TIERS,
    PERMISSIONS.WHEEL_CREATE,
    PERMISSIONS.WHEEL_READ,
    PERMISSIONS.WHEEL_UPDATE,
    PERMISSIONS.WHEEL_DELETE,
    PERMISSIONS.WHEEL_CONFIGURE,
    PERMISSIONS.MISSION_CREATE,
    PERMISSIONS.MISSION_READ,
    PERMISSIONS.MISSION_UPDATE,
    PERMISSIONS.MISSION_DELETE,
    PERMISSIONS.TRANSACTION_READ,
    PERMISSIONS.TRANSACTION_UPDATE,
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ADMIN_ANALYTICS,
    PERMISSIONS.ADMIN_AUDIT_LOGS
  ],
  
  [USER_ROLES.BRAND_MANAGER]: [
    PERMISSIONS.BRAND_READ,
    PERMISSIONS.USER_READ,
    PERMISSIONS.MEMBER_READ,
    PERMISSIONS.MEMBER_UPDATE,
    PERMISSIONS.WHEEL_READ,
    PERMISSIONS.WHEEL_UPDATE,
    PERMISSIONS.MISSION_CREATE,
    PERMISSIONS.MISSION_READ,
    PERMISSIONS.MISSION_UPDATE,
    PERMISSIONS.TRANSACTION_READ,
    PERMISSIONS.ADMIN_DASHBOARD
  ],
  
  [USER_ROLES.BRAND_USER]: [
    PERMISSIONS.BRAND_READ,
    PERMISSIONS.USER_READ,
    PERMISSIONS.MEMBER_READ,
    PERMISSIONS.WHEEL_READ,
    PERMISSIONS.MISSION_READ,
    PERMISSIONS.TRANSACTION_READ
  ],
  
  [USER_ROLES.MEMBER]: [
    PERMISSIONS.BRAND_READ,
    PERMISSIONS.MEMBER_READ,
    PERMISSIONS.WHEEL_READ,
    PERMISSIONS.WHEEL_SPIN,
    PERMISSIONS.MISSION_READ,
    PERMISSIONS.MISSION_COMPLETE,
    PERMISSIONS.TRANSACTION_READ
  ]
};

// Transaction Types
const TRANSACTION_TYPES = {
  POINTS_EARNED: 'points_earned',
  POINTS_SPENT: 'points_spent',
  POINTS_AWARDED: 'points_awarded',
  POINTS_DEDUCTED: 'points_deducted',
  WHEEL_WIN: 'wheel_win',
  MISSION_REWARD: 'mission_reward',
  BONUS_POINTS: 'bonus_points',
  REFERRAL_BONUS: 'referral_bonus',
  TIER_UPGRADE_BONUS: 'tier_upgrade_bonus',
  ADMIN_ADJUSTMENT: 'admin_adjustment'
};

// Mission Types
const MISSION_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
  SPECIAL_EVENT: 'special_event'
};

// Mission Status
const MISSION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  DRAFT: 'draft'
};

// Wheel Item Types
const WHEEL_ITEM_TYPES = {
  POINTS: 'points',
  DISCOUNT: 'discount',
  PRODUCT: 'product',
  COUPON: 'coupon',
  CASH: 'cash',
  BONUS_SPIN: 'bonus_spin',
  TIER_UPGRADE: 'tier_upgrade',
  NOTHING: 'nothing',
  EMPTY: 'empty'
};

// Claim Status
const CLAIM_STATUS = {
  PENDING: 'pending',
  CLAIMED: 'claimed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

// Membership Tier Status
const TIER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DEPRECATED: 'deprecated'
};

// User Status
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  PENDING_VERIFICATION: 'pending_verification'
};

// Brand Status
const BRAND_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING_APPROVAL: 'pending_approval'
};

// Audit Action Types
const AUDIT_ACTIONS = {
  // User actions
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  USER_UPDATE_PROFILE: 'user_update_profile',
  USER_CHANGE_PASSWORD: 'user_change_password',
  
  // Member actions
  MEMBER_JOIN: 'member_join',
  MEMBER_TIER_UPGRADE: 'member_tier_upgrade',
  MEMBER_POINTS_EARNED: 'member_points_earned',
  MEMBER_POINTS_SPENT: 'member_points_spent',
  
  // Wheel actions
  WHEEL_SPIN: 'wheel_spin',
  WHEEL_WIN: 'wheel_win',
  WHEEL_CONFIG_UPDATE: 'wheel_config_update',
  
  // Mission actions
  MISSION_COMPLETE: 'mission_complete',
  MISSION_CLAIM_REWARD: 'mission_claim_reward',
  MISSION_CREATE: 'mission_create',
  MISSION_UPDATE: 'mission_update',
  
  // Admin actions
  ADMIN_USER_CREATE: 'admin_user_create',
  ADMIN_USER_UPDATE: 'admin_user_update',
  ADMIN_USER_DELETE: 'admin_user_delete',
  ADMIN_BRAND_UPDATE: 'admin_brand_update',
  ADMIN_POINTS_ADJUST: 'admin_points_adjust',
  
  // System actions
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_BACKUP: 'system_backup',
  SYSTEM_ERROR: 'system_error'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Validation Rules
const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  EMAIL_MAX_LENGTH: 255,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  BRAND_NAME_MIN_LENGTH: 2,
  BRAND_NAME_MAX_LENGTH: 255,
  BRAND_SLUG_MIN_LENGTH: 2,
  BRAND_SLUG_MAX_LENGTH: 100,
  MISSION_TITLE_MAX_LENGTH: 255,
  MISSION_DESCRIPTION_MAX_LENGTH: 2000,
  WHEEL_ITEM_NAME_MAX_LENGTH: 255,
  MAX_DAILY_SPINS: 10,
  MAX_POINTS_PER_TRANSACTION: 1000000,
  MAX_PROBABILITY: 1.0,
  MIN_PROBABILITY: 0.0
};

// Cache Keys
const CACHE_KEYS = {
  USER_PROFILE: (userId) => `user:profile:${userId}`,
  USER_PERMISSIONS: (userId) => `user:permissions:${userId}`,
  BRAND_CONFIG: (brandId) => `brand:config:${brandId}`,
  MEMBER_PROFILE: (memberId) => `member:profile:${memberId}`,
  WHEEL_CONFIG: (wheelId) => `wheel:config:${wheelId}`,
  WHEEL_ITEMS: (wheelId) => `wheel:items:${wheelId}`,
  MISSIONS_ACTIVE: (brandId) => `missions:active:${brandId}`,
  MEMBER_DAILY_SPINS: (memberId, date) => `member:spins:${memberId}:${date}`,
  LEADERBOARD: (brandId) => `leaderboard:${brandId}`,
  ANALYTICS: (brandId, period) => `analytics:${brandId}:${period}`
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  USER_PROFILE: 3600, // 1 hour
  USER_PERMISSIONS: 1800, // 30 minutes
  BRAND_CONFIG: 7200, // 2 hours
  MEMBER_PROFILE: 1800, // 30 minutes
  WHEEL_CONFIG: 3600, // 1 hour
  WHEEL_ITEMS: 3600, // 1 hour
  MISSIONS_ACTIVE: 1800, // 30 minutes
  MEMBER_DAILY_SPINS: 86400, // 24 hours
  LEADERBOARD: 300, // 5 minutes
  ANALYTICS: 1800 // 30 minutes
};

// Rate Limiting
const RATE_LIMITS = {
  LOGIN_ATTEMPTS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // 5 attempts per window
  },
  WHEEL_SPIN: {
    windowMs: 60 * 1000, // 1 minute
    max: 1 // 1 spin per minute
  },
  API_GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per window
  },
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3 // 3 attempts per hour
  }
};

// File Upload Limits
const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'text/csv'],
  MAX_FILES_PER_REQUEST: 5
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

// Date Formats
const DATE_FORMATS = {
  ISO_DATE: 'YYYY-MM-DD',
  ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DISPLAY_DATE: 'MMM DD, YYYY',
  DISPLAY_DATETIME: 'MMM DD, YYYY HH:mm',
  LOG_FORMAT: 'YYYY-MM-DD HH:mm:ss'
};

// Environment Types
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test'
};

// Import Error Codes from centralized enum
const { ERROR_CODES } = require('../enums/ErrorCodes');

module.exports = {
  USER_ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  TRANSACTION_TYPES,
  MISSION_TYPES,
  MISSION_STATUS,
  WHEEL_ITEM_TYPES,
  CLAIM_STATUS,
  TIER_STATUS,
  USER_STATUS,
  BRAND_STATUS,
  AUDIT_ACTIONS,
  HTTP_STATUS,
  VALIDATION_RULES,
  CACHE_KEYS,
  CACHE_TTL,
  RATE_LIMITS,
  UPLOAD_LIMITS,
  PAGINATION,
  DATE_FORMATS,
  ENVIRONMENTS,
  ERROR_CODES
};