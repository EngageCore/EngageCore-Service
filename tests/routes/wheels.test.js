/**
 * Wheel Routes Tests
 * Tests all wheel management API endpoints
 */

const request = require('supertest');
const express = require('express');
const wheelRoutes = require('../../src/routes/wheels');
const { generateTestToken } = require('../utils/testHelpers');

// Mock middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    if (req.headers.authorization) {
      req.user = { id: 1, email: 'test@example.com', role: 'brand_admin' };
      next();
    } else {
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  },
  authorize: (roles) => (req, res, next) => {
    if (roles.includes(req.user?.role)) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Forbidden' });
    }
  }
}));

jest.mock('../../src/middleware/validation', () => ({
  validate: () => (req, res, next) => next()
}));

jest.mock('../../src/middleware/rateLimit', () => ({
  generalRateLimit: (req, res, next) => next(),
  wheelSpinRateLimit: (req, res, next) => next()
}));

jest.mock('../../src/middleware/brandContext', () => ({
  validateBrandAccess: (req, res, next) => {
    req.brand = { id: parseInt(req.params.brandId), name: 'Test Brand' };
    next();
  },
  optionalBrandContext: (req, res, next) => {
    req.brand = { id: parseInt(req.params.brandId), name: 'Test Brand' };
    next();
  }
}));

jest.mock('../../src/validators', () => ({
  wheelValidators: {
    createWheelSchema: {},
    listWheelsSchema: {},
    getWheelSchema: {},
    updateWheelSchema: {},
    deleteWheelSchema: {},
    spinWheelSchema: {},
    getWheelStatisticsSchema: {},
    getWheelSpinHistorySchema: {}
  }
}));

// Mock controllers with inline definition to avoid hoisting issues
jest.mock('../../src/controllers', () => ({
  WheelController: {
    createWheel: jest.fn((req, res) => {
      const wheelData = req.body;
      res.status(201).json({
        success: true,
        message: 'Wheel created successfully',
        data: {
          id: 1,
          ...wheelData,
          brandId: parseInt(req.params.brandId),
          createdAt: new Date()
        }
      });
    }),

    listWheels: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          wheels: [
            {
              id: 1,
              name: 'Lucky Wheel',
              description: 'Test wheel',
              isActive: true,
              brandId: parseInt(req.params.brandId),
              createdAt: new Date()
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            pages: 1
          }
        }
      });
    }),

    getWheelById: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          id: parseInt(req.params.id),
          name: 'Lucky Wheel',
          description: 'Test wheel',
          isActive: true,
          brandId: parseInt(req.params.brandId),
          segments: [
            { id: 1, label: 'Prize 1', probability: 0.5 },
            { id: 2, label: 'Prize 2', probability: 0.5 }
          ],
          createdAt: new Date()
        }
      });
    }),

    updateWheel: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Wheel updated successfully',
        data: {
          id: parseInt(req.params.id),
          ...req.body,
          updatedAt: new Date()
        }
      });
    }),

    deleteWheel: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Wheel deleted successfully'
      });
    }),

    spinWheel: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Wheel spun successfully',
        data: {
          spinId: 'spin-123',
          result: {
            segmentId: 1,
            label: 'Prize 1',
            value: 'Congratulations!'
          },
          timestamp: new Date()
        }
      });
    }),

    getWheelStatistics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalSpins: 1000,
          uniqueSpinners: 500,
          segmentStats: [
            { segmentId: 1, label: 'Prize 1', spins: 500 },
            { segmentId: 2, label: 'Prize 2', spins: 500 }
          ]
        }
      });
    }),

    getWheelSpinHistory: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          spins: [
            {
              id: 1,
              memberId: 1,
              segmentId: 1,
              result: 'Prize 1',
              timestamp: new Date()
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            pages: 1
          }
        }
      });
    }),

    validateWheelProbabilities: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Probabilities are valid',
        data: {
          isValid: true,
          totalProbability: 1.0
        }
      });
    }),

    updateWheelItems: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Wheel items updated successfully',
        data: {
          wheelId: parseInt(req.params.id),
          itemsUpdated: req.body.items.length
        }
      });
    }),

    checkSpinEligibility: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          eligible: true,
          remainingSpins: 3,
          nextSpinAvailable: null
        }
      });
    }),

    getSpinHistory: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          spins: [
            {
              id: 1,
              memberId: 1,
              result: 'Prize 1',
              timestamp: new Date()
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            pages: 1
          }
        }
      });
    }),

    getItemPerformance: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          items: [
            {
              itemId: 1,
              label: 'Prize 1',
              spins: 500,
              winRate: 0.5
            }
          ]
        }
      });
    }),

    getMemberDailySpinCount: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          memberId: parseInt(req.params.memberId),
          dailySpins: 2,
          maxDailySpins: 5,
          remainingSpins: 3
        }
      });
    }),

    getWheelDashboard: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalSpins: 1000,
          todaySpins: 50,
          uniqueSpinners: 200,
          popularItems: []
        }
      });
    }),

    cloneWheel: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Wheel cloned successfully',
        data: {
          originalId: parseInt(req.params.id),
          clonedId: 999,
          name: 'Copy of Lucky Wheel'
        }
      });
    }),

    activateWheel: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Wheel activated successfully'
      });
    }),

    deactivateWheel: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Wheel deactivated successfully'
      });
    }),

    getWheelLeaderboard: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          leaderboard: [
            {
              memberId: 1,
              memberName: 'John Doe',
              totalSpins: 50,
              totalWins: 25,
              winRate: 0.5
            }
          ]
        }
      });
    }),

    exportWheelData: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Export initiated successfully',
        data: {
          exportId: 'wheel-export-123',
          status: 'processing'
        }
      });
    }),

    getMemberSpinHistory: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          memberId: parseInt(req.params.memberId),
          spins: [
            {
              id: 1,
              wheelId: 1,
              result: 'Prize 1',
              timestamp: new Date()
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            pages: 1
          }
        }
      });
    })
  }
}));

