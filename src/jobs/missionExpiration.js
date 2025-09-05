/**
 * Mission Expiration Job
 * Checks and expires missions that have passed their end date
 */

const db = require('../../config/database');
const { logger } = require('../utils');

class MissionExpirationJob {
  constructor() {
    this.name = 'mission-expiration';
    this.description = 'Check and expire missions that have passed their end date';
  }

  async run() {
    const startTime = Date.now();
    logger.info('Starting mission expiration job...');

    const client = await db.connect();
    let expiredCount = 0;

    try {
      // Update missions that have passed their end date
      const query = `
        UPDATE missions 
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'active' 
        AND end_date IS NOT NULL 
        AND end_date < NOW()
      `;

      const result = await client.query(query);
      expiredCount = result.rowCount;

      const duration = Date.now() - startTime;
      logger.info(`Mission expiration completed: expired ${expiredCount} missions (${duration}ms)`);

      return { expiredCount, duration };
    } catch (error) {
      logger.error('Mission expiration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = MissionExpirationJob;