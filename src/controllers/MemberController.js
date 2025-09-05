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

  // =============================================================================
  // MEMBER PORTAL SPECIFIC METHODS
  // =============================================================================

  /**
   * Update member profile (member portal)
   * PUT /api/member/profile
   */
  updateMemberProfile = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id; // Assuming member is authenticated
    const brandId = req.user.brand_id;
    const updateData = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Only allow certain fields to be updated by members themselves
    const allowedFields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'preferences'];
    const filteredUpdateData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdateData[key] = updateData[key];
      }
    });

    const member = await this.memberService.updateMember(memberId, filteredUpdateData, brandId, memberId, context);

    logger.info('Member profile updated by member', {
      memberId,
      brandId,
      updatedFields: Object.keys(filteredUpdateData)
    });

    return response.success(res, {
      message: 'Profile updated successfully',
      data: { member }
    });
  });

  /**
   * Get member points (member portal)
   * GET /api/member/points
   */
  getMemberPoints = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id;
    const brandId = req.user.brand_id;

    const member = await this.memberService.getMemberById(memberId, brandId);
    const transactions = await this.memberService.getMemberTransactions(memberId, { limit: 20, type: 'points' }, brandId);

    const pointsData = {
      current_balance: member.points_balance,
      total_earned: member.total_points_earned,
      total_redeemed: member.total_points_redeemed || 0,
      recent_transactions: transactions.transactions,
      last_updated: new Date()
    };

    return response.success(res, {
      message: 'Points data retrieved successfully',
      data: { points: pointsData }
    });
  });

  /**
   * Get member tier status (member portal)
   * GET /api/member/tier
   */
  getMemberTierStatus = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id;
    const brandId = req.user.brand_id;

    const progress = await this.memberService.getMemberTierProgress(memberId, brandId);

    return response.success(res, {
      message: 'Tier status retrieved successfully',
      data: { tier_status: progress }
    });
  });

  /**
   * Get member leaderboard position (member portal)
   * GET /api/member/leaderboard
   */
  getMemberLeaderboardPosition = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id;
    const brandId = req.user.brand_id;

    const leaderboard = await this.memberService.getMemberLeaderboard(brandId, { include_member: memberId });
    const memberPosition = leaderboard.findIndex(member => member.id === memberId) + 1;

    return response.success(res, {
      message: 'Leaderboard position retrieved successfully',
      data: { 
        position: memberPosition || null,
        total_members: leaderboard.length,
        top_10: leaderboard.slice(0, 10)
      }
    });
  });

  /**
   * Get available rewards for member (member portal)
   * GET /api/member/rewards
   */
  getMemberRewards = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id;
    const brandId = req.user.brand_id;

    const member = await this.memberService.getMemberById(memberId, brandId);
    
    // Mock rewards data - this would typically come from a rewards service
    const rewards = [
      {
        id: '1',
        name: '10% Discount Coupon',
        description: 'Get 10% off your next purchase',
        points_required: 500,
        available: member.points_balance >= 500,
        category: 'discount',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      {
        id: '2',
        name: 'Free Shipping',
        description: 'Free shipping on your next order',
        points_required: 200,
        available: member.points_balance >= 200,
        category: 'shipping',
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
      }
    ];

    return response.success(res, {
      message: 'Available rewards retrieved successfully',
      data: { 
        rewards,
        member_points: member.points_balance
      }
    });
  });

  /**
   * Redeem a reward (member portal)
   * POST /api/member/rewards/:id/redeem
   */
  redeemMemberReward = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id;
    const brandId = req.user.brand_id;
    const { id: rewardId } = req.params;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // This would typically involve a rewards service
    // For now, we'll simulate the redemption
    const member = await this.memberService.getMemberById(memberId, brandId);
    
    // Mock reward validation
    const reward = { id: rewardId, points_required: 500, name: '10% Discount Coupon' };
    
    if (member.points_balance < reward.points_required) {
      return response.error(res, 'Insufficient points for this reward', 400);
    }

    // Deduct points
    await this.memberService.updateMemberPoints(memberId, {
      type: 'deduct',
      amount: reward.points_required,
      description: `Redeemed: ${reward.name}`,
      reference_type: 'reward_redemption',
      reference_id: rewardId
    }, brandId, memberId, context);

    logger.info('Reward redeemed by member', {
      memberId,
      brandId,
      rewardId,
      pointsDeducted: reward.points_required
    });

    return response.success(res, {
      message: 'Reward redeemed successfully',
      data: { 
        reward,
        redemption_code: `RDM-${Date.now()}`,
        redeemed_at: new Date()
      }
    });
  });

  /**
   * Get member notifications (member portal)
   * GET /api/member/notifications
   */
  getMemberNotifications = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id;
    const brandId = req.user.brand_id;
    const { limit = 20, offset = 0, unread_only = false } = req.query;

    // Mock notifications - this would typically come from a notifications service
    const notifications = [
      {
        id: '1',
        type: 'points_earned',
        title: 'Points Earned!',
        message: 'You earned 100 points from completing a mission',
        read: false,
        created_at: new Date(),
        data: { points: 100, source: 'mission_completion' }
      },
      {
        id: '2',
        type: 'tier_upgrade',
        title: 'Tier Upgrade!',
        message: 'Congratulations! You have been upgraded to Silver tier',
        read: true,
        created_at: new Date(Date.now() - 86400000), // 1 day ago
        data: { new_tier: 'Silver', previous_tier: 'Bronze' }
      }
    ];

    const filteredNotifications = unread_only === 'true' 
      ? notifications.filter(n => !n.read)
      : notifications;

    return response.success(res, {
      message: 'Notifications retrieved successfully',
      data: { 
        notifications: filteredNotifications.slice(offset, offset + limit),
        pagination: {
          total: filteredNotifications.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  });

  /**
   * Mark notification as read (member portal)
   * PUT /api/member/notifications/:id/read
   */
  markNotificationAsRead = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id;
    const { id: notificationId } = req.params;

    // Mock notification update - this would typically update in a notifications service
    logger.info('Notification marked as read', {
      memberId,
      notificationId
    });

    return response.success(res, {
      message: 'Notification marked as read',
      data: { 
        notification_id: notificationId,
        marked_read_at: new Date()
      }
    });
  });
}

module.exports = new MemberController();