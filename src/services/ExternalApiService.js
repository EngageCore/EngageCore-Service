const axios = require('axios');
const { BrandRepository, MemberRepository } = require('../repositories');
const { logger, constants, encryption } = require('../utils');
const { errorHandler } = require('../middleware');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = errorHandler;
const { SERVICE_ERROR_CODES } = require('../enums');
const { AUDIT_ACTIONS, BRAND_STATUS } = constants;


class ExternalApiService {
  constructor() {
    this.brandRepository = new BrandRepository();

  }

  async getAllUsers(brandId) {
    let retries = 0;

      const brand = await this.brandRepository.findWithBrandID(brandId);
      if (!brand) {
        throw new ConflictError('Brand slug is already taken', 409, SERVICE_ERROR_CODES.BRAND_SLUG_ALREADY_TAKEN);
      }


      const brandApiConfig = {
        baseUrl: brand.url,
        accessId: brand.accessId,
        accessToken: brand.accessToken,
        timeout: brand.timeout || 500,
        retries: brand.retries || 3,
        retryDelay: brand.retryDelay || 500
      };


      try {
        console.log(`Fetching users from external API... (attempt ${retries + 1}/${maxRetries})`);
        
        const formData = new URLSearchParams();
        formData.append('accessId', brandApiConfig.accessId);
        formData.append('module', '/users/getAllUsers');
        formData.append('accessToken', brandApiConfig.accessToken);
        
        // Add optional parameters for user filtering
        if (brandApiConfig.queryStartDate) {
          formData.append('fromDate', brandApiConfig.queryStartDate);
        }
        if (brandApiConfig.queryEndDate) {
          formData.append('toDate', brandApiConfig.queryEndDate);
        }
        if (brandApiConfig.status) {
          formData.append('status', brandApiConfig.status);
        }
        if (brandApiConfig.page) {
          formData.append('page', brandApiConfig.page);
        }
        if (brandApiConfig.limit) {
          formData.append('limit', brandApiConfig.limit);
        }
        
        console.log('👥 API Request params:', Object.fromEntries(formData));
        
        const response = await axios.post(brandApiConfig.baseUrl, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'EngageCore-Cron/1.0'
          },
          timeout: brandApiConfig.timeout || 30000
        });

        console.log('API Response status:', response.status);
        console.log('API Response data status:', response.data?.status);

