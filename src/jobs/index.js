/**
 * Cron Jobs Manager
 * Handles scheduled tasks for database maintenance and cleanup
 */

const cron = require('node-cron');
const { logger } = require('../utils');
const config = require('../../config');

// Import job modules
const databaseCleanup = require('./databaseCleanup');
const tokenCleanup = require('./tokenCleanup');
const auditLogCleanup = require('./auditLogCleanup');
const memberPointsRecalculation = require('./memberPointsRecalculation');
const missionExpiration = require('./missionExpiration');
const wheelStatisticsUpdate = require('./wheelStatisticsUpdate');
const systemHealthCheck = require('./systemHealthCheck');

class JobManager {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize and start all cron jobs
   */
  start() {
    if (this.isRunning) {
      logger.warn('Job manager is already running');
      return;
    }

    if (!config.jobs.enabled) {
      logger.info('Cron jobs are disabled');
      return;
    }

    logger.info('Starting cron job manager...');

    try {
      // Database cleanup - runs daily at 2 AM
      this.scheduleJob('database-cleanup', '0 2 * * *', databaseCleanup.run, {
        description: 'Clean up old database records and optimize tables',
        timezone: config.server.timezone || 'UTC'
      });

      // Token cleanup - runs every 6 hours
      this.scheduleJob('token-cleanup', '0 */6 * * *', tokenCleanup.run, {
        description: 'Remove expired refresh tokens and sessions',
        timezone: config.server.timezone || 'UTC'
      });

      // Audit log cleanup - runs weekly on Sunday at 3 AM
      this.scheduleJob('audit-log-cleanup', '0 3 * * 0', auditLogCleanup.run, {
        description: 'Archive old audit logs and clean up storage',
        timezone: config.server.timezone || 'UTC'
      });

      // Member points recalculation - runs daily at 1 AM
      this.scheduleJob('member-points-recalculation', '0 1 * * *', memberPointsRecalculation.run, {
        description: 'Recalculate member points balances and fix discrepancies',
        timezone: config.server.timezone || 'UTC'
      });

      // Mission expiration check - runs every hour
      this.scheduleJob('mission-expiration', '0 * * * *', missionExpiration.run, {
        description: 'Check and expire missions that have passed their end date',
        timezone: config.server.timezone || 'UTC'
      });

      // Wheel statistics update - runs every 30 minutes
      this.scheduleJob('wheel-statistics-update', '*/30 * * * *', wheelStatisticsUpdate.run, {
        description: 'Update wheel performance statistics and analytics',
        timezone: config.server.timezone || 'UTC'
      });

      // System health check - runs every 5 minutes
      this.scheduleJob('system-health-check', '*/5 * * * *', systemHealthCheck.run, {
        description: 'Monitor system health and send alerts if needed',
        timezone: config.server.timezone || 'UTC'
      });

      this.isRunning = true;
      logger.info(`Started ${this.jobs.size} cron jobs`);
      this.logJobSchedules();
    } catch (error) {
      logger.error('Failed to start cron jobs:', error);
      throw error;
    }
  }

