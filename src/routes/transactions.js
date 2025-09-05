/**
 * Transaction Routes
 * Handles transaction-related API endpoints
 */

const express = require('express');
const { TransactionController } = require('../controllers');
const { auth, validation, rateLimit, brandContext } = require('../middleware');
const { transactionValidators } = require('../validators');

const router = express.Router({ mergeParams: true }); // mergeParams to access brandId from parent router

/**
 * @route   POST /api/brands/:brandId/transactions
 * @desc    Create a new transaction
 * @access  Private (Brand Admin)
 */
router.post('/',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.createTransactionSchema),
  TransactionController.createTransaction
);

/**
 * @route   GET /api/brands/:brandId/transactions
 * @desc    List transactions with pagination and filtering
 * @access  Private (Brand Admin)
 */
router.get('/',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.listTransactionsSchema, 'query'),
  TransactionController.listTransactions
);

/**
 * @route   POST /api/brands/:brandId/transactions/bulk
 * @desc    Bulk create transactions
 * @access  Private (Brand Admin)
 */
router.post('/bulk',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.bulkCreateTransactionsSchema),
  TransactionController.bulkCreateTransactions
);

/**
 * @route   GET /api/brands/:brandId/transactions/statistics
 * @desc    Get transaction statistics
 * @access  Private (Brand Admin)
 */
router.get('/statistics',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.getTransactionStatisticsSchema, 'query'),
  TransactionController.getTransactionStatistics
);

/**
 * @route   GET /api/brands/:brandId/transactions/trends
 * @desc    Get transaction trends
 * @access  Private (Brand Admin)
 */
router.get('/trends',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.getTransactionTrendsSchema, 'query'),
  TransactionController.getTransactionTrends
);

/**
 * @route   GET /api/brands/:brandId/transactions/top-spenders
 * @desc    Get top spending members
 * @access  Private (Brand Admin)
 */
router.get('/top-spenders',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.getTopSpendingMembersSchema, 'query'),
  TransactionController.getTopSpendingMembers
);

/**
 * @route   GET /api/brands/:brandId/transactions/type-breakdown
 * @desc    Get transaction type breakdown
 * @access  Private (Brand Admin)
 */
router.get('/type-breakdown',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.getTransactionTypeBreakdownSchema, 'query'),
  TransactionController.getTransactionTypeBreakdown
);

/**
 * @route   GET /api/brands/:brandId/transactions/pending
 * @desc    Get pending transactions
 * @access  Private (Brand Admin)
 */
router.get('/pending',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.getPendingTransactionsSchema, 'query'),
  TransactionController.getPendingTransactions
);

/**
 * @route   GET /api/brands/:brandId/transactions/summary
 * @desc    Get transaction summary
 * @access  Private (Brand Admin)
 */
router.get('/summary',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.getTransactionSummarySchema, 'query'),
  TransactionController.getTransactionSummary
);

/**
 * @route   GET /api/brands/:brandId/transactions/dashboard
 * @desc    Get transaction dashboard data
 * @access  Private (Brand Admin)
 */
router.get('/dashboard',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  TransactionController.getTransactionDashboard
);

/**
 * @route   GET /api/brands/:brandId/transactions/analytics
 * @desc    Get transaction analytics
 * @access  Private (Brand Admin)
 */
router.get('/analytics',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.getTransactionAnalyticsSchema, 'query'),
  TransactionController.getTransactionAnalytics
);

/**
 * @route   GET /api/brands/:brandId/transactions/export
 * @desc    Export transactions
 * @access  Private (Brand Admin)
 */
router.get('/export',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.exportTransactionsSchema, 'query'),
  TransactionController.exportTransactions
);

/**
 * @route   GET /api/brands/:brandId/transactions/:id
 * @desc    Get transaction by ID
 * @access  Private (Brand Admin)
 */
router.get('/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.getTransactionSchema),
  TransactionController.getTransactionById
);

/**
 * @route   PUT /api/brands/:brandId/transactions/:id
 * @desc    Update transaction
 * @access  Private (Brand Admin)
 */
router.put('/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.updateTransactionSchema),
  TransactionController.updateTransaction
);



/**
 * @route   POST /api/brands/:brandId/transactions/:id/process
 * @desc    Process pending transaction
 * @access  Private (Brand Admin)
 */
router.post('/:id/process',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.processPendingTransactionSchema),
  TransactionController.processPendingTransaction
);

/**
 * @route   GET /api/brands/:brandId/transactions/:id/audit-trail
 * @desc    Get transaction audit trail
 * @access  Private (Brand Admin)
 */
router.get('/:id/audit-trail',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  TransactionController.getTransactionAuditTrail
);

/**
 * @route   POST /api/brands/:brandId/transactions/validate-amount
 * @desc    Validate transaction amount
 * @access  Private (Brand Admin)
 */
router.post('/validate-amount',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.validateTransactionAmountSchema),
  TransactionController.validateTransactionAmount
);

/**
 * @route   POST /api/brands/:brandId/transactions/adjustment
 * @desc    Create adjustment transaction
 * @access  Private (Brand Admin)
 */
router.post('/adjustment',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.createAdjustmentTransactionSchema),
  TransactionController.createAdjustmentTransaction
);

/**
 * @route   GET /api/brands/:brandId/members/:memberId/transactions
 * @desc    Get member transactions
 * @access  Private (Brand Admin) or Public (for own transactions)
 */
router.get('/members/:memberId/transactions',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.getMemberTransactionsSchema, 'query'),
  TransactionController.getMemberTransactions
);

/**
 * @route   GET /api/brands/:brandId/members/:memberId/points-balance
 * @desc    Get member points balance
 * @access  Public (with brand context)
 */
router.get('/members/:memberId/points-balance',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.getMemberPointsBalanceSchema),
  TransactionController.getMemberPointsBalance
);

/**
 * @route   GET /api/brands/:brandId/members/:memberId/transaction-analytics
 * @desc    Get member transaction analytics
 * @access  Private (Brand Admin) or Public (for own analytics)
 */
router.get('/members/:memberId/transaction-analytics',
  brandContext.optionalBrandContext,
  rateLimit.generalRateLimit,
  validation.validate(transactionValidators.getMemberTransactionAnalyticsSchema, 'query'),
  TransactionController.getMemberTransactionAnalytics
);

module.exports = router;
