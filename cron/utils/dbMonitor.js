const db = require('../../config/database');
const logger = require('./logger');

class DatabaseMonitor {
  /**
   * Monitor connection pool status
   * @returns {Promise<Array>} Pool status information
   */
  static async getPoolStatus() {
    try {
      const result = await db.query(`
        SELECT 
          state,
          COUNT(*) as connections,
          MAX(state_change) as last_change
        FROM pg_stat_activity 
        WHERE datname = $1
        GROUP BY state
      `, [process.env.DB_NAME || 'EngageCore']);
      
      const poolInfo = {
        totalConnections: db.pool.totalCount,
        idleConnections: db.pool.idleCount,
        waitingClients: db.pool.waitingCount,
        maxConnections: db.pool.options.max,
        minConnections: db.pool.options.min
      };
      
      logger.debug('Pool status retrieved', poolInfo);
      
      return {
        poolInfo,
        activeConnections: result.rows
      };
    } catch (error) {
      logger.error('Error getting pool status:', error);
      throw error;
    }
  }

  /**
   * Get slow queries from pg_stat_statements
   * @param {Number} limit - Number of queries to return
   * @returns {Promise<Array>} Slow queries information
   */
  static async getSlowQueries(limit = 10) {
    try {
      const result = await db.query(`
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          max_exec_time,
          min_exec_time,
          stddev_exec_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC 
        LIMIT $1
      `, [limit]);
      
      const slowQueries = result.rows.map(row => ({
        ...row,
        query: row.query.replace(/\s+/g, ' ').trim(),
        total_exec_time: parseFloat(row.total_exec_time).toFixed(2),
        mean_exec_time: parseFloat(row.mean_exec_time).toFixed(2),
        max_exec_time: parseFloat(row.max_exec_time).toFixed(2),
        hit_percent: row.hit_percent ? parseFloat(row.hit_percent).toFixed(2) : null
      }));
      
      logger.debug('Slow queries retrieved', { count: slowQueries.length });
      
      return slowQueries;
    } catch (error) {
      logger.error('Error getting slow queries:', error);
      throw error;
    }
  }

  /**
   * Get table sizes and statistics
   * @returns {Promise<Array>} Table size information
   */
  static async getTableSizes() {
    try {
      const result = await db.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
          (SELECT reltuples::bigint FROM pg_class WHERE relname = tablename) as estimated_rows
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      
      logger.debug('Table sizes retrieved', { count: result.rows.length });
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting table sizes:', error);
      throw error;
    }
  }

