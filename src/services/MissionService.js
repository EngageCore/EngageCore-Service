/**
 * Mission Service
 * Handles mission management business logic
 */

const { MissionRepository, MissionCompletionRepository, MemberRepository, TransactionRepository, AuditLogRepository } = require('../repositories');
const { logger, constants } = require('../utils');
const { errorHandler } = require('../middleware');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = errorHandler;
const { AUDIT_ACTIONS, TRANSACTION_TYPES, MISSION_TYPES, MISSION_STATUS, COMPLETION_STATUS } = constants;

class MissionService {
  constructor() {
    this.missionRepository = new MissionRepository();
    this.missionCompletionRepository = new MissionCompletionRepository();
    this.memberRepository = new MemberRepository();
    this.transactionRepository = new TransactionRepository();
    this.auditLogRepository = new AuditLogRepository();
  }

  /**
   * Create a new mission
   * @param {object} missionData - Mission creation data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID creating the mission
   * @param {object} context - Request context
   * @returns {object} - Created mission
   */
  async createMission(missionData, brandId, userId, context = {}) {
    try {
      // Validate mission data
      this.validateMissionData(missionData);

      // Create mission
      const mission = await this.missionRepository.create({
        ...missionData,
        brand_id: brandId,
        status: missionData.status || MISSION_STATUS.ACTIVE,
        created_by: userId
      });

      // Auto-assign to eligible members if enabled
      if (missionData.auto_assign) {
        await this.autoAssignMission(mission.id, brandId);
      }

      // Log mission creation
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.MISSION_CREATE,
        description: 'Mission created successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          missionName: mission.name,
          missionType: mission.type,
          reward: mission.reward_points
        }
      });

      logger.logBusiness('Mission created', {
        missionId: mission.id,
        missionName: mission.name,
        brandId,
        createdBy: userId
      });

      return mission;
    } catch (error) {
      logger.error('Mission creation failed', {
        error: error.message,
        missionData,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Get mission by ID
   * @param {string} missionId - Mission ID
   * @param {string} brandId - Brand ID
   * @returns {object} - Mission data
   */
  async getMissionById(missionId, brandId) {
    try {
      const mission = await this.missionRepository.findById(missionId);
      if (!mission || mission.brand_id !== brandId) {
        throw new NotFoundError('Mission not found');
      }

      return mission;
    } catch (error) {
      logger.error('Get mission failed', {
        error: error.message,
        missionId,
        brandId
      });
      throw error;
    }
  }

  /**
   * Update mission
   * @param {string} missionId - Mission ID
   * @param {object} updateData - Update data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID updating the mission
   * @param {object} context - Request context
   * @returns {object} - Updated mission
   */
  async updateMission(missionId, updateData, brandId, userId, context = {}) {
    try {
      // Check if mission exists
      const existingMission = await this.missionRepository.findById(missionId);
      if (!existingMission || existingMission.brand_id !== brandId) {
        throw new NotFoundError('Mission not found');
      }

      // Validate update data
      if (updateData.type || updateData.target_value || updateData.conditions) {
        this.validateMissionData({ ...existingMission, ...updateData });
      }

      // Update mission
      const updatedMission = await this.missionRepository.update(missionId, updateData);

      // Log mission update
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.MISSION_UPDATE,
        description: 'Mission updated successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          missionName: updatedMission.name,
          updatedFields: Object.keys(updateData)
        }
      });

      logger.logBusiness('Mission updated', {
        missionId,
        missionName: updatedMission.name,
        updatedFields: Object.keys(updateData),
        updatedBy: userId
      });

      return updatedMission;
    } catch (error) {
      logger.error('Mission update failed', {
        error: error.message,
        missionId,
        updateData,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * List missions with pagination and filtering
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Paginated missions list
   */
  async listMissions(options = {}, brandId) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        type,
        status,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        type,
        status,
        sort_by,
        sort_order,
        brand_id: brandId
      };

      const result = await this.missionRepository.findMany(queryOptions);

      return {
        missions: result.missions,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('List missions failed', {
        error: error.message,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Delete mission
   * @param {string} missionId - Mission ID
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID deleting the mission
   * @param {object} context - Request context
   */
  async deleteMission(missionId, brandId, userId, context = {}) {
    try {
      // Check if mission exists
      const existingMission = await this.missionRepository.findById(missionId);
      if (!existingMission || existingMission.brand_id !== brandId) {
        throw new NotFoundError('Mission not found');
      }

      // Check if mission has completions
      const hasCompletions = await this.missionCompletionRepository.missionHasCompletions(missionId);
      if (hasCompletions) {
        throw new ValidationError('Cannot delete mission with completion history. Please deactivate instead.');
      }

      // Delete mission
      await this.missionRepository.delete(missionId);

      // Log mission deletion
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.MISSION_DELETE,
        description: 'Mission deleted successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          missionName: existingMission.name
        }
      });

      logger.logBusiness('Mission deleted', {
        missionId,
        missionName: existingMission.name,
        deletedBy: userId
      });
    } catch (error) {
      logger.error('Mission deletion failed', {
        error: error.message,
        missionId,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Complete mission for member
   * @param {string} missionId - Mission ID
   * @param {string} memberId - Member ID
   * @param {object} completionData - Completion data
   * @param {string} brandId - Brand ID
   * @param {object} context - Request context
   * @returns {object} - Completion result
   */
  async completeMission(missionId, memberId, completionData, brandId, context = {}) {
    try {
      // Check if mission exists and is active
      const mission = await this.missionRepository.findById(missionId);
      if (!mission || mission.brand_id !== brandId) {
        throw new NotFoundError('Mission not found');
      }

      if (mission.status !== MISSION_STATUS.ACTIVE) {
        throw new ValidationError('Mission is not active');
      }

      // Check if mission is within active dates
      const now = new Date();
      if (mission.start_date && now < new Date(mission.start_date)) {
        throw new ValidationError('Mission is not yet available');
      }
      if (mission.end_date && now > new Date(mission.end_date)) {
        throw new ValidationError('Mission is no longer available');
      }

      // Check if member exists
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      // Check if member has already completed this mission
      const existingCompletion = await this.missionCompletionRepository.findByMissionAndMember(missionId, memberId);
      if (existingCompletion && !mission.repeatable) {
        throw new ValidationError('Mission has already been completed');
      }

      // Check mission eligibility
      const eligibility = await this.checkMissionEligibility(missionId, memberId, brandId);
      if (!eligibility.eligible) {
        throw new ValidationError(eligibility.reason);
      }

      // Validate completion data based on mission type
      this.validateCompletionData(mission, completionData);

      // Create completion record
      const completion = await this.missionCompletionRepository.create({
        mission_id: missionId,
        member_id: memberId,
        brand_id: brandId,
        status: COMPLETION_STATUS.COMPLETED,
        progress: completionData.progress || mission.target_value,
        completion_data: completionData.data || {},
        completed_at: new Date()
      });

      // Award points if mission has reward
      let transaction = null;
      if (mission.reward_points > 0) {
        transaction = await this.transactionRepository.create({
          member_id: memberId,
          brand_id: brandId,
          type: TRANSACTION_TYPES.CREDIT,
          amount: mission.reward_points,
          description: `Mission completion reward: ${mission.name}`,
          reference_type: 'mission_completion',
          reference_id: completion.id
        });

        // Update member points
        await this.memberRepository.updatePoints(memberId, {
          points_balance: member.points_balance + mission.reward_points,
          total_points_earned: member.total_points_earned + mission.reward_points
        });
      }

      // Log mission completion
      await this.auditLogRepository.logUserAction({
        user_id: null,
        brand_id: brandId,
        action: AUDIT_ACTIONS.MISSION_COMPLETE,
        description: 'Mission completed successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          missionName: mission.name,
          memberId: member.member_id,
          reward: mission.reward_points,
          completionId: completion.id
        }
      });

      logger.logBusiness('Mission completed', {
        missionId,
        missionName: mission.name,
        memberId,
        memberIdString: member.member_id,
        reward: mission.reward_points,
        completionId: completion.id
      });

      return {
        completion,
        transaction,
        member: {
          id: member.id,
          member_id: member.member_id,
          points_balance: member.points_balance + (mission.reward_points || 0)
        }
      };
    } catch (error) {
      logger.error('Mission completion failed', {
        error: error.message,
        missionId,
        memberId,
        completionData,
        brandId,
        context
      });
      throw error;
    }
  }

  /**
   * Get member missions (assigned and available)
   * @param {string} memberId - Member ID
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Member missions
   */
  async getMemberMissions(memberId, options = {}, brandId) {
    try {
      // Check if member exists
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      const {
        page = 1,
        limit = 10,
        status = 'active',
        completed = false
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        member_id: memberId,
        brand_id: brandId,
        status,
        completed
      };

      const result = await this.missionRepository.findMemberMissions(queryOptions);

      return {
        missions: result.missions,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Get member missions failed', {
        error: error.message,
        memberId,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get mission completions
   * @param {string} missionId - Mission ID
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Mission completions
   */
  async getMissionCompletions(missionId, options = {}, brandId) {
    try {
      // Check if mission exists
      const mission = await this.missionRepository.findById(missionId);
      if (!mission || mission.brand_id !== brandId) {
        throw new NotFoundError('Mission not found');
      }

      const {
        page = 1,
        limit = 10,
        start_date,
        end_date,
        sort_by = 'completed_at',
        sort_order = 'desc'
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        mission_id: missionId,
        start_date,
        end_date,
        sort_by,
        sort_order
      };

      const result = await this.missionCompletionRepository.findMany(queryOptions);

      return {
        completions: result.completions,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Get mission completions failed', {
        error: error.message,
        missionId,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get member mission completions
   * @param {string} memberId - Member ID
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Member mission completions
   */
  async getMemberMissionCompletions(memberId, options = {}, brandId) {
    try {
      // Check if member exists
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      const {
        page = 1,
        limit = 10,
        mission_id,
        start_date,
        end_date,
        sort_by = 'completed_at',
        sort_order = 'desc'
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        member_id: memberId,
        mission_id,
        start_date,
        end_date,
        sort_by,
        sort_order
      };

      const result = await this.missionCompletionRepository.findMany(queryOptions);

      return {
        completions: result.completions,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Get member mission completions failed', {
        error: error.message,
        memberId,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get mission statistics
   * @param {string} missionId - Mission ID
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Mission statistics
   */
  async getMissionStatistics(missionId, options = {}, brandId) {
    try {
      // Check if mission exists
      const mission = await this.missionRepository.findById(missionId);
      if (!mission || mission.brand_id !== brandId) {
        throw new NotFoundError('Mission not found');
      }

      const {
        start_date,
        end_date,
        period = 'day'
      } = options;

      const statistics = await this.missionRepository.getStatistics(missionId, {
        start_date,
        end_date,
        period
      });

      return statistics;
    } catch (error) {
      logger.error('Get mission statistics failed', {
        error: error.message,
        missionId,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get brand mission statistics
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Brand mission statistics
   */
  async getBrandMissionStatistics(brandId, options = {}) {
    try {
      const {
        start_date,
        end_date,
        period = 'day'
      } = options;

      const statistics = await this.missionRepository.getBrandStatistics(brandId, {
        start_date,
        end_date,
        period
      });

      return statistics;
    } catch (error) {
      logger.error('Get brand mission statistics failed', {
        error: error.message,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Check mission eligibility for member
   * @param {string} missionId - Mission ID
   * @param {string} memberId - Member ID
   * @param {string} brandId - Brand ID
   * @returns {object} - Eligibility result
   */
  async checkMissionEligibility(missionId, memberId, brandId) {
    try {
      // Get mission and member
      const mission = await this.missionRepository.findById(missionId);
      const member = await this.memberRepository.findById(memberId);

      if (!mission || !member) {
        return { eligible: false, reason: 'Mission or member not found' };
      }

      // Check if mission is active
      if (mission.status !== MISSION_STATUS.ACTIVE) {
        return { eligible: false, reason: 'Mission is not active' };
      }

      // Check date constraints
      const now = new Date();
      if (mission.start_date && now < new Date(mission.start_date)) {
        return { eligible: false, reason: 'Mission is not yet available' };
      }
      if (mission.end_date && now > new Date(mission.end_date)) {
        return { eligible: false, reason: 'Mission is no longer available' };
      }

      // Check if already completed (for non-repeatable missions)
      if (!mission.repeatable) {
        const existingCompletion = await this.missionCompletionRepository.findByMissionAndMember(missionId, memberId);
        if (existingCompletion) {
          return { eligible: false, reason: 'Mission already completed' };
        }
      }

      // Check member tier requirements
      if (mission.required_tier_id && member.tier_id !== mission.required_tier_id) {
        return { eligible: false, reason: 'Member tier requirement not met' };
      }

      // Check minimum points requirement
      if (mission.min_points_required && member.total_points_earned < mission.min_points_required) {
        return { eligible: false, reason: 'Minimum points requirement not met' };
      }

      return { eligible: true };
    } catch (error) {
      logger.error('Mission eligibility check failed', {
        error: error.message,
        missionId,
        memberId,
        brandId
      });
      return { eligible: false, reason: 'Unable to check eligibility' };
    }
  }

  /**
   * Bulk create missions
   * @param {Array} missionsData - Array of mission data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID creating missions
   * @param {object} context - Request context
   * @returns {object} - Creation results
   */
  async bulkCreateMissions(missionsData, brandId, userId, context = {}) {
    try {
      const results = {
        total: missionsData.length,
        created: 0,
        errors: []
      };

      for (let i = 0; i < missionsData.length; i++) {
        try {
          await this.createMission(missionsData[i], brandId, userId, context);
          results.created++;
        } catch (error) {
          results.errors.push({
            index: i,
            error: error.message,
            data: missionsData[i]
          });
        }
      }

      logger.logBusiness('Missions bulk created', {
        brandId,
        results,
        createdBy: userId
      });

      return results;
    } catch (error) {
      logger.error('Bulk mission creation failed', {
        error: error.message,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Assign mission to specific member
   * @param {string} missionId - Mission ID
   * @param {string} memberId - Member ID
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID assigning the mission
   * @param {object} context - Request context
   */
  async assignMissionToMember(missionId, memberId, brandId, userId, context = {}) {
    try {
      // Check if mission and member exist
      const mission = await this.missionRepository.findById(missionId);
      const member = await this.memberRepository.findById(memberId);

      if (!mission || mission.brand_id !== brandId) {
        throw new NotFoundError('Mission not found');
      }
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      // Check eligibility
      const eligibility = await this.checkMissionEligibility(missionId, memberId, brandId);
      if (!eligibility.eligible) {
        throw new ValidationError(eligibility.reason);
      }

      // Create assignment record (this would be in a separate assignments table in a real app)
      // For now, we'll just log the assignment
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.MISSION_UPDATE,
        description: 'Mission assigned to member',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          missionName: mission.name,
          memberId: member.member_id
        }
      });

      logger.logBusiness('Mission assigned', {
        missionId,
        missionName: mission.name,
        memberId,
        memberIdString: member.member_id,
        assignedBy: userId
      });
    } catch (error) {
      logger.error('Mission assignment failed', {
        error: error.message,
        missionId,
        memberId,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Auto-assign mission to eligible members
   * @param {string} missionId - Mission ID
   * @param {string} brandId - Brand ID
   */
  async autoAssignMission(missionId, brandId) {
    try {
      // Get eligible members (this would be more sophisticated in a real app)
      const members = await this.memberRepository.findEligibleMembers(brandId, {
        status: 'active',
        limit: 1000 // Reasonable limit for auto-assignment
      });

      let assignedCount = 0;
      for (const member of members) {
        const eligibility = await this.checkMissionEligibility(missionId, member.id, brandId);
        if (eligibility.eligible) {
          // In a real app, you would create assignment records here
          assignedCount++;
        }
      }

      logger.logBusiness('Mission auto-assigned', {
        missionId,
        brandId,
        assignedCount,
        totalMembers: members.length
      });
    } catch (error) {
      logger.error('Mission auto-assignment failed', {
        error: error.message,
        missionId,
        brandId
      });
      // Don't throw error as this is a background process
    }
  }

  /**
   * Validate mission data
   * @param {object} missionData - Mission data to validate
   */
  validateMissionData(missionData) {
    if (!missionData.name || missionData.name.trim().length === 0) {
      throw new ValidationError('Mission name is required');
    }

    if (!missionData.type || !Object.values(MISSION_TYPES).includes(missionData.type)) {
      throw new ValidationError('Valid mission type is required');
    }

    if (missionData.target_value && missionData.target_value <= 0) {
      throw new ValidationError('Target value must be greater than 0');
    }

    if (missionData.reward_points && missionData.reward_points < 0) {
      throw new ValidationError('Reward points cannot be negative');
    }

    if (missionData.start_date && missionData.end_date) {
      if (new Date(missionData.start_date) >= new Date(missionData.end_date)) {
        throw new ValidationError('End date must be after start date');
      }
    }
  }

  /**
   * Validate completion data based on mission type
   * @param {object} mission - Mission data
   * @param {object} completionData - Completion data
   */
  validateCompletionData(mission, completionData) {
    switch (mission.type) {
      case MISSION_TYPES.POINTS_EARNED:
        if (!completionData.progress || completionData.progress < mission.target_value) {
          throw new ValidationError(`Minimum ${mission.target_value} points required`);
        }
        break;
      case MISSION_TYPES.SPINS_COMPLETED:
        if (!completionData.progress || completionData.progress < mission.target_value) {
          throw new ValidationError(`Minimum ${mission.target_value} spins required`);
        }
        break;
      case MISSION_TYPES.PROFILE_COMPLETION:
        // Validate profile completion percentage
        if (!completionData.data || !completionData.data.profile_completion) {
          throw new ValidationError('Profile completion data required');
        }
        break;
      default:
        // Generic validation for other mission types
        break;
    }
  }
}

module.exports = MissionService;