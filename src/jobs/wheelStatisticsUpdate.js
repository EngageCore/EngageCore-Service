/**
 * Wheel Statistics Update Job
 * Updates wheel performance statistics and analytics
 */

const db = require('../../config/database');
const { logger } = require('../utils');

class WheelStatisticsUpdateJob {
  constructor() {
    this.name = 'wheel-statistics-update';
    this.description = 'Update wheel performance statistics and analytics';
  }

  async run() {
    const startTime = Date.now();
    logger.info('Starting wheel statistics update job...');

    const client = await db.connect();
    let updatedWheels = 0;

    try {
      // Get all active wheels
      const wheelsQuery = 'SELECT id FROM wheels WHERE status = \'active\'';
      const wheelsResult = await client.query(wheelsQuery);
      
      for (const wheel of wheelsResult.rows) {
        await this.updateWheelStatistics(client, wheel.id);
        updatedWheels++;
      }

      const duration = Date.now() - startTime;
      logger.info(`Wheel statistics update completed: updated ${updatedWheels} wheels (${duration}ms)`);

      return { updatedWheels, duration };
    } catch (error) {
      logger.error('Wheel statistics update failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateWheelStatistics(client, wheelId) {
    // Update wheel metadata with current statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_spins,
        COUNT(DISTINCT member_id) as unique_spinners,
        COALESCE(SUM(points_awarded), 0) as total_points_awarded
      FROM spins 
      WHERE wheel_id = $1
    `;

    const result = await client.query(statsQuery, [wheelId]);
    const stats = result.rows[0];

    const updateQuery = `
      UPDATE wheels 
      SET 
        metadata = COALESCE(metadata, '{}') || $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const metadata = {
      statistics: {
        totalSpins: parseInt(stats.total_spins),
        uniqueSpinners: parseInt(stats.unique_spinners),
        totalPointsAwarded: parseInt(stats.total_points_awarded),
        lastUpdated: new Date().toISOString()
      }
    };

    await client.query(updateQuery, [wheelId, JSON.stringify(metadata)]);
  }
}

module.exports = new WheelStatisticsUpdateJob();