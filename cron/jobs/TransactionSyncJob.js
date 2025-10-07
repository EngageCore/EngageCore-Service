const cron = require('node-cron');
const { brandService, memberService, transactionService, externalApiService } =  require('../services');
const { Pool } = require('pg');
const config = require('../config');



// Create pool for job logging
const pool = new Pool(config.database);

const getSystemContext = () => {
  return {
    ip: 'cron-job',
    userAgent: 'Transaction Sync Cron Job'
  };
};


class TransactionSyncJob {
  constructor() {
    this.isRunning = false;
    this.jobConfig = config.cron.jobs.transactionSync;
    this.lastRun = null;
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalProcessed: 0,
      totalErrors: 0,
      brandsProcessed: 0
    };
  }

  async syncTransactions() {
    if (this.isRunning) {
      console.log('Transaction sync is already running, skipping...');
      return { success: false, message: 'Already running' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const runId = await this.logJobStart();
    
    let totalProcessedCount = 0;
    let totalErrorCount = 0;
    let brandsProcessed = 0;
    const errors = [];
    const brandResults = [];

    try {
      console.log('🚀 Starting multi-brand transaction sync job...');
      
      // Get all brands that need syncing
      const result = await brandService.listBrands();
      const brandsToSync = result.brands;


      if (!brandsToSync || brandsToSync.length === 0) {
        console.log('ℹ️  No brands need syncing at this time');
        await this.logJobComplete(runId, 0, 0, null, Date.now() - startTime, 0);
        return { 
          success: true, 
          processed: 0, 
          errors: 0, 
          brandsProcessed: 0,
          message: 'No brands need syncing' 
        };
      }

      console.log(`📊 Processing ${brandsToSync.length} brands...`);

      // Process each brand
      for (const [index, brand] of brandsToSync.entries()) {
        let brandProcessedCount = 0;
        let brandErrorCount = 0;
        const brandStartTime = Date.now();

        try {
          console.log(`\n🏢 Processing brand ${index + 1}/${brandsToSync.length}: ${brand.name} (${brand.id})`);
          
          // Get brand's API configuration
          const apiConfig = brand.settings?.external_api || {};
          
          if (!apiConfig) {
            console.log(`Brand ${brand.name} don't have settings, skipping...`);
            continue;
          }

          const currentTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
          const queryEndDate = new Date(apiConfig.queryEndDate);

          if (currentTime < queryEndDate) {
            console.log(`⏰ Skipping brand ${brand.name}: Current time (${currentTime.toISOString()}) is before queryEndDate (${apiConfig.queryEndDate})`);
            continue;
          }

          const brandApiConfig = {
            baseUrl: apiConfig.url,
            accessId: apiConfig.accessId,
            accessToken: apiConfig.accessToken,
            queryStartDate : apiConfig.queryStartDate ,
            queryEndDate : apiConfig.queryEndDate ,
            timeout: apiConfig.timeout || config.externalApi.timeout,
            retries: apiConfig.retries || config.externalApi.retries,
            retryDelay: apiConfig.retryDelay || config.externalApi.retryDelay,
          };

          // Get transactions for this brand
          const apiResult = await externalApiService.fetchTransactions(brandApiConfig);

          if (!apiResult.success) {
            throw new Error(`API fetch failed for brand ${brand.name}: ${apiResult.error}`);
          }

          const { transactions, metadata } = apiResult;
          
          if (transactions) {

            console.log(`Processing ${transactions.length} transactions for brand ${brand.name}...`);


            for (const [txIndex, externalTransaction] of transactions.entries()) {
              try {
                console.log(` Processing transaction ${txIndex + 1}/${transactions.length} (ID: ${externalTransaction.id})`);
                
                const transformedTransaction = externalApiService.transformTransaction(externalTransaction);
                transformedTransaction.brand_id = brand.id; 
                
                // Check if transaction exists
                const existingTransaction = await transactionService.getTransactionById(transformedTransaction.reference_id,brand.id);
                
                // Check if member exists
                const existingMember = await memberService.getMemberByUserId(transformedTransaction.user_data.id,brand.id);

                if(!existingMember){
                  const memberData = {
                        user_id: transformedTransaction.user_data.id,
                        total_points_earned: 0,
                        achievements: [],
                    };
                    
                    existingMember = await memberService.createMember(
                      memberData,
                      brand.id,
                      'system', 
                      { source: 'external_api_sync' } 
                  );
                }

                transformedTransaction.member_id = existingMember.id;

                if (existingTransaction) {
                  const hasChanges = 
                    existingTransaction.status !== transformedTransaction.status 
                    
                  if (hasChanges) {
       
                    const updateData = {
                      status: transformedTransaction.status,
                      description: transformedTransaction.description,
                      

                      raw_data: {
                        merchant_id: transformedTransaction.merchant_id,
                        admin_id: transformedTransaction.admin_id,
                        details: transformedTransaction.details,
                        created_date_time: transformedTransaction.created_date_time,
                        processed_date_time: transformedTransaction.processed_date_time,
                        end_date_time: transformedTransaction.end_date_time,
                        bank_id: transformedTransaction.bank_id,
                        bank_data: transformedTransaction.bank_data,
                        user_data: transformedTransaction.user_data,
                        ...transformedTransaction.raw_data 
                      }
                    };

          
                    await transactionService.updateTransaction(
                      existingTransaction.id,
                      updateData,
                      brand.id,
                      'system',
                      {
                        ip: 'cron-job',
                        userAgent: 'Transaction Sync Cron Job',
                        source: 'external_api_sync'
                      }
                    );
                    console.log(`  ✅ Updated existing transaction: ${transformedTransaction.external_id}`);
                  } else {
                    console.log(` Transaction ${transformedTransaction.external_id} is up to date`);
                  }
                } else {
                  // Create new transaction
                  await transactionService.createTransaction(
                    transformedTransaction,
                    brand.id,
                    'system',
                    getSystemContext(),
                    existingMember
                  );
                  console.log(`  ✅ Created new transaction: ${transformedTransaction.external_id}`);
                }
                 
                brandProcessedCount++;
                totalProcessedCount++;
                
              } catch (error) {
                brandErrorCount++;
                totalErrorCount++;
                const errorMsg = `Failed to process transaction ${externalTransaction.id} for brand ${brand.name}: ${error.message}`;
                console.error(`  ❌ ${errorMsg}`);
                errors.push(errorMsg);
                
                // Continue processing other transactions
                continue;
              }
            }
          }

        try {
            const currentStartDate = new Date(brand.settings.external_api.queryStartDate);
            const currentEndDate = new Date(brand.settings.external_api.queryEndDate);
            const syncInterval = brand.settings.external_api.sync_interval || 5; // Default 5 minutes
            
            // New start time = old end time
            const newStartDate = new Date(currentEndDate);
            
            // New end time = old end time + interval (in minutes)
            const newEndDate = new Date(currentEndDate.getTime() + (syncInterval * 60 * 1000));
            
            // Format to Malaysia time: YYYY-MM-DD HH:MM:SS
            const formatDateTime = (date) => {
              const malaysiaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
              const year = malaysiaDate.getFullYear();
              const month = String(malaysiaDate.getMonth() + 1).padStart(2, '0');
              const day = String(malaysiaDate.getDate()).padStart(2, '0');
              const hours = String(malaysiaDate.getHours()).padStart(2, '0');
              const minutes = String(malaysiaDate.getMinutes()).padStart(2, '0');
              const seconds = String(malaysiaDate.getSeconds()).padStart(2, '0');
              
              return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            };
            
            const updatedSettings = {
              external_api: {
                ...brand.settings.external_api,
                queryStartDate: formatDateTime(newStartDate),
                queryEndDate: formatDateTime(newEndDate),
                last_sync_at: new Date().toISOString()
              }
            };
            
            await brandService.updateBrandSettings(brand.id, updatedSettings, 'system');
          

            console.log(`📅 Updated time window for brand ${brand.name}:`);
            console.log(`   Start: ${brand.settings.external_api.queryStartDate} → ${updatedSettings.external_api.queryStartDate}`);
            console.log(`   End: ${brand.settings.external_api.queryEndDate} → ${updatedSettings.external_api.queryEndDate}`);
            console.log(`   Interval: ${syncInterval} minutes`);
            
          } catch (error) {
            console.error(`❌ Failed to update date range for brand ${brand.name}:`, error.message);
          }
                  
          const brandDuration = Date.now() - brandStartTime;
          brandsProcessed++;
          
          console.log(` Completed brand ${brand.name}: ${brandProcessedCount} processed, ${brandErrorCount} errors in ${brandDuration}ms`);
          
          brandResults.push({
            brandId: brand.id,
            brandName: brand.name,
            processed: brandProcessedCount,
            errors: brandErrorCount,
            duration: brandDuration
          });
          
        } catch (error) {
          brandErrorCount++;
          totalErrorCount++;
          const errorMsg = `Failed to process brand ${brand.name}: ${error.message}`;
          console.error(`${errorMsg}`);
          errors.push(errorMsg);
          
          brandResults.push({
            brandId: brand.id,
            brandName: brand.name,
            processed: brandProcessedCount,
            errors: brandErrorCount + 1,
            error: error.message
          });
          
          // Continue processing other brands
          continue;
        }
      }

      const executionTime = Date.now() - startTime;
      
      // Update statistics
      this.stats.totalRuns++;
      this.stats.successfulRuns++;
      this.stats.totalProcessed += totalProcessedCount;
      this.stats.totalErrors += totalErrorCount;
      this.stats.brandsProcessed += brandsProcessed;
      
      // Log completion
      await this.logJobComplete(runId, totalProcessedCount, totalErrorCount, errors.length > 0 ? errors.join('; ') : null, executionTime, brandsProcessed);
      
      console.log(` Multi-brand transaction sync completed!`);
      console.log(`Brands processed: ${brandsProcessed}/${brandsToSync.length}`);
      console.log(` Total transactions processed: ${totalProcessedCount}, Errors: ${totalErrorCount}, Time: ${executionTime}ms`);
      
      
      return {
        success: true,
        processed: totalProcessedCount,
        errors: totalErrorCount,
        brandsProcessed,
        errorMessages: errors,
        executionTime,
        brandResults
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = `Multi-brand transaction sync failed: ${error.message}`;
      
      this.stats.totalRuns++;
      this.stats.failedRuns++;
      this.stats.totalErrors++;
      
      console.error(`${errorMessage}`);
      await this.logJobComplete(runId, totalProcessedCount, totalErrorCount, errorMessage, executionTime, brandsProcessed);
      
      return {
        success: false,
        processed: totalProcessedCount,
        errors: totalErrorCount + 1,
        brandsProcessed,
        errorMessages: [...errors, errorMessage],
        executionTime,
        brandResults
      };
    } finally {
      this.isRunning = false;
      this.lastRun = new Date().toISOString();
    }
  }

  startCronJob() {
    if (!config.cron.enabled || !this.jobConfig.enabled) {
      console.log('Transaction sync cron job is disabled');
      return;
    }

    console.log(`Scheduling transaction sync with cron: ${this.jobConfig.schedule}`);
    console.log(`Timezone: ${config.cron.timezone}`);
    
    cron.schedule(this.jobConfig.schedule, async () => {
      console.log(`Cron triggered transaction sync at ${new Date().toISOString()}`);
      
      // Set job timeout
      const timeout = setTimeout(() => {
        console.error('Job timeout reached, marking as failed');
        this.isRunning = false;
      }, this.jobConfig.timeout);

      try {
        const result = await this.syncTransactions();
        clearTimeout(timeout);
        
        if (result.success) {
          console.log(`Cron job completed: ${result.processed} processed, ${result.errors} errors`);
        } else {
          console.log(`Cron job failed: ${result.errorMessages?.join(', ')}`);
        }
      } catch (error) {
        clearTimeout(timeout);
        console.error('Unexpected error in cron job:', error);
      }
    }, {
      scheduled: true,
      timezone: config.cron.timezone
    });

    console.log('Transaction sync cron job scheduled successfully');
  }

  async logJobStart() {
    // try {
    //   const result = await db.query(`
    //     INSERT INTO cron_job_logs (job_name, status, started_at)
    //     VALUES ($1, $2, NOW())
    //     RETURNING id
    //   `, ['transaction_sync', 'started']);
      
    //   return result.rows[0].id;
    // } catch (error) {
    //   console.error('❌ Error logging job start:', error.message);
    //   return null;
    // }
  }

  async logJobComplete(logId, processed, errors, errorMessage, executionTime) {
    // if (!logId) return;
    
    // try {
    //   await db.query(`
    //     UPDATE cron_job_logs 
    //     SET status = $1, records_processed = $2, error_message = $3, 
    //         execution_time_ms = $4, finished_at = NOW()
    //     WHERE id = $5
    //   `, [
    //     errors > 0 ? 'failed' : 'success',
    //     processed,
    //     errorMessage,
    //     executionTime,
    //     logId
    //   ]);
    // } catch (error) {
    //   console.error('❌ Error logging job completion:', error.message);
    // }
  }

  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      enabled: this.jobConfig.enabled,
      schedule: this.jobConfig.schedule
    };
  }

  stop() {
    console.log('Stopping transaction sync cron job...');

  }
}

module.exports = new TransactionSyncJob();