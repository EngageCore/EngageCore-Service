/**
 * Token Cleanup Job
 * Handles removal of expired refresh tokens and sessions
 */

const db = require('../../config/database');
const { logger } = require('../utils');

class TokenCleanupJob {
  constructor() {
    this.name = 'token-cleanup';
    this.description = 'Remove expired refresh tokens and sessions';
  }

  /**
   * Run the token cleanup job
   */
  async run() {
    const startTime = Date.now();
    logger.info('Starting token cleanup job...');

    const client = await db.connect();
    let deletedCount = 0;

    try {
      // Delete expired and revoked refresh tokens
      const query = `
        DELETE FROM refresh_tokens 
        WHERE expires_at < NOW() OR is_revoked = TRUE
      `;

      const result = await client.query(query);
      deletedCount = result.rowCount;

      const duration = Date.now() - startTime;
      logger.info(`Token cleanup completed: deleted ${deletedCount} tokens (${duration}ms)`);

      return { deletedCount, duration };
    } catch (error) {
      logger.error('Token cleanup failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new TokenCleanupJob()