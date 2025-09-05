/**
 * Member Routes Tests
 * Tests all member management API endpoints
 */

const request = require('supertest');
const express = require('express');
const memberRoutes = require('../../src/routes/members');
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
  generalRateLimit: (req, res, next) => next(),
  uploadRateLimit: (req, res, next) => next()
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
  MemberController: {
    createMember: jest.fn((req, res) => {
      const memberData = req.body;
      res.status(201).json({
        success: true,
        message: 'Member created successfully',
        data: {
          id: 1,
          ...memberData,
          brandId: parseInt(req.params.brandId),
          tierId: 1,
          points: 0,
          totalSpent: 0,
          isActive: true,
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }),

    listMembers: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          members: [
            {
              id: 1,
              email: 'member1@test.com',
              firstName: 'Member',
              lastName: 'One',
              phone: '+1234567890',
              brandId: 1,
              tierId: 1,
              points: 100,
              totalSpent: 250,
              isActive: true,
              joinedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
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

    getMemberStatistics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalMembers: 1000,
          activeMembers: 800,
          inactiveMembers: 200,
          newMembersThisMonth: 50,
          membersByTier: {
            bronze: 600,
            silver: 300,
            gold: 100
          },
          averagePoints: 150,
          averageSpent: 500,
          topSpenders: [
            { id: 1, name: 'John Doe', totalSpent: 2000 }
          ]
        }
      });
    }),

    checkEmailAvailability: jest.fn((req, res) => {
      const { email } = req.params;
      res.json({
        success: true,
        data: {
          email,
          available: email !== 'taken@test.com'
        }
      });
    }),

    importMembers: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Members import initiated',
        data: {
          importId: 'import-123',
          status: 'processing',
          totalRows: 100,
          processedRows: 0,
          errors: []
        }
      });
    }),

    exportMembers: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Export initiated successfully',
        data: {
          exportId: 'export-456',
          status: 'processing',
          estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000)
        }
      });
    }),

    getMemberLeaderboard: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          leaderboard: [
            {
              rank: 1,
              member: {
                id: 1,
                name: 'John Doe',
                email: 'john@test.com',
                tier: 'Gold'
              },
              points: 1000,
              totalSpent: 2000
            }
          ],
          period: 'monthly',
          lastUpdated: new Date()
        }
      });
    }),

    bulkUpdateMembers: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Bulk update completed',
        data: {
          updated: 50,
          failed: 0,
          errors: []
        }
      });
    }),

    getMemberById: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          id: parseInt(req.params.id),
          email: 'member@test.com',
          firstName: 'Test',
          lastName: 'Member',
          phone: '+1234567890',
          brandId: parseInt(req.params.brandId),
          tierId: 1,
          points: 100,
          totalSpent: 250,
          isActive: true,
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }),

    updateMember: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Member updated successfully',
        data: {
          id: parseInt(req.params.id),
          ...req.body,
          updatedAt: new Date()
        }
      });
    }),

    deleteMember: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Member deleted successfully'
      });
    }),

    getMemberDashboard: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          member: {
            id: parseInt(req.params.id),
            name: 'Test Member',
            tier: 'Gold',
            points: 1000,
            totalSpent: 2000
          },
          recentTransactions: [],
          achievements: [],
          nextTierProgress: {
            current: 1000,
            required: 1500,
            percentage: 66.7
          }
        }
      });
    }),

    activateMember: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Member activated successfully',
        data: {
          id: parseInt(req.params.id),
          isActive: true,
          updatedAt: new Date()
        }
      });
    }),

    deactivateMember: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Member deactivated successfully',
        data: {
          id: parseInt(req.params.id),
          isActive: false,
          updatedAt: new Date()
        }
      });
    }),

    getMemberActivity: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          activities: [
            {
              id: 1,
              type: 'purchase',
              description: 'Made a purchase',
              points: 50,
              timestamp: new Date()
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1
          }
        }
      });
    }),

    getMemberTierProgress: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          currentTier: {
            id: 1,
            name: 'Bronze',
            minPoints: 0
          },
          nextTier: {
            id: 2,
            name: 'Silver',
            minPoints: 500
          },
          currentPoints: 250,
          pointsToNext: 250,
          progress: 50
        }
      });
    }),

    manualTierUpgrade: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Member tier upgraded successfully',
        data: {
          memberId: parseInt(req.params.id),
          oldTier: 'Bronze',
          newTier: 'Silver',
          upgradedAt: new Date()
        }
      });
    }),

    getMemberTierHistory: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          history: [
            {
              id: 1,
              fromTier: 'Bronze',
              toTier: 'Silver',
              upgradedAt: new Date(),
              reason: 'Points threshold reached'
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1
          }
        }
      });
    }),

    updateMemberPoints: jest.fn((req, res) => {
      const { id } = req.params;
      const { points, reason } = req.body;
      res.json({
        success: true,
        message: 'Member points updated successfully',
        data: {
          memberId: parseInt(id),
          previousPoints: 100,
          newPoints: points,
          pointsChange: points - 100,
          reason,
          updatedAt: new Date()
        }
      });
    }),

    getMemberTransactions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          transactions: [
            {
              id: 1,
              amount: 100.00,
              points: 10,
              type: 'purchase',
              description: 'Store purchase',
              createdAt: new Date()
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            pages: 1
          },
          summary: {
            totalTransactions: 1,
            totalAmount: 100.00,
            totalPoints: 10
          }
        }
      });
    }),

    getMemberProfile: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          id: parseInt(req.params.id),
          email: 'member@test.com',
          firstName: 'Test',
          lastName: 'Member',
          phone: '+1234567890',
          dateOfBirth: '1990-01-01',
          preferences: {
            emailNotifications: true,
            smsNotifications: false
          },
          tier: {
            id: 1,
            name: 'Bronze'
          },
          points: 250,
          totalSpent: 500,
          joinedAt: new Date(),
          lastActivity: new Date()
        }
      });
    }),

    getMemberTierProgress: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          currentTier: {
            id: 1,
            name: 'Bronze',
            minPoints: 0
          },
          nextTier: {
            id: 2,
            name: 'Silver',
            minPoints: 500
          },
          currentPoints: 250,
          pointsToNext: 250,
          progress: 50
        }
      });
    }),

    manualTierUpgrade: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Member tier upgraded successfully',
        data: {
          memberId: parseInt(req.params.id),
          oldTier: 'Bronze',
          newTier: 'Silver',
          upgradedAt: new Date()
        }
      });
    }),

    getMemberTierHistory: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          history: [
            {
              id: 1,
              fromTier: 'Bronze',
              toTier: 'Silver',
              upgradedAt: new Date(),
              reason: 'Points threshold reached'
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1
          }
        }
      });
    }),

    activateMember: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Member activated successfully',
        data: {
          id: parseInt(req.params.id),
          isActive: true,
          updatedAt: new Date()
        }
      });
    }),

    deactivateMember: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Member deactivated successfully',
        data: {
          id: parseInt(req.params.id),
          isActive: false,
          updatedAt: new Date()
        }
      });
    }),

    getMemberActivity: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          activities: [
            {
              id: 1,
              type: 'purchase',
              description: 'Made a purchase',
              points: 50,
              timestamp: new Date()
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1
          }
        }
      });
    })
  }
}));

