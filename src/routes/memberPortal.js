/**
 * Member Portal Routes
 * Handles member-facing API endpoints for the member portal
 */

const express = require('express');
const { MemberController, WheelController, MissionController, TransactionController } = require('../controllers');
const { auth, validation, rateLimit, brandContext } = require('../middleware');
const { memberValidators, wheelValidators, missionValidators } = require('../validators');

const router = express.Router();

/**
 * @route   GET /api/member/profile
 * @desc    Get member profile and points
 * @access  Private (Member)
 */
router.get('/profile',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  MemberController.getMemberProfile
);

/**
 * @route   PUT /api/member/profile
 * @desc    Update member profile
 * @access  Private (Member)
 */
router.put('/profile',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.updateMemberProfileSchema),
  MemberController.updateMemberProfile
);

/**
 * @route   GET /api/member/points
 * @desc    Get member points balance and history
 * @access  Private (Member)
 */
router.get('/points',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  MemberController.getMemberPoints
);

/**
 * @route   GET /api/member/tier
 * @desc    Get member tier status and progress
 * @access  Private (Member)
 */
router.get('/tier',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  MemberController.getMemberTierStatus
);

/**
 * @route   GET /api/member/missions
 * @desc    Get available missions for member
 * @access  Private (Member)
 */
router.get('/missions',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.getMemberMissionsSchema, 'query'),
  MissionController.getMemberMissions
);

/**
 * @route   POST /api/member/missions/:id/complete
 * @desc    Complete a mission
 * @access  Private (Member)
 */
router.post('/missions/:id/complete',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.completeMissionSchema),
  MissionController.completeMemberMission
);

/**
 * @route   GET /api/member/missions/completed
 * @desc    Get member's completed missions
 * @access  Private (Member)
 */
router.get('/missions/completed',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.getCompletedMissionsSchema, 'query'),
  MissionController.getMemberCompletedMissions
);

/**
 * @route   GET /api/member/transactions
 * @desc    Get member transaction history
 * @access  Private (Member)
 */
router.get('/transactions',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.getMemberTransactionsSchema, 'query'),
  TransactionController.getMemberTransactions
);

/**
 * @route   GET /api/member/wheels
 * @desc    Get available wheels for member
 * @access  Private (Member)
 */
router.get('/wheels',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  WheelController.getMemberWheels
);

/**
 * @route   POST /api/member/wheels/:id/spin
 * @desc    Spin a wheel
 * @access  Private (Member)
 */
router.post('/wheels/:id/spin',
  auth.authenticateMember,
  rateLimit.wheelSpinRateLimit,
  validation.validate(wheelValidators.spinWheelSchema),
  WheelController.spinMemberWheel
);

/**
 * @route   GET /api/member/wheels/:id/history
 * @desc    Get member's wheel spin history
 * @access  Private (Member)
 */
router.get('/wheels/:id/history',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  validation.validate(wheelValidators.getWheelHistorySchema, 'query'),
  WheelController.getMemberWheelHistory
);

/**
 * @route   GET /api/member/leaderboard
 * @desc    Get member leaderboard position
 * @access  Private (Member)
 */
router.get('/leaderboard',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  MemberController.getMemberLeaderboardPosition
);

/**
 * @route   GET /api/member/rewards
 * @desc    Get available rewards for member
 * @access  Private (Member)
 */
router.get('/rewards',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  MemberController.getMemberRewards
);

/**
 * @route   POST /api/member/rewards/:id/redeem
 * @desc    Redeem a reward
 * @access  Private (Member)
 */
router.post('/rewards/:id/redeem',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.redeemRewardSchema),
  MemberController.redeemMemberReward
);

/**
 * @route   GET /api/member/notifications
 * @desc    Get member notifications
 * @access  Private (Member)
 */
router.get('/notifications',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  validation.validate(memberValidators.getMemberNotificationsSchema, 'query'),
  MemberController.getMemberNotifications
);

/**
 * @route   PUT /api/member/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (Member)
 */
router.put('/notifications/:id/read',
  auth.authenticateMember,
  rateLimit.generalRateLimit,
  MemberController.markNotificationAsRead
);

module.exports = router;