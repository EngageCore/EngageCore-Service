/**
 * Jest setup file for test configuration
 * Handles database setup, teardown, and global test utilities
 */

require('dotenv').config({ path: '.env.test' });
const db = require('../src/config/database');
const { cleanup } = require('./fixtures/testData');

// Global test timeout
jest.setTimeout(30000);

// Database setup before all tests
beforeAll(async () => {
  try {
    // Wait for database connection
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Clean up any existing test data
    await cleanup.cleanupTestData(db);
    
    console.log('Test database setup completed');
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    // Clean up test data
    await cleanup.cleanupTestData(db);
    
    // Close database connections
    if (db.pool) {
      await db.pool.end();
    }
    
    console.log('Test cleanup completed');
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress console.log during tests unless explicitly needed
if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error // Keep error logging
  };
}

// Global test utilities
global.testUtils = {
  // Wait for a specified time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate random test data
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Generate random email
  randomEmail: () => `test${Date.now()}${Math.random().toString(36).substr(2, 5)}@example.com`,
  
  // Database query helper
  query: db.query.bind(db)
};