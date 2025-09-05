/**
 * User Repository
 * Handles database operations for users
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../utils');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {object|null} - User or null
   */
  async findByEmail(email) {
    try {
      return await this.findOne({ email: email.toLowerCase() });
    } catch (error) {
      logger.error('Error finding user by email', { email, error: error.message });
      throw error;
    }
  }

  /**
   * Find user with brand information
   * @param {string} id - User ID
   * @returns {object|null} - User with brand info or null
   */
  async findWithBrand(id) {
    try {
      const query = `
        SELECT 
          u.*,
          b.id as brand_id,
          b.name as brand_name,
          b.slug as brand_slug,
          b.status as brand_status
        FROM users u
        LEFT JOIN brands b ON u.brand_id = b.id
        WHERE u.id = $1
      `;
      
      const result = await this.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error finding user with brand', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Find users by brand with pagination
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Paginated users
   */
  async findByBrand(brandId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        role = null,
        status = null,
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      let whereClause = 'WHERE u.brand_id = $1';
      const params = [brandId];
      let paramIndex = 2;

      // Add search condition
      if (search) {
        whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Add role filter
      if (role) {
        whereClause += ` AND u.role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }

      // Add status filter
      if (status) {
        whereClause += ` AND u.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM users u 
        ${whereClause}
      `;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get records
      const dataQuery = `
        SELECT 
          u.id, u.first_name, u.last_name, u.email, u.role, u.status,
          u.last_login_at, u.created_at, u.updated_at
        FROM users u 
        ${whereClause}
        ORDER BY u.${orderBy} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const dataResult = await this.query(dataQuery, [...params, limit, offset]);
      const totalPages = Math.ceil(total / limit);

      return {
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error finding users by brand', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Create user with email normalization
   * @param {object} userData - User data
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Created user
   */
  async create(userData, client = null) {
    try {
      const normalizedData = {
        ...userData,
        email: userData.email.toLowerCase(),
        status: userData.status || 'active'
      };

      return await super.create(normalizedData, client);
    } catch (error) {
      logger.error('Error creating user', { userData: { ...userData, password: '[REDACTED]' }, error: error.message });
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   * @param {string} id - User ID
   * @returns {object|null} - Updated user or null
   */
  async updateLastLogin(id) {
    try {
      return await this.update(id, { last_login_at: new Date() });
    } catch (error) {
      logger.error('Error updating last login', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Update user password
   * @param {string} id - User ID
   * @param {string} hashedPassword - Hashed password
   * @returns {object|null} - Updated user or null
   */
  async updatePassword(id, hashedPassword) {
    try {
      return await this.update(id, { 
        password_hash: hashedPassword,
        password_changed_at: new Date()
      });
    } catch (error) {
      logger.error('Error updating password', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Find user by password reset token
   * @param {string} token - Reset token
   * @returns {object|null} - User or null
   */
  async findByResetToken(token) {
    try {
      const query = `
        SELECT * FROM users 
        WHERE password_reset_token = $1 
        AND password_reset_expires > NOW()
        AND status = 'active'
      `;
      
      const result = await this.query(query, [token]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error finding user by reset token', { error: error.message });
      throw error;
    }
  }

  /**
   * Set password reset token
   * @param {string} email - User email
   * @param {string} token - Reset token
   * @param {Date} expires - Token expiration
   * @returns {object|null} - Updated user or null
   */
  async setResetToken(email, token, expires) {
    try {
      const query = `
        UPDATE users 
        SET password_reset_token = $1, password_reset_expires = $2, updated_at = $3
        WHERE email = $4 AND status = 'active'
        RETURNING id, email, first_name, last_name
      `;
      
      const result = await this.query(query, [token, expires, new Date(), email.toLowerCase()]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error setting reset token', { email, error: error.message });
      throw error;
    }
  }

  /**
   * Clear password reset token
   * @param {string} id - User ID
   * @returns {object|null} - Updated user or null
   */
  async clearResetToken(id) {
    try {
      return await this.update(id, {
        password_reset_token: null,
        password_reset_expires: null
      });
    } catch (error) {
      logger.error('Error clearing reset token', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Find user by email verification token
   * @param {string} token - Verification token
   * @returns {object|null} - User or null
   */
  async findByVerificationToken(token) {
    try {
      const query = `
        SELECT * FROM users 
        WHERE email_verification_token = $1 
        AND email_verification_expires > NOW()
      `;
      
      const result = await this.query(query, [token]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error finding user by verification token', { error: error.message });
      throw error;
    }
  }

  /**
   * Set email verification token
   * @param {string} id - User ID
   * @param {string} token - Verification token
   * @param {Date} expires - Token expiration
   * @returns {object|null} - Updated user or null
   */
  async setVerificationToken(id, token, expires) {
    try {
      return await this.update(id, {
        email_verification_token: token,
        email_verification_expires: expires
      });
    } catch (error) {
      logger.error('Error setting verification token', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Verify user email
   * @param {string} id - User ID
   * @returns {object|null} - Updated user or null
   */
  async verifyEmail(id) {
    try {
      return await this.update(id, {
        email_verified_at: new Date(),
        email_verification_token: null,
        email_verification_expires: null,
        status: 'active'
      });
    } catch (error) {
      logger.error('Error verifying email', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Check if email is available
   * @param {string} email - Email to check
   * @param {string} excludeId - ID to exclude from check
   * @returns {boolean} - True if available
   */
  async isEmailAvailable(email, excludeId = null) {
    try {
      let query = 'SELECT id FROM users WHERE email = $1';
      const params = [email.toLowerCase()];

      if (excludeId) {
        query += ' AND id != $2';
        params.push(excludeId);
      }

      const result = await this.query(query, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Error checking email availability', { email, excludeId, error: error.message });
      throw error;
    }
  }

  /**
   * Get user permissions based on role
   * @param {string} id - User ID
   * @returns {array} - User permissions
   */
  async getUserPermissions(id) {
    try {
      const user = await this.findById(id);
      if (!user) {
        return [];
      }

      const { ROLE_PERMISSIONS } = require('../utils/constants');
      return ROLE_PERMISSIONS[user.role] || [];
    } catch (error) {
      logger.error('Error getting user permissions', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get users by role
   * @param {string} role - User role
   * @param {string} brandId - Brand ID (optional)
   * @returns {array} - Users with specified role
   */
  async findByRole(role, brandId = null) {
    try {
      const where = { role, status: 'active' };
      if (brandId) {
        where.brand_id = brandId;
      }

      return await this.findAll({ where, orderBy: 'created_at', order: 'DESC' });
    } catch (error) {
      logger.error('Error finding users by role', { role, brandId, error: error.message });
      throw error;
    }
  }

  /**
   * Get user activity summary
   * @param {string} id - User ID
   * @returns {object} - Activity summary
   */
  async getActivitySummary(id) {
    try {
      const query = `
        SELECT 
          u.last_login_at,
          u.created_at,
          COUNT(DISTINCT al.id) as total_actions,
          COUNT(DISTINCT CASE WHEN al.created_at > NOW() - INTERVAL '7 days' THEN al.id END) as weekly_actions,
          COUNT(DISTINCT CASE WHEN al.created_at > NOW() - INTERVAL '30 days' THEN al.id END) as monthly_actions
        FROM users u
        LEFT JOIN audit_logs al ON u.id = al.user_id
        WHERE u.id = $1
        GROUP BY u.id, u.last_login_at, u.created_at
      `;

      const result = await this.query(query, [id]);
      
      if (result.rows.length === 0) {
        return {
          last_login_at: null,
          created_at: null,
          total_actions: 0,
          weekly_actions: 0,
          monthly_actions: 0
        };
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user activity summary', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Soft delete user (set status to inactive)
   * @param {string} id - User ID
   * @returns {boolean} - True if deleted
   */
  async softDelete(id) {
    try {
      const result = await this.update(id, { status: 'inactive' });
      return result !== null;
    } catch (error) {
      logger.error('Error soft deleting user', { id, error: error.message });
      throw error;
    }
  }
}

module.exports = UserRepository;