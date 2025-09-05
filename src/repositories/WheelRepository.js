/**
 * Wheel Repository
 * Handles database operations for wheels and wheel spins
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../utils');

class WheelRepository extends BaseRepository {
  constructor() {
    super('wheels');
  }

  /**
   * Find wheel by brand with items
   * @param {string} brandId - Brand ID
   * @returns {object|null} - Wheel with items or null
   */
  async findByBrandWithItems(brandId) {
    try {
      const query = `
        SELECT 
          w.*,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', wi.id,
                'name', wi.name,
                'type', wi.type,
                'value', wi.value,
                'probability', wi.probability,
                'color', wi.color,
                'icon', wi.icon,
                'description', wi.description,
                'is_active', wi.is_active
              ) ORDER BY wi.position
            ) FILTER (WHERE wi.id IS NOT NULL),
            '[]'
          ) as items
        FROM wheels w
        LEFT JOIN wheel_items wi ON w.id = wi.wheel_id AND wi.is_active = true
        WHERE w.brand_id = $1 AND w.is_active = true
        GROUP BY w.id
        ORDER BY w.created_at DESC
        LIMIT 1
      `;
      
      const result = await this.query(query, [brandId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error finding wheel by brand with items', { brandId, error: error.message });
      throw error;
    }
  }

  /**
   * Find wheel with items by ID
   * @param {string} wheelId - Wheel ID
   * @returns {object|null} - Wheel with items or null
   */
  async findWithItems(wheelId) {
    try {
      const query = `
        SELECT 
          w.*,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', wi.id,
                'name', wi.name,
                'type', wi.type,
                'value', wi.value,
                'probability', wi.probability,
                'color', wi.color,
                'icon', wi.icon,
                'description', wi.description,
                'is_active', wi.is_active,
                'position', wi.position
              ) ORDER BY wi.position
            ) FILTER (WHERE wi.id IS NOT NULL),
            '[]'
          ) as items
        FROM wheels w
        LEFT JOIN wheel_items wi ON w.id = wi.wheel_id
        WHERE w.id = $1
        GROUP BY w.id
      `;
      
      const result = await this.query(query, [wheelId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error finding wheel with items', { wheelId, error: error.message });
      throw error;
    }
  }

  /**
   * Create wheel with items
   * @param {object} wheelData - Wheel data
   * @param {array} items - Wheel items
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Created wheel with items
   */
  async createWithItems(wheelData, items = [], client = null) {
    const executeQuery = async (dbClient) => {
      // Create wheel
      const wheel = await this.create(wheelData, dbClient);
      
      // Create wheel items
      if (items.length > 0) {
        const itemsQuery = `
          INSERT INTO wheel_items (
            id, wheel_id, name, type, value, probability, color, icon, 
            description, position, is_active, created_at, updated_at
          )
          VALUES ${items.map((_, index) => {
            const base = index * 12 + 1;
            return `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`;
          }).join(', ')}
          RETURNING *
        `;

        const { v4: uuidv4 } = require('uuid');
        const now = new Date();
        const itemsParams = [];
        
        items.forEach((item, index) => {
          itemsParams.push(
            uuidv4(), // id
            wheel.id, // wheel_id
            item.name,
            item.type,
            item.value || 0,
            item.probability,
            item.color || '#007bff',
            item.icon || null,
            item.description || null,
            item.position || index,
            item.is_active !== false, // default to true
            now, // created_at
            now  // updated_at
          );
        });

        const itemsResult = await this.query(itemsQuery, itemsParams, dbClient);
        wheel.items = itemsResult.rows;
      } else {
        wheel.items = [];
      }

      return wheel;
    };

    if (client) {
      return await executeQuery(client);
    } else {
      return await this.withTransaction(executeQuery);
    }
  }

  /**
   * Update wheel items
   * @param {string} wheelId - Wheel ID
   * @param {array} items - Updated wheel items
   * @param {object} client - Database client (for transaction)
   * @returns {array} - Updated items
   */
  async updateItems(wheelId, items, client = null) {
    const executeQuery = async (dbClient) => {
      // Delete existing items
      await this.query('DELETE FROM wheel_items WHERE wheel_id = $1', [wheelId], dbClient);
      
      // Insert new items
      if (items.length > 0) {
        const itemsQuery = `
          INSERT INTO wheel_items (
            id, wheel_id, name, type, value, probability, color, icon, 
            description, position, is_active, created_at, updated_at
          )
          VALUES ${items.map((_, index) => {
            const base = index * 12 + 1;
            return `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`;
          }).join(', ')}
          RETURNING *
        `;

        const { v4: uuidv4 } = require('uuid');
        const now = new Date();
        const itemsParams = [];
        
        items.forEach((item, index) => {
          itemsParams.push(
            item.id || uuidv4(), // id
            wheelId, // wheel_id
            item.name,
            item.type,
            item.value || 0,
            item.probability,
            item.color || '#007bff',
            item.icon || null,
            item.description || null,
            item.position || index,
            item.is_active !== false, // default to true
            now, // created_at
            now  // updated_at
          );
        });

        const result = await this.query(itemsQuery, itemsParams, dbClient);
        return result.rows;
      }
      
      return [];
    };

    if (client) {
      return await executeQuery(client);
    } else {
      return await this.withTransaction(executeQuery);
    }
  }

  /**
   * Record wheel spin
   * @param {object} spinData - Spin data
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Created spin record
   */
  async recordSpin(spinData, client = null) {
    try {
      const query = `
        INSERT INTO wheel_spins (
          id, member_id, wheel_id, wheel_item_id, result_type, result_value,
          is_winner, spin_data, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const { v4: uuidv4 } = require('uuid');
      const now = new Date();
      
      const params = [
        uuidv4(),
        spinData.member_id,
        spinData.wheel_id,
        spinData.wheel_item_id,
        spinData.result_type,
        spinData.result_value || 0,
        spinData.is_winner || false,
        JSON.stringify(spinData.spin_data || {}),
        now,
        now
      ];

      const result = await this.query(query, params, client);
      return result.rows[0];
    } catch (error) {
      logger.error('Error recording wheel spin', { spinData, error: error.message });
      throw error;
    }
  }

  /**
   * Get member's spin history
   * @param {string} memberId - Member ID
   * @param {object} options - Query options
   * @returns {object} - Paginated spin history
   */
  async getMemberSpinHistory(memberId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        startDate = null,
        endDate = null
      } = options;

      let whereClause = 'WHERE ws.member_id = $1';
      const params = [memberId];
      let paramIndex = 2;

      if (startDate) {
        whereClause += ` AND ws.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND ws.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM wheel_spins ws 
        ${whereClause}
      `;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get records
      const dataQuery = `
        SELECT 
          ws.*,
          wi.name as item_name,
          wi.type as item_type,
          wi.color as item_color,
          wi.icon as item_icon
        FROM wheel_spins ws
        LEFT JOIN wheel_items wi ON ws.wheel_item_id = wi.id
        ${whereClause}
        ORDER BY ws.created_at DESC
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
      logger.error('Error getting member spin history', { memberId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get wheel statistics
   * @param {string} wheelId - Wheel ID
   * @param {object} options - Query options
   * @returns {object} - Wheel statistics
   */
  async getWheelStatistics(wheelId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null
      } = options;

      let dateFilter = '';
      const params = [wheelId];
      let paramIndex = 2;

      if (startDate) {
        dateFilter += ` AND ws.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        dateFilter += ` AND ws.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          COUNT(*) as total_spins,
          COUNT(CASE WHEN ws.is_winner = true THEN 1 END) as winning_spins,
          COUNT(DISTINCT ws.member_id) as unique_spinners,
          COALESCE(SUM(ws.result_value), 0) as total_value_distributed,
          COALESCE(AVG(ws.result_value), 0) as average_value_per_spin,
          COUNT(CASE WHEN ws.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as spins_last_24h,
          COUNT(CASE WHEN ws.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as spins_last_7d
        FROM wheel_spins ws
        WHERE ws.wheel_id = $1 ${dateFilter}
      `;

      const result = await this.query(query, params);
      
      if (result.rows.length === 0) {
        return {
          total_spins: 0,
          winning_spins: 0,
          unique_spinners: 0,
          total_value_distributed: 0,
          average_value_per_spin: 0,
          spins_last_24h: 0,
          spins_last_7d: 0,
          win_rate: 0
        };
      }

      const stats = result.rows[0];
      stats.win_rate = stats.total_spins > 0 ? (stats.winning_spins / stats.total_spins) : 0;
      
      return stats;
    } catch (error) {
      logger.error('Error getting wheel statistics', { wheelId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get item performance statistics
   * @param {string} wheelId - Wheel ID
   * @param {object} options - Query options
   * @returns {array} - Item performance data
   */
  async getItemPerformance(wheelId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null
      } = options;

      let dateFilter = '';
      const params = [wheelId];
      let paramIndex = 2;

      if (startDate) {
        dateFilter += ` AND ws.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        dateFilter += ` AND ws.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          wi.id,
          wi.name,
          wi.type,
          wi.probability as expected_probability,
          COUNT(ws.id) as actual_hits,
          COALESCE(SUM(ws.result_value), 0) as total_value_distributed,
          CASE 
            WHEN (SELECT COUNT(*) FROM wheel_spins WHERE wheel_id = $1 ${dateFilter}) > 0 
            THEN COUNT(ws.id)::float / (SELECT COUNT(*) FROM wheel_spins WHERE wheel_id = $1 ${dateFilter})
            ELSE 0 
          END as actual_probability
        FROM wheel_items wi
        LEFT JOIN wheel_spins ws ON wi.id = ws.wheel_item_id ${dateFilter}
        WHERE wi.wheel_id = $1 AND wi.is_active = true
        GROUP BY wi.id, wi.name, wi.type, wi.probability
        ORDER BY wi.position
      `;

      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting item performance', { wheelId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get brand wheel statistics
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Brand wheel statistics
   */
  async getBrandWheelStatistics(brandId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null
      } = options;

      let dateFilter = '';
      const params = [brandId];
      let paramIndex = 2;

      if (startDate) {
        dateFilter += ` AND ws.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        dateFilter += ` AND ws.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          COUNT(DISTINCT w.id) as total_wheels,
          COUNT(ws.id) as total_spins,
          COUNT(CASE WHEN ws.is_winner = true THEN 1 END) as winning_spins,
          COUNT(DISTINCT ws.member_id) as unique_spinners,
          COALESCE(SUM(ws.result_value), 0) as total_value_distributed,
          COUNT(CASE WHEN ws.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as spins_last_24h,
          COUNT(CASE WHEN ws.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as spins_last_7d
        FROM wheels w
        LEFT JOIN wheel_spins ws ON w.id = ws.wheel_id ${dateFilter}
        WHERE w.brand_id = $1
      `;

      const result = await this.query(query, params);
      
      if (result.rows.length === 0) {
        return {
          total_wheels: 0,
          total_spins: 0,
          winning_spins: 0,
          unique_spinners: 0,
          total_value_distributed: 0,
          spins_last_24h: 0,
          spins_last_7d: 0,
          win_rate: 0
        };
      }

      const stats = result.rows[0];
      stats.win_rate = stats.total_spins > 0 ? (stats.winning_spins / stats.total_spins) : 0;
      
      return stats;
    } catch (error) {
      logger.error('Error getting brand wheel statistics', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Validate wheel item probabilities
   * @param {array} items - Wheel items
   * @returns {object} - Validation result
   */
  validateItemProbabilities(items) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        return {
          isValid: false,
          errors: ['Items array is required and cannot be empty']
        };
      }

      const errors = [];
      let totalProbability = 0;

      items.forEach((item, index) => {
        if (typeof item.probability !== 'number') {
          errors.push(`Item ${index + 1}: Probability must be a number`);
        } else if (item.probability < 0 || item.probability > 1) {
          errors.push(`Item ${index + 1}: Probability must be between 0 and 1`);
        } else {
          totalProbability += item.probability;
        }
      });

      // Allow small floating point errors
      const tolerance = 0.001;
      if (Math.abs(totalProbability - 1.0) > tolerance) {
        errors.push(`Total probability must equal 1.0, current sum: ${totalProbability.toFixed(3)}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        totalProbability
      };
    } catch (error) {
      logger.error('Error validating item probabilities', { items, error: error.message });
      return {
        isValid: false,
        errors: ['Error validating probabilities']
      };
    }
  }
}

module.exports = WheelRepository;