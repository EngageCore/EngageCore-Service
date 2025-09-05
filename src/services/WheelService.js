/**
 * Wheel Service
 * Handles wheel and spin management business logic
 */

const { WheelRepository, MemberRepository, TransactionRepository, AuditLogRepository } = require('../repositories');
const { logger, constants, probability } = require('../utils');
const { errorHandler } = require('../middleware');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = errorHandler;
const { AUDIT_ACTIONS, TRANSACTION_TYPES, WHEEL_ITEM_TYPES, SPIN_STATUS } = constants;

class WheelService {
  constructor() {
    this.wheelRepository = new WheelRepository();
    this.memberRepository = new MemberRepository();
    this.transactionRepository = new TransactionRepository();
    this.auditLogRepository = new AuditLogRepository();
  }

  /**
   * Create a new wheel
   * @param {object} wheelData - Wheel creation data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID creating the wheel
   * @param {object} context - Request context
   * @returns {object} - Created wheel with items
   */
  async createWheel(wheelData, brandId, userId, context = {}) {
    try {
      const { items, ...wheelInfo } = wheelData;

      // Validate wheel items probabilities
      this.validateWheelProbabilities(items);

      // Create wheel
      const wheel = await this.wheelRepository.create({
        ...wheelInfo,
        brand_id: brandId,
        created_by: userId
      });

      // Create wheel items
      const wheelItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = await this.wheelItemRepository.create({
          ...items[i],
          wheel_id: wheel.id,
          position: items[i].position || i
        });
        wheelItems.push(item);
      }

      // Log wheel creation
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.WHEEL_CREATE,
        description: 'Wheel created successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          wheelName: wheel.name,
          itemCount: wheelItems.length
        }
      });

      logger.logBusiness('Wheel created', {
        wheelId: wheel.id,
        wheelName: wheel.name,
        brandId,
        itemCount: wheelItems.length,
        createdBy: userId
      });

      return {
        ...wheel,
        items: wheelItems
      };
    } catch (error) {
      logger.error('Wheel creation failed', {
        error: error.message,
        wheelData: { ...wheelData, items: '[REDACTED]' },
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Get wheel by ID with items
   * @param {string} wheelId - Wheel ID
   * @param {string} brandId - Brand ID
   * @returns {object} - Wheel with items
   */
  async getWheelById(wheelId, brandId) {
    try {
      const wheel = await this.wheelRepository.findWithItems(wheelId);
      if (!wheel || wheel.brand_id !== brandId) {
        throw new NotFoundError('Wheel not found');
      }

      return wheel;
    } catch (error) {
      logger.error('Get wheel failed', {
        error: error.message,
        wheelId,
        brandId
      });
      throw error;
    }
  }

  /**
   * Update wheel
   * @param {string} wheelId - Wheel ID
   * @param {object} updateData - Update data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID updating the wheel
   * @param {object} context - Request context
   * @returns {object} - Updated wheel
   */
  async updateWheel(wheelId, updateData, brandId, userId, context = {}) {
    try {
      // Check if wheel exists
      const existingWheel = await this.wheelRepository.findById(wheelId);
      if (!existingWheel || existingWheel.brand_id !== brandId) {
        throw new NotFoundError('Wheel not found');
      }

      // Update wheel
      const updatedWheel = await this.wheelRepository.update(wheelId, updateData);

      // Log wheel update
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.WHEEL_UPDATE,
        description: 'Wheel updated successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          wheelName: updatedWheel.name,
          updatedFields: Object.keys(updateData)
        }
      });

      logger.logBusiness('Wheel updated', {
        wheelId,
        wheelName: updatedWheel.name,
        updatedFields: Object.keys(updateData),
        updatedBy: userId
      });

      return await this.wheelRepository.findWithItems(wheelId);
    } catch (error) {
      logger.error('Wheel update failed', {
        error: error.message,
        wheelId,
        updateData,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Update wheel items
   * @param {string} wheelId - Wheel ID
   * @param {Array} items - Updated items array
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID updating items
   * @param {object} context - Request context
   * @returns {object} - Updated wheel with items
   */
  async updateWheelItems(wheelId, items, brandId, userId, context = {}) {
    try {
      // Check if wheel exists
      const existingWheel = await this.wheelRepository.findById(wheelId);
      if (!existingWheel || existingWheel.brand_id !== brandId) {
        throw new NotFoundError('Wheel not found');
      }

      // Validate wheel items probabilities
      this.validateWheelProbabilities(items);

      // Get existing items
      const existingItems = await this.wheelItemRepository.findByWheelId(wheelId);
      const existingItemIds = existingItems.map(item => item.id);

      // Process items
      const updatedItems = [];
      const itemsToCreate = [];
      const itemsToUpdate = [];
      const itemIdsToKeep = [];

      for (let i = 0; i < items.length; i++) {
        const item = { ...items[i], position: items[i].position || i };
        
        if (item.id && existingItemIds.includes(item.id)) {
          // Update existing item
          itemsToUpdate.push(item);
          itemIdsToKeep.push(item.id);
        } else {
          // Create new item
          itemsToCreate.push({ ...item, wheel_id: wheelId });
        }
      }

      // Delete items not in the new list
      const itemIdsToDelete = existingItemIds.filter(id => !itemIdsToKeep.includes(id));
      if (itemIdsToDelete.length > 0) {
        await this.wheelItemRepository.deleteMany(itemIdsToDelete);
      }

      // Update existing items
      for (const item of itemsToUpdate) {
        const updatedItem = await this.wheelItemRepository.update(item.id, item);
        updatedItems.push(updatedItem);
      }

      // Create new items
      for (const item of itemsToCreate) {
        const createdItem = await this.wheelItemRepository.create(item);
        updatedItems.push(createdItem);
      }

      // Log wheel items update
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.WHEEL_UPDATE,
        description: 'Wheel items updated',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          wheelName: existingWheel.name,
          itemsCreated: itemsToCreate.length,
          itemsUpdated: itemsToUpdate.length,
          itemsDeleted: itemIdsToDelete.length
        }
      });

      logger.logBusiness('Wheel items updated', {
        wheelId,
        wheelName: existingWheel.name,
        itemsCreated: itemsToCreate.length,
        itemsUpdated: itemsToUpdate.length,
        itemsDeleted: itemIdsToDelete.length,
        updatedBy: userId
      });

      return await this.wheelRepository.findWithItems(wheelId);
    } catch (error) {
      logger.error('Wheel items update failed', {
        error: error.message,
        wheelId,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * List wheels with pagination and filtering
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Paginated wheels list
   */
  async listWheels(options = {}, brandId) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        active,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        active,
        sort_by,
        sort_order,
        brand_id: brandId
      };

      const result = await this.wheelRepository.findMany(queryOptions);

      return {
        wheels: result.wheels,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('List wheels failed', {
        error: error.message,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Delete wheel
   * @param {string} wheelId - Wheel ID
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID deleting the wheel
   * @param {object} context - Request context
   */
  async deleteWheel(wheelId, brandId, userId, context = {}) {
    try {
      // Check if wheel exists
      const existingWheel = await this.wheelRepository.findById(wheelId);
      if (!existingWheel || existingWheel.brand_id !== brandId) {
        throw new NotFoundError('Wheel not found');
      }

      // Check if wheel has spins
      const hasSpins = await this.spinRepository.wheelHasSpins(wheelId);
      if (hasSpins) {
        throw new ValidationError('Cannot delete wheel with spin history. Please deactivate instead.');
      }

      // Delete wheel and its items
      await this.wheelRepository.delete(wheelId);

      // Log wheel deletion
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.WHEEL_DELETE,
        description: 'Wheel deleted successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          wheelName: existingWheel.name
        }
      });

      logger.logBusiness('Wheel deleted', {
        wheelId,
        wheelName: existingWheel.name,
        deletedBy: userId
      });
    } catch (error) {
      logger.error('Wheel deletion failed', {
        error: error.message,
        wheelId,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Spin wheel for member
   * @param {string} wheelId - Wheel ID
   * @param {string} memberId - Member ID
   * @param {string} brandId - Brand ID
   * @param {object} context - Request context
   * @returns {object} - Spin result
   */
  async spinWheel(wheelId, memberId, brandId, context = {}) {
    try {
      // Check if wheel exists and is active
      const wheel = await this.wheelRepository.findWithItems(wheelId);
      if (!wheel || wheel.brand_id !== brandId) {
        throw new NotFoundError('Wheel not found');
      }

      if (!wheel.active) {
        throw new ValidationError('Wheel is not active');
      }

      // Check if wheel is within active dates
      const now = new Date();
      if (wheel.start_date && now < new Date(wheel.start_date)) {
        throw new ValidationError('Wheel is not yet available');
      }
      if (wheel.end_date && now > new Date(wheel.end_date)) {
        throw new ValidationError('Wheel is no longer available');
      }

      // Check if member exists
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      // Check spin eligibility
      const eligibility = await this.checkSpinEligibility(wheelId, memberId, brandId);
      if (!eligibility.eligible) {
        throw new ValidationError(eligibility.reason);
      }

      // Select winning item using probability
      const winningItem = this.selectWinningItem(wheel.items);
      if (!winningItem) {
        throw new Error('Failed to select winning item');
      }

      // Create spin record
      const spin = await this.spinRepository.create({
        wheel_id: wheelId,
        member_id: memberId,
        brand_id: brandId,
        winning_item_id: winningItem.id,
        status: SPIN_STATUS.COMPLETED,
        ip_address: context.ip,
        user_agent: context.userAgent
      });

      // Process reward
      let transaction = null;
      if (winningItem.type === WHEEL_ITEM_TYPES.POINTS && winningItem.value > 0) {
        // Award points
        transaction = await this.transactionRepository.create({
          member_id: memberId,
          brand_id: brandId,
          type: TRANSACTION_TYPES.CREDIT,
          amount: winningItem.value,
          description: `Wheel spin reward: ${winningItem.name}`,
          reference_type: 'wheel_spin',
          reference_id: spin.id
        });

        // Update member points
        await this.memberRepository.updatePoints(memberId, {
          points_balance: member.points_balance + winningItem.value,
          total_points_earned: member.total_points_earned + winningItem.value
        });
      }

      // Log spin
      await this.auditLogRepository.logUserAction({
        user_id: null,
        brand_id: brandId,
        action: AUDIT_ACTIONS.WHEEL_SPIN,
        description: 'Wheel spun successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          wheelName: wheel.name,
          memberId: member.member_id,
          winningItem: winningItem.name,
          reward: winningItem.value,
          spinId: spin.id
        }
      });

      logger.logBusiness('Wheel spun', {
        wheelId,
        wheelName: wheel.name,
        memberId,
        memberIdString: member.member_id,
        winningItem: winningItem.name,
        reward: winningItem.value,
        spinId: spin.id
      });

      return {
        spin: {
          ...spin,
          winning_item: winningItem
        },
        transaction,
        member: {
          id: member.id,
          member_id: member.member_id,
          points_balance: member.points_balance + (winningItem.type === WHEEL_ITEM_TYPES.POINTS ? winningItem.value : 0)
        }
      };
    } catch (error) {
      logger.error('Wheel spin failed', {
        error: error.message,
        wheelId,
        memberId,
        brandId,
        context
      });
      throw error;
    }
  }

  /**
   * Check spin eligibility for member
   * @param {string} wheelId - Wheel ID
   * @param {string} memberId - Member ID
   * @param {string} brandId - Brand ID
   * @returns {object} - Eligibility result
   */
  async checkSpinEligibility(wheelId, memberId, brandId) {
    try {
      // Get wheel settings
      const wheel = await this.wheelRepository.findById(wheelId);
      if (!wheel) {
        return { eligible: false, reason: 'Wheel not found' };
      }

      // Check daily spin limit
      if (wheel.max_spins_per_day > 0) {
        const todaySpins = await this.spinRepository.getMemberDailySpinCount(memberId, wheelId);
        if (todaySpins >= wheel.max_spins_per_day) {
          return { eligible: false, reason: 'Daily spin limit reached' };
        }
      }

      // Check cooldown period
      if (wheel.cooldown_minutes > 0) {
        const lastSpin = await this.spinRepository.getMemberLastSpin(memberId, wheelId);
        if (lastSpin) {
          const cooldownEnd = new Date(lastSpin.created_at.getTime() + (wheel.cooldown_minutes * 60 * 1000));
          if (new Date() < cooldownEnd) {
            const remainingMinutes = Math.ceil((cooldownEnd - new Date()) / (60 * 1000));
            return { eligible: false, reason: `Cooldown active. Try again in ${remainingMinutes} minutes` };
          }
        }
      }

      return { eligible: true };
    } catch (error) {
      logger.error('Spin eligibility check failed', {
        error: error.message,
        wheelId,
        memberId,
        brandId
      });
      return { eligible: false, reason: 'Unable to check eligibility' };
    }
  }

  /**
   * Get spin history for wheel
   * @param {string} wheelId - Wheel ID
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Spin history
   */
  async getSpinHistory(wheelId, options = {}, brandId) {
    try {
      // Check if wheel exists
      const wheel = await this.wheelRepository.findById(wheelId);
      if (!wheel || wheel.brand_id !== brandId) {
        throw new NotFoundError('Wheel not found');
      }

      const {
        page = 1,
        limit = 10,
        start_date,
        end_date,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        wheel_id: wheelId,
        start_date,
        end_date,
        sort_by,
        sort_order
      };

      const result = await this.spinRepository.findMany(queryOptions);

      return {
        spins: result.spins,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Get spin history failed', {
        error: error.message,
        wheelId,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get member spin history
   * @param {string} memberId - Member ID
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Member spin history
   */
  async getMemberSpinHistory(memberId, options = {}, brandId) {
    try {
      // Check if member exists
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      const {
        page = 1,
        limit = 10,
        wheel_id,
        start_date,
        end_date,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        member_id: memberId,
        wheel_id,
        start_date,
        end_date,
        sort_by,
        sort_order
      };

      const result = await this.spinRepository.findMany(queryOptions);

      return {
        spins: result.spins,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Get member spin history failed', {
        error: error.message,
        memberId,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get wheel statistics
   * @param {string} wheelId - Wheel ID
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Wheel statistics
   */
  async getWheelStatistics(wheelId, options = {}, brandId) {
    try {
      // Check if wheel exists
      const wheel = await this.wheelRepository.findById(wheelId);
      if (!wheel || wheel.brand_id !== brandId) {
        throw new NotFoundError('Wheel not found');
      }

      const {
        start_date,
        end_date,
        period = 'day'
      } = options;

      const statistics = await this.wheelRepository.getStatistics(wheelId, {
        start_date,
        end_date,
        period
      });

      return statistics;
    } catch (error) {
      logger.error('Get wheel statistics failed', {
        error: error.message,
        wheelId,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get item performance statistics
   * @param {string} wheelId - Wheel ID
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {Array} - Item performance data
   */
  async getItemPerformance(wheelId, options = {}, brandId) {
    try {
      // Check if wheel exists
      const wheel = await this.wheelRepository.findById(wheelId);
      if (!wheel || wheel.brand_id !== brandId) {
        throw new NotFoundError('Wheel not found');
      }

      const {
        start_date,
        end_date
      } = options;

      const performance = await this.wheelItemRepository.getPerformanceStats(wheelId, {
        start_date,
        end_date
      });

      return performance;
    } catch (error) {
      logger.error('Get item performance failed', {
        error: error.message,
        wheelId,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get member daily spin count
   * @param {string} memberId - Member ID
   * @param {string} wheelId - Wheel ID
   * @param {string} brandId - Brand ID
   * @returns {number} - Daily spin count
   */
  async getMemberDailySpinCount(memberId, wheelId, brandId) {
    try {
      // Check if member exists
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found');
      }

      const count = await this.spinRepository.getMemberDailySpinCount(memberId, wheelId);
      return { count };
    } catch (error) {
      logger.error('Get member daily spin count failed', {
        error: error.message,
        memberId,
        wheelId,
        brandId
      });
      throw error;
    }
  }

  /**
   * Validate wheel probabilities sum to 1.0
   * @param {Array} items - Wheel items
   * @throws {ValidationError} - If probabilities don't sum to 1.0
   */
  validateWheelProbabilities(items) {
    if (!items || items.length === 0) {
      throw new ValidationError('Wheel must have at least one item');
    }

    const totalProbability = items.reduce((sum, item) => sum + (item.probability || 0), 0);
    const tolerance = 0.001; // Allow small floating point differences

    if (Math.abs(totalProbability - 1.0) > tolerance) {
      throw new ValidationError(`Wheel item probabilities must sum to 1.0 (current sum: ${totalProbability})`);
    }

    // Check individual probabilities
    for (const item of items) {
      if (!item.probability || item.probability <= 0 || item.probability > 1) {
        throw new ValidationError(`Invalid probability for item "${item.name}": ${item.probability}`);
      }
    }
  }

  /**
   * Select winning item based on probabilities
   * @param {Array} items - Wheel items
   * @returns {object} - Selected item
   */
  selectWinningItem(items) {
    if (!items || items.length === 0) {
      return null;
    }

    // Filter active items
    const activeItems = items.filter(item => item.active);
    if (activeItems.length === 0) {
      return null;
    }

    // Use probability utility to select item
    return probability.selectByProbability(activeItems, 'probability');
  }
}

module.exports = WheelService;