/**
 * Database mocks for testing
 */

const { mockQueryResult } = require('../utils/testHelpers');

// Mock the database pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn()
  })),
  end: jest.fn()
};

// Mock database module
jest.mock('../../config/database', () => mockPool);

// Database query helpers for different scenarios
const mockDatabaseQueries = {
  // User queries
  findUserByEmail: (user = null) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(user ? [user] : [])
    );
  },

  findUserById: (user = null) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(user ? [user] : [])
    );
  },

  createUser: (user) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([user])
    );
  },

  updateUser: (user) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([user])
    );
  },

  deleteUser: () => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([], 1)
    );
  },

  // Brand queries
  findBrandBySlug: (brand = null) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(brand ? [brand] : [])
    );
  },

  findBrandById: (brand = null) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(brand ? [brand] : [])
    );
  },

  createBrand: (brand) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([brand])
    );
  },

  updateBrand: (brand) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([brand])
    );
  },

  // Member queries
  findMemberById: (member = null) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(member ? [member] : [])
    );
  },

  findMembersByBrand: (members = []) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(members)
    );
  },

  createMember: (member) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([member])
    );
  },

  updateMember: (member) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([member])
    );
  },

  // Tier queries
  findTierById: (tier = null) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(tier ? [tier] : [])
    );
  },

  findTiersByBrand: (tiers = []) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(tiers)
    );
  },

  createTier: (tier) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([tier])
    );
  },

  updateTier: (tier) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([tier])
    );
  },

  // Transaction queries
  findTransactionById: (transaction = null) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(transaction ? [transaction] : [])
    );
  },

  findTransactionsByMember: (transactions = []) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(transactions)
    );
  },

  createTransaction: (transaction) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([transaction])
    );
  },

  // Mission queries
  findMissionById: (mission = null) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(mission ? [mission] : [])
    );
  },

  findMissionsByBrand: (missions = []) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(missions)
    );
  },

  createMission: (mission) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([mission])
    );
  },

  updateMission: (mission) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([mission])
    );
  },

  // Wheel queries
  findWheelById: (wheel = null) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(wheel ? [wheel] : [])
    );
  },

  findWheelsByBrand: (wheels = []) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(wheels)
    );
  },

  createWheel: (wheel) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([wheel])
    );
  },

  updateWheel: (wheel) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([wheel])
    );
  },

  // Generic queries
  mockSelect: (rows = []) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult(rows)
    );
  },

  mockInsert: (row) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([row])
    );
  },

  mockUpdate: (row) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([row])
    );
  },

  mockDelete: (rowCount = 1) => {
    mockPool.query.mockResolvedValueOnce(
      mockQueryResult([], rowCount)
    );
  },

  mockError: (error) => {
    mockPool.query.mockRejectedValueOnce(error);
  },

  // Reset all mocks
  reset: () => {
    mockPool.query.mockReset();
    mockPool.connect.mockReset();
  }
};

module.exports = {
  mockPool,
  mockDatabaseQueries
};