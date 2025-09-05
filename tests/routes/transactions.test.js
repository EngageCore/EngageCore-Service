/**
 * Transaction Routes Tests
 * Tests all transaction management API endpoints
 */

const request = require('supertest');
const express = require('express');
const transactionRoutes = require('../../src/routes/transactions');
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
  TransactionController: {
    createTransaction: jest.fn((req, res) => {
      const transactionData = req.body;
      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: {
          id: 1,
          ...transactionData,
          brandId: parseInt(req.params.brandId),
          status: 'completed',
          createdAt: new Date()
        }
      });
    }),

    listTransactions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          transactions: [
            {
              id: 1,
              memberId: 1,
              type: 'purchase',
              amount: 100.00,
              points: 10,
              description: 'Test purchase',
              status: 'completed',
              brandId: parseInt(req.params.brandId),
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
            totalAmount: 100.00,
            totalPoints: 10,
            averageAmount: 100.00
          }
        }
      });
    }),

    getTransactionById: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          id: parseInt(req.params.id),
          memberId: 1,
          type: 'purchase',
          amount: 100.00,
          points: 10,
          description: 'Test purchase',
          status: 'completed',
          brandId: parseInt(req.params.brandId),
          createdAt: new Date()
        }
      });
    }),

    updateTransaction: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Transaction updated successfully',
        data: {
          id: parseInt(req.params.id),
          ...req.body,
          updatedAt: new Date()
        }
      });
    }),

    deleteTransaction: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Transaction deleted successfully'
      });
    }),

    getTransactionStatistics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          totalTransactions: 1000,
          totalAmount: 50000,
          totalPoints: 5000,
          averageAmount: 50,
          transactionsByType: {
            purchase: 800,
            reward: 150,
            refund: 50
          }
        }
      });
    }),

    bulkCreateTransactions: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Transactions created successfully',
        data: {
          created: req.body.transactions.length,
          failed: 0,
          transactions: req.body.transactions.map((tx, index) => ({
            id: index + 1,
            ...tx,
            brandId: parseInt(req.params.brandId),
            status: 'completed',
            createdAt: new Date()
          }))
        }
      });
    }),

    processRefund: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          transactionId: parseInt(req.params.id),
          refundAmount: req.body.amount,
          status: 'refunded',
          processedAt: new Date()
        }
      });
    }),

    approveTransaction: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Transaction approved successfully',
        data: {
          id: parseInt(req.params.id),
          status: 'approved',
          approvedAt: new Date()
        }
      });
    }),

    rejectTransaction: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Transaction rejected successfully',
        data: {
          id: parseInt(req.params.id),
          status: 'rejected',
          rejectedAt: new Date()
        }
      });
    }),

    getTransactionTrends: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          trends: [
            { date: '2024-01-01', transactions: 10, amount: 500 },
            { date: '2024-01-02', transactions: 15, amount: 750 }
          ],
          period: 'daily'
        }
      });
    }),

    getTopSpendingMembers: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          topSpenders: [
            {
              member: { id: 1, name: 'John Doe' },
              totalSpent: 2000,
              transactionCount: 40
            }
          ]
        }
      });
    }),

    getTransactionTypeBreakdown: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          breakdown: {
            purchase: { count: 800, amount: 40000 },
            reward: { count: 150, amount: 7500 },
            refund: { count: 50, amount: 2500 }
          }
        }
      });
    }),

    getPendingTransactions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          transactions: [],
          count: 0,
          totalAmount: 0
        }
      });
    }),

    getTransactionSummary: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          today: { count: 10, amount: 500 },
          thisWeek: { count: 50, amount: 2500 },
          thisMonth: { count: 200, amount: 10000 }
        }
      });
    }),

    getTransactionDashboard: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          overview: {
            totalTransactions: 1000,
            totalAmount: 50000
          },
          recentTransactions: [],
          charts: {}
        }
      });
    }),

    getTransactionAnalytics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          analytics: {
            averageAmount: 50,
            peakHours: [14, 15, 16],
            conversionRate: 0.85
          }
        }
      });
    }),

    exportTransactions: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Export initiated successfully',
        data: {
          exportId: 'export-123',
          status: 'processing'
        }
      });
    }),

    getMemberTransactions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          transactions: []
        }
      });
    }),

    getMemberPointsBalance: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          balance: 1000
        }
      });
    }),

    getMemberTransactionAnalytics: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          analytics: 'member data'
        }
      });
    }),

    reverseTransaction: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Transaction reversed successfully',
        data: {
          id: parseInt(req.params.id),
          status: 'reversed',
          reversedAt: new Date()
        }
      });
    }),

    processPendingTransaction: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Transaction processed successfully',
        data: {
          id: parseInt(req.params.id),
          status: 'processed',
          processedAt: new Date()
        }
      });
    }),

    getTransactionAuditTrail: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          auditTrail: [
            {
              action: 'created',
              timestamp: new Date(),
              user: 'admin@test.com'
            }
          ]
        }
      });
    }),

    validateTransactionAmount: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          valid: true,
          amount: req.body.amount,
          currency: 'USD'
        }
      });
    }),

    createAdjustmentTransaction: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Adjustment transaction created successfully',
        data: {
          id: 999,
          type: 'adjustment',
          amount: req.body.amount,
          createdAt: new Date()
        }
      });
    })
  }
}));

describe('Transaction Routes', () => {
  let app;
  let token;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/brands/:brandId/transactions', transactionRoutes);
    
    token = generateTestToken({ id: 1, role: 'brand_admin' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/brands/:brandId/transactions', () => {
    it('should create a new transaction', async () => {
      const transactionData = {
        memberId: 1,
        type: 'purchase',
        amount: 100.00,
        points: 10,
        description: 'Test purchase'
      };

      const response = await request(app)
        .post('/api/brands/1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transaction created successfully');
      expect(response.body.data.amount).toBe(transactionData.amount);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/brands/1/transactions')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/brands/:brandId/transactions', () => {
    it('should list transactions', async () => {
      const response = await request(app)
        .get('/api/brands/1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/transactions/statistics', () => {
    it('should get transaction statistics', async () => {
      const response = await request(app)
        .get('/api/brands/1/transactions/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalTransactions).toBeDefined();
      expect(response.body.data.transactionsByType).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/transactions/:id', () => {
    it('should get transaction by ID', async () => {
      const response = await request(app)
        .get('/api/brands/1/transactions/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });
  });

  describe('PUT /api/brands/:brandId/transactions/:id', () => {
    it('should update transaction', async () => {
      const updateData = {
        description: 'Updated transaction',
        amount: 150.00
      };

      const response = await request(app)
        .put('/api/brands/1/transactions/1')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transaction updated successfully');
    });
  });



  describe('POST /api/brands/:brandId/transactions/bulk', () => {
    it('should bulk create transactions', async () => {
      const bulkData = {
        transactions: [
          {
            memberId: 1,
            type: 'purchase',
            amount: 50.00,
            points: 5
          },
          {
            memberId: 2,
            type: 'purchase',
            amount: 75.00,
            points: 7
          }
        ]
      };

      const response = await request(app)
        .post('/api/brands/1/transactions/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBe(2);
    });
  });

  describe('POST /api/brands/:brandId/transactions/:id/reverse', () => {
    it('should reverse transaction', async () => {
      const reverseData = {
        reason: 'Customer request'
      };

      const response = await request(app)
        .post('/api/brands/1/transactions/1/reverse')
        .set('Authorization', `Bearer ${token}`)
        .send(reverseData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transaction reversed successfully');
    });
  });

  describe('GET /api/brands/:brandId/transactions/trends', () => {
    it('should get transaction trends', async () => {
      const response = await request(app)
        .get('/api/brands/1/transactions/trends')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trends).toBeDefined();
    });
  });

  describe('GET /api/brands/:brandId/transactions/pending', () => {
    it('should get pending transactions', async () => {
      const response = await request(app)
        .get('/api/brands/1/transactions/pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeDefined();
    });
  });
});