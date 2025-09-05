/**
 * Database Performance Monitor
 * Monitors database performance metrics during stress testing
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

class DatabaseMonitor {
  constructor(config = {}) {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || '648_test',
      monitorInterval: config.monitorInterval || 5000, // 5 seconds
      outputDir: config.outputDir || path.join(__dirname, 'reports'),
      ...config
    };
    
    this.connection = null;
    this.isMonitoring = false;
    this.metrics = {
      timestamps: [],
      connections: [],
      queries: [],
      slowQueries: [],
      lockWaits: [],
      tableScans: [],
      tmpTables: [],
      diskReads: [],
      bufferHitRatio: [],
      innodbBufferPool: [],
      queryCache: [],
      threadsCached: [],
      threadsConnected: [],
      threadsRunning: [],
      openTables: [],
      openFiles: [],
      selectScan: [],
      selectFullJoin: [],
      createdTmpDiskTables: [],
      createdTmpTables: [],
      keyReads: [],
      keyReadRequests: [],
      keyWrites: [],
      keyWriteRequests: []
    };
    this.startTime = null;
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        acquireTimeout: 60000,
        timeout: 60000
      });
      
      console.log('📊 Database monitor connected');
    } catch (error) {
      console.error('❌ Failed to connect to database for monitoring:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      console.log('📊 Database monitor disconnected');
    }
  }

  async getGlobalStatus() {
    try {
      const [rows] = await this.connection.execute('SHOW GLOBAL STATUS');
      const status = {};
      
      rows.forEach(row => {
        status[row.Variable_name] = row.Value;
      });
      
      return status;
    } catch (error) {
      console.error('Error getting global status:', error.message);
      return {};
    }
  }

  async getGlobalVariables() {
    try {
      const [rows] = await this.connection.execute('SHOW GLOBAL VARIABLES');
      const variables = {};
      
      rows.forEach(row => {
        variables[row.Variable_name] = row.Value;
      });
      
      return variables;
    } catch (error) {
      console.error('Error getting global variables:', error.message);
      return {};
    }
  }

  async getProcessList() {
    try {
      const [rows] = await this.connection.execute('SHOW PROCESSLIST');
      return rows;
    } catch (error) {
      console.error('Error getting process list:', error.message);
      return [];
    }
  }

  async getInnoDBStatus() {
    try {
      const [rows] = await this.connection.execute('SHOW ENGINE INNODB STATUS');
      return rows[0] ? rows[0].Status : '';
    } catch (error) {
      console.error('Error getting InnoDB status:', error.message);
      return '';
    }
  }

  async getTableStats() {
    try {
      const [rows] = await this.connection.execute(`
        SELECT 
          TABLE_NAME,
          TABLE_ROWS,
          DATA_LENGTH,
          INDEX_LENGTH,
          DATA_FREE,
          AUTO_INCREMENT
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY DATA_LENGTH DESC
      `, [this.config.database]);
      
      return rows;
    } catch (error) {
      console.error('Error getting table stats:', error.message);
      return [];
    }
  }

  async collectMetrics() {
    const timestamp = new Date();
    const status = await this.getGlobalStatus();
    
    // Store timestamp
    this.metrics.timestamps.push(timestamp);
    
    // Connection metrics
    this.metrics.connections.push(parseInt(status.Connections || 0));
    this.metrics.threadsCached.push(parseInt(status.Threads_cached || 0));
    this.metrics.threadsConnected.push(parseInt(status.Threads_connected || 0));
    this.metrics.threadsRunning.push(parseInt(status.Threads_running || 0));
    
    // Query metrics
    this.metrics.queries.push(parseInt(status.Queries || 0));
    this.metrics.slowQueries.push(parseInt(status.Slow_queries || 0));
    this.metrics.selectScan.push(parseInt(status.Select_scan || 0));
    this.metrics.selectFullJoin.push(parseInt(status.Select_full_join || 0));
    
    // Table metrics
    this.metrics.openTables.push(parseInt(status.Open_tables || 0));
    this.metrics.openFiles.push(parseInt(status.Open_files || 0));
    this.metrics.createdTmpTables.push(parseInt(status.Created_tmp_tables || 0));
    this.metrics.createdTmpDiskTables.push(parseInt(status.Created_tmp_disk_tables || 0));
    
    // Key metrics
    this.metrics.keyReads.push(parseInt(status.Key_reads || 0));
    this.metrics.keyReadRequests.push(parseInt(status.Key_read_requests || 0));
    this.metrics.keyWrites.push(parseInt(status.Key_writes || 0));
    this.metrics.keyWriteRequests.push(parseInt(status.Key_write_requests || 0));
    
    // InnoDB Buffer Pool metrics
    const bufferPoolPages = parseInt(status.Innodb_buffer_pool_pages_total || 0);
    const bufferPoolFree = parseInt(status.Innodb_buffer_pool_pages_free || 0);
    const bufferPoolUsed = bufferPoolPages - bufferPoolFree;
    const bufferPoolUtilization = bufferPoolPages > 0 ? (bufferPoolUsed / bufferPoolPages) * 100 : 0;
    
    this.metrics.innodbBufferPool.push({
      total: bufferPoolPages,
      used: bufferPoolUsed,
      free: bufferPoolFree,
      utilization: bufferPoolUtilization,
      reads: parseInt(status.Innodb_buffer_pool_reads || 0),
      readRequests: parseInt(status.Innodb_buffer_pool_read_requests || 0)
    });
    
    // Calculate buffer hit ratio
    const readRequests = parseInt(status.Innodb_buffer_pool_read_requests || 0);
    const reads = parseInt(status.Innodb_buffer_pool_reads || 0);
    const hitRatio = readRequests > 0 ? ((readRequests - reads) / readRequests) * 100 : 0;
    this.metrics.bufferHitRatio.push(hitRatio);
    
    // Query cache metrics (if enabled)
    this.metrics.queryCache.push({
      hits: parseInt(status.Qcache_hits || 0),
      inserts: parseInt(status.Qcache_inserts || 0),
      notCached: parseInt(status.Qcache_not_cached || 0),
      lowmemPrunes: parseInt(status.Qcache_lowmem_prunes || 0)
    });
  }

  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️  Database monitoring is already running');
      return;
    }
    
    await this.connect();
    this.isMonitoring = true;
    this.startTime = new Date();
    
    console.log(`📊 Starting database monitoring (interval: ${this.config.monitorInterval}ms)`);
    
    // Initial metrics collection
    await this.collectMetrics();
    
    // Set up monitoring interval
    this.monitoringInterval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(this.monitoringInterval);
        return;
      }
      
      try {
        await this.collectMetrics();
        
        // Log current status every 30 seconds
        const elapsed = (Date.now() - this.startTime.getTime()) / 1000;
        if (elapsed % 30 < (this.config.monitorInterval / 1000)) {
          const latest = this.metrics.timestamps.length - 1;
          console.log(`📊 DB Monitor [${elapsed.toFixed(0)}s]: Connections: ${this.metrics.threadsConnected[latest]}, Running: ${this.metrics.threadsRunning[latest]}, Buffer Hit: ${this.metrics.bufferHitRatio[latest].toFixed(2)}%`);
        }
      } catch (error) {
        console.error('Error collecting database metrics:', error.message);
      }
    }, this.config.monitorInterval);
  }

  async stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Final metrics collection
    await this.collectMetrics();
    
    console.log('📊 Database monitoring stopped');
    await this.disconnect();
  }

  calculateDelta(metric) {
    const deltas = [];
    for (let i = 1; i < metric.length; i++) {
      deltas.push(metric[i] - metric[i - 1]);
    }
    return deltas;
  }

  calculateRate(metric, timeIntervalSeconds) {
    const deltas = this.calculateDelta(metric);
    return deltas.map(delta => delta / timeIntervalSeconds);
  }

  getStatistics(values) {
    if (values.length === 0) return { min: 0, max: 0, avg: 0, median: 0 };
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)]
    };
  }

  async generateReport() {
    if (this.metrics.timestamps.length === 0) {
      console.log('⚠️  No metrics collected');
      return null;
    }
    
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000;
    const timeInterval = this.config.monitorInterval / 1000;
    
    // Calculate rates (per second)
    const queryRate = this.calculateRate(this.metrics.queries, timeInterval);
    const connectionRate = this.calculateRate(this.metrics.connections, timeInterval);
    
    // Get final table stats
    const tableStats = await this.getTableStats();
    
    const report = {
      summary: {
        duration: `${duration.toFixed(2)}s`,
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
        samplesCollected: this.metrics.timestamps.length,
        monitoringInterval: `${this.config.monitorInterval}ms`
      },
      connections: {
        peak: Math.max(...this.metrics.threadsConnected),
        average: this.getStatistics(this.metrics.threadsConnected).avg.toFixed(2),
        running: {
          peak: Math.max(...this.metrics.threadsRunning),
          average: this.getStatistics(this.metrics.threadsRunning).avg.toFixed(2)
        }
      },
      queries: {
        total: this.metrics.queries[this.metrics.queries.length - 1] - this.metrics.queries[0],
        rate: {
          peak: Math.max(...queryRate).toFixed(2),
          average: this.getStatistics(queryRate).avg.toFixed(2)
        },
        slowQueries: this.metrics.slowQueries[this.metrics.slowQueries.length - 1] - this.metrics.slowQueries[0]
      },
      performance: {
        bufferHitRatio: {
          average: this.getStatistics(this.metrics.bufferHitRatio).avg.toFixed(2),
          minimum: Math.min(...this.metrics.bufferHitRatio).toFixed(2)
        },
        innodbBufferPool: {
          averageUtilization: this.getStatistics(this.metrics.innodbBufferPool.map(bp => bp.utilization)).avg.toFixed(2),
          peakUtilization: Math.max(...this.metrics.innodbBufferPool.map(bp => bp.utilization)).toFixed(2)
        },
        tmpTables: {
          created: this.metrics.createdTmpTables[this.metrics.createdTmpTables.length - 1] - this.metrics.createdTmpTables[0],
          createdOnDisk: this.metrics.createdTmpDiskTables[this.metrics.createdTmpDiskTables.length - 1] - this.metrics.createdTmpDiskTables[0]
        },
        tableScans: this.metrics.selectScan[this.metrics.selectScan.length - 1] - this.metrics.selectScan[0],
        fullJoins: this.metrics.selectFullJoin[this.metrics.selectFullJoin.length - 1] - this.metrics.selectFullJoin[0]
      },
      tables: tableStats.map(table => ({
        name: table.TABLE_NAME,
        rows: table.TABLE_ROWS,
        dataSize: `${(table.DATA_LENGTH / 1024 / 1024).toFixed(2)} MB`,
        indexSize: `${(table.INDEX_LENGTH / 1024 / 1024).toFixed(2)} MB`,
        totalSize: `${((table.DATA_LENGTH + table.INDEX_LENGTH) / 1024 / 1024).toFixed(2)} MB`
      })),
      rawMetrics: {
        timestamps: this.metrics.timestamps,
        connections: this.metrics.threadsConnected,
        runningThreads: this.metrics.threadsRunning,
        queries: this.metrics.queries,
        bufferHitRatio: this.metrics.bufferHitRatio,
        innodbBufferPool: this.metrics.innodbBufferPool
      }
    };
    
    // Save report to file
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(this.config.outputDir, `db-performance-${timestamp}.json`);
      
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log('\n📊 Database Performance Report:');
      console.log('================================');
      console.log(`Duration: ${report.summary.duration}`);
      console.log(`Peak Connections: ${report.connections.peak}`);
      console.log(`Peak Running Threads: ${report.connections.running.peak}`);
      console.log(`Total Queries: ${report.queries.total}`);
      console.log(`Average Query Rate: ${report.queries.rate.average}/sec`);
      console.log(`Buffer Hit Ratio: ${report.performance.bufferHitRatio.average}%`);
      console.log(`Slow Queries: ${report.queries.slowQueries}`);
      console.log(`\n📁 Detailed report saved to: ${reportPath}`);
      
      return report;
    } catch (error) {
      console.error('Error saving database performance report:', error.message);
      return report;
    }
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new DatabaseMonitor();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping database monitoring...');
    await monitor.stopMonitoring();
    await monitor.generateReport();
    process.exit(0);
  });
  
  monitor.startMonitoring().catch(error => {
    console.error('❌ Database monitoring failed:', error);
    process.exit(1);
  });
}

module.exports = DatabaseMonitor;