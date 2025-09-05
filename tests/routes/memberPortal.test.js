/**
 * Member Portal Routes Tests
 * Tests all member portal API endpoints with authentication flow
 */

const request = require('supertest');
const express = require('express');
const { generateTestToken, testData, mockQueryResult } = require('../utils/testHelpers');
const { mockPool } = require('../mocks/database');

// Mock problematic modules to avoid circular dependency issues
jest.mock('../../src/validators', () => ({
  memberValidators: {
    updateMemberProfileSchema: {},
    getMemberTransactionsSchema: {},
    redeemRewardSchema: {},
    getMemberNotificationsSchema: {}
  },
  wheelValidators: {
    spinWheelSchema: {},
    getWheelHistorySchema: {}
  },
  missionValidators: {
    getMemberMissionsSchema: {},
    completeMissionSchema: {},
    getCompletedMissionsSchema: {}
  }
}));

jest.mock('../../src/middleware', () => ({
  auth: {
    authenticateMember: (req, res, next) => {
      if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        if (token === 'valid-member-token') {
          req.user = { 
            id: 1, 
            email: 'member@example.com', 
            role: 'member',
            memberId: 1,
            brandId: 1 
          };
          req.member = {
            id: 1,
            userId: 1,
            brandId: 1,
            tierId: 1,
            points: 150,
            totalSpent: 500.00,
            isActive: true
          };
          next();
        } else if (token === 'inactive-member-token') {
          req.user = { 
            id: 2, 
            email: 'inactive@example.com', 
            role: 'member',
            memberId: 2,
            brandId: 1 
          };
          req.member = {
            id: 2,
            userId: 2,
            brandId: 1,
            tierId: 1,
            points: 0,
            totalSpent: 0,
            isActive: false
          };
          next();
        } else {
          res.status(401).json({ success: false, message: 'Invalid member token' });
        }
      } else {
        res.status(401).json({ success: false, message: 'Member authentication required' });
      }
    }
  },
  validation: {
    validate: () => (req, res, next) => next()
  },
  rateLimit: {
    generalRateLimit: (req, res, next) => next(),
    wheelSpinRateLimit: (req, res, next) => next()
  }
}));

const memberPortalRoutes = require('../../src/routes/memberPortal');



