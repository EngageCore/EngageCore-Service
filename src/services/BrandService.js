/**
 * Brand Service
 * Handles brand management business logic
 */

const { BrandRepository, UserRepository, AuditLogRepository } = require('../repositories');
const { logger, constants, encryption } = require('../utils');
const { errorHandler } = require('../middleware');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = errorHandler;
const { SERVICE_ERROR_CODES } = require('../enums');
const { AUDIT_ACTIONS, BRAND_STATUS } = constants;

class BrandService {
  constructor() {
    this.brandRepository = new BrandRepository();
    this.userRepository = new UserRepository();
    this.auditLogRepository = new AuditLogRepository();
  }

  /**
   * Create a new brand
   * @param {object} brandData - Brand creation data
   * @param {string} userId - User ID creating the brand
   * @param {object} context - Request context
   * @returns {object} - Created brand
   */
  async createBrand(brandData, userId, context = {}) {
    try {
      // Check if slug is available
      const isSlugAvailable = await this.brandRepository.isSlugAvailable(brandData.slug);
      if (!isSlugAvailable) {
        throw new ConflictError('Brand slug is already taken', 409, SERVICE_ERROR_CODES.BRAND_SLUG_ALREADY_TAKEN);
      }

      // Generate API key for the brand
      const apiKey = encryption.generateApiKey();
      const apiKeyHash = await encryption.hashApiKey(apiKey);

      // Prepare brand data with defaults
      const brandToCreate = {
        ...brandData,
        api_key_hash: apiKeyHash,
        status: BRAND_STATUS.ACTIVE,
        created_by: userId,
        settings: {
          wheel: {
            max_spins_per_day: 3,
            cooldown_minutes: 60,
            require_login: true,
            show_probabilities: false,
            ...brandData.settings?.wheel
          },
          mission: {
            auto_assign: true,
            completion_notification: true,
            reward_multiplier: 1.0,
            max_active_missions: 5,
            ...brandData.settings?.mission
          },
          point: {
            currency_name: 'Points',
            currency_symbol: 'P',
            exchange_rate: 1.0,
            min_redemption: 100,
            max_balance: 100000,
            expiry_months: 12,
            ...brandData.settings?.point
          },
          notification: {
            email_enabled: true,
            sms_enabled: false,
            push_enabled: true,
            marketing_enabled: true,
            ...brandData.settings?.notification
          },
          theme: {
            primary_color: '#007bff',
            secondary_color: '#6c757d',
            accent_color: '#28a745',
            background_color: '#ffffff',
            text_color: '#212529',
            font_family: 'Inter, sans-serif',
            border_radius: '8px',
            ...brandData.settings?.theme
          },
          ...brandData.settings
        }
      };

      // Create brand
      const brand = await this.brandRepository.create(brandToCreate);

      // Log brand creation
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brand.id,
        action: AUDIT_ACTIONS.BRAND_CREATE,
        description: 'Brand created successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          brandName: brand.name,
          brandSlug: brand.slug
        }
      });

      logger.logBusiness('Brand created', {
        brandId: brand.id,
        brandName: brand.name,
        createdBy: userId
      });

      // Return brand with API key (only shown once)
      return {
        ...brand,
        api_key: apiKey // Only returned on creation
      };
    } catch (error) {
      logger.error('Brand creation failed', {
        error: error.message,
        brandData: { ...brandData, settings: '[REDACTED]' },
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Get brand by ID
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID requesting the brand
   * @returns {object} - Brand data
   */
  async getBrandById(brandId, userId) {
    try {
      const brand = await this.brandRepository.findById(brandId);
      if (!brand) {
        throw new NotFoundError('Brand not found', 404, SERVICE_ERROR_CODES.BRAND_NOT_FOUND);
      }

      // Check if user has access to this brand
      const hasAccess = await this.userRepository.hasAccessToBrand(userId, brandId);
      if (!hasAccess) {
        throw new AuthorizationError('Access denied to this brand', 403, SERVICE_ERROR_CODES.BRAND_ACCESS_DENIED);
      }

      // Remove sensitive data
      const { api_key_hash, ...brandResponse } = brand;
      return brandResponse;
    } catch (error) {
      logger.error('Get brand failed', {
        error: error.message,
        brandId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get brand by slug
   * @param {string} slug - Brand slug
   * @returns {object} - Public brand data
   */
  async getBrandBySlug(slug) {
    try {
      const brand = await this.brandRepository.findBySlug(slug);
      if (!brand) {
        throw new NotFoundError('Brand not found', 404, SERVICE_ERROR_CODES.BRAND_NOT_FOUND);
      }

      if (brand.status !== BRAND_STATUS.ACTIVE) {
        throw new NotFoundError('Brand is not available', 404, SERVICE_ERROR_CODES.BRAND_NOT_AVAILABLE);
      }

      // Return only public brand data
      return {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        website_url: brand.website_url,
        logo_url: brand.logo_url,
        primary_color: brand.primary_color,
        settings: {
          theme: brand.settings?.theme || {},
          point: {
            currency_name: brand.settings?.point?.currency_name || 'Points',
            currency_symbol: brand.settings?.point?.currency_symbol || 'P'
          }
        }
      };
    } catch (error) {
      logger.error('Get brand by slug failed', {
        error: error.message,
        slug
      });
      throw error;
    }
  }

  /**
   * Update brand
   * @param {string} brandId - Brand ID
   * @param {object} updateData - Update data
   * @param {string} userId - User ID updating the brand
   * @param {object} context - Request context
   * @returns {object} - Updated brand
   */
  async updateBrand(brandId, updateData, userId, context = {}) {
    try {
      // Check if brand exists and user has access
      const existingBrand = await this.brandRepository.findById(brandId);
      if (!existingBrand) {
        throw new NotFoundError('Brand not found', 404, SERVICE_ERROR_CODES.BRAND_NOT_FOUND);
      }

      const hasAccess = await this.userRepository.hasAccessToBrand(userId, brandId);
      if (!hasAccess) {
        throw new AuthorizationError('Access denied to this brand', 403, SERVICE_ERROR_CODES.BRAND_ACCESS_DENIED);
      }

      // Check slug availability if slug is being updated
      if (updateData.slug && updateData.slug !== existingBrand.slug) {
        const isSlugAvailable = await this.brandRepository.isSlugAvailable(updateData.slug, brandId);
        if (!isSlugAvailable) {
          throw new ConflictError('Brand slug is already taken', 409, SERVICE_ERROR_CODES.BRAND_SLUG_ALREADY_TAKEN);
        }
      }

      // Update brand
      const updatedBrand = await this.brandRepository.update(brandId, updateData);

      // Log brand update
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.BRAND_UPDATE,
        description: 'Brand updated successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          updatedFields: Object.keys(updateData),
          brandName: updatedBrand.name
        }
      });

      logger.logBusiness('Brand updated', {
        brandId,
        updatedFields: Object.keys(updateData),
        updatedBy: userId
      });

      // Remove sensitive data
      const { api_key_hash, ...brandResponse } = updatedBrand;
      return brandResponse;
    } catch (error) {
      logger.error('Brand update failed', {
        error: error.message,
        brandId,
        updateData: { ...updateData, settings: '[REDACTED]' },
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Update brand settings
   * @param {string} brandId - Brand ID
   * @param {object} settings - Settings to update
   * @param {string} userId - User ID updating settings
   * @param {object} context - Request context
   * @returns {object} - Updated settings
   */
  async updateBrandSettings(brandId, settings, userId, context = {}) {
    try {
      // Check if brand exists and user has access
      const existingBrand = await this.brandRepository.findById(brandId);
      if (!existingBrand) {
        throw new NotFoundError('Brand not found', 404, SERVICE_ERROR_CODES.BRAND_NOT_FOUND);
      }

      const hasAccess = await this.userRepository.hasAccessToBrand(userId, brandId);
      if (!hasAccess) {
        throw new AuthorizationError('Access denied to this brand', 403, SERVICE_ERROR_CODES.BRAND_ACCESS_DENIED);
      }

      // Merge with existing settings
      const updatedSettings = {
        ...existingBrand.settings,
        ...settings
      };

      // Update brand settings
      const updatedBrand = await this.brandRepository.updateSettings(brandId, updatedSettings);

      // Log settings update
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.BRAND_UPDATE,
        description: 'Brand settings updated',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          settingsUpdated: Object.keys(settings)
        }
      });

      logger.logBusiness('Brand settings updated', {
        brandId,
        settingsUpdated: Object.keys(settings),
        updatedBy: userId
      });

      return updatedBrand.settings;
    } catch (error) {
      logger.error('Brand settings update failed', {
        error: error.message,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * List brands with pagination and filtering
   * @param {object} options - Query options
   * @param {string} userId - User ID requesting the list
   * @returns {object} - Paginated brands list
   */
  async listBrands(options = {}, userId) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      // Get user's accessible brands
      const userBrands = await this.userRepository.getUserBrands(userId);
      const brandIds = userBrands.map(brand => brand.id);

      if (brandIds.length === 0) {
        return {
          brands: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            pages: 0
          }
        };
      }

      // Build query options
      const queryOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
        sort_by,
        sort_order,
        brand_ids: brandIds
      };

      const result = await this.brandRepository.findMany(queryOptions);

      // Remove sensitive data from each brand
      const brands = result.brands.map(brand => {
        const { api_key_hash, ...brandResponse } = brand;
        return brandResponse;
      });

      return {
        brands,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('List brands failed', {
        error: error.message,
        options,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete brand
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID deleting the brand
   * @param {object} context - Request context
   */
  async deleteBrand(brandId, userId, context = {}) {
    try {
      // Check if brand exists and user has access
      const existingBrand = await this.brandRepository.findById(brandId);
      if (!existingBrand) {
        throw new NotFoundError('Brand not found', 404, SERVICE_ERROR_CODES.BRAND_NOT_FOUND);
      }

      const hasAccess = await this.userRepository.hasAccessToBrand(userId, brandId);
      if (!hasAccess) {
        throw new AuthorizationError('Access denied to this brand', 403, SERVICE_ERROR_CODES.BRAND_ACCESS_DENIED);
      }

      // Check if brand has active data (members, wheels, etc.)
      const hasActiveData = await this.brandRepository.hasActiveData(brandId);
      if (hasActiveData) {
        throw new ValidationError('Cannot delete brand with active data. Please archive instead.', 400, SERVICE_ERROR_CODES.BRAND_CANNOT_DELETE_WITH_ACTIVE_DATA);
      }

      // Soft delete the brand
      await this.brandRepository.softDelete(brandId);

      // Log brand deletion
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.BRAND_DELETE,
        description: 'Brand deleted successfully',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          brandName: existingBrand.name,
          brandSlug: existingBrand.slug
        }
      });

      logger.logBusiness('Brand deleted', {
        brandId,
        brandName: existingBrand.name,
        deletedBy: userId
      });
    } catch (error) {
      logger.error('Brand deletion failed', {
        error: error.message,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Check slug availability
   * @param {string} slug - Slug to check
   * @param {string} excludeId - Brand ID to exclude from check
   * @returns {boolean} - Whether slug is available
   */
  async checkSlugAvailability(slug, excludeId = null) {
    try {
      return await this.brandRepository.isSlugAvailable(slug, excludeId);
    } catch (error) {
      logger.error('Slug availability check failed', {
        error: error.message,
        slug,
        excludeId
      });
      throw error;
    }
  }

  /**
   * Upload brand logo
   * @param {string} brandId - Brand ID
   * @param {object} file - Uploaded file
   * @param {string} userId - User ID uploading the logo
   * @param {object} context - Request context
   * @returns {object} - Updated brand with logo URL
   */
  async uploadLogo(brandId, file, userId, context = {}) {
    try {
      // Check if brand exists and user has access
      const existingBrand = await this.brandRepository.findById(brandId);
      if (!existingBrand) {
        throw new NotFoundError('Brand not found', 404, SERVICE_ERROR_CODES.BRAND_NOT_FOUND);
      }

      const hasAccess = await this.userRepository.hasAccessToBrand(userId, brandId);
      if (!hasAccess) {
        throw new AuthorizationError('Access denied to this brand', 403, SERVICE_ERROR_CODES.BRAND_ACCESS_DENIED);
      }

      // Generate unique filename
      const filename = `brand-${brandId}-logo-${Date.now()}.${file.originalname.split('.').pop()}`;
      const logoUrl = `/uploads/brands/${filename}`;

      // In a real application, you would upload to cloud storage here
      // For now, we'll just simulate the upload
      
      // Update brand with logo URL
      const updatedBrand = await this.brandRepository.update(brandId, {
        logo_url: logoUrl
      });

      // Log logo upload
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.BRAND_UPDATE,
        description: 'Brand logo uploaded',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          logoUrl,
          filename: file.originalname
        }
      });

      logger.logBusiness('Brand logo uploaded', {
        brandId,
        logoUrl,
        uploadedBy: userId
      });

      // Remove sensitive data
      const { api_key_hash, ...brandResponse } = updatedBrand;
      return brandResponse;
    } catch (error) {
      logger.error('Brand logo upload failed', {
        error: error.message,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }

  /**
   * Get brand statistics
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @param {string} userId - User ID requesting statistics
   * @returns {object} - Brand statistics
   */
  async getBrandStatistics(brandId, options = {}, userId) {
    try {
      // Check if brand exists and user has access
      const existingBrand = await this.brandRepository.findById(brandId);
      if (!existingBrand) {
        throw new NotFoundError('Brand not found', 404, SERVICE_ERROR_CODES.BRAND_NOT_FOUND);
      }

      const hasAccess = await this.userRepository.hasAccessToBrand(userId, brandId);
      if (!hasAccess) {
        throw new AuthorizationError('Access denied to this brand', 403, SERVICE_ERROR_CODES.BRAND_ACCESS_DENIED);
      }

      const {
        start_date,
        end_date,
        period = 'day'
      } = options;

      const statistics = await this.brandRepository.getStatistics(brandId, {
        start_date,
        end_date,
        period
      });

      return statistics;
    } catch (error) {
      logger.error('Get brand statistics failed', {
        error: error.message,
        brandId,
        options,
        userId
      });
      throw error;
    }
  }

  /**
   * Regenerate API key
   * @param {string} brandId - Brand ID
   * @param {string} userId - User ID regenerating the key
   * @param {object} context - Request context
   * @returns {string} - New API key
   */
  async regenerateApiKey(brandId, userId, context = {}) {
    try {
      // Check if brand exists and user has access
      const existingBrand = await this.brandRepository.findById(brandId);
      if (!existingBrand) {
        throw new NotFoundError('Brand not found', 404, SERVICE_ERROR_CODES.BRAND_NOT_FOUND);
      }

      const hasAccess = await this.userRepository.hasAccessToBrand(userId, brandId);
      if (!hasAccess) {
        throw new AuthorizationError('Access denied to this brand', 403, SERVICE_ERROR_CODES.BRAND_ACCESS_DENIED);
      }

      // Generate new API key
      const apiKey = encryption.generateApiKey();
      const apiKeyHash = await encryption.hashApiKey(apiKey);

      // Update brand with new API key
      await this.brandRepository.update(brandId, {
        api_key_hash: apiKeyHash
      });

      // Log API key regeneration
      await this.auditLogRepository.logUserAction({
        user_id: userId,
        brand_id: brandId,
        action: AUDIT_ACTIONS.BRAND_UPDATE,
        description: 'API key regenerated',
        ip_address: context.ip,
        user_agent: context.userAgent,
        metadata: {
          brandName: existingBrand.name
        }
      });

      logger.logSecurity('API key regenerated', {
        brandId,
        regeneratedBy: userId
      });

      return apiKey;
    } catch (error) {
      logger.error('API key regeneration failed', {
        error: error.message,
        brandId,
        userId,
        context
      });
      throw error;
    }
  }
}

module.exports = BrandService;