/**
 * Authentication Middleware
 * Handles JWT token validation and user authentication
 */

const { jwt, response, logger, constants } = require('../utils');
const { UserRepository } = require('../repositories');
const { HTTP_STATUS, ERROR_CODES, USER_ROLES } = constants;

const userRepository = new UserRepository();

/**
 * Authenticate JWT token
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    const token = jwt.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      logger.security('Authentication failed - No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return response.unauthorized(res, 'Access token is required', ERROR_CODES.TOKEN_INVALID);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verifyAccessToken(token);
    } catch (error) {
      logger.security('Authentication failed - Invalid token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        error: error.message
      });
      
      return response.unauthorized(res, 'Invalid or expired token', ERROR_CODES.TOKEN_INVALID);
    }

    // Get user from database
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      logger.security('Authentication failed - User not found', {
        userId: decoded.userId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return response.unauthorized(res, 'User not found', ERROR_CODES.UNAUTHORIZED_ACCESS);
    }

    // Check if user is active
    if (user.status !== 'active') {
      logger.security('Authentication failed - User inactive', {
        userId: user.id,
        status: user.status,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return response.unauthorized(res, 'User account is not active', ERROR_CODES.UNAUTHORIZED_ACCESS);
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    return response.unauthorized(res, 'Authentication failed', ERROR_CODES.TOKEN_INVALID);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = jwt.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return next();
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verifyAccessToken(token);
    } catch (error) {
      return next();
    }

    // Get user from database
    const user = await userRepository.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return next();
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    logger.error('Optional authentication middleware error', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });
    
    // Continue without authentication
    next();
  }
};

/**
 * Require specific role
 * @param {string|array} roles - Required role(s)
 * @returns {function} - Middleware function
 */
const requireRole = (roles) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      logger.logSecurity('Role check failed - No authenticated user', {
        requiredRoles,
        ip: req.ip,
        path: req.path
      });
      
      return response.unauthorized(res, 'Authentication required', ERROR_CODES.UNAUTHORIZED_ACCESS);
    }

    if (!requiredRoles.includes(req.user.role)) {
      logger.security('Role check failed - Insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles,
        ip: req.ip,
        path: req.path
      });
      
      return response.forbidden(res, 'Insufficient permissions', ERROR_CODES.UNAUTHORIZED_ACCESS);
    }

    next();
  };
};

/**
 * Require minimum role level
 * @param {string} minimumRole - Minimum required role
 * @returns {function} - Middleware function
 */
const requireMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return response.unauthorized(res, 'Authentication required', ERROR_CODES.UNAUTHORIZED_ACCESS);
    }

    const { ROLE_HIERARCHY } = constants;
    const userRoleLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const minimumRoleLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userRoleLevel < minimumRoleLevel) {
      logger.security('Minimum role check failed', {
        userId: req.user.id,
        userRole: req.user.role,
        userRoleLevel,
        minimumRole,
        minimumRoleLevel,
        ip: req.ip,
        path: req.path
      });
      
      return response.forbidden(res, 'Insufficient permissions', ERROR_CODES.UNAUTHORIZED_ACCESS);
    }

    next();
  };
};

/**
 * Require specific permission
 * @param {string|array} permissions - Required permission(s)
 * @returns {function} - Middleware function
 */
const requirePermission = (permissions) => {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return response.unauthorized(res, 'Authentication required', ERROR_CODES.UNAUTHORIZED_ACCESS);
      }

      // Get user permissions
      const userPermissions = await userRepository.getUserPermissions(req.user.id);
      
      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        logger.security('Permission check failed', {
          userId: req.user.id,
          userPermissions,
          requiredPermissions,
          ip: req.ip,
          path: req.path
        });
        
        return response.forbidden(res, 'Insufficient permissions', ERROR_CODES.UNAUTHORIZED_ACCESS);
      }

      next();
    } catch (error) {
      logger.error('Permission check middleware error', {
        error: error.message,
        userId: req.user?.id,
        requiredPermissions,
        ip: req.ip,
        path: req.path
      });
      
      return response.serverError(res, 'Permission check failed');
    }
  };
};

/**
 * Require brand access (user must belong to the brand)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const requireBrandAccess = (req, res, next) => {
  if (!req.user) {
    return response.unauthorized(res, 'Authentication required', ERROR_CODES.UNAUTHORIZED_ACCESS);
  }

  if (!req.brand) {
    return response.badRequest(res, 'Brand context required');
  }

  // Super admin can access any brand
  if (req.user.role === USER_ROLES.SUPER_ADMIN) {
    return next();
  }

  // Check if user belongs to the brand
  if (req.user.brand_id !== req.brand.id) {
    logger.security('Brand access denied', {
      userId: req.user.id,
      userBrandId: req.user.brand_id,
      requestedBrandId: req.brand.id,
      ip: req.ip,
      path: req.path
    });
    
    return response.forbidden(res, 'Access denied to this brand', ERROR_CODES.UNAUTHORIZED_ACCESS);
  }

  next();
};

/**
 * Require self or admin access (user can only access their own data unless admin)
 * @param {string} userIdParam - Parameter name containing user ID
 * @returns {function} - Middleware function
 */