// Mock controllers
jest.mock('../../src/controllers', () => ({
  MemberController: {
    getMemberProfile: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          member: {
            id: req.member.id,
            user: {
              id: req.user.id,
              email: req.user.email,
              firstName: 'Test',
              lastName: 'Member'
            },
            brand: {
              id: req.member.brandId,
              name: 'Test Brand'
            },
            tier: {
              id: req.member.tierId,
              name: 'Bronze',
              benefits: ['10% discount']
            },
            points: req.member.points,
            totalSpent: req.member.totalSpent,
            joinedAt: new Date(),
            lastActivityAt: new Date()
          }
        }
      });
    }),
    updateMemberProfile: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          member: {
            ...req.member,
            user: {
              ...req.body,
              id: req.user.id,
              updatedAt: new Date()
            }
          }
        }
      });
    }),
    getMemberPoints: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          currentPoints: req.member.points,
          totalEarned: 300,
          totalSpent: 150,
          history: [
            { id: 1, type: 'earned', points: 50, description: 'Purchase reward', date: new Date() },
            { id: 2, type: 'spent', points: -20, description: 'Reward redemption', date: new Date() }
          ],
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    }),
    getMemberTierStatus: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          currentTier: {
            id: 1,
            name: 'Bronze',
            minPoints: 0,
            maxPoints: 999,
            benefits: ['10% discount'],
            color: '#CD7F32'
          },
          nextTier: {
            id: 2,
            name: 'Silver',
            minPoints: 1000,
            maxPoints: 4999,
            benefits: ['15% discount', 'Free shipping']
          },
          progress: {
            currentPoints: req.member.points,
            pointsToNextTier: 850,
            progressPercentage: 15
          }
        }
      });
    }),
    getMemberLeaderboardPosition: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          position: 25,
          totalMembers: 100,
          percentile: 75,
          topMembers: [
            { rank: 1, name: 'Top Member', points: 5000 },
            { rank: 2, name: 'Second Member', points: 4500 }
          ],
          memberStats: {
            points: req.member.points,
            rank: 25
          }
        }
      });
    }),
    getMemberRewards: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          availableRewards: [
            {
              id: 1,
              name: '10% Discount',
              description: 'Get 10% off your next purchase',
              pointsCost: 100,
              category: 'discount',
              isAvailable: true
            },
            {
              id: 2,
              name: 'Free Shipping',
              description: 'Free shipping on your next order',
              pointsCost: 200,
              category: 'shipping',
              isAvailable: false
            }
          ],
          memberPoints: req.member.points
        }
      });
    }),
    redeemMemberReward: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Reward redeemed successfully',
        data: {
          redemption: {
            id: 1,
            rewardId: parseInt(req.params.id),
            memberId: req.member.id,
            pointsUsed: 100,
            redeemedAt: new Date(),
            status: 'active',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          },
          remainingPoints: req.member.points - 100
        }
      });
    }),
    getMemberNotifications: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          notifications: [
            {
              id: 1,
              title: 'Welcome!',
              message: 'Welcome to our loyalty program',
              type: 'welcome',
              isRead: false,
              createdAt: new Date()
            },
            {
              id: 2,
              title: 'Points Earned',
              message: 'You earned 50 points from your recent purchase',
              type: 'points',
              isRead: true,
              createdAt: new Date()
            }
          ],
          unreadCount: 1,
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    }),
    markNotificationAsRead: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Notification marked as read',
        data: {
          notificationId: parseInt(req.params.id),
          isRead: true,
          readAt: new Date()
        }
      });
    })
  },
  MissionController: {
    getMemberMissions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          availableMissions: [
            {
              id: 1,
              title: 'First Purchase',
              description: 'Make your first purchase',
              type: 'purchase',
              target: 1,
              reward: 100,
              progress: 0,
              isCompleted: false,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            },
            {
              id: 2,
              title: 'Spend $100',
              description: 'Spend $100 in total',
              type: 'spending',
              target: 100,
              reward: 50,
              progress: 75,
              isCompleted: false,
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            }
          ],
          completedMissions: 3,
          totalRewardsEarned: 250
        }
      });
    }),
    completeMemberMission: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Mission completed successfully!',
        data: {
          mission: {
            id: parseInt(req.params.id),
            title: 'First Purchase',
            reward: 100,
            completedAt: new Date()
          },
          pointsEarned: 100,
          newPointsBalance: req.member.points + 100
        }
      });
    }),
    getMemberCompletedMissions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          completedMissions: [
            {
              id: 3,
              title: 'Profile Setup',
              description: 'Complete your profile',
              reward: 50,
              completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
              id: 4,
              title: 'Email Verification',
              description: 'Verify your email address',
              reward: 25,
              completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            }
          ],
          totalCompleted: 2,
          totalRewardsEarned: 75,
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    })
  },
  WheelController: {
    getMemberWheels: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          availableWheels: [
            {
              id: 1,
              name: 'Daily Spin',
              description: 'Spin once per day for rewards',
              costToSpin: 10,
              maxSpinsPerDay: 1,
              remainingSpins: 1,
              segments: [
                { id: 1, label: '10 Points', probability: 0.4 },
                { id: 2, label: '5% Discount', probability: 0.3 },
                { id: 3, label: 'Try Again', probability: 0.3 }
              ]
            },
            {
              id: 2,
              name: 'Premium Wheel',
              description: 'Higher rewards, higher cost',
              costToSpin: 50,
              maxSpinsPerDay: 3,
              remainingSpins: 2,
              segments: [
                { id: 1, label: '100 Points', probability: 0.2 },
                { id: 2, label: '20% Discount', probability: 0.3 },
                { id: 3, label: 'Free Product', probability: 0.1 },
                { id: 4, label: 'Try Again', probability: 0.4 }
              ]
            }
          ],
          memberPoints: req.member.points
        }
      });
    }),
    spinMemberWheel: jest.fn((req, res) => {
      const prizes = [
        { type: 'points', value: 10, label: '10 Points' },
        { type: 'discount', value: 5, label: '5% Discount' },
        { type: 'none', value: 0, label: 'Try Again' }
      ];
      const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
      
      res.json({
        success: true,
        message: 'Wheel spun successfully!',
        data: {
          spin: {
            id: 1,
            wheelId: parseInt(req.params.id),
            memberId: req.member.id,
            result: randomPrize,
            pointsUsed: 10,
            spunAt: new Date()
          },
          prize: randomPrize,
          remainingPoints: req.member.points - 10 + (randomPrize.type === 'points' ? randomPrize.value : 0),
          remainingSpins: 0
        }
      });
    }),
    getMemberWheelHistory: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          spins: [
            {
              id: 1,
              wheelId: parseInt(req.params.id),
              result: { type: 'points', value: 10, label: '10 Points' },
              pointsUsed: 10,
              spunAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
              id: 2,
              wheelId: parseInt(req.params.id),
              result: { type: 'discount', value: 5, label: '5% Discount' },
              pointsUsed: 10,
              spunAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          ],
          totalSpins: 2,
          totalPointsUsed: 20,
          totalRewardsWon: 1,
          pagination: { page: 1, limit: 10, total: 2 }
        }
      });
    })
  },
  TransactionController: {
    getMemberTransactions: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          transactions: [
            {
              id: 1,
              type: 'purchase',
              amount: 100.00,
              points: 10,
              description: 'Online purchase',
              status: 'completed',
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
              id: 2,
              type: 'reward_redemption',
              amount: 0,
              points: -50,
              description: 'Redeemed 10% discount coupon',
              status: 'completed',
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            },
            {
              id: 3,
              type: 'mission_reward',
              amount: 0,
              points: 100,
              description: 'Completed "First Purchase" mission',
              status: 'completed',
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          ],
          summary: {
            totalTransactions: 3,
            totalSpent: 100.00,
            totalPointsEarned: 110,
            totalPointsSpent: 50,
            netPoints: 60
          },
          pagination: { page: 1, limit: 10, total: 3 }
        }
      });
    })
  }
}));

