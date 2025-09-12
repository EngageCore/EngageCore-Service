/**
 * Brand Service
 * Handles brand management business logic
 */

const { BrandRepository } = require('../repositories');
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
   * Update brand settings
   * @param {string} brandId - Brand ID
   * @param {object} settings - Settings to update
   * @param {string} userId - User ID updating settings
   * @param {object} context - Request context
   * @returns {object} - Updated settings
   */
  async updateBrandSettings(brandId, settings, userId, context = {}) {
    try {

      // Merge with existing settings
      const updatedSettings = {
        ...existingBrand.settings,
        ...settings
      };

      // Update brand settings
      const updatedBrand = await this.brandRepository.updateSettings(brandId, updatedSettings);

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
        limit = 100,
        search,
        status,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;


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

      const result = await this.brandRepository.findWithSearch(queryOptions);

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
}

module.exports = BrandService;