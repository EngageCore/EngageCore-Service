/**
 * User Routes Tests
 * Tests all user management API endpoints
 */

const request = require('supertest');
const express = require('express');
const userRoutes = require('../../src/routes/users');
const { generateTestToken, generateAdminToken } = require('../utils/testHelpers');

// Mock middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    if (req.headers.authorization) {
      req.user = { id: 1, email: 'test@example.com', role: 'super_admin' };
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

jest.mock('../../src/validators', () => ({
  userValidators: {
    createUserSchema: {},
    listUsersSchema: {},
    getUserSchema: {},
    updateUserSchema: {},
    deleteUserSchema: {},
    getUserStatisticsSchema: {},
    bulkUpdateUsersSchema: {},
    exportUsersSchema: {},
    importUsersSchema: {}
  }
}));

// Mock controllers with inline definition to avoid hoisting issues
jest.mock('../../src/controllers', () => ({
  UserController: {
    createUser: jest.fn((req, res) => {
      const userData = req.body;
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: 1,
          ...userData,
          createdAt: new Date()
        }
      });
    }),

    listUsers: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          users: [
            {
              id: 1,
              email: 'user1@example.com',
              firstName: 'John',
              lastName: 'Doe',
              role: 'user',
              isActive: true,
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

    getUserById: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          id: parseInt(req.params.id),
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'user',
          isActive: true,
          createdAt: new Date()
        }
      });
    }),

    updateUser: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'User updated successfully',
        data: {
          id: parseInt(req.params.id),
          ...req.body,
          updatedAt: new Date()
        }
      });
    }),

    deleteUser: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    }),

    getUserStatistics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalUsers: 1000,
          activeUsers: 850,
          inactiveUsers: 150,
          usersByRole: {
            super_admin: 5,
            brand_admin: 50,
            user: 945
          },
          userGrowthRate: 15.5
        }
      });
    }),

    bulkUpdateUsers: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Users updated successfully',
        data: {
          updated: req.body.userIds.length,
          failed: 0
        }
      });
    }),

    exportUsers: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Export initiated successfully',
        data: {
          exportId: 'export-123',
          status: 'processing',
          estimatedCompletion: new Date(Date.now() + 300000)
        }
      });
    }),

    importUsers: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Import initiated successfully',
        data: {
          importId: 'import-456',
          status: 'processing',
          totalRows: 100,
          processedRows: 0
        }
      });
    }),

    getCurrentUser: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          id: req.user.id,
          email: req.user.email,
          firstName: 'Current',
          lastName: 'User',
          role: req.user.role
        }
      });
    }),

    updateCurrentUser: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: req.user.id,
          ...req.body,
          updatedAt: new Date()
        }
      });
    }),

    getUserDashboard: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          stats: { totalLogins: 50, lastLogin: new Date() },
          recentActivity: []
        }
      });
    }),

    getUserSessions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          sessions: [{
            id: 'session-123',
            device: 'Chrome Browser',
            lastActive: new Date()
          }]
        }
      });
    }),

    changeUserPassword: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    }),

    getUserActivityLog: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          activities: [{
            id: 1,
            action: 'login',
            timestamp: new Date()
          }]
        }
      });
    }),

    updateUserStatus: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'User status updated successfully'
      });
    }),

    activateUser: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'User activated successfully'
      });
    }),

    deactivateUser: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    }),

    getUserPermissions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          permissions: ['read', 'write']
        }
      });
    }),

    getUserRoles: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          roles: ['user']
        }
      });
    })
  }
}));

describe('User Routes', () => {
  let app;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);
    
    adminToken = generateAdminToken({ role: 'super_admin' });
    userToken = generateTestToken({ role: 'user' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/users', () => {
    it('should create user as admin', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data.email).toBe(userData.email);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/users')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/users', () => {
    it('should list users as admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/users/statistics', () => {
    it('should get user statistics', async () => {
      const response = await request(app)
        .get('/api/users/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalUsers).toBeDefined();
      expect(response.body.data.usersByRole).toBeDefined();
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID', async () => {
      const response = await request(app)
        .get('/api/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User updated successfully');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      const response = await request(app)
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');
    });
  });

  describe('POST /api/users/bulk-update', () => {
    it('should bulk update users', async () => {
      const bulkData = {
        userIds: [1, 2, 3],
        updates: {
          isActive: false
        }
      };

      const response = await request(app)
        .post('/api/users/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(3);
    });
  });

  describe('GET /api/users/export', () => {
    it('should export users', async () => {
      const response = await request(app)
        .get('/api/users/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exportId).toBeDefined();
    });
  });


});