/**
 * Member Repository
 * Handles database operations for members
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../utils');

class MemberRepository extends BaseRepository {
  constructor() {
    super('members');
  }

  /**
   * Find member by email and brand
   * @param {string} email - Member email
   * @param {string} brandId - Brand ID
   * @returns {object|null} - Member or null
   */
  async findByEmailAndBrand(email, brandId) {
    try {
      return await this.findOne({ 
        email: email.toLowerCase(), 
        brand_id: brandId 
      });
    } catch (error) {
      logger.error('Error finding member by email and brand', { email, brandId, error: error.message });
      throw error;
    }
  }

  /**
   * Find member with tier information
   * @param {string} id - Member ID
   * @returns {object|null} - Member with tier info or null
   */
  async findWithTier(id) {
    try {
      const query = `
        SELECT 
          m.*,
          mt.name as tier_name,
          mt.min_points as tier_min_points,
          mt.max_points as tier_max_points,
          mt.benefits as tier_benefits,
          mt.color as tier_color
        FROM members m
        LEFT JOIN member_tiers mt ON m.tier_id = mt.id
        WHERE m.id = $1
      `;
      
      const result = await this.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error finding member with tier', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Find members by brand with pagination and search
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Paginated members
   */
  async findByBrand(brandId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        tierId = null,
        status = null,
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      let whereClause = 'WHERE m.brand_id = $1';
      const params = [brandId];
      let paramIndex = 2;

      // Add search condition
      if (search) {
        whereClause += ` AND (m.first_name ILIKE $${paramIndex} OR m.last_name ILIKE $${paramIndex} OR m.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Add tier filter
      if (tierId) {
        whereClause += ` AND m.tier_id = $${paramIndex}`;
        params.push(tierId);
        paramIndex++;
      }

      // Add status filter
      if (status) {
        whereClause += ` AND m.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM members m 
        ${whereClause}
      `;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get records with tier information
      const dataQuery = `
        SELECT 
          m.id, m.first_name, m.last_name, m.email, m.phone, m.points_balance,
          m.total_points_earned, m.status, m.last_activity_at, m.created_at,
          mt.name as tier_name, mt.color as tier_color
        FROM members m 
        LEFT JOIN member_tiers mt ON m.tier_id = mt.id
        ${whereClause}
        ORDER BY m.${orderBy} ${order}
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
      logger.error('Error finding members by brand', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Create member with email normalization
   * @param {object} memberData - Member data
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Created member
   */
  async create(memberData, client = null) {
    try {
      const normalizedData = {
        ...memberData,
        email: memberData.email.toLowerCase(),
        points_balance: memberData.points_balance || 0,
        total_points_earned: memberData.total_points_earned || 0,
        status: memberData.status || 'active'
      };

      return await super.create(normalizedData, client);
    } catch (error) {
      logger.error('Error creating member', { memberData, error: error.message });
      throw error;
    }
  }

  /**
   * Update member points
   * @param {string} id - Member ID
   * @param {number} pointsChange - Points to add/subtract
   * @param {string} type - Transaction type
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Updated member
   */
  async updatePoints(id, pointsChange, type = 'points_earned', client = null) {
    try {
      const executeQuery = async (dbClient) => {
        // Get current member data
        const member = await this.findById(id);
        if (!member) {
          throw new Error('Member not found');
        }

        const newBalance = member.points_balance + pointsChange;
        const newTotalEarned = type.includes('earned') || type.includes('win') || type.includes('reward') 
          ? member.total_points_earned + Math.max(0, pointsChange)
          : member.total_points_earned;

        // Update member points
        const updatedMember = await this.update(id, {
          points_balance: Math.max(0, newBalance),
          total_points_earned: newTotalEarned,
          last_activity_at: new Date()
        }, dbClient);

        // Check for tier upgrade
        await this.checkTierUpgrade(id, newTotalEarned, dbClient);

        return updatedMember;
      };

      if (client) {
        return await executeQuery(client);
      } else {
        return await this.withTransaction(executeQuery);
      }
    } catch (error) {
      logger.error('Error updating member points', { id, pointsChange, type, error: error.message });
      throw error;
    }
  }

  /**
   * Check and update member tier based on points
   * @param {string} memberId - Member ID
   * @param {number} totalPoints - Total points earned
   * @param {object} client - Database client (for transaction)
   * @returns {object|null} - New tier if upgraded, null otherwise
   */
  async checkTierUpgrade(memberId, totalPoints, client = null) {
    try {
      const member = await this.findById(memberId);
      if (!member) {
        return null;
      }

      // Find appropriate tier
      const tierQuery = `
        SELECT * FROM member_tiers 
        WHERE brand_id = $1 AND status = 'active' 
        AND min_points <= $2 
        AND (max_points IS NULL OR max_points >= $2)
        ORDER BY min_points DESC 
        LIMIT 1
      `;

      const tierResult = await this.query(tierQuery, [member.brand_id, totalPoints], client);
      
      if (tierResult.rows.length === 0) {
        return null;
      }

      const newTier = tierResult.rows[0];
      
      // Check if tier upgrade is needed
      if (member.tier_id !== newTier.id) {
        await this.update(memberId, { tier_id: newTier.id }, client);
        
        logger.logBusiness('Member tier upgraded', {
          memberId,
          oldTierId: member.tier_id,
          newTierId: newTier.id,
          totalPoints
        });

        return newTier;
      }

      return null;
    } catch (error) {
      logger.error('Error checking tier upgrade', { memberId, totalPoints, error: error.message });
      throw error;
    }
  }

  /**
   * Update member's last activity
   * @param {string} id - Member ID
   * @returns {object|null} - Updated member or null
   */
  async updateLastActivity(id) {
    try {
      return await this.update(id, { last_activity_at: new Date() });
    } catch (error) {
      logger.error('Error updating last activity', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get member statistics
   * @param {string} id - Member ID
   * @returns {object} - Member statistics
   */
  async getStatistics(id) {
    try {
      const query = `
        SELECT 
          m.points_balance,
          m.total_points_earned,
          m.created_at,
          m.last_activity_at,
          COUNT(DISTINCT ws.id) as total_spins,
          COUNT(DISTINCT CASE WHEN ws.created_at > NOW() - INTERVAL '30 days' THEN ws.id END) as monthly_spins,
          COUNT(DISTINCT mc.id) as total_missions_completed,
          COUNT(DISTINCT CASE WHEN mc.completed_at > NOW() - INTERVAL '30 days' THEN mc.id END) as monthly_missions_completed,
          COUNT(DISTINCT t.id) as total_transactions,
          COALESCE(SUM(CASE WHEN t.type IN ('points_spent') THEN ABS(t.points) ELSE 0 END), 0) as total_points_spent
        FROM members m
        LEFT JOIN wheel_spins ws ON m.id = ws.member_id
        LEFT JOIN mission_completions mc ON m.id = mc.member_id
        LEFT JOIN transactions t ON m.id = t.member_id
        WHERE m.id = $1
        GROUP BY m.id, m.points_balance, m.total_points_earned, m.created_at, m.last_activity_at
      `;

      const result = await this.query(query, [id]);
      
      if (result.rows.length === 0) {
        return {
          points_balance: 0,
          total_points_earned: 0,
          total_spins: 0,
          monthly_spins: 0,
          total_missions_completed: 0,
          monthly_missions_completed: 0,
          total_transactions: 0,
          total_points_spent: 0
        };
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting member statistics', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get member's daily spin count
   * @param {string} memberId - Member ID
   * @param {Date} date - Date to check (defaults to today)
   * @returns {number} - Number of spins today
   */
  async getDailySpinCount(memberId, date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const query = `
        SELECT COUNT(*) as count 
        FROM wheel_spins 
        WHERE member_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      `;

      const result = await this.query(query, [memberId, startOfDay, endOfDay]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting daily spin count', { memberId, date, error: error.message });
      throw error;
    }
  }

  /**
   * Get member leaderboard for a brand
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {array} - Leaderboard data
   */
  async getLeaderboard(brandId, options = {}) {
    try {
      const {
        limit = 10,
        period = 'all_time', // 'all_time', 'monthly', 'weekly'
        orderBy = 'total_points_earned'
      } = options;

      let dateFilter = '';
      const params = [brandId];
      let paramIndex = 2;

      if (period === 'monthly') {
        dateFilter = 'AND m.created_at >= DATE_TRUNC(\'month\', NOW())';
      } else if (period === 'weekly') {
        dateFilter = 'AND m.created_at >= DATE_TRUNC(\'week\', NOW())';
      }

      const query = `
        SELECT 
          m.id,
          m.first_name,
          m.last_name,
          m.points_balance,
          m.total_points_earned,
          mt.name as tier_name,
          mt.color as tier_color,
          ROW_NUMBER() OVER (ORDER BY m.${orderBy} DESC) as rank
        FROM members m
        LEFT JOIN member_tiers mt ON m.tier_id = mt.id
        WHERE m.brand_id = $1 
        AND m.status = 'active'
        ${dateFilter}
        ORDER BY m.${orderBy} DESC
        LIMIT $${paramIndex}
      `;

      params.push(limit);
      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting member leaderboard', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Check if email is available within brand
   * @param {string} email - Email to check
   * @param {string} brandId - Brand ID
   * @param {string} excludeId - ID to exclude from check
   * @returns {boolean} - True if available
   */
  async isEmailAvailable(email, brandId, excludeId = null) {
    try {
      let query = 'SELECT id FROM members WHERE email = $1 AND brand_id = $2';
      const params = [email.toLowerCase(), brandId];

      if (excludeId) {
        query += ' AND id != $3';
        params.push(excludeId);
      }

      const result = await this.query(query, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Error checking email availability', { email, brandId, excludeId, error: error.message });
      throw error;
    }
  }

  /**
   * Get members by tier
   * @param {string} tierId - Tier ID
   * @param {object} options - Query options
   * @returns {object} - Paginated members
   */
  async findByTier(tierId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      return await this.paginate({
        page,
        limit,
        where: { tier_id: tierId, status: 'active' },
        orderBy: 'total_points_earned',
        order: 'DESC'
      });
    } catch (error) {
      logger.error('Error finding members by tier', { tierId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Soft delete member (set status to inactive)
   * @param {string} id - Member ID
   * @returns {boolean} - True if deleted
   */
  async softDelete(id) {
    try {
      const result = await this.update(id, { status: 'inactive' });
      return result !== null;
    } catch (error) {
      logger.error('Error soft deleting member', { id, error: error.message });
      throw error;
    }
  }
}

module.exports = MemberRepository;