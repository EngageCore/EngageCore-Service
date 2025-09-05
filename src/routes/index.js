/**
 * Routes Index
 * Main router configuration that combines all route modules
 */

const express = require('express');
const authRoutes = require('./auth');
// Portal routes
const adminPortalRoutes = require('./adminPortal');
const memberPortalRoutes = require('./memberPortal');
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
      admin: '/api/admin',
      member: '/api/member',
      health: '/api/health'
    },
    documentation: '/api/docs',
    timestamp: new Date().toISOString()
  }, 'Welcome to Engage Service API');
});

// Authentication routes
router.use('/auth', authRoutes);

// =============================================================================
// NEW PORTAL ROUTES - Primary access points
// =============================================================================

// Admin Portal routes - Back office access
router.use('/admin', adminPortalRoutes);

// Member Portal routes - Member-facing access
router.use('/member', memberPortalRoutes);

// Legacy routes have been removed - use /api/admin/* and /api/member/* instead

// 404 handler for undefined routes
router.use('*', (req, res) => {
  response.error(res, 'Route not found', {
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  }, 404);
});

// Error handling middleware (should be last)
router.use(errorHandler.errorHandler);

module.exports = router;