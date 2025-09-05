/**
 * Audit Log Repository
 * Handles database operations for audit logs
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../utils');

class AuditLogRepository extends BaseRepository {
  constructor() {
    super('audit_logs');
  }

  /**
   * Create audit log entry
   * @param {object} logData - Audit log data
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Created audit log
   */
  async create(logData, client = null) {
    try {
      const normalizedData = {
        ...logData,
        ip_address: logData.ip_address || null,
        user_agent: logData.user_agent || null,
        metadata: logData.metadata || {},
        status: logData.status || 'success'
      };

      return await super.create(normalizedData, client);
    } catch (error) {
      logger.error('Error creating audit log', { logData, error: error.message });
      throw error;
    }
  }

  /**
   * Log user action
   * @param {object} actionData - Action data
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Created audit log
   */
  async logUserAction(actionData, client = null) {
    try {
      const logData = {
        user_id: actionData.user_id,
        member_id: actionData.member_id || null,
        brand_id: actionData.brand_id || null,
        action: actionData.action,
        resource_type: actionData.resource_type || null,
        resource_id: actionData.resource_id || null,
        description: actionData.description || null,
        ip_address: actionData.ip_address || null,
        user_agent: actionData.user_agent || null,
        metadata: actionData.metadata || {},
        status: actionData.status || 'success'
      };

      return await this.create(logData, client);
    } catch (error) {
      logger.error('Error logging user action', { actionData, error: error.message });
      throw error;
    }
  }

  /**
   * Log system action
   * @param {object} actionData - Action data
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Created audit log
   */
  async logSystemAction(actionData, client = null) {
    try {
      const logData = {
        user_id: null, // System actions don't have a user
        member_id: actionData.member_id || null,
        brand_id: actionData.brand_id || null,
        action: actionData.action,
        resource_type: actionData.resource_type || 'system',
        resource_id: actionData.resource_id || null,
        description: actionData.description || null,
        metadata: {
          ...actionData.metadata || {},
          system_action: true
        },
        status: actionData.status || 'success'
      };

      return await this.create(logData, client);
    } catch (error) {
      logger.error('Error logging system action', { actionData, error: error.message });
      throw error;
    }
  }

  /**
   * Find audit logs by user with pagination
   * @param {string} userId - User ID
   * @param {object} options - Query options
   * @returns {object} - Paginated audit logs
   */
  async findByUser(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        action = null,
        startDate = null,
        endDate = null,
        status = null,
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      let whereClause = 'WHERE al.user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      // Add action filter
      if (action) {
        whereClause += ` AND al.action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
      }

      // Add status filter
      if (status) {
        whereClause += ` AND al.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      // Add date filters
      if (startDate) {
        whereClause += ` AND al.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND al.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM audit_logs al 
        ${whereClause}
      `;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get records
      const dataQuery = `
        SELECT 
          al.*,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          m.first_name as member_first_name,
          m.last_name as member_last_name,
          b.name as brand_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN members m ON al.member_id = m.id
        LEFT JOIN brands b ON al.brand_id = b.id
        ${whereClause}
        ORDER BY al.${orderBy} ${order}
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
      logger.error('Error finding audit logs by user', { userId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Find audit logs by brand with pagination
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Paginated audit logs
   */
  async findByBrand(brandId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        action = null,
        userId = null,
        startDate = null,
        endDate = null,
        status = null,
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      let whereClause = 'WHERE al.brand_id = $1';
      const params = [brandId];
      let paramIndex = 2;

      // Add action filter
      if (action) {
        whereClause += ` AND al.action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
      }

      // Add user filter
      if (userId) {
        whereClause += ` AND al.user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      // Add status filter
      if (status) {
        whereClause += ` AND al.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      // Add date filters
      if (startDate) {
        whereClause += ` AND al.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND al.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM audit_logs al 
        ${whereClause}
      `;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get records
      const dataQuery = `
        SELECT 
          al.*,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          m.first_name as member_first_name,
          m.last_name as member_last_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN members m ON al.member_id = m.id
        ${whereClause}
        ORDER BY al.${orderBy} ${order}
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
      logger.error('Error finding audit logs by brand', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Find audit logs by resource
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {object} options - Query options
   * @returns {object} - Paginated audit logs
   */
  async findByResource(resourceType, resourceId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        action = null,
        startDate = null,
        endDate = null,
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      let whereClause = 'WHERE al.resource_type = $1 AND al.resource_id = $2';
      const params = [resourceType, resourceId];
      let paramIndex = 3;

      // Add action filter
      if (action) {
        whereClause += ` AND al.action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
      }

      // Add date filters
      if (startDate) {
        whereClause += ` AND al.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND al.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM audit_logs al 
        ${whereClause}
      `;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get records
      const dataQuery = `
        SELECT 
          al.*,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          m.first_name as member_first_name,
          m.last_name as member_last_name,
          b.name as brand_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN members m ON al.member_id = m.id
        LEFT JOIN brands b ON al.brand_id = b.id
        ${whereClause}
        ORDER BY al.${orderBy} ${order}
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
      logger.error('Error finding audit logs by resource', { resourceType, resourceId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param {object} options - Query options
   * @returns {object} - Audit statistics
   */
  async getAuditStatistics(options = {}) {
    try {
      const {
        brandId = null,
        userId = null,
        startDate = null,
        endDate = null
      } = options;

      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (brandId) {
        whereClause += ` AND brand_id = $${paramIndex}`;
        params.push(brandId);
        paramIndex++;
      }

      if (userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          COUNT(*) as total_logs,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT brand_id) as unique_brands,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_actions,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_actions,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as logs_last_24h,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as logs_last_7d,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as logs_last_30d
        FROM audit_logs 
        ${whereClause}
      `;

      const result = await this.query(query, params);
      
      if (result.rows.length === 0) {
        return {
          total_logs: 0,
          unique_users: 0,
          unique_brands: 0,
          successful_actions: 0,
          failed_actions: 0,
          logs_last_24h: 0,
          logs_last_7d: 0,
          logs_last_30d: 0,
          success_rate: 0
        };
      }

      const stats = result.rows[0];
      stats.success_rate = stats.total_logs > 0 ? (stats.successful_actions / stats.total_logs) : 0;
      
      return stats;
    } catch (error) {
      logger.error('Error getting audit statistics', { options, error: error.message });
      throw error;
    }
  }

  /**
   * Get action breakdown
   * @param {object} options - Query options
   * @returns {array} - Action breakdown
   */
  async getActionBreakdown(options = {}) {
    try {
      const {
        brandId = null,
        userId = null,
        startDate = null,
        endDate = null,
        limit = 20
      } = options;

      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (brandId) {
        whereClause += ` AND brand_id = $${paramIndex}`;
        params.push(brandId);
        paramIndex++;
      }

      if (userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          action,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_count,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_count
        FROM audit_logs 
        ${whereClause}
        GROUP BY action
        ORDER BY count DESC
        LIMIT $${paramIndex}
      `;

      params.push(limit);
      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting action breakdown', { options, error: error.message });
      throw error;
    }
  }

  /**
   * Get recent security events
   * @param {object} options - Query options
   * @returns {array} - Recent security events
   */
  async getRecentSecurityEvents(options = {}) {
    try {
      const {
        brandId = null,
        limit = 50,
        hours = 24
      } = options;

      let whereClause = `
        WHERE created_at > NOW() - INTERVAL '${hours} hours'
        AND (
          action LIKE '%login%' 
          OR action LIKE '%password%' 
          OR action LIKE '%permission%'
          OR action LIKE '%access%'
          OR status = 'error'
        )
      `;
      const params = [];
      let paramIndex = 1;

      if (brandId) {
        whereClause += ` AND brand_id = $${paramIndex}`;
        params.push(brandId);
        paramIndex++;
      }

      const query = `
        SELECT 
          al.*,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          u.email as user_email,
          b.name as brand_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN brands b ON al.brand_id = b.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramIndex}
      `;

      params.push(limit);
      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting recent security events', { options, error: error.message });
      throw error;
    }
  }

  /**
   * Clean old audit logs
   * @param {number} daysToKeep - Number of days to keep logs
   * @returns {number} - Number of deleted logs
   */
  async cleanOldLogs(daysToKeep = 90) {
    try {
      const query = `
        DELETE FROM audit_logs 
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      `;

      const result = await this.query(query);
      
      logger.logBusiness('Cleaned old audit logs', {
        daysToKeep,
        deletedCount: result.rowCount
      });

      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning old audit logs', { daysToKeep, error: error.message });
      throw error;
    }
  }
}

module.exports = AuditLogRepository;