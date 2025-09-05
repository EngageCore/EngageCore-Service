/**
 * Tier Routes Tests
 * Tests all tier management API endpoints
 */

const request = require('supertest');
const express = require('express');
const tierRoutes = require('../../src/routes/tiers');
const { generateAdminToken, generateBrandAdminToken, generateTestToken, testData } = require('../utils/testHelpers');

// Mock middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        // Decode the JWT token to get the actual payload
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        if (decoded) {
          req.user = {
            id: decoded.id || 1,
            role: decoded.role || 'user',
            email: decoded.email || 'test@example.com',
            brandId: decoded.brandId
          };
        } else {
          // Fallback to simple token parsing
          if (token.includes('admin')) {
            req.user = { id: 1, role: 'super_admin', email: 'admin@test.com' };
          } else if (token.includes('brand')) {
            req.user = { id: 2, role: 'brand_admin', brandId: 1, email: 'brand@test.com' };
          } else {
            req.user = { id: 3, role: 'user', email: 'user@test.com' };
          }
        }
        next();
      } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
      }
    } else {
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  },
  requireRole: (roles) => (req, res, next) => {
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
    req.brand = { id: 1, name: 'Test Brand', slug: 'test-brand' };
    req.params.brandId = '1';
    next();
  }
}));

jest.mock('../../src/controllers', () => ({
  TierController: {
    createTier: jest.fn((req, res) => {
      const tierData = req.body;
      res.status(201).json({
        success: true,
        message: 'Tier created successfully',
        data: {
          id: 1,
          ...tierData,
          brandId: parseInt(req.params.brandId),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }),

    listTiers: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          tiers: [
            { id: 1, name: 'Bronze', minPoints: 0, maxPoints: 999, description: 'Bronze tier', benefits: ['5% discount'], color: '#CD7F32', isActive: true },
            { id: 2, name: 'Silver', minPoints: 1000, maxPoints: 2999, description: 'Silver tier', benefits: ['10% discount'], color: '#C0C0C0', isActive: true }
          ],
          pagination: { page: 1, limit: 10, total: 2, pages: 1 }
        }
      });
    }),

    getTierById: jest.fn((req, res) => {
      const { id } = req.params;
      res.json({
        success: true,
        data: { id: parseInt(id), name: 'Bronze', minPoints: 0, maxPoints: 999, description: 'Bronze tier', benefits: ['5% discount'], color: '#CD7F32', isActive: true }
      });
    }),

    updateTier: jest.fn((req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      res.json({
        success: true,
        message: 'Tier updated successfully',
        data: {
          id: parseInt(id),
          name: 'Bronze',
          minPoints: 0,
          maxPoints: 999,
          description: 'Bronze tier',
          benefits: ['5% discount'],
          color: '#CD7F32',
          isActive: true,
          ...updateData,
          updatedAt: new Date()
        }
      });
    }),

    deleteTier: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Tier deleted successfully'
      });
    }),

    getTierStatistics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalTiers: 3,
          activeTiers: 3,
          memberDistribution: {
            bronze: 600,
            silver: 300,
            gold: 100
          },
          averagePointsPerTier: {
            bronze: 500,
            silver: 1500,
            gold: 3000
          }
        }
      });
    }),

    reorderTiers: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Tiers reordered successfully',
        data: {
          updatedTiers: req.body.tierOrder.map((id, index) => ({
            id,
            order: index + 1
          }))
        }
      });
    }),

    duplicateTier: jest.fn((req, res) => {
      const { id } = req.params;
      res.json({
        success: true,
        message: 'Tier duplicated successfully',
        data: {
          originalTierId: parseInt(id),
          duplicatedTier: {
            id: 99,
            name: 'Bronze (Copy)',
            description: 'Bronze tier copy',
            minPoints: 0,
            maxPoints: 999,
            createdAt: new Date()
          }
        }
      });
    }),

    createDefaultTiers: jest.fn((req, res) => {
      res.status(201).json({
        success: true,
        message: 'Default tiers created successfully',
        data: {
          tiers: [
            { id: 1, name: 'Bronze', minPoints: 0, maxPoints: 999 },
            { id: 2, name: 'Silver', minPoints: 1000, maxPoints: 2999 },
            { id: 3, name: 'Gold', minPoints: 3000, maxPoints: 4999 },
            { id: 4, name: 'Platinum', minPoints: 5000, maxPoints: null }
          ],
          count: 4
        }
      });
    }),

    getTierProgression: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Tier progression retrieved successfully',
        data: {
          tiers: [
            { id: 1, name: 'Bronze', level: 1, isEntryTier: true, nextTier: { id: 2, name: 'Silver' } },
            { id: 2, name: 'Silver', level: 2, nextTier: { id: 3, name: 'Gold' } },
            { id: 3, name: 'Gold', level: 3, isHighestTier: true, nextTier: null }
          ],
          totalTiers: 3
        }
      });
    }),

    getTierAnalytics: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Tier analytics retrieved successfully',
        data: {
          analytics: {
            tierBreakdown: [
              { tierId: 1, tierName: 'Bronze', memberCount: 100, recentUpgrades: 10 },
              { tierId: 2, tierName: 'Silver', memberCount: 50, recentUpgrades: 5 }
            ],
            summary: { totalTiers: 2, totalMembers: 150, totalRecentUpgrades: 15 }
          }
        }
      });
    }),

    bulkTierAssignment: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Bulk tier assignment completed',
        data: {
          successful: req.body.assignments.map(a => ({ memberId: a.member_id, tierId: a.tier_id })),
          failed: []
        }
      });
    }),

    getPublicTiers: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Public tiers retrieved successfully',
        data: {
          tiers: [
            { id: 1, name: 'Bronze', description: 'Bronze tier', minPoints: 0, maxPoints: 999, benefits: ['5% discount'] },
            { id: 2, name: 'Silver', description: 'Silver tier', minPoints: 1000, maxPoints: 2999, benefits: ['10% discount'] }
          ],
          count: 2
        }
      });
    }),

    getTierMembers: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Tier members retrieved successfully',
        data: {
          members: [
            { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', pointsBalance: 500 },
            { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', pointsBalance: 750 }
          ],
          pagination: { page: 1, limit: 20, total: 2, pages: 1 }
        }
      });
    }),

    getTierBenefits: jest.fn((req, res) => {
      const { id } = req.params;
      res.json({
        success: true,
        message: 'Tier benefits retrieved successfully',
        data: {
          tierId: parseInt(id),
          tierName: 'Bronze',
          benefits: ['5% discount', 'Free shipping']
        }
      });
    }),

    updateTierBenefits: jest.fn((req, res) => {
      const { id } = req.params;
      res.json({
        success: true,
        message: 'Tier benefits updated successfully',
        data: {
          tierId: parseInt(id),
          tierName: 'Bronze',
          benefits: req.body.benefits
        }
      });
    })
  }
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/brands/:brandId/tiers', tierRoutes);

