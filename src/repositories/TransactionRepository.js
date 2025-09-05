/**
 * Transaction Repository
 * Handles database operations for transactions
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../utils');

class TransactionRepository extends BaseRepository {
  constructor() {
    super('transactions');
  }

  /**
   * Create transaction with validation
   * @param {object} transactionData - Transaction data
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Created transaction
   */
  async create(transactionData, client = null) {
    try {
      const normalizedData = {
        ...transactionData,
        status: transactionData.status || 'completed',
        metadata: transactionData.metadata || {}
      };

      return await super.create(normalizedData, client);
    } catch (error) {
      logger.error('Error creating transaction', { transactionData, error: error.message });
      throw error;
    }
  }

  /**
   * Find transactions by member with pagination
   * @param {string} memberId - Member ID
   * @param {object} options - Query options
   * @returns {object} - Paginated transactions
   */
  async findByMember(memberId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = null,
        startDate = null,
        endDate = null,
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      let whereClause = 'WHERE t.member_id = $1';
      const params = [memberId];
      let paramIndex = 2;

      // Add type filter
      if (type) {
        whereClause += ` AND t.type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      // Add date filters
      if (startDate) {
        whereClause += ` AND t.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND t.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM transactions t 
        ${whereClause}
      `;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get records
      const dataQuery = `
        SELECT 
          t.*,
          m.first_name as member_first_name,
          m.last_name as member_last_name
        FROM transactions t
        LEFT JOIN members m ON t.member_id = m.id
        ${whereClause}
        ORDER BY t.${orderBy} ${order}
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
      logger.error('Error finding transactions by member', { memberId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Find transactions by brand with pagination
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Paginated transactions
   */
  async findByBrand(brandId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = null,
        startDate = null,
        endDate = null,
        memberId = null,
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      let whereClause = 'WHERE m.brand_id = $1';
      const params = [brandId];
      let paramIndex = 2;

      // Add type filter
      if (type) {
        whereClause += ` AND t.type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      // Add member filter
      if (memberId) {
        whereClause += ` AND t.member_id = $${paramIndex}`;
        params.push(memberId);
        paramIndex++;
      }

      // Add date filters
      if (startDate) {
        whereClause += ` AND t.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND t.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM transactions t
        JOIN members m ON t.member_id = m.id
        ${whereClause}
      `;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get records
      const dataQuery = `
        SELECT 
          t.*,
          m.first_name as member_first_name,
          m.last_name as member_last_name,
          m.email as member_email
        FROM transactions t
        JOIN members m ON t.member_id = m.id
        ${whereClause}
        ORDER BY t.${orderBy} ${order}
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
      logger.error('Error finding transactions by brand', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get member's points balance from transactions
   * @param {string} memberId - Member ID
   * @returns {number} - Current points balance
   */
  async getMemberPointsBalance(memberId) {
    try {
      const query = `
        SELECT COALESCE(SUM(points), 0) as balance
        FROM transactions 
        WHERE member_id = $1 AND status = 'completed'
      `;

      const result = await this.query(query, [memberId]);
      return parseInt(result.rows[0].balance);
    } catch (error) {
      logger.error('Error getting member points balance', { memberId, error: error.message });
      throw error;
    }
  }

  /**
   * Get transaction statistics for member
   * @param {string} memberId - Member ID
   * @param {object} options - Query options
   * @returns {object} - Transaction statistics
   */
  async getMemberStatistics(memberId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null
      } = options;

      let dateFilter = '';
      const params = [memberId];
      let paramIndex = 2;

      if (startDate) {
        dateFilter += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        dateFilter += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) as total_earned,
          COALESCE(SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END), 0) as total_spent,
          COALESCE(SUM(points), 0) as net_points,
          COUNT(CASE WHEN type = 'wheel_win' THEN 1 END) as wheel_wins,
          COUNT(CASE WHEN type = 'mission_reward' THEN 1 END) as mission_rewards,
          COUNT(CASE WHEN type = 'points_spent' THEN 1 END) as redemptions,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as transactions_last_7d,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as transactions_last_30d
        FROM transactions 
        WHERE member_id = $1 AND status = 'completed' ${dateFilter}
      `;

      const result = await this.query(query, params);
      
      if (result.rows.length === 0) {
        return {
          total_transactions: 0,
          total_earned: 0,
          total_spent: 0,
          net_points: 0,
          wheel_wins: 0,
          mission_rewards: 0,
          redemptions: 0,
          transactions_last_7d: 0,
          transactions_last_30d: 0
        };
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting member transaction statistics', { memberId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get brand transaction statistics
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Brand transaction statistics
   */
  async getBrandStatistics(brandId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null
      } = options;

      let dateFilter = '';
      const params = [brandId];
      let paramIndex = 2;

      if (startDate) {
        dateFilter += ` AND t.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        dateFilter += ` AND t.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          COUNT(t.id) as total_transactions,
          COUNT(DISTINCT t.member_id) as unique_members,
          COALESCE(SUM(CASE WHEN t.points > 0 THEN t.points ELSE 0 END), 0) as total_points_distributed,
          COALESCE(SUM(CASE WHEN t.points < 0 THEN ABS(t.points) ELSE 0 END), 0) as total_points_redeemed,
          COALESCE(SUM(t.points), 0) as net_points_flow,
          COUNT(CASE WHEN t.type = 'wheel_win' THEN 1 END) as wheel_transactions,
          COUNT(CASE WHEN t.type = 'mission_reward' THEN 1 END) as mission_transactions,
          COUNT(CASE WHEN t.type = 'points_spent' THEN 1 END) as redemption_transactions,
          COUNT(CASE WHEN t.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as transactions_last_24h,
          COUNT(CASE WHEN t.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as transactions_last_7d,
          COUNT(CASE WHEN t.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as transactions_last_30d,
          COALESCE(AVG(CASE WHEN t.points > 0 THEN t.points END), 0) as avg_points_per_earning,
          COALESCE(AVG(CASE WHEN t.points < 0 THEN ABS(t.points) END), 0) as avg_points_per_redemption
        FROM transactions t
        JOIN members m ON t.member_id = m.id
        WHERE m.brand_id = $1 AND t.status = 'completed' ${dateFilter}
      `;

      const result = await this.query(query, params);
      
      if (result.rows.length === 0) {
        return {
          total_transactions: 0,
          unique_members: 0,
          total_points_distributed: 0,
          total_points_redeemed: 0,
          net_points_flow: 0,
          wheel_transactions: 0,
          mission_transactions: 0,
          redemption_transactions: 0,
          transactions_last_24h: 0,
          transactions_last_7d: 0,
          transactions_last_30d: 0,
          avg_points_per_earning: 0,
          avg_points_per_redemption: 0
        };
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting brand transaction statistics', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get transaction trends
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {array} - Transaction trends data
   */
  async getTransactionTrends(brandId, options = {}) {
    try {
      const {
        period = 'daily', // 'daily', 'weekly', 'monthly'
        days = 30,
        type = null
      } = options;

      let dateFormat = 'DATE(created_at)';
      let interval = '1 day';
      
      if (period === 'weekly') {
        dateFormat = 'DATE_TRUNC(\'week\', created_at)';
        interval = '1 week';
      } else if (period === 'monthly') {
        dateFormat = 'DATE_TRUNC(\'month\', created_at)';
        interval = '1 month';
      }

      let typeFilter = '';
      const params = [brandId, days];
      let paramIndex = 3;

      if (type) {
        typeFilter = ` AND t.type = $${paramIndex}`;
        params.push(type);
      }

      const query = `
        SELECT 
          ${dateFormat} as period,
          COUNT(t.id) as transaction_count,
          COUNT(DISTINCT t.member_id) as unique_members,
          COALESCE(SUM(CASE WHEN t.points > 0 THEN t.points ELSE 0 END), 0) as points_earned,
          COALESCE(SUM(CASE WHEN t.points < 0 THEN ABS(t.points) ELSE 0 END), 0) as points_spent,
          COALESCE(SUM(t.points), 0) as net_points
        FROM transactions t
        JOIN members m ON t.member_id = m.id
        WHERE m.brand_id = $1 
        AND t.created_at >= NOW() - INTERVAL '$2 ${interval.split(' ')[1]}'
        AND t.status = 'completed'
        ${typeFilter}
        GROUP BY ${dateFormat}
        ORDER BY period DESC
      `;

      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting transaction trends', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get top spending members
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {array} - Top spending members
   */
  async getTopSpendingMembers(brandId, options = {}) {
    try {
      const {
        limit = 10,
        startDate = null,
        endDate = null,
        type = 'points_spent'
      } = options;

      let dateFilter = '';
      const params = [brandId, type];
      let paramIndex = 3;

      if (startDate) {
        dateFilter += ` AND t.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        dateFilter += ` AND t.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          m.id,
          m.first_name,
          m.last_name,
          m.email,
          COUNT(t.id) as transaction_count,
          COALESCE(SUM(ABS(t.points)), 0) as total_points,
          COALESCE(AVG(ABS(t.points)), 0) as avg_points_per_transaction
        FROM members m
        JOIN transactions t ON m.id = t.member_id
        WHERE m.brand_id = $1 
        AND t.type = $2
        AND t.status = 'completed'
        ${dateFilter}
        GROUP BY m.id, m.first_name, m.last_name, m.email
        ORDER BY total_points DESC
        LIMIT $${paramIndex}
      `;

      params.push(limit);
      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting top spending members', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Get transaction type breakdown
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {array} - Transaction type breakdown
   */
  async getTransactionTypeBreakdown(brandId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null
      } = options;

      let dateFilter = '';
      const params = [brandId];
      let paramIndex = 2;

      if (startDate) {
        dateFilter += ` AND t.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        dateFilter += ` AND t.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const query = `
        SELECT 
          t.type,
          COUNT(t.id) as transaction_count,
          COUNT(DISTINCT t.member_id) as unique_members,
          COALESCE(SUM(t.points), 0) as total_points,
          COALESCE(AVG(t.points), 0) as avg_points_per_transaction,
          COALESCE(SUM(CASE WHEN t.points > 0 THEN t.points ELSE 0 END), 0) as points_earned,
          COALESCE(SUM(CASE WHEN t.points < 0 THEN ABS(t.points) ELSE 0 END), 0) as points_spent
        FROM transactions t
        JOIN members m ON t.member_id = m.id
        WHERE m.brand_id = $1 
        AND t.status = 'completed'
        ${dateFilter}
        GROUP BY t.type
        ORDER BY transaction_count DESC
      `;

      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting transaction type breakdown', { brandId, options, error: error.message });
      throw error;
    }
  }

  /**
   * Reverse transaction (create opposite transaction)
   * @param {string} transactionId - Original transaction ID
   * @param {string} reason - Reason for reversal
   * @param {object} client - Database client (for transaction)
   * @returns {object} - Reversal transaction
   */
  async reverseTransaction(transactionId, reason, client = null) {
    try {
      const executeQuery = async (dbClient) => {
        // Get original transaction
        const original = await this.findById(transactionId);
        if (!original) {
          throw new Error('Original transaction not found');
        }

        if (original.status === 'reversed') {
          throw new Error('Transaction already reversed');
        }

        // Create reversal transaction
        const reversalData = {
          member_id: original.member_id,
          type: 'admin_adjustment',
          points: -original.points, // Opposite amount
          description: `Reversal of transaction ${transactionId}: ${reason}`,
          reference_id: transactionId,
          reference_type: 'transaction_reversal',
          status: 'completed',
          metadata: {
            original_transaction_id: transactionId,
            reversal_reason: reason,
            original_type: original.type,
            original_points: original.points
          }
        };

        const reversal = await this.create(reversalData, dbClient);

        // Mark original transaction as reversed
        await this.update(transactionId, { status: 'reversed' }, dbClient);

        return reversal;
      };

      if (client) {
        return await executeQuery(client);
      } else {
        return await this.withTransaction(executeQuery);
      }
    } catch (error) {
      logger.error('Error reversing transaction', { transactionId, reason, error: error.message });
      throw error;
    }
  }
}

module.exports = TransactionRepository;