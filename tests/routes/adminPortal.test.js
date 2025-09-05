/**
 * Admin Portal Routes Tests
 * Tests all admin portal API endpoints with authentication flow
 */

const request = require('supertest');
const express = require('express');
const { generateTestToken, generateAdminToken, generateBrandAdminToken, testData, mockQueryResult } = require('../utils/testHelpers');
const { mockPool } = require('../mocks/database');

// Mock problematic modules to avoid circular dependency issues
jest.mock('../../src/validators', () => ({
  adminValidators: {
    getSystemAnalyticsSchema: {},
    getAuditLogsSchema: {}
  },
  userValidators: {
    listUsersSchema: {},
    createUserSchema: {},
    getUserSchema: {},
    updateUserSchema: {},
    deleteUserSchema: {}
  },
  brandValidators: {
    listBrandsSchema: {},
    createBrandSchema: {},
    getBrandSchema: {},
    updateBrandSchema: {}
  },
  memberValidators: {
    listMembersSchema: {},
    createMemberSchema: {},
    getMemberSchema: {},
    updateMemberSchema: {}
  },
  missionValidators: {
    listMissionsSchema: {},
    createMissionSchema: {}
  },
  wheelValidators: {
    listWheelsSchema: {},
    createWheelSchema: {}
  },
  transactionValidators: {
    listTransactionsSchema: {}
  },
  tierValidators: {
    listTiersSchema: {},
    createTierSchema: {}
  }
}));

// Mock middleware
jest.mock('../../src/middleware', () => ({
  auth: {
    authenticate: (req, res, next) => {
      if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        if (token === 'super-admin-token') {
          req.user = { id: 1, email: 'admin@example.com', role: 'super_admin', brandId: null };
        } else if (token === 'brand-admin-token') {
          req.user = { id: 2, email: 'brandadmin@example.com', role: 'brand_admin', brandId: 1 };
        } else {
          req.user = { id: 3, email: 'user@example.com', role: 'user', brandId: 1 };
        }
        next();
      } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
      }
    },
    requireRole: (roles) => (req, res, next) => {
      if (roles.includes(req.user.role)) {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }
  },
  validation: {
    validate: () => (req, res, next) => next()
  },
  rateLimit: {
    generalRateLimit: (req, res, next) => next()
  },
  brandContext: {
    validateBrandOwnership: (req, res, next) => {
      // Handle both :brandId and :id parameters
      const brandId = req.params.brandId || req.params.id;
      if (req.user.role === 'super_admin' || req.user.brandId === parseInt(brandId)) {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Brand access denied' });
      }
    }
  }
}));

