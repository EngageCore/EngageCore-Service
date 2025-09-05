/**
 * User and Member Management Integration Tests
 * Tests user profiles, member registration, membership tiers, and points management
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

describe('User and Member Management Integration Tests', () => {
  let adminToken;
  let userToken;
  let memberToken;
  let testBrandId;
  let testUserId;
  let testMemberId;
  let createdUserIds = [];

  beforeAll(async () => {
    // Setup test data
    await setupTestData();
    testBrandId = testData.brands.validBrand.id;
    
    // Create admin user
    const adminResponse = await request(TEST_BASE_URL)
      .post('/api/v1/auth/register')
      .send({
        email: 'admin@membertest.com',
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
        email: 'user@membertest.com',
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
        email: 'member@membertest.com',
        password: 'MemberTest123!',
        first_name: 'Member',
        last_name: 'User',
        brand_id: testBrandId
      });
    
    memberToken = memberResponse.body.data?.token;
    testMemberId = memberResponse.body.data?.user?.id;
  });

  afterAll(async () => {
    // Clean up created users
    for (const userId of createdUserIds) {
      try {
        await request(TEST_BASE_URL)
          .delete(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    await cleanupTestData();
  });

  describe('User Profile Management', () => {
    describe('GET /api/v1/users/profile', () => {
      it('should get current user profile', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user).toHaveProperty('id');
        expect(response.body.data.user).toHaveProperty('email');
        expect(response.body.data.user).toHaveProperty('first_name');
        expect(response.body.data.user).toHaveProperty('last_name');
        expect(response.body.data.user.email).toBe('user@membertest.com');
      });

      it('should return 401 for unauthenticated requests', async () => {
        await request(TEST_BASE_URL)
          .get('/api/v1/users/profile')
          .expect(401);
      });

      it('should return 401 for invalid token', async () => {
        await request(TEST_BASE_URL)
          .get('/api/v1/users/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });

    describe('PUT /api/v1/users/profile', () => {
      it('should update user profile with valid data', async () => {
        const updateData = {
          first_name: 'Updated',
          last_name: 'Name',
          phone: '+1234567890',
          date_of_birth: '1990-01-01',
          preferences: {
            newsletter: true,
            notifications: false,
            language: 'en'
          }
        };

        const response = await request(TEST_BASE_URL)
          .put('/api/v1/users/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.first_name).toBe('Updated');
        expect(response.body.data.user.last_name).toBe('Name');
        expect(response.body.data.user.phone).toBe('+1234567890');
      });

      it('should validate phone number format', async () => {
        const updateData = {
          phone: 'invalid-phone'
        };

        const response = await request(TEST_BASE_URL)
          .put('/api/v1/users/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(400);

        expect(response.body.error).toContain('phone');
      });

      it('should validate date of birth', async () => {
        const updateData = {
          date_of_birth: '2030-01-01' // Future date
        };

        const response = await request(TEST_BASE_URL)
          .put('/api/v1/users/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(400);

        expect(response.body.error).toContain('date');
      });

      it('should not allow email update through profile endpoint', async () => {
        const updateData = {
          email: 'newemail@test.com'
        };

        const response = await request(TEST_BASE_URL)
          .put('/api/v1/users/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(400);

        expect(response.body.error).toContain('email');
      });
    });

    describe('POST /api/v1/users/change-password', () => {
      it('should change password with valid current password', async () => {
        const passwordData = {
          current_password: 'UserTest123!',
          new_password: 'NewPassword123!',
          confirm_password: 'NewPassword123!'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/users/change-password')
          .set('Authorization', `Bearer ${userToken}`)
          .send(passwordData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('password');
      });

      it('should reject weak passwords', async () => {
        const passwordData = {
          current_password: 'NewPassword123!',
          new_password: '123',
          confirm_password: '123'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/users/change-password')
          .set('Authorization', `Bearer ${userToken}`)
          .send(passwordData)
          .expect(400);

        expect(response.body.error).toContain('password');
      });

      it('should reject mismatched password confirmation', async () => {
        const passwordData = {
          current_password: 'NewPassword123!',
          new_password: 'AnotherPassword123!',
          confirm_password: 'DifferentPassword123!'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/users/change-password')
          .set('Authorization', `Bearer ${userToken}`)
          .send(passwordData)
          .expect(400);

        expect(response.body.error).toContain('match');
      });
    });
  });

  describe('Member Management', () => {
    describe('GET /api/v1/members/profile', () => {
      it('should get member profile with membership details', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/members/profile')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('member');
        expect(response.body.data.member).toHaveProperty('id');
        expect(response.body.data.member).toHaveProperty('points');
        expect(response.body.data.member).toHaveProperty('tier');
        expect(response.body.data.member).toHaveProperty('total_spins');
      });

      it('should include membership statistics', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/members/profile?include_stats=true')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('statistics');
        expect(response.body.data.statistics).toHaveProperty('total_points_earned');
        expect(response.body.data.statistics).toHaveProperty('total_points_spent');
        expect(response.body.data.statistics).toHaveProperty('total_spins');
      });
    });

    describe('GET /api/v1/members', () => {
      it('should get all members (admin only)', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/members')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('members');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.members)).toBe(true);
      });

      it('should filter members by tier', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/members?tier=bronze')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.members.forEach(member => {
          expect(member.tier).toBe('bronze');
        });
      });

      it('should filter members by status', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/members?status=active')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.members.forEach(member => {
          expect(member.status).toBe('active');
        });
      });

      it('should return 403 for non-admin users', async () => {
        await request(TEST_BASE_URL)
          .get('/api/v1/members')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });

    describe('GET /api/v1/members/:id', () => {
      it('should get specific member details (admin only)', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/members/${testMemberId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('member');
        expect(response.body.data.member.id).toBe(testMemberId);
      });

      it('should allow users to view their own member profile', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/members/${testMemberId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.member.id).toBe(testMemberId);
      });

      it('should return 403 when user tries to view other member profiles', async () => {
        await request(TEST_BASE_URL)
          .get(`/api/v1/members/${testMemberId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });
  });

  describe('Points Management', () => {
    describe('GET /api/v1/members/points', () => {
      it('should get current points balance', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/members/points')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('points');
        expect(response.body.data).toHaveProperty('available_points');
        expect(response.body.data).toHaveProperty('pending_points');
        expect(typeof response.body.data.points).toBe('number');
      });

      it('should include points history when requested', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/members/points?include_history=true')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('history');
        expect(Array.isArray(response.body.data.history)).toBe(true);
      });
    });

    describe('POST /api/v1/members/points/add', () => {
      it('should add points to member account (admin only)', async () => {
        const pointsData = {
          member_id: testMemberId,
          points: 100,
          reason: 'Bonus points for testing',
          type: 'bonus'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/members/points/add')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pointsData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transaction');
        expect(response.body.data.transaction.points).toBe(100);
        expect(response.body.data.transaction.type).toBe('bonus');
      });

      it('should validate points amount', async () => {
        const pointsData = {
          member_id: testMemberId,
          points: -50, // Negative points not allowed for add
          reason: 'Invalid points'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/members/points/add')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pointsData)
          .expect(400);

        expect(response.body.error).toContain('points');
      });

      it('should return 403 for non-admin users', async () => {
        const pointsData = {
          member_id: testMemberId,
          points: 100,
          reason: 'Unauthorized points'
        };

        await request(TEST_BASE_URL)
          .post('/api/v1/members/points/add')
          .set('Authorization', `Bearer ${userToken}`)
          .send(pointsData)
          .expect(403);
      });
    });

    describe('POST /api/v1/members/points/deduct', () => {
      it('should deduct points from member account (admin only)', async () => {
        const pointsData = {
          member_id: testMemberId,
          points: 50,
          reason: 'Points deduction for testing',
          type: 'penalty'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/members/points/deduct')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pointsData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transaction');
        expect(response.body.data.transaction.points).toBe(-50);
        expect(response.body.data.transaction.type).toBe('penalty');
      });

      it('should prevent deducting more points than available', async () => {
        const pointsData = {
          member_id: testMemberId,
          points: 999999, // More than available
          reason: 'Excessive deduction'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/members/points/deduct')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pointsData)
          .expect(400);

        expect(response.body.error).toContain('insufficient');
      });
    });

    describe('POST /api/v1/members/points/transfer', () => {
      let recipientMemberId;

      beforeAll(async () => {
        // Create recipient member
        const recipientResponse = await request(TEST_BASE_URL)
          .post('/api/v1/auth/register')
          .send({
            email: 'recipient@membertest.com',
            password: 'RecipientTest123!',
            first_name: 'Recipient',
            last_name: 'User',
            brand_id: testBrandId
          });
        
        recipientMemberId = recipientResponse.body.data?.user?.id;
        createdUserIds.push(recipientMemberId);
      });

      it('should transfer points between members', async () => {
        const transferData = {
          from_member_id: testMemberId,
          to_member_id: recipientMemberId,
          points: 25,
          message: 'Points transfer for testing'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/members/points/transfer')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(transferData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transfer');
        expect(response.body.data.transfer.points).toBe(25);
      });

      it('should validate transfer amount', async () => {
        const transferData = {
          from_member_id: testMemberId,
          to_member_id: recipientMemberId,
          points: 0, // Invalid amount
          message: 'Invalid transfer'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/members/points/transfer')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(transferData)
          .expect(400);

        expect(response.body.error).toContain('points');
      });

      it('should prevent self-transfer', async () => {
        const transferData = {
          from_member_id: testMemberId,
          to_member_id: testMemberId,
          points: 10,
          message: 'Self transfer'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/members/points/transfer')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(transferData)
          .expect(400);

        expect(response.body.error).toContain('self');
      });
    });
  });

  describe('Membership Tiers', () => {
    describe('GET /api/v1/members/tiers', () => {
      it('should get all available membership tiers', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/members/tiers')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('tiers');
        expect(Array.isArray(response.body.data.tiers)).toBe(true);
        
        if (response.body.data.tiers.length > 0) {
          const tier = response.body.data.tiers[0];
          expect(tier).toHaveProperty('name');
          expect(tier).toHaveProperty('min_points');
          expect(tier).toHaveProperty('benefits');
        }
      });
    });

    describe('POST /api/v1/members/:id/upgrade-tier', () => {
      it('should upgrade member tier when requirements are met', async () => {
        // First, add enough points for upgrade
        await request(TEST_BASE_URL)
          .post('/api/v1/members/points/add')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            points: 1000,
            reason: 'Points for tier upgrade test'
          });

        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/members/${testMemberId}/upgrade-tier`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ target_tier: 'silver' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('member');
        expect(response.body.data.member.tier).toBe('silver');
      });

      it('should prevent upgrade when requirements not met', async () => {
        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/members/${testMemberId}/upgrade-tier`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ target_tier: 'platinum' })
          .expect(400);

        expect(response.body.error).toContain('requirements');
      });

      it('should allow members to upgrade their own tier', async () => {
        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/members/${testMemberId}/upgrade-tier`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ target_tier: 'gold' })
          .expect(400); // Assuming requirements not met

        expect(response.body.error).toBeDefined();
      });
    });

    describe('GET /api/v1/members/:id/tier-progress', () => {
      it('should get member tier progress', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/members/${testMemberId}/tier-progress`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('current_tier');
        expect(response.body.data).toHaveProperty('next_tier');
        expect(response.body.data).toHaveProperty('progress');
        expect(response.body.data).toHaveProperty('requirements');
      });
    });
  });

  describe('Member Activity and Statistics', () => {
    describe('GET /api/v1/members/:id/activity', () => {
      it('should get member activity history', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/members/${testMemberId}/activity`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('activities');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.activities)).toBe(true);
      });

      it('should filter activity by type', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/members/${testMemberId}/activity?type=spin`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.activities.forEach(activity => {
          expect(activity.type).toBe('spin');
        });
      });

      it('should filter activity by date range', async () => {
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/members/${testMemberId}/activity?start_date=${startDate}&end_date=${endDate}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('activities');
      });
    });

    describe('GET /api/v1/members/:id/statistics', () => {
      it('should get member statistics', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/members/${testMemberId}/statistics`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('statistics');
        expect(response.body.data.statistics).toHaveProperty('total_points_earned');
        expect(response.body.data.statistics).toHaveProperty('total_points_spent');
        expect(response.body.data.statistics).toHaveProperty('total_spins');
        expect(response.body.data.statistics).toHaveProperty('total_missions_completed');
      });

      it('should get statistics for specific time period', async () => {
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/members/${testMemberId}/statistics?period=month`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.statistics).toHaveProperty('period');
        expect(response.body.data.statistics.period).toBe('month');
      });
    });
  });

  describe('Member Status Management', () => {
    describe('PATCH /api/v1/members/:id/status', () => {
      it('should update member status (admin only)', async () => {
        const statusData = {
          status: 'suspended',
          reason: 'Policy violation'
        };

        const response = await request(TEST_BASE_URL)
          .patch(`/api/v1/members/${testMemberId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(statusData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.member.status).toBe('suspended');
      });

      it('should reactivate suspended member', async () => {
        const statusData = {
          status: 'active',
          reason: 'Suspension lifted'
        };

        const response = await request(TEST_BASE_URL)
          .patch(`/api/v1/members/${testMemberId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(statusData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.member.status).toBe('active');
      });

      it('should return 403 for non-admin users', async () => {
        const statusData = {
          status: 'suspended',
          reason: 'Unauthorized action'
        };

        await request(TEST_BASE_URL)
          .patch(`/api/v1/members/${testMemberId}/status`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(statusData)
          .expect(403);
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('POST /api/v1/members/bulk-update', () => {
      it('should perform bulk member updates (admin only)', async () => {
        const bulkData = {
          member_ids: [testMemberId],
          updates: {
            status: 'active',
            tier: 'bronze'
          }
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/members/bulk-update')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(bulkData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('updated_count');
        expect(response.body.data.updated_count).toBe(1);
      });

      it('should validate bulk update data', async () => {
        const bulkData = {
          member_ids: [], // Empty array
          updates: {
            status: 'invalid_status'
          }
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/members/bulk-update')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(bulkData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });

    describe('POST /api/v1/members/bulk-points', () => {
      it('should perform bulk points operations (admin only)', async () => {
        const bulkPointsData = {
          member_ids: [testMemberId],
          operation: 'add',
          points: 50,
          reason: 'Bulk bonus points'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/members/bulk-points')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(bulkPointsData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('processed_count');
        expect(response.body.data.processed_count).toBe(1);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent member ID', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      
      await request(TEST_BASE_URL)
        .get(`/api/v1/members/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle invalid member ID format', async () => {
      await request(TEST_BASE_URL)
        .get('/api/v1/members/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should handle concurrent points operations', async () => {
      const pointsOperations = [
        request(TEST_BASE_URL)
          .post('/api/v1/members/points/add')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            points: 10,
            reason: 'Concurrent test 1'
          }),
        request(TEST_BASE_URL)
          .post('/api/v1/members/points/add')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            member_id: testMemberId,
            points: 15,
            reason: 'Concurrent test 2'
          })
      ];

      const results = await Promise.allSettled(pointsOperations);
      
      // Both operations should succeed
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        expect(result.value.status).toBe(200);
      });
    });

    it('should handle large pagination requests', async () => {
      const response = await request(TEST_BASE_URL)
        .get('/api/v1/members?page=1&limit=1000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.limit).toBeLessThanOrEqual(100); // Assuming max limit is enforced
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent profile requests', async () => {
      const concurrentRequests = Array(5).fill().map(() => 
        request(TEST_BASE_URL)
          .get('/api/v1/members/profile')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('member');
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(TEST_BASE_URL)
        .get('/api/v1/members/profile')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // 3 seconds max
    });
  });
});