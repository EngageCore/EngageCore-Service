/**
 * Admin Routes Tests
 * Tests all administrative API endpoints
 */

const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../src/routes/admin');
const { generateAdminToken, generateTestToken, testData, mockDatabaseQueries } = require('../utils/testHelpers');
const { mockPool } = require('../mocks/database');

// Mock middleware - consolidated in the main mock section below

// Mock controllers with inline definition to avoid hoisting issues
jest.mock('../../src/controllers', () => ({
  AdminController: {
    getSystemDashboard: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalUsers: 1000,
          totalBrands: 50,
          totalMembers: 5000,
          totalTransactions: 10000,
          systemHealth: 'healthy'
        }
      });
    }),
    getSystemAnalytics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          userGrowth: [{ date: '2024-01-01', count: 100 }],
          brandGrowth: [{ date: '2024-01-01', count: 10 }],
          engagement: { daily: 85, weekly: 70, monthly: 60 }
        }
      });
    }),
    getAuditLogs: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          logs: [{
            id: 1,
            action: 'user_created',
            userId: 1,
            timestamp: new Date(),
            details: 'User created successfully'
          }],
          pagination: { page: 1, limit: 10, total: 1 }
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
          uptime: 86400,
          memory: { used: '256MB', total: '1GB' },
          cpu: { usage: '15%' }
        }
      });
    }),
    getSystemReports: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          reports: [{
            id: 1,
            name: 'Monthly User Report',
            type: 'user_analytics',
            generatedAt: new Date(),
            status: 'completed'
          }]
        }
      });
    }),
    getSystemSettings: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          maintenance: false,
          registrationEnabled: true,
          maxFileSize: '10MB',
          sessionTimeout: 3600
        }
      });
    }),
    updateSystemSettings: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          ...req.body,
          updatedAt: new Date()
        }
      });
    }),
    getSystemStatistics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          users: { total: 1000, active: 800, inactive: 200 },
          brands: { total: 50, active: 45, inactive: 5 },
          transactions: { total: 10000, thisMonth: 1500 }
        }
      });
    }),
    getUserAnalytics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalUsers: 1000,
          newUsers: 50,
          activeUsers: 800,
          usersByRole: { user: 950, admin: 50 }
        }
      });
    }),
    getBrandAnalytics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalBrands: 50,
          activeBrands: 45,
          topBrands: [{ id: 1, name: 'Test Brand', memberCount: 100 }]
        }
      });
    }),
    getMemberAnalytics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalMembers: 5000,
          activeMembers: 4000,
          membersByTier: { bronze: 3000, silver: 1500, gold: 500 }
        }
      });
    }),
    getTransactionAnalytics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalTransactions: 10000,
          totalValue: 500000,
          averageValue: 50,
          transactionsByType: { purchase: 8000, reward: 2000 }
        }
      });
    }),
    getEngagementAnalytics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          dailyActiveUsers: 500,
          weeklyActiveUsers: 2000,
          monthlyActiveUsers: 4000,
          engagementRate: 0.75
        }
      });
    }),
    getSystemPerformance: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          responseTime: 150,
          throughput: 1000,
          errorRate: 0.01,
          uptime: 99.9
        }
      });
    }),
    getSystemConfiguration: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          environment: 'test',
          version: '1.0.0',
          features: { wheelSpins: true, missions: true },
          limits: { maxMembers: 10000, maxTransactions: 100000 }
        }
      });
    }),
    updateSystemConfiguration: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          ...req.body,
          updatedAt: new Date()
        }
      });
    }),
    getSystemLogs: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          logs: [{
            timestamp: new Date(),
            level: 'info',
            message: 'System started successfully',
            service: 'main'
          }],
          pagination: { page: 1, limit: 100, total: 1 }
        }
      });
    }),
    clearCache: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Cache cleared successfully',
        data: { clearedKeys: 150, timestamp: new Date() }
      });
    }),
    performMaintenance: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Maintenance completed successfully',
        data: {
          tasksCompleted: ['database_cleanup', 'log_rotation'],
          duration: 30000,
          timestamp: new Date()
        }
      });
    }),
    getBackupStatus: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          lastBackup: new Date(),
          status: 'completed',
          size: '500MB',
          nextScheduled: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
    }),
    createBackup: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Backup created successfully',
        data: {
          backupId: 'backup_123',
          size: '500MB',
          createdAt: new Date()
        }
      });
    })
  }
}));

// Also mock the middleware modules
jest.mock('../../src/middleware', () => ({
  auth: {
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
            email: decoded.email || 'test@example.com'
          };
          next();
        } catch (error) {
          req.user = { id: 2, role: 'user', email: 'user@test.com' };
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
  },
  validation: {
    validate: () => (req, res, next) => next()
  },
  rateLimit: {
    generalRateLimit: (req, res, next) => next()
  }
}));