describe('Wheel Routes', () => {
  let app;
  let token;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/brands/:brandId/wheels', wheelRoutes);
    
    token = generateTestToken({ id: 1, role: 'brand_admin' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/brands/:brandId/wheels', () => {
    it('should create a new wheel', async () => {
      const wheelData = {
        name: 'Lucky Wheel',
        description: 'Test wheel for prizes',
        segments: [
          { label: 'Prize 1', probability: 0.5 },
          { label: 'Prize 2', probability: 0.5 }
        ]
      };

      const response = await request(app)
        .post('/api/brands/1/wheels')
        .set('Authorization', `Bearer ${token}`)
        .send(wheelData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wheel created successfully');
      expect(response.body.data.name).toBe(wheelData.name);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/brands/1/wheels')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/brands/:brandId/wheels', () => {
    it('should list wheels', async () => {
      const response = await request(app)
        .get('/api/brands/1/wheels')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.wheels).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/wheels/:id', () => {
    it('should get wheel by ID', async () => {
      const response = await request(app)
        .get('/api/brands/1/wheels/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.segments).toBeDefined();
    });
  });

  describe('PUT /api/brands/:brandId/wheels/:id', () => {
    it('should update wheel', async () => {
      const updateData = {
        name: 'Updated Wheel',
        description: 'Updated description'
      };

      const response = await request(app)
        .put('/api/brands/1/wheels/1')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wheel updated successfully');
    });
  });

  describe('DELETE /api/brands/:brandId/wheels/:id', () => {
    it('should delete wheel', async () => {
      const response = await request(app)
        .delete('/api/brands/1/wheels/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wheel deleted successfully');
    });
  });

  describe('POST /api/brands/:brandId/wheels/:id/spin', () => {
    it('should spin wheel', async () => {
      const response = await request(app)
        .post('/api/brands/1/wheels/1/spin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wheel spun successfully');
      expect(response.body.data.result).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/wheels/:id/statistics', () => {
    it('should get wheel statistics', async () => {
      const response = await request(app)
        .get('/api/brands/1/wheels/1/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSpins).toBeDefined();
      expect(response.body.data.segmentStats).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/wheels/:id/spins', () => {
    it('should get wheel spin history', async () => {
      const response = await request(app)
        .get('/api/brands/1/wheels/1/spins')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.spins).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });
  });
});