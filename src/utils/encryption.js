const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('./logger');

/**
 * Hash password using bcrypt
 * @param {String} password - Plain text password
 * @param {Number} saltRounds - Number of salt rounds (default: 12)
 * @returns {Promise<String>} Hashed password
 */
const hashPassword = async (password, saltRounds = 12) => {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    logger.debug('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
};

/**
 * Compare password with hash
 * @param {String} password - Plain text password
 * @param {String} hash - Hashed password
 * @returns {Promise<Boolean>} True if password matches hash
 */
const comparePassword = async (password, hash) => {
  try {
    if (!password || !hash) {
      throw new Error('Password and hash are required');
    }
    
    const isMatch = await bcrypt.compare(password, hash);
    
    logger.debug('Password comparison completed', { isMatch });
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password:', error);
    throw new Error('Password comparison failed');
  }
};

/**
 * Generate random string
 * @param {Number} length - Length of random string
 * @param {String} charset - Character set to use
 * @returns {String} Random string
 */
const generateRandomString = (length = 32, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => {
  try {
    let result = '';
    const charactersLength = charset.length;
    
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charactersLength));
    }
    
    return result;
  } catch (error) {
    logger.error('Error generating random string:', error);
    throw new Error('Random string generation failed');
  }
};

/**
 * Generate cryptographically secure random string
 * @param {Number} length - Length of random string
 * @returns {String} Random hex string
 */
const generateSecureRandomString = (length = 32) => {
  try {
    return crypto.randomBytes(length).toString('hex');
  } catch (error) {
    logger.error('Error generating secure random string:', error);
    throw new Error('Secure random string generation failed');
  }
};

/**
 * Generate UUID v4
 * @returns {String} UUID v4 string
 */
const generateUUID = () => {
  try {
    return crypto.randomUUID();
  } catch (error) {
    logger.error('Error generating UUID:', error);
    throw new Error('UUID generation failed');
  }
};

/**
 * Hash data using SHA-256
 * @param {String} data - Data to hash
 * @param {String} encoding - Output encoding (default: 'hex')
 * @returns {String} Hashed data
 */
const hashSHA256 = (data, encoding = 'hex') => {
  try {
    if (!data) {
      throw new Error('Data is required for hashing');
    }
    
    return crypto.createHash('sha256').update(data).digest(encoding);
  } catch (error) {
    logger.error('Error hashing with SHA-256:', error);
    throw new Error('SHA-256 hashing failed');
  }
};

/**
 * Create HMAC signature
 * @param {String} data - Data to sign
 * @param {String} secret - Secret key
 * @param {String} algorithm - HMAC algorithm (default: 'sha256')
 * @param {String} encoding - Output encoding (default: 'hex')
 * @returns {String} HMAC signature
 */
const createHMAC = (data, secret, algorithm = 'sha256', encoding = 'hex') => {
  try {
    if (!data || !secret) {
      throw new Error('Data and secret are required for HMAC');
    }
    
    return crypto.createHmac(algorithm, secret).update(data).digest(encoding);
  } catch (error) {
    logger.error('Error creating HMAC:', error);
    throw new Error('HMAC creation failed');
  }
};

/**
 * Verify HMAC signature
 * @param {String} data - Original data
 * @param {String} signature - HMAC signature to verify
 * @param {String} secret - Secret key
 * @param {String} algorithm - HMAC algorithm (default: 'sha256')
 * @returns {Boolean} True if signature is valid
 */
const verifyHMAC = (data, signature, secret, algorithm = 'sha256') => {
  try {
    const expectedSignature = createHMAC(data, secret, algorithm);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Error verifying HMAC:', error);
    return false;
  }
};

/**
 * Encrypt data using AES-256-GCM
 * @param {String} text - Text to encrypt
 * @param {String} key - Encryption key (32 bytes)
 * @returns {Object} Encrypted data with IV and auth tag
 */
const encryptAES = (text, key) => {
  try {
    if (!text || !key) {
      throw new Error('Text and key are required for encryption');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from('engage-service', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    logger.error('Error encrypting data:', error);
    throw new Error('AES encryption failed');
  }
};

/**
 * Decrypt data using AES-256-GCM
 * @param {Object} encryptedData - Encrypted data object
 * @param {String} key - Decryption key
 * @returns {String} Decrypted text
 */
const decryptAES = (encryptedData, key) => {
  try {
    if (!encryptedData || !key) {
      throw new Error('Encrypted data and key are required for decryption');
    }
    
    const { encrypted, iv, authTag } = encryptedData;
    
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAAD(Buffer.from('engage-service', 'utf8'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Error decrypting data:', error);
    throw new Error('AES decryption failed');
  }
};

/**
 * Generate password reset token
 * @returns {String} Password reset token
 */
const generatePasswordResetToken = () => {
  return generateSecureRandomString(64);
};

/**
 * Generate email verification token
 * @returns {String} Email verification token
 */
const generateEmailVerificationToken = () => {
  return generateSecureRandomString(64);
};

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @returns {Object} Validation result with score and feedback
 */
const validatePasswordStrength = (password) => {
  const result = {
    score: 0,
    feedback: [],
    isValid: false
  };
  
  if (!password) {
    result.feedback.push('Password is required');
    return result;
  }
  
  // Length check
  if (password.length >= 8) {
    result.score += 1;
  } else {
    result.feedback.push('Password must be at least 8 characters long');
  }
  
  // Uppercase check
  if (/[A-Z]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password must contain at least one uppercase letter');
  }
  
  // Lowercase check
  if (/[a-z]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password must contain at least one lowercase letter');
  }
  
  // Number check
  if (/\d/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password must contain at least one number');
  }
  
  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.score += 1;
  } else {
    result.feedback.push('Password must contain at least one special character');
  }
  
  // Common patterns check
  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123'];
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    result.feedback.push('Password contains common patterns');
    result.score -= 1;
  }
  
  result.isValid = result.score >= 4 && result.feedback.length === 0;
  
  return result;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomString,
  generateSecureRandomString,
  generateUUID,
  hashSHA256,
  createHMAC,
  verifyHMAC,
  encryptAES,
  decryptAES,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  validatePasswordStrength
};