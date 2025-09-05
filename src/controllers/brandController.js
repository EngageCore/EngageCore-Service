/**
 * Brand Controller
 * Handles brand-related HTTP requests
 */

const { BrandService } = require('../services');
const { response, logger } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');

class BrandController {
  constructor() {
    this.brandService = new BrandService();
  }

  /**
   * Create a new brand
   * POST /api/brands
   */
  createBrand = asyncHandler(async (req, res) => {
    const brandData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const brand = await this.brandService.createBrand(brandData, userId, context);

    logger.info('Brand created successfully', {
      brandId: brand.id,
      brandName: brand.name,
      createdBy: userId
    });

    return response.success(res, {
      message: 'Brand created successfully',
      data: { brand }
    }, 201);
  });

  /**
   * Get brand by ID
   * GET /api/brands/:id
   */
  getBrandById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const brand = await this.brandService.getBrandById(id, userId);

    return response.success(res, {
      message: 'Brand retrieved successfully',
      data: { brand }
    });
  });

  /**
   * Get brand by slug (public endpoint)
   * GET /api/brands/slug/:slug
   */
  getBrandBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    const brand = await this.brandService.getBrandBySlug(slug);

    return response.success(res, {
      message: 'Brand retrieved successfully',
      data: { brand }
    });
  });

  /**
   * Update brand
   * PUT /api/brands/:id
   */
  updateBrand = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const brand = await this.brandService.updateBrand(id, updateData, userId, context);

    logger.info('Brand updated successfully', {
      brandId: id,
      updatedBy: userId
    });

    return response.success(res, {
      message: 'Brand updated successfully',
      data: { brand }
    });
  });

  /**
   * Update brand settings
   * PUT /api/brands/:id/settings
   */
  updateBrandSettings = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const settings = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const updatedSettings = await this.brandService.updateBrandSettings(id, settings, userId, context);

    logger.info('Brand settings updated successfully', {
      brandId: id,
      updatedBy: userId
    });

    return response.success(res, {
      message: 'Brand settings updated successfully',
      data: { settings: updatedSettings }
    });
  });

  /**
   * List brands with pagination and filtering
   * GET /api/brands
   */
  listBrands = asyncHandler(async (req, res) => {
    const options = req.query;
    const userId = req.user.id;

    const result = await this.brandService.listBrands(options, userId);

    return response.success(res, {
      message: 'Brands retrieved successfully',
      data: result
    });
  });

  /**
   * Delete brand
   * DELETE /api/brands/:id
   */
  deleteBrand = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    await this.brandService.deleteBrand(id, userId, context);

    logger.info('Brand deleted successfully', {
      brandId: id,
      deletedBy: userId
    });

    return response.success(res, {
      message: 'Brand deleted successfully'
    });
  });

  /**
   * Check slug availability
   * GET /api/brands/check-slug/:slug
   */
  checkSlugAvailability = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { exclude_id } = req.query;

    const available = await this.brandService.checkSlugAvailability(slug, exclude_id);

    return response.success(res, {
      message: 'Slug availability checked',
      data: { 
        slug,
        available 
      }
    });
  });

  /**
   * Upload brand logo
   * POST /api/brands/:id/logo
   */
  uploadLogo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const file = req.file;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (!file) {
      return response.error(res, 'Logo file is required', 400);
    }

    const brand = await this.brandService.uploadLogo(id, file, userId, context);

    logger.info('Brand logo uploaded successfully', {
      brandId: id,
      uploadedBy: userId
    });

    return response.success(res, {
      message: 'Logo uploaded successfully',
      data: { brand }
    });
  });

  /**
   * Get brand statistics
   * GET /api/brands/:id/statistics
   */
  getBrandStatistics = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const options = req.query;
    const userId = req.user.id;

    const statistics = await this.brandService.getBrandStatistics(id, options, userId);

    return response.success(res, {
      message: 'Brand statistics retrieved successfully',
      data: { statistics }
    });
  });

  /**
   * Regenerate API key
   * POST /api/brands/:id/regenerate-api-key
   */
  regenerateApiKey = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const apiKey = await this.brandService.regenerateApiKey(id, userId, context);

    logger.info('Brand API key regenerated', {
      brandId: id,
      regeneratedBy: userId
    });

    return response.success(res, {
      message: 'API key regenerated successfully',
      data: { 
        api_key: apiKey,
        warning: 'Please store this key securely. It will not be shown again.'
      }
    });
  });

  /**
   * Get brand dashboard data
   * GET /api/brands/:id/dashboard
   */
  getBrandDashboard = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const options = req.query;
    const userId = req.user.id;

    // Get comprehensive dashboard data
    const [statistics, brand] = await Promise.all([
      this.brandService.getBrandStatistics(id, options, userId),
      this.brandService.getBrandById(id, userId)
    ]);

    const dashboard = {
      brand: {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        status: brand.status,
        logo_url: brand.logo_url
      },
      statistics,
      last_updated: new Date()
    };

    return response.success(res, {
      message: 'Brand dashboard data retrieved successfully',
      data: { dashboard }
    });
  });

  /**
   * Get brand members summary
   * GET /api/brands/:id/members/summary
   */
  getBrandMembersSummary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify brand access
    await this.brandService.getBrandById(id, userId);

    // This would typically call a member service method
    // For now, we'll return mock data
    const summary = {
      total_members: 1250,
      active_members: 1100,
      new_members_this_month: 85,
      top_tier_members: 45,
      average_points_balance: 2500,
      total_points_issued: 3125000
    };

    return response.success(res, {
      message: 'Brand members summary retrieved successfully',
      data: { summary }
    });
  });

  /**
   * Get brand activity feed
   * GET /api/brands/:id/activity
   */
  getBrandActivity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const options = req.query;
    const userId = req.user.id;

    // Verify brand access
    await this.brandService.getBrandById(id, userId);

    // This would typically get recent activities for the brand
    // For now, we'll return mock data
    const activities = [
      {
        id: '1',
        type: 'member_joined',
        description: 'New member John Doe joined',
        timestamp: new Date(),
        metadata: { member_id: 'M123456' }
      },
      {
        id: '2',
        type: 'wheel_spin',
        description: 'Member Jane Smith won 100 points',
        timestamp: new Date(Date.now() - 3600000),
        metadata: { member_id: 'M123457', points: 100 }
      }
    ];

    return response.success(res, {
      message: 'Brand activity retrieved successfully',
      data: { 
        activities,
        pagination: {
          page: 1,
          limit: 20,
          total: activities.length,
          pages: 1
        }
      }
    });
  });

  /**
   * Export brand data
   * GET /api/brands/:id/export
   */
  exportBrandData = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { format = 'json', include = 'all' } = req.query;
    const userId = req.user.id;

    // Verify brand access
    const brand = await this.brandService.getBrandById(id, userId);

    // This would typically export comprehensive brand data
    // For now, we'll return basic brand info
    const exportData = {
      brand: {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        created_at: brand.created_at,
        settings: brand.settings
      },
      export_info: {
        exported_at: new Date(),
        exported_by: userId,
        format,
        includes: include.split(',')
      }
    };

    logger.info('Brand data exported', {
      brandId: id,
      format,
      exportedBy: userId
    });

    return response.success(res, {
      message: 'Brand data exported successfully',
      data: exportData
    });
  });

  /**
   * Clone brand
   * POST /api/brands/:id/clone
   */
  cloneBrand = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, slug } = req.body;
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Get original brand
    const originalBrand = await this.brandService.getBrandById(id, userId);

    // Create cloned brand data
    const clonedBrandData = {
      name: name || `${originalBrand.name} (Copy)`,
      slug: slug || `${originalBrand.slug}-copy`,
      description: originalBrand.description,
      website_url: originalBrand.website_url,
      contact_email: originalBrand.contact_email,
      contact_phone: originalBrand.contact_phone,
      address: originalBrand.address,
      settings: originalBrand.settings
    };

    const clonedBrand = await this.brandService.createBrand(clonedBrandData, userId, context);

    logger.info('Brand cloned successfully', {
      originalBrandId: id,
      clonedBrandId: clonedBrand.id,
      clonedBy: userId
    });

    return response.success(res, {
      message: 'Brand cloned successfully',
      data: { brand: clonedBrand }
    }, 201);
  });
}

module.exports = new BrandController();