/**
 * Mission Routes
 * Handles mission-related API endpoints
 */

const express = require('express');
const { MissionController } = require('../controllers');
const { auth, validation, rateLimit, brandContext } = require('../middleware');
const { missionValidators } = require('../validators');

const router = express.Router({ mergeParams: true }); // mergeParams to access brandId from parent router

/**
 * @route   POST /api/brands/:brandId/missions
 * @desc    Create a new mission
 * @access  Private (Brand Admin)
 */
router.post('/',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.createMissionSchema),
  MissionController.createMission
);

/**
 * @route   GET /api/brands/:brandId/missions
 * @desc    List missions with pagination and filtering
 * @access  Private (Brand Admin)
 */
router.get('/',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.listMissionsSchema, 'query'),
  MissionController.listMissions
);

/**
 * @route   POST /api/brands/:brandId/missions/bulk
 * @desc    Bulk create missions
 * @access  Private (Brand Admin)
 */
router.post('/bulk',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.bulkCreateMissionsSchema),
  MissionController.bulkCreateMissions
);

/**
 * @route   GET /api/brands/:brandId/missions/statistics
 * @desc    Get mission statistics
 * @access  Private (Brand Admin)
 */
router.get('/statistics',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.getMissionStatisticsSchema, 'query'),
  MissionController.getMissionStatistics
);

/**
 * @route   GET /api/brands/:brandId/missions/brand-statistics
 * @desc    Get brand mission statistics
 * @access  Private (Brand Admin)
 */
router.get('/brand-statistics',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.getBrandMissionStatisticsSchema, 'query'),
  MissionController.getBrandMissionStatistics
);

/**
 * @route   GET /api/brands/:brandId/missions/top-performing
 * @desc    Get top performing missions
 * @access  Private (Brand Admin)
 */
router.get('/top-performing',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.getTopPerformingMissionsSchema, 'query'),
  MissionController.getTopPerformingMissions
);

/**
 * @route   GET /api/brands/:brandId/missions/dashboard
 * @desc    Get mission dashboard data
 * @access  Private (Brand Admin)
 */
router.get('/dashboard',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  MissionController.getMissionDashboard
);

/**
 * @route   GET /api/brands/:brandId/missions/:id
 * @desc    Get mission by ID
 * @access  Private (Brand Admin)
 */
router.get('/:id',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.getMissionSchema),
  MissionController.getMissionById
);

/**
 * @route   PUT /api/brands/:brandId/missions/:id
 * @desc    Update mission
 * @access  Private (Brand Admin)
 */
router.put('/:id',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.updateMissionSchema),
  MissionController.updateMission
);

/**
 * @route   DELETE /api/brands/:brandId/missions/:id
 * @desc    Delete mission
 * @access  Private (Brand Admin)
 */
router.delete('/:id',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.deleteMissionSchema),
  MissionController.deleteMission
);

/**
 * @route   POST /api/brands/:brandId/missions/:id/complete
 * @desc    Complete mission for member
 * @access  Public (with brand context and rate limiting)
 */
router.post('/:id/complete',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.completeMissionSchema),
  MissionController.completeMission
);

/**
 * @route   GET /api/brands/:brandId/missions/:id/eligibility/:memberId
 * @desc    Check mission eligibility for member
 * @access  Public (with brand context)
 */
router.get('/:id/eligibility/:memberId',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.checkMissionEligibilitySchema),
  MissionController.checkMissionEligibility
);

/**
 * @route   GET /api/brands/:brandId/missions/:id/completions
 * @desc    Get mission completions
 * @access  Private (Brand Admin)
 */
router.get('/:id/completions',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.getMissionCompletionsSchema, 'query'),
  MissionController.getMissionCompletions
);

/**
 * @route   POST /api/brands/:brandId/missions/:id/assign/:memberId
 * @desc    Assign mission to member
 * @access  Private (Brand Admin)
 */
router.post('/:id/assign/:memberId',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.assignMissionToMemberSchema),
  MissionController.assignMissionToMember
);

/**
 * @route   POST /api/brands/:brandId/missions/:id/clone
 * @desc    Clone mission
 * @access  Private (Brand Admin)
 */
router.post('/:id/clone',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  MissionController.cloneMission
);

/**
 * @route   POST /api/brands/:brandId/missions/:id/activate
 * @desc    Activate mission
 * @access  Private (Brand Admin)
 */
router.post('/:id/activate',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  MissionController.activateMission
);

/**
 * @route   POST /api/brands/:brandId/missions/:id/deactivate
 * @desc    Deactivate mission
 * @access  Private (Brand Admin)
 */
router.post('/:id/deactivate',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  MissionController.deactivateMission
);

/**
 * @route   GET /api/brands/:brandId/missions/:id/export
 * @desc    Export mission data
 * @access  Private (Brand Admin)
 */
router.get('/:id/export',
  auth.authenticate,
  brandContext.validateBrandAccess,
  auth.authorize(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  MissionController.exportMissionData
);

/**
 * @route   GET /api/brands/:brandId/members/:memberId/missions
 * @desc    Get member missions
 * @access  Public (with brand context)
 */
router.get('/members/:memberId/missions',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.getMemberMissionsSchema, 'query'),
  MissionController.getMemberMissions
);

/**
 * @route   GET /api/brands/:brandId/members/:memberId/mission-completions
 * @desc    Get member mission completions
 * @access  Public (with brand context)
 */
router.get('/members/:memberId/mission-completions',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.getMemberMissionCompletionsSchema, 'query'),
  MissionController.getMemberMissionCompletions
);

/**
 * @route   POST /api/brands/:brandId/missions/:id/claim-reward
 * @desc    Claim mission reward
 * @access  Public (with brand context and rate limiting)
 */
router.post('/:id/claim-reward',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  validation.validate(missionValidators.claimMissionRewardSchema),
  MissionController.claimMissionReward
);

module.exports = router;