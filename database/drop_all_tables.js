/**
 * Drop All Tables Script
 * This script drops all existing tables to allow for a clean migration
 */

const { Pool } = require('pg');
const { logger } = require('../src/utils');

class TableDropper {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || '54.250.29.129',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'EngageCore',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '123456',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
  }

  async dropAllTables() {
    const client = await this.pool.connect();
    
    try {
      logger.info('Starting to drop all tables...');
      
      // Get all table names in the public schema
      const tablesResult = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
      `);
      
      const tables = tablesResult.rows.map(row => row.tablename);
      
      if (tables.length === 0) {
        logger.info('No tables found to drop');
        return;
      }
      
      logger.info(`Found ${tables.length} tables to drop: ${tables.join(', ')}`);
      
      // Drop all tables with CASCADE to handle foreign key constraints
      for (const table of tables) {
        try {
          await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
          logger.info(`Dropped table: ${table}`);
        } catch (error) {
          logger.warn(`Failed to drop table ${table}:`, error.message);
        }
      }
      
      // Drop all custom types
      const typesResult = await client.query(`
        SELECT typname 
        FROM pg_type 
        WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND typtype = 'e'
      `);
      
      const types = typesResult.rows.map(row => row.typname);
      
      for (const type of types) {
        try {
          await client.query(`DROP TYPE IF EXISTS "${type}" CASCADE`);
          logger.info(`Dropped type: ${type}`);
        } catch (error) {
          logger.warn(`Failed to drop type ${type}:`, error.message);
        }
      }
      
      // Drop all functions
      const functionsResult = await client.query(`
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND proname NOT LIKE 'pg_%'
      `);
      
      for (const func of functionsResult.rows) {
        try {
          await client.query(`DROP FUNCTION IF EXISTS "${func.proname}"(${func.argtypes}) CASCADE`);
          logger.info(`Dropped function: ${func.proname}`);
        } catch (error) {
          logger.warn(`Failed to drop function ${func.proname}:`, error.message);
        }
      }
      
      logger.info('Successfully dropped all tables, types, and functions');
      
    } catch (error) {
      logger.error('Failed to drop tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

async function main() {
  const dropper = new TableDropper();
  
  try {
    await dropper.dropAllTables();
    logger.info('Database cleanup completed successfully');
  } catch (error) {
    logger.error('Database cleanup failed:', error);
    process.exit(1);
  } finally {
    await dropper.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { TableDropper };