/**
 * Database mocks for testing
 */

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn()
  }))
};

module.exports = {
  mockPool
};