describe('Member Routes', () => {
  let app;
  let token;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/brands/:brandId/members', memberRoutes);
    
    token = generateTestToken({ id: 1, role: 'brand_admin' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/brands/:brandId/members', () => {
    it('should create a new member', async () => {
      const memberData = {
        email: 'newmember@test.com',
        firstName: 'New',
        lastName: 'Member',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/brands/1/members')
        .set('Authorization', `Bearer ${token}`)
        .send(memberData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Member created successfully');
      expect(response.body.data.email).toBe(memberData.email);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/brands/1/members')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/brands/:brandId/members', () => {
    it('should list members', async () => {
      const response = await request(app)
        .get('/api/brands/1/members')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/brands/1/members')
        .expect(401);
    });
  });

  describe('GET /api/brands/:brandId/members/statistics', () => {
    it('should get member statistics', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalMembers).toBeDefined();
      expect(response.body.data.activeMembers).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/members/check-email/:email', () => {
    it('should check email availability', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/check-email/test@example.com')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBeDefined();
    });
  });

  describe('POST /api/brands/:brandId/members/import', () => {
    it('should import members', async () => {
      const response = await request(app)
        .post('/api/brands/1/members/import')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.importId).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/members/export', () => {
    it('should export members', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/export')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exportId).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/members/leaderboard', () => {
    it('should get member leaderboard', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/leaderboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leaderboard).toBeInstanceOf(Array);
    });
  });

  describe('PUT /api/brands/:brandId/members/bulk', () => {
    it('should bulk update members', async () => {
      const updateData = {
        memberIds: [1, 2],
        updates: { isActive: false }
      };

      const response = await request(app)
        .put('/api/brands/1/members/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/members/:id', () => {
    it('should get member by ID', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });
  });

  describe('PUT /api/brands/:brandId/members/:id', () => {
    it('should update member', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put('/api/brands/1/members/1')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Member updated successfully');
    });
  });

  describe('DELETE /api/brands/:brandId/members/:id', () => {
    it('should delete member', async () => {
      const response = await request(app)
        .delete('/api/brands/1/members/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Member deleted successfully');
    });
  });

  describe('GET /api/brands/:brandId/members/:id/dashboard', () => {
    it('should get member dashboard', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/1/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.member).toBeDefined();
    });
  });

  describe('POST /api/brands/:brandId/members/:id/activate', () => {
    it('should activate member', async () => {
      const response = await request(app)
        .post('/api/brands/1/members/1/activate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Member activated successfully');
    });
  });

  describe('POST /api/brands/:brandId/members/:id/deactivate', () => {
    it('should deactivate member', async () => {
      const response = await request(app)
        .post('/api/brands/1/members/1/deactivate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Member deactivated successfully');
    });
  });

  describe('GET /api/brands/:brandId/members/:id/activity', () => {
    it('should get member activity', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/1/activity')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.activities).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/brands/:brandId/members/:id/tier-progress', () => {
    it('should get member tier progress', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/1/tier-progress')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentTier).toBeDefined();
      expect(response.body.data.progress).toBeDefined();
    });
  });

  describe('POST /api/brands/:brandId/members/:id/tier-upgrade', () => {
    it('should manually upgrade member tier', async () => {
      const upgradeData = {
        newTierId: 2,
        reason: 'Manual upgrade for loyalty'
      };

      const response = await request(app)
        .post('/api/brands/1/members/1/tier-upgrade')
        .set('Authorization', `Bearer ${token}`)
        .send(upgradeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Member tier upgraded successfully');
    });
  });

  describe('GET /api/brands/:brandId/members/:id/tier-history', () => {
    it('should get member tier history', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/1/tier-history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/brands/:brandId/members/:id/points', () => {
    it('should update member points', async () => {
      const pointsData = {
        points: 500,
        reason: 'Bonus points for survey completion'
      };

      const response = await request(app)
        .post('/api/brands/1/members/1/points')
        .set('Authorization', `Bearer ${token}`)
        .send(pointsData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Member points updated successfully');
    });
  });

  describe('GET /api/brands/:brandId/members/:id/transactions', () => {
    it('should get member transactions', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeInstanceOf(Array);
      expect(response.body.data.summary).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/members/:id/profile', () => {
    it('should get member profile', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/1/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.email).toBeDefined();
    });
  });
});