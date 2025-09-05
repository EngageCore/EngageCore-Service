/**
 * Routes Index
 * Main router configuration that combines all route modules
 */

const express = require('express');
const authRoutes = require('./auth');
const brandRoutes = require('./brands');
const memberRoutes = require('./members');
const tierRoutes = require('./tiers');
const wheelRoutes = require('./wheels');
const missionRoutes = require('./missions');
const transactionRoutes = require('./transactions');
const userRoutes = require('./users');
const adminRoutes = require('./admin');
const { errorHandler } = require('../middleware');
const { response } = require('../utils');

const router = express.Router();

/**
 * Health Check Route
 * @route   GET /api/health
 * @desc    API health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  response.success(res, {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  }, 'API is healthy');
});

/**
 * API Information Route
 * @route   GET /api
 * @desc    API information and available endpoints
 * @access  Public
 */
router.get('/', (req, res) => {
  response.success(res, {
    name: 'Engage Service API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Customer engagement and loyalty platform API',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      brands: '/api/brands',
      users: '/api/users',
      admin: '/api/admin',
      health: '/api/health',
      tiers: '/api/brands/:brandId/tiers'
    },
    documentation: '/api/docs',
    timestamp: new Date().toISOString()
  }, 'Welcome to Engage Service API');
});

// Authentication routes
router.use('/auth', authRoutes);

// User management routes (Super Admin only)
router.use('/users', userRoutes);

// Admin routes (Super Admin only)
router.use('/admin', adminRoutes);

// Brand routes with nested resources
router.use('/brands', brandRoutes);

// Brand-specific nested routes
// These routes are mounted under /api/brands/:brandId
router.use('/brands/:brandId/members', memberRoutes);
router.use('/brands/:brandId/tiers', tierRoutes);
router.use('/brands/:brandId/wheels', wheelRoutes);
router.use('/brands/:brandId/missions', missionRoutes);
router.use('/brands/:brandId/transactions', transactionRoutes);

// 404 handler for undefined routes
router.use('*', (req, res) => {
  response.error(res, 'Route not found', 404, {
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (should be last)
router.use(errorHandler.handle);

module.exports = router;