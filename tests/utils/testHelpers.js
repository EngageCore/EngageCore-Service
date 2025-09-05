/**
 * Test utilities and helpers for engage-service tests
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Generate test JWT token
 */
const generateTestToken = (payload = {}) => {
  const defaultPayload = {
    id: 1,
    email: 'test@example.com',
    role: 'user',
    brandId: 1,
    ...payload
  };
  
  return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
};

/**
 * Generate admin test token
 */
const generateAdminToken = (payload = {}) => {
  return generateTestToken({
    role: 'admin',
    ...payload
  });
};

/**
 * Generate brand admin test token
 */
const generateBrandAdminToken = (brandId = 1, payload = {}) => {
  return generateTestToken({
    role: 'brand_admin',
    brandId,
    ...payload
  });
};

/**
 * Mock database pool
 */
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn()
  }))
};

/**
 * Test data generators
 */
const testData = {
  user: (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    password: bcrypt.hashSync('password123', 10),
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    brandId: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  brand: (overrides = {}) => ({
    id: 1,
    name: 'Test Brand',
    slug: 'test-brand',
    description: 'Test brand description',
    logo: 'test-logo.png',
    apiKey: 'test-api-key',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  member: (overrides = {}) => ({
    id: 1,
    userId: 1,
    brandId: 1,
    tierId: 1,
    points: 100,
    totalSpent: 500.00,
    joinedAt: new Date(),
    lastActivityAt: new Date(),
    isActive: true,
    ...overrides
  }),

  tier: (overrides = {}) => ({
    id: 1,
    brandId: 1,
    name: 'Bronze',
    description: 'Bronze tier',
    minPoints: 0,
    maxPoints: 999,
    benefits: ['10% discount'],
    color: '#CD7F32',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  transaction: (overrides = {}) => ({
    id: 1,
    memberId: 1,
    brandId: 1,
    type: 'purchase',
    amount: 100.00,
    points: 10,
    description: 'Test transaction',
    metadata: {},
    createdAt: new Date(),
    ...overrides
  }),

  mission: (overrides = {}) => ({
    id: 1,
    brandId: 1,
    title: 'Test Mission',
    description: 'Complete test mission',
    type: 'purchase',
    target: 100,
    reward: 50,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  wheel: (overrides = {}) => ({
    id: 1,
    brandId: 1,
    name: 'Test Wheel',
    description: 'Test wheel description',
    segments: [
      { id: 1, label: 'Prize 1', probability: 0.5, reward: { type: 'points', value: 10 } },
      { id: 2, label: 'Prize 2', probability: 0.3, reward: { type: 'discount', value: 5 } },
      { id: 3, label: 'Try Again', probability: 0.2, reward: { type: 'none' } }
    ],
    costToSpin: 10,
    maxSpinsPerDay: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })
};

/**
 * Database query result helpers
 */
const mockQueryResult = (rows = [], rowCount = null) => ({
  rows,
  rowCount: rowCount !== null ? rowCount : rows.length,
  command: 'SELECT',
  fields: []
});

/**
 * API response helpers
 */
const expectSuccessResponse = (response, expectedData = null) => {
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  if (expectedData) {
    expect(response.body.data).toEqual(expect.objectContaining(expectedData));
  }
};

const expectErrorResponse = (response, expectedStatus, expectedMessage = null) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(false);
  if (expectedMessage) {
    expect(response.body.message).toContain(expectedMessage);
  }
};

/**
 * Clean up test data
 */
const cleanupTestData = async () => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Reset mock implementations
  mockPool.query.mockReset();
};

module.exports = {
  generateTestToken,
  generateAdminToken,
  generateBrandAdminToken,
  mockPool,
  testData,
  mockQueryResult,
  expectSuccessResponse,
  expectErrorResponse,
  cleanupTestData
};