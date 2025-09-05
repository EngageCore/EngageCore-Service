/**
 * Mission Controller
 * Handles mission-related HTTP requests
 */

const { MissionService } = require('../services');
const { response, logger } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');

class MissionController {
  constructor() {
    this.missionService = new MissionService();
  }

  /**
   * Create a new mission
   * POST /api/brands/:brandId/missions
   */
  createMission = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const missionData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const mission = await this.missionService.createMission(missionData, brandId, userId, context);

    logger.info('Mission created successfully', {
      missionId: mission.id,
      missionName: mission.name,
      brandId,
      createdBy: userId
    });

    return response.success(res, {
      message: 'Mission created successfully',
      data: { mission }
    }, 201);
  });

  /**
   * Get mission by ID
   * GET /api/brands/:brandId/missions/:id
   */
  getMissionById = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;

    const mission = await this.missionService.getMissionById(id, brandId);

    return response.success(res, {
      message: 'Mission retrieved successfully',
      data: { mission }
    });
  });

  /**
   * Update mission
   * PUT /api/brands/:brandId/missions/:id
   */
  updateMission = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const mission = await this.missionService.updateMission(id, updateData, brandId, userId, context);

    logger.info('Mission updated successfully', {
      missionId: id,
      brandId,
      updatedBy: userId
    });

    return response.success(res, {
      message: 'Mission updated successfully',
      data: { mission }
    });
  });

  /**
   * List missions with pagination and filtering
   * GET /api/brands/:brandId/missions
   */
  listMissions = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const result = await this.missionService.listMissions(options, brandId);

    return response.success(res, {
      message: 'Missions retrieved successfully',
      data: result
    });
  });

  /**
   * Delete mission
   * DELETE /api/brands/:brandId/missions/:id
   */
  deleteMission = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.missionService.deleteMission(id, brandId, userId, context);

    logger.info('Mission deleted successfully', {
      missionId: id,
      brandId,
      deletedBy: userId
    });

    return response.success(res, {
      message: 'Mission deleted successfully'
    });
  });

  /**
   * Complete mission for member
   * POST /api/brands/:brandId/missions/:id/complete
   */
  completeMission = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { member_id, ...completionData } = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!member_id) {
      return response.error(res, 'Member ID is required', 400);
    }

    const result = await this.missionService.completeMission(id, member_id, completionData, brandId, context);

    logger.info('Mission completed successfully', {
      missionId: id,
      memberId: member_id,
      reward: result.completion.mission?.reward_points || 0,
      brandId
    });

    return response.success(res, {
      message: 'Mission completed successfully',
      data: result
    });
  });

  /**
   * Get member missions (assigned and available)
   * GET /api/brands/:brandId/members/:memberId/missions
   */
  getMemberMissions = asyncHandler(async (req, res) => {
    const { brandId, memberId } = req.params;
    const options = req.query;

    const result = await this.missionService.getMemberMissions(memberId, options, brandId);

    return response.success(res, {
      message: 'Member missions retrieved successfully',
      data: result
    });
  });

  /**
   * Get mission completions
   * GET /api/brands/:brandId/missions/:id/completions
   */
  getMissionCompletions = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const options = req.query;

    const result = await this.missionService.getMissionCompletions(id, options, brandId);

    return response.success(res, {
      message: 'Mission completions retrieved successfully',
      data: result
    });
  });

  /**
   * Get member mission completions
   * GET /api/brands/:brandId/members/:memberId/mission-completions
   */
  getMemberMissionCompletions = asyncHandler(async (req, res) => {
    const { brandId, memberId } = req.params;
    const options = req.query;

    const result = await this.missionService.getMemberMissionCompletions(memberId, options, brandId);

    return response.success(res, {
      message: 'Member mission completions retrieved successfully',
      data: result
    });
  });

  /**
   * Claim mission reward
   * POST /api/brands/:brandId/missions/:id/claim-reward
   */
  claimMissionReward = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { member_id } = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!member_id) {
      return response.error(res, 'Member ID is required', 400);
    }

    // This would typically handle reward claiming logic
    // For now, we'll return a success response
    logger.info('Mission reward claimed', {
      missionId: id,
      memberId: member_id,
      brandId
    });

    return response.success(res, {
      message: 'Mission reward claimed successfully',
      data: {
        claimed: true,
        claimed_at: new Date()
      }
    });
  });

  /**
   * Get mission statistics
   * GET /api/brands/:brandId/missions/:id/statistics
   */
  getMissionStatistics = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const options = req.query;

    const statistics = await this.missionService.getMissionStatistics(id, options, brandId);

    return response.success(res, {
      message: 'Mission statistics retrieved successfully',
      data: { statistics }
    });
  });

  /**
   * Get brand mission statistics
   * GET /api/brands/:brandId/missions/statistics
   */
  getBrandMissionStatistics = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const statistics = await this.missionService.getBrandMissionStatistics(brandId, options);

    return response.success(res, {
      message: 'Brand mission statistics retrieved successfully',
      data: { statistics }
    });
  });

  /**
   * Get top performing missions
   * GET /api/brands/:brandId/missions/top-performing
   */
  getTopPerformingMissions = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { limit = 10, period = 'month' } = req.query;

    // This would typically get top performing missions
    // For now, we'll return mock data
    const topMissions = [
      {
        id: '1',
        name: 'Daily Check-in',
        type: 'daily',
        completion_rate: 85.5,
        total_completions: 1250,
        total_rewards_given: 62500,
        average_completion_time: '2 minutes'
      },
      {
        id: '2',
        name: 'Profile Completion',
        type: 'one_time',
        completion_rate: 72.3,
        total_completions: 890,
        total_rewards_given: 89000,
        average_completion_time: '5 minutes'
      }
    ];

    return response.success(res, {
      message: 'Top performing missions retrieved successfully',
      data: { 
        missions: topMissions,
        period,
        generated_at: new Date()
      }
    });
  });

  /**
   * Check mission eligibility for member
   * GET /api/brands/:brandId/missions/:id/eligibility/:memberId
   */
  checkMissionEligibility = asyncHandler(async (req, res) => {
    const { brandId, id, memberId } = req.params;

    const eligibility = await this.missionService.checkMissionEligibility(id, memberId, brandId);

    return response.success(res, {
      message: 'Mission eligibility checked',
      data: { eligibility }
    });
  });

  /**
   * Bulk create missions
   * POST /api/brands/:brandId/missions/bulk
   */
  bulkCreateMissions = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { missions } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!missions || !Array.isArray(missions)) {
      return response.error(res, 'Missions array is required', 400);
    }

    const results = await this.missionService.bulkCreateMissions(missions, brandId, userId, context);

    logger.info('Bulk mission creation completed', {
      brandId,
      results,
      createdBy: userId
    });

    return response.success(res, {
      message: 'Bulk mission creation completed',
      data: { results }
    });
  });

  /**
   * Assign mission to specific member
   * POST /api/brands/:brandId/missions/:id/assign
   */
  assignMissionToMember = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { member_id } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!member_id) {
      return response.error(res, 'Member ID is required', 400);
    }

    await this.missionService.assignMissionToMember(id, member_id, brandId, userId, context);

    logger.info('Mission assigned to member successfully', {
      missionId: id,
      memberId: member_id,
      brandId,
      assignedBy: userId
    });

    return response.success(res, {
      message: 'Mission assigned to member successfully',
      data: {
        assigned: true,
        assigned_at: new Date()
      }
    });
  });

  /**
   * Get mission dashboard data
   * GET /api/brands/:brandId/missions/:id/dashboard
   */
  getMissionDashboard = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const options = req.query;

    const [mission, statistics, recentCompletions] = await Promise.all([
      this.missionService.getMissionById(id, brandId),
      this.missionService.getMissionStatistics(id, options, brandId),
      this.missionService.getMissionCompletions(id, { limit: 10 }, brandId)
    ]);

    const dashboard = {
      mission: {
        id: mission.id,
        name: mission.name,
        description: mission.description,
        type: mission.type,
        status: mission.status,
        reward_points: mission.reward_points,
        target_value: mission.target_value,
        repeatable: mission.repeatable
      },
      statistics,
      recent_completions: recentCompletions.completions,
      summary: {
        total_completions: statistics.total_completions || 0,
        completion_rate: statistics.completion_rate || 0,
        total_rewards_given: statistics.total_rewards || 0,
        average_completion_time: statistics.average_completion_time || 0
      },
      last_updated: new Date()
    };

    return response.success(res, {
      message: 'Mission dashboard data retrieved successfully',
      data: { dashboard }
    });
  });

  /**
   * Clone mission
   * POST /api/brands/:brandId/missions/:id/clone
   */
  cloneMission = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Get original mission
    const originalMission = await this.missionService.getMissionById(id, brandId);

    // Create cloned mission data
    const clonedMissionData = {
      name: name || `${originalMission.name} (Copy)`,
      description: description || originalMission.description,
      type: originalMission.type,
      target_value: originalMission.target_value,
      reward_points: originalMission.reward_points,
      conditions: originalMission.conditions,
      start_date: originalMission.start_date,
      end_date: originalMission.end_date,
      repeatable: originalMission.repeatable,
      auto_assign: originalMission.auto_assign,
      required_tier_id: originalMission.required_tier_id,
      min_points_required: originalMission.min_points_required,
      status: 'inactive' // Start as inactive
    };

    const clonedMission = await this.missionService.createMission(clonedMissionData, brandId, userId, context);

    logger.info('Mission cloned successfully', {
      originalMissionId: id,
      clonedMissionId: clonedMission.id,
      brandId,
      clonedBy: userId
    });

    return response.success(res, {
      message: 'Mission cloned successfully',
      data: { mission: clonedMission }
    }, 201);
  });

  /**
   * Activate mission
   * POST /api/brands/:brandId/missions/:id/activate
   */
  activateMission = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const mission = await this.missionService.updateMission(id, { status: 'active' }, brandId, userId, context);

    logger.info('Mission activated successfully', {
      missionId: id,
      brandId,
      activatedBy: userId
    });

    return response.success(res, {
      message: 'Mission activated successfully',
      data: { mission }
    });
  });

  /**
   * Deactivate mission
   * POST /api/brands/:brandId/missions/:id/deactivate
   */
  deactivateMission = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const mission = await this.missionService.updateMission(id, { status: 'inactive' }, brandId, userId, context);

    logger.info('Mission deactivated successfully', {
      missionId: id,
      brandId,
      deactivatedBy: userId
    });

    return response.success(res, {
      message: 'Mission deactivated successfully',
      data: { mission }
    });
  });

  /**
   * Export mission data
   * GET /api/brands/:brandId/missions/:id/export
   */
  exportMissionData = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { format = 'json', include_completions = false } = req.query;

    const mission = await this.missionService.getMissionById(id, brandId);
    
    const exportData = {
      mission: {
        id: mission.id,
        name: mission.name,
        description: mission.description,
        type: mission.type,
        target_value: mission.target_value,
        reward_points: mission.reward_points,
        conditions: mission.conditions,
        status: mission.status,
        repeatable: mission.repeatable,
        created_at: mission.created_at
      },
      export_info: {
        exported_at: new Date(),
        format,
        include_completions
      }
    };

    if (include_completions) {
      const completions = await this.missionService.getMissionCompletions(id, { limit: 1000 }, brandId);
      exportData.completions = completions.completions;
    }

    logger.info('Mission data exported', {
      missionId: id,
      brandId,
      format,
      includeCompletions: include_completions
    });

    return response.success(res, {
      message: 'Mission data exported successfully',
      data: exportData
    });
  });

  // =============================================================================
  // MEMBER PORTAL SPECIFIC METHODS
  // =============================================================================

  /**
   * Get available missions for member (member portal)
   * GET /api/member/missions
   */
  getMemberMissions = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id;
    const brandId = req.user.brand_id;
    const options = req.query;

    const result = await this.missionService.getMemberMissions(memberId, options, brandId);

    return response.success(res, {
      message: 'Available missions retrieved successfully',
      data: result
    });
  });

  /**
   * Complete a mission (member portal)
   * POST /api/member/missions/:id/complete
   */
  completeMemberMission = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id;
    const brandId = req.user.brand_id;
    const { id } = req.params;
    const completionData = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await this.missionService.completeMission(id, memberId, completionData, brandId, context);

    logger.info('Mission completed by member', {
      missionId: id,
      memberId,
      reward: result.completion.mission?.reward_points || 0,
      brandId
    });

    return response.success(res, {
      message: 'Mission completed successfully',
      data: {
        completion: result.completion,
        rewards_earned: result.completion.mission?.reward_points || 0,
        completed_at: new Date()
      }
    });
  });

  /**
   * Get member's completed missions (member portal)
   * GET /api/member/missions/completed
   */
  getMemberCompletedMissions = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id;
    const brandId = req.user.brand_id;
    const options = req.query;

    const result = await this.missionService.getMemberMissionCompletions(memberId, options, brandId);

    return response.success(res, {
      message: 'Completed missions retrieved successfully',
      data: result
    });
  });
}

module.exports = new MissionController();