// Mock validators
jest.mock('../../src/validators', () => ({
  adminValidators: {
    getSystemAnalyticsSchema: {},
    getAuditLogsSchema: {},
    getSystemReportsSchema: {},
    updateSystemSettingsSchema: {},
    getSystemStatisticsSchema: {},
    getUserAnalyticsSchema: {},
    getBrandAnalyticsSchema: {},
    getMemberAnalyticsSchema: {},
    getTransactionAnalyticsSchema: {},
    getEngagementAnalyticsSchema: {},
    getSystemPerformanceSchema: {},
    getSystemConfigurationSchema: {},
    updateSystemConfigurationSchema: {},
    getSystemLogsSchema: {},
    performMaintenanceSchema: {},
    createBackupSchema: {}
  }
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

// Get reference to mocked controller for test assertions
const { AdminController } = require('../../src/controllers');

describe('Admin Routes', () => {
  let adminToken;
  let userToken;

  beforeEach(() => {
    jest.clearAllMocks();
    adminToken = generateAdminToken({ role: 'super_admin' });
    userToken = generateTestToken({ role: 'user' });
  });

  describe('Authentication & Authorization', () => {
    test('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject requests with insufficient permissions', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /dashboard', () => {
    test('should get system dashboard', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('totalBrands');
      expect(response.body.data).toHaveProperty('systemHealth');
      expect(AdminController.getSystemDashboard).toHaveBeenCalled();
    });
  });

  describe('GET /analytics', () => {
    test('should get system analytics', async () => {
      const response = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userGrowth');
      expect(response.body.data).toHaveProperty('engagement');
      expect(AdminController.getSystemAnalytics).toHaveBeenCalled();
    });
  });

  describe('GET /audit-logs', () => {
    test('should get audit logs', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logs');
      expect(response.body.data).toHaveProperty('pagination');
      expect(AdminController.getAuditLogs).toHaveBeenCalled();
    });
  });

  describe('GET /health', () => {
    test('should get system health', async () => {
      const response = await request(app)
        .get('/api/admin/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('uptime');
      expect(AdminController.getSystemHealth).toHaveBeenCalled();
    });
  });

  describe('GET /settings', () => {
    test('should get system settings', async () => {
      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('maintenance');
      expect(response.body.data).toHaveProperty('registrationEnabled');
      expect(AdminController.getSystemSettings).toHaveBeenCalled();
    });
  });

  describe('PUT /settings', () => {
    test('should update system settings', async () => {
      const settingsData = {
        maintenance: true,
        registrationEnabled: false,
        maxFileSize: '20MB'
      };

      const response = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(settingsData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(settingsData);
      expect(AdminController.updateSystemSettings).toHaveBeenCalled();
    });
  });

  describe('Analytics Endpoints', () => {
    test('should get user analytics', async () => {
      const response = await request(app)
        .get('/api/admin/users/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(AdminController.getUserAnalytics).toHaveBeenCalled();
    });

    test('should get brand analytics', async () => {
      const response = await request(app)
        .get('/api/admin/brands/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalBrands');
      expect(AdminController.getBrandAnalytics).toHaveBeenCalled();
    });

    test('should get member analytics', async () => {
      const response = await request(app)
        .get('/api/admin/members/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalMembers');
      expect(AdminController.getMemberAnalytics).toHaveBeenCalled();
    });

    test('should get transaction analytics', async () => {
      const response = await request(app)
        .get('/api/admin/transactions/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTransactions');
      expect(AdminController.getTransactionAnalytics).toHaveBeenCalled();
    });

    test('should get engagement analytics', async () => {
      const response = await request(app)
        .get('/api/admin/engagement/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dailyActiveUsers');
      expect(AdminController.getEngagementAnalytics).toHaveBeenCalled();
    });
  });

  describe('System Management', () => {
    test('should get system performance', async () => {
      const response = await request(app)
        .get('/api/admin/performance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('responseTime');
      expect(AdminController.getSystemPerformance).toHaveBeenCalled();
    });

    test('should clear cache', async () => {
      const response = await request(app)
        .post('/api/admin/cache/clear')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('clearedKeys');
      expect(AdminController.clearCache).toHaveBeenCalled();
    });

    test('should perform maintenance', async () => {
      const response = await request(app)
        .post('/api/admin/maintenance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tasksCompleted');
      expect(AdminController.performMaintenance).toHaveBeenCalled();
    });
  });

  describe('Backup Management', () => {
    test('should get backup status', async () => {
      const response = await request(app)
        .get('/api/admin/backup/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('lastBackup');
      expect(AdminController.getBackupStatus).toHaveBeenCalled();
    });

    test('should create backup', async () => {
      const response = await request(app)
        .post('/api/admin/backup/create')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('backupId');
      expect(AdminController.createBackup).toHaveBeenCalled();
    });
  });
});