        if (response.data.status === 'SUCCESS') {
          const users = response.data.data.users || [];
          console.log(`Successfully fetched ${users.length} users`);
          return {
            success: true,
            users,
            metadata: {
              totalCount: response.data.data.totalCount,
              totalPage: response.data.data.totalPage,
              currentPage: response.data.data.currentPage
            }
          };
        } else {
          throw new Error(`API returned non-success status: ${response.data.status}`);
        }

      } catch (error) {
        retries++;
        console.error(`Error fetching users (attempt ${retries}):`, error.message);
        
        if (retries >= maxRetries) {
          return {
            success: false,
            error: error.message,
            users: []
          };
        }

    }
  }

  async getPromotionList(brandId) {
    let retries = 0;

    const brand = await this.brandRepository.findWithBrandID(brandId);
    if (!brand) {
      throw new ConflictError('Brand slug is already taken', 409, SERVICE_ERROR_CODES.BRAND_SLUG_ALREADY_TAKEN);
    }


    const brandApiConfig = {
      baseUrl: brand.url,
      accessId: brand.accessId,
      accessToken: brand.accessToken,
      timeout: brand.timeout || 500,
      retries: brand.retries || 3,
      retryDelay: brand.retryDelay || 500
    };


    try {
      console.log(`Fetching promotions from external API... (attempt ${retries + 1}/${maxRetries})`);
      
      const formData = new URLSearchParams();
      formData.append('accessId', brandApiConfig.accessId);
      formData.append('module', '/promotions/getPromotionList');
      formData.append('accessToken', brandApiConfig.accessToken);
      
      // Add optional parameters for promotion filtering
      if (brandApiConfig.status) {
        formData.append('status', brandApiConfig.status);
      }
      if (brandApiConfig.type) {
        formData.append('type', brandApiConfig.type);
      }
      if (brandApiConfig.page) {
        formData.append('page', brandApiConfig.page);
      }
      if (brandApiConfig.limit) {
        formData.append('limit', brandApiConfig.limit);
      }
      if (brandApiConfig.queryStartDate) {
        formData.append('startDate', brandApiConfig.queryStartDate);
      }
      if (brandApiConfig.queryEndDate) {
        formData.append('endDate', brandApiConfig.queryEndDate);
      }
      
      console.log('API Request params:', Object.fromEntries(formData));
      
      const response = await axios.post(brandApiConfig.baseUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'EngageCore-Cron/1.0'
        },
        timeout: brandApiConfig.timeout || 30000
      });

      console.log('API Response status:', response.status);
      console.log('API Response data status:', response.data?.status);

      if (response.data.status === 'SUCCESS') {
        const promotions = response.data.data.promotions || [];
        console.log(`Successfully fetched ${promotions.length} promotions`);
        return {
          success: true,
          promotions,
          metadata: {
            totalCount: response.data.data.totalCount,
            totalPage: response.data.data.totalPage,
            currentPage: response.data.data.currentPage
          }
        };
      } else {
        throw new Error(`API returned non-success status: ${response.data.status}`);
      }

    } catch (error) {
      retries++;
      console.error(`Error fetching promotions (attempt ${retries}):`, error.message);
      
      if (retries >= maxRetries) {
        return {
          success: false,
          error: error.message,
          promotions: []
        };
      }
        
    }
  }
  
  transformTransaction(externalTransaction) {
    try {
      return {
        external_id: externalTransaction.id,
        merchant_id: externalTransaction.merchantId,
        admin_id: externalTransaction.adminId,
        type: externalTransaction.type,
        details: typeof externalTransaction.details === 'string' 
          ? JSON.parse(externalTransaction.details) 
          : externalTransaction.details,
        amount: parseFloat(externalTransaction.cash),
        created_date_time: externalTransaction.createdDateTime,
        processed_date_time: externalTransaction.processedDateTime,
        end_date_time: externalTransaction.endDateTime,
        status: externalTransaction.status,
        bank_id: externalTransaction.bankId,
        bank_data: externalTransaction.bank,
        user_data: externalTransaction.user,
        raw_data: externalTransaction 
      };
    } catch (error) {
      console.error('Error transforming transaction:', error.message);
      throw new Error(`Failed to transform transaction ${externalTransaction.id}: ${error.message}`);
    }
  }

  transformUser(externalUser) {
    try {
      return {
        external_id: externalUser.id,
        username: externalUser.username,
        email: externalUser.email,
        phone: externalUser.phone,
        status: externalUser.status,
        created_date_time: externalUser.createdDateTime,
        last_login: externalUser.lastLogin,
        profile_data: externalUser.profile,
        balance: parseFloat(externalUser.balance || 0),
        kyc_status: externalUser.kycStatus,
        raw_data: externalUser
      };
    } catch (error) {
      console.error('Error transforming user:', error.message);
      throw new Error(`Failed to transform user ${externalUser.id}: ${error.message}`);
    }
  }

  transformPromotion(externalPromotion) {
    try {
      return {
        external_id: externalPromotion.id,
        title: externalPromotion.title,
        description: externalPromotion.description,
        type: externalPromotion.type,
        status: externalPromotion.status,
        start_date: externalPromotion.startDate,
        end_date: externalPromotion.endDate,
        terms_conditions: externalPromotion.termsConditions,
        bonus_amount: parseFloat(externalPromotion.bonusAmount || 0),
        min_deposit: parseFloat(externalPromotion.minDeposit || 0),
        max_bonus: parseFloat(externalPromotion.maxBonus || 0),
        wagering_requirement: parseFloat(externalPromotion.wageringRequirement || 0),
        usage_count: parseInt(externalPromotion.usageCount || 0),
        max_usage: parseInt(externalPromotion.maxUsage || 0),
        created_date_time: externalPromotion.createdDateTime,
        raw_data: externalPromotion
      };
    } catch (error) {
      console.error('Error transforming promotion:', error.message);
      throw new Error(`Failed to transform promotion ${externalPromotion.id}: ${error.message}`);
    }
  }
}

module.exports = new ExternalApiService();