/**
 * Tier Service
 * Handles business logic for membership tier management
 */

const { MemberRepository, BrandRepository, AuditLogRepository } = require('../repositories');
const { logger, response } = require('../utils');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');
const { TIER_STATUS, AUDIT_ACTIONS } = require('../utils/constants');

class TierService {
  constructor() {
    this.memberRepository = new MemberRepository();
    this.brandRepository = new BrandRepository();
    this.auditLogRepository = new AuditLogRepository();
  }

  /**
   * Create a new membership tier
   * @param {object} tierData - Tier creation data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID creating the tier
   * @param {object} context - Request context
   * @returns {object} - Created tier
   */
  async createTier(tierData, brandId, userId, context = {}) {
    try {
      // Verify brand exists and user has access
      const brand = await this.brandRepository.findById(brandId);
      if (!brand) {
        throw new NotFoundError('Brand not found');
      }

      // Check if tier name or slug already exists for this brand
      const existingTiers = await this.memberRepository.getMembershipTiers(brandId, { includeInactive: true });
      
      const nameExists = existingTiers.some(tier => 
        tier.name.toLowerCase() === tierData.name.toLowerCase()
      );
      if (nameExists) {
        throw new ConflictError('Tier name already exists for this brand');
      }

      const slugExists = existingTiers.some(tier => 
        tier.slug.toLowerCase() === tierData.slug.toLowerCase()
      );
      if (slugExists) {
        throw new ConflictError('Tier slug already exists for this brand');
      }

      // Validate point ranges don't overlap with existing tiers
      await this.validatePointRanges(tierData, brandId);

      // Prepare tier data
      const tierToCreate = {
        ...tierData,
        brand_id: brandId,
        status: tierData.status || TIER_STATUS.ACTIVE,
        sort_order: tierData.sort_order ?? await this.getNextSortOrder(brandId),
        benefits: tierData.benefits || [],
        metadata: tierData.metadata || {},
        created_by: userId
      };

      // Create tier
      const tier = await this.memberRepository.createMembershipTier(tierToCreate);

      // Log audit trail
      await this.auditLogRepository.create({
        action: AUDIT_ACTIONS.TIER_CREATED,
        resource_type: 'membership_tier',
        resource_id: tier.id,
        user_id: userId,
        brand_id: brandId,
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          tierName: tier.name,
          tierSlug: tier.slug,
          pointRange: `${tier.min_points_required}-${tier.max_points_required || '∞'}`
        }
      });

      logger.info('Tier created successfully', {
        tierId: tier.id,
        tierName: tier.name,
        brandId,
        createdBy: userId
      });

      return tier;
    } catch (error) {
      logger.error('Create tier failed', {
        error: error.message,
        tierData,
        brandId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get tier by ID
   * @param {string} tierId - Tier ID
   * @param {string} brandId - Brand ID
   * @returns {object} - Tier data
   */
  async getTierById(tierId, brandId) {
    try {
      const tier = await this.memberRepository.getMembershipTierById(tierId);
      
      if (!tier || tier.brand_id !== brandId) {
        throw new NotFoundError('Tier not found');
      }

      return tier;
    } catch (error) {
      logger.error('Get tier by ID failed', {
        error: error.message,
        tierId,
        brandId
      });
      throw error;
    }
  }

  /**
   * List tiers for a brand
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {array} - List of tiers
   */
  async listTiers(brandId, options = {}) {
    try {
      // Verify brand exists
      const brand = await this.brandRepository.findById(brandId);
      if (!brand) {
        throw new NotFoundError('Brand not found');
      }

      const tiers = await this.memberRepository.getMembershipTiers(brandId, options);
      
      // Add member counts for each tier
      const tiersWithCounts = await Promise.all(
        tiers.map(async (tier) => {
          const memberCount = await this.memberRepository.countMembersByTier(tier.id);
          return {
            ...tier,
            member_count: memberCount
          };
        })
      );

      return tiersWithCounts;
    } catch (error) {
      logger.error('List tiers failed', {
        error: error.message,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Update tier
   * @param {string} tierId - Tier ID
   * @param {object} updateData - Update data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID updating the tier
   * @param {object} context - Request context
   * @returns {object} - Updated tier
   */
  async updateTier(tierId, updateData, brandId, userId, context = {}) {
    try {
      // Get existing tier
      const existingTier = await this.getTierById(tierId, brandId);

      // Check for name/slug conflicts if they're being updated
      if (updateData.name || updateData.slug) {
        const existingTiers = await this.memberRepository.getMembershipTiers(brandId, { includeInactive: true });
        
        if (updateData.name) {
          const nameExists = existingTiers.some(tier => 
            tier.id !== tierId && tier.name.toLowerCase() === updateData.name.toLowerCase()
          );
          if (nameExists) {
            throw new ConflictError('Tier name already exists for this brand');
          }
        }

        if (updateData.slug) {
          const slugExists = existingTiers.some(tier => 
            tier.id !== tierId && tier.slug.toLowerCase() === updateData.slug.toLowerCase()
          );
          if (slugExists) {
            throw new ConflictError('Tier slug already exists for this brand');
          }
        }
      }

      // Validate point ranges if they're being updated
      if (updateData.min_points_required !== undefined || updateData.max_points_required !== undefined) {
        const tierDataForValidation = {
          ...existingTier,
          ...updateData
        };
        await this.validatePointRanges(tierDataForValidation, brandId, tierId);
      }

      // Prepare update data
      const dataToUpdate = {
        ...updateData,
        updated_by: userId
      };

      // Update tier
      const updatedTier = await this.memberRepository.updateMembershipTier(tierId, dataToUpdate);

      // Log audit trail
      await this.auditLogRepository.create({
        action: AUDIT_ACTIONS.TIER_UPDATED,
        resource_type: 'membership_tier',
        resource_id: tierId,
        user_id: userId,
        brand_id: brandId,
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          changes: updateData,
          previousData: existingTier
        }
      });

      logger.info('Tier updated successfully', {
        tierId,
        brandId,
        updatedBy: userId,
        changes: Object.keys(updateData)
      });

      return updatedTier;
    } catch (error) {
      logger.error('Update tier failed', {
        error: error.message,
        tierId,
        updateData,
        brandId,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete tier
   * @param {string} tierId - Tier ID
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID deleting the tier
   * @param {object} context - Request context
   * @returns {boolean} - Success status
   */
  async deleteTier(tierId, brandId, userId, context = {}) {
    try {
      // Get existing tier
      const tier = await this.getTierById(tierId, brandId);

      // Check if tier has members
      const memberCount = await this.memberRepository.countMembersByTier(tierId);
      if (memberCount > 0) {
        throw new ConflictError(`Cannot delete tier with ${memberCount} members. Please reassign members first.`);
      }

      // Soft delete the tier
      await this.memberRepository.updateMembershipTier(tierId, {
        status: TIER_STATUS.ARCHIVED,
        updated_by: userId
      });

      // Log audit trail
      await this.auditLogRepository.create({
        action: AUDIT_ACTIONS.TIER_DELETED,
        resource_type: 'membership_tier',
        resource_id: tierId,
        user_id: userId,
        brand_id: brandId,
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          tierName: tier.name,
          tierSlug: tier.slug
        }
      });

      logger.info('Tier deleted successfully', {
        tierId,
        tierName: tier.name,
        brandId,
        deletedBy: userId
      });

      return true;
    } catch (error) {
      logger.error('Delete tier failed', {
        error: error.message,
        tierId,
        brandId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get tier statistics
   * @param {string} tierId - Tier ID
   * @param {string} brandId - Brand ID
   * @returns {object} - Tier statistics
   */
  async getTierStatistics(tierId, brandId) {
    try {
      const tier = await this.getTierById(tierId, brandId);
      
      const [memberCount, recentUpgrades, averagePoints] = await Promise.all([
        this.memberRepository.countMembersByTier(tierId),
        this.memberRepository.getRecentTierUpgrades(tierId, 30), // Last 30 days
        this.memberRepository.getAveragePointsByTier(tierId)
      ]);

      return {
        tier_info: {
          id: tier.id,
          name: tier.name,
          slug: tier.slug,
          point_range: `${tier.min_points_required}-${tier.max_points_required || '∞'}`
        },
        member_count: memberCount,
        recent_upgrades: recentUpgrades.length,
        average_points: Math.round(averagePoints || 0),
        upgrade_trend: recentUpgrades
      };
    } catch (error) {
      logger.error('Get tier statistics failed', {
        error: error.message,
        tierId,
        brandId
      });
      throw error;
    }
  }

  /**
   * Create default tiers for a brand
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID creating the tiers
   * @param {object} context - Request context
   * @returns {array} - Created tiers
   */
  async createDefaultTiers(brandId, userId, context = {}) {
    try {
      // Check if tiers already exist
      const existingTiers = await this.memberRepository.getMembershipTiers(brandId);
      if (existingTiers.length > 0) {
        throw new ConflictError('Tiers already exist for this brand');
      }

      // Execute the database function to create default tiers
      await this.memberRepository.createDefaultTiersForBrand(brandId, userId);

      // Get the created tiers
      const createdTiers = await this.memberRepository.getMembershipTiers(brandId);

      // Log audit trail
      await this.auditLogRepository.create({
        action: AUDIT_ACTIONS.DEFAULT_TIERS_CREATED,
        resource_type: 'membership_tier',
        resource_id: brandId,
        user_id: userId,
        brand_id: brandId,
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          tierCount: createdTiers.length,
          tierNames: createdTiers.map(t => t.name)
        }
      });

      logger.info('Default tiers created successfully', {
        brandId,
        tierCount: createdTiers.length,
        createdBy: userId
      });

      return createdTiers;
    } catch (error) {
      logger.error('Create default tiers failed', {
        error: error.message,
        brandId,
        userId
      });
      throw error;
    }
  }

  /**
   * Validate point ranges don't overlap
   * @private
   */
  async validatePointRanges(tierData, brandId, excludeTierId = null) {
    const existingTiers = await this.memberRepository.getMembershipTiers(brandId, { includeInactive: true });
    
    const { min_points_required, max_points_required } = tierData;
    
    for (const existingTier of existingTiers) {
      if (excludeTierId && existingTier.id === excludeTierId) continue;
      
      const existingMin = existingTier.min_points_required;
      const existingMax = existingTier.max_points_required;
      
      // Check for overlaps
      const hasOverlap = (
        (min_points_required >= existingMin && 
         (existingMax === null || min_points_required <= existingMax)) ||
        (max_points_required !== null && max_points_required >= existingMin && 
         (existingMax === null || max_points_required <= existingMax)) ||
        (min_points_required <= existingMin && 
         (max_points_required === null || max_points_required >= existingMax))
      );
      
      if (hasOverlap) {
        throw new ValidationError(
          `Point range overlaps with existing tier "${existingTier.name}" (${existingMin}-${existingMax || '∞'})`
        );
      }
    }
  }

  /**
   * Get next sort order for a brand
   * @private
   */
  async getNextSortOrder(brandId) {
    const tiers = await this.memberRepository.getMembershipTiers(brandId, { includeInactive: true });
    const maxSortOrder = Math.max(...tiers.map(t => t.sort_order), -1);
    return maxSortOrder + 1;
  }
}

module.exports = TierService;