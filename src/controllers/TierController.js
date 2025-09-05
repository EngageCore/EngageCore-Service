/**
 * Tier Controller
 * Handles membership tier-related HTTP requests
 */

const { TierService } = require('../services');
const { response, logger } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');

class TierController {
  constructor() {
    this.tierService = new TierService();
  }

  /**
   * Create a new membership tier
   * POST /api/brands/:brandId/tiers
   */
  createTier = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const tierData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const tier = await this.tierService.createTier(tierData, brandId, userId, context);

    logger.info('Tier created successfully', {
      tierId: tier.id,
      tierName: tier.name,
      brandId,
      createdBy: userId
    });

    return response.success(res, {
      message: 'Tier created successfully',
      data: { tier }
    }, 201);
  });

  /**
   * Get tier by ID
   * GET /api/brands/:brandId/tiers/:id
   */
  getTierById = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;

    const tier = await this.tierService.getTierById(id, brandId);

    return response.success(res, {
      message: 'Tier retrieved successfully',
      data: { tier }
    });
  });

  /**
   * List tiers for a brand
   * GET /api/brands/:brandId/tiers
   */
  listTiers = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const tiers = await this.tierService.listTiers(brandId, options);

    return response.success(res, {
      message: 'Tiers retrieved successfully',
      data: { 
        tiers,
        count: tiers.length
      }
    });
  });

  /**
   * Update tier
   * PUT /api/brands/:brandId/tiers/:id
   */
  updateTier = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const tier = await this.tierService.updateTier(id, updateData, brandId, userId, context);

    logger.info('Tier updated successfully', {
      tierId: id,
      brandId,
      updatedBy: userId
    });

    return response.success(res, {
      message: 'Tier updated successfully',
      data: { tier }
    });
  });

  /**
   * Delete tier
   * DELETE /api/brands/:brandId/tiers/:id
   */
  deleteTier = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.tierService.deleteTier(id, brandId, userId, context);

    logger.info('Tier deleted successfully', {
      tierId: id,
      brandId,
      deletedBy: userId
    });

    return response.success(res, {
      message: 'Tier deleted successfully'
    });
  });

  /**
   * Get tier statistics
   * GET /api/brands/:brandId/tiers/:id/statistics
   */
  getTierStatistics = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;

    const statistics = await this.tierService.getTierStatistics(id, brandId);

    return response.success(res, {
      message: 'Tier statistics retrieved successfully',
      data: { statistics }
    });
  });

  /**
   * Get members in a specific tier
   * GET /api/brands/:brandId/tiers/:id/members
   */
  getTierMembers = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const options = req.query;

    // Verify tier exists
    await this.tierService.getTierById(id, brandId);

    // Get members for this tier (using MemberService)
    const { MemberService } = require('../services');
    const memberService = new MemberService();
    const result = await memberService.getMembersByTier(id, brandId, options);

    return response.success(res, {
      message: 'Tier members retrieved successfully',
      data: result
    });
  });

  /**
   * Create default tiers for a brand
   * POST /api/brands/:brandId/tiers/default
   */
  createDefaultTiers = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const tiers = await this.tierService.createDefaultTiers(brandId, userId, context);

    logger.info('Default tiers created successfully', {
      brandId,
      tierCount: tiers.length,
      createdBy: userId
    });

    return response.success(res, {
      message: 'Default tiers created successfully',
      data: { 
        tiers,
        count: tiers.length
      }
    }, 201);
  });

  /**
   * Reorder tiers
   * PUT /api/brands/:brandId/tiers/reorder
   */
  reorderTiers = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { tierOrders } = req.body; // Array of { id, sort_order }
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Update each tier's sort order
    const updatePromises = tierOrders.map(({ id, sort_order }) => 
      this.tierService.updateTier(id, { sort_order }, brandId, userId, context)
    );

    await Promise.all(updatePromises);

    // Get updated tiers list
    const tiers = await this.tierService.listTiers(brandId);

    logger.info('Tiers reordered successfully', {
      brandId,
      tierCount: tierOrders.length,
      reorderedBy: userId
    });

    return response.success(res, {
      message: 'Tiers reordered successfully',
      data: { tiers }
    });
  });

  /**
   * Get tier benefits
   * GET /api/brands/:brandId/tiers/:id/benefits
   */
  getTierBenefits = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;

    const tier = await this.tierService.getTierById(id, brandId);

    return response.success(res, {
      message: 'Tier benefits retrieved successfully',
      data: { 
        tier_id: tier.id,
        tier_name: tier.name,
        benefits: tier.benefits || []
      }
    });
  });

  /**
   * Update tier benefits
   * PUT /api/brands/:brandId/tiers/:id/benefits
   */
  updateTierBenefits = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { benefits } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const tier = await this.tierService.updateTier(id, { benefits }, brandId, userId, context);

    logger.info('Tier benefits updated successfully', {
      tierId: id,
      brandId,
      benefitCount: benefits.length,
      updatedBy: userId
    });

    return response.success(res, {
      message: 'Tier benefits updated successfully',
      data: { 
        tier_id: tier.id,
        tier_name: tier.name,
        benefits: tier.benefits
      }
    });
  });

  /**
   * Get tier progression info
   * GET /api/brands/:brandId/tiers/progression
   */
  getTierProgression = asyncHandler(async (req, res) => {
    const { brandId } = req.params;

    const tiers = await this.tierService.listTiers(brandId, { status: 'active' });
    
    // Sort by sort_order and add progression info
    const sortedTiers = tiers
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((tier, index) => ({
        ...tier,
        level: index + 1,
        is_entry_tier: index === 0,
        is_highest_tier: index === tiers.length - 1,
        next_tier: index < tiers.length - 1 ? {
          id: tiers[index + 1].id,
          name: tiers[index + 1].name,
          points_needed: tiers[index + 1].min_points_required - (tier.max_points_required || 0)
        } : null
      }));

    return response.success(res, {
      message: 'Tier progression retrieved successfully',
      data: { 
        tiers: sortedTiers,
        total_tiers: sortedTiers.length
      }
    });
  });

  /**
   * Duplicate tier
   * POST /api/brands/:brandId/tiers/:id/duplicate
   */
  duplicateTier = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { name, slug } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Get original tier
    const originalTier = await this.tierService.getTierById(id, brandId);

    // Create duplicated tier data
    const duplicatedTierData = {
      name: name || `${originalTier.name} (Copy)`,
      slug: slug || `${originalTier.slug}-copy`,
      description: originalTier.description,
      min_points_required: originalTier.min_points_required,
      max_points_required: originalTier.max_points_required,
      color: originalTier.color,
      benefits: originalTier.benefits,
      metadata: originalTier.metadata,
      status: 'inactive' // Start as inactive to avoid conflicts
    };

    const duplicatedTier = await this.tierService.createTier(duplicatedTierData, brandId, userId, context);

    logger.info('Tier duplicated successfully', {
      originalTierId: id,
      duplicatedTierId: duplicatedTier.id,
      brandId,
      duplicatedBy: userId
    });

    return response.success(res, {
      message: 'Tier duplicated successfully',
      data: { tier: duplicatedTier }
    }, 201);
  });
}

module.exports = new TierController();