  /**
   * Monitor index usage statistics
   * @returns {Promise<Array>} Index usage information
   */
  static async getIndexUsage() {
    try {
      const result = await db.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch,
          pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
          pg_relation_size(indexname::regclass) as index_size_bytes
        FROM pg_stat_user_indexes 
        ORDER BY idx_scan DESC
      `);
      
      // Identify unused indexes
      const unusedIndexes = result.rows.filter(row => row.idx_scan === '0');
      
      logger.debug('Index usage retrieved', { 
        totalIndexes: result.rows.length,
        unusedIndexes: unusedIndexes.length
      });
      
      return {
        indexes: result.rows,
        unusedIndexes: unusedIndexes.length,
        totalIndexes: result.rows.length
      };
    } catch (error) {
      logger.error('Error getting index usage:', error);
      throw error;
    }
  }

  /**
   * Get cache hit ratio statistics
   * @returns {Promise<Array>} Cache hit ratio information
   */
  static async getCacheHitRatio() {
    try {
      const result = await db.query(`
        SELECT 
          'index hit rate' as name,
          COALESCE(sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0), 0) as ratio
        FROM pg_statio_user_indexes
        UNION ALL
        SELECT 
          'table hit rate' as name,
          COALESCE(sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0), 0) as ratio
        FROM pg_statio_user_tables
        UNION ALL
        SELECT 
          'buffer hit rate' as name,
          COALESCE(sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 0) as ratio
        FROM pg_stat_database
        WHERE datname = $1
      `, [process.env.DB_NAME || 'EngageCore']);
      
      const hitRatios = result.rows.map(row => ({
        ...row,
        ratio: parseFloat(row.ratio).toFixed(4),
        percentage: (parseFloat(row.ratio) * 100).toFixed(2) + '%'
      }));
      
      logger.debug('Cache hit ratios retrieved', hitRatios);
      
      return hitRatios;
    } catch (error) {
      logger.error('Error getting cache hit ratio:', error);
      throw error;
    }
  }

  /**
   * Get database locks information
   * @returns {Promise<Array>} Lock information
   */
  static async getDatabaseLocks() {
    try {
      const result = await db.query(`
        SELECT 
          pl.pid,
          pl.mode,
          pl.locktype,
          pl.relation::regclass as relation,
          pl.granted,
          pa.query,
          pa.state,
          pa.query_start,
          now() - pa.query_start as duration
        FROM pg_locks pl
        LEFT JOIN pg_stat_activity pa ON pl.pid = pa.pid
        WHERE pl.database = (SELECT oid FROM pg_database WHERE datname = $1)
        AND pa.datname = $1
        ORDER BY pa.query_start
      `, [process.env.DB_NAME || 'EngageCore']);
      
      const blockedQueries = result.rows.filter(row => !row.granted);
      
      logger.debug('Database locks retrieved', {
        totalLocks: result.rows.length,
        blockedQueries: blockedQueries.length
      });
      
      return {
        locks: result.rows,
        blockedQueries,
        totalLocks: result.rows.length
      };
    } catch (error) {
      logger.error('Error getting database locks:', error);
      throw error;
    }
  }

  /**
   * Get partition information for partitioned tables
   * @returns {Promise<Array>} Partition information
   */
  static async getPartitionInfo() {
    try {
      const result = await db.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          (SELECT reltuples::bigint FROM pg_class WHERE relname = tablename) as estimated_rows,
          CASE 
            WHEN tablename LIKE '%_____' AND tablename ~ '_[0-9]{4}_[0-9]{2}$' THEN 'monthly'
            WHEN tablename LIKE '%_____' AND tablename ~ '_[0-9]{4}_q[1-4]$' THEN 'quarterly'
            WHEN tablename LIKE '%_____' AND tablename ~ '_[0-9]{4}_w[0-9]{2}$' THEN 'weekly'
            ELSE 'unknown'
          END as partition_type
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND (tablename LIKE 'spin_history_%' 
             OR tablename LIKE 'transactions_%' 
             OR tablename LIKE 'user_action_logs_%')
        ORDER BY tablename
      `);
      
      logger.debug('Partition info retrieved', { count: result.rows.length });
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting partition info:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive database health report
   * @returns {Promise<Object>} Complete health report
   */
  static async getHealthReport() {
    try {
      const startTime = Date.now();
      
      const [poolStatus, slowQueries, tableSizes, indexUsage, cacheHitRatio, locks, partitions] = await Promise.all([
        this.getPoolStatus(),
        this.getSlowQueries(5),
        this.getTableSizes(),
        this.getIndexUsage(),
        this.getCacheHitRatio(),
        this.getDatabaseLocks(),
        this.getPartitionInfo()
      ]);
      
      const duration = Date.now() - startTime;
      
      const report = {
        timestamp: new Date().toISOString(),
        generationTime: `${duration}ms`,
        poolStatus,
        performance: {
          slowQueries,
          cacheHitRatio
        },
        storage: {
          tableSizes,
          partitions
        },
        indexes: indexUsage,
        locks,
        summary: {
          totalTables: tableSizes.length,
          totalIndexes: indexUsage.totalIndexes,
          unusedIndexes: indexUsage.unusedIndexes,
          blockedQueries: locks.blockedQueries.length,
          partitionedTables: partitions.length
        }
      };
      
      logger.info('Database health report generated', {
        duration: `${duration}ms`,
        summary: report.summary
      });
      
      return report;
    } catch (error) {
      logger.error('Error generating health report:', error);
      throw error;
    }
  }

  /**
   * Monitor query performance in real-time
   * @param {String} query - SQL query to monitor
   * @param {Array} params - Query parameters
   * @param {Function} callback - Function to execute
   * @returns {Promise<*>} Query result with performance metrics
   */
  static async monitorQuery(query, params, callback) {
    const startTime = Date.now();
    const queryId = Math.random().toString(36).substring(7);
    
    try {
      logger.debug('Query started', {
        queryId,
        query: query.replace(/\s+/g, ' ').trim(),
        params: params?.length || 0
      });
      
      const result = await callback();
      const duration = Date.now() - startTime;
      
      logger.query(query, params, duration);
      
      if (duration > 1000) {
        logger.performance('Slow database query', duration, {
          queryId,
          query: query.replace(/\s+/g, ' ').trim(),
          rowCount: result.rows?.length || result.rowCount || 0
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Query failed', {
        queryId,
        query: query.replace(/\s+/g, ' ').trim(),
        duration: `${duration}ms`,
        error: error.message
      });
      
      throw error;
    }
  }
}

module.exports = DatabaseMonitor;