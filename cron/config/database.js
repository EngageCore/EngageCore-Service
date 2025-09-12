/**
 * Database Configuration
 * PostgreSQL connection pool setup
 */

const { Pool } = require('pg');
const config = require('./index');

// Create connection pool
const pool = new Pool(config.database);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Handle pool connection
pool.on('connect', (client) => {
  console.log('New client connected to database');
});

// Handle pool removal
pool.on('remove', (client) => {
  console.log('Client removed from pool');
});

module.exports = pool;