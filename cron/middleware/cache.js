/**
 * Cache Middleware
 * Implements in-memory caching for frequently accessed data
 */

const { logger } = require('../utils');

// Simple in-memory cache
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
  }

  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, value);
    this.ttlMap.set(key, expiresAt);
    
    // Clean up expired entries periodically
    this.cleanup();
  }

  get(key) {
    const expiresAt = this.ttlMap.get(key);
    
    if (!expiresAt || Date.now() > expiresAt) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
  }

  clear() {
    this.cache.clear();
    this.ttlMap.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiresAt] of this.ttlMap.entries()) {
      if (now > expiresAt) {
        this.delete(key);
      }
    }
  }

  size() {
    return this.cache.size;
  }
}

// Global cache instance
const cache = new MemoryCache();

// Clean up expired entries every 5 minutes
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);

/**
 * Cache middleware factory
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds (default: 300)
 * @param {function} options.keyGenerator - Function to generate cache key from request
 * @param {function} options.shouldCache - Function to determine if response should be cached
 */
function cacheMiddleware(options = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `${req.method}:${req.originalUrl}:${req.get('X-Brand-ID') || 'global'}`,
    shouldCache = (req, res) => req.method === 'GET' && res.statusCode === 200
  } = options;

  return (req, res, next) => {
    // Skip caching for non-GET requests or if disabled
    if (req.method !== 'GET' || req.query.nocache === 'true') {
      return next();
    }

    const cacheKey = keyGenerator(req);
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      logger.debug(`Cache hit for key: ${cacheKey}`);
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', cacheKey);
      return res.json(cachedResponse);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      if (shouldCache(req, res)) {
        cache.set(cacheKey, data, ttl);
        logger.debug(`Cached response for key: ${cacheKey}`);
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Cache invalidation middleware
 * Clears cache entries when data is modified
 */
function invalidateCache(patterns = []) {
  return (req, res, next) => {
    // Store original end function
    const originalEnd = res.end;
    
    res.end = function(chunk, encoding) {
      // Only invalidate on successful modifications
      if (res.statusCode >= 200 && res.statusCode < 300 && 
          ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        
        patterns.forEach(pattern => {
          const keys = Array.from(cache.cache.keys());
          keys.forEach(key => {
            if (key.includes(pattern)) {
              cache.delete(key);
              logger.debug(`Invalidated cache key: ${key}`);
            }
          });
        });
      }
      
      return originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}

/**
 * Specific cache configurations for different endpoints
 */
const cacheConfigs = {
  // Brand data - cache for 10 minutes
  brands: cacheMiddleware({
    ttl: 600,
    keyGenerator: (req) => `brands:${req.params.brandId || 'all'}:${req.originalUrl}`
  }),
  
  // Wheel configurations - cache for 15 minutes
  wheels: cacheMiddleware({
    ttl: 900,
    keyGenerator: (req) => `wheels:${req.params.brandId}:${req.params.wheelId || 'all'}`
  }),
  
  // Missions - cache for 5 minutes
  missions: cacheMiddleware({
    ttl: 300,
    keyGenerator: (req) => `missions:${req.params.brandId}:${req.originalUrl}`
  }),
  
  // Membership tiers - cache for 30 minutes
  tiers: cacheMiddleware({
    ttl: 1800,
    keyGenerator: (req) => `tiers:${req.params.brandId || 'all'}`
  }),
  
  // User profile - cache for 2 minutes
  profile: cacheMiddleware({
    ttl: 120,
    keyGenerator: (req) => `profile:${req.user?.id}:${req.originalUrl}`
  })
};

/**
 * Cache invalidation patterns for different operations
 */
const invalidationPatterns = {
  brands: ['brands:'],
  wheels: ['wheels:', 'brands:'],
  missions: ['missions:', 'brands:'],
  tiers: ['tiers:', 'brands:'],
  members: ['profile:', 'brands:'],
  transactions: ['profile:', 'brands:']
};

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache,
  cacheConfigs,
  invalidationPatterns
};