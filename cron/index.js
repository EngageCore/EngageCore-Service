console.log('=== STARTING DIAGNOSTIC ===');
console.log('Time:', new Date());
console.log('Working directory:', process.cwd());
console.log('');

// Step 1: Load dotenv
console.log('Step 1: Loading environment...');
require('dotenv').config();
console.log('✅ Environment loaded');
console.log('');

// Step 2: Load config
console.log('Step 2: Loading config...');
let config;
try {
  config = require('../cron/config');
  console.log('✅ Config loaded');
  console.log('Database host:', config.database.host);
  console.log('Database port:', config.database.port);
  console.log('Database name:', config.database.database);
  console.log('Cron enabled:', config.cron.enabled);
  console.log('');
} catch (error) {
  console.error('❌ Failed to load config:', error.message);
  process.exit(1);
}

// Step 3: Load job
console.log('Step 3: Loading TransactionSyncJob...');
let transactionSyncJob;
try {
  transactionSyncJob = require('./jobs/TransactionSyncJob');
  console.log('✅ TransactionSyncJob loaded');
  console.log('Job exports:', Object.keys(transactionSyncJob));
  console.log('');
} catch (error) {
  console.error('❌ Failed to load TransactionSyncJob:');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Step 4: Test database connection
console.log('Step 4: Testing database connection...');
const { Pool } = require('pg');
const pool = new Pool(config.database);

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    pool.end();
    process.exit(1);
  } else {
    console.log('✅ Database connected successfully');
    console.log('Server time:', res.rows[0].now);
    console.log('');
    
    // Step 5: Run the job
    runJob();
  }
});

async function runJob() {
  console.log('Step 5: Running TransactionSyncJob...');
  console.log('─────────────────────────────────────');
  console.log('');
  
  try {
    const result = await transactionSyncJob.syncTransactions();
    
    console.log('\n📊 Test Results:');
    console.log('─────────────────────────────────────');
    console.log(`Success: ${result.success}`);
    console.log(`Brands Processed: ${result.brandsProcessed}`);
    console.log(`Total Processed: ${result.processed}`);
    console.log(`Total Errors: ${result.errors}`);
    console.log(`Execution Time: ${result.executionTime}ms`);
    
    if (result.brandResults && result.brandResults.length > 0) {
      console.log('\n🏢 Brand Results:');
      result.brandResults.forEach(brand => {
        console.log(`  - ${brand.brandName}: ${brand.processed} processed, ${brand.errors} errors (${brand.duration}ms)`);
        if (brand.error) {
          console.log(`    Error: ${brand.error}`);
        }
      });
    }
    
    if (result.errorMessages && result.errorMessages.length > 0) {
      console.log('\n❌ Errors:');
      result.errorMessages.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('\n✅ Test completed!');
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Job execution failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n💥 Unhandled Rejection:', reason);
  process.exit(1);
});