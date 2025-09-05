/**
 * Member Points Recalculation Job
 * Recalculates member points balances and fixes discrepancies
 */

const db = require('../../config/database');
const { logger } = require('../utils');

class MemberPointsRecalculationJob {
  constructor() {
    this.name = 'member-points-recalculation';
    this.description = 'Recalculate member points balances and fix discrepancies';
  }

  async run() {
    const startTime = Date.now();
    logger.info('Starting member points recalculation job...');

    const client = await db.connect();
    let updatedCount = 0;

    try {
      await client.query('BEGIN');

      // Recalculate points balances based on completed transactions
      const updateQuery = `
        UPDATE members SET 
          points_balance = COALESCE((
            SELECT SUM(amount) 
            FROM transactions 
            WHERE member_id = members.id AND status = 'completed'
          ), 0),
          total_points_earned = COALESCE((
            SELECT SUM(amount) 
            FROM transactions 
            WHERE member_id = members.id AND status = 'completed' AND amount > 0
          ), 0),
          total_points_redeemed = COALESCE((
            SELECT SUM(ABS(amount)) 
            FROM transactions 
            WHERE member_id = members.id AND status = 'completed' AND amount < 0
          ), 0),
          updated_at = CURRENT_TIMESTAMP
        WHERE EXISTS (
          SELECT 1 FROM transactions WHERE member_id = members.id
        )
      `;

      const result = await client.query(updateQuery);
      updatedCount = result.rowCount;

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      logger.info(`Member points recalculation completed: updated ${updatedCount} members (${duration}ms)`);

      return { updatedCount, duration };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Member points recalculation failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new MemberPointsRecalculationJob();