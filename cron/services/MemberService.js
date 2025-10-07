/**
 * Member Service
 * Handles member management business logic
 */

const { MemberRepository, TransactionRepository, AuditLogRepository } = require('../repositories');
const { logger, constants, encryption } = require('../utils');
const { errorHandler } = require('../middleware');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = errorHandler;
const { SERVICE_ERROR_CODES } = require('../enums');
const { AUDIT_ACTIONS, TRANSACTION_TYPES, MEMBER_STATUS } = constants;

class MemberService {
  constructor() {
    this.memberRepository = new MemberRepository();
    this.transactionRepository = new TransactionRepository();
    this.auditLogRepository = new AuditLogRepository();
  }

  /**
   * Create a new member
   * @param {object} memberData - Member creation data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID creating the member
   * @param {object} context - Request context
   * @returns {object} - Created member
   */
  async createMember(memberData, brandId, userId, context = {}) {
    try {
   
      // Get default tier (Bronze) for the brand
      const defaultTiers = await this.memberRepository.getMembershipTiers(brandId, { includeInactive: false });
      const bronzeTier = defaultTiers.find(tier => tier.slug === 'bronze');
      const membershipTierId = memberData.membership_tier_id || (bronzeTier ? bronzeTier.id : null);


      const memberToCreate = {
        user_id: memberData.user_id, 
        brand_id: brandId,
        membership_tier_id: membershipTierId,
        points: memberData.points || 0,
        total_points_earned: memberData.total_points_earned || 0,
        achievements: memberData.achievements || [],
        joined_at: new Date(),
        last_active_at: new Date()
      };

      // Create member
      const member = await this.memberRepository.create(memberToCreate);

      // Create initial points transaction if points were assigned
      if (member.points > 0) {
        await this.transactionRepository.create({
          member_id: member.id,
          brand_id: brandId,
          type: TRANSACTION_TYPES.CREDIT,
          amount: member.points,
          description: 'Initial points balance',
          reference_type: 'member_creation',
          reference_id: member.id,
          created_by: userId
        });
      }

      // Log member creation
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.MEMBER_CREATE,
        description: 'Member created successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          memberId: member.id,
          userId: member.user_id,
          initialPoints: member.points
        }
      });

      logger.logBusiness('Member created', {
        memberId: member.id,
        userId: member.user_id,
        brandId,
        createdBy: userId
      });

      return await this.memberRepository.findById(member.id);
    } catch (error) {
      logger.error('Member creation failed', {
        error: error.message,
        memberData: { ...memberData, password: '[REDACTED]' },
        brandId,
        userId,
        context
      });
      throw error;
    }
  }
  /**
   * Get member by user ID
   * @param {string} userId - User ID (UUID)
   * @param {string} brandId - Brand ID
   * @returns {object} - Member data
   */
  async getMemberByUserId(userId, brandId) {
    try {
      const member = await this.memberRepository.findByUserId(userId, brandId);


      return member;
    } catch (error) {
      logger.error('Get member by user ID failed', {
        error: error.message,
        userId,
        brandId
      });
      throw error;
    }
  }
  /**
   * Update member
   * @param {string} memberId - Member ID
   * @param {object} updateData - Update data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID updating the member
   * @param {object} context - Request context
   * @returns {object} - Updated member
   */
  async updateMember(memberId, updateData, brandId, userId, context = {}) {
    try {
      // Check if member exists
      const existingMember = await this.memberRepository.findById(memberId);
      if (!existingMember || existingMember.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      // Check email availability if email is being updated
      if (updateData.email && updateData.email !== existingMember.email) {
        const isEmailAvailable = await this.memberRepository.isEmailAvailable(updateData.email, brandId, memberId);
        if (!isEmailAvailable) {
          throw new ConflictError('Email address is already in use');
        }
      }

      // Check member ID availability if member_id is being updated
      if (updateData.member_id && updateData.member_id !== existingMember.member_id) {
        const isMemberIdAvailable = await this.memberRepository.isMemberIdAvailable(updateData.member_id, brandId, memberId);
        if (!isMemberIdAvailable) {
          throw new ConflictError('Member ID is already in use');
        }
      }

      // Update member
      const updatedMember = await this.memberRepository.update(memberId, updateData);

      // Log member update
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.MEMBER_UPDATE,
        description: 'Member updated successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          memberId: updatedMember.member_id,
          updatedFields: Object.keys(updateData)
        }
      });

      logger.logBusiness('Member updated', {
        memberId,
        memberIdString: updatedMember.member_id,
        updatedFields: Object.keys(updateData),
        updatedBy: userId
      });

      return await this.memberRepository.findById(memberId);
    } catch (error) {
      logger.error('Member update failed', {
        error: error.message,
        memberId,
        updateData: { ...updateData, password: '[REDACTED]' },
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * List members with pagination and filtering
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Paginated members list
   */
  async listMembers(options = {}, brandId) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        tier_id,
        sort_by = 'created_at',
        sort_order = 'desc',
        date_from,
        date_to
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
        tier_id,
        sort_by,
        sort_order,
        date_from,
        date_to,
        brand_id: brandId
      };

      const result = await this.memberRepository.findMany(queryOptions);

      return {
        members: result.members,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('List members failed', {
        error: error.message,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Delete member
   * @param {string} memberId - Member ID
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID deleting the member
   * @param {object} context - Request context
   */
  async deleteMember(memberId, brandId, userId, context = {}) {
    try {
      // Check if member exists
      const existingMember = await this.memberRepository.findById(memberId);
      if (!existingMember || existingMember.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      // Check if member has transactions or other data
      const hasTransactions = await this.transactionRepository.memberHasTransactions(memberId);
      if (hasTransactions) {
        throw new ValidationError('Cannot delete member with transaction history. Please deactivate instead.');
      }

      // Soft delete the member
      await this.memberRepository.softDelete(memberId);

      // Log member deletion
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.MEMBER_DELETE,
        description: 'Member deleted successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          memberId: existingMember.member_id,
          memberEmail: existingMember.email
        }
      });

      logger.logBusiness('Member deleted', {
        memberId,
        memberIdString: existingMember.member_id,
        deletedBy: userId
      });
    } catch (error) {
      logger.error('Member deletion failed', {
        error: error.message,
        memberId,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Update member points
   * @param {string} memberId - Member ID
   * @param {object} pointsData - Points update data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID updating points
   * @param {object} context - Request context
   * @returns {object} - Updated member with new balance
   */
  async updateMemberPoints(memberId, pointsData, brandId, userId, context = {}) {
    try {
      const { type, amount, description, reference_type, reference_id } = pointsData;

      // Check if member exists
      const existingMember = await this.memberRepository.findById(memberId);
      if (!existingMember || existingMember.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      // Validate amount
      if (amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
      }

      // Check if debit would result in negative balance
      if (type === TRANSACTION_TYPES.DEBIT && existingMember.points_balance < amount) {
        throw new ValidationError('Insufficient points balance');
      }

      // Create transaction
      const transaction = await this.transactionRepository.create({
        member_id: memberId,
        brand_id: brandId,
        type,
        amount,
        description,
        reference_type,
        reference_id,
        created_by: userId
      });

      // Update member points balance
      const newBalance = type === TRANSACTION_TYPES.CREDIT 
        ? existingMember.points_balance + amount
        : existingMember.points_balance - amount;

      const updatedMember = await this.memberRepository.updatePoints(memberId, {
        points_balance: newBalance,
        total_points_earned: type === TRANSACTION_TYPES.CREDIT 
          ? existingMember.total_points_earned + amount
          : existingMember.total_points_earned
      });

      // Check for tier upgrade based on new points total
      const memberWithNewPoints = await this.memberRepository.findById(memberId);
      await this.memberRepository.checkTierUpgrade(memberId, memberWithNewPoints.total_points_earned);

      // Log points update
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.MEMBER_UPDATE,
        description: `Member points ${type}ed`,
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          memberId: existingMember.member_id,
          transactionType: type,
          amount,
          newBalance,
          transactionId: transaction.id
        }
      });

      logger.logBusiness('Member points updated', {
        memberId,
        memberIdString: existingMember.member_id,
        type,
        amount,
        newBalance,
        updatedBy: userId
      });

      return await this.memberRepository.findWithTier(memberId);
    } catch (error) {
      logger.error('Member points update failed', {
        error: error.message,
        memberId,
        pointsData,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Get member statistics
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Member statistics
   */
  async getMemberStatistics(brandId, options = {}) {
    try {
      const {
        start_date,
        end_date,
        period = 'day'
      } = options;

      const statistics = await this.memberRepository.getStatistics(brandId, {
        start_date,
        end_date,
        period
      });

      return statistics;
    } catch (error) {
      logger.error('Get member statistics failed', {
        error: error.message,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Get member transactions
   * @param {string} memberId - Member ID
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Member transactions
   */
  async getMemberTransactions(memberId, options = {}, brandId) {
    try {
      // Check if member exists
      const existingMember = await this.memberRepository.findById(memberId);
      if (!existingMember || existingMember.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      const {
        page = 1,
        limit = 10,
        type,
        start_date,
        end_date,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        member_id: memberId,
        type,
        start_date,
        end_date,
        sort_by,
        sort_order
      };

      const result = await this.transactionRepository.findMany(queryOptions);

      return {
        transactions: result.transactions,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Get member transactions failed', {
        error: error.message,
        memberId,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Check email availability
   * @param {string} email - Email to check
   * @param {string} brandId - Brand ID
   * @param {string} excludeId - Member ID to exclude from check
   * @returns {boolean} - Whether email is available
   */
  async checkEmailAvailability(email, brandId, excludeId = null) {
    try {
      return await this.memberRepository.isEmailAvailable(email, brandId, excludeId);
    } catch (error) {
      logger.error('Email availability check failed', {
        error: error.message,
        email,
        brandId,
        excludeId
      });
      throw error;
    }
  }

  /**
   * Import members from CSV/Excel
   * @param {Array} membersData - Array of member data
   * @param {object} options - Import options
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID importing members
   * @param {object} context - Request context
   * @returns {object} - Import results
   */
  async importMembers(membersData, options = {}, brandId, userId, context = {}) {
    try {
      const { skip_duplicates = true, send_welcome_email = false } = options;
      const results = {
        total: membersData.length,
        created: 0,
        skipped: 0,
        errors: []
      };

      for (let i = 0; i < membersData.length; i++) {
        try {
          const memberData = membersData[i];
          
          // Check for duplicates
          if (skip_duplicates) {
            const existingMember = await this.memberRepository.findByEmail(memberData.email, brandId);
            if (existingMember) {
              results.skipped++;
              continue;
            }
          }

          // Create member
          await this.createMember(memberData, brandId, userId, context);
          results.created++;
        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: error.message,
            data: membersData[i]
          });
        }
      }

      // Log import results
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.MEMBER_CREATE,
        description: 'Members imported',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          importResults: results
        }
      });

      logger.logBusiness('Members imported', {
        brandId,
        results,
        importedBy: userId
      });

      return results;
    } catch (error) {
      logger.error('Member import failed', {
        error: error.message,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Export members data
   * @param {object} options - Export options
   * @param {string} brandId - Brand ID
   * @returns {Array} - Members data for export
   */
  async exportMembers(options = {}, brandId) {
    try {
      const {
        format = 'csv',
        status,
        tier_id,
        date_from,
        date_to,
        fields = ['member_id', 'email', 'first_name', 'last_name', 'points_balance', 'status', 'created_at']
      } = options;

      const queryOptions = {
        brand_id: brandId,
        status,
        tier_id,
        date_from,
        date_to,
        limit: 10000 // Large limit for export
      };

      const result = await this.memberRepository.findMany(queryOptions);
      
      // Filter fields for export
      const exportData = result.members.map(member => {
        const filteredMember = {};
        fields.forEach(field => {
          if (member[field] !== undefined) {
            filteredMember[field] = member[field];
          }
        });
        return filteredMember;
      });

      logger.logBusiness('Members exported', {
        brandId,
        count: exportData.length,
        format
      });

      return exportData;
    } catch (error) {
      logger.error('Member export failed', {
        error: error.message,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get member leaderboard
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {Array} - Leaderboard data
   */
  async getMemberLeaderboard(brandId, options = {}) {
    try {
      const {
        limit = 10,
        period = 'all_time',
        metric = 'points_balance'
      } = options;

      const leaderboard = await this.memberRepository.getLeaderboard(brandId, {
        limit: parseInt(limit),
        period,
        metric
      });

      return leaderboard;
    } catch (error) {
      logger.error('Get member leaderboard failed', {
        error: error.message,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Generate unique member ID
   * @param {string} brandId - Brand ID
   * @returns {string} - Generated member ID
   */
  async generateMemberId(brandId) {
    try {
      let memberId;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        memberId = `M${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const existing = await this.memberRepository.findByMemberId(memberId, brandId);
        isUnique = !existing;
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Failed to generate unique member ID');
      }

      return memberId;
    } catch (error) {
      logger.error('Member ID generation failed', {
        error: error.message,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get membership tiers for a brand
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {array} - Membership tiers
   */
  async getMembershipTiers(brandId, options = {}) {
    try {
      return await this.memberRepository.getMembershipTiers(brandId, options);
    } catch (error) {
      logger.error('Get membership tiers failed', {
        error: error.message,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Get member tier history
   * @param {string} memberId - Member ID
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {array} - Tier history
   */
  async getMemberTierHistory(memberId, brandId, options = {}) {
    try {
      // Verify member belongs to brand
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      return await this.memberRepository.getTierHistory(memberId, options);
    } catch (error) {
      logger.error('Get member tier history failed', {
        error: error.message,
        memberId,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Get tier benefits
   * @param {string} tierId - Tier ID
   * @param {string} brandId - Brand ID
   * @returns {array} - Tier benefits
   */
  async getTierBenefits(tierId, brandId) {
    try {
      // Verify tier belongs to brand
      const tiers = await this.memberRepository.getMembershipTiers(brandId);
      const tier = tiers.find(t => t.id === tierId);
      if (!tier) {
        throw new NotFoundError('Tier not found');
      }

      return await this.memberRepository.getTierBenefits(tierId);
    } catch (error) {
      logger.error('Get tier benefits failed', {
        error: error.message,
        tierId,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get next tier for member
   * @param {string} memberId - Member ID
   * @param {string} brandId - Brand ID
   * @returns {object|null} - Next tier information
   */
  async getMemberNextTier(memberId, brandId) {
    try {
      // Verify member belongs to brand
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      return await this.memberRepository.getNextTier(memberId);
    } catch (error) {
      logger.error('Get member next tier failed', {
        error: error.message,
        memberId,
        brandId
      });
      throw error;
    }
  }

  /**
   * Manually upgrade member tier (admin action)
   * @param {string} memberId - Member ID
   * @param {string} newTierId - New tier ID
   * @param {string} brandId - Brand ID
   * @param {string} adminUserId - Admin user ID
   * @param {string} reason - Reason for upgrade
   * @param {object} context - Request context
   * @returns {object} - Updated member
   */
  async manualTierUpgrade(memberId, newTierId, brandId, adminUserId, reason = 'admin_adjustment', context = {}) {
    try {
      // Verify member belongs to brand
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      // Verify new tier belongs to brand
      const tiers = await this.memberRepository.getMembershipTiers(brandId);
      const newTier = tiers.find(t => t.id === newTierId);
      if (!newTier) {
        throw new NotFoundError('Tier not found');
      }

      // Perform manual tier upgrade
      const updatedMember = await this.memberRepository.manualTierUpgrade(
        memberId, 
        newTierId, 
        adminUserId, 
        reason
      );

      // Log admin action
      await this.auditLogRepository.logUserAction({
        user_id: adminUserId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.MEMBER_UPDATE,
        description: `Manual tier upgrade to ${newTier.name}`,
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          memberId: member.member_id,
          oldTierId: member.tier_id,
          newTierId: newTierId,
          reason: reason
        }
      });

      logger.info('Manual tier upgrade completed', {
        memberId,
        memberIdString: member.member_id,
        oldTierId: member.tier_id,
        newTierId,
        newTierName: newTier.name,
        adminUserId,
        reason
      });

      return await this.memberRepository.findWithTier(memberId);
    } catch (error) {
      logger.error('Manual tier upgrade failed', {
        error: error.message,
        memberId,
        newTierId,
        brandId,
        adminUserId,
        reason,
        context
      });
      throw error;
    }
  }

  /**
   * Get member tier progress
   * @param {string} memberId - Member ID
   * @param {string} brandId - Brand ID
   * @returns {object} - Tier progress information
   */
  async getMemberTierProgress(memberId, brandId) {
    try {
      // Verify member belongs to brand
      const member = await this.memberRepository.findWithTier(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      const nextTier = await this.memberRepository.getNextTier(memberId);
      const currentTierBenefits = member.tier_id ? 
        await this.memberRepository.getTierBenefits(member.tier_id) : [];

      const progress = {
        current_tier: {
          id: member.tier_id,
          name: member.tier_name,
          slug: member.tier_slug,
          color: member.tier_color,
          min_points: member.tier_min_points,
          max_points: member.tier_max_points,
          benefits: currentTierBenefits,
          multiplier: member.tier_multiplier,
          discount: member.tier_discount
        },
        current_points: member.total_points_earned,
        points_balance: member.points_balance,
        next_tier: nextTier ? {
          id: nextTier.id,
          name: nextTier.name,
          slug: nextTier.slug,
          color: nextTier.color,
          min_points: nextTier.min_points_required,
          points_needed: Math.max(0, nextTier.min_points_required - member.total_points_earned),
          progress_percentage: Math.min(100, 
            (member.total_points_earned / nextTier.min_points_required) * 100
          )
        } : null
      };

      return progress;
    } catch (error) {
      logger.error('Get member tier progress failed', {
        error: error.message,
        memberId,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get members by tier
   * @param {string} tierId - Tier ID
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Paginated members
   */
  async getMembersByTier(tierId, brandId, options = {}) {
    try {
      // Verify tier belongs to brand
      const tiers = await this.memberRepository.getMembershipTiers(brandId);
      const tier = tiers.find(t => t.id === tierId);
      if (!tier) {
        throw new NotFoundError('Tier not found');
      }

      return await this.memberRepository.findByTier(tierId, options);
    } catch (error) {
      logger.error('Get members by tier failed', {
        error: error.message,
        tierId,
        brandId,
        options
      });
      throw error;
    }
  }
}

module.exports = new MemberService();