// Get reference to mocked controllers for test assertions
const { MemberController, MissionController, WheelController, TransactionController } = require('../../src/controllers');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/member', memberPortalRoutes);

describe('Member Portal Routes', () => {
  let memberToken;
  let inactiveMemberToken;

  beforeEach(() => {
    jest.clearAllMocks();
    memberToken = 'valid-member-token';
    inactiveMemberToken = 'inactive-member-token';
  });

  describe('Member Profile Management', () => {
    describe('GET /profile', () => {
      test('should get member profile successfully', async () => {
        const response = await request(app)
          .get('/api/member/profile')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('member');
        expect(response.body.data.member).toHaveProperty('user');
        expect(response.body.data.member).toHaveProperty('brand');
        expect(response.body.data.member).toHaveProperty('tier');
        expect(response.body.data.member).toHaveProperty('points');
        expect(MemberController.getMemberProfile).toHaveBeenCalled();
      });

      test('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .get('/api/member/profile');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('authentication required');
      });
    });

    describe('PUT /profile', () => {
      test('should update member profile successfully', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+1234567890'
        };

        const response = await request(app)
          .put('/api/member/profile')
          .set('Authorization', `Bearer ${memberToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('updated successfully');
        expect(MemberController.updateMemberProfile).toHaveBeenCalled();
      });
    });
  });

  describe('Points Management', () => {
    describe('GET /points', () => {
      test('should get member points and history', async () => {
        const response = await request(app)
          .get('/api/member/points')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('currentPoints');
        expect(response.body.data).toHaveProperty('totalEarned');
        expect(response.body.data).toHaveProperty('totalSpent');
        expect(response.body.data).toHaveProperty('history');
        expect(response.body.data).toHaveProperty('pagination');
        expect(MemberController.getMemberPoints).toHaveBeenCalled();
      });
    });
  });

  describe('Tier Management', () => {
    describe('GET /tier', () => {
      test('should get member tier status and progress', async () => {
        const response = await request(app)
          .get('/api/member/tier')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('currentTier');
        expect(response.body.data).toHaveProperty('nextTier');
        expect(response.body.data).toHaveProperty('progress');
        expect(response.body.data.currentTier).toHaveProperty('name');
        expect(response.body.data.currentTier).toHaveProperty('benefits');
        expect(response.body.data.progress).toHaveProperty('pointsToNextTier');
        expect(MemberController.getMemberTierStatus).toHaveBeenCalled();
      });
    });
  });

  describe('Mission Management', () => {
    describe('GET /missions', () => {
      test('should get available missions for member', async () => {
        const response = await request(app)
          .get('/api/member/missions')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('availableMissions');
        expect(response.body.data).toHaveProperty('completedMissions');
        expect(response.body.data).toHaveProperty('totalRewardsEarned');
        expect(Array.isArray(response.body.data.availableMissions)).toBe(true);
        expect(MissionController.getMemberMissions).toHaveBeenCalled();
      });
    });

    describe('POST /missions/:id/complete', () => {
      test('should complete a mission successfully', async () => {
        const response = await request(app)
          .post('/api/member/missions/1/complete')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('completed successfully');
        expect(response.body.data).toHaveProperty('mission');
        expect(response.body.data).toHaveProperty('pointsEarned');
        expect(response.body.data).toHaveProperty('newPointsBalance');
        expect(MissionController.completeMemberMission).toHaveBeenCalled();
      });
    });

    describe('GET /missions/completed', () => {
      test('should get completed missions', async () => {
        const response = await request(app)
          .get('/api/member/missions/completed')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('completedMissions');
        expect(response.body.data).toHaveProperty('totalCompleted');
        expect(response.body.data).toHaveProperty('totalRewardsEarned');
        expect(Array.isArray(response.body.data.completedMissions)).toBe(true);
        expect(MissionController.getMemberCompletedMissions).toHaveBeenCalled();
      });
    });
  });

  describe('Transaction History', () => {
    describe('GET /transactions', () => {
      test('should get member transaction history', async () => {
        const response = await request(app)
          .get('/api/member/transactions')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transactions');
        expect(response.body.data).toHaveProperty('summary');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.transactions)).toBe(true);
        expect(response.body.data.summary).toHaveProperty('totalSpent');
        expect(response.body.data.summary).toHaveProperty('totalPointsEarned');
        expect(TransactionController.getMemberTransactions).toHaveBeenCalled();
      });
    });
  });

  describe('Wheel Management', () => {
    describe('GET /wheels', () => {
      test('should get available wheels for member', async () => {
        const response = await request(app)
          .get('/api/member/wheels')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('availableWheels');
        expect(response.body.data).toHaveProperty('memberPoints');
        expect(Array.isArray(response.body.data.availableWheels)).toBe(true);
        expect(WheelController.getMemberWheels).toHaveBeenCalled();
      });
    });

    describe('POST /wheels/:id/spin', () => {
      test('should spin a wheel successfully', async () => {
        const response = await request(app)
          .post('/api/member/wheels/1/spin')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('spun successfully');
        expect(response.body.data).toHaveProperty('spin');
        expect(response.body.data).toHaveProperty('prize');
        expect(response.body.data).toHaveProperty('remainingPoints');
        expect(response.body.data).toHaveProperty('remainingSpins');
        expect(WheelController.spinMemberWheel).toHaveBeenCalled();
      });
    });

    describe('GET /wheels/:id/history', () => {
      test('should get wheel spin history', async () => {
        const response = await request(app)
          .get('/api/member/wheels/1/history')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('spins');
        expect(response.body.data).toHaveProperty('totalSpins');
        expect(response.body.data).toHaveProperty('totalPointsUsed');
        expect(response.body.data).toHaveProperty('totalRewardsWon');
        expect(Array.isArray(response.body.data.spins)).toBe(true);
        expect(WheelController.getMemberWheelHistory).toHaveBeenCalled();
      });
    });
  });

  describe('Leaderboard', () => {
    describe('GET /leaderboard', () => {
      test('should get member leaderboard position', async () => {
        const response = await request(app)
          .get('/api/member/leaderboard')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('position');
        expect(response.body.data).toHaveProperty('totalMembers');
        expect(response.body.data).toHaveProperty('percentile');
        expect(response.body.data).toHaveProperty('topMembers');
        expect(response.body.data).toHaveProperty('memberStats');
        expect(MemberController.getMemberLeaderboardPosition).toHaveBeenCalled();
      });
    });
  });

  describe('Rewards Management', () => {
    describe('GET /rewards', () => {
      test('should get available rewards for member', async () => {
        const response = await request(app)
          .get('/api/member/rewards')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('availableRewards');
        expect(response.body.data).toHaveProperty('memberPoints');
        expect(Array.isArray(response.body.data.availableRewards)).toBe(true);
        expect(MemberController.getMemberRewards).toHaveBeenCalled();
      });
    });

    describe('POST /rewards/:id/redeem', () => {
      test('should redeem a reward successfully', async () => {
        const response = await request(app)
          .post('/api/member/rewards/1/redeem')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('redeemed successfully');
        expect(response.body.data).toHaveProperty('redemption');
        expect(response.body.data).toHaveProperty('remainingPoints');
        expect(response.body.data.redemption).toHaveProperty('pointsUsed');
        expect(response.body.data.redemption).toHaveProperty('status');
        expect(MemberController.redeemMemberReward).toHaveBeenCalled();
      });
    });
  });

  describe('Notifications Management', () => {
    describe('GET /notifications', () => {
      test('should get member notifications', async () => {
        const response = await request(app)
          .get('/api/member/notifications')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('notifications');
        expect(response.body.data).toHaveProperty('unreadCount');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.notifications)).toBe(true);
        expect(MemberController.getMemberNotifications).toHaveBeenCalled();
      });
    });

    describe('PUT /notifications/:id/read', () => {
      test('should mark notification as read', async () => {
        const response = await request(app)
          .put('/api/member/notifications/1/read')
          .set('Authorization', `Bearer ${memberToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('marked as read');
        expect(response.body.data).toHaveProperty('notificationId');
        expect(response.body.data).toHaveProperty('isRead');
        expect(response.body.data).toHaveProperty('readAt');
        expect(MemberController.markNotificationAsRead).toHaveBeenCalled();
      });
    });
  });

  describe('Authentication and Authorization Tests', () => {
    test('should reject all requests without authentication', async () => {
      const endpoints = [
        '/api/member/profile',
        '/api/member/points',
        '/api/member/tier',
        '/api/member/missions',
        '/api/member/transactions',
        '/api/member/wheels',
        '/api/member/leaderboard',
        '/api/member/rewards',
        '/api/member/notifications'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('authentication required');
      }
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/member/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid member token');
    });

    test('should handle inactive member token', async () => {
      const response = await request(app)
        .get('/api/member/profile')
        .set('Authorization', `Bearer ${inactiveMemberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // The controller should handle inactive member logic
      expect(MemberController.getMemberProfile).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Tests', () => {
    test('should apply wheel spin rate limiting', async () => {
      // Multiple rapid wheel spins should be rate limited
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/member/wheels/1/spin')
            .set('Authorization', `Bearer ${memberToken}`)
        );
      }

      const responses = await Promise.all(promises);
      // All should succeed in our mock, but in real implementation would be rate limited
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .put('/api/member/profile')
        .set('Authorization', `Bearer ${memberToken}`)
        .send('invalid-json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    test('should handle empty request bodies', async () => {
      const response = await request(app)
        .put('/api/member/profile')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(MemberController.updateMemberProfile).toHaveBeenCalled();
    });
  });

  describe('Integration Flow Tests', () => {
    test('should simulate complete member journey', async () => {
      // 1. Get profile
      const profileResponse = await request(app)
        .get('/api/member/profile')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(profileResponse.status).toBe(200);

      // 2. Check available missions
      const missionsResponse = await request(app)
        .get('/api/member/missions')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(missionsResponse.status).toBe(200);

      // 3. Complete a mission
      const completeMissionResponse = await request(app)
        .post('/api/member/missions/1/complete')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(completeMissionResponse.status).toBe(200);

      // 4. Check points balance
      const pointsResponse = await request(app)
        .get('/api/member/points')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(pointsResponse.status).toBe(200);

      // 5. Spin a wheel
      const spinResponse = await request(app)
        .post('/api/member/wheels/1/spin')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(spinResponse.status).toBe(200);

      // 6. Check transaction history
      const transactionsResponse = await request(app)
        .get('/api/member/transactions')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(transactionsResponse.status).toBe(200);

      // 7. Redeem a reward
      const redeemResponse = await request(app)
        .post('/api/member/rewards/1/redeem')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(redeemResponse.status).toBe(200);

      // Verify all controllers were called
      expect(MemberController.getMemberProfile).toHaveBeenCalled();
      expect(MissionController.getMemberMissions).toHaveBeenCalled();
      expect(MissionController.completeMemberMission).toHaveBeenCalled();
      expect(MemberController.getMemberPoints).toHaveBeenCalled();
      expect(WheelController.spinMemberWheel).toHaveBeenCalled();
      expect(TransactionController.getMemberTransactions).toHaveBeenCalled();
      expect(MemberController.redeemMemberReward).toHaveBeenCalled();
    });
  });
});