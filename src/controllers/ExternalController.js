/**
 * External Controller
 * Handles external API integration HTTP requests
 */

const { ExternalService } = require('../services/ExternalApiService');
const { response, logger } = require('../utils');
const { asyncHandler } = require('../middleware/errorHandler');

class ExternalController {
  constructor() {
    this.externalService = new ExternalService();
  }

  /**
   * Sync all users from external API
   * POST /api/brands/:brandId/external/sync-users
   */
  syncUsers = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.body || {};
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    logger.info('Starting user sync from external API', {
      brandId,
      triggeredBy: userId,
      options
    });

    const result = await this.externalService.getAllUsers(brandId);

    logger.info('User sync completed', {
      brandId,
      result,
      triggeredBy: userId
    });

    return response.success(res, {
      message: 'User sync completed successfully',
      data: result
    });
  });

  /**
   * Sync all promotions from external API
   * POST /api/brands/:brandId/external/sync-promotions
   */
  syncPromotions = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const options = req.body || {};
    const userId = req.user.id;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    logger.info('Starting promotion sync from external API', {
      brandId,
      triggeredBy: userId,
      options
    });

    const result = await this.externalService.getPromotionList(brandId);

    logger.info('Promotion sync completed', {
      brandId,
      result,
      triggeredBy: userId
    });

    return response.success(res, {
      message: 'Promotion sync completed successfully',
      data: result
    });
  });

}

module.exports = new ExternalController();