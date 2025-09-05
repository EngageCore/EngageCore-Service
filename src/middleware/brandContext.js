/**
 * Brand Context Middleware
 * Handles brand identification and context setting
 */

const { response, logger, constants } = require('../utils');
const { BrandRepository } = require('../repositories');
const { HTTP_STATUS, ERROR_CODES } = constants;

const brandRepository = new BrandRepository();

/**
 * Extract brand from subdomain
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const extractBrandFromSubdomain = async (req, res, next) => {
  try {
    const host = req.get('host');
    if (!host) {
      return response.badRequest(res, 'Host header is required');
    }

    // Extract subdomain (assuming format: brand.domain.com)
    const parts = host.split('.');
    if (parts.length < 3) {
      return response.badRequest(res, 'Invalid subdomain format');
    }

    const subdomain = parts[0];
    
    // Skip common subdomains
    if (['www', 'api', 'admin', 'app'].includes(subdomain)) {
      return response.badRequest(res, 'Invalid brand subdomain');
    }

    // Find brand by slug (subdomain)
    const brand = await brandRepository.findBySlug(subdomain);
    if (!brand) {
      logger.logSecurity('Brand not found for subdomain', {
        subdomain,
        host,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return response.notFound(res, 'Brand not found', ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Check if brand is active
    if (brand.status !== 'active') {
      logger.logSecurity('Inactive brand access attempt', {
        brandId: brand.id,
        brandSlug: brand.slug,
        status: brand.status,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return response.forbidden(res, 'Brand is not active', ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Attach brand to request
    req.brand = brand;
    
    next();
  } catch (error) {
    logger.error('Brand extraction from subdomain failed', {
      error: error.message,
      host: req.get('host'),
      ip: req.ip
    });
    
    return response.serverError(res, 'Failed to identify brand');
  }
};

/**
 * Extract brand from slug parameter
 * @param {string} paramName - Parameter name containing brand slug
 * @returns {function} - Middleware function
 */
