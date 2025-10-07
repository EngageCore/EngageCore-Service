/**
 * Rate Limiting Middleware
 * Protects against abuse and excessive requests
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { response, logger, constants } = require('../utils');
const { RATE_LIMITS, ERROR_CODES } = constants;

// Simple IP key generator function for IPv6 compatibility
const ipKeyGenerator = (req) => {
  // Handle IPv6 addresses properly
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1';
  return ip.replace(/^::ffff:/, ''); // Remove IPv4-mapped IPv6 prefix
};

/**
 * Create rate limiter with custom options
 * @param {object} options - Rate limiting options
 * @returns {function} - Rate limiting middleware
 */
const createRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      code: ERROR_CODES.TOO_MANY_REQUESTS
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      logger.logSecurity('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        limit: options.max || 100,
        windowMs: options.windowMs || 15 * 60 * 1000
      });
      
      return response.tooManyRequests(res, 
        options.message?.message || 'Too many requests from this IP, please try again later.',
        options.message?.code || ERROR_CODES.TOO_MANY_REQUESTS
      );
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/ping';
    },
    keyGenerator: (req) => {
      // Use ipKeyGenerator helper for IPv6 compatibility
      return ipKeyGenerator(req);
    },
    ...options
  };

  return rateLimit(defaultOptions);
};

/**
 * General API rate limiting
 */
const generalRateLimit = createRateLimit({
  windowMs: RATE_LIMITS.API_GENERAL.windowMs,
  max: RATE_LIMITS.API_GENERAL.max,
  message: {
    error: 'Too many API requests',
    message: 'Too many API requests from this IP, please try again later.',
    code: ERROR_CODES.TOO_MANY_REQUESTS
  }
});

/**
 * Strict rate limiting for authentication endpoints
 */
const authRateLimit = createRateLimit({
  windowMs: RATE_LIMITS.LOGIN_ATTEMPTS.windowMs,
  max: RATE_LIMITS.LOGIN_ATTEMPTS.max,
  message: {
    error: 'Too many login attempts',
    message: 'Too many login attempts from this IP, please try again later.',
    code: ERROR_CODES.TOO_MANY_REQUESTS
  },
  keyGenerator: (req) => {
    // Use combination of IP and email for more granular limiting
    const email = req.body?.email || '';
    return `${ipKeyGenerator(req)}:${email}`;
  },
  handler: (req, res) => {
    logger.logSecurity('Authentication rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });
    
    return response.tooManyRequests(res, 
      'Too many login attempts. Please try again later.',
      ERROR_CODES.TOO_MANY_REQUESTS
    );
  }
});

/**
 * Rate limiting for password reset requests
 */
const passwordResetRateLimit = createRateLimit({
  windowMs: RATE_LIMITS.PASSWORD_RESET.windowMs,
  max: RATE_LIMITS.PASSWORD_RESET.max,
  message: {
    error: 'Too many password reset requests',
    message: 'Too many password reset requests from this IP, please try again later.',
    code: ERROR_CODES.TOO_MANY_REQUESTS
  },
  keyGenerator: (req) => {
    // Use combination of IP and email
    const email = req.body?.email || '';
    return `${ipKeyGenerator(req)}:${email}`;
  }
});

/**
 * Rate limiting for wheel spins
 */
const wheelSpinRateLimit = createRateLimit({
  windowMs: RATE_LIMITS.WHEEL_SPIN.windowMs,
  max: RATE_LIMITS.WHEEL_SPIN.max,
  message: {
    error: 'Wheel spin rate limit exceeded',
    message: 'Please wait before spinning the wheel again.',
    code: ERROR_CODES.TOO_MANY_REQUESTS
  },
  keyGenerator: (req) => {
    // Use member ID if available, otherwise IP with IPv6 support
    return req.user?.id || ipKeyGenerator(req);
  },
  handler: (req, res) => {
    logger.logSecurity('Wheel spin rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      memberId: req.body?.member_id,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    return response.tooManyRequests(res, 
      'Please wait before spinning the wheel again.',
      ERROR_CODES.TOO_MANY_REQUESTS
    );
  }
});

/**
 * Create user-specific rate limiter
 * @param {object} options - Rate limiting options
 * @returns {function} - Rate limiting middleware
 */
const createUserRateLimit = (options = {}) => {
  return createRateLimit({
    ...options,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP with IPv6 support
      return req.user?.id || ipKeyGenerator(req);
    }
  });
};

/**
 * Create brand-specific rate limiter
 * @param {object} options - Rate limiting options
 * @returns {function} - Rate limiting middleware
 */
