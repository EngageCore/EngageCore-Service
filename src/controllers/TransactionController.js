/**
 * Transaction Controller
 * Handles transaction-related HTTP requests
 */

const { TransactionService } = require('../services');
const { response, logger } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');

class TransactionController {
  constructor() {
    this.transactionService = new TransactionService();
  }

  /**
   * Create a new transaction
   * POST /api/brands/:brandId/transactions
   */
  createTransaction = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const transactionData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const transaction = await this.transactionService.createTransaction(transactionData, brandId, userId, context);

    logger.info('Transaction created successfully', {
      transactionId: transaction.id,
      memberId: transactionData.member_id,
      type: transactionData.type,
      amount: transactionData.amount,
      brandId,
      createdBy: userId
    });

    return response.success(res, {
      message: 'Transaction created successfully',
      data: { transaction }
    }, 201);
  });

  /**
   * Get transaction by ID
   * GET /api/brands/:brandId/transactions/:id
   */
  getTransactionById = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;

    const transaction = await this.transactionService.getTransactionById(id, brandId);

    return response.success(res, {
      message: 'Transaction retrieved successfully',
      data: { transaction }
    });
  });

  /**
   * Update transaction
   * PUT /api/brands/:brandId/transactions/:id
   */
  updateTransaction = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const transaction = await this.transactionService.updateTransaction(id, updateData, brandId, userId, context);

    logger.info('Transaction updated successfully', {
      transactionId: id,
      brandId,
      updatedBy: userId
    });

    return response.success(res, {
      message: 'Transaction updated successfully',
      data: { transaction }
    });
  });

  /**
   * List transactions with pagination and filtering
   * GET /api/brands/:brandId/transactions
   */
  listTransactions = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const result = await this.transactionService.listTransactions(options, brandId);

    return response.success(res, {
      message: 'Transactions retrieved successfully',
      data: result
    });
  });

  /**
   * Get member transactions
   * GET /api/brands/:brandId/members/:memberId/transactions
   */
  getMemberTransactions = asyncHandler(async (req, res) => {
    const { brandId, memberId } = req.params;
    const options = req.query;

    const result = await this.transactionService.getMemberTransactions(memberId, options, brandId);

    return response.success(res, {
      message: 'Member transactions retrieved successfully',
      data: result
    });
  });

  /**
   * Get transaction statistics
   * GET /api/brands/:brandId/transactions/statistics
   */
  getTransactionStatistics = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const statistics = await this.transactionService.getTransactionStatistics(brandId, options);

    return response.success(res, {
      message: 'Transaction statistics retrieved successfully',
      data: { statistics }
    });
  });

  /**
   * Get transaction trends
   * GET /api/brands/:brandId/transactions/trends
   */
  getTransactionTrends = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const trends = await this.transactionService.getTransactionTrends(brandId, options);

    return response.success(res, {
      message: 'Transaction trends retrieved successfully',
      data: { trends }
    });
  });

  /**
   * Get top spending members
   * GET /api/brands/:brandId/transactions/top-spenders
   */
  getTopSpendingMembers = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const topSpenders = await this.transactionService.getTopSpendingMembers(brandId, options);

    return response.success(res, {
      message: 'Top spending members retrieved successfully',
      data: { top_spenders: topSpenders }
    });
  });

  /**
   * Get transaction type breakdown
   * GET /api/brands/:brandId/transactions/type-breakdown
   */
  getTransactionTypeBreakdown = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const breakdown = await this.transactionService.getTransactionTypeBreakdown(brandId, options);

    return response.success(res, {
      message: 'Transaction type breakdown retrieved successfully',
      data: { breakdown }
    });
  });

  /**
   * Reverse transaction
   * POST /api/brands/:brandId/transactions/:id/reverse
   */
  reverseTransaction = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!reason) {
      return response.error(res, 'Reversal reason is required', 400);
    }

    const reversalTransaction = await this.transactionService.reverseTransaction(id, reason, brandId, userId, context);

    logger.info('Transaction reversed successfully', {
      originalTransactionId: id,
      reversalTransactionId: reversalTransaction.id,
      reason,
      brandId,
      reversedBy: userId
    });

    return response.success(res, {
      message: 'Transaction reversed successfully',
      data: { reversal_transaction: reversalTransaction }
    });
  });

  /**
   * Bulk create transactions
   * POST /api/brands/:brandId/transactions/bulk
   */
  bulkCreateTransactions = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { transactions } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!transactions || !Array.isArray(transactions)) {
      return response.error(res, 'Transactions array is required', 400);
    }

    const results = await this.transactionService.bulkCreateTransactions(transactions, brandId, userId, context);

    logger.info('Bulk transaction creation completed', {
      brandId,
      results,
      createdBy: userId
    });

    return response.success(res, {
      message: 'Bulk transaction creation completed',
      data: { results }
    });
  });

  /**
   * Export transactions data
   * GET /api/brands/:brandId/transactions/export
   */
  exportTransactions = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const exportData = await this.transactionService.exportTransactions(options, brandId);

    logger.info('Transactions export completed', {
      brandId,
      count: exportData.length,
      format: options.format
    });

    return response.success(res, {
      message: 'Transactions exported successfully',
      data: { 
        transactions: exportData,
        count: exportData.length,
        exported_at: new Date()
      }
    });
  });

  /**
   * Get member points balance
   * GET /api/brands/:brandId/members/:memberId/points-balance
   */
  getMemberPointsBalance = asyncHandler(async (req, res) => {
    const { brandId, memberId } = req.params;

    const balance = await this.transactionService.getMemberPointsBalance(memberId, brandId);

    return response.success(res, {
      message: 'Member points balance retrieved successfully',
      data: { balance }
    });
  });

  /**
   * Validate transaction amount
   * POST /api/brands/:brandId/transactions/validate-amount
   */
  validateTransactionAmount = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { member_id, amount, type } = req.body;

    if (!member_id || !amount || !type) {
      return response.error(res, 'Member ID, amount, and type are required', 400);
    }

    const validation = await this.transactionService.validateTransactionAmount(member_id, amount, type, brandId);

    return response.success(res, {
      message: 'Transaction amount validation completed',
      data: { validation }
    });
  });

  /**
   * Get pending transactions
   * GET /api/brands/:brandId/transactions/pending
   */
  getPendingTransactions = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const result = await this.transactionService.getPendingTransactions(brandId, options);

    return response.success(res, {
      message: 'Pending transactions retrieved successfully',
      data: result
    });
  });

  /**
   * Process pending transaction
   * POST /api/brands/:brandId/transactions/:id/process
   */
  processPendingTransaction = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!action || !['approve', 'reject'].includes(action)) {
      return response.error(res, 'Action must be either "approve" or "reject"', 400);
    }

    const transaction = await this.transactionService.processPendingTransaction(id, action, brandId, userId, context);

    logger.info('Pending transaction processed', {
      transactionId: id,
      action,
      brandId,
      processedBy: userId
    });

    return response.success(res, {
      message: `Transaction ${action}d successfully`,
      data: { transaction }
    });
  });

  /**
   * Get transaction summary
   * GET /api/brands/:brandId/transactions/summary
   */
  getTransactionSummary = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const summary = await this.transactionService.getTransactionSummary(brandId, options);

    return response.success(res, {
      message: 'Transaction summary retrieved successfully',
      data: { summary }
    });
  });

  /**
   * Get transaction dashboard data
   * GET /api/brands/:brandId/transactions/dashboard
   */
  getTransactionDashboard = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const [statistics, trends, summary, recentTransactions] = await Promise.all([
      this.transactionService.getTransactionStatistics(brandId, options),
      this.transactionService.getTransactionTrends(brandId, options),
      this.transactionService.getTransactionSummary(brandId, options),
      this.transactionService.listTransactions({ limit: 10, sort_order: 'desc' }, brandId)
    ]);

    const dashboard = {
      statistics,
      trends,
      summary,
      recent_transactions: recentTransactions.transactions,
      overview: {
        total_transactions: statistics.total_count || 0,
        total_credits: statistics.total_credits || 0,
        total_debits: statistics.total_debits || 0,
        net_points: (statistics.total_credits || 0) - (statistics.total_debits || 0),
        pending_transactions: statistics.pending_count || 0
      },
      last_updated: new Date()
    };

    return response.success(res, {
      message: 'Transaction dashboard data retrieved successfully',
      data: { dashboard }
    });
  });

  /**
   * Get transaction analytics
   * GET /api/brands/:brandId/transactions/analytics
   */
  getTransactionAnalytics = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.query;

    const [statistics, trends, typeBreakdown, topSpenders] = await Promise.all([
      this.transactionService.getTransactionStatistics(brandId, options),
      this.transactionService.getTransactionTrends(brandId, options),
      this.transactionService.getTransactionTypeBreakdown(brandId, options),
      this.transactionService.getTopSpendingMembers(brandId, { ...options, limit: 5 })
    ]);

    const analytics = {
      overview: {
        total_volume: statistics.total_amount || 0,
        transaction_count: statistics.total_count || 0,
        average_transaction: statistics.average_amount || 0,
        growth_rate: statistics.growth_rate || 0
      },
      trends,
      type_breakdown: typeBreakdown,
      top_spenders: topSpenders,
      insights: {
        peak_transaction_hour: statistics.peak_hour || 'N/A',
        most_active_day: statistics.most_active_day || 'N/A',
        average_daily_volume: statistics.average_daily_volume || 0
      },
      generated_at: new Date()
    };

    return response.success(res, {
      message: 'Transaction analytics retrieved successfully',
      data: { analytics }
    });
  });

  /**
   * Get member transaction history with analytics
   * GET /api/brands/:brandId/members/:memberId/transaction-analytics
   */
  getMemberTransactionAnalytics = asyncHandler(async (req, res) => {
    const { brandId, memberId } = req.params;
    const options = req.query;

    const [transactions, balance, statistics] = await Promise.all([
      this.transactionService.getMemberTransactions(memberId, { ...options, limit: 50 }, brandId),
      this.transactionService.getMemberPointsBalance(memberId, brandId),
      this.transactionService.getTransactionStatistics(brandId, { ...options, member_id: memberId })
    ]);

    const analytics = {
      member_info: {
        member_id: memberId,
        current_balance: balance.points_balance,
        total_earned: balance.total_points_earned,
        last_transaction: balance.last_transaction_at
      },
      statistics: {
        total_transactions: statistics.total_count || 0,
        total_credits: statistics.total_credits || 0,
        total_debits: statistics.total_debits || 0,
        average_transaction: statistics.average_amount || 0
      },
      recent_transactions: transactions.transactions,
      insights: {
        spending_pattern: 'Regular', // This would be calculated
        favorite_activity: 'Wheel Spins', // This would be calculated
        most_active_period: 'Evenings' // This would be calculated
      },
      generated_at: new Date()
    };

    return response.success(res, {
      message: 'Member transaction analytics retrieved successfully',
      data: { analytics }
    });
  });

  /**
   * Create adjustment transaction
   * POST /api/brands/:brandId/transactions/adjustment
   */
  createAdjustmentTransaction = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { member_id, amount, type, reason } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!member_id || !amount || !type || !reason) {
      return response.error(res, 'Member ID, amount, type, and reason are required', 400);
    }

    const transactionData = {
      member_id,
      type,
      amount,
      description: `Manual adjustment: ${reason}`,
      reference_type: 'manual_adjustment',
      reference_id: `adj_${Date.now()}`
    };

    const transaction = await this.transactionService.createTransaction(transactionData, brandId, userId, context);

    logger.info('Adjustment transaction created', {
      transactionId: transaction.id,
      memberId: member_id,
      type,
      amount,
      reason,
      brandId,
      createdBy: userId
    });

    return response.success(res, {
      message: 'Adjustment transaction created successfully',
      data: { transaction }
    }, 201);
  });

  /**
   * Get transaction audit trail
   * GET /api/brands/:brandId/transactions/:id/audit
   */
  getTransactionAuditTrail = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;

    // Verify transaction exists
    await this.transactionService.getTransactionById(id, brandId);

    // This would typically get audit trail from audit logs
    // For now, we'll return mock data
    const auditTrail = [
      {
        id: '1',
        action: 'created',
        description: 'Transaction created',
        user_id: 'user123',
        timestamp: new Date(),
        metadata: { amount: 100, type: 'credit' }
      },
      {
        id: '2',
        action: 'updated',
        description: 'Transaction description updated',
        user_id: 'user123',
        timestamp: new Date(Date.now() - 3600000),
        metadata: { field: 'description' }
      }
    ];

    return response.success(res, {
      message: 'Transaction audit trail retrieved successfully',
      data: { 
        audit_trail: auditTrail,
        transaction_id: id
      }
    });
  });
}

module.exports = new TransactionController();