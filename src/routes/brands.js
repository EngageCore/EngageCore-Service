/**
 * Brand Routes
 * Handles brand-related API endpoints
 */

const express = require('express');
const multer = require('multer');
const { BrandController } = require('../controllers');
const { auth, validation, rateLimit, brandContext } = require('../middleware');
const { brandValidators } = require('../validators');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * @route   POST /api/brands
 * @desc    Create a new brand
 * @access  Private (Admin only)
 */
router.post('/',
  auth.authenticate,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.createBrandSchema),
  BrandController.createBrand
);

/**
 * @route   GET /api/brands
 * @desc    List brands with pagination and filtering
 * @access  Private
 */
router.get('/',
  auth.authenticate,
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.listBrandsSchema, 'query'),
  BrandController.listBrands
);

/**
 * @route   GET /api/brands/slug/:slug
 * @desc    Get brand by slug (public endpoint)
 * @access  Public
 */
router.get('/slug/:slug',
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.getBrandBySlugSchema),
  BrandController.getBrandBySlug
);

/**
 * @route   GET /api/brands/check-slug/:slug
 * @desc    Check slug availability
 * @access  Private
 */
router.get('/check-slug/:slug',
  auth.authenticate,
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.checkSlugAvailabilitySchema),
  BrandController.checkSlugAvailability
);

/**
 * @route   GET /api/brands/:id
 * @desc    Get brand by ID
 * @access  Private
 */
router.get('/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.getBrandSchema),
  BrandController.getBrandById
);

/**
 * @route   PUT /api/brands/:id
 * @desc    Update brand
 * @access  Private (Brand Admin)
 */
router.put('/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.updateBrandSchema),
  BrandController.updateBrand
);

/**
 * @route   PUT /api/brands/:id/settings
 * @desc    Update brand settings
 * @access  Private (Brand Admin)
 */
router.put('/:id/settings',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.updateBrandSettingsSchema),
  BrandController.updateBrandSettings
);

/**
 * @route   DELETE /api/brands/:id
 * @desc    Delete brand
 * @access  Private (Super Admin only)
 */
router.delete('/:id',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.deleteBrandSchema),
  BrandController.deleteBrand
);

/**
 * @route   POST /api/brands/:id/logo
 * @desc    Upload brand logo
 * @access  Private (Brand Admin)
 */
router.post('/:id/logo',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.uploadRateLimit,
  upload.single('logo'),
  validation.validate(brandValidators.uploadLogoSchema),
  BrandController.uploadLogo
);

/**
 * @route   GET /api/brands/:id/statistics
 * @desc    Get brand statistics
 * @access  Private (Brand Admin)
 */
router.get('/:id/statistics',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  validation.validate(brandValidators.getBrandStatisticsSchema),
  BrandController.getBrandStatistics
);

/**
 * @route   POST /api/brands/:id/regenerate-api-key
 * @desc    Regenerate API key
 * @access  Private (Brand Admin)
 */
router.post('/:id/regenerate-api-key',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.sensitiveSlowDown,
  BrandController.regenerateApiKey
);

/**
 * @route   GET /api/brands/:id/dashboard
 * @desc    Get brand dashboard data
 * @access  Private (Brand Admin)
 */
router.get('/:id/dashboard',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  BrandController.getBrandDashboard
);

/**
 * @route   GET /api/brands/:id/members/summary
 * @desc    Get brand members summary
 * @access  Private (Brand Admin)
 */
router.get('/:id/members/summary',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  BrandController.getBrandMembersSummary
);

/**
 * @route   GET /api/brands/:id/activity
 * @desc    Get brand activity feed
 * @access  Private (Brand Admin)
 */
router.get('/:id/activity',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  BrandController.getBrandActivity
);

/**
 * @route   GET /api/brands/:id/export
 * @desc    Export brand data
 * @access  Private (Brand Admin)
 */
router.get('/:id/export',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin', 'brand_admin']),
  rateLimit.generalRateLimit,
  BrandController.exportBrandData
);

/**
 * @route   POST /api/brands/:id/clone
 * @desc    Clone brand
 * @access  Private (Super Admin only)
 */
router.post('/:id/clone',
  auth.authenticate,
  brandContext.validateBrandOwnership,
  auth.requireRole(['super_admin']),
  rateLimit.generalRateLimit,
  BrandController.cloneBrand
);

module.exports = router;
