const db = require('../config/database');
const logger = require('./logger');
const cron = require('node-cron');

class DatabaseMaintenance {
  /**
   * Create new partition for next month
   * @param {String} tableName - Base table name
   * @param {String} partitionType - Type of partition (monthly, quarterly, weekly)
   * @returns {Promise<Boolean>} Success status
   */
  static async createNextMonthPartition(tableName, partitionType = 'monthly') {
    try {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      
      const startDate = nextMonth.toISOString().split('T')[0];
      const endDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1)
        .toISOString().split('T')[0];
      
      const partitionName = `${tableName}_${nextMonth.getFullYear()}_${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
      
      // Check if partition already exists
      const existsResult = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = $1
        )
      `, [partitionName]);
      
      if (existsResult.rows[0].exists) {
        logger.info(`Partition ${partitionName} already exists`);
        return true;
      }
      
      // Create the partition
      await db.query(`
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${tableName}
        FOR VALUES FROM ('${startDate}') TO ('${endDate}')
      `);
      
      logger.info(`Created partition ${partitionName}`, {
        tableName,
        partitionName,
        startDate,
        endDate
      });
      
      return true;
    } catch (error) {
      logger.error(`Error creating partition for ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Create quarterly partition
   * @param {String} tableName - Base table name
   * @returns {Promise<Boolean>} Success status
   */
  static async createNextQuarterPartition(tableName) {
    try {
      const now = new Date();
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
      const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1;
      const nextYear = currentQuarter === 4 ? now.getFullYear() + 1 : now.getFullYear();
      
      const startMonth = (nextQuarter - 1) * 3;
      const startDate = new Date(nextYear, startMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(nextYear, startMonth + 3, 1).toISOString().split('T')[0];
      
      const partitionName = `${tableName}_${nextYear}_q${nextQuarter}`;
      
      // Check if partition already exists
      const existsResult = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = $1
        )
      `, [partitionName]);
      
      if (existsResult.rows[0].exists) {
        logger.info(`Partition ${partitionName} already exists`);
        return true;
      }
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${tableName}
        FOR VALUES FROM ('${startDate}') TO ('${endDate}')
      `);
      
      logger.info(`Created quarterly partition ${partitionName}`, {
        tableName,
        partitionName,
        quarter: nextQuarter,
        year: nextYear
      });
      
      return true;
    } catch (error) {
      logger.error(`Error creating quarterly partition for ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Drop old partitions (keep specified months of data)
   * @param {String} tableName - Base table name
   * @param {Number} monthsToKeep - Number of months to retain
   * @returns {Promise<Number>} Number of partitions dropped
   */
  static async dropOldPartitions(tableName, monthsToKeep = 24) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
      
      const result = await db.query(`
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename LIKE $1 
        AND schemaname = 'public'
      `, [`${tableName}_%`]);
      
      let droppedCount = 0;
      
      for (const row of result.rows) {
        // Extract date from partition name
        const match = row.tablename.match(/_([0-9]{4})_([0-9]{2})$/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]);
          const partitionDate = new Date(year, month - 1, 1);
          
          if (partitionDate < cutoffDate) {
            await db.query(`DROP TABLE IF EXISTS ${row.tablename}`);
            logger.info(`Dropped old partition ${row.tablename}`, {
              tableName,
              partitionDate: partitionDate.toISOString(),
              cutoffDate: cutoffDate.toISOString()
            });
            droppedCount++;
          }
        }
        
        // Handle quarterly partitions
        const quarterMatch = row.tablename.match(/_([0-9]{4})_q([1-4])$/);
        if (quarterMatch) {
          const year = parseInt(quarterMatch[1]);
          const quarter = parseInt(quarterMatch[2]);
          const partitionDate = new Date(year, (quarter - 1) * 3, 1);
          
          if (partitionDate < cutoffDate) {
            await db.query(`DROP TABLE IF EXISTS ${row.tablename}`);
            logger.info(`Dropped old quarterly partition ${row.tablename}`, {
              tableName,
              partitionDate: partitionDate.toISOString(),
              cutoffDate: cutoffDate.toISOString()
            });
            droppedCount++;
          }
        }
      }
      
      logger.info(`Dropped ${droppedCount} old partitions for ${tableName}`);
      return droppedCount;
    } catch (error) {
      logger.error(`Error dropping old partitions for ${tableName}:`, error);
      return 0;
    }
  }

  /**
   * Refresh materialized views
   * @param {Array} viewNames - Array of view names to refresh
   * @returns {Promise<Boolean>} Success status
   */
  static async refreshMaterializedViews(viewNames = ['daily_engagement_stats', 'member_leaderboard']) {
    try {
      const results = [];
      
      for (const viewName of viewNames) {
        try {
          const startTime = Date.now();
          await db.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`);
          const duration = Date.now() - startTime;
          
          logger.info(`Refreshed materialized view ${viewName}`, {
            viewName,
            duration: `${duration}ms`
          });
          
          results.push({ viewName, success: true, duration });
        } catch (error) {
          logger.error(`Failed to refresh materialized view ${viewName}:`, error);
          results.push({ viewName, success: false, error: error.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      logger.info(`Refreshed ${successCount}/${viewNames.length} materialized views`);
      
      return successCount === viewNames.length;
    } catch (error) {
      logger.error('Error refreshing materialized views:', error);
      return false;
    }
  }

  /**
   * Vacuum and analyze tables
   * @param {Array} tableNames - Array of table names to vacuum
   * @returns {Promise<Boolean>} Success status
   */
  static async vacuumAnalyze(tableNames = ['spin_history', 'transactions', 'user_action_logs', 'members']) {
    try {
      const results = [];
      
      for (const tableName of tableNames) {
        try {
          const startTime = Date.now();
          await db.query(`VACUUM (ANALYZE, VERBOSE) ${tableName}`);
          const duration = Date.now() - startTime;
          
          logger.info(`Vacuumed and analyzed ${tableName}`, {
            tableName,
            duration: `${duration}ms`
          });
          
          results.push({ tableName, success: true, duration });
        } catch (error) {
          logger.error(`Failed to vacuum ${tableName}:`, error);
          results.push({ tableName, success: false, error: error.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      logger.info(`Vacuumed ${successCount}/${tableNames.length} tables`);
      
      return successCount === tableNames.length;
    } catch (error) {
      logger.error('Error during vacuum analyze:', error);
      return false;
    }
  }

  /**
   * Update table statistics
   * @returns {Promise<Boolean>} Success status
   */
  static async updateStatistics() {
    try {
      const startTime = Date.now();
      await db.query('ANALYZE');
      const duration = Date.now() - startTime;
      
      logger.info('Updated table statistics', {
        duration: `${duration}ms`
      });
      
      return true;
    } catch (error) {
      logger.error('Error updating statistics:', error);
      return false;
    }
  }

  /**
   * Reindex tables if needed
   * @param {Array} indexNames - Array of index names to reindex
   * @returns {Promise<Boolean>} Success status
   */
  static async reindexIfNeeded(indexNames = []) {
    try {
      if (indexNames.length === 0) {
        // Get indexes that might need reindexing (low usage, large size)
        const result = await db.query(`
          SELECT indexname
          FROM pg_stat_user_indexes
          WHERE idx_scan < 100
          AND pg_relation_size(indexname::regclass) > 1048576
          ORDER BY pg_relation_size(indexname::regclass) DESC
          LIMIT 5
        `);
        
        indexNames = result.rows.map(row => row.indexname);
      }
      
      const results = [];
      
      for (const indexName of indexNames) {
        try {
          const startTime = Date.now();
          await db.query(`REINDEX INDEX CONCURRENTLY ${indexName}`);
          const duration = Date.now() - startTime;
          
          logger.info(`Reindexed ${indexName}`, {
            indexName,
            duration: `${duration}ms`
          });
          
          results.push({ indexName, success: true, duration });
        } catch (error) {
          logger.error(`Failed to reindex ${indexName}:`, error);
          results.push({ indexName, success: false, error: error.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      logger.info(`Reindexed ${successCount}/${indexNames.length} indexes`);
      
      return successCount === indexNames.length;
    } catch (error) {
      logger.error('Error during reindexing:', error);
      return false;
    }
  }

  /**
   * Perform comprehensive maintenance
   * @returns {Promise<Object>} Maintenance results
   */
  static async performMaintenance() {
    const startTime = Date.now();
    const results = {
      timestamp: new Date().toISOString(),
      tasks: {},
      summary: {
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0
      }
    };
    
    logger.info('Starting comprehensive database maintenance');
    
    try {
      // Update statistics
      results.tasks.updateStatistics = await this.updateStatistics();
      results.summary.totalTasks++;
      if (results.tasks.updateStatistics) results.summary.successfulTasks++;
      
      // Vacuum and analyze
      results.tasks.vacuumAnalyze = await this.vacuumAnalyze();
      results.summary.totalTasks++;
      if (results.tasks.vacuumAnalyze) results.summary.successfulTasks++;
      
      // Refresh materialized views
      results.tasks.refreshViews = await this.refreshMaterializedViews();
      results.summary.totalTasks++;
      if (results.tasks.refreshViews) results.summary.successfulTasks++;
      
      // Create future partitions
      const partitionTasks = [
        this.createNextMonthPartition('spin_history'),
        this.createNextQuarterPartition('transactions'),
        this.createNextMonthPartition('user_action_logs')
      ];
      
      const partitionResults = await Promise.all(partitionTasks);
      results.tasks.createPartitions = partitionResults.every(r => r);
      results.summary.totalTasks++;
      if (results.tasks.createPartitions) results.summary.successfulTasks++;
      
      // Drop old partitions
      const dropResults = await Promise.all([
        this.dropOldPartitions('spin_history'),
        this.dropOldPartitions('transactions'),
        this.dropOldPartitions('user_action_logs')
      ]);
      
      results.tasks.dropOldPartitions = {
        spin_history: dropResults[0],
        transactions: dropResults[1],
        user_action_logs: dropResults[2]
      };
      results.summary.totalTasks++;
      results.summary.successfulTasks++; // Always count as success
      
      // Calculate failed tasks
      results.summary.failedTasks = results.summary.totalTasks - results.summary.successfulTasks;
      
      const duration = Date.now() - startTime;
      results.duration = `${duration}ms`;
      
      logger.info('Database maintenance completed', {
        duration: results.duration,
        summary: results.summary
      });
      
      return results;
    } catch (error) {
      logger.error('Error during comprehensive maintenance:', error);
      results.error = error.message;
      results.duration = `${Date.now() - startTime}ms`;
      return results;
    }
  }

  /**
   * Schedule maintenance tasks using cron
   */
  static scheduleMaintenance() {
    // Daily at 2 AM - Update statistics and refresh materialized views
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting daily maintenance...');
      try {
        await this.updateStatistics();
        await this.refreshMaterializedViews();
        logger.info('Daily maintenance completed successfully');
      } catch (error) {
        logger.error('Daily maintenance failed:', error);
      }
    }, {
      timezone: 'UTC'
    });

    // Weekly on Sunday at 3 AM - Full maintenance
    cron.schedule('0 3 * * 0', async () => {
      logger.info('Starting weekly maintenance...');
      try {
        const results = await this.performMaintenance();
        logger.info('Weekly maintenance completed', results.summary);
      } catch (error) {
        logger.error('Weekly maintenance failed:', error);
      }
    }, {
      timezone: 'UTC'
    });

    // Monthly on 1st at 4 AM - Create next month partitions
    cron.schedule('0 4 1 * *', async () => {
      logger.info('Starting monthly partition maintenance...');
      try {
        await this.createNextMonthPartition('spin_history');
        await this.createNextMonthPartition('user_action_logs');
        await this.createNextQuarterPartition('transactions');
        logger.info('Monthly partition maintenance completed');
      } catch (error) {
        logger.error('Monthly partition maintenance failed:', error);
      }
    }, {
      timezone: 'UTC'
    });

    logger.info('Database maintenance scheduled', {
      daily: '2:00 AM UTC - Statistics and views refresh',
      weekly: '3:00 AM UTC Sunday - Full maintenance',
      monthly: '4:00 AM UTC 1st - Partition management'
    });
  }
}

module.exports = DatabaseMaintenance;