const createBrandRateLimit = (options = {}) => {
  return createRateLimit({
    ...options,
    keyGenerator: (req) => {
      // Use combination of brand and user/IP with IPv6 support
      const brandId = req.brand?.id || 'unknown';
      const identifier = req.user?.id || ipKeyGenerator(req);
      return `${brandId}:${identifier}`;
    }
  });
};

/**
 * Slow down middleware - progressively delay responses
 * @param {object} options - Slow down options
 * @returns {function} - Slow down middleware
 */
const createSlowDown = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per windowMs without delay
    delayMs: () => 500, // Function that returns 500ms delay per request after delayAfter
    maxDelayMs: 10000, // Maximum delay of 10 seconds
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => ipKeyGenerator(req),
    validate: {
      delayMs: false // Disable delayMs validation warnings
    },
    ...options
  };

  return slowDown(defaultOptions);
};

/**
 * General slow down for API endpoints
 */
const generalSlowDown = createSlowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per 15 minutes without delay
  delayMs: () => 100, // Function that returns 100ms delay per request after delayAfter
  maxDelayMs: 5000 // Maximum delay of 5 seconds
});

/**
 * Aggressive slow down for sensitive endpoints
 */
const sensitiveSlowDown = createSlowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // Allow only 10 requests per 15 minutes without delay
  delayMs: () => 1000, // Function that returns 1 second delay per request after delayAfter
  maxDelayMs: 30000 // Maximum delay of 30 seconds
});

/**
 * Dynamic rate limiting based on user role
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const dynamicRateLimit = (req, res, next) => {
  const { USER_ROLES } = constants;
  
  // Different limits based on user role
  let maxRequests = 100; // Default for unauthenticated users
  
  if (req.user) {
    switch (req.user.role) {
      case USER_ROLES.SUPER_ADMIN:
        maxRequests = 1000;
        break;
      case USER_ROLES.BRAND_ADMIN:
        maxRequests = 500;
        break;
      case USER_ROLES.BRAND_MANAGER:
        maxRequests = 300;
        break;
      case USER_ROLES.BRAND_USER:
        maxRequests = 200;
        break;
      case USER_ROLES.MEMBER:
        maxRequests = 150;
        break;
      default:
        maxRequests = 100;
    }
  }
  
  // Create dynamic rate limiter
  const dynamicLimiter = createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: maxRequests,
    keyGenerator: (req) => {
      return req.user?.id || ipKeyGenerator(req);
    },
    message: {
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${maxRequests} per 15 minutes.`,
      code: ERROR_CODES.TOO_MANY_REQUESTS
    }
  });
  
  return dynamicLimiter(req, res, next);
};

/**
 * Skip rate limiting for certain conditions
 * @param {function} condition - Function that returns true to skip rate limiting
 * @param {function} rateLimiter - Rate limiting middleware to conditionally apply
 * @returns {function} - Conditional rate limiting middleware
 */
const conditionalRateLimit = (condition, rateLimiter) => {
  return (req, res, next) => {
    if (condition(req)) {
      return next();
    }
    return rateLimiter(req, res, next);
  };
};

/**
 * Rate limiting for file uploads
 */
const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads. Please try again later.',
    code: ERROR_CODES.TOO_MANY_REQUESTS
  },
  keyGenerator: (req) => {
    return req.user?.id || ipKeyGenerator(req);
  }
});

/**
 * Rate limiting for API key requests
 */
const apiKeyRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute for API keys
  message: {
    error: 'API rate limit exceeded',
    message: 'API rate limit exceeded. Please check your usage.',
    code: ERROR_CODES.TOO_MANY_REQUESTS
  },
  keyGenerator: (req) => {
    return req.apiKey || ipKeyGenerator(req);
  }
});

/**
 * Log rate limit events
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const logRateLimit = (req, res, next) => {
  // Add rate limit headers to response for monitoring
  const originalSend = res.send;
  res.send = function(data) {
    // Log if rate limit headers are present
    const remaining = res.get('RateLimit-Remaining');
    const limit = res.get('RateLimit-Limit');
    
    if (remaining !== undefined && limit !== undefined) {
      const usage = ((limit - remaining) / limit) * 100;
      
      if (usage > 80) { // Log when usage is above 80%
        logger.logSecurity('High rate limit usage', {
          ip: req.ip,
          userId: req.user?.id,
          path: req.path,
          method: req.method,
          remaining: parseInt(remaining),
          limit: parseInt(limit),
          usage: Math.round(usage)
        });
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  createRateLimit,
  generalRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  wheelSpinRateLimit,
  createUserRateLimit,
  createBrandRateLimit,
  createSlowDown,
  generalSlowDown,
  sensitiveSlowDown,
  dynamicRateLimit,
  conditionalRateLimit,
  uploadRateLimit,
  apiKeyRateLimit,
  logRateLimit
};