const extractBrandFromParam = (paramName = 'brandSlug') => {
  return async (req, res, next) => {
    try {
      const brandSlug = req.params[paramName];
      
      if (!brandSlug) {
        return response.badRequest(res, `Brand slug parameter '${paramName}' is required`);
      }

      // Find brand by slug
      const brand = await brandRepository.findBySlug(brandSlug);
      if (!brand) {
        logger.logSecurity('Brand not found for slug parameter', {
          brandSlug,
          paramName,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        return response.notFound(res, 'Brand not found', ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Check if brand is active
      if (brand.status !== 'active') {
        logger.logSecurity('Inactive brand access attempt via parameter', {
          brandId: brand.id,
          brandSlug: brand.slug,
          status: brand.status,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        return response.forbidden(res, 'Brand is not active', ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Attach brand to request
      req.brand = brand;
      
      next();
    } catch (error) {
      logger.error('Brand extraction from parameter failed', {
        error: error.message,
        paramName,
        brandSlug: req.params[paramName],
        ip: req.ip,
        path: req.path
      });
      
      return response.serverError(res, 'Failed to identify brand');
    }
  };
};

/**
 * Extract brand from header
 * @param {string} headerName - Header name containing brand slug
 * @returns {function} - Middleware function
 */
const extractBrandFromHeader = (headerName = 'x-brand-slug') => {
  return async (req, res, next) => {
    try {
      const brandSlug = req.get(headerName);
      
      if (!brandSlug) {
        return response.badRequest(res, `Brand slug header '${headerName}' is required`);
      }

      // Find brand by slug
      const brand = await brandRepository.findBySlug(brandSlug);
      if (!brand) {
        logger.logSecurity('Brand not found for header', {
          brandSlug,
          headerName,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        return response.notFound(res, 'Brand not found', ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Check if brand is active
      if (brand.status !== 'active') {
        logger.logSecurity('Inactive brand access attempt via header', {
          brandId: brand.id,
          brandSlug: brand.slug,
          status: brand.status,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        return response.forbidden(res, 'Brand is not active', ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Attach brand to request
      req.brand = brand;
      
      next();
    } catch (error) {
      logger.error('Brand extraction from header failed', {
        error: error.message,
        headerName,
        brandSlug: req.get(headerName),
        ip: req.ip,
        path: req.path
      });
      
      return response.serverError(res, 'Failed to identify brand');
    }
  };
};

/**
 * Load brand with settings
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const loadBrandWithSettings = async (req, res, next) => {
  try {
    if (!req.brand) {
      return response.badRequest(res, 'Brand context is required');
    }

    // Load brand with settings
    const brandWithSettings = await brandRepository.findWithSettings(req.brand.id);
    if (!brandWithSettings) {
      return response.notFound(res, 'Brand settings not found', ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Replace brand with detailed version
    req.brand = brandWithSettings;
    
    next();
  } catch (error) {
    logger.error('Failed to load brand with settings', {
      error: error.message,
      brandId: req.brand?.id,
      ip: req.ip,
      path: req.path
    });
    
    return response.serverError(res, 'Failed to load brand settings');
  }
};

/**
 * Validate brand ownership (for brand-specific operations)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateBrandOwnership = (req, res, next) => {
  if (!req.user) {
    return response.unauthorized(res, 'Authentication required', ERROR_CODES.UNAUTHORIZED_ACCESS);
  }

  if (!req.brand) {
    return response.badRequest(res, 'Brand context is required');
  }

  const { USER_ROLES } = constants;
  
  // Super admin can access any brand
  if (req.user.role === USER_ROLES.SUPER_ADMIN) {
    return next();
  }

  // Check if user belongs to the brand
  if (req.user.brand_id !== req.brand.id) {
    logger.logSecurity('Brand ownership validation failed', {
      userId: req.user.id,
      userBrandId: req.user.brand_id,
      requestedBrandId: req.brand.id,
      userRole: req.user.role,
      ip: req.ip,
      path: req.path
    });
    
    return response.forbidden(res, 'Access denied to this brand', ERROR_CODES.UNAUTHORIZED_ACCESS);
  }

  next();
};

/**
 * Set brand CORS headers
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const setBrandCorsHeaders = (req, res, next) => {
  if (req.brand && req.brand.website_url) {
    try {
      const allowedOrigin = new URL(req.brand.website_url).origin;
      res.header('Access-Control-Allow-Origin', allowedOrigin);
    } catch (error) {
      logger.warn('Invalid brand website URL for CORS', {
        brandId: req.brand.id,
        websiteUrl: req.brand.website_url,
        error: error.message
      });
    }
  }
  
  next();
};

/**
 * Add brand context to response headers
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const addBrandHeaders = (req, res, next) => {
  if (req.brand) {
    res.header('X-Brand-ID', req.brand.id);
    res.header('X-Brand-Slug', req.brand.slug);
    res.header('X-Brand-Name', req.brand.name);
  }
  
  next();
};

/**
 * Optional brand context (doesn't fail if brand not found)
 * @param {string} source - Source of brand identification ('subdomain', 'param', 'header')
 * @param {string} identifier - Parameter/header name (if applicable)
 * @returns {function} - Middleware function
 */
const optionalBrandContext = (source = 'subdomain', identifier = 'brandSlug') => {
  return async (req, res, next) => {
    try {
      let brandSlug = null;
      
      switch (source) {
        case 'subdomain':
          const host = req.get('host');
          if (host) {
            const parts = host.split('.');
            if (parts.length >= 3 && !['www', 'api', 'admin', 'app'].includes(parts[0])) {
              brandSlug = parts[0];
            }
          }
          break;
          
        case 'param':
          brandSlug = req.params[identifier];
          break;
          
        case 'header':
          brandSlug = req.get(identifier);
          break;
          
        default:
          logger.warn('Invalid brand context source', { source });
          return next();
      }

      if (!brandSlug) {
        return next();
      }

      // Find brand by slug
      const brand = await brandRepository.findBySlug(brandSlug);
      if (brand && brand.status === 'active') {
        req.brand = brand;
      }
      
      next();
    } catch (error) {
      logger.error('Optional brand context error', {
        error: error.message,
        source,
        identifier,
        ip: req.ip,
        path: req.path
      });
      
      // Continue without brand context
      next();
    }
  };
};

/**
 * Log brand access
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const logBrandAccess = (req, res, next) => {
  if (req.brand) {
    logger.logBusiness('Brand accessed', {
      brandId: req.brand.id,
      brandSlug: req.brand.slug,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });
  }
  
  next();
};

module.exports = {
  extractBrandFromSubdomain,
  extractBrandFromParam,
  extractBrandFromHeader,
  loadBrandWithSettings,
  validateBrandOwnership,
  setBrandCorsHeaders,
  addBrandHeaders,
  optionalBrandContext,
  logBrandAccess
};