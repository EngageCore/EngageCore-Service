/**
 * Transaction Service
 * Handles transaction management business logic
 */

const { TransactionRepository, MemberRepository, AuditLogRepository } = require('../repositories');
const { logger, constants } = require('../utils');
const { errorHandler } = require('../middleware');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = errorHandler;
const { SERVICE_ERROR_CODES } = require('../enums');
const { AUDIT_ACTIONS, TRANSACTION_TYPES, TRANSACTION_STATUS } = constants;

class TransactionService {
  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.memberRepository = new MemberRepository();
    this.auditLogRepository = new AuditLogRepository();
  }

  /**
   * Create a new transaction
   * @param {object} transactionData - Transaction creation data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID creating the transaction
   * @param {object} context - Request context
   * @returns {object} - Created transaction
   */
  async createTransaction(transactionData, brandId, userId, context = {}) {
    try {
      const { member_id, type, amount, description, reference_type, reference_id } = transactionData;

      // Validate transaction data
      this.validateTransactionData(transactionData);

      // Check if member exists
      const member = await this.memberRepository.findById(member_id);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found', 404, SERVICE_ERROR_CODES.TRANSACTION_MEMBER_NOT_FOUND);
      }

      // Check if debit would result in negative balance
      if (type === TRANSACTION_TYPES.DEBIT && member.points_balance < amount) {
        throw new ValidationError('Insufficient points balance', 400, SERVICE_ERROR_CODES.TRANSACTION_INSUFFICIENT_POINTS);
      }

      // Create transaction
      const transaction = await this.transactionRepository.create({
        ...transactionData,
        brand_id: brandId,
        status: TRANSACTION_STATUS.COMPLETED,
        created_by: userId
      });

      // Update member points balance
      const newBalance = type === TRANSACTION_TYPES.CREDIT 
        ? member.points_balance + amount
        : member.points_balance - amount;

      await this.memberRepository.updatePoints(member_id, {
        points_balance: newBalance,
        total_points_earned: type === TRANSACTION_TYPES.CREDIT 
          ? member.total_points_earned + amount
          : member.total_points_earned
      });

      // Log transaction creation
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.TRANSACTION_CREATE,
        description: 'Transaction created successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          memberId: member.member_id,
          transactionType: type,
          amount,
          newBalance,
          transactionId: transaction.id
        }
      });

      logger.logBusiness('Transaction created', {
        transactionId: transaction.id,
        memberId: member_id,
        memberIdString: member.member_id,
        type,
        amount,
        newBalance,
        createdBy: userId
      });

      return await this.transactionRepository.findWithMember(transaction.id);
    } catch (error) {
      logger.error('Transaction creation failed', {
        error: error.message,
        transactionData,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Get transaction by ID
   * @param {string} transactionId - Transaction ID
   * @param {string} brandId - Brand ID
   * @returns {object} - Transaction data
   */
  async getTransactionById(transactionId, brandId) {
    try {
      const transaction = await this.transactionRepository.findWithMember(transactionId);
      if (!transaction || transaction.brand_id !== brandId) {
        throw new NotFoundError('Transaction not found', 404, SERVICE_ERROR_CODES.TRANSACTION_NOT_FOUND);
      }

      return transaction;
    } catch (error) {
      logger.error('Get transaction failed', {
        error: error.message,
        transactionId,
        brandId
      });
      throw error;
    }
  }

  /**
   * Update transaction
   * @param {string} transactionId - Transaction ID
   * @param {object} updateData - Update data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID updating the transaction
   * @param {object} context - Request context
   * @returns {object} - Updated transaction
   */
  async updateTransaction(transactionId, updateData, brandId, userId, context = {}) {
    try {
      // Check if transaction exists
      const existingTransaction = await this.transactionRepository.findById(transactionId);
      if (!existingTransaction || existingTransaction.brand_id !== brandId) {
        throw new NotFoundError('Transaction not found', 404, SERVICE_ERROR_CODES.TRANSACTION_NOT_FOUND);
      }

      // Prevent updating completed transactions that affect balance
      if (existingTransaction.status === TRANSACTION_STATUS.COMPLETED && 
          (updateData.amount || updateData.type)) {
        throw new ValidationError('Cannot modify amount or type of completed transaction', 400, SERVICE_ERROR_CODES.TRANSACTION_CANNOT_MODIFY_COMPLETED);
      }

      // Update transaction
      const updatedTransaction = await this.transactionRepository.update(transactionId, updateData);

      // Log transaction update
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.TRANSACTION_UPDATE,
        description: 'Transaction updated successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          transactionId,
          updatedFields: Object.keys(updateData)
        }
      });

      logger.logBusiness('Transaction updated', {
        transactionId,
        updatedFields: Object.keys(updateData),
        updatedBy: userId
      });

      return await this.transactionRepository.findWithMember(transactionId);
    } catch (error) {
      logger.error('Transaction update failed', {
        error: error.message,
        transactionId,
        updateData,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * List transactions with pagination and filtering
   * @param {object} options - Query options
   * @param {string} brandId - Brand ID
   * @returns {object} - Paginated transactions list
   */
  async listTransactions(options = {}, brandId) {
    try {
      const {
        page = 1,
        limit = 10,
        member_id,
        type,
        status,
        reference_type,
        start_date,
        end_date,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        member_id,
        type,
        status,
        reference_type,
        start_date,
        end_date,
        sort_by,
        sort_order,
        brand_id: brandId
      };

      const result = await this.transactionRepository.findMany(queryOptions);

      return {
        transactions: result.transactions,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('List transactions failed', {
        error: error.message,
        options,
        brandId
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
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found', 404, SERVICE_ERROR_CODES.TRANSACTION_MEMBER_NOT_FOUND);
      }

      const {
        page = 1,
        limit = 10,
        type,
        status,
        reference_type,
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
        status,
        reference_type,
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
   * Get transaction statistics
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Transaction statistics
   */
  async getTransactionStatistics(brandId, options = {}) {
    try {
      const {
        start_date,
        end_date,
        period = 'day',
        member_id,
        type
      } = options;

      const statistics = await this.transactionRepository.getStatistics(brandId, {
        start_date,
        end_date,
        period,
        member_id,
        type
      });

      return statistics;
    } catch (error) {
      logger.error('Get transaction statistics failed', {
        error: error.message,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Get transaction trends
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {Array} - Transaction trends data
   */
  async getTransactionTrends(brandId, options = {}) {
    try {
      const {
        start_date,
        end_date,
        period = 'day',
        type
      } = options;

      const trends = await this.transactionRepository.getTrends(brandId, {
        start_date,
        end_date,
        period,
        type
      });

      return trends;
    } catch (error) {
      logger.error('Get transaction trends failed', {
        error: error.message,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Get top spending members
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {Array} - Top spending members
   */
  async getTopSpendingMembers(brandId, options = {}) {
    try {
      const {
        limit = 10,
        start_date,
        end_date,
        type = TRANSACTION_TYPES.DEBIT
      } = options;

      const topSpenders = await this.transactionRepository.getTopSpendingMembers(brandId, {
        limit: parseInt(limit),
        start_date,
        end_date,
        type
      });

      return topSpenders;
    } catch (error) {
      logger.error('Get top spending members failed', {
        error: error.message,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Get transaction type breakdown
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {Array} - Transaction type breakdown
   */
  async getTransactionTypeBreakdown(brandId, options = {}) {
    try {
      const {
        start_date,
        end_date,
        member_id
      } = options;

      const breakdown = await this.transactionRepository.getTypeBreakdown(brandId, {
        start_date,
        end_date,
        member_id
      });

      return breakdown;
    } catch (error) {
      logger.error('Get transaction type breakdown failed', {
        error: error.message,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Reverse transaction
   * @param {string} transactionId - Transaction ID
   * @param {string} reason - Reversal reason
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID reversing the transaction
   * @param {object} context - Request context
   * @returns {object} - Reversal transaction
   */
  async reverseTransaction(transactionId, reason, brandId, userId, context = {}) {
    try {
      // Check if transaction exists and can be reversed
      const originalTransaction = await this.transactionRepository.findById(transactionId);
      if (!originalTransaction || originalTransaction.brand_id !== brandId) {
        throw new NotFoundError('Transaction not found', 404, SERVICE_ERROR_CODES.TRANSACTION_NOT_FOUND);
      }

      if (originalTransaction.status !== TRANSACTION_STATUS.COMPLETED) {
        throw new ValidationError('Only completed transactions can be reversed', 400, SERVICE_ERROR_CODES.TRANSACTION_ONLY_COMPLETED_CAN_BE_REVERSED);
      }

      if (originalTransaction.reversed_at) {
        throw new ValidationError('Transaction has already been reversed', 400, SERVICE_ERROR_CODES.TRANSACTION_ALREADY_REVERSED);
      }

      // Get member
      const member = await this.memberRepository.findById(originalTransaction.member_id);
      if (!member) {
        throw new NotFoundError('Member not found', 404, SERVICE_ERROR_CODES.TRANSACTION_MEMBER_NOT_FOUND);
      }

      // Check if reversal would result in negative balance
      const reversalType = originalTransaction.type === TRANSACTION_TYPES.CREDIT 
        ? TRANSACTION_TYPES.DEBIT 
        : TRANSACTION_TYPES.CREDIT;

      if (reversalType === TRANSACTION_TYPES.DEBIT && member.points_balance < originalTransaction.amount) {
        throw new ValidationError('Insufficient points balance for reversal', 400, SERVICE_ERROR_CODES.TRANSACTION_INSUFFICIENT_POINTS_FOR_REVERSAL);
      }

      // Create reversal transaction
      const reversalTransaction = await this.transactionRepository.create({
        member_id: originalTransaction.member_id,
        brand_id: brandId,
        type: reversalType,
        amount: originalTransaction.amount,
        description: `Reversal: ${reason}`,
        reference_type: 'transaction_reversal',
        reference_id: transactionId,
        status: TRANSACTION_STATUS.COMPLETED,
        created_by: userId
      });

      // Mark original transaction as reversed
      await this.transactionRepository.update(transactionId, {
        reversed_at: new Date(),
        reversal_reason: reason,
        reversed_by: userId
      });

      // Update member points balance
      const newBalance = reversalType === TRANSACTION_TYPES.CREDIT 
        ? member.points_balance + originalTransaction.amount
        : member.points_balance - originalTransaction.amount;

      await this.memberRepository.updatePoints(originalTransaction.member_id, {
        points_balance: newBalance,
        total_points_earned: reversalType === TRANSACTION_TYPES.DEBIT 
          ? Math.max(0, member.total_points_earned - originalTransaction.amount)
          : member.total_points_earned
      });

      // Log transaction reversal
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.TRANSACTION_UPDATE,
        description: 'Transaction reversed',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          originalTransactionId: transactionId,
          reversalTransactionId: reversalTransaction.id,
          reason,
          amount: originalTransaction.amount,
          memberId: member.member_id
        }
      });

      logger.logBusiness('Transaction reversed', {
        originalTransactionId: transactionId,
        reversalTransactionId: reversalTransaction.id,
        memberId: originalTransaction.member_id,
        memberIdString: member.member_id,
        amount: originalTransaction.amount,
        reason,
        reversedBy: userId
      });

      return await this.transactionRepository.findWithMember(reversalTransaction.id);
    } catch (error) {
      logger.error('Transaction reversal failed', {
        error: error.message,
        transactionId,
        reason,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Bulk create transactions
   * @param {Array} transactionsData - Array of transaction data
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID creating transactions
   * @param {object} context - Request context
   * @returns {object} - Creation results
   */
  async bulkCreateTransactions(transactionsData, brandId, userId, context = {}) {
    try {
      const results = {
        total: transactionsData.length,
        created: 0,
        errors: []
      };

      for (let i = 0; i < transactionsData.length; i++) {
        try {
          await this.createTransaction(transactionsData[i], brandId, userId, context);
          results.created++;
        } catch (error) {
          results.errors.push({
            index: i,
            error: error.message,
            data: transactionsData[i]
          });
        }
      }

      logger.logBusiness('Transactions bulk created', {
        brandId,
        results,
        createdBy: userId
      });

      return results;
    } catch (error) {
      logger.error('Bulk transaction creation failed', {
        error: error.message,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Export transactions data
   * @param {object} options - Export options
   * @param {string} brandId - Brand ID
   * @returns {Array} - Transactions data for export
   */
  async exportTransactions(options = {}, brandId) {
    try {
      const {
        format = 'csv',
        member_id,
        type,
        status,
        start_date,
        end_date,
        fields = ['id', 'member_id', 'type', 'amount', 'description', 'status', 'created_at']
      } = options;

      const queryOptions = {
        brand_id: brandId,
        member_id,
        type,
        status,
        start_date,
        end_date,
        limit: 10000 // Large limit for export
      };

      const result = await this.transactionRepository.findMany(queryOptions);
      
      // Filter fields for export
      const exportData = result.transactions.map(transaction => {
        const filteredTransaction = {};
        fields.forEach(field => {
          if (transaction[field] !== undefined) {
            filteredTransaction[field] = transaction[field];
          }
        });
        return filteredTransaction;
      });

      logger.logBusiness('Transactions exported', {
        brandId,
        count: exportData.length,
        format
      });

      return exportData;
    } catch (error) {
      logger.error('Transaction export failed', {
        error: error.message,
        options,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get member points balance
   * @param {string} memberId - Member ID
   * @param {string} brandId - Brand ID
   * @returns {object} - Member points balance
   */
  async getMemberPointsBalance(memberId, brandId) {
    try {
      // Check if member exists
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found', 404, SERVICE_ERROR_CODES.TRANSACTION_MEMBER_NOT_FOUND);
      }

      return {
        member_id: member.member_id,
        points_balance: member.points_balance,
        total_points_earned: member.total_points_earned,
        last_transaction_at: member.last_transaction_at
      };
    } catch (error) {
      logger.error('Get member points balance failed', {
        error: error.message,
        memberId,
        brandId
      });
      throw error;
    }
  }

  /**
   * Validate transaction amount
   * @param {string} memberId - Member ID
   * @param {number} amount - Transaction amount
   * @param {string} type - Transaction type
   * @param {string} brandId - Brand ID
   * @returns {object} - Validation result
   */
  async validateTransactionAmount(memberId, amount, type, brandId) {
    try {
      // Check if member exists
      const member = await this.memberRepository.findById(memberId);
      if (!member || member.brand_id !== brandId) {
        throw new NotFoundError('Member not found', 404, SERVICE_ERROR_CODES.TRANSACTION_MEMBER_NOT_FOUND);
      }

      const validation = {
        valid: true,
        message: null,
        current_balance: member.points_balance
      };

      if (type === TRANSACTION_TYPES.DEBIT && member.points_balance < amount) {
        validation.valid = false;
        validation.message = 'Insufficient points balance';
      }

      return validation;
    } catch (error) {
      logger.error('Transaction amount validation failed', {
        error: error.message,
        memberId,
        amount,
        type,
        brandId
      });
      throw error;
    }
  }

  /**
   * Get pending transactions
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Pending transactions
   */
  async getPendingTransactions(brandId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        member_id,
        sort_by = 'created_at',
        sort_order = 'asc'
      } = options;

      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        member_id,
        status: TRANSACTION_STATUS.PENDING,
        sort_by,
        sort_order,
        brand_id: brandId
      };

      const result = await this.transactionRepository.findMany(queryOptions);

      return {
        transactions: result.transactions,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Get pending transactions failed', {
        error: error.message,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Process pending transaction
   * @param {string} transactionId - Transaction ID
   * @param {string} action - Action to take (approve/reject)
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID processing the transaction
   * @param {object} context - Request context
   * @returns {object} - Processed transaction
   */
  async processPendingTransaction(transactionId, action, brandId, userId, context = {}) {
    try {
      // Check if transaction exists and is pending
      const transaction = await this.transactionRepository.findById(transactionId);
      if (!transaction || transaction.brand_id !== brandId) {
        throw new NotFoundError('Transaction not found', 404, SERVICE_ERROR_CODES.TRANSACTION_NOT_FOUND);
      }

      if (transaction.status !== TRANSACTION_STATUS.PENDING) {
        throw new ValidationError('Transaction is not pending', 400, SERVICE_ERROR_CODES.TRANSACTION_NOT_PENDING);
      }

      let updatedTransaction;
      if (action === 'approve') {
        // Get member and validate balance for debits
        const member = await this.memberRepository.findById(transaction.member_id);
        if (transaction.type === TRANSACTION_TYPES.DEBIT && member.points_balance < transaction.amount) {
          throw new ValidationError('Insufficient points balance', 400, SERVICE_ERROR_CODES.TRANSACTION_INSUFFICIENT_POINTS);
        }

        // Approve transaction
        updatedTransaction = await this.transactionRepository.update(transactionId, {
          status: TRANSACTION_STATUS.COMPLETED,
          processed_at: new Date(),
          processed_by: userId
        });

        // Update member balance
        const newBalance = transaction.type === TRANSACTION_TYPES.CREDIT 
          ? member.points_balance + transaction.amount
          : member.points_balance - transaction.amount;

        await this.memberRepository.updatePoints(transaction.member_id, {
          points_balance: newBalance,
          total_points_earned: transaction.type === TRANSACTION_TYPES.CREDIT 
            ? member.total_points_earned + transaction.amount
            : member.total_points_earned
        });
      } else if (action === 'reject') {
        // Reject transaction
        updatedTransaction = await this.transactionRepository.update(transactionId, {
          status: TRANSACTION_STATUS.REJECTED,
          processed_at: new Date(),
          processed_by: userId
        });
      } else {
        throw new ValidationError('Invalid action. Must be approve or reject', 400, SERVICE_ERROR_CODES.TRANSACTION_INVALID_ACTION);
      }

      // Log transaction processing
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.TRANSACTION_UPDATE,
        description: `Transaction ${action}d`,
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          transactionId,
          action,
          amount: transaction.amount
        }
      });

      logger.logBusiness('Transaction processed', {
        transactionId,
        action,
        amount: transaction.amount,
        processedBy: userId
      });

      return await this.transactionRepository.findWithMember(transactionId);
    } catch (error) {
      logger.error('Transaction processing failed', {
        error: error.message,
        transactionId,
        action,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Get transaction summary
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} - Transaction summary
   */
  async getTransactionSummary(brandId, options = {}) {
    try {
      const {
        start_date,
        end_date,
        member_id
      } = options;

      const summary = await this.transactionRepository.getSummary(brandId, {
        start_date,
        end_date,
        member_id
      });

      return summary;
    } catch (error) {
      logger.error('Get transaction summary failed', {
        error: error.message,
        brandId,
        options
      });
      throw error;
    }
  }

  /**
   * Validate transaction data
   * @param {object} transactionData - Transaction data to validate
   */
  validateTransactionData(transactionData) {
    const { member_id, type, amount, description } = transactionData;

    if (!member_id) {
      throw new ValidationError('Member ID is required', 400, SERVICE_ERROR_CODES.TRANSACTION_MEMBER_ID_REQUIRED);
    }

    if (!type || !Object.values(TRANSACTION_TYPES).includes(type)) {
      throw new ValidationError('Valid transaction type is required', 400, SERVICE_ERROR_CODES.TRANSACTION_VALID_TYPE_REQUIRED);
    }

    if (!amount || amount <= 0) {
      throw new ValidationError('Amount must be greater than 0', 400, SERVICE_ERROR_CODES.TRANSACTION_AMOUNT_MUST_BE_POSITIVE);
    }

    if (!description || description.trim().length === 0) {
      throw new ValidationError('Description is required', 400, SERVICE_ERROR_CODES.TRANSACTION_DESCRIPTION_REQUIRED);
    }
  }
}

module.exports = TransactionService;