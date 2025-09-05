/**
 * Wheel Controller
 * Handles wheel and spin-related HTTP requests
 */

const { WheelService } = require('../services');
const { response, logger } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');

class WheelController {
  constructor() {
    this.wheelService = new WheelService();
  }

  /**
   * Create a new wheel
   * POST /api/brands/:brandId/wheels
   */
  createWheel = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const wheelData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const wheel = await this.wheelService.createWheel(wheelData, brandId, userId, context);

    logger.info('Wheel created successfully', {
      wheelId: wheel.id,
      wheelName: wheel.name,
      brandId,
      createdBy: userId
    });

    return response.success(res, {
      message: 'Wheel created successfully',
      data: { wheel }
    }, 201);
  });

  /**
   * Get wheel by ID
   * GET /api/brands/:brandId/wheels/:id
   */
  getWheelById = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;

    const wheel = await this.wheelService.getWheelById(id, brandId);

    return response.success(res, {
      message: 'Wheel retrieved successfully',
      data: { wheel }
    });
  });

  /**
   * Update wheel
   * PUT /api/brands/:brandId/wheels/:id
   */
  updateWheel = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const wheel = await this.wheelService.updateWheel(id, updateData, brandId, userId, context);

    logger.info('Wheel updated successfully', {
      wheelId: id,
      brandId,
      updatedBy: userId
    });

    return response.success(res, {
      message: 'Wheel updated successfully',
      data: { wheel }
    });
  });

  /**
   * Update wheel items
   * PUT /api/brands/:brandId/wheels/:id/items
   */
  updateWheelItems = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { items } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!items || !Array.isArray(items)) {
      return response.error(res, 'Items array is required', 400);
    }

    const wheel = await this.wheelService.updateWheelItems(id, items, brandId, userId, context);

    logger.info('Wheel items updated successfully', {
      wheelId: id,
      itemCount: items.length,
      brandId,
      updatedBy: userId
    });

    return response.success(res, {
      message: 'Wheel items updated successfully',
      data: { wheel }
    });
  });

  /**
   * List wheels with pagination and filtering
   * GET /api/brands/:brandId/wheels
   */
  listWheels = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const result = await this.wheelService.listWheels(options, brandId);

    return response.success(res, {
      message: 'Wheels retrieved successfully',
      data: result
    });
  });

  /**
   * Delete wheel
   * DELETE /api/brands/:brandId/wheels/:id
   */
  deleteWheel = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.wheelService.deleteWheel(id, brandId, userId, context);

    logger.info('Wheel deleted successfully', {
      wheelId: id,
      brandId,
      deletedBy: userId
    });

    return response.success(res, {
      message: 'Wheel deleted successfully'
    });
  });

  /**
   * Spin wheel for member
   * POST /api/brands/:brandId/wheels/:id/spin
   */
  spinWheel = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { member_id } = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!member_id) {
      return response.error(res, 'Member ID is required', 400);
    }

    const result = await this.wheelService.spinWheel(id, member_id, brandId, context);

    logger.info('Wheel spin successful', {
      wheelId: id,
      memberId: member_id,
      winningItem: result.spin.winning_item.name,
      reward: result.spin.winning_item.value,
      brandId
    });

    return response.success(res, {
      message: 'Wheel spin successful',
      data: result
    });
  });

  /**
   * Check spin eligibility for member
   * GET /api/brands/:brandId/wheels/:id/eligibility/:memberId
   */
  checkSpinEligibility = asyncHandler(async (req, res) => {
    const { brandId, id, memberId } = req.params;

    const eligibility = await this.wheelService.checkSpinEligibility(id, memberId, brandId);

    return response.success(res, {
      message: 'Spin eligibility checked',
      data: { eligibility }
    });
  });

  /**
   * Get spin history for wheel
   * GET /api/brands/:brandId/wheels/:id/spins
   */
  getSpinHistory = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const options = req.query;

    const result = await this.wheelService.getSpinHistory(id, options, brandId);

    return response.success(res, {
      message: 'Spin history retrieved successfully',
      data: result
    });
  });

  /**
   * Get member spin history
   * GET /api/brands/:brandId/members/:memberId/spins
   */
  getMemberSpinHistory = asyncHandler(async (req, res) => {
    const { brandId, memberId } = req.params;
    const options = req.query;

    const result = await this.wheelService.getMemberSpinHistory(memberId, options, brandId);

    return response.success(res, {
      message: 'Member spin history retrieved successfully',
      data: result
    });
  });

  /**
   * Get wheel statistics
   * GET /api/brands/:brandId/wheels/:id/statistics
   */
  getWheelStatistics = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const options = req.query;

    const statistics = await this.wheelService.getWheelStatistics(id, options, brandId);

    return response.success(res, {
      message: 'Wheel statistics retrieved successfully',
      data: { statistics }
    });
  });

  /**
   * Get item performance statistics
   * GET /api/brands/:brandId/wheels/:id/items/performance
   */
  getItemPerformance = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const options = req.query;

    const performance = await this.wheelService.getItemPerformance(id, options, brandId);

    return response.success(res, {
      message: 'Item performance retrieved successfully',
      data: { performance }
    });
  });

  /**
   * Get member daily spin count
   * GET /api/brands/:brandId/wheels/:id/members/:memberId/daily-count
   */
  getMemberDailySpinCount = asyncHandler(async (req, res) => {
    const { brandId, id, memberId } = req.params;

    const result = await this.wheelService.getMemberDailySpinCount(memberId, id, brandId);

    return response.success(res, {
      message: 'Member daily spin count retrieved successfully',
      data: result
    });
  });

  /**
   * Validate wheel probabilities
   * POST /api/brands/:brandId/wheels/validate-probabilities
   */
  validateWheelProbabilities = asyncHandler(async (req, res) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return response.error(res, 'Items array is required', 400);
    }

    try {
      this.wheelService.validateWheelProbabilities(items);
      
      return response.success(res, {
        message: 'Wheel probabilities are valid',
        data: { valid: true }
      });
    } catch (error) {
      return response.success(res, {
        message: 'Wheel probabilities validation result',
        data: { 
          valid: false,
          error: error.message
        }
      });
    }
  });

  /**
   * Get wheel dashboard data
   * GET /api/brands/:brandId/wheels/:id/dashboard
   */
  getWheelDashboard = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const options = req.query;

    const [wheel, statistics, recentSpins] = await Promise.all([
      this.wheelService.getWheelById(id, brandId),
      this.wheelService.getWheelStatistics(id, options, brandId),
      this.wheelService.getSpinHistory(id, { limit: 10 }, brandId)
    ]);

    const dashboard = {
      wheel: {
        id: wheel.id,
        name: wheel.name,
        description: wheel.description,
        active: wheel.active,
        max_spins_per_day: wheel.max_spins_per_day,
        cooldown_minutes: wheel.cooldown_minutes,
        items_count: wheel.items?.length || 0
      },
      statistics,
      recent_spins: recentSpins.spins,
      summary: {
        total_spins: statistics.total_spins || 0,
        unique_spinners: statistics.unique_spinners || 0,
        total_rewards_given: statistics.total_rewards || 0,
        average_spins_per_day: statistics.average_daily_spins || 0
      },
      last_updated: new Date()
    };

    return response.success(res, {
      message: 'Wheel dashboard data retrieved successfully',
      data: { dashboard }
    });
  });

  /**
   * Clone wheel
   * POST /api/brands/:brandId/wheels/:id/clone
   */
  cloneWheel = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Get original wheel
    const originalWheel = await this.wheelService.getWheelById(id, brandId);

    // Create cloned wheel data
    const clonedWheelData = {
      name: name || `${originalWheel.name} (Copy)`,
      description: description || originalWheel.description,
      max_spins_per_day: originalWheel.max_spins_per_day,
      cooldown_minutes: originalWheel.cooldown_minutes,
      start_date: originalWheel.start_date,
      end_date: originalWheel.end_date,
      active: false, // Start as inactive
      items: originalWheel.items.map(item => ({
        name: item.name,
        type: item.type,
        value: item.value,
        probability: item.probability,
        color: item.color,
        icon: item.icon,
        description: item.description,
        position: item.position,
        active: item.active
      }))
    };

    const clonedWheel = await this.wheelService.createWheel(clonedWheelData, brandId, userId, context);

    logger.info('Wheel cloned successfully', {
      originalWheelId: id,
      clonedWheelId: clonedWheel.id,
      brandId,
      clonedBy: userId
    });

    return response.success(res, {
      message: 'Wheel cloned successfully',
      data: { wheel: clonedWheel }
    }, 201);
  });

  /**
   * Activate wheel
   * POST /api/brands/:brandId/wheels/:id/activate
   */
  activateWheel = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const wheel = await this.wheelService.updateWheel(id, { active: true }, brandId, userId, context);

    logger.info('Wheel activated successfully', {
      wheelId: id,
      brandId,
      activatedBy: userId
    });

    return response.success(res, {
      message: 'Wheel activated successfully',
      data: { wheel }
    });
  });

  /**
   * Deactivate wheel
   * POST /api/brands/:brandId/wheels/:id/deactivate
   */
  deactivateWheel = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const wheel = await this.wheelService.updateWheel(id, { active: false }, brandId, userId, context);

    logger.info('Wheel deactivated successfully', {
      wheelId: id,
      brandId,
      deactivatedBy: userId
    });

    return response.success(res, {
      message: 'Wheel deactivated successfully',
      data: { wheel }
    });
  });

  /**
   * Get wheel leaderboard
   * GET /api/brands/:brandId/wheels/:id/leaderboard
   */
  getWheelLeaderboard = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { limit = 10, period = 'all_time' } = req.query;

    // Verify wheel exists
    await this.wheelService.getWheelById(id, brandId);

    // This would typically get top spinners for the wheel
    // For now, we'll return mock data
    const leaderboard = [
      {
        rank: 1,
        member_id: 'M123456',
        member_name: 'John Doe',
        total_spins: 25,
        total_rewards: 2500,
        last_spin: new Date()
      },
      {
        rank: 2,
        member_id: 'M123457',
        member_name: 'Jane Smith',
        total_spins: 20,
        total_rewards: 2000,
        last_spin: new Date(Date.now() - 3600000)
      }
    ];

    return response.success(res, {
      message: 'Wheel leaderboard retrieved successfully',
      data: { 
        leaderboard,
        period,
        generated_at: new Date()
      }
    });
  });

  /**
   * Export wheel data
   * GET /api/brands/:brandId/wheels/:id/export
   */
  exportWheelData = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { format = 'json', include_spins = false } = req.query;

    const wheel = await this.wheelService.getWheelById(id, brandId);
    
    const exportData = {
      wheel: {
        id: wheel.id,
        name: wheel.name,
        description: wheel.description,
        max_spins_per_day: wheel.max_spins_per_day,
        cooldown_minutes: wheel.cooldown_minutes,
        active: wheel.active,
        created_at: wheel.created_at,
        items: wheel.items
      },
      export_info: {
        exported_at: new Date(),
        format,
        include_spins
      }
    };

    if (include_spins) {
      const spins = await this.wheelService.getSpinHistory(id, { limit: 1000 }, brandId);
      exportData.spins = spins.spins;
    }

    logger.info('Wheel data exported', {
      wheelId: id,
      brandId,
      format,
      includeSpins: include_spins
    });

    return response.success(res, {
      message: 'Wheel data exported successfully',
      data: exportData
    });
  });
}

module.exports = new WheelController();