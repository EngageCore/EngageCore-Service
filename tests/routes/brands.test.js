/**
 * Brand Routes Tests
 * Tests all brand management API endpoints
 */

const request = require('supertest');
const express = require('express');
const brandRoutes = require('../../src/routes/brands');
const { generateAdminToken, generateBrandAdminToken, generateTestToken, testData } = require('../utils/testHelpers');
const { mockPool } = require('../mocks/database');

// Mock middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        // Mock JWT decode to get user info from token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        req.user = {
          id: decoded.id || 1,
          role: decoded.role || 'user',
          email: decoded.email || 'test@example.com',
          brandId: decoded.brandId || null
        };
        next();
      } catch (error) {
        req.user = { id: 3, role: 'user', email: 'user@test.com' };
        next();
      }
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
  uploadRateLimit: (req, res, next) => next(),
  sensitiveSlowDown: (req, res, next) => next()
}));

jest.mock('../../src/middleware/brandContext', () => ({
  validateBrandAccess: (req, res, next) => {
    req.brand = { id: 1, name: 'Test Brand', slug: 'test-brand' };
    next();
  }
}));

// Mock controllers with inline definition to avoid hoisting issues
jest.mock('../../src/controllers', () => ({
  BrandController: {
  createBrand: jest.fn((req, res) => {
    const brandData = req.body;
    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: {
        id: 1,
        ...brandData,
        slug: brandData.name.toLowerCase().replace(/\s+/g, '-'),
        apiKey: 'test-api-key',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }),

  listBrands: jest.fn((req, res) => {
    res.json({
      success: true,
      data: {
        brands: [
          {
            id: 1,
            name: 'Test Brand',
            slug: 'test-brand',
            description: 'Test brand description',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 2,
            name: 'Brand 2',
            slug: 'brand-2',
            description: 'Brand 2 description',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1
        }
      }
    });
  }),

  getBrandBySlug: jest.fn((req, res) => {
    const { slug } = req.params;
    res.json({
      success: true,
      data: {
        id: 1,
        name: 'Test Brand',
        slug,
        description: 'Test brand description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }),

  checkSlugAvailability: jest.fn((req, res) => {
    const { slug } = req.params;
    res.json({
      success: true,
      data: {
        slug,
        available: slug !== 'taken-slug'
      }
    });
  }),

  getBrandById: jest.fn((req, res) => {
    const { id } = req.params;
    res.json({
      success: true,
      data: {
        id: parseInt(id),
        name: 'Test Brand',
        slug: 'test-brand',
        description: 'Test brand description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }),

  updateBrand: jest.fn((req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    res.json({
      success: true,
      message: 'Brand updated successfully',
      data: {
        id: parseInt(id),
        name: 'Test Brand',
        slug: 'test-brand',
        description: 'Test brand description',
        isActive: true,
        createdAt: new Date(),
        ...updateData,
        updatedAt: new Date()
      }
    });
  }),

  updateBrandSettings: jest.fn((req, res) => {
    const { id } = req.params;
    const settings = req.body;
    res.json({
      success: true,
      message: 'Brand settings updated successfully',
      data: {
        brandId: parseInt(id),
        settings,
        updatedAt: new Date()
      }
    });
  }),

  deleteBrand: jest.fn((req, res) => {
    res.json({
      success: true,
      message: 'Brand deleted successfully'
    });
  }),

  uploadLogo: jest.fn((req, res) => {
    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logoUrl: 'https://example.com/logos/test-brand-logo.jpg',
        uploadedAt: new Date()
      }
    });
  }),

  getBrandStatistics: jest.fn((req, res) => {
    res.json({
      success: true,
      data: {
        totalMembers: 1000,
        activeMembers: 800,
        totalTransactions: 5000,
        totalRevenue: 250000,
        averageOrderValue: 50,
        memberGrowth: {
          thisMonth: 50,
          lastMonth: 45,
          growthRate: 11.1
        },
        topTiers: [
          { name: 'Gold', memberCount: 100 },
          { name: 'Silver', memberCount: 300 },
          { name: 'Bronze', memberCount: 600 }
        ]
      }
    });
  }),

  regenerateApiKey: jest.fn((req, res) => {
    res.json({
      success: true,
      message: 'API key regenerated successfully',
      data: {
        apiKey: 'new-api-key-12345',
        regeneratedAt: new Date()
      }
    });
  }),

  getBrandDashboard: jest.fn((req, res) => {
    res.json({
      success: true,
      data: {
        overview: {
          totalMembers: 1000,
          activeMembers: 800,
          totalTransactions: 5000,
          totalRevenue: 250000
        },
        recentActivity: [
          {
            id: 1,
            type: 'member_joined',
            description: 'New member joined',
            timestamp: new Date()
          }
        ],
        charts: {
          memberGrowth: [{ date: '2024-01-01', count: 100 }],
          revenueGrowth: [{ date: '2024-01-01', amount: 5000 }]
        }
      }
    });
  }),

  getBrandMembersSummary: jest.fn((req, res) => {
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
        averagePointsPerMember: 150,
        topMembers: [
          {
            id: 1,
            name: 'John Doe',
            points: 1000,
            tier: 'Gold'
          }
        ]
      }
    });
  }),

  getBrandActivity: jest.fn((req, res) => {
    res.json({
      success: true,
      data: {
        activities: [
          {
            id: 1,
            type: 'member_joined',
            description: 'New member John Doe joined',
            timestamp: new Date(),
            metadata: { memberId: 1, memberName: 'John Doe' }
          },
          {
            id: 2,
            type: 'transaction_completed',
            description: 'Transaction completed for $50',
            timestamp: new Date(),
            metadata: { transactionId: 1, amount: 50 }
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1
        }
      }
    });
  }),

  exportBrandData: jest.fn((req, res) => {
    res.json({
      success: true,
      message: 'Export initiated successfully',
      data: {
        exportId: 'export-123',
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000),
        downloadUrl: null
      }
    });
  }),

  cloneBrand: jest.fn((req, res) => {
    res.json({
      success: true,
      message: 'Brand cloned successfully',
      data: {
        originalBrandId: 1,
        clonedBrand: {
          id: 2,
          name: 'Test Brand (Copy)',
          slug: 'test-brand-copy',
          createdAt: new Date()
        }
      }
    });
  })
  }
}));

// Get reference to mocked controller for test assertions
const { BrandController } = require('../../src/controllers');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/brands', brandRoutes);

describe('Brand Routes', () => {
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
    test('should create brand as super admin', async () => {
      const brandData = {
        name: 'New Brand',
        description: 'A new test brand',
        website: 'https://newbrand.com'
      };

      const response = await request(app)
        .post('/api/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(brandData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(brandData.name);
      expect(BrandController.createBrand).toHaveBeenCalled();
    });

    test('should reject brand creation by non-admin', async () => {
      const brandData = {
        name: 'New Brand',
        description: 'A new test brand'
      };

      const response = await request(app)
        .post('/api/brands')
        .set('Authorization', `Bearer ${userToken}`)
        .send(brandData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /', () => {
    test('should list brands with authentication', async () => {
      const response = await request(app)
        .get('/api/brands')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('brands');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.brands)).toBe(true);
      expect(BrandController.listBrands).toHaveBeenCalled();
    });

    test('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/brands');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /slug/:slug', () => {
    test('should get brand by slug (public endpoint)', async () => {
      const response = await request(app)
        .get('/api/brands/slug/test-brand');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('slug', 'test-brand');
      expect(BrandController.getBrandBySlug).toHaveBeenCalled();
    });
  });

  describe('GET /check-slug/:slug', () => {
    test('should check slug availability', async () => {
      const response = await request(app)
        .get('/api/brands/check-slug/available-slug')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('available', true);
      expect(BrandController.checkSlugAvailability).toHaveBeenCalled();
    });

    test('should show slug as unavailable', async () => {
      const response = await request(app)
        .get('/api/brands/check-slug/taken-slug')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('available', false);
    });
  });

  describe('GET /:id', () => {
    test('should get brand by ID', async () => {
      const response = await request(app)
        .get('/api/brands/1')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 1);
      expect(BrandController.getBrandById).toHaveBeenCalled();
    });
  });

  describe('PUT /:id', () => {
    test('should update brand as brand admin', async () => {
      const updateData = {
        name: 'Updated Brand Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put('/api/brands/1')
        .set('Authorization', `Bearer ${brandAdminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(BrandController.updateBrand).toHaveBeenCalled();
    });

    test('should reject update by regular user', async () => {
      const updateData = {
        name: 'Updated Brand Name'
      };

      const response = await request(app)
        .put('/api/brands/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /:id/settings', () => {
    test('should update brand settings', async () => {
      const settings = {
        allowRegistration: true,
        maxMembersPerTier: 1000,
        pointsExpiryDays: 365
      };

      const response = await request(app)
        .put('/api/brands/1/settings')
        .set('Authorization', `Bearer ${brandAdminToken}`)
        .send(settings);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.settings).toEqual(settings);
      expect(BrandController.updateBrandSettings).toHaveBeenCalled();
    });
  });

  describe('DELETE /:id', () => {
    test('should delete brand as super admin', async () => {
      const response = await request(app)
        .delete('/api/brands/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(BrandController.deleteBrand).toHaveBeenCalled();
    });

    test('should reject deletion by brand admin', async () => {
      const response = await request(app)
        .delete('/api/brands/1')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /:id/logo', () => {
    test('should upload brand logo', async () => {
      const response = await request(app)
        .post('/api/brands/1/logo')
        .set('Authorization', `Bearer ${brandAdminToken}`)
        .attach('logo', Buffer.from('fake image data'), 'logo.jpg');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logoUrl');
      expect(BrandController.uploadLogo).toHaveBeenCalled();
    });
  });

  describe('GET /:id/statistics', () => {
    test('should get brand statistics', async () => {
      const response = await request(app)
        .get('/api/brands/1/statistics')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalMembers');
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('memberGrowth');
      expect(BrandController.getBrandStatistics).toHaveBeenCalled();
    });
  });

  describe('POST /:id/regenerate-api-key', () => {
    test('should regenerate API key', async () => {
      const response = await request(app)
        .post('/api/brands/1/regenerate-api-key')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('apiKey');
      expect(BrandController.regenerateApiKey).toHaveBeenCalled();
    });
  });

  describe('GET /:id/dashboard', () => {
    test('should get brand dashboard', async () => {
      const response = await request(app)
        .get('/api/brands/1/dashboard')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(response.body.data).toHaveProperty('charts');
      expect(BrandController.getBrandDashboard).toHaveBeenCalled();
    });
  });

  describe('GET /:id/members/summary', () => {
    test('should get brand members summary', async () => {
      const response = await request(app)
        .get('/api/brands/1/members/summary')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalMembers');
      expect(response.body.data).toHaveProperty('membersByTier');
      expect(response.body.data).toHaveProperty('topMembers');
      expect(BrandController.getBrandMembersSummary).toHaveBeenCalled();
    });
  });

  describe('GET /:id/activity', () => {
    test('should get brand activity feed', async () => {
      const response = await request(app)
        .get('/api/brands/1/activity')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('activities');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.activities)).toBe(true);
      expect(BrandController.getBrandActivity).toHaveBeenCalled();
    });
  });

  describe('GET /:id/export', () => {
    test('should initiate brand data export', async () => {
      const response = await request(app)
        .get('/api/brands/1/export')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('exportId');
      expect(response.body.data).toHaveProperty('status', 'processing');
      expect(BrandController.exportBrandData).toHaveBeenCalled();
    });
  });

  describe('POST /:id/clone', () => {
    test('should clone brand as super admin', async () => {
      const response = await request(app)
        .post('/api/brands/1/clone')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('clonedBrand');
      expect(response.body.data.clonedBrand).toHaveProperty('id');
      expect(BrandController.cloneBrand).toHaveBeenCalled();
    });

    test('should reject cloning by brand admin', async () => {
      const response = await request(app)
        .post('/api/brands/1/clone')
        .set('Authorization', `Bearer ${brandAdminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});