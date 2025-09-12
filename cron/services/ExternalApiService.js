const axios = require('axios');
const config = require('../../config'); 

class ExternalApiService {
  constructor() {
    this.defaultConfig = config.externalApi;
  }

  async fetchTransactions(brandApiConfig) {
    let retries = 0;
    const maxRetries = brandApiConfig.retries || 3;

    while (retries < maxRetries) {
      try {
        console.log(`🔄 Fetching transactions from external API... (attempt ${retries + 1}/${maxRetries})`);
        
        const formData = new URLSearchParams();
        formData.append('accessId', brandApiConfig.accessId);
        formData.append('module', '/transactions/getAllTransactions');
        formData.append('accessToken', brandApiConfig.accessToken);
        
        if (brandApiConfig.queryStartDate) {
          formData.append('fromDate', brandApiConfig.queryStartDate);
        }
        if (brandApiConfig.queryEndDate) {
          formData.append('toDate', brandApiConfig.queryEndDate);
        }
        
        console.log('📡 API Request params:', Object.fromEntries(formData));
        
        const response = await axios.post(brandApiConfig.baseUrl, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'EngageCore-Cron/1.0'
          },
          timeout: brandApiConfig.timeout || 30000
        });

        console.log('📊 API Response status:', response.status);
        console.log('📊 API Response data status:', response.data?.status);

        if (response.data.status === 'SUCCESS') {
          const transactions = response.data.data.transactions || [];
          console.log(`✅ Successfully fetched ${transactions.length} transactions`);
          return {
            success: true,
            transactions,
            metadata: {
              totalCount: response.data.data.totalCount,
              totalAmount: response.data.data.totalAmount,
              totalPage: response.data.data.totalPage,
              totalDeposit: response.data.data.totalDeposit,
              netDeposit: response.data.data.netDeposit
            }
          };
        } else {
          throw new Error(`API returned non-success status: ${response.data.status}`);
        }

      } catch (error) {
        retries++;
        console.error(`❌ Error fetching transactions (attempt ${retries}):`, error.message);
        
        if (retries >= maxRetries) {
          return {
            success: false,
            error: error.message,
            transactions: []
          };
        }
        

        const retryDelay = brandApiConfig.retryDelay || 1000;
        console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
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
      console.error('❌ Error transforming transaction:', error.message);
      throw new Error(`Failed to transform transaction ${externalTransaction.id}: ${error.message}`);
    }
  }
}

module.exports = new ExternalApiService();