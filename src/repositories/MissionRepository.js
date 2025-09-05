/**
 * Mission Repository
 * Handles database operations for missions and mission completions
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../utils');

class MissionRepository extends BaseRepository {
  constructor() {
    super('missions');
  }

  /**
   * Find active missions by brand
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {array} - Active missions
   */
  async findActiveByBrand(brandId, options = {}) {
    try {
      const {
        type = null,
        limit = null,
        memberId = null
      } = options;

      let whereClause = 'WHERE m.brand_id = $1 AND m.status = \'active\' AND m.start_date <= NOW() AND (m.end_date IS NULL OR m.end_date >= NOW())';
      const params = [brandId];
      let paramIndex = 2;

      // Add type filter
      if (type) {
        whereClause += ` AND m.type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      // If memberId is provided, exclude already completed missions
      if (memberId) {
        whereClause += ` AND NOT EXISTS (
          SELECT 1 FROM mission_completions mc 
          WHERE mc.mission_id = m.id AND mc.member_id = $${paramIndex}
          AND (m.type != 'recurring' OR mc.completed_at > NOW() - INTERVAL '1 day')
        )`;
        params.push(memberId);
        paramIndex++;
      }

      let query = `
        SELECT 
          m.*,
          CASE 
            WHEN m.type = 'daily' THEN 'Daily Mission'
            WHEN m.type = 'weekly' THEN 'Weekly Mission'
            WHEN m.type = 'monthly' THEN 'Monthly Mission'
            WHEN m.type = 'one_time' THEN 'Special Mission'
            WHEN m.type = 'recurring' THEN 'Recurring Mission'
            ELSE 'Mission'
          END as type_label
        FROM missions m
        ${whereClause}
        ORDER BY m.priority DESC, m.created_at ASC
      `;

      if (limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(limit);
      }

      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error finding active missions by brand', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Find missions by brand with pagination and search
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Paginated missions
   */
  async findByBrand(brandId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        type = null,
        status = null,
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      let whereClause = 'WHERE m.brand_id = $1';
      const params = [brandId];
      let paramIndex = 2;

      // Add search condition
      if (search) {
        whereClause += ` AND (m.title ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Add type filter
      if (type) {
        whereClause += ` AND m.type = $${paramIndex}`;
        params.push(type);
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
        FROM missions m 
        ${whereClause}
      `;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get records with completion stats
      const dataQuery = `
        SELECT 
          m.*,
          COUNT(mc.id) as completion_count,
          COUNT(DISTINCT mc.member_id) as unique_completions
        FROM missions m
        LEFT JOIN mission_completions mc ON m.id = mc.mission_id
        ${whereClause}
        GROUP BY m.id
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
      logger.error('Error finding missions by brand', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Record mission completion
   * @param {object} completionData - Completion data
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Created completion record
   */
  async recordCompletion(completionData, client = null) {
    try {
      const query = `
        INSERT INTO mission_completions (
          id, member_id, mission_id, completed_at, reward_points,
          reward_claimed, completion_data, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const { v4: uuidv4 } = require('uuid');
      const now = new Date();
      
      const params = [
        uuidv4(),
        completionData.member_id,
        completionData.mission_id,
        completionData.completed_at || now,
        completionData.reward_points || 0,
        completionData.reward_claimed || false,
        JSON.stringify(completionData.completion_data || {}),
        now,
        now
      ];

      const result = await this.query(query, params, client);
      return result.rows[0];
    } catch (error) {
      logger.error('Error recording mission completion', { completionData, error: error.message });
      throw error;
    }
  }

  /**
   * Get member's mission completions
   * @param {string} memberId - Member ID
   * @param {object} options - Query options
   * @returns {object} - Paginated completions
   */
  async getMemberCompletions(memberId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        startDate = null,
        endDate = null,
        missionType = null
      } = options;

      let whereClause = 'WHERE mc.member_id = $1';
      const params = [memberId];
      let paramIndex = 2;

      if (startDate) {
        whereClause += ` AND mc.completed_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND mc.completed_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      if (missionType) {
        whereClause += ` AND m.type = $${paramIndex}`;
        params.push(missionType);
        paramIndex++;
      }

      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM mission_completions mc
        JOIN missions m ON mc.mission_id = m.id
        ${whereClause}
      `;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get records
      const dataQuery = `
        SELECT 
          mc.*,
          m.title as mission_title,
          m.description as mission_description,
          m.type as mission_type,
          m.difficulty as mission_difficulty
        FROM mission_completions mc
        JOIN missions m ON mc.mission_id = m.id
        ${whereClause}
        ORDER BY mc.completed_at DESC
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
      logger.error('Error getting member completions', { memberId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Check if member has completed mission
   * @param {string} memberId - Member ID
   * @param {string} missionId - Mission ID
   * @param {string} timeframe - Timeframe to check ('today', 'week', 'month', 'all')
   * @returns {boolean} - True if completed
   */
  async hasCompleted(memberId, missionId, timeframe = 'all') {
    try {
      let dateFilter = '';
      const params = [memberId, missionId];

      switch (timeframe) {
        case 'today':
          dateFilter = 'AND completed_at >= CURRENT_DATE';
          break;
        case 'week':
          dateFilter = 'AND completed_at >= DATE_TRUNC(\'week\', NOW())';
          break;
        case 'month':
          dateFilter = 'AND completed_at >= DATE_TRUNC(\'month\', NOW())';
          break;
        default:
          // 'all' - no date filter
          break;
      }

      const query = `
        SELECT COUNT(*) as count 
        FROM mission_completions 
        WHERE member_id = $1 AND mission_id = $2 ${dateFilter}
      `;

      const result = await this.query(query, params);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking mission completion', { memberId, missionId, timeframe, error: error.message });
      throw error;
    }
  }

  /**
   * Get mission statistics
   * @param {string} missionId - Mission ID
   * @param {object} options - Query options
   * @returns {object} - Mission statistics
   */
  async getMissionStatistics(missionId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null
      } = options;

      let dateFilter = '';
      const params = [missionId];
      let paramIndex = 2;

      if (startDate) {
        dateFilter += ` AND mc.completed_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        dateFilter += ` AND mc.completed_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          COUNT(mc.id) as total_completions,
          COUNT(DISTINCT mc.member_id) as unique_completions,
          COALESCE(SUM(mc.reward_points), 0) as total_points_awarded,
          COALESCE(AVG(mc.reward_points), 0) as average_points_per_completion,
          COUNT(CASE WHEN mc.completed_at > NOW() - INTERVAL '24 hours' THEN 1 END) as completions_last_24h,
          COUNT(CASE WHEN mc.completed_at > NOW() - INTERVAL '7 days' THEN 1 END) as completions_last_7d,
          COUNT(CASE WHEN mc.completed_at > NOW() - INTERVAL '30 days' THEN 1 END) as completions_last_30d
        FROM mission_completions mc
        WHERE mc.mission_id = $1 ${dateFilter}
      `;

      const result = await this.query(query, params);
      
      if (result.rows.length === 0) {
        return {
          total_completions: 0,
          unique_completions: 0,
          total_points_awarded: 0,
          average_points_per_completion: 0,
          completions_last_24h: 0,
          completions_last_7d: 0,
          completions_last_30d: 0
        };
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting mission statistics', { missionId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get brand mission statistics
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Brand mission statistics
   */
  async getBrandMissionStatistics(brandId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null
      } = options;

      let dateFilter = '';
      const params = [brandId];
      let paramIndex = 2;

      if (startDate) {
        dateFilter += ` AND mc.completed_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        dateFilter += ` AND mc.completed_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          COUNT(DISTINCT m.id) as total_missions,
          COUNT(DISTINCT CASE WHEN m.status = 'active' THEN m.id END) as active_missions,
          COUNT(mc.id) as total_completions,
          COUNT(DISTINCT mc.member_id) as unique_participants,
          COALESCE(SUM(mc.reward_points), 0) as total_points_awarded,
          COUNT(CASE WHEN mc.completed_at > NOW() - INTERVAL '24 hours' THEN 1 END) as completions_last_24h,
          COUNT(CASE WHEN mc.completed_at > NOW() - INTERVAL '7 days' THEN 1 END) as completions_last_7d,
          COUNT(CASE WHEN mc.completed_at > NOW() - INTERVAL '30 days' THEN 1 END) as completions_last_30d
        FROM missions m
        LEFT JOIN mission_completions mc ON m.id = mc.mission_id ${dateFilter}
        WHERE m.brand_id = $1
      `;

      const result = await this.query(query, params);
      
      if (result.rows.length === 0) {
        return {
          total_missions: 0,
          active_missions: 0,
          total_completions: 0,
          unique_participants: 0,
          total_points_awarded: 0,
          completions_last_24h: 0,
          completions_last_7d: 0,
          completions_last_30d: 0,
          completion_rate: 0
        };
      }

      const stats = result.rows[0];
      stats.completion_rate = stats.total_missions > 0 ? (stats.total_completions / stats.total_missions) : 0;
      
      return stats;
    } catch (error) {
      logger.error('Error getting brand mission statistics', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get top performing missions
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {array} - Top missions
   */
  async getTopPerformingMissions(brandId, options = {}) {
    try {
      const {
        limit = 10,
        startDate = null,
        endDate = null,
        orderBy = 'completion_count' // 'completion_count', 'unique_participants', 'points_awarded'
      } = options;

      let dateFilter = '';
      const params = [brandId];
      let paramIndex = 2;

      if (startDate) {
        dateFilter += ` AND mc.completed_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        dateFilter += ` AND mc.completed_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      let orderClause = 'completion_count DESC';
      if (orderBy === 'unique_participants') {
        orderClause = 'unique_participants DESC';
      } else if (orderBy === 'points_awarded') {
        orderClause = 'points_awarded DESC';
      }

      const query = `
        SELECT 
          m.id,
          m.title,
          m.type,
          m.difficulty,
          m.reward_points,
          COUNT(mc.id) as completion_count,
          COUNT(DISTINCT mc.member_id) as unique_participants,
          COALESCE(SUM(mc.reward_points), 0) as points_awarded
        FROM missions m
        LEFT JOIN mission_completions mc ON m.id = mc.mission_id ${dateFilter}
        WHERE m.brand_id = $1
        GROUP BY m.id, m.title, m.type, m.difficulty, m.reward_points
        ORDER BY ${orderClause}
        LIMIT $${paramIndex}
      `;

      params.push(limit);
      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting top performing missions', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get member's available missions
   * @param {string} memberId - Member ID
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {array} - Available missions
   */
  async getMemberAvailableMissions(memberId, brandId, options = {}) {
    try {
      const {
        type = null,
        limit = null
      } = options;

      let whereClause = `
        WHERE m.brand_id = $1 
        AND m.status = 'active' 
        AND m.start_date <= NOW() 
        AND (m.end_date IS NULL OR m.end_date >= NOW())
        AND NOT EXISTS (
          SELECT 1 FROM mission_completions mc 
          WHERE mc.mission_id = m.id 
          AND mc.member_id = $2
          AND (
            m.type = 'one_time' 
            OR (m.type = 'daily' AND mc.completed_at >= CURRENT_DATE)
            OR (m.type = 'weekly' AND mc.completed_at >= DATE_TRUNC('week', NOW()))
            OR (m.type = 'monthly' AND mc.completed_at >= DATE_TRUNC('month', NOW()))
          )
        )
      `;
      const params = [brandId, memberId];
      let paramIndex = 3;

      // Add type filter
      if (type) {
        whereClause += ` AND m.type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      let query = `
        SELECT 
          m.*,
          CASE 
            WHEN m.type = 'daily' THEN 'Resets daily'
            WHEN m.type = 'weekly' THEN 'Resets weekly'
            WHEN m.type = 'monthly' THEN 'Resets monthly'
            WHEN m.type = 'one_time' THEN 'One time only'
            WHEN m.type = 'recurring' THEN 'Can be repeated'
            ELSE 'Available'
          END as availability_info
        FROM missions m
        ${whereClause}
        ORDER BY m.priority DESC, m.created_at ASC
      `;

      if (limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(limit);
      }

      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting member available missions', { memberId, brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Claim mission reward
   * @param {string} completionId - Completion ID
   * @param {object} client - Database client (for transaction)
   * @returns {object|null} - Updated completion or null
   */
  async claimReward(completionId, client = null) {
    try {
      const query = `
        UPDATE mission_completions 
        SET reward_claimed = true, updated_at = $1
        WHERE id = $2 AND reward_claimed = false
        RETURNING *
      `;

      const result = await this.query(query, [new Date(), completionId], client);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error claiming mission reward', { completionId, error: error.message });
      throw error;
    }
  }

  /**
   * Soft delete mission (set status to inactive)
   * @param {string} id - Mission ID
   * @returns {boolean} - True if deleted
   */
  async softDelete(id) {
    try {
      const result = await this.update(id, { status: 'inactive' });
      return result !== null;
    } catch (error) {
      logger.error('Error soft deleting mission', { id, error: error.message });
      throw error;
    }
  }
}

module.exports = MissionRepository;