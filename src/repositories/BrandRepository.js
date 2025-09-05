/**
 * Brand Repository
 * Handles database operations for brands
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../utils');

class BrandRepository extends BaseRepository {
  constructor() {
    super('brands');
  }

  /**
   * Find brand by slug
   * @param {string} slug - Brand slug
   * @returns {object|null} - Brand or null
   */
  async findBySlug(slug) {
    try {
      return await this.findOne({ slug, status: 'active' });
    } catch (error) {
      logger.error('Error finding brand by slug', { slug, error: error.message });
      throw error;
    }
  }

  /**
   * Find brand with settings
   * @param {string} id - Brand ID
   * @returns {object|null} - Brand with settings or null
   */
  async findWithSettings(id) {
    try {
      const query = `
        SELECT 
          b.*,
          bs.wheel_config,
          bs.mission_config,
          bs.point_config,
          bs.notification_config,
          bs.theme_config
        FROM brands b
        LEFT JOIN brand_settings bs ON b.id = bs.brand_id
        WHERE b.id = $1 AND b.status = 'active'
      `;
      
      const result = await this.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error finding brand with settings', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Create brand with default settings
   * @param {object} brandData - Brand data
   * @param {object} settingsData - Settings data
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Created brand with settings
   */
  async createWithSettings(brandData, settingsData = {}, client = null) {
    const executeQuery = async (dbClient) => {
      // Create brand
      const brand = await this.create(brandData, dbClient);
      
      // Create default settings
      const defaultSettings = {
        brand_id: brand.id,
        wheel_config: {
          max_daily_spins: 3,
          spin_cooldown_minutes: 60,
          default_items: [
            { name: 'Better luck next time!', type: 'nothing', value: 0, probability: 0.4 },
            { name: '10 Points', type: 'points', value: 10, probability: 0.3 },
            { name: '25 Points', type: 'points', value: 25, probability: 0.2 },
            { name: '50 Points', type: 'points', value: 50, probability: 0.1 }
          ]
        },
        mission_config: {
          daily_mission_limit: 5,
          weekly_mission_limit: 3,
          auto_assign_missions: true,
          default_point_rewards: {
            easy: 10,
            medium: 25,
            hard: 50
          }
        },
        point_config: {
          currency_name: 'Points',
          currency_symbol: 'pts',
          point_expiry_days: 365,
          minimum_redemption: 100,
          welcome_bonus: 50
        },
        notification_config: {
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          marketing_emails: true
        },
        theme_config: {
          primary_color: '#007bff',
          secondary_color: '#6c757d',
          accent_color: '#28a745',
          background_color: '#ffffff',
          text_color: '#212529',
          logo_url: null,
          favicon_url: null
        },
        ...settingsData
      };

      const settingsQuery = `
        INSERT INTO brand_settings (
          brand_id, wheel_config, mission_config, point_config, 
          notification_config, theme_config, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const now = new Date();
      const settingsResult = await this.query(settingsQuery, [
        defaultSettings.brand_id,
        JSON.stringify(defaultSettings.wheel_config),
        JSON.stringify(defaultSettings.mission_config),
        JSON.stringify(defaultSettings.point_config),
        JSON.stringify(defaultSettings.notification_config),
        JSON.stringify(defaultSettings.theme_config),
        now,
        now
      ], dbClient);

      return {
        ...brand,
        settings: settingsResult.rows[0]
      };
    };

    if (client) {
      return await executeQuery(client);
    } else {
      return await this.withTransaction(executeQuery);
    }
  }

  /**
   * Update brand settings
   * @param {string} brandId - Brand ID
   * @param {object} settingsData - Settings data to update
   * @returns {object|null} - Updated settings or null
   */
  async updateSettings(brandId, settingsData) {
    try {
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      // Build dynamic update query
      for (const [key, value] of Object.entries(settingsData)) {
        if (['wheel_config', 'mission_config', 'point_config', 'notification_config', 'theme_config'].includes(key)) {
          updateFields.push(`${key} = $${paramIndex++}`);
          params.push(JSON.stringify(value));
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid settings fields to update');
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      params.push(new Date());
      params.push(brandId);

      const query = `
        UPDATE brand_settings 
        SET ${updateFields.join(', ')}
        WHERE brand_id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.query(query, params);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error updating brand settings', { brandId, error: error.message });
      throw error;
    }
  }

  /**
   * Get brand statistics
   * @param {string} brandId - Brand ID
   * @returns {object} - Brand statistics
   */
  async getStatistics(brandId) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT m.id) as total_members,
          COUNT(DISTINCT CASE WHEN m.last_activity_at > NOW() - INTERVAL '30 days' THEN m.id END) as active_members,
          COUNT(DISTINCT ws.id) as total_spins,
          COUNT(DISTINCT CASE WHEN ws.created_at > NOW() - INTERVAL '7 days' THEN ws.id END) as weekly_spins,
          COUNT(DISTINCT mc.id) as total_missions_completed,
          COUNT(DISTINCT CASE WHEN mc.completed_at > NOW() - INTERVAL '7 days' THEN mc.id END) as weekly_missions_completed,
          COALESCE(SUM(t.points), 0) as total_points_distributed,
          COALESCE(SUM(CASE WHEN t.created_at > NOW() - INTERVAL '7 days' THEN t.points ELSE 0 END), 0) as weekly_points_distributed
        FROM brands b
        LEFT JOIN members m ON b.id = m.brand_id
        LEFT JOIN wheel_spins ws ON m.id = ws.member_id
        LEFT JOIN mission_completions mc ON m.id = mc.member_id
        LEFT JOIN transactions t ON m.id = t.member_id AND t.type IN ('points_earned', 'wheel_win', 'mission_reward')
        WHERE b.id = $1
        GROUP BY b.id
      `;

      const result = await this.query(query, [brandId]);
      
      if (result.rows.length === 0) {
        return {
          total_members: 0,
          active_members: 0,
          total_spins: 0,
          weekly_spins: 0,
          total_missions_completed: 0,
          weekly_missions_completed: 0,
          total_points_distributed: 0,
          weekly_points_distributed: 0
        };
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting brand statistics', { brandId, error: error.message });
      throw error;
    }
  }

  /**
   * Get brands with pagination and search
   * @param {object} options - Query options
   * @returns {object} - Paginated brands
   */
  async findWithSearch(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        status = null,
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      // Add search condition
      if (search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR slug ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Add status filter
      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM brands ${whereClause}`;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get records
      const dataQuery = `
        SELECT 
          id, name, slug, description, logo_url, website_url, 
          status, created_at, updated_at
        FROM brands 
        ${whereClause}
        ORDER BY ${orderBy} ${order}
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
      logger.error('Error finding brands with search', { options, error: error.message });
      throw error;
    }
  }

  /**
   * Check if slug is available
   * @param {string} slug - Slug to check
   * @param {string} excludeId - ID to exclude from check
   * @returns {boolean} - True if available
   */
  async isSlugAvailable(slug, excludeId = null) {
    try {
      let query = 'SELECT id FROM brands WHERE slug = $1';
      const params = [slug];

      if (excludeId) {
        query += ' AND id != $2';
        params.push(excludeId);
      }

      const result = await this.query(query, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Error checking slug availability', { slug, excludeId, error: error.message });
      throw error;
    }
  }

  /**
   * Get brand member tiers
   * @param {string} brandId - Brand ID
   * @returns {array} - Member tiers
   */
  async getMemberTiers(brandId) {
    try {
      const query = `
        SELECT * FROM member_tiers 
        WHERE brand_id = $1 AND status = 'active'
        ORDER BY min_points ASC
      `;
      
      const result = await this.query(query, [brandId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting member tiers', { brandId, error: error.message });
      throw error;
    }
  }

  /**
   * Soft delete brand (set status to inactive)
   * @param {string} id - Brand ID
   * @returns {boolean} - True if deleted
   */
  async softDelete(id) {
    try {
      const result = await this.update(id, { status: 'inactive' });
      return result !== null;
    } catch (error) {
      logger.error('Error soft deleting brand', { id, error: error.message });
      throw error;
    }
  }
}

module.exports = BrandRepository;