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
      // No need to fetch - just update directly
      const updatedBrand = await this.brandRepository.updateSettings(brandId, settings);
      
      if (!updatedBrand) {
        throw new Error(`Failed to update settings for brand: ${brandId}`);
      }

      logger.business('Brand settings updated', {
        brandId,
        settingsUpdated: Object.keys(settings),
        updatedBy: userId
      });

      return updatedBrand;
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
        sort_order
      };

      const result = await this.brandRepository.findWithSearch(queryOptions);

      // Remove sensitive data from each brand
      const brands = result.data.map(brand => {
        const { api_key_hash, ...brandResponse } = brand;
        return brandResponse;
      });

      return {
        brands
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

module.exports = new BrandService();