  /**
   * Schedule a cron job
   */
  scheduleJob(name, schedule, task, options = {}) {
    try {
      const job = cron.schedule(schedule, async () => {
        const startTime = Date.now();
        logger.info(`Starting job: ${name}`);

        try {
          await task();
          const duration = Date.now() - startTime;
          logger.info(`Job completed: ${name} (${duration}ms)`);
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`Job failed: ${name} (${duration}ms)`, error);
          
          // Send alert for critical job failures
          if (options.critical) {
            this.sendJobFailureAlert(name, error);
          }
        }
      }, {
        scheduled: false,
        timezone: options.timezone || 'UTC'
      });

      this.jobs.set(name, {
        job,
        schedule,
        description: options.description || 'No description',
        lastRun: null,
        nextRun: null,
        status: 'scheduled'
      });

      job.start();
      logger.info(`Scheduled job: ${name} (${schedule})`);
    } catch (error) {
      logger.error(`Failed to schedule job ${name}:`, error);
      throw error;
    }
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Job manager is not running');
      return;
    }

    logger.info('Stopping cron job manager...');

    for (const [name, jobInfo] of this.jobs) {
      try {
        jobInfo.job.stop();
        jobInfo.status = 'stopped';
        logger.info(`Stopped job: ${name}`);
      } catch (error) {
        logger.error(`Failed to stop job ${name}:`, error);
      }
    }

    this.isRunning = false;
    logger.info('Cron job manager stopped');
  }

  /**
   * Get job status
   */
  getStatus() {
    const jobs = [];
    
    for (const [name, jobInfo] of this.jobs) {
      jobs.push({
        name,
        schedule: jobInfo.schedule,
        description: jobInfo.description,
        status: jobInfo.status,
        lastRun: jobInfo.lastRun,
        nextRun: jobInfo.nextRun
      });
    }

    return {
      isRunning: this.isRunning,
      totalJobs: this.jobs.size,
      jobs
    };
  }

  /**
   * Run a specific job manually
   */
  async runJob(name) {
    const jobInfo = this.jobs.get(name);
    if (!jobInfo) {
      throw new Error(`Job not found: ${name}`);
    }

    logger.info(`Manually running job: ${name}`);
    const startTime = Date.now();

    try {
      // Get the task function based on job name
      const task = this.getJobTask(name);
      await task();
      
      const duration = Date.now() - startTime;
      jobInfo.lastRun = new Date();
      logger.info(`Manual job completed: ${name} (${duration}ms)`);
      
      return { success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Manual job failed: ${name} (${duration}ms)`, error);
      throw error;
    }
  }

  /**
   * Get job task function by name
   */
  getJobTask(name) {
    const taskMap = {
      'database-cleanup': databaseCleanup.run,
      'token-cleanup': tokenCleanup.run,
      'audit-log-cleanup': auditLogCleanup.run,
      'member-points-recalculation': memberPointsRecalculation.run,
      'mission-expiration': missionExpiration.run,
      'wheel-statistics-update': wheelStatisticsUpdate.run,
      'system-health-check': systemHealthCheck.run
    };

    const task = taskMap[name];
    if (!task) {
      throw new Error(`Task not found for job: ${name}`);
    }

    return task;
  }

  /**
   * Log job schedules
   */
  logJobSchedules() {
    logger.info('Scheduled jobs:');
    for (const [name, jobInfo] of this.jobs) {
      logger.info(`  - ${name}: ${jobInfo.schedule} (${jobInfo.description})`);
    }
  }

  /**
   * Send job failure alert
   */
  sendJobFailureAlert(jobName, error) {
    // This could be extended to send emails, Slack notifications, etc.
    logger.error(`CRITICAL JOB FAILURE: ${jobName}`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Restart a specific job
   */
  restartJob(name) {
    const jobInfo = this.jobs.get(name);
    if (!jobInfo) {
      throw new Error(`Job not found: ${name}`);
    }

    try {
      jobInfo.job.stop();
      jobInfo.job.start();
      jobInfo.status = 'scheduled';
      logger.info(`Restarted job: ${name}`);
    } catch (error) {
      logger.error(`Failed to restart job ${name}:`, error);
      throw error;
    }
  }

  /**
   * Update job schedule
   */
  updateJobSchedule(name, newSchedule) {
    const jobInfo = this.jobs.get(name);
    if (!jobInfo) {
      throw new Error(`Job not found: ${name}`);
    }

    try {
      jobInfo.job.stop();
      jobInfo.schedule = newSchedule;
      
      // Create new job with updated schedule
      const task = this.getJobTask(name);
      this.scheduleJob(name, newSchedule, task, {
        description: jobInfo.description
      });
      
      logger.info(`Updated job schedule: ${name} -> ${newSchedule}`);
    } catch (error) {
      logger.error(`Failed to update job schedule ${name}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const jobManager = new JobManager();

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, stopping cron jobs...');
  jobManager.stop();
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, stopping cron jobs...');
  jobManager.stop();
});

module.exports = jobManager;