// Mock controllers
jest.mock('../../src/controllers', () => ({
  AdminController: {
    getSystemDashboard: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalUsers: 150,
          totalBrands: 25,
          totalMembers: 1200,
          systemHealth: 'healthy',
          uptime: '99.9%'
        }
      });
    }),
    getSystemAnalytics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          userGrowth: { current: 150, previous: 140, growth: 7.1 },
          engagement: { activeUsers: 120, engagementRate: 80 },
          revenue: { total: 50000, growth: 15.5 }
        }
      });
    }),
    getSystemHealth: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          database: 'connected',
          redis: 'connected',
          uptime: process.uptime()
        }
      });
    }),
    getAuditLogs: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          logs: [
            { id: 1, action: 'user_created', userId: 1, timestamp: new Date() },
            { id: 2, action: 'brand_updated', userId: 1, timestamp: new Date() }
          ],
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    })
  },
  UserController: {
    listUsers: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          users: [
            { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User', role: 'user', isActive: true },
            { id: 2, email: 'user2@example.com', firstName: 'User', lastName: 'Two', role: 'user', isActive: true }
          ],
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    }),
    createUser: jest.fn((req, res) => {
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user: { id: 3, ...req.body, isActive: true, createdAt: new Date() } }
      });
    }),
    getUserById: jest.fn((req, res) => {
      res.json({
        success: true,
        data: { user: { id: parseInt(req.params.id), email: 'test@example.com', firstName: 'Test', lastName: 'User', role: 'user', isActive: true } }
      });
    }),
    updateUser: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'User updated successfully',
        data: { user: { id: parseInt(req.params.id), ...req.body, isActive: true, updatedAt: new Date() } }
      });
    }),
    deleteUser: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    })
  },
  BrandController: {
    listBrands: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          brands: [
            { id: 1, name: 'Test Brand', slug: 'test-brand', description: 'Test brand description', isActive: true },
            { id: 2, name: 'Brand 2', slug: 'brand-2', description: 'Second brand description', isActive: true }
          ],
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    }),
    createBrand: jest.fn((req, res) => {
      res.status(201).json({
        success: true,
        message: 'Brand created successfully',
        data: { brand: { id: 3, ...req.body, isActive: true, createdAt: new Date() } }
      });
    }),
    getBrandById: jest.fn((req, res) => {
      res.json({
        success: true,
        data: { brand: { id: parseInt(req.params.id), name: 'Test Brand', slug: 'test-brand', isActive: true } }
      });
    }),
    updateBrand: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Brand updated successfully',
        data: { brand: { id: parseInt(req.params.id), ...req.body, isActive: true, updatedAt: new Date() } }
      });
    })
  },
  MemberController: {
    listMembers: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          members: [
            { id: 1, userId: 1, brandId: 1, tierId: 1, points: 100, totalSpent: 500.00, isActive: true },
            { id: 2, userId: 2, brandId: 1, tierId: 1, points: 150, totalSpent: 300.00, isActive: true }
          ],
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    }),
    createMember: jest.fn((req, res) => {
      res.status(201).json({
        success: true,
        message: 'Member created successfully',
        data: { member: { id: 3, ...req.body, brandId: 1, points: 0, isActive: true } }
      });
    }),
    getMemberById: jest.fn((req, res) => {
      res.json({
        success: true,
        data: { member: { id: parseInt(req.params.id), userId: 1, brandId: 1, tierId: 1, points: 100, isActive: true } }
      });
    }),
    updateMember: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Member updated successfully',
        data: { member: { id: parseInt(req.params.id), ...req.body, brandId: 1, isActive: true } }
      });
    })
  },
  MissionController: {
    listMissions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          missions: [
            { id: 1, brandId: 1, title: 'Test Mission', description: 'Complete test mission', type: 'purchase', target: 100, reward: 50, isActive: true },
            { id: 2, brandId: 1, title: 'Mission 2', description: 'Second mission', type: 'spending', target: 200, reward: 75, isActive: true }
          ],
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    }),
    createMission: jest.fn((req, res) => {
      res.status(201).json({
        success: true,
        message: 'Mission created successfully',
        data: { mission: { id: 3, ...req.body, brandId: 1, isActive: true, createdAt: new Date() } }
      });
    })
  },
  WheelController: {
    listWheels: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          wheels: [
            { id: 1, brandId: 1, name: 'Test Wheel', description: 'Test wheel description', costToSpin: 10, maxSpinsPerDay: 3, isActive: true },
            { id: 2, brandId: 1, name: 'Wheel 2', description: 'Second wheel', costToSpin: 20, maxSpinsPerDay: 5, isActive: true }
          ],
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    }),
    createWheel: jest.fn((req, res) => {
      res.status(201).json({
        success: true,
        message: 'Wheel created successfully',
        data: { wheel: { id: 3, ...req.body, brandId: 1, isActive: true, createdAt: new Date() } }
      });
    })
  },
  TransactionController: {
    listTransactions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          transactions: [
            { id: 1, memberId: 1, brandId: 1, type: 'purchase', amount: 100.00, points: 10, description: 'Test transaction' },
            { id: 2, memberId: 1, brandId: 1, type: 'purchase', amount: 200.00, points: 20, description: 'Second transaction' }
          ],
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    })
  },
  TierController: {
    listTiers: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          tiers: [
            { id: 1, brandId: 1, name: 'Bronze', description: 'Bronze tier', minPoints: 0, maxPoints: 999, benefits: ['10% discount'], isActive: true },
            { id: 2, brandId: 1, name: 'Silver', description: 'Silver tier', minPoints: 1000, maxPoints: 4999, benefits: ['15% discount'], isActive: true }
          ],
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    }),
    createTier: jest.fn((req, res) => {
      res.status(201).json({
        success: true,
        message: 'Tier created successfully',
        data: { tier: { id: 3, ...req.body, brandId: 1, isActive: true, createdAt: new Date() } }
      });
    })
  }
}));

// Get reference to mocked controllers for test assertions
const { AdminController, UserController, BrandController, MemberController, MissionController, WheelController, TransactionController, TierController } = require('../../src/controllers');

// Import routes after mocks
const adminPortalRoutes = require('../../src/routes/adminPortal');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/admin', adminPortalRoutes);

