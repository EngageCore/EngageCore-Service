const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

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
 * @returns {String} JWT token
 */
const generateToken = (payload) => {
  try {
    return jwt.sign(
      payload,
      jwtConfig.secret,
      {
        expiresIn: jwtConfig.expiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      }
    );
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw new Error('Token generation failed');
  }
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @returns {String} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(
      payload,
      jwtConfig.refreshSecret,
      {
        expiresIn: jwtConfig.refreshExpiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      }
    );
  } catch (error) {
    logger.error('Error generating JWT refresh token:', error);
    throw new Error('Refresh token generation failed');
  }
};

/**
 * Verify JWT access token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
  } catch (error) {
    logger.error('Error verifying JWT token:', error);
    throw new Error('Token verification failed');
  }
};

/**
 * Verify JWT refresh token
 * @param {String} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
  } catch (error) {
    logger.error('Error verifying JWT refresh token:', error);
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
    return jwt.decode(token, { complete: true });
  } catch (error) {
    logger.error('Error decoding JWT token:', error);
    throw new Error('Token decoding failed');
  }
};

module.exports = {
  jwtConfig,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken
};