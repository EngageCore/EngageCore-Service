/**
 * Database Migration Runner
 * Handles running database migrations in order and tracking applied migrations
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { logger } = require('../src/utils');

class MigrationRunner {
  constructor(config) {
    this.pool = new Pool(config);
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  /**
   * Initialize migrations table
   */
  async initializeMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    try {
      await this.pool.query(query);
      logger.info('Migrations table initialized');
    } catch (error) {
      logger.error('Failed to initialize migrations table:', error);
      throw error;
    }
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations() {
    try {
      const result = await this.pool.query(
        'SELECT filename FROM migrations ORDER BY id'
      );
      return result.rows.map(row => row.filename);
    } catch (error) {
      logger.error('Failed to get applied migrations:', error);
      throw error;
    }
  }

  /**
   * Get list of migration files
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Sort to ensure proper order
    } catch (error) {
      logger.error('Failed to read migration files:', error);
      throw error;
    }
  }

  /**
   * Read migration file content
   */
  async readMigrationFile(filename) {
    try {
      const filePath = path.join(this.migrationsDir, filename);
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      logger.error(`Failed to read migration file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Execute a single migration
   */
  async executeMigration(filename, content) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute migration SQL
      await client.query(content);
      
      // Record migration as applied
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      await client.query('COMMIT');
      logger.info(`Migration ${filename} applied successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Failed to apply migration ${filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    try {
      logger.info('Starting database migrations...');
      
      // Initialize migrations table
      await this.initializeMigrationsTable();
      
      // Get applied migrations and available migration files
      const [appliedMigrations, migrationFiles] = await Promise.all([
        this.getAppliedMigrations(),
        this.getMigrationFiles()
      ]);
      
      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(
        file => !appliedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations found');
        return;
      }
      
      logger.info(`Found ${pendingMigrations.length} pending migrations`);
      
      // Execute pending migrations in order
      for (const filename of pendingMigrations) {
        logger.info(`Applying migration: ${filename}`);
        const content = await this.readMigrationFile(filename);
        await this.executeMigration(filename, content);
      }
      
      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus() {
    try {
      await this.initializeMigrationsTable();
      
      const [appliedMigrations, migrationFiles] = await Promise.all([
        this.getAppliedMigrations(),
        this.getMigrationFiles()
      ]);
      
      const pendingMigrations = migrationFiles.filter(
        file => !appliedMigrations.includes(file)
      );
      
      return {
        total: migrationFiles.length,
        applied: appliedMigrations.length,
        pending: pendingMigrations.length,
        appliedMigrations,
        pendingMigrations
      };
    } catch (error) {
      logger.error('Failed to get migration status:', error);
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
 * Create migration runner with database configuration
 */
function createMigrationRunner() {
  const config = {
    host: process.env.DB_HOST || '54.250.29.129',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'EngageCore',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 5, // Reduced pool size for migrations
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
  
  return new MigrationRunner(config);
}

/**
 * CLI interface for running migrations
 */
async function main() {
  const command = process.argv[2];
  const runner = createMigrationRunner();
  
  try {
    switch (command) {
      case 'up':
      case 'migrate':
        await runner.runMigrations();
        break;
        
      case 'status':
        const status = await runner.getStatus();
        console.log('\nMigration Status:');
        console.log(`Total migrations: ${status.total}`);
        console.log(`Applied: ${status.applied}`);
        console.log(`Pending: ${status.pending}`);
        
        if (status.appliedMigrations.length > 0) {
          console.log('\nApplied migrations:');
          status.appliedMigrations.forEach(migration => {
            console.log(`  ✓ ${migration}`);
          });
        }
        
        if (status.pendingMigrations.length > 0) {
          console.log('\nPending migrations:');
          status.pendingMigrations.forEach(migration => {
            console.log(`  ○ ${migration}`);
          });
        }
        break;
        
      default:
        console.log('Usage:');
        console.log('  node migrate.js up|migrate  - Run pending migrations');
        console.log('  node migrate.js status      - Show migration status');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Migration command failed:', error);
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
  MigrationRunner,
  createMigrationRunner
};