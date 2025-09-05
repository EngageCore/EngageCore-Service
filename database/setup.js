/**
 * Database Setup Runner
 * Handles running table creation, indexes, and seed data in order
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { logger } = require('../src/utils');

class DatabaseSetupRunner {
  constructor(config) {
    this.pool = new Pool(config);
    this.tablesDir = path.join(__dirname, 'tables');
    this.indexesDir = path.join(__dirname, 'indexes');
    this.seedsDir = path.join(__dirname, 'seeds');
  }

  /**
   * Get list of SQL files from a directory
   */
  async getSQLFiles(directory) {
    try {
      const files = await fs.readdir(directory);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Sort to ensure proper order
    } catch (error) {
      logger.error(`Failed to read SQL files from ${directory}:`, error);
      throw error;
    }
  }

  /**
   * Read SQL file content
   */
  async readSQLFile(directory, filename) {
    try {
      const filePath = path.join(directory, filename);
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      logger.error(`Failed to read SQL file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Execute SQL content
   */
  async executeSQL(filename, content) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute SQL
      await client.query(content);
      
      await client.query('COMMIT');
      logger.info(`SQL file ${filename} executed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to execute SQL file ${filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run database setup (tables, indexes, seeds)
   */
  async runSetup() {
    try {
      logger.info('Starting database setup...');
      
      // Step 1: Create tables
      await this.runTables();
      
      // Step 2: Create indexes
      await this.runIndexes();
      
      // Step 3: Insert seed data
      await this.runSeeds();
      
      logger.info('Database setup completed successfully!');
    } catch (error) {
      logger.error('Database setup failed:', error);
      throw error;
    }
  }

  /**
   * Run table creation scripts
   */
  async runTables() {
    logger.info('Creating database tables...');
    const tableFiles = await this.getSQLFiles(this.tablesDir);
    
    for (const filename of tableFiles) {
      logger.info(`Creating tables from: ${filename}`);
      const content = await this.readSQLFile(this.tablesDir, filename);
      await this.executeSQL(filename, content);
    }
    
    logger.info('All tables created successfully');
  }

  /**
   * Run index creation scripts
   */
  async runIndexes() {
    logger.info('Creating database indexes...');
    const indexFiles = await this.getSQLFiles(this.indexesDir);
    
    for (const filename of indexFiles) {
      logger.info(`Creating indexes from: ${filename}`);
      const content = await this.readSQLFile(this.indexesDir, filename);
      await this.executeSQL(filename, content);
    }
    
    logger.info('All indexes created successfully');
  }

  /**
   * Run seed data scripts
   */
  async runSeeds() {
    logger.info('Inserting seed data...');
    const seedFiles = await this.getSQLFiles(this.seedsDir);
    
    for (const filename of seedFiles) {
      logger.info(`Inserting seed data from: ${filename}`);
      const content = await this.readSQLFile(this.seedsDir, filename);
      await this.executeSQL(filename, content);
    }
    
    logger.info('All seed data inserted successfully');
  }

  /**
   * Get database setup status
   */
  async getStatus() {
    try {
      const [tableFiles, indexFiles, seedFiles] = await Promise.all([
        this.getSQLFiles(this.tablesDir),
        this.getSQLFiles(this.indexesDir),
        this.getSQLFiles(this.seedsDir)
      ]);
      
      return {
        tables: tableFiles.length,
        indexes: indexFiles.length,
        seeds: seedFiles.length,
        total: tableFiles.length + indexFiles.length + seedFiles.length
      };
    } catch (error) {
      logger.error('Failed to get setup status:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}

/**
 * Create database setup runner with database configuration
 */
function createSetupRunner() {
  const config = {
    host: process.env.DB_HOST || '54.250.29.129',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || '648',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 5, // Reduced pool size for setup
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
  
  return new DatabaseSetupRunner(config);
}

/**
 * CLI interface for running database setup
 */
async function main() {
  const command = process.argv[2];
  const runner = createSetupRunner();
  
  try {
    switch (command) {
      case 'up':
      case 'setup':
      case 'migrate':
        await runner.runSetup();
        break;
        
      case 'tables':
        await runner.runTables();
        break;
        
      case 'indexes':
        await runner.runIndexes();
        break;
        
      case 'seeds':
        await runner.runSeeds();
        break;
        
      case 'status':
        const status = await runner.getStatus();
        console.log('\nDatabase Setup Status:');
        console.log(`Total SQL files: ${status.total}`);
        console.log(`Table files: ${status.tables}`);
        console.log(`Index files: ${status.indexes}`);
        console.log(`Seed files: ${status.seeds}`);
        break;
        
      default:
        console.log('Usage:');
        console.log('  node migrate.js up|setup|migrate - Run complete database setup');
        console.log('  node migrate.js tables           - Create tables only');
        console.log('  node migrate.js indexes          - Create indexes only');
        console.log('  node migrate.js seeds            - Insert seed data only');
        console.log('  node migrate.js status           - Show setup status');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Database setup command failed:', error);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  DatabaseSetupRunner,
  createSetupRunner
};