const requireSelfOrAdmin = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return response.unauthorized(res, 'Authentication required', ERROR_CODES.UNAUTHORIZED_ACCESS);
    }

    const targetUserId = req.params[userIdParam];
    
    // Super admin can access any user
    if (req.user.role === USER_ROLES.SUPER_ADMIN) {
      return next();
    }

    // Brand admin can access users in their brand
    if (req.user.role === USER_ROLES.BRAND_ADMIN && req.user.brand_id) {
      return next();
    }

    // User can only access their own data
    if (req.user.id !== targetUserId) {
      logger.security('Self or admin access denied', {
        userId: req.user.id,
        targetUserId,
        userRole: req.user.role,
        ip: req.ip,
        path: req.path
      });
      
      return response.forbidden(res, 'Access denied', ERROR_CODES.UNAUTHORIZED_ACCESS);
    }

    next();
  };
};

/**
 * Rate limiting for authentication attempts
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const authRateLimit = (req, res, next) => {
  // This would typically use Redis or in-memory store
  // For now, we'll just log the attempt
  logger.security('Authentication attempt', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    email: req.body?.email
  });
  
  next();
};

/**
 * Validate API key for external integrations
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return response.unauthorized(res, 'API key is required', ERROR_CODES.UNAUTHORIZED_ACCESS);
    }

    // In a real implementation, you would validate the API key against a database
    // For now, we'll just check if it's a valid format
    if (apiKey.length < 32) {
      logger.security('Invalid API key format', {
        apiKey: apiKey.substring(0, 8) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return response.unauthorized(res, 'Invalid API key', ERROR_CODES.UNAUTHORIZED_ACCESS);
    }

    // Attach API key info to request
    req.apiKey = apiKey;
    
    next();
  } catch (error) {
    logger.error('API key validation error', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });
    
    return response.unauthorized(res, 'API key validation failed', ERROR_CODES.UNAUTHORIZED_ACCESS);
  }
};

/**
 * Authenticate member token (for member portal)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const authenticateMember = async (req, res, next) => {
  try {
    const token = jwt.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      logger.security('Member authentication failed - No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return response.unauthorized(res, 'Access token is required', ERROR_CODES.TOKEN_INVALID);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verifyAccessToken(token);
    } catch (error) {
      logger.security('Member authentication failed - Invalid token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        error: error.message
      });
      
      return response.unauthorized(res, 'Invalid or expired token', ERROR_CODES.TOKEN_INVALID);
    }

    // For member authentication, we expect the token to contain member information
    // This could be either a user token with member role or a direct member token
    if (decoded.userId) {
      // User-based authentication
      const user = await userRepository.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        logger.security('Member authentication failed - User not found or inactive', {
          userId: decoded.userId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        return response.unauthorized(res, 'User not found or inactive', ERROR_CODES.UNAUTHORIZED_ACCESS);
      }

      // Check if user has member role or is associated with a member
      if (user.role !== USER_ROLES.MEMBER && !user.member_id) {
        logger.security('Member authentication failed - User is not a member', {
          userId: user.id,
          userRole: user.role,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        return response.forbidden(res, 'Access denied - Member access required', ERROR_CODES.UNAUTHORIZED_ACCESS);
      }

      // Attach user and member info to request
      req.user = {
        ...user,
        member_id: user.member_id || user.id, // Use member_id if available, otherwise use user id
        brand_id: user.brand_id
      };
    } else if (decoded.memberId) {
      // Direct member token authentication
      // This would be used if members have their own authentication system
      req.user = {
        member_id: decoded.memberId,
        brand_id: decoded.brandId,
        role: USER_ROLES.MEMBER
      };
    } else {
      logger.security('Member authentication failed - Invalid token structure', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      return response.unauthorized(res, 'Invalid token structure', ERROR_CODES.TOKEN_INVALID);
    }

    req.token = token;
    next();
  } catch (error) {
    logger.error('Member authentication middleware error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    return response.unauthorized(res, 'Member authentication failed', ERROR_CODES.TOKEN_INVALID);
  }
};

module.exports = {
  authenticate,
  authenticateMember,
  optionalAuth,
  requireRole,
  requireMinimumRole,
  requirePermission,
  requireBrandAccess,
  requireSelfOrAdmin,
  authRateLimit,
  validateApiKey
};