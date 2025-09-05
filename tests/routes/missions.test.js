/**
 * Mission Routes Tests
 * Tests all mission management API endpoints
 */

const request = require('supertest');
const express = require('express');
const missionRoutes = require('../../src/routes/missions');
const { generateTestToken, testData, mockDatabaseQueries } = require('../utils/testHelpers');
const { mockPool } = require('../mocks/database');

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
  generalRateLimit: (req, res, next) => next()
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

// Mock controllers with inline definition to avoid hoisting issues
jest.mock('../../src/controllers', () => ({
  MissionController: {
    createMission: jest.fn((req, res) => {
      const missionData = req.body;
      res.status(201).json({
        success: true,
        message: 'Mission created successfully',
        data: {
          id: 1,
          ...missionData,
          brandId: parseInt(req.params.brandId),
          isActive: true,
          completions: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }),

    listMissions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          missions: [
            {
              id: 1,
              title: 'Test Mission',
              description: 'Complete test mission',
              type: 'purchase',
              target: 100,
              reward: 50,
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

    getMissionById: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          id: parseInt(req.params.id),
          title: 'Test Mission',
          description: 'Complete test mission',
          type: 'purchase',
          target: 100,
          reward: 50,
          isActive: true,
          brandId: parseInt(req.params.brandId),
          createdAt: new Date()
        }
      });
    }),

    updateMission: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Mission updated successfully',
        data: {
          id: parseInt(req.params.id),
          ...req.body,
          updatedAt: new Date()
        }
      });
    }),

    deleteMission: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Mission deleted successfully'
      });
    }),

    getMissionStatistics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalMissions: 25,
          activeMissions: 20,
          completedMissions: 150,
          totalRewardsGiven: 7500,
          averageCompletionRate: 0.65,
          missionsByType: {
            purchase: 10,
            social_share: 8,
            referral: 5,
            review: 2
          }
        }
      });
    }),

    completeMission: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Mission completed successfully',
        data: {
          missionId: parseInt(req.params.id),
          memberId: req.body.memberId,
          reward: 50,
          completedAt: new Date()
        }
      });
    }),

    activateMission: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Mission activated successfully',
        data: {
          id: parseInt(req.params.id),
          isActive: true,
          activatedAt: new Date()
        }
      });
    }),

    deactivateMission: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Mission deactivated successfully',
        data: {
          id: parseInt(req.params.id),
          isActive: false,
          deactivatedAt: new Date()
        }
      });
    }),

    bulkCreateMissions: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Missions created successfully',
        data: {
          created: req.body.missions.length,
          missions: req.body.missions.map((mission, index) => ({
            id: index + 1,
            ...mission,
            brandId: parseInt(req.params.brandId),
            createdAt: new Date()
          }))
        }
      });
    }),

    getBrandMissionStatistics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          brandId: parseInt(req.params.brandId),
          totalMissions: 25,
          activeMissions: 20,
          totalCompletions: 150,
          totalRewards: 7500
        }
      });
    }),

    getTopPerformingMissions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          missions: [
            {
              id: 1,
              title: 'Top Mission',
              completions: 50,
              completionRate: 0.85
            }
          ]
        }
      });
    }),

    getMissionDashboard: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          overview: {
            totalMissions: 25,
            activeMissions: 20,
            totalCompletions: 150
          },
          recentActivity: []
        }
      });
    }),

    checkMissionEligibility: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          eligible: true,
          requirements: {},
          memberStatus: {}
        }
      });
    }),

    getMissionCompletions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          completions: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0
          }
        }
      });
    }),

    assignMissionToMember: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Mission assigned successfully',
        data: {
          missionId: parseInt(req.params.id),
          memberId: parseInt(req.params.memberId),
          assignedAt: new Date()
        }
      });
    }),

    cloneMission: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Mission cloned successfully',
        data: {
          originalMissionId: parseInt(req.params.id),
          clonedMission: {
            id: 99,
            title: 'Test Mission (Copy)',
            createdAt: new Date()
          }
        }
      });
    }),

    exportMissionData: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Export initiated successfully',
        data: {
          exportId: 'mission-export-123',
          status: 'processing'
        }
      });
    }),

    getMemberMissions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          missions: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0
          }
        }
      });
    }),

    claimMissionReward: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Mission reward claimed successfully',
        data: {
          missionId: parseInt(req.params.id),
          reward: 50,
          claimedAt: new Date()
        }
      });
    }),

    getMemberMissionCompletions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          completions: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0
          },
          summary: {
            totalCompletions: 0,
            totalRewards: 0
          }
        }
      });
    })
  }
}));

describe('Mission Routes', () => {
  let app;
  let token;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/brands/:brandId/missions', missionRoutes);
    
    token = generateTestToken({ id: 1, role: 'brand_admin' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/brands/:brandId/missions', () => {
    it('should create a new mission', async () => {
      const missionData = {
        title: 'New Mission',
        description: 'Complete this new mission',
        type: 'purchase',
        target: 100,
        reward: 50
      };

      const response = await request(app)
        .post('/api/brands/1/missions')
        .set('Authorization', `Bearer ${token}`)
        .send(missionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mission created successfully');
      expect(response.body.data.title).toBe(missionData.title);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/brands/1/missions')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/brands/:brandId/missions', () => {
    it('should list missions', async () => {
      const response = await request(app)
        .get('/api/brands/1/missions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.missions).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/missions/statistics', () => {
    it('should get mission statistics', async () => {
      const response = await request(app)
        .get('/api/brands/1/missions/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalMissions).toBeDefined();
      expect(response.body.data.missionsByType).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/missions/:id', () => {
    it('should get mission by ID', async () => {
      const response = await request(app)
        .get('/api/brands/1/missions/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });
  });

  describe('PUT /api/brands/:brandId/missions/:id', () => {
    it('should update mission', async () => {
      const updateData = {
        title: 'Updated Mission Title',
        reward: 75
      };

      const response = await request(app)
        .put('/api/brands/1/missions/1')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mission updated successfully');
    });
  });

  describe('DELETE /api/brands/:brandId/missions/:id', () => {
    it('should delete mission', async () => {
      const response = await request(app)
        .delete('/api/brands/1/missions/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mission deleted successfully');
    });
  });

  describe('POST /api/brands/:brandId/missions/:id/complete', () => {
    it('should complete mission', async () => {
      const completionData = {
        memberId: 1
      };

      const response = await request(app)
        .post('/api/brands/1/missions/1/complete')
        .set('Authorization', `Bearer ${token}`)
        .send(completionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mission completed successfully');
    });
  });

  describe('POST /api/brands/:brandId/missions/:id/activate', () => {
    it('should activate mission', async () => {
      const response = await request(app)
        .post('/api/brands/1/missions/1/activate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mission activated successfully');
    });
  });

  describe('POST /api/brands/:brandId/missions/:id/deactivate', () => {
    it('should deactivate mission', async () => {
      const response = await request(app)
        .post('/api/brands/1/missions/1/deactivate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mission deactivated successfully');
    });
  });
});