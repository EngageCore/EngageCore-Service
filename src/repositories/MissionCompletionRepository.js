/**
 * Mission Completion Repository
 * Handles database operations for mission completions
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../utils');

class MissionCompletionRepository extends BaseRepository {
  constructor() {
    super('mission_completions');
  }

  /**
   * Create a mission completion record
   * @param {object} completionData - Completion data
   * @returns {object} - Created completion record
   */
  async create(completionData) {
    try {
      const query = `
        INSERT INTO mission_completions (
          mission_id, member_id, brand_id, completion_date, 
          progress_value, status, evidence, notes, 
          reward_points, reward_claimed, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        completionData.mission_id,
        completionData.member_id,
        completionData.brand_id,
        completionData.completion_date || new Date(),
        completionData.progress_value || 0,
        completionData.status || 'completed',
        completionData.evidence || null,
        completionData.notes || null,
        completionData.reward_points || 0,
        completionData.reward_claimed || false,
        completionData.created_by
      ];

      const result = await this.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating mission completion:', error);
      throw error;
    }
  }

  /**
   * Find completion by mission and member
   * @param {string} missionId - Mission ID
   * @param {string} memberId - Member ID
   * @returns {object|null} - Completion record or null
   */
  async findByMissionAndMember(missionId, memberId) {
    try {
      const query = `
        SELECT * FROM mission_completions 
        WHERE mission_id = $1 AND member_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await this.query(query, [missionId, memberId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding mission completion:', error);
      throw error;
    }
  }

  /**
   * Get completions for a mission
   * @param {string} missionId - Mission ID
   * @param {object} options - Query options
   * @returns {object} - Paginated completions
   */
  async findByMission(missionId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE mc.mission_id = $1';
      const queryParams = [missionId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        whereClause += ` AND mc.status = $${paramCount}`;
        queryParams.push(status);
      }

      const query = `
        SELECT 
          mc.*,
          m.first_name,
          m.last_name,
          m.email
        FROM mission_completions mc
        JOIN members m ON mc.member_id = m.id
        ${whereClause}
        ORDER BY mc.${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM mission_completions mc
        ${whereClause}
      `;

      const [dataResult, countResult] = await Promise.all([
        this.query(query, queryParams),
        this.query(countQuery, queryParams.slice(0, paramCount))
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        completions: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error finding mission completions:', error);
      throw error;
    }
  }

  /**
   * Get completions for a member
   * @param {string} memberId - Member ID
   * @param {object} options - Query options
   * @returns {object} - Paginated completions
   */
  async findByMember(memberId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE mc.member_id = $1';
      const queryParams = [memberId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        whereClause += ` AND mc.status = $${paramCount}`;
        queryParams.push(status);
      }

      const query = `
        SELECT 
          mc.*,
          mis.name as mission_name,
          mis.description as mission_description,
          mis.type as mission_type
        FROM mission_completions mc
        JOIN missions mis ON mc.mission_id = mis.id
        ${whereClause}
        ORDER BY mc.${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM mission_completions mc
        ${whereClause}
      `;

      const [dataResult, countResult] = await Promise.all([
        this.query(query, queryParams),
        this.query(countQuery, queryParams.slice(0, paramCount))
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        completions: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error finding member completions:', error);
      throw error;
    }
  }

  /**
   * Update completion status
   * @param {string} completionId - Completion ID
   * @param {object} updateData - Update data
   * @returns {object} - Updated completion
   */
  async updateStatus(completionId, updateData) {
    try {
      const query = `
        UPDATE mission_completions 
        SET 
          status = COALESCE($2, status),
          reward_claimed = COALESCE($3, reward_claimed),
          notes = COALESCE($4, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const values = [
        completionId,
        updateData.status,
        updateData.reward_claimed,
        updateData.notes
      ];

      const result = await this.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating mission completion:', error);
      throw error;
    }
  }

  /**
   * Get completion statistics for a mission
   * @param {string} missionId - Mission ID
   * @returns {object} - Completion statistics
   */
  async getCompletionStats(missionId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_completions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN reward_claimed = true THEN 1 END) as rewards_claimed,
          AVG(progress_value) as avg_progress,
          SUM(reward_points) as total_rewards_given
        FROM mission_completions 
        WHERE mission_id = $1
      `;

      const result = await this.query(query, [missionId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting completion stats:', error);
      throw error;
    }
  }

  /**
   * Delete completion record
   * @param {string} completionId - Completion ID
   * @returns {boolean} - Success status
   */
  async delete(completionId) {
    try {
      const query = 'DELETE FROM mission_completions WHERE id = $1';
      const result = await this.query(query, [completionId]);
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting mission completion:', error);
      throw error;
    }
  }
}

module.exports = MissionCompletionRepository;