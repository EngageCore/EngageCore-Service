/**
 * Jest setup file for engage-service tests
 * Configures test environment, database, and mocks
 */

const path = require('path');
const fs = require('fs');

// Load test environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

// Mock only essential dependencies that are actually used
// Most mocking will be done in individual test files as needed

// Global test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test teardown
afterAll(async () => {
  // Clean up any remaining handles
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Export test utilities
module.exports = {
  // Test data generators will be added here
};