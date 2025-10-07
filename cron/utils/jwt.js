const jwt = require('jsonwebtoken');
const logger = require('./logger');
const { generateSecureRandomString } = require('./encryption');

const jwtConfig = {
  secret: process.env.JWT_SECRET || 'engage-service-super-secret-jwt-key-2024',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'engage-service-refresh-token-secret-2024',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: 'engage-service',
  audience: 'engage-service-users'
};

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @param {Object} options - Additional JWT options
 * @returns {String} JWT token
 */
const generateAccessToken = (payload, options = {}) => {
  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be a valid object');
    }

    const tokenPayload = {
      ...payload,
      type: 'access',
      jti: generateSecureRandomString(16) // JWT ID for token tracking
    };

    const tokenOptions = {
      expiresIn: options.expiresIn || jwtConfig.expiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      ...options
    };

    const token = jwt.sign(tokenPayload, jwtConfig.secret, tokenOptions);
    
    logger.debug('Access token generated', {
      userId: payload.userId,
      brandId: payload.brandId,
      expiresIn: tokenOptions.expiresIn
    });

    return token;
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Access token generation failed');
  }
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @param {Object} options - Additional JWT options
 * @returns {String} JWT refresh token
 */
const generateRefreshToken = (payload, options = {}) => {
  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be a valid object');
    }

    const tokenPayload = {
      userId: payload.userId,
      brandId: payload.brandId,
      type: 'refresh',
      jti: generateSecureRandomString(16)
    };

    const tokenOptions = {
      expiresIn: options.expiresIn || jwtConfig.refreshExpiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      ...options
    };

    const token = jwt.sign(tokenPayload, jwtConfig.refreshSecret, tokenOptions);
    
    logger.debug('Refresh token generated', {
      userId: payload.userId,
      brandId: payload.brandId,
      expiresIn: tokenOptions.expiresIn
    });

    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Refresh token generation failed');
  }
};

/**
 * Verify JWT access token
 * @param {String} token - JWT token to verify
 * @param {Object} options - Additional verification options
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token, options = {}) => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a valid string');
    }

    const verifyOptions = {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      ...options
    };

    const decoded = jwt.verify(token, jwtConfig.secret, verifyOptions);
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    logger.debug('Access token verified', {
      userId: decoded.userId,
      brandId: decoded.brandId,
      jti: decoded.jti
    });

    return decoded;
  } catch (error) {
    logger.warn('Access token verification failed', {
      error: error.message,
      token: token.substring(0, 20) + '...'
    });
    throw new Error('Access token verification failed');
  }
};

/**
 * Verify JWT refresh token
 * @param {String} token - JWT refresh token to verify
 * @param {Object} options - Additional verification options
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token, options = {}) => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a valid string');
    }

    const verifyOptions = {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      ...options
    };

    const decoded = jwt.verify(token, jwtConfig.refreshSecret, verifyOptions);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    logger.debug('Refresh token verified', {
      userId: decoded.userId,
      brandId: decoded.brandId,
      jti: decoded.jti
    });

    return decoded;
  } catch (error) {
    logger.warn('Refresh token verification failed', {
      error: error.message,
      token: token.substring(0, 20) + '...'
    });
    throw new Error('Refresh token verification failed');
  }
};

/**
 * Decode JWT token without verification
 * @param {String} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a valid string');
    }

    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded) {
      throw new Error('Invalid token format');
    }

    return decoded;
  } catch (error) {
    logger.error('Error decoding token:', error);
    throw new Error('Token decoding failed');
  }
};

/**
 * Extract token from Authorization header
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Check if token is expired
 * @param {Object} decodedToken - Decoded JWT token
 * @returns {Boolean} True if token is expired
 */
const isTokenExpired = (decodedToken) => {
  if (!decodedToken || !decodedToken.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return decodedToken.exp < currentTime;
};

/**
 * Get token expiration time
 * @param {Object} decodedToken - Decoded JWT token
 * @returns {Date|null} Expiration date or null
 */
const getTokenExpiration = (decodedToken) => {
  if (!decodedToken || !decodedToken.exp) {
    return null;
  }

  return new Date(decodedToken.exp * 1000);
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} payload - Token payload
 * @returns {Object} Object containing access and refresh tokens
 */
const generateTokenPair = (payload) => {
  try {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    logger.audit('Token pair generated', {
      userId: payload.userId,
      brandId: payload.brandId,
      timestamp: new Date().toISOString()
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: jwtConfig.expiresIn
    };
  } catch (error) {
    logger.error('Error generating token pair:', error);
    throw new Error('Token pair generation failed');
  }
};

/**
 * Refresh access token using refresh token
 * @param {String} refreshToken - Valid refresh token
 * @returns {Object} New token pair
 */
const refreshAccessToken = (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    const newPayload = {
      userId: decoded.userId,
      brandId: decoded.brandId,
      email: decoded.email,
      role: decoded.role
    };

    const tokenPair = generateTokenPair(newPayload);

    logger.audit('Access token refreshed', {
      userId: decoded.userId,
      brandId: decoded.brandId,
      oldJti: decoded.jti,
      timestamp: new Date().toISOString()
    });

    return tokenPair;
  } catch (error) {
    logger.error('Error refreshing access token:', error);
    throw new Error('Token refresh failed');
  }
};

/**
 * Blacklist token (for logout functionality)
 * Note: In a production environment, you would store blacklisted tokens in Redis or database
 * @param {String} token - Token to blacklist
 * @param {String} reason - Reason for blacklisting
 */
const blacklistToken = (token, reason = 'logout') => {
  try {
    const decoded = decodeToken(token);
    
    logger.audit('Token blacklisted', {
      jti: decoded.payload.jti,
      userId: decoded.payload.userId,
      reason,
      timestamp: new Date().toISOString()
    });

    // In production, store in Redis with expiration time
    // redis.setex(`blacklist:${decoded.payload.jti}`, decoded.payload.exp - Math.floor(Date.now() / 1000), reason);
    
    return true;
  } catch (error) {
    logger.error('Error blacklisting token:', error);
    return false;
  }
};

module.exports = {
  jwtConfig,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpiration,
  generateTokenPair,
  refreshAccessToken,
  blacklistToken
};