describe('Admin Portal Routes', () => {
  let superAdminToken;
  let brandAdminToken;
  let userToken;

  beforeEach(() => {
    jest.clearAllMocks();
    superAdminToken = 'super-admin-token';
    brandAdminToken = 'brand-admin-token';
    userToken = 'user-token';
  });

  describe('System Administration Routes', () => {
    describe('GET /dashboard', () => {
      test('should get system dashboard for super admin', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('totalUsers');
        expect(response.body.data).toHaveProperty('totalBrands');
        expect(response.body.data).toHaveProperty('systemHealth');
        expect(AdminController.getSystemDashboard).toHaveBeenCalled();
      });

      test('should reject access for non-super admin', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard')
          .set('Authorization', `Bearer ${brandAdminToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      test('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /analytics', () => {
      test('should get system analytics for super admin', async () => {
        const response = await request(app)
          .get('/api/admin/analytics')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('userGrowth');
        expect(response.body.data).toHaveProperty('engagement');
        expect(AdminController.getSystemAnalytics).toHaveBeenCalled();
      });
    });

    describe('GET /health', () => {
      test('should get system health status', async () => {
        const response = await request(app)
          .get('/api/admin/health')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('status');
        expect(response.body.data).toHaveProperty('database');
        expect(AdminController.getSystemHealth).toHaveBeenCalled();
      });
    });

    describe('GET /audit-logs', () => {
      test('should get audit logs for super admin', async () => {
        const response = await request(app)
          .get('/api/admin/audit-logs')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('logs');
        expect(response.body.data).toHaveProperty('pagination');
        expect(AdminController.getAuditLogs).toHaveBeenCalled();
      });
    });
  });

  describe('User Management Routes', () => {
    describe('GET /users', () => {
      test('should list all users for super admin', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('users');
        expect(response.body.data).toHaveProperty('pagination');
        expect(UserController.listUsers).toHaveBeenCalled();
      });
    });

    describe('POST /users', () => {
      test('should create new user for super admin', async () => {
        const userData = {
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User',
          role: 'user'
        };

        const response = await request(app)
          .post('/api/admin/users')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(userData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('user');
        expect(UserController.createUser).toHaveBeenCalled();
      });
    });

    describe('GET /users/:id', () => {
      test('should get user by ID', async () => {
        const response = await request(app)
          .get('/api/admin/users/1')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('user');
        expect(UserController.getUserById).toHaveBeenCalled();
      });
    });

    describe('PUT /users/:id', () => {
      test('should update user', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name'
        };

        const response = await request(app)
          .put('/api/admin/users/1')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(UserController.updateUser).toHaveBeenCalled();
      });
    });

    describe('DELETE /users/:id', () => {
      test('should delete user', async () => {
        const response = await request(app)
          .delete('/api/admin/users/1')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(UserController.deleteUser).toHaveBeenCalled();
      });
    });
  });

  describe('Brand Management Routes', () => {
    describe('GET /brands', () => {
      test('should list brands for super admin', async () => {
        const response = await request(app)
          .get('/api/admin/brands')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('brands');
        expect(BrandController.listBrands).toHaveBeenCalled();
      });

      test('should list brands for brand admin', async () => {
        const response = await request(app)
          .get('/api/admin/brands')
          .set('Authorization', `Bearer ${brandAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(BrandController.listBrands).toHaveBeenCalled();
      });
    });

    describe('POST /brands', () => {
      test('should create brand for super admin', async () => {
        const brandData = {
          name: 'New Brand',
          slug: 'new-brand',
          description: 'New brand description'
        };

        const response = await request(app)
          .post('/api/admin/brands')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(brandData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(BrandController.createBrand).toHaveBeenCalled();
      });

      test('should reject brand creation for brand admin', async () => {
        const brandData = {
          name: 'New Brand',
          slug: 'new-brand'
        };

        const response = await request(app)
          .post('/api/admin/brands')
          .set('Authorization', `Bearer ${brandAdminToken}`)
          .send(brandData);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /brands/:id', () => {
      test('should get brand by ID for super admin', async () => {
        const response = await request(app)
          .get('/api/admin/brands/1')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(BrandController.getBrandById).toHaveBeenCalled();
      });

      test('should get own brand for brand admin', async () => {
        const response = await request(app)
          .get('/api/admin/brands/1')
          .set('Authorization', `Bearer ${brandAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(BrandController.getBrandById).toHaveBeenCalled();
      });
    });

    describe('PUT /brands/:id', () => {
      test('should update brand', async () => {
        const updateData = {
          name: 'Updated Brand Name'
        };

        const response = await request(app)
          .put('/api/admin/brands/1')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(BrandController.updateBrand).toHaveBeenCalled();
      });
    });
  });

  describe('Member Management Routes', () => {
    describe('GET /brands/:brandId/members', () => {
      test('should list brand members', async () => {
        const response = await request(app)
          .get('/api/admin/brands/1/members')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('members');
        expect(MemberController.listMembers).toHaveBeenCalled();
      });
    });

    describe('POST /brands/:brandId/members', () => {
      test('should create new member', async () => {
        const memberData = {
          userId: 1,
          tierId: 1
        };

        const response = await request(app)
          .post('/api/admin/brands/1/members')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(memberData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(MemberController.createMember).toHaveBeenCalled();
      });
    });

    describe('GET /brands/:brandId/members/:id', () => {
      test('should get member by ID', async () => {
        const response = await request(app)
          .get('/api/admin/brands/1/members/1')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(MemberController.getMemberById).toHaveBeenCalled();
      });
    });

    describe('PUT /brands/:brandId/members/:id', () => {
      test('should update member', async () => {
        const updateData = {
          points: 200
        };

        const response = await request(app)
          .put('/api/admin/brands/1/members/1')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(MemberController.updateMember).toHaveBeenCalled();
      });
    });
  });

  describe('Mission Management Routes', () => {
    describe('GET /brands/:brandId/missions', () => {
      test('should list brand missions', async () => {
        const response = await request(app)
          .get('/api/admin/brands/1/missions')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('missions');
        expect(MissionController.listMissions).toHaveBeenCalled();
      });
    });

    describe('POST /brands/:brandId/missions', () => {
      test('should create new mission', async () => {
        const missionData = {
          title: 'New Mission',
          description: 'Complete this mission',
          type: 'purchase',
          target: 100,
          reward: 50
        };

        const response = await request(app)
          .post('/api/admin/brands/1/missions')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(missionData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(MissionController.createMission).toHaveBeenCalled();
      });
    });
  });

  describe('Wheel Management Routes', () => {
    describe('GET /brands/:brandId/wheels', () => {
      test('should list brand wheels', async () => {
        const response = await request(app)
          .get('/api/admin/brands/1/wheels')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('wheels');
        expect(WheelController.listWheels).toHaveBeenCalled();
      });
    });

    describe('POST /brands/:brandId/wheels', () => {
      test('should create new wheel', async () => {
        const wheelData = {
          name: 'New Wheel',
          description: 'New wheel description',
          segments: [
            { label: 'Prize 1', probability: 0.5, reward: { type: 'points', value: 10 } }
          ],
          costToSpin: 10
        };

        const response = await request(app)
          .post('/api/admin/brands/1/wheels')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(wheelData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(WheelController.createWheel).toHaveBeenCalled();
      });
    });
  });

  describe('Transaction Management Routes', () => {
    describe('GET /brands/:brandId/transactions', () => {
      test('should list brand transactions', async () => {
        const response = await request(app)
          .get('/api/admin/brands/1/transactions')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transactions');
        expect(TransactionController.listTransactions).toHaveBeenCalled();
      });
    });
  });

  describe('Tier Management Routes', () => {
    describe('GET /brands/:brandId/tiers', () => {
      test('should list brand tiers', async () => {
        const response = await request(app)
          .get('/api/admin/brands/1/tiers')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('tiers');
        expect(TierController.listTiers).toHaveBeenCalled();
      });
    });

    describe('POST /brands/:brandId/tiers', () => {
      test('should create new tier', async () => {
        const tierData = {
          name: 'Gold',
          description: 'Gold tier',
          minPoints: 1000,
          maxPoints: 4999
        };

        const response = await request(app)
          .post('/api/admin/brands/1/tiers')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(tierData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(TierController.createTier).toHaveBeenCalled();
      });
    });
  });

  describe('Authorization Tests', () => {
    test('should reject all requests without authentication', async () => {
      const endpoints = [
        '/api/admin/dashboard',
        '/api/admin/users',
        '/api/admin/brands',
        '/api/admin/brands/1/members'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    test('should reject super admin only endpoints for brand admin', async () => {
      const superAdminOnlyEndpoints = [
        '/api/admin/dashboard',
        '/api/admin/analytics',
        '/api/admin/health',
        '/api/admin/audit-logs',
        '/api/admin/users'
      ];

      for (const endpoint of superAdminOnlyEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${brandAdminToken}`);
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      }
    });
  });
});