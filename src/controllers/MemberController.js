/**
 * Member Controller
 * Handles member-related HTTP requests
 */

const { MemberService } = require('../services');
const { response, logger } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');

class MemberController {
  constructor() {
    this.memberService = new MemberService();
  }

  /**
   * Create a new member
   * POST /api/brands/:brandId/members
   */
  createMember = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const memberData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const member = await this.memberService.createMember(memberData, brandId, userId, context);

    logger.info('Member created successfully', {
      memberId: member.id,
      memberIdString: member.member_id,
      brandId,
      createdBy: userId
    });

    return response.success(res, {
      message: 'Member created successfully',
      data: { member }
    }, 201);
  });

  /**
   * Get member by ID
   * GET /api/brands/:brandId/members/:id
   */
  getMemberById = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;

    const member = await this.memberService.getMemberById(id, brandId);

    return response.success(res, {
      message: 'Member retrieved successfully',
      data: { member }
    });
  });

  /**
   * Update member
   * PUT /api/brands/:brandId/members/:id
   */
  updateMember = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const member = await this.memberService.updateMember(id, updateData, brandId, userId, context);

    logger.info('Member updated successfully', {
      memberId: id,
      brandId,
      updatedBy: userId
    });

    return response.success(res, {
      message: 'Member updated successfully',
      data: { member }
    });
  });

  /**
   * List members with pagination and filtering
   * GET /api/brands/:brandId/members
   */
  listMembers = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const result = await this.memberService.listMembers(options, brandId);

    return response.success(res, {
      message: 'Members retrieved successfully',
      data: result
    });
  });

  /**
   * Delete member
   * DELETE /api/brands/:brandId/members/:id
   */
  deleteMember = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.memberService.deleteMember(id, brandId, userId, context);

    logger.info('Member deleted successfully', {
      memberId: id,
      brandId,
      deletedBy: userId
    });

    return response.success(res, {
      message: 'Member deleted successfully'
    });
  });

  /**
   * Update member points
   * POST /api/brands/:brandId/members/:id/points
   */
  updateMemberPoints = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const pointsData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const member = await this.memberService.updateMemberPoints(id, pointsData, brandId, userId, context);

    logger.info('Member points updated successfully', {
      memberId: id,
      type: pointsData.type,
      amount: pointsData.amount,
      brandId,
      updatedBy: userId
    });

    return response.success(res, {
      message: 'Member points updated successfully',
      data: { member }
    });
  });

  /**
   * Get member statistics
   * GET /api/brands/:brandId/members/statistics
   */
  getMemberStatistics = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const statistics = await this.memberService.getMemberStatistics(brandId, options);

    return response.success(res, {
      message: 'Member statistics retrieved successfully',
      data: { statistics }
    });
  });

  /**
   * Get member transactions
   * GET /api/brands/:brandId/members/:id/transactions
   */
  getMemberTransactions = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const options = req.query;

    const result = await this.memberService.getMemberTransactions(id, options, brandId);

    return response.success(res, {
      message: 'Member transactions retrieved successfully',
      data: result
    });
  });

  /**
   * Check email availability
   * GET /api/brands/:brandId/members/check-email/:email
   */
  checkEmailAvailability = asyncHandler(async (req, res) => {
    const { brandId, email } = req.params;
    const { exclude_id } = req.query;

    const available = await this.memberService.checkEmailAvailability(email, brandId, exclude_id);

    return response.success(res, {
      message: 'Email availability checked',
      data: { 
        email,
        available 
      }
    });
  });

  /**
   * Import members from CSV/Excel
   * POST /api/brands/:brandId/members/import
   */
  importMembers = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { members, options = {} } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!members || !Array.isArray(members)) {
      return response.error(res, 'Members array is required', 400);
    }

    const results = await this.memberService.importMembers(members, options, brandId, userId, context);

    logger.info('Members import completed', {
      brandId,
      results,
      importedBy: userId
    });

    return response.success(res, {
      message: 'Members import completed',
      data: { results }
    });
  });

  /**
   * Export members data
   * GET /api/brands/:brandId/members/export
   */
  exportMembers = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const exportData = await this.memberService.exportMembers(options, brandId);

    logger.info('Members export completed', {
      brandId,
      count: exportData.length,
      format: options.format
    });

    return response.success(res, {
      message: 'Members exported successfully',
      data: { 
        members: exportData,
        count: exportData.length,
        exported_at: new Date()
      }
    });
  });

  /**
   * Get member leaderboard
   * GET /api/brands/:brandId/members/leaderboard
   */
  getMemberLeaderboard = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const leaderboard = await this.memberService.getMemberLeaderboard(brandId, options);

    return response.success(res, {
      message: 'Member leaderboard retrieved successfully',
      data: { leaderboard }
    });
  });

  /**
   * Get member profile (public endpoint for members)
   * GET /api/brands/:brandId/members/:id/profile
   */
  getMemberProfile = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;

    const member = await this.memberService.getMemberById(id, brandId);

    // Return only public profile information
    const publicProfile = {
      id: member.id,
      member_id: member.member_id,
      first_name: member.first_name,
      last_name: member.last_name,
      points_balance: member.points_balance,
      total_points_earned: member.total_points_earned,
      tier: member.tier,
      joined_at: member.created_at,
      avatar_url: member.avatar_url
    };

    return response.success(res, {
      message: 'Member profile retrieved successfully',
      data: { member: publicProfile }
    });
  });

  /**
   * Get member dashboard data
   * GET /api/brands/:brandId/members/:id/dashboard
   */
  getMemberDashboard = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const options = req.query;

    const [member, transactions] = await Promise.all([
      this.memberService.getMemberById(id, brandId),
      this.memberService.getMemberTransactions(id, { limit: 10 }, brandId)
    ]);

    const dashboard = {
      member: {
        id: member.id,
        member_id: member.member_id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        points_balance: member.points_balance,
        total_points_earned: member.total_points_earned,
        tier: member.tier,
        status: member.status
      },
      recent_transactions: transactions.transactions,
      summary: {
        total_transactions: transactions.pagination?.total || 0,
        points_this_month: 0, // This would be calculated
        rank: 0, // This would be calculated
        next_tier_points: 0 // This would be calculated
      },
      last_updated: new Date()
    };

    return response.success(res, {
      message: 'Member dashboard data retrieved successfully',
      data: { dashboard }
    });
  });

  /**
   * Activate member
   * POST /api/brands/:brandId/members/:id/activate
   */
  activateMember = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const member = await this.memberService.updateMember(id, { status: 'active' }, brandId, userId, context);

    logger.info('Member activated successfully', {
      memberId: id,
      brandId,
      activatedBy: userId
    });

    return response.success(res, {
      message: 'Member activated successfully',
      data: { member }
    });
  });

  /**
   * Deactivate member
   * POST /api/brands/:brandId/members/:id/deactivate
   */
  deactivateMember = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const member = await this.memberService.updateMember(id, { status: 'inactive' }, brandId, userId, context);

    logger.info('Member deactivated successfully', {
      memberId: id,
      brandId,
      deactivatedBy: userId
    });

    return response.success(res, {
      message: 'Member deactivated successfully',
      data: { member }
    });
  });

  /**
   * Get member activity log
   * GET /api/brands/:brandId/members/:id/activity
   */
  getMemberActivity = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const options = req.query;

    // Verify member exists
    await this.memberService.getMemberById(id, brandId);

    // This would typically get member activity from audit logs
    // For now, we'll return mock data
    const activities = [
      {
        id: '1',
        type: 'points_earned',
        description: 'Earned 100 points from wheel spin',
        timestamp: new Date(),
        metadata: { points: 100, source: 'wheel_spin' }
      },
      {
        id: '2',
        type: 'mission_completed',
        description: 'Completed daily check-in mission',
        timestamp: new Date(Date.now() - 3600000),
        metadata: { mission_name: 'Daily Check-in', reward: 50 }
      }
    ];

    return response.success(res, {
      message: 'Member activity retrieved successfully',
      data: { 
        activities,
        pagination: {
          page: 1,
          limit: 20,
          total: activities.length,
          pages: 1
        }
      }
    });
  });

  /**
   * Get member tier progress
   * GET /api/brands/:brandId/members/:id/tier-progress
   */
  getMemberTierProgress = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;

    const progress = await this.memberService.getMemberTierProgress(id, brandId);

    return response.success(res, {
      message: 'Member tier progress retrieved successfully',
      data: { progress }
    });
  });

  /**
   * Manual tier upgrade for member
   * POST /api/brands/:brandId/members/:id/tier-upgrade
   */
  manualTierUpgrade = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { tier_id, reason } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!tier_id) {
      return response.error(res, 'Tier ID is required', 400);
    }

    const member = await this.memberService.manualTierUpgrade(id, tier_id, brandId, userId, reason, context);

    logger.info('Manual tier upgrade completed', {
      memberId: id,
      newTierId: tier_id,
      reason: reason || 'admin_adjustment',
      brandId,
      upgradedBy: userId
    });

    return response.success(res, {
      message: 'Member tier upgraded successfully',
      data: { member }
    });
  });

  /**
   * Get member tier history
   * @route GET /api/brands/:brandId/members/:id/tier-history
   */
  getMemberTierHistory = asyncHandler(async (req, res) => {
    const { brandId, id: memberId } = req.params;
    const options = req.query;

    const tierHistory = await this.memberService.getMemberTierHistory(memberId, options, brandId);

    logger.info('Member tier history retrieved', {
      brandId,
      memberId,
      historyCount: tierHistory.length
    });

    return response.success(res, {
      message: 'Member tier history retrieved successfully',
      data: { tierHistory }
    });
  });

  /**
   * Import members from CSV/Excel
   * @route POST /api/brands/:brandId/members/import
   */
  importMembers = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { membersData, options = {} } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const results = await this.memberService.importMembers(membersData, options, brandId, userId, context);

    logger.info('Members import completed', {
      brandId,
      results,
      importedBy: userId
    });

    return response.success(res, {
      message: 'Members import completed',
      data: { results }
    });
  });

  /**
   * Get member leaderboard
   * @route GET /api/brands/:brandId/members/leaderboard
   */
  getMemberLeaderboard = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const leaderboard = await this.memberService.getMemberLeaderboard(brandId, options);

    logger.info('Member leaderboard retrieved', {
      brandId,
      count: leaderboard.length,
      period: options.period || 'all_time'
    });

    return response.success(res, {
      message: 'Member leaderboard retrieved successfully',
      data: { leaderboard }
    });
  });

  /**
   * Bulk update members
   * PUT /api/brands/:brandId/members/bulk
   */
  bulkUpdateMembers = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { member_ids, update_data } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!member_ids || !Array.isArray(member_ids)) {
      return response.error(res, 'Member IDs array is required', 400);
    }

    if (!update_data || typeof update_data !== 'object') {
      return response.error(res, 'Update data is required', 400);
    }

    const results = {
      total: member_ids.length,
      updated: 0,
      errors: []
    };

    for (let i = 0; i < member_ids.length; i++) {
      try {
        await this.memberService.updateMember(member_ids[i], update_data, brandId, userId, context);
        results.updated++;
      } catch (error) {
        results.errors.push({
          member_id: member_ids[i],
          error: error.message
        });
      }
    }

    logger.info('Bulk member update completed', {
      brandId,
      results,
      updatedBy: userId
    });

    return response.success(res, {
      message: 'Bulk member update completed',
      data: { results }
    });
  });
}

module.exports = new MemberController();