describe('Tier Routes', () => {
  let adminToken;
  let brandAdminToken;
  let userToken;

  beforeEach(() => {
    jest.clearAllMocks();
    adminToken = generateAdminToken({ role: 'super_admin' });
    brandAdminToken = generateBrandAdminToken(1, { role: 'brand_admin' });
    userToken = generateTestToken({ role: 'user' });
  });

  describe('POST /', () => {
    test('should create tier as brand admin', async () => {
      const tierData = {
        name: 'Platinum',
        description: 'Platinum tier',
        minPoints: 5000,
        maxPoints: 9999,
        benefits: ['20% discount', 'Priority support'],
        color: '#E5E4E2'
      };

      const response = await request(app)
        .post('/api/brands/1/tiers')
        .set('Authorization', `Bearer ${brandAdminToken}`)
        .send(tierData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(tierData.name);
    });

    test('should reject tier creation by regular user', async () => {
      const tierData = {
        name: 'Platinum',
        minPoints: 5000,
        maxPoints: 9999
      };

      const response = await request(app)
        .post('/api/brands/1/tiers')
        .set('Authorization', `Bearer ${userToken}`)
        .send(tierData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /', () => {
    test('should list tiers', async () => {
      const response = await request(app)
        .get('/api/brands/1/tiers')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tiers');
      expect(Array.isArray(response.body.data.tiers)).toBe(true);
      
    });
  });

  describe('GET /:id', () => {
    test('should get tier by ID', async () => {
      const response = await request(app)
        .get('/api/brands/1/tiers/1')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 1);
      
    });
  });

  describe('PUT /:id', () => {
    test('should update tier', async () => {
      const updateData = {
        name: 'Updated Bronze',
        benefits: ['15% discount', 'Free shipping']
      };

      const response = await request(app)
        .put('/api/brands/1/tiers/1')
        .set('Authorization', `Bearer ${brandAdminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      
    });
  });

  describe('DELETE /:id', () => {
    test('should delete tier', async () => {
      const response = await request(app)
        .delete('/api/brands/1/tiers/1')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
    });
  });

  describe('GET /:id/statistics', () => {
    test('should get tier statistics', async () => {
      const response = await request(app)
        .get('/api/brands/1/tiers/1/statistics')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTiers');
      expect(response.body.data).toHaveProperty('memberDistribution');
      
    });
  });

  describe('PUT /reorder', () => {
    test('should reorder tiers', async () => {
      const reorderData = {
        tierOrder: [3, 1, 2]
      };

      const response = await request(app)
        .put('/api/brands/1/tiers/reorder')
        .set('Authorization', `Bearer ${brandAdminToken}`)
        .send(reorderData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('updatedTiers');
      
    });
  });

  describe('POST /:id/duplicate', () => {
    test('should duplicate tier', async () => {
      const response = await request(app)
        .post('/api/brands/1/tiers/1/duplicate')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('duplicatedTier');
      expect(response.body.data.duplicatedTier).toHaveProperty('id');
      
    });
  });
});