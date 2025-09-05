/**
 * System Health Check Job
 * Monitors system health and sends alerts if needed
 */

const db = require('../../config/database');
const { logger } = require('../utils');
const os = require('os');

class SystemHealthCheckJob {
  constructor() {
    this.name = 'system-health-check';
    this.description = 'Monitor system health and send alerts if needed';
  }

  async run() {
    const startTime = Date.now();
    logger.debug('Running system health check...');

    try {
      const healthStatus = {
        timestamp: new Date().toISOString(),
        database: await this.checkDatabaseHealth(),
        memory: this.checkMemoryUsage(),
        cpu: this.checkCpuUsage(),
        disk: await this.checkDiskUsage(),
        uptime: process.uptime()
      };

      // Check for critical issues
      const criticalIssues = this.identifyCriticalIssues(healthStatus);
      
      if (criticalIssues.length > 0) {
        logger.warn('Critical system issues detected:', criticalIssues);
        await this.sendHealthAlert(criticalIssues, healthStatus);
      }

      const duration = Date.now() - startTime;
      logger.debug(`System health check completed (${duration}ms)`);

      return { healthStatus, criticalIssues, duration };
    } catch (error) {
      logger.error('System health check failed:', error);
      throw error;
    }
  }

  async checkDatabaseHealth() {
    const client = await db.connect();
    
    try {
      const startTime = Date.now();
      await client.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      // Check connection pool status
      const poolStatus = {
        totalConnections: db.totalCount,
        idleConnections: db.idleCount,
        waitingClients: db.waitingCount
      };

      return {
        status: 'healthy',
        responseTime,
        pool: poolStatus
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    } finally {
      client.release();
    }
  }

  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      process: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      system: {
        total: Math.round(totalMemory / 1024 / 1024), // MB
        free: Math.round(freeMemory / 1024 / 1024), // MB
        used: Math.round(usedMemory / 1024 / 1024), // MB
        usagePercent: Math.round((usedMemory / totalMemory) * 100)
      }
    };
  }

  checkCpuUsage() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    return {
      cores: cpus.length,
      loadAverage: {
        '1min': Math.round(loadAvg[0] * 100) / 100,
        '5min': Math.round(loadAvg[1] * 100) / 100,
        '15min': Math.round(loadAvg[2] * 100) / 100
      },
      usage: Math.round((loadAvg[0] / cpus.length) * 100)
    };
  }

  async checkDiskUsage() {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(process.cwd());
      
      // This is a simplified disk check
      // In production, you might want to use a more comprehensive solution
      return {
        status: 'available',
        path: process.cwd()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  identifyCriticalIssues(healthStatus) {
    const issues = [];

    // Database health
    if (healthStatus.database.status === 'unhealthy') {
      issues.push({
        type: 'database',
        severity: 'critical',
        message: 'Database connection failed',
        details: healthStatus.database.error
      });
    } else if (healthStatus.database.responseTime > 5000) {
      issues.push({
        type: 'database',
        severity: 'warning',
        message: 'Database response time is high',
        details: `${healthStatus.database.responseTime}ms`
      });
    }

    // Memory usage
    if (healthStatus.memory.system.usagePercent > 90) {
      issues.push({
        type: 'memory',
        severity: 'critical',
        message: 'System memory usage is critically high',
        details: `${healthStatus.memory.system.usagePercent}%`
      });
    } else if (healthStatus.memory.system.usagePercent > 80) {
      issues.push({
        type: 'memory',
        severity: 'warning',
        message: 'System memory usage is high',
        details: `${healthStatus.memory.system.usagePercent}%`
      });
    }

    // CPU usage
    if (healthStatus.cpu.usage > 90) {
      issues.push({
        type: 'cpu',
        severity: 'critical',
        message: 'CPU usage is critically high',
        details: `${healthStatus.cpu.usage}%`
      });
    } else if (healthStatus.cpu.usage > 80) {
      issues.push({
        type: 'cpu',
        severity: 'warning',
        message: 'CPU usage is high',
        details: `${healthStatus.cpu.usage}%`
      });
    }

    // Process memory
    if (healthStatus.memory.process.heapUsed > 400) { // 400MB
      issues.push({
        type: 'process_memory',
        severity: 'warning',
        message: 'Process heap usage is high',
        details: `${healthStatus.memory.process.heapUsed}MB`
      });
    }

    return issues;
  }

  async sendHealthAlert(issues, healthStatus) {
    // This is where you would integrate with your alerting system
    // (email, Slack, PagerDuty, etc.)
    
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    const warningIssues = issues.filter(issue => issue.severity === 'warning');

    if (criticalIssues.length > 0) {
      logger.error('CRITICAL SYSTEM ALERT:', {
        issues: criticalIssues,
        timestamp: healthStatus.timestamp,
        uptime: healthStatus.uptime
      });
    }

    if (warningIssues.length > 0) {
      logger.warn('System warning alert:', {
        issues: warningIssues,
        timestamp: healthStatus.timestamp
      });
    }

    // TODO: Implement actual alerting mechanisms
    // - Send email notifications
    // - Post to Slack channel
    // - Create PagerDuty incident
    // - Send SMS alerts
  }

  async getDetailedHealthReport() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      database: await this.checkDatabaseHealth(),
      memory: this.checkMemoryUsage(),
      cpu: this.checkCpuUsage(),
      disk: await this.checkDiskUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname()
    };

    const criticalIssues = this.identifyCriticalIssues(healthStatus);
    
    return {
      status: criticalIssues.some(issue => issue.severity === 'critical') ? 'unhealthy' : 'healthy',
      healthStatus,
      issues: criticalIssues
    };
  }
}

module.exports = SystemHealthCheck;