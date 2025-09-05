/**
 * Audit Log Cleanup Job
 * Archives old audit logs and cleans up storage
 */

const db = require('../../config/database');
const { logger } = require('../utils');
const config = require('../../config');

class AuditLogCleanupJob {
  constructor() {
    this.name = 'audit-log-cleanup';
    this.description = 'Archive old audit logs and clean up storage';
  }

  async run() {
    const startTime = Date.now();
    logger.info('Starting audit log cleanup job...');

    const client = await db.connect();
    const retentionDays = config.cleanup?.auditLogRetentionDays || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const query = `DELETE FROM audit_logs WHERE created_at < $1`;
      const result = await client.query(query, [cutoffDate]);
      const deletedCount = result.rowCount;

      const duration = Date.now() - startTime;
      logger.info(`Audit log cleanup completed: deleted ${deletedCount} records (${duration}ms)`);

      return { deletedCount, duration };
    } catch (error) {
      logger.error('Audit log cleanup failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new AuditLogCleanupJob();