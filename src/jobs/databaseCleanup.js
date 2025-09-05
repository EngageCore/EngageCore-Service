/**
 * Database Cleanup Job
 * Handles removal of old records and database optimization
 */

const db = require('../../config/database');
const { logger } = require('../utils');
const config = require('../../config');

class DatabaseCleanupJob {
  constructor() {
    this.name = 'database-cleanup';
    this.description = 'Clean up old database records and optimize tables';
  }

  /**
   * Run the database cleanup job
   */
  async run() {
    const startTime = Date.now();
    logger.info('Starting database cleanup job...');

    const client = await db.connect();
    const results = {
      auditLogsDeleted: 0,
      expiredTokensDeleted: 0,
      oldSpinsDeleted: 0,
      expiredMissionsDeleted: 0,
      failedTransactionsDeleted: 0,
      tablesOptimized: 0
    };

    try {
      await client.query('BEGIN');

      // Clean up old audit logs (older than 90 days)
      results.auditLogsDeleted = await this.cleanupAuditLogs(client);

      // Clean up expired refresh tokens
      results.expiredTokensDeleted = await this.cleanupExpiredTokens(client);

      // Clean up old spin records (older than 1 year)
      results.oldSpinsDeleted = await this.cleanupOldSpins(client);

      // Clean up expired missions
      results.expiredMissionsDeleted = await this.cleanupExpiredMissions(client);

      // Clean up failed transactions (older than 30 days)
      results.failedTransactionsDeleted = await this.cleanupFailedTransactions(client);

      // Optimize database tables
      results.tablesOptimized = await this.optimizeTables(client);

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      logger.info('Database cleanup completed successfully', {
        duration: `${duration}ms`,
        results
      });

      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Database cleanup failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupAuditLogs(client) {
    const retentionDays = config.cleanup?.auditLogRetentionDays || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const query = `
      DELETE FROM audit_logs 
      WHERE created_at < $1
    `;

    const result = await client.query(query, [cutoffDate]);
    const deletedCount = result.rowCount;

    if (deletedCount > 0) {
      logger.info(`Deleted ${deletedCount} old audit log records`);
    }

    return deletedCount;
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(client) {
    const query = `
      DELETE FROM refresh_tokens 
      WHERE expires_at < NOW() OR is_revoked = TRUE
    `;

    const result = await client.query(query);
    const deletedCount = result.rowCount;

    if (deletedCount > 0) {
      logger.info(`Deleted ${deletedCount} expired/revoked refresh tokens`);
    }

    return deletedCount;
  }

  /**
   * Clean up old spin records
   */
  async cleanupOldSpins(client) {
    const retentionDays = config.cleanup?.spinRetentionDays || 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const query = `
      DELETE FROM spins 
      WHERE created_at < $1
    `;

    const result = await client.query(query, [cutoffDate]);
    const deletedCount = result.rowCount;

    if (deletedCount > 0) {
      logger.info(`Deleted ${deletedCount} old spin records`);
    }

    return deletedCount;
  }

  /**
   * Clean up expired missions
   */
  async cleanupExpiredMissions(client) {
    const gracePeriodDays = config.cleanup?.missionGracePeriodDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

    // First, delete mission completions for expired missions
    const completionsQuery = `
      DELETE FROM mission_completions 
      WHERE mission_id IN (
        SELECT id FROM missions 
        WHERE status = 'expired' 
        AND end_date < $1
      )
    `;

    const completionsResult = await client.query(completionsQuery, [cutoffDate]);
    const completionsDeleted = completionsResult.rowCount;

    // Then delete the expired missions
    const missionsQuery = `
      DELETE FROM missions 
      WHERE status = 'expired' 
      AND end_date < $1
    `;

    const missionsResult = await client.query(missionsQuery, [cutoffDate]);
    const missionsDeleted = missionsResult.rowCount;

    if (missionsDeleted > 0) {
      logger.info(`Deleted ${missionsDeleted} expired missions and ${completionsDeleted} related completions`);
    }

    return missionsDeleted;
  }

  /**
   * Clean up failed transactions
   */
  async cleanupFailedTransactions(client) {
    const retentionDays = config.cleanup?.failedTransactionRetentionDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const query = `
      DELETE FROM transactions 
      WHERE status IN ('failed', 'cancelled') 
      AND created_at < $1
    `;

    const result = await client.query(query, [cutoffDate]);
    const deletedCount = result.rowCount;

    if (deletedCount > 0) {
      logger.info(`Deleted ${deletedCount} old failed/cancelled transactions`);
    }

    return deletedCount;
  }

  /**
   * Optimize database tables
   */
  async optimizeTables(client) {
    const tables = [
      'users',
      'brands',
      'members',
      'transactions',
      'wheels',
      'wheel_items',
      'spins',
      'missions',
      'mission_completions',
      'audit_logs',
      'refresh_tokens'
    ];

    let optimizedCount = 0;

    for (const table of tables) {
      try {
        // Analyze table statistics
        await client.query(`ANALYZE ${table}`);
        
        // Vacuum table to reclaim space
        await client.query(`VACUUM ${table}`);
        
        optimizedCount++;
        logger.debug(`Optimized table: ${table}`);
      } catch (error) {
        logger.warn(`Failed to optimize table ${table}:`, error.message);
      }
    }

    if (optimizedCount > 0) {
      logger.info(`Optimized ${optimizedCount} database tables`);
    }

    return optimizedCount;
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    const client = await db.connect();
    
    try {
      const stats = {};

      // Count records that would be cleaned up
      const auditLogRetentionDays = config.cleanup?.auditLogRetentionDays || 90;
      const auditLogCutoff = new Date();
      auditLogCutoff.setDate(auditLogCutoff.getDate() - auditLogRetentionDays);

      const auditLogResult = await client.query(
        'SELECT COUNT(*) as count FROM audit_logs WHERE created_at < $1',
        [auditLogCutoff]
      );
      stats.oldAuditLogs = parseInt(auditLogResult.rows[0].count);

      const expiredTokenResult = await client.query(
        'SELECT COUNT(*) as count FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = TRUE'
      );
      stats.expiredTokens = parseInt(expiredTokenResult.rows[0].count);

      const spinRetentionDays = config.cleanup?.spinRetentionDays || 365;
      const spinCutoff = new Date();
      spinCutoff.setDate(spinCutoff.getDate() - spinRetentionDays);

      const oldSpinResult = await client.query(
        'SELECT COUNT(*) as count FROM spins WHERE created_at < $1',
        [spinCutoff]
      );
      stats.oldSpins = parseInt(oldSpinResult.rows[0].count);

      const gracePeriodDays = config.cleanup?.missionGracePeriodDays || 30;
      const missionCutoff = new Date();
      missionCutoff.setDate(missionCutoff.getDate() - gracePeriodDays);

      const expiredMissionResult = await client.query(
        'SELECT COUNT(*) as count FROM missions WHERE status = \'expired\' AND end_date < $1',
        [missionCutoff]
      );
      stats.expiredMissions = parseInt(expiredMissionResult.rows[0].count);

      const failedTransactionRetentionDays = config.cleanup?.failedTransactionRetentionDays || 30;
      const transactionCutoff = new Date();
      transactionCutoff.setDate(transactionCutoff.getDate() - failedTransactionRetentionDays);

      const failedTransactionResult = await client.query(
        'SELECT COUNT(*) as count FROM transactions WHERE status IN (\'failed\', \'cancelled\') AND created_at < $1',
        [transactionCutoff]
      );
      stats.failedTransactions = parseInt(failedTransactionResult.rows[0].count);

      return stats;
    } catch (error) {
      logger.error('Failed to get cleanup stats:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get database size information
   */
  async getDatabaseSize() {
    const client = await db.connect();
    
    try {
      const sizeQuery = `
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `;

      const result = await client.query(sizeQuery);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get database size:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new DatabaseCleanupJob();