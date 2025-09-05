/**
 * Wheel Spinning Functionality Integration Tests
 * Tests wheel configuration, spin operations, history, and prize management
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

describe('Wheel Spinning Integration Tests', () => {
  let adminToken;
  let userToken;
  let memberToken;
  let testBrandId;
  let testWheelId;
  let testUserId;
  let testMemberId;
  let createdWheelIds = [];

  beforeAll(async () => {
    // Setup test data
    await setupTestData();
    testBrandId = testData.brands.validBrand.id;
    testWheelId = testData.wheelConfigs.validWheel.id;
    
    // Create admin user
    const adminResponse = await request(TEST_BASE_URL)
      .post('/api/v1/auth/register')
      .send({
        email: 'admin@wheeltest.com',
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
        email: 'user@wheeltest.com',
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
        email: 'member@wheeltest.com',
        password: 'MemberTest123!',
        first_name: 'Member',
        last_name: 'User',
        brand_id: testBrandId
      });
    
    memberToken = memberResponse.body.data?.token;
    testMemberId = memberResponse.body.data?.user?.id;
  });

  afterAll(async () => {
    // Clean up created wheels
    for (const wheelId of createdWheelIds) {
      try {
        await request(TEST_BASE_URL)
          .delete(`/api/v1/wheels/${wheelId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    await cleanupTestData();
  });

  describe('Wheel Configuration Management', () => {
    describe('GET /api/v1/wheels', () => {
      it('should get all wheels for brand', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/wheels')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('wheels');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.wheels)).toBe(true);
      });

      it('should filter wheels by status', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/wheels?status=active')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.wheels.forEach(wheel => {
          expect(wheel.status).toBe('active');
        });
      });

      it('should include wheel statistics when requested', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/wheels?include_stats=true')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        if (response.body.data.wheels.length > 0) {
          expect(response.body.data.wheels[0]).toHaveProperty('statistics');
        }
      });
    });

    describe('GET /api/v1/wheels/:id', () => {
      it('should get specific wheel configuration', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('wheel');
        expect(response.body.data.wheel.id).toBe(testWheelId);
        expect(response.body.data.wheel).toHaveProperty('name');
        expect(response.body.data.wheel).toHaveProperty('status');
        expect(response.body.data.wheel).toHaveProperty('daily_spin_limit');
        expect(response.body.data.wheel).toHaveProperty('points_required');
      });

      it('should include wheel items in configuration', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}?include_items=true`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.wheel).toHaveProperty('items');
        expect(Array.isArray(response.body.data.wheel.items)).toBe(true);
        
        if (response.body.data.wheel.items.length > 0) {
          const item = response.body.data.wheel.items[0];
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('probability');
          expect(item).toHaveProperty('type');
          expect(item).toHaveProperty('value');
        }
      });

      it('should return 404 for non-existent wheel', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
        
        await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${nonExistentId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);
      });

      it('should return 403 for inactive wheels to regular users', async () => {
        // This test assumes there's an inactive wheel
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/wheels?status=inactive')
          .set('Authorization', `Bearer ${adminToken}`);
        
        if (response.body.data.wheels.length > 0) {
          const inactiveWheelId = response.body.data.wheels[0].id;
          
          await request(TEST_BASE_URL)
            .get(`/api/v1/wheels/${inactiveWheelId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect(403);
        }
      });
    });

    describe('POST /api/v1/wheels', () => {
      it('should create new wheel with valid configuration (admin only)', async () => {
        const wheelData = {
          name: 'Test Wheel',
          description: 'A wheel for testing',
          brand_id: testBrandId,
          daily_spin_limit: 5,
          points_required: 100,
          cooldown_minutes: 60,
          status: 'active',
          items: [
            {
              name: 'Small Prize',
              type: 'points',
              value: 50,
              probability: 0.4,
              color: '#ff6b6b'
            },
            {
              name: 'Medium Prize',
              type: 'points',
              value: 100,
              probability: 0.3,
              color: '#4ecdc4'
            },
            {
              name: 'Large Prize',
              type: 'points',
              value: 200,
              probability: 0.2,
              color: '#45b7d1'
            },
            {
              name: 'Jackpot',
              type: 'points',
              value: 500,
              probability: 0.1,
              color: '#f9ca24'
            }
          ]
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/wheels')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(wheelData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('wheel');
        expect(response.body.data.wheel.name).toBe(wheelData.name);
        expect(response.body.data.wheel.daily_spin_limit).toBe(wheelData.daily_spin_limit);
        expect(response.body.data.wheel.items).toHaveLength(4);
        
        createdWheelIds.push(response.body.data.wheel.id);
      });

      it('should validate probability distribution sums to 1', async () => {
        const wheelData = {
          name: 'Invalid Probability Wheel',
          brand_id: testBrandId,
          items: [
            {
              name: 'Prize 1',
              type: 'points',
              value: 50,
              probability: 0.6 // Total will be > 1
            },
            {
              name: 'Prize 2',
              type: 'points',
              value: 100,
              probability: 0.6 // Total will be > 1
            }
          ]
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/wheels')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(wheelData)
          .expect(400);

        expect(response.body.error).toContain('probability');
      });

      it('should validate required fields', async () => {
        const wheelData = {
          description: 'Missing name field'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/wheels')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(wheelData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('should return 403 for non-admin users', async () => {
        const wheelData = {
          name: 'Unauthorized Wheel',
          brand_id: testBrandId
        };

        await request(TEST_BASE_URL)
          .post('/api/v1/wheels')
          .set('Authorization', `Bearer ${userToken}`)
          .send(wheelData)
          .expect(403);
      });
    });

    describe('PUT /api/v1/wheels/:id', () => {
      let updateWheelId;

      beforeAll(async () => {
        // Create a wheel for update tests
        const createResponse = await request(TEST_BASE_URL)
          .post('/api/v1/wheels')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Update Test Wheel',
            brand_id: testBrandId,
            daily_spin_limit: 3,
            points_required: 50,
            items: [
              {
                name: 'Test Prize',
                type: 'points',
                value: 100,
                probability: 1.0
              }
            ]
          });
        
        updateWheelId = createResponse.body.data.wheel.id;
        createdWheelIds.push(updateWheelId);
      });

      it('should update wheel configuration', async () => {
        const updateData = {
          name: 'Updated Wheel Name',
          description: 'Updated description',
          daily_spin_limit: 7,
          points_required: 75
        };

        const response = await request(TEST_BASE_URL)
          .put(`/api/v1/wheels/${updateWheelId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.wheel.name).toBe(updateData.name);
        expect(response.body.data.wheel.daily_spin_limit).toBe(updateData.daily_spin_limit);
      });

      it('should update wheel items', async () => {
        const updateData = {
          items: [
            {
              name: 'Updated Prize 1',
              type: 'points',
              value: 75,
              probability: 0.7,
              color: '#ff0000'
            },
            {
              name: 'Updated Prize 2',
              type: 'points',
              value: 150,
              probability: 0.3,
              color: '#00ff00'
            }
          ]
        };

        const response = await request(TEST_BASE_URL)
          .put(`/api/v1/wheels/${updateWheelId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.wheel.items).toHaveLength(2);
        expect(response.body.data.wheel.items[0].name).toBe('Updated Prize 1');
      });

      it('should return 404 for non-existent wheel', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
        const updateData = { name: 'Updated Name' };

        await request(TEST_BASE_URL)
          .put(`/api/v1/wheels/${nonExistentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(404);
      });
    });
  });

  describe('Wheel Spinning Operations', () => {
    describe('POST /api/v1/wheels/:id/spin', () => {
      it('should spin wheel successfully with valid conditions', async () => {
        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/wheels/${testWheelId}/spin`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('spin');
        expect(response.body.data).toHaveProperty('prize');
        expect(response.body.data).toHaveProperty('user_points');
        expect(response.body.data.spin).toHaveProperty('id');
        expect(response.body.data.spin).toHaveProperty('user_id');
        expect(response.body.data.spin).toHaveProperty('wheel_id');
        expect(response.body.data.spin).toHaveProperty('prize_name');
        expect(response.body.data.spin).toHaveProperty('prize_value');
      });

      it('should return 401 for unauthenticated requests', async () => {
        await request(TEST_BASE_URL)
          .post(`/api/v1/wheels/${testWheelId}/spin`)
          .expect(401);
      });

      it('should return 404 for non-existent wheel', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
        
        await request(TEST_BASE_URL)
          .post(`/api/v1/wheels/${nonExistentId}/spin`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(404);
      });

      it('should enforce daily spin limits', async () => {
        // Spin multiple times to exceed daily limit
        const spinPromises = [];
        for (let i = 0; i < 5; i++) {
          spinPromises.push(
            request(TEST_BASE_URL)
              .post(`/api/v1/wheels/${testWheelId}/spin`)
              .set('Authorization', `Bearer ${memberToken}`)
          );
        }

        const responses = await Promise.allSettled(spinPromises);
        
        // Some should succeed, some should fail with rate limit
        const successCount = responses.filter(r => r.value?.status === 200).length;
        const rateLimitCount = responses.filter(r => r.value?.status === 429).length;
        
        expect(successCount + rateLimitCount).toBe(5);
        expect(rateLimitCount).toBeGreaterThan(0); // At least some should be rate limited
      });

      it('should check sufficient points requirement', async () => {
        // Create a wheel with high points requirement
        const highPointsWheel = await request(TEST_BASE_URL)
          .post('/api/v1/wheels')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'High Points Wheel',
            brand_id: testBrandId,
            points_required: 999999, // Very high requirement
            items: [
              {
                name: 'Expensive Prize',
                type: 'points',
                value: 1000,
                probability: 1.0
              }
            ]
          });

        const wheelId = highPointsWheel.body.data.wheel.id;
        createdWheelIds.push(wheelId);

        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/wheels/${wheelId}/spin`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(400);

        expect(response.body.error).toContain('points');
      });

      it('should handle inactive wheel spin attempts', async () => {
        // Create an inactive wheel
        const inactiveWheel = await request(TEST_BASE_URL)
          .post('/api/v1/wheels')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Inactive Wheel',
            brand_id: testBrandId,
            status: 'inactive',
            items: [
              {
                name: 'Inactive Prize',
                type: 'points',
                value: 100,
                probability: 1.0
              }
            ]
          });

        const wheelId = inactiveWheel.body.data.wheel.id;
        createdWheelIds.push(wheelId);

        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/wheels/${wheelId}/spin`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);

        expect(response.body.error).toContain('inactive');
      });
    });

    describe('GET /api/v1/wheels/:id/can-spin', () => {
      it('should check if user can spin wheel', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}/can-spin`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('can_spin');
        expect(response.body.data).toHaveProperty('reason');
        expect(response.body.data).toHaveProperty('remaining_spins');
        expect(response.body.data).toHaveProperty('next_spin_available');
        expect(typeof response.body.data.can_spin).toBe('boolean');
      });

      it('should return spin eligibility details', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}/can-spin`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        if (!response.body.data.can_spin) {
          expect(response.body.data.reason).toBeDefined();
        }
        expect(typeof response.body.data.remaining_spins).toBe('number');
      });
    });
  });

  describe('Spin History Management', () => {
    describe('GET /api/v1/wheels/history', () => {
      it('should get user spin history', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/wheels/history')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('spins');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.spins)).toBe(true);
      });

      it('should paginate spin history', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/wheels/history?page=1&limit=5')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(5);
        expect(response.body.data.spins.length).toBeLessThanOrEqual(5);
      });

      it('should filter spin history by wheel', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/history?wheel_id=${testWheelId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.spins.forEach(spin => {
          expect(spin.wheel_id).toBe(testWheelId);
        });
      });

      it('should filter spin history by date range', async () => {
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/history?start_date=${startDate}&end_date=${endDate}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('spins');
      });

      it('should include prize details in history', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/wheels/history?include_prizes=true')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        if (response.body.data.spins.length > 0) {
          const spin = response.body.data.spins[0];
          expect(spin).toHaveProperty('prize_name');
          expect(spin).toHaveProperty('prize_value');
        }
      });
    });

    describe('GET /api/v1/wheels/history/:id', () => {
      let spinId;

      beforeAll(async () => {
        // Create a spin for detailed history tests
        const spinResponse = await request(TEST_BASE_URL)
          .post(`/api/v1/wheels/${testWheelId}/spin`)
          .set('Authorization', `Bearer ${memberToken}`);
        
        if (spinResponse.status === 200) {
          spinId = spinResponse.body.data.spin.id;
        }
      });

      it('should get specific spin details', async () => {
        if (!spinId) {
          // Skip if no spin was created
          return;
        }

        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/history/${spinId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('spin');
        expect(response.body.data.spin.id).toBe(spinId);
        expect(response.body.data.spin).toHaveProperty('wheel_id');
        expect(response.body.data.spin).toHaveProperty('prize_name');
        expect(response.body.data.spin).toHaveProperty('created_at');
      });

      it('should return 404 for non-existent spin', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
        
        await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/history/${nonExistentId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(404);
      });

      it('should prevent access to other users spin history', async () => {
        if (!spinId) {
          return;
        }

        await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/history/${spinId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });
  });

  describe('Prize Management', () => {
    describe('GET /api/v1/wheels/:id/prizes', () => {
      it('should get wheel prize configuration', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}/prizes`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('prizes');
        expect(Array.isArray(response.body.data.prizes)).toBe(true);
        
        if (response.body.data.prizes.length > 0) {
          const prize = response.body.data.prizes[0];
          expect(prize).toHaveProperty('id');
          expect(prize).toHaveProperty('name');
          expect(prize).toHaveProperty('type');
          expect(prize).toHaveProperty('value');
          expect(prize).toHaveProperty('probability');
        }
      });

      it('should include prize statistics when requested', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}/prizes?include_stats=true`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        if (response.body.data.prizes.length > 0) {
          expect(response.body.data.prizes[0]).toHaveProperty('statistics');
        }
      });
    });

    describe('POST /api/v1/wheels/:id/prizes', () => {
      let prizeWheelId;

      beforeAll(async () => {
        // Create a wheel for prize management tests
        const createResponse = await request(TEST_BASE_URL)
          .post('/api/v1/wheels')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Prize Management Wheel',
            brand_id: testBrandId,
            items: [
              {
                name: 'Initial Prize',
                type: 'points',
                value: 100,
                probability: 1.0
              }
            ]
          });
        
        prizeWheelId = createResponse.body.data.wheel.id;
        createdWheelIds.push(prizeWheelId);
      });

      it('should add new prize to wheel', async () => {
        const prizeData = {
          name: 'New Prize',
          type: 'points',
          value: 150,
          probability: 0.3,
          color: '#ff5722',
          description: 'A new prize for testing'
        };

        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/wheels/${prizeWheelId}/prizes`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(prizeData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('prize');
        expect(response.body.data.prize.name).toBe(prizeData.name);
        expect(response.body.data.prize.value).toBe(prizeData.value);
      });

      it('should validate prize probability', async () => {
        const prizeData = {
          name: 'Invalid Prize',
          type: 'points',
          value: 100,
          probability: 1.5 // Invalid probability > 1
        };

        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/wheels/${prizeWheelId}/prizes`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(prizeData)
          .expect(400);

        expect(response.body.error).toContain('probability');
      });

      it('should validate total probability distribution', async () => {
        const prizeData = {
          name: 'Overflow Prize',
          type: 'points',
          value: 100,
          probability: 0.8 // This would make total > 1
        };

        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/wheels/${prizeWheelId}/prizes`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(prizeData)
          .expect(400);

        expect(response.body.error).toContain('total probability');
      });
    });

    describe('PUT /api/v1/wheels/:wheelId/prizes/:prizeId', () => {
      it('should update existing prize', async () => {
        // Get current prizes
        const prizesResponse = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}/prizes`)
          .set('Authorization', `Bearer ${adminToken}`);
        
        if (prizesResponse.body.data.prizes.length === 0) {
          return; // Skip if no prizes
        }

        const prizeId = prizesResponse.body.data.prizes[0].id;
        const updateData = {
          name: 'Updated Prize Name',
          value: 200,
          color: '#2196f3'
        };

        const response = await request(TEST_BASE_URL)
          .put(`/api/v1/wheels/${testWheelId}/prizes/${prizeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.prize.name).toBe(updateData.name);
        expect(response.body.data.prize.value).toBe(updateData.value);
      });
    });
  });

  describe('Wheel Statistics and Analytics', () => {
    describe('GET /api/v1/wheels/:id/statistics', () => {
      it('should get wheel performance statistics', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}/statistics`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('statistics');
        expect(response.body.data.statistics).toHaveProperty('total_spins');
        expect(response.body.data.statistics).toHaveProperty('unique_users');
        expect(response.body.data.statistics).toHaveProperty('total_prizes_awarded');
        expect(response.body.data.statistics).toHaveProperty('average_spins_per_user');
      });

      it('should get statistics for specific time period', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}/statistics?period=week`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.statistics).toHaveProperty('period');
        expect(response.body.data.statistics.period).toBe('week');
      });

      it('should include prize distribution statistics', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}/statistics?include_prizes=true`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('prize_distribution');
        expect(Array.isArray(response.body.data.prize_distribution)).toBe(true);
      });
    });

    describe('GET /api/v1/wheels/:id/analytics', () => {
      it('should get detailed wheel analytics', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}/analytics`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('analytics');
        expect(response.body.data.analytics).toHaveProperty('engagement_metrics');
        expect(response.body.data.analytics).toHaveProperty('performance_metrics');
        expect(response.body.data.analytics).toHaveProperty('user_behavior');
      });

      it('should return 403 for non-admin users', async () => {
        await request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}/analytics`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });
  });

  describe('Wheel Status Management', () => {
    describe('PATCH /api/v1/wheels/:id/status', () => {
      let statusWheelId;

      beforeAll(async () => {
        // Create a wheel for status tests
        const createResponse = await request(TEST_BASE_URL)
          .post('/api/v1/wheels')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Status Test Wheel',
            brand_id: testBrandId,
            items: [
              {
                name: 'Status Prize',
                type: 'points',
                value: 100,
                probability: 1.0
              }
            ]
          });
        
        statusWheelId = createResponse.body.data.wheel.id;
        createdWheelIds.push(statusWheelId);
      });

      it('should activate wheel', async () => {
        const response = await request(TEST_BASE_URL)
          .patch(`/api/v1/wheels/${statusWheelId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'active' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.wheel.status).toBe('active');
      });

      it('should deactivate wheel', async () => {
        const response = await request(TEST_BASE_URL)
          .patch(`/api/v1/wheels/${statusWheelId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'inactive', reason: 'Maintenance' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.wheel.status).toBe('inactive');
      });

      it('should return 403 for non-admin users', async () => {
        await request(TEST_BASE_URL)
          .patch(`/api/v1/wheels/${statusWheelId}/status`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ status: 'active' })
          .expect(403);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed wheel configuration', async () => {
      const malformedData = {
        name: 'Malformed Wheel',
        brand_id: 'invalid-uuid',
        items: 'not-an-array'
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/wheels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(malformedData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle concurrent spin attempts', async () => {
      const concurrentSpins = Array(3).fill().map(() => 
        request(TEST_BASE_URL)
          .post(`/api/v1/wheels/${testWheelId}/spin`)
          .set('Authorization', `Bearer ${memberToken}`)
      );

      const results = await Promise.allSettled(concurrentSpins);
      
      // At least one should succeed or be rate limited
      const responses = results.map(r => r.value || r.reason);
      const validResponses = responses.filter(r => r.status === 200 || r.status === 429);
      
      expect(validResponses.length).toBeGreaterThan(0);
    });

    it('should handle very large wheel configurations', async () => {
      const largeWheelData = {
        name: 'Large Wheel',
        brand_id: testBrandId,
        items: Array(50).fill().map((_, index) => ({
          name: `Prize ${index + 1}`,
          type: 'points',
          value: (index + 1) * 10,
          probability: 0.02 // 2% each, total 100%
        }))
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/wheels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largeWheelData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.wheel.items).toHaveLength(50);
      
      createdWheelIds.push(response.body.data.wheel.id);
    });

    it('should handle zero probability items', async () => {
      const wheelWithZeroProbability = {
        name: 'Zero Probability Wheel',
        brand_id: testBrandId,
        items: [
          {
            name: 'Common Prize',
            type: 'points',
            value: 50,
            probability: 1.0
          },
          {
            name: 'Impossible Prize',
            type: 'points',
            value: 1000,
            probability: 0.0
          }
        ]
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/wheels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(wheelWithZeroProbability)
        .expect(201);

      expect(response.body.success).toBe(true);
      
      createdWheelIds.push(response.body.data.wheel.id);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent wheel configuration requests', async () => {
      const concurrentRequests = Array(5).fill().map(() => 
        request(TEST_BASE_URL)
          .get(`/api/v1/wheels/${testWheelId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('wheel');
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(TEST_BASE_URL)
        .get(`/api/v1/wheels/${testWheelId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // 3 seconds max
    });

    it('should handle rapid spin history requests', async () => {
      const rapidRequests = Array(10).fill().map(() => 
        request(TEST_BASE_URL)
          .get('/api/v1/wheels/history?limit=5')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200)
      );

      const responses = await Promise.all(rapidRequests);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('spins');
      });
    });
  });
});