/**
 * Mission Completion and Rewards System Integration Tests
 * Tests mission creation, completion, rewards claiming, and mission history
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

describe('Mission System Integration Tests', () => {
  let adminToken;
  let userToken;
  let memberToken;
  let testBrandId;
  let testUserId;
  let testMemberId;
  let createdMissionIds = [];

  beforeAll(async () => {
    // Setup test data
    await setupTestData();
    testBrandId = testData.brands.validBrand.id;
    
    // Create admin user
    const adminResponse = await request(TEST_BASE_URL)
      .post('/api/v1/auth/register')
      .send({
        email: 'admin@missiontest.com',
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
        email: 'user@missiontest.com',
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
        email: 'member@missiontest.com',
        password: 'MemberTest123!',
        first_name: 'Member',
        last_name: 'User',
        brand_id: testBrandId
      });
    
    memberToken = memberResponse.body.data?.token;
    testMemberId = memberResponse.body.data?.user?.id;
  });

  afterAll(async () => {
    // Clean up created missions
    for (const missionId of createdMissionIds) {
      try {
        await request(TEST_BASE_URL)
          .delete(`/api/v1/missions/${missionId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    await cleanupTestData();
  });

  describe('Mission Management', () => {
    describe('GET /api/v1/missions/available', () => {
      it('should get available missions for user', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/available')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('missions');
        expect(Array.isArray(response.body.data.missions)).toBe(true);
        
        if (response.body.data.missions.length > 0) {
          const mission = response.body.data.missions[0];
          expect(mission).toHaveProperty('id');
          expect(mission).toHaveProperty('name');
          expect(mission).toHaveProperty('description');
          expect(mission).toHaveProperty('reward_points');
          expect(mission).toHaveProperty('status');
        }
      });

      it('should filter missions by type', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/available?type=daily')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.missions.forEach(mission => {
          expect(mission.type).toBe('daily');
        });
      });

      it('should filter missions by difficulty', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/available?difficulty=easy')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.missions.forEach(mission => {
          expect(mission.difficulty).toBe('easy');
        });
      });

      it('should include mission progress when requested', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/available?include_progress=true')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        if (response.body.data.missions.length > 0) {
          expect(response.body.data.missions[0]).toHaveProperty('progress');
        }
      });

      it('should return 401 for unauthenticated requests', async () => {
        await request(TEST_BASE_URL)
          .get('/api/v1/missions/available')
          .expect(401);
      });
    });

    describe('GET /api/v1/missions', () => {
      it('should get all missions (admin only)', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('missions');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.missions)).toBe(true);
      });

      it('should filter missions by status', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions?status=active')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.missions.forEach(mission => {
          expect(mission.status).toBe('active');
        });
      });

      it('should return 403 for non-admin users', async () => {
        await request(TEST_BASE_URL)
          .get('/api/v1/missions')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });

    describe('GET /api/v1/missions/:id', () => {
      let testMissionId;

      beforeAll(async () => {
        // Get available missions to test with
        const missionsResponse = await request(TEST_BASE_URL)
          .get('/api/v1/missions/available')
          .set('Authorization', `Bearer ${memberToken}`);
        
        if (missionsResponse.body.data.missions.length > 0) {
          testMissionId = missionsResponse.body.data.missions[0].id;
        }
      });

      it('should get specific mission details', async () => {
        if (!testMissionId) {
          return; // Skip if no missions available
        }

        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/missions/${testMissionId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('mission');
        expect(response.body.data.mission.id).toBe(testMissionId);
        expect(response.body.data.mission).toHaveProperty('name');
        expect(response.body.data.mission).toHaveProperty('description');
        expect(response.body.data.mission).toHaveProperty('requirements');
      });

      it('should include user progress for mission', async () => {
        if (!testMissionId) {
          return;
        }

        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/missions/${testMissionId}?include_progress=true`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('progress');
        expect(response.body.data.progress).toHaveProperty('completed');
        expect(response.body.data.progress).toHaveProperty('progress_percentage');
      });

      it('should return 404 for non-existent mission', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
        
        await request(TEST_BASE_URL)
          .get(`/api/v1/missions/${nonExistentId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(404);
      });
    });

    describe('POST /api/v1/missions', () => {
      it('should create new mission (admin only)', async () => {
        const missionData = {
          name: 'Test Mission',
          description: 'A mission created for testing',
          type: 'daily',
          difficulty: 'easy',
          brand_id: testBrandId,
          reward_points: 100,
          reward_type: 'points',
          requirements: {
            type: 'spin_wheel',
            target: 3,
            description: 'Spin the wheel 3 times'
          },
          duration_hours: 24,
          max_completions: 1,
          status: 'active'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/missions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(missionData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('mission');
        expect(response.body.data.mission.name).toBe(missionData.name);
        expect(response.body.data.mission.reward_points).toBe(missionData.reward_points);
        expect(response.body.data.mission.status).toBe('active');
        
        createdMissionIds.push(response.body.data.mission.id);
      });

      it('should create recurring mission', async () => {
        const recurringMissionData = {
          name: 'Weekly Challenge',
          description: 'Complete weekly objectives',
          type: 'weekly',
          difficulty: 'medium',
          brand_id: testBrandId,
          reward_points: 500,
          requirements: {
            type: 'points_earned',
            target: 1000,
            description: 'Earn 1000 points this week'
          },
          duration_hours: 168, // 1 week
          max_completions: -1, // Unlimited
          recurring: true,
          recurring_interval: 'weekly'
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/missions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(recurringMissionData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.mission.recurring).toBe(true);
        expect(response.body.data.mission.recurring_interval).toBe('weekly');
        
        createdMissionIds.push(response.body.data.mission.id);
      });

      it('should validate mission requirements', async () => {
        const invalidMissionData = {
          name: 'Invalid Mission',
          // Missing required fields
          reward_points: -100 // Invalid negative points
        };

        const response = await request(TEST_BASE_URL)
          .post('/api/v1/missions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidMissionData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('should return 403 for non-admin users', async () => {
        const missionData = {
          name: 'Unauthorized Mission',
          brand_id: testBrandId,
          reward_points: 100
        };

        await request(TEST_BASE_URL)
          .post('/api/v1/missions')
          .set('Authorization', `Bearer ${userToken}`)
          .send(missionData)
          .expect(403);
      });
    });

    describe('PUT /api/v1/missions/:id', () => {
      let updateMissionId;

      beforeAll(async () => {
        // Create a mission for update tests
        const createResponse = await request(TEST_BASE_URL)
          .post('/api/v1/missions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Update Test Mission',
            description: 'Mission for update testing',
            type: 'daily',
            brand_id: testBrandId,
            reward_points: 50,
            requirements: {
              type: 'login',
              target: 1,
              description: 'Login once'
            }
          });
        
        updateMissionId = createResponse.body.data.mission.id;
        createdMissionIds.push(updateMissionId);
      });

      it('should update mission details', async () => {
        const updateData = {
          name: 'Updated Mission Name',
          description: 'Updated description',
          reward_points: 150,
          difficulty: 'medium'
        };

        const response = await request(TEST_BASE_URL)
          .put(`/api/v1/missions/${updateMissionId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.mission.name).toBe(updateData.name);
        expect(response.body.data.mission.reward_points).toBe(updateData.reward_points);
      });

      it('should update mission requirements', async () => {
        const updateData = {
          requirements: {
            type: 'spin_wheel',
            target: 5,
            description: 'Spin the wheel 5 times'
          }
        };

        const response = await request(TEST_BASE_URL)
          .put(`/api/v1/missions/${updateMissionId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.mission.requirements.target).toBe(5);
      });

      it('should return 404 for non-existent mission', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
        const updateData = { name: 'Updated Name' };

        await request(TEST_BASE_URL)
          .put(`/api/v1/missions/${nonExistentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(404);
      });
    });
  });

  describe('Mission Completion', () => {
    describe('POST /api/v1/missions/:id/start', () => {
      let startMissionId;

      beforeAll(async () => {
        // Create a mission for start tests
        const createResponse = await request(TEST_BASE_URL)
          .post('/api/v1/missions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Start Test Mission',
            description: 'Mission for start testing',
            type: 'daily',
            brand_id: testBrandId,
            reward_points: 75,
            requirements: {
              type: 'points_earned',
              target: 100,
              description: 'Earn 100 points'
            },
            duration_hours: 24
          });
        
        startMissionId = createResponse.body.data.mission.id;
        createdMissionIds.push(startMissionId);
      });

      it('should start mission for user', async () => {
        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${startMissionId}/start`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('mission_progress');
        expect(response.body.data.mission_progress.mission_id).toBe(startMissionId);
        expect(response.body.data.mission_progress.status).toBe('in_progress');
        expect(response.body.data.mission_progress.progress).toBe(0);
      });

      it('should prevent starting already started mission', async () => {
        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${startMissionId}/start`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(400);

        expect(response.body.error).toContain('already started');
      });

      it('should return 404 for non-existent mission', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
        
        await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${nonExistentId}/start`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(404);
      });
    });

    describe('POST /api/v1/missions/:id/progress', () => {
      let progressMissionId;

      beforeAll(async () => {
        // Create and start a mission for progress tests
        const createResponse = await request(TEST_BASE_URL)
          .post('/api/v1/missions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Progress Test Mission',
            description: 'Mission for progress testing',
            type: 'daily',
            brand_id: testBrandId,
            reward_points: 100,
            requirements: {
              type: 'custom_action',
              target: 10,
              description: 'Complete 10 custom actions'
            }
          });
        
        progressMissionId = createResponse.body.data.mission.id;
        createdMissionIds.push(progressMissionId);

        // Start the mission
        await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${progressMissionId}/start`)
          .set('Authorization', `Bearer ${memberToken}`);
      });

      it('should update mission progress', async () => {
        const progressData = {
          action: 'custom_action',
          value: 3,
          metadata: {
            description: 'Completed 3 actions'
          }
        };

        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${progressMissionId}/progress`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send(progressData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('mission_progress');
        expect(response.body.data.mission_progress.progress).toBe(3);
        expect(response.body.data.mission_progress.progress_percentage).toBe(30);
      });

      it('should complete mission when target reached', async () => {
        const progressData = {
          action: 'custom_action',
          value: 7 // This should complete the mission (3 + 7 = 10)
        };

        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${progressMissionId}/progress`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send(progressData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.mission_progress.progress).toBe(10);
        expect(response.body.data.mission_progress.status).toBe('completed');
        expect(response.body.data.mission_progress.completed_at).toBeDefined();
      });

      it('should prevent progress on completed mission', async () => {
        const progressData = {
          action: 'custom_action',
          value: 1
        };

        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${progressMissionId}/progress`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send(progressData)
          .expect(400);

        expect(response.body.error).toContain('completed');
      });
    });

    describe('POST /api/v1/missions/:id/complete', () => {
      let completeMissionId;

      beforeAll(async () => {
        // Create a mission for completion tests
        const createResponse = await request(TEST_BASE_URL)
          .post('/api/v1/missions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Complete Test Mission',
            description: 'Mission for completion testing',
            type: 'daily',
            brand_id: testBrandId,
            reward_points: 200,
            requirements: {
              type: 'manual_complete',
              target: 1,
              description: 'Manually complete this mission'
            }
          });
        
        completeMissionId = createResponse.body.data.mission.id;
        createdMissionIds.push(completeMissionId);

        // Start the mission
        await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${completeMissionId}/start`)
          .set('Authorization', `Bearer ${memberToken}`);
      });

      it('should manually complete mission', async () => {
        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${completeMissionId}/complete`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('mission_progress');
        expect(response.body.data.mission_progress.status).toBe('completed');
        expect(response.body.data.mission_progress.completed_at).toBeDefined();
      });

      it('should prevent completing already completed mission', async () => {
        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${completeMissionId}/complete`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(400);

        expect(response.body.error).toContain('already completed');
      });
    });
  });

  describe('Reward System', () => {
    describe('POST /api/v1/missions/:id/claim-reward', () => {
      let rewardMissionId;

      beforeAll(async () => {
        // Create, start, and complete a mission for reward tests
        const createResponse = await request(TEST_BASE_URL)
          .post('/api/v1/missions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Reward Test Mission',
            description: 'Mission for reward testing',
            type: 'daily',
            brand_id: testBrandId,
            reward_points: 300,
            reward_type: 'points',
            requirements: {
              type: 'instant_complete',
              target: 1,
              description: 'Instantly completable mission'
            }
          });
        
        rewardMissionId = createResponse.body.data.mission.id;
        createdMissionIds.push(rewardMissionId);

        // Start and complete the mission
        await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${rewardMissionId}/start`)
          .set('Authorization', `Bearer ${memberToken}`);
        
        await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${rewardMissionId}/complete`)
          .set('Authorization', `Bearer ${memberToken}`);
      });

      it('should claim mission reward', async () => {
        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${rewardMissionId}/claim-reward`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('reward');
        expect(response.body.data.reward.points).toBe(300);
        expect(response.body.data.reward.type).toBe('points');
        expect(response.body.data).toHaveProperty('user_points');
      });

      it('should prevent claiming reward twice', async () => {
        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${rewardMissionId}/claim-reward`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(400);

        expect(response.body.error).toContain('already claimed');
      });

      it('should prevent claiming reward for incomplete mission', async () => {
        // Create a new incomplete mission
        const incompleteResponse = await request(TEST_BASE_URL)
          .post('/api/v1/missions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Incomplete Mission',
            brand_id: testBrandId,
            reward_points: 100,
            requirements: {
              type: 'never_complete',
              target: 999,
              description: 'This will never be completed'
            }
          });
        
        const incompleteMissionId = incompleteResponse.body.data.mission.id;
        createdMissionIds.push(incompleteMissionId);

        // Start but don't complete
        await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${incompleteMissionId}/start`)
          .set('Authorization', `Bearer ${memberToken}`);

        const response = await request(TEST_BASE_URL)
          .post(`/api/v1/missions/${incompleteMissionId}/claim-reward`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(400);

        expect(response.body.error).toContain('not completed');
      });
    });

    describe('GET /api/v1/missions/rewards/pending', () => {
      it('should get pending rewards for user', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/rewards/pending')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('pending_rewards');
        expect(Array.isArray(response.body.data.pending_rewards)).toBe(true);
        expect(response.body.data).toHaveProperty('total_pending_points');
      });

      it('should include reward details', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/rewards/pending')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        if (response.body.data.pending_rewards.length > 0) {
          const reward = response.body.data.pending_rewards[0];
          expect(reward).toHaveProperty('mission_id');
          expect(reward).toHaveProperty('mission_name');
          expect(reward).toHaveProperty('reward_points');
          expect(reward).toHaveProperty('completed_at');
        }
      });
    });

    describe('POST /api/v1/missions/rewards/claim-all', () => {
      beforeAll(async () => {
        // Create and complete multiple missions for bulk claim test
        for (let i = 0; i < 3; i++) {
          const createResponse = await request(TEST_BASE_URL)
            .post('/api/v1/missions')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              name: `Bulk Claim Mission ${i + 1}`,
              brand_id: testBrandId,
              reward_points: 50,
              requirements: {
                type: 'instant_complete',
                target: 1,
                description: 'Instantly completable'
              }
            });
          
          const missionId = createResponse.body.data.mission.id;
          createdMissionIds.push(missionId);

          // Start and complete
          await request(TEST_BASE_URL)
            .post(`/api/v1/missions/${missionId}/start`)
            .set('Authorization', `Bearer ${memberToken}`);
          
          await request(TEST_BASE_URL)
            .post(`/api/v1/missions/${missionId}/complete`)
            .set('Authorization', `Bearer ${memberToken}`);
        }
      });

      it('should claim all pending rewards', async () => {
        const response = await request(TEST_BASE_URL)
          .post('/api/v1/missions/rewards/claim-all')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('claimed_rewards');
        expect(response.body.data).toHaveProperty('total_points_claimed');
        expect(response.body.data.claimed_rewards.length).toBeGreaterThan(0);
        expect(response.body.data.total_points_claimed).toBeGreaterThan(0);
      });
    });
  });

  describe('Mission History and Progress', () => {
    describe('GET /api/v1/missions/history', () => {
      it('should get user mission history', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/history')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('missions');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.missions)).toBe(true);
      });

      it('should filter history by status', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/history?status=completed')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.missions.forEach(mission => {
          expect(mission.status).toBe('completed');
        });
      });

      it('should filter history by date range', async () => {
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        
        const response = await request(TEST_BASE_URL)
          .get(`/api/v1/missions/history?start_date=${startDate}&end_date=${endDate}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('missions');
      });

      it('should include mission details in history', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/history?include_details=true')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        if (response.body.data.missions.length > 0) {
          const mission = response.body.data.missions[0];
          expect(mission).toHaveProperty('mission_name');
          expect(mission).toHaveProperty('reward_points');
          expect(mission).toHaveProperty('progress_percentage');
        }
      });
    });

    describe('GET /api/v1/missions/progress', () => {
      it('should get current mission progress', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/progress')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('active_missions');
        expect(response.body.data).toHaveProperty('completed_today');
        expect(response.body.data).toHaveProperty('total_points_earned');
        expect(Array.isArray(response.body.data.active_missions)).toBe(true);
      });

      it('should include detailed progress information', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/progress?include_details=true')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        if (response.body.data.active_missions.length > 0) {
          const mission = response.body.data.active_missions[0];
          expect(mission).toHaveProperty('progress_percentage');
          expect(mission).toHaveProperty('time_remaining');
          expect(mission).toHaveProperty('requirements');
        }
      });
    });

    describe('GET /api/v1/missions/statistics', () => {
      it('should get user mission statistics', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/statistics')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('statistics');
        expect(response.body.data.statistics).toHaveProperty('total_missions_completed');
        expect(response.body.data.statistics).toHaveProperty('total_points_earned');
        expect(response.body.data.statistics).toHaveProperty('completion_rate');
        expect(response.body.data.statistics).toHaveProperty('average_completion_time');
      });

      it('should get statistics for specific time period', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/statistics?period=month')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.statistics).toHaveProperty('period');
        expect(response.body.data.statistics.period).toBe('month');
      });
    });
  });

  describe('Mission Administration', () => {
    describe('PATCH /api/v1/missions/:id/status', () => {
      let statusMissionId;

      beforeAll(async () => {
        // Create a mission for status tests
        const createResponse = await request(TEST_BASE_URL)
          .post('/api/v1/missions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Status Test Mission',
            brand_id: testBrandId,
            reward_points: 100,
            requirements: {
              type: 'test',
              target: 1,
              description: 'Test mission'
            }
          });
        
        statusMissionId = createResponse.body.data.mission.id;
        createdMissionIds.push(statusMissionId);
      });

      it('should activate mission', async () => {
        const response = await request(TEST_BASE_URL)
          .patch(`/api/v1/missions/${statusMissionId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'active' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.mission.status).toBe('active');
      });

      it('should deactivate mission', async () => {
        const response = await request(TEST_BASE_URL)
          .patch(`/api/v1/missions/${statusMissionId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'inactive', reason: 'Temporarily disabled' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.mission.status).toBe('inactive');
      });

      it('should return 403 for non-admin users', async () => {
        await request(TEST_BASE_URL)
          .patch(`/api/v1/missions/${statusMissionId}/status`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ status: 'active' })
          .expect(403);
      });
    });

    describe('GET /api/v1/missions/analytics', () => {
      it('should get mission analytics (admin only)', async () => {
        const response = await request(TEST_BASE_URL)
          .get('/api/v1/missions/analytics')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('analytics');
        expect(response.body.data.analytics).toHaveProperty('total_missions');
        expect(response.body.data.analytics).toHaveProperty('completion_rates');
        expect(response.body.data.analytics).toHaveProperty('popular_missions');
        expect(response.body.data.analytics).toHaveProperty('user_engagement');
      });

      it('should return 403 for non-admin users', async () => {
        await request(TEST_BASE_URL)
          .get('/api/v1/missions/analytics')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid mission requirements', async () => {
      const invalidMissionData = {
        name: 'Invalid Requirements Mission',
        brand_id: testBrandId,
        reward_points: 100,
        requirements: {
          type: 'invalid_type',
          target: 'not_a_number',
          description: 'Invalid requirements'
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/missions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidMissionData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle expired missions', async () => {
      // Create a mission with very short duration
      const expiredMissionResponse = await request(TEST_BASE_URL)
        .post('/api/v1/missions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Expired Mission',
          brand_id: testBrandId,
          reward_points: 100,
          duration_hours: 0.001, // Very short duration
          requirements: {
            type: 'test',
            target: 1,
            description: 'Test mission'
          }
        });
      
      const expiredMissionId = expiredMissionResponse.body.data.mission.id;
      createdMissionIds.push(expiredMissionId);

      // Try to start the expired mission
      const response = await request(TEST_BASE_URL)
        .post(`/api/v1/missions/${expiredMissionId}/start`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);

      expect(response.body.error).toContain('expired');
    });

    it('should handle concurrent mission operations', async () => {
      // Create a mission for concurrent tests
      const concurrentMissionResponse = await request(TEST_BASE_URL)
        .post('/api/v1/missions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Concurrent Mission',
          brand_id: testBrandId,
          reward_points: 100,
          max_completions: 1, // Only one completion allowed
          requirements: {
            type: 'instant_complete',
            target: 1,
            description: 'Instantly completable'
          }
        });
      
      const concurrentMissionId = concurrentMissionResponse.body.data.mission.id;
      createdMissionIds.push(concurrentMissionId);

      // Try to start the mission concurrently
      const concurrentStarts = Array(3).fill().map(() => 
        request(TEST_BASE_URL)
          .post(`/api/v1/missions/${concurrentMissionId}/start`)
          .set('Authorization', `Bearer ${memberToken}`)
      );

      const results = await Promise.allSettled(concurrentStarts);
      
      // Only one should succeed
      const successCount = results.filter(r => r.value?.status === 200).length;
      expect(successCount).toBe(1);
    });

    it('should handle mission with zero reward points', async () => {
      const zeroRewardMission = {
        name: 'Zero Reward Mission',
        brand_id: testBrandId,
        reward_points: 0,
        requirements: {
          type: 'test',
          target: 1,
          description: 'Mission with no reward'
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/missions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(zeroRewardMission)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mission.reward_points).toBe(0);
      
      createdMissionIds.push(response.body.data.mission.id);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent mission requests', async () => {
      const concurrentRequests = Array(5).fill().map(() => 
        request(TEST_BASE_URL)
          .get('/api/v1/missions/available')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('missions');
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(TEST_BASE_URL)
        .get('/api/v1/missions/available')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // 3 seconds max
    });
  });
});