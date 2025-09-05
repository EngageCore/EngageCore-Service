/**
 * Query Optimization Middleware
 * Implements database query optimizations and connection management
 */

const { logger } = require('../utils');
const { pool } = require('../config/database');

/**
 * Query performance monitoring middleware
 * Logs slow queries and provides performance metrics
 */
function queryPerformanceMonitor(slowQueryThreshold = 1000) {
  return (req, res, next) => {
    // Store original query method
    const originalQuery = pool.query;
    
    // Override pool.query to add performance monitoring
    pool.query = async function(text, params) {
      const startTime = Date.now();
      const queryId = require('crypto').randomUUID().substring(0, 8);
      
      try {
        logger.debug(`[${queryId}] Executing query: ${text.substring(0, 100)}...`);
        
        const result = await originalQuery.call(this, text, params);
        const duration = Date.now() - startTime;
        
        // Log slow queries
        if (duration > slowQueryThreshold) {
          logger.warn(`[${queryId}] Slow query detected (${duration}ms): ${text}`, {
            duration,
            params: params ? params.length : 0,
            rows: result.rows ? result.rows.length : 0
          });
        } else {
          logger.debug(`[${queryId}] Query completed in ${duration}ms`);
        }
        
        // Add performance headers
        if (res && !res.headersSent) {
          res.set('X-Query-Time', `${duration}ms`);
          res.set('X-Query-Count', (parseInt(res.get('X-Query-Count') || '0') + 1).toString());
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`[${queryId}] Query failed after ${duration}ms: ${error.message}`, {
          query: text,
          params,
          error: error.message
        });
        throw error;
      }
    };
    
    // Restore original query method after request
    res.on('finish', () => {
      pool.query = originalQuery;
    });
    
    next();
  };
}

/**
 * Connection pool optimization middleware
 * Manages database connections efficiently
 */
function connectionPoolOptimizer() {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Add connection pool stats to response headers
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (!res.headersSent) {
        res.set('X-Request-Duration', `${duration}ms`);
        res.set('X-Pool-Total', pool.totalCount.toString());
        res.set('X-Pool-Idle', pool.idleCount.toString());
        res.set('X-Pool-Waiting', pool.waitingCount.toString());
      }
      
      // Log connection pool stats for monitoring
      if (duration > 5000) { // Log requests taking more than 5 seconds
        logger.warn('Long request duration detected', {
          duration,
          url: req.originalUrl,
          method: req.method,
          poolStats: {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount
          }
        });
      }
    });
    
    next();
  };
}

/**
 * Query result pagination optimizer
 * Optimizes large result sets with efficient pagination
 */
function paginationOptimizer() {
  return (req, res, next) => {
    // Add pagination helpers to request
    req.getPaginationParams = () => {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      
      return { page, limit, offset };
    };
    
    // Add optimized count query helper
    req.getOptimizedCount = async (baseQuery, params = []) => {
      // Use EXPLAIN for large tables to estimate count
      const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`;
      
      try {
        const result = await pool.query(countQuery, params);
        return parseInt(result.rows[0].total);
      } catch (error) {
        logger.error('Count query failed, using estimate', { error: error.message });
        // Fallback to estimated count for very large tables
        return 0;
      }
    };
    
    next();
  };
}

/**
 * Index usage optimizer
 * Provides hints for better index usage
 */
function indexOptimizer() {
  return (req, res, next) => {
    // Add index usage helpers
    req.addIndexHints = {
      // Common index patterns for better performance
      brandScoped: (brandId) => `/*+ INDEX(brand_id_idx) */ WHERE brand_id = '${brandId}'`,
      dateRange: (startDate, endDate) => `/*+ INDEX(created_at_idx) */ WHERE created_at BETWEEN '${startDate}' AND '${endDate}'`,
      userScoped: (userId) => `/*+ INDEX(user_id_idx) */ WHERE user_id = '${userId}'`,
      statusFilter: (status) => `/*+ INDEX(status_idx) */ WHERE status = '${status}'`
    };
    
    next();
  };
}

/**
 * Transaction optimization middleware
 * Optimizes database transactions for better performance
 */
function transactionOptimizer() {
  return (req, res, next) => {
    // Add optimized transaction helper
    req.optimizedTransaction = async (callback, options = {}) => {
      const { isolationLevel = 'READ COMMITTED', timeout = 30000 } = options;
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
        
        // Set statement timeout
        await client.query(`SET statement_timeout = ${timeout}`);
        
        const result = await callback(client);
        await client.query('COMMIT');
        
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    };
    
    next();
  };
}

/**
 * Bulk operation optimizer
 * Optimizes bulk database operations
 */
function bulkOperationOptimizer() {
  return (req, res, next) => {
    // Add bulk operation helpers
    req.bulkInsert = async (tableName, records, options = {}) => {
      const { batchSize = 1000, onConflict = 'DO NOTHING' } = options;
      
      if (!records || records.length === 0) return [];
      
      const results = [];
      
      // Process in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        if (batch.length === 0) continue;
        
        const columns = Object.keys(batch[0]);
        const values = batch.map((record, index) => {
          const recordValues = columns.map((col, colIndex) => {
            const paramIndex = index * columns.length + colIndex + 1;
            return `$${paramIndex}`;
          });
          return `(${recordValues.join(', ')})`;
        }).join(', ');
        
        const params = batch.flatMap(record => columns.map(col => record[col]));
        
        const query = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES ${values}
          ON CONFLICT ${onConflict}
          RETURNING *
        `;
        
        const result = await pool.query(query, params);
        results.push(...result.rows);
      }
      
      return results;
    };
    
    next();
  };
}

module.exports = {
  queryPerformanceMonitor,
  connectionPoolOptimizer,
  paginationOptimizer,
  indexOptimizer,
  transactionOptimizer,
  bulkOperationOptimizer
};