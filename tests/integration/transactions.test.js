/**
 * Transaction and Points Management Integration Tests
 * Tests transaction history, points balance, transaction types, and financial operations
 */

const request = require('supertest');
const { testData } = require('../fixtures/testData');

// Mock setup and cleanup functions for test server integration
const setupTestData = async () => {
  // Mock setup - test server handles its own data
  return Promise.resolve();
};

const cleanupTestData = async () => {
  // Mock cleanup - test server handles its own cleanup
  return Promise.resolve();
};

// Mock the entire application since we're testing against test server
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Transaction and Points Management Integration Tests', () => {
  let adminToken;
  let userToken;
  let memberToken;
  let testBrandId;
  let testUserId;
  let testMemberId;
  let createdTransactionIds = [];

  beforeAll(async () => {
    // Setup test data
    await setupTestData();
    testBrandId = testData.brands.validBrand.id;
    
    // Create admin user
    const adminResponse = await request(TEST_BASE_URL)
      .post('/api/v1/auth/register')
      .send({
        email: 'admin@transactiontest.com',
        password: 'AdminTest123!',
        first_name: 'Admin',
        last_name: 'User',
        brand_id: testBrandId,
        role: 'admin'
      });
    
    adminToken = adminResponse.body.data?.token;
    
    // Create regular user
    const userResponse = await request(TEST_BASE_URL)
      .post('/api/v1/auth/register')
      .send({
        email: 'user@transactiontest.com',
        password: 'UserTest123!',
        first_name: 'Regular',
        last_name: 'User',
        brand_id: testBrandId
      });
    
    userToken = userResponse.body.data?.token;
    testUserId = userResponse.body.data?.user?.id;
    
    // Create member user
    const memberResponse = await request(TEST_BASE_URL)
      .post('/api/v1/auth/register')
      .send({
        email: 'member@transactiontest.com',
        password: 'MemberTest123!',
        first_name: 'Member',
        last_name: 'User',
        brand_id: testBrandId
      });
    
    memberToken = memberResponse.body.data?.token;
    testMemberId = memberResponse.body.data?.user?.id;
  });

  afterAll(async () => {
    // Clean up created transactions
    for (const transactionId of createdTransactionIds) {
      try {
        await request(TEST_BASE_URL)
          .delete(`/api/v1/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    await cleanupTestData();
  });

  describe('Transaction History Management', () => {
    describe('GET /api/v1/transactions', () => {
      it('should get user transaction history', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transactions');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.transactions)).toBe(true);
      });

      it('should paginate transaction history', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions?page=1&limit=10')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(10);
        expect(response.body.data.transactions.length).toBeLessThanOrEqual(10);
      });

      it('should filter transactions by type', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions?type=reward')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.transactions.forEach(transaction => {
          expect(transaction.type).toBe('reward');
        });
      });

      it('should filter transactions by amount range', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions?min_amount=50&max_amount=200')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.transactions.forEach(transaction => {
          expect(transaction.amount).toBeGreaterThanOrEqual(50);
          expect(transaction.amount).toBeLessThanOrEqual(200);
        });
      });

      it('should filter transactions by date range', async () => {
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/transactions?start_date=${startDate}&end_date=${endDate}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transactions');
      });

      it('should include transaction details', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions?include_details=true')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        if (response.body.data.transactions.length > 0) {
          const transaction = response.body.data.transactions[0];
          expect(transaction).toHaveProperty('id');
          expect(transaction).toHaveProperty('type');
          expect(transaction).toHaveProperty('amount');
          expect(transaction).toHaveProperty('description');
          expect(transaction).toHaveProperty('created_at');
        }
      });

      it('should return 401 for unauthenticated requests', async () => {
        await request(TEST_BASE_URL)
          .get('/api/v1/transactions')
          .expect(401);
      });
    });

    describe('GET /api/v1/transactions/:id', () => {
      let testTransactionId;

      beforeAll(async () => {
        // Get existing transactions to test with
        const transactionsResponse = await request(TEST_BASE_URL)
          .get('/api/v1/transactions')
          .set('Authorization', `Bearer ${memberToken}`);
        
        if (transactionsResponse.body.data.transactions.length > 0) {
          testTransactionId = transactionsResponse.body.data.transactions[0].id;
        }
      });

      it('should get specific transaction details', async () => {
        if (!testTransactionId) {
          return; // Skip if no transactions available
        }

        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/transactions/${testTransactionId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transaction');
        expect(response.body.data.transaction.id).toBe(testTransactionId);
        expect(response.body.data.transaction).toHaveProperty('type');
        expect(response.body.data.transaction).toHaveProperty('amount');
        expect(response.body.data.transaction).toHaveProperty('status');
      });

      it('should return 404 for non-existent transaction', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
        
        await request(TEST_BASE_URL)
          .get(`/api/v1/transactions/${nonExistentId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(404);
      });

      it('should prevent access to other users transactions', async () => {
        if (!testTransactionId) {
          return;
        }

        await request(TEST_BASE_URL)
          .get(`/api/v1/transactions/${testTransactionId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });

    describe('GET /api/v1/transactions/summary', () => {
      it('should get transaction summary for user', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/summary')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('summary');
        expect(response.body.data.summary).toHaveProperty('total_earned');
        expect(response.body.data.summary).toHaveProperty('total_spent');
        expect(response.body.data.summary).toHaveProperty('net_balance');
        expect(response.body.data.summary).toHaveProperty('transaction_count');
      });

      it('should get summary for specific time period', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/summary?period=month')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.summary).toHaveProperty('period');
        expect(response.body.data.summary.period).toBe('month');
      });

      it('should include breakdown by transaction type', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/summary?include_breakdown=true')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('breakdown');
        expect(response.body.data.breakdown).toHaveProperty('by_type');
      });
    });
  });

  describe('Points Balance Management', () => {
    describe('GET /api/v1/transactions/balance', () => {
      it('should get current points balance', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/balance')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('balance');
        expect(response.body.data).toHaveProperty('available_balance');
        expect(response.body.data).toHaveProperty('pending_balance');
        expect(response.body.data).toHaveProperty('reserved_balance');
        expect(typeof response.body.data.balance).toBe('number');
      });

      it('should include balance history when requested', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/balance?include_history=true')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('history');
        expect(Array.isArray(response.body.data.history)).toBe(true);
      });

      it('should include projected balance when requested', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/balance?include_projected=true')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('projected_balance');
        expect(response.body.data).toHaveProperty('pending_transactions');
      });
    });

    describe('GET /api/v1/transactions/balance/history', () => {
      it('should get balance history over time', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/balance/history')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('history');
        expect(Array.isArray(response.body.data.history)).toBe(true);
        
        if (response.body.data.history.length > 0) {
          const historyItem = response.body.data.history[0];
          expect(historyItem).toHaveProperty('date');
          expect(historyItem).toHaveProperty('balance');
          expect(historyItem).toHaveProperty('change');
        }
      });

      it('should filter balance history by date range', async () => {
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/transactions/balance/history?start_date=${startDate}&end_date=${endDate}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('history');
      });

      it('should aggregate balance history by period', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/balance/history?aggregate=daily')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('aggregation');
        expect(response.body.data.aggregation).toBe('daily');
      });
    });
  });

  describe('Transaction Creation and Management', () => {
    describe('POST /api/v1/transactions', () => {
      it('should create new transaction (admin only)', async () => {
        const transactionData = {
          user_id: testMemberId,
          type: 'bonus',
          amount: 100,
          description: 'Bonus points for testing',
          reference_type: 'manual',
          reference_id: 'test-bonus-001',
          metadata: {
            reason: 'Testing transaction creation',
            admin_id: 'admin-user'
          }
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/transactions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(transactionData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transaction');
        expect(response.body.data.transaction.type).toBe(transactionData.type);
        expect(response.body.data.transaction.amount).toBe(transactionData.amount);
        expect(response.body.data.transaction.status).toBe('completed');
        
        createdTransactionIds.push(response.body.data.transaction.id);
      });

      it('should create debit transaction', async () => {
        const debitData = {
          user_id: testMemberId,
          type: 'deduction',
          amount: -50,
          description: 'Points deduction for testing',
          reference_type: 'manual',
          reference_id: 'test-deduction-001'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/transactions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(debitData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.transaction.amount).toBe(-50);
        expect(response.body.data.transaction.type).toBe('deduction');
        
        createdTransactionIds.push(response.body.data.transaction.id);
      });

      it('should validate transaction amount', async () => {
        const invalidData = {
          user_id: testMemberId,
          type: 'bonus',
          amount: 0, // Invalid zero amount
          description: 'Invalid transaction'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/transactions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.error).toContain('amount');
      });

      it('should validate user exists', async () => {
        const invalidUserData = {
          user_id: '550e8400-e29b-41d4-a716-446655440999',
          type: 'bonus',
          amount: 100,
          description: 'Transaction for non-existent user'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/transactions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidUserData)
          .expect(404);

        expect(response.body.error).toContain('user');
      });

      it('should return 403 for non-admin users', async () => {
        const transactionData = {
          user_id: testMemberId,
          type: 'bonus',
          amount: 100,
          description: 'Unauthorized transaction'
        };

        await request(TEST_BASE_URL)
          .post('/api/v1/transactions')
          .set('Authorization', `Bearer ${userToken}`)
          .send(transactionData)
          .expect(403);
      });
    });

    describe('PATCH /api/v1/transactions/:id/status', () => {
      let pendingTransactionId;

      beforeAll(async () => {
        // Create a pending transaction for status tests
        const createResponse = await request(TEST_BASE_URL)
          .post('/api/v1/transactions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            user_id: testMemberId,
            type: 'pending_reward',
            amount: 75,
            description: 'Pending transaction for status testing',
            status: 'pending'
          });
        
        pendingTransactionId = createResponse.body.data.transaction.id;
        createdTransactionIds.push(pendingTransactionId);
      });

      it('should approve pending transaction', async () => {
        const response = await request(TEST_BASE_URL)
          .patch(`/api/v1/transactions/${pendingTransactionId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            status: 'completed',
            reason: 'Approved by admin'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.transaction.status).toBe('completed');
        expect(response.body.data.transaction.processed_at).toBeDefined();
      });

      it('should reject transaction', async () => {
        // Create another pending transaction
        const createResponse = await request(TEST_BASE_URL)
          .post('/api/v1/transactions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            user_id: testMemberId,
            type: 'pending_reward',
            amount: 50,
            description: 'Transaction to be rejected',
            status: 'pending'
          });
        
        const rejectTransactionId = createResponse.body.data.transaction.id;
        createdTransactionIds.push(rejectTransactionId);

        const response = await request(TEST_BASE_URL)
          .patch(`/api/v1/transactions/${rejectTransactionId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            status: 'rejected',
            reason: 'Insufficient verification'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.transaction.status).toBe('rejected');
      });

      it('should return 403 for non-admin users', async () => {
        await request(TEST_BASE_URL)
          .patch(`/api/v1/transactions/${pendingTransactionId}/status`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ status: 'completed' })
          .expect(403);
      });
    });
  });

  describe('Transaction Types and Categories', () => {
    describe('GET /api/v1/transactions/types', () => {
      it('should get available transaction types', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/types')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('types');
        expect(Array.isArray(response.body.data.types)).toBe(true);
        
        if (response.body.data.types.length > 0) {
          const type = response.body.data.types[0];
          expect(type).toHaveProperty('name');
          expect(type).toHaveProperty('description');
          expect(type).toHaveProperty('category');
        }
      });

      it('should filter types by category', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/types?category=earning')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.types.forEach(type => {
          expect(type.category).toBe('earning');
        });
      });
    });

    describe('GET /api/v1/transactions/categories', () => {
      it('should get transaction categories with statistics', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/categories')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('categories');
        expect(Array.isArray(response.body.data.categories)).toBe(true);
        
        if (response.body.data.categories.length > 0) {
          const category = response.body.data.categories[0];
          expect(category).toHaveProperty('name');
          expect(category).toHaveProperty('total_amount');
          expect(category).toHaveProperty('transaction_count');
        }
      });

      it('should include category breakdown for time period', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/categories?period=month')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('period');
        expect(response.body.data.period).toBe('month');
      });
    });
  });

  describe('Bulk Transaction Operations', () => {
    describe('POST /api/v1/transactions/bulk', () => {
      it('should create multiple transactions in bulk (admin only)', async () => {
        const bulkData = {
          transactions: [
            {
              user_id: testMemberId,
              type: 'bonus',
              amount: 25,
              description: 'Bulk bonus 1'
            },
            {
              user_id: testMemberId,
              type: 'bonus',
              amount: 30,
              description: 'Bulk bonus 2'
            },
            {
              user_id: testMemberId,
              type: 'bonus',
              amount: 35,
              description: 'Bulk bonus 3'
            }
          ]
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/transactions/bulk')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(bulkData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transactions');
        expect(response.body.data.transactions).toHaveLength(3);
        expect(response.body.data).toHaveProperty('total_amount');
        expect(response.body.data.total_amount).toBe(90);
        
        // Store for cleanup
        response.body.data.transactions.forEach(transaction => {
          createdTransactionIds.push(transaction.id);
        });
      });

      it('should validate bulk transaction data', async () => {
        const invalidBulkData = {
          transactions: [
            {
              user_id: testMemberId,
              type: 'bonus',
              amount: 0, // Invalid amount
              description: 'Invalid bulk transaction'
            }
          ]
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/transactions/bulk')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidBulkData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('should handle partial failures in bulk operations', async () => {
        const mixedBulkData = {
          transactions: [
            {
              user_id: testMemberId,
              type: 'bonus',
              amount: 50,
              description: 'Valid transaction'
            },
            {
              user_id: '550e8400-e29b-41d4-a716-446655440999', // Invalid user
              type: 'bonus',
              amount: 50,
              description: 'Invalid user transaction'
            }
          ]
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/transactions/bulk')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(mixedBulkData)
          .expect(207); // Partial success

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('successful');
        expect(response.body.data).toHaveProperty('failed');
        expect(response.body.data.successful.length).toBe(1);
        expect(response.body.data.failed.length).toBe(1);
        
        // Store successful transactions for cleanup
        response.body.data.successful.forEach(transaction => {
          createdTransactionIds.push(transaction.id);
        });
      });
    });

    describe('PATCH /api/v1/transactions/bulk/status', () => {
      let bulkStatusTransactionIds = [];

      beforeAll(async () => {
        // Create multiple pending transactions for bulk status tests
        const bulkResponse = await request(TEST_BASE_URL)
          .post('/api/v1/transactions/bulk')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            transactions: [
              {
                user_id: testMemberId,
                type: 'pending_reward',
                amount: 40,
                description: 'Bulk status test 1',
                status: 'pending'
              },
              {
                user_id: testMemberId,
                type: 'pending_reward',
                amount: 45,
                description: 'Bulk status test 2',
                status: 'pending'
              }
            ]
          });
        
        bulkStatusTransactionIds = bulkResponse.body.data.transactions.map(t => t.id);
        createdTransactionIds.push(...bulkStatusTransactionIds);
      });

      it('should update status of multiple transactions', async () => {
        const bulkStatusData = {
          transaction_ids: bulkStatusTransactionIds,
          status: 'completed',
          reason: 'Bulk approval'
        };

        const response = await request(TEST_BASE_URL)
          .patch('/api/v1/transactions/bulk/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(bulkStatusData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('updated_count');
        expect(response.body.data.updated_count).toBe(2);
      });
    });
  });

  describe('Transaction Analytics and Reporting', () => {
    describe('GET /api/v1/transactions/analytics', () => {
      it('should get transaction analytics (admin only)', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/analytics')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('analytics');
        expect(response.body.data.analytics).toHaveProperty('total_volume');
        expect(response.body.data.analytics).toHaveProperty('transaction_count');
        expect(response.body.data.analytics).toHaveProperty('average_transaction_size');
        expect(response.body.data.analytics).toHaveProperty('top_transaction_types');
      });

      it('should get analytics for specific time period', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/analytics?period=week')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.analytics).toHaveProperty('period');
        expect(response.body.data.analytics.period).toBe('week');
      });

      it('should include trend analysis', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/analytics?include_trends=true')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('trends');
        expect(response.body.data.trends).toHaveProperty('volume_trend');
        expect(response.body.data.trends).toHaveProperty('count_trend');
      });

      it('should return 403 for non-admin users', async () => {
        await request(TEST_BASE_URL)
          .get('/api/v1/transactions/analytics')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });

    describe('GET /api/v1/transactions/reports', () => {
      it('should generate transaction report (admin only)', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/reports?format=json')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('report');
        expect(response.body.data.report).toHaveProperty('summary');
        expect(response.body.data.report).toHaveProperty('details');
        expect(response.body.data.report).toHaveProperty('generated_at');
      });

      it('should filter report by user', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/transactions/reports?user_id=${testMemberId}&format=json`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.report).toHaveProperty('user_id');
        expect(response.body.data.report.user_id).toBe(testMemberId);
      });

      it('should generate CSV format report', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/reports?format=csv')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.text).toContain('Transaction ID,Type,Amount,Date');
      });
    });
  });

  describe('Transaction Validation and Security', () => {
    describe('POST /api/v1/transactions/validate', () => {
      it('should validate transaction before creation', async () => {
        const transactionData = {
          user_id: testMemberId,
          type: 'bonus',
          amount: 100,
          description: 'Validation test transaction'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/transactions/validate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(transactionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('valid');
        expect(response.body.data).toHaveProperty('validation_results');
        expect(response.body.data.valid).toBe(true);
      });

      it('should detect invalid transaction data', async () => {
        const invalidData = {
          user_id: 'invalid-uuid',
          type: 'invalid_type',
          amount: -999999,
          description: ''
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/transactions/validate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.valid).toBe(false);
        expect(response.body.data.validation_results).toHaveProperty('errors');
        expect(response.body.data.validation_results.errors.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/v1/transactions/audit', () => {
      it('should get transaction audit trail (admin only)', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/transactions/audit')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('audit_logs');
        expect(Array.isArray(response.body.data.audit_logs)).toBe(true);
        
        if (response.body.data.audit_logs.length > 0) {
          const auditLog = response.body.data.audit_logs[0];
          expect(auditLog).toHaveProperty('transaction_id');
          expect(auditLog).toHaveProperty('action');
          expect(auditLog).toHaveProperty('performed_by');
          expect(auditLog).toHaveProperty('timestamp');
        }
      });

      it('should filter audit logs by transaction', async () => {
        if (createdTransactionIds.length === 0) {
          return;
        }

        const transactionId = createdTransactionIds[0];
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/transactions/audit?transaction_id=${transactionId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.audit_logs.forEach(log => {
          expect(log.transaction_id).toBe(transactionId);
        });
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle insufficient balance scenarios', async () => {
      const largeDeductionData = {
        user_id: testMemberId,
        type: 'deduction',
        amount: -999999, // Very large deduction
        description: 'Excessive deduction test'
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largeDeductionData)
        .expect(400);

      expect(response.body.error).toContain('insufficient');
    });

    it('should handle concurrent transaction creation', async () => {
      const transactionData = {
        user_id: testMemberId,
        type: 'bonus',
        amount: 10,
        description: 'Concurrent transaction test'
      };

      const concurrentTransactions = Array(5).fill().map(() => 
        request(TEST_BASE_URL)
          .post('/api/v1/transactions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...transactionData,
            reference_id: `concurrent-${Date.now()}-${Math.random()}`
          })
      );

      const results = await Promise.allSettled(concurrentTransactions);
      
      // All should succeed with unique reference IDs
      const successCount = results.filter(r => r.value?.status === 201).length;
      expect(successCount).toBe(5);
      
      // Store for cleanup
      results.forEach(result => {
        if (result.value?.status === 201) {
          createdTransactionIds.push(result.value.body.data.transaction.id);
        }
      });
    });

    it('should handle malformed transaction data', async () => {
      const malformedData = {
        user_id: 123, // Should be UUID string
        type: null,
        amount: 'not-a-number',
        description: null
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(malformedData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle very large transaction amounts', async () => {
      const largeAmountData = {
        user_id: testMemberId,
        type: 'bonus',
        amount: 999999999, // Very large amount
        description: 'Large amount test'
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largeAmountData)
        .expect(400);

      expect(response.body.error).toContain('amount');
    });

    it('should handle duplicate reference IDs', async () => {
      const referenceId = `duplicate-test-${Date.now()}`;
      
      // Create first transaction
      const firstResponse = await request(TEST_BASE_URL)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          user_id: testMemberId,
          type: 'bonus',
          amount: 50,
          description: 'First transaction',
          reference_id: referenceId
        });
      
      expect(firstResponse.status).toBe(201);
      createdTransactionIds.push(firstResponse.body.data.transaction.id);
      
      // Try to create duplicate
      const duplicateResponse = await request(TEST_BASE_URL)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          user_id: testMemberId,
          type: 'bonus',
          amount: 50,
          description: 'Duplicate transaction',
          reference_id: referenceId
        })
        .expect(409);

      expect(duplicateResponse.body.error).toContain('duplicate');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent transaction requests', async () => {
      const concurrentRequests = Array(10).fill().map(() => 
        request(TEST_BASE_URL)
          .get('/api/v1/transactions?limit=5')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transactions');
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(TEST_BASE_URL)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // 3 seconds max
    });

    it('should handle large pagination requests efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(TEST_BASE_URL)
        .get('/api/v1/transactions?page=1&limit=100')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max for large requests
      expect(response.body.data.pagination.limit).toBeLessThanOrEqual(100);
    });
  });
});