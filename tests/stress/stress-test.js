/**
 * Custom Node.js Stress Test Script
 * Performs comprehensive load testing with detailed metrics and monitoring
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  testDuration: parseInt(process.env.TEST_DURATION) || 300, // 5 minutes
  maxConcurrentUsers: parseInt(process.env.MAX_CONCURRENT_USERS) || 1000,
  rampUpTime: parseInt(process.env.RAMP_UP_TIME) || 60, // 1 minute
  reportInterval: 10, // seconds
  outputDir: path.join(__dirname, 'reports'),
  testScenarios: {
    authentication: 0.3,
    wheelSpin: 0.25,
    memberOperations: 0.25,
    brandOperations: 0.1,
    healthChecks: 0.1
  }
};

// Test data
const TEST_DATA = {
  brandId: '550e8400-e29b-41d4-a716-446655440001',
  wheelId: '550e8400-e29b-41d4-a716-446655440031',
  testUsers: []
};

// Metrics collection
class MetricsCollector {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errorsByType: {},
      requestsByEndpoint: {},
      concurrentUsers: 0,
      startTime: null,
      endTime: null
    };
    this.activeRequests = new Set();
  }

  recordRequest(endpoint, responseTime, success, error = null) {
    this.metrics.totalRequests++;
    this.metrics.responseTimes.push(responseTime);
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      if (error) {
        this.metrics.errorsByType[error] = (this.metrics.errorsByType[error] || 0) + 1;
      }
    }
    
    if (!this.metrics.requestsByEndpoint[endpoint]) {
      this.metrics.requestsByEndpoint[endpoint] = {
        total: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        responseTimes: []
      };
    }
    
    const endpointMetrics = this.metrics.requestsByEndpoint[endpoint];
    endpointMetrics.total++;
    endpointMetrics.responseTimes.push(responseTime);
    
    if (success) {
      endpointMetrics.successful++;
    } else {
      endpointMetrics.failed++;
    }
    
    endpointMetrics.avgResponseTime = 
      endpointMetrics.responseTimes.reduce((a, b) => a + b, 0) / endpointMetrics.responseTimes.length;
  }

  addActiveRequest(requestId) {
    this.activeRequests.add(requestId);
    this.metrics.concurrentUsers = this.activeRequests.size;
  }

  removeActiveRequest(requestId) {
    this.activeRequests.delete(requestId);
    this.metrics.concurrentUsers = this.activeRequests.size;
  }

  getPercentile(percentile) {
    const sorted = [...this.metrics.responseTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  getReport() {
    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000;
    const avgResponseTime = this.metrics.responseTimes.length > 0 
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length 
      : 0;

    return {
      summary: {
        duration: `${duration.toFixed(2)}s`,
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        successRate: `${((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)}%`,
        requestsPerSecond: (this.metrics.totalRequests / duration).toFixed(2),
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        p50: `${this.getPercentile(50).toFixed(2)}ms`,
        p95: `${this.getPercentile(95).toFixed(2)}ms`,
        p99: `${this.getPercentile(99).toFixed(2)}ms`,
        maxConcurrentUsers: Math.max(...Array.from(this.activeRequests).map(() => this.metrics.concurrentUsers))
      },
      endpoints: this.metrics.requestsByEndpoint,
      errors: this.metrics.errorsByType
    };
  }
}

// HTTP client wrapper
class HttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.agent = new http.Agent({
      keepAlive: true,
      maxSockets: 1000,
      maxFreeSockets: 100,
      timeout: 30000
    });
  }

  async request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'StressTest/1.0',
          ...headers
        },
        agent: this.agent,
        timeout: 30000
      };

      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = responseData ? JSON.parse(responseData) : null;
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: parsedData
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: responseData
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async get(path, headers = {}) {
    return this.request('GET', path, null, headers);
  }

  async post(path, data, headers = {}) {
    return this.request('POST', path, data, headers);
  }
}

// Test scenarios
class TestScenarios {
  constructor(client, metrics) {
    this.client = client;
    this.metrics = metrics;
    this.userTokens = new Map();
  }

  async authenticationFlow(userId) {
    const requestId = `auth-${userId}-${Date.now()}`;
    this.metrics.addActiveRequest(requestId);
    
    try {
      // Register user
      const startTime = performance.now();
      const registerResponse = await this.client.post('/api/v1/auth/register', {
        email: `stresstest${userId}@example.com`,
        password: 'StressTest123!',
        first_name: 'Stress',
        last_name: 'Test',
        brand_id: TEST_DATA.brandId
      });
      const registerTime = performance.now() - startTime;
      
      this.metrics.recordRequest(
        'POST /api/v1/auth/register',
        registerTime,
        registerResponse.status === 201 || registerResponse.status === 400, // 400 for existing user is OK
        registerResponse.status >= 500 ? `HTTP ${registerResponse.status}` : null
      );

      // Login user
      const loginStartTime = performance.now();
      const loginResponse = await this.client.post('/api/v1/auth/login', {
        email: `stresstest${userId}@example.com`,
        password: 'StressTest123!',
        brand_id: TEST_DATA.brandId
      });
      const loginTime = performance.now() - loginStartTime;
      
      this.metrics.recordRequest(
        'POST /api/v1/auth/login',
        loginTime,
        loginResponse.status === 200,
        loginResponse.status >= 400 ? `HTTP ${loginResponse.status}` : null
      );

      if (loginResponse.status === 200 && loginResponse.data?.data?.token) {
        this.userTokens.set(userId, loginResponse.data.data.token);
        
        // Get user profile
        const profileStartTime = performance.now();
        const profileResponse = await this.client.get('/api/v1/auth/me', {
          Authorization: `Bearer ${loginResponse.data.data.token}`
        });
        const profileTime = performance.now() - profileStartTime;
        
        this.metrics.recordRequest(
          'GET /api/v1/auth/me',
          profileTime,
          profileResponse.status === 200,
          profileResponse.status >= 400 ? `HTTP ${profileResponse.status}` : null
        );
      }
    } catch (error) {
      this.metrics.recordRequest('Authentication Flow', 0, false, error.message);
    } finally {
      this.metrics.removeActiveRequest(requestId);
    }
  }

  async wheelSpinFlow(userId) {
    const requestId = `wheel-${userId}-${Date.now()}`;
    this.metrics.addActiveRequest(requestId);
    
    try {
      const token = this.userTokens.get(userId);
      if (!token) return;

      // Get wheel config
      const configStartTime = performance.now();
      const configResponse = await this.client.get(`/api/v1/wheels/${TEST_DATA.wheelId}`, {
        Authorization: `Bearer ${token}`
      });
      const configTime = performance.now() - configStartTime;
      
      this.metrics.recordRequest(
        'GET /api/v1/wheels/:id',
        configTime,
        configResponse.status === 200,
        configResponse.status >= 400 ? `HTTP ${configResponse.status}` : null
      );

      // Spin wheel (limited to avoid overwhelming)
      if (Math.random() < 0.3) { // Only 30% of users spin
        const spinStartTime = performance.now();
        const spinResponse = await this.client.post(`/api/v1/wheels/${TEST_DATA.wheelId}/spin`, {}, {
          Authorization: `Bearer ${token}`
        });
        const spinTime = performance.now() - spinStartTime;
        
        this.metrics.recordRequest(
          'POST /api/v1/wheels/:id/spin',
          spinTime,
          spinResponse.status === 200 || spinResponse.status === 429, // Rate limiting is OK
          spinResponse.status >= 500 ? `HTTP ${spinResponse.status}` : null
        );
      }

      // Get spin history
      const historyStartTime = performance.now();
      const historyResponse = await this.client.get('/api/v1/wheels/history?page=1&limit=10', {
        Authorization: `Bearer ${token}`
      });
      const historyTime = performance.now() - historyStartTime;
      
      this.metrics.recordRequest(
        'GET /api/v1/wheels/history',
        historyTime,
        historyResponse.status === 200,
        historyResponse.status >= 400 ? `HTTP ${historyResponse.status}` : null
      );
    } catch (error) {
      this.metrics.recordRequest('Wheel Flow', 0, false, error.message);
    } finally {
      this.metrics.removeActiveRequest(requestId);
    }
  }

  async memberOperationsFlow(userId) {
    const requestId = `member-${userId}-${Date.now()}`;
    this.metrics.addActiveRequest(requestId);
    
    try {
      const token = this.userTokens.get(userId);
      if (!token) return;

      // Get member profile
      const profileStartTime = performance.now();
      const profileResponse = await this.client.get('/api/v1/members/profile', {
        Authorization: `Bearer ${token}`
      });
      const profileTime = performance.now() - profileStartTime;
      
      this.metrics.recordRequest(
        'GET /api/v1/members/profile',
        profileTime,
        profileResponse.status === 200,
        profileResponse.status >= 400 ? `HTTP ${profileResponse.status}` : null
      );

      // Get transactions
      const transactionsStartTime = performance.now();
      const transactionsResponse = await this.client.get('/api/v1/transactions?page=1&limit=20', {
        Authorization: `Bearer ${token}`
      });
      const transactionsTime = performance.now() - transactionsStartTime;
      
      this.metrics.recordRequest(
        'GET /api/v1/transactions',
        transactionsTime,
        transactionsResponse.status === 200,
        transactionsResponse.status >= 400 ? `HTTP ${transactionsResponse.status}` : null
      );

      // Get available missions
      const missionsStartTime = performance.now();
      const missionsResponse = await this.client.get('/api/v1/missions/available', {
        Authorization: `Bearer ${token}`
      });
      const missionsTime = performance.now() - missionsStartTime;
      
      this.metrics.recordRequest(
        'GET /api/v1/missions/available',
        missionsTime,
        missionsResponse.status === 200,
        missionsResponse.status >= 400 ? `HTTP ${missionsResponse.status}` : null
      );
    } catch (error) {
      this.metrics.recordRequest('Member Operations', 0, false, error.message);
    } finally {
      this.metrics.removeActiveRequest(requestId);
    }
  }

  async brandOperationsFlow(userId) {
    const requestId = `brand-${userId}-${Date.now()}`;
    this.metrics.addActiveRequest(requestId);
    
    try {
      // Get all brands
      const brandsStartTime = performance.now();
      const brandsResponse = await this.client.get('/api/v1/brands?page=1&limit=10');
      const brandsTime = performance.now() - brandsStartTime;
      
      this.metrics.recordRequest(
        'GET /api/v1/brands',
        brandsTime,
        brandsResponse.status === 200,
        brandsResponse.status >= 400 ? `HTTP ${brandsResponse.status}` : null
      );

      // Get specific brand
      const brandStartTime = performance.now();
      const brandResponse = await this.client.get(`/api/v1/brands/${TEST_DATA.brandId}`);
      const brandTime = performance.now() - brandStartTime;
      
      this.metrics.recordRequest(
        'GET /api/v1/brands/:id',
        brandTime,
        brandResponse.status === 200,
        brandResponse.status >= 400 ? `HTTP ${brandResponse.status}` : null
      );
    } catch (error) {
      this.metrics.recordRequest('Brand Operations', 0, false, error.message);
    } finally {
      this.metrics.removeActiveRequest(requestId);
    }
  }

  async healthCheckFlow(userId) {
    const requestId = `health-${userId}-${Date.now()}`;
    this.metrics.addActiveRequest(requestId);
    
    try {
      // Health check
      const healthStartTime = performance.now();
      const healthResponse = await this.client.get('/health');
      const healthTime = performance.now() - healthStartTime;
      
      this.metrics.recordRequest(
        'GET /health',
        healthTime,
        healthResponse.status === 200,
        healthResponse.status >= 400 ? `HTTP ${healthResponse.status}` : null
      );
    } catch (error) {
      this.metrics.recordRequest('Health Check', 0, false, error.message);
    } finally {
      this.metrics.removeActiveRequest(requestId);
    }
  }
}

// Main stress test runner
class StressTestRunner {
  constructor() {
    this.metrics = new MetricsCollector();
    this.client = new HttpClient(CONFIG.baseUrl);
    this.scenarios = new TestScenarios(this.client, this.metrics);
    this.isRunning = false;
    this.userCounter = 0;
  }

  async setup() {
    // Create output directory
    try {
      await fs.mkdir(CONFIG.outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    console.log('🚀 Starting stress test setup...');
    console.log(`Target: ${CONFIG.baseUrl}`);
    console.log(`Duration: ${CONFIG.testDuration}s`);
    console.log(`Max Concurrent Users: ${CONFIG.maxConcurrentUsers}`);
    console.log(`Ramp-up Time: ${CONFIG.rampUpTime}s`);
  }

  selectScenario() {
    const random = Math.random();
    let cumulative = 0;
    
    for (const [scenario, weight] of Object.entries(CONFIG.testScenarios)) {
      cumulative += weight;
      if (random <= cumulative) {
        return scenario;
      }
    }
    
    return 'healthChecks'; // fallback
  }

  async runScenario(userId, scenarioName) {
    switch (scenarioName) {
      case 'authentication':
        await this.scenarios.authenticationFlow(userId);
        break;
      case 'wheelSpin':
        await this.scenarios.wheelSpinFlow(userId);
        break;
      case 'memberOperations':
        await this.scenarios.memberOperationsFlow(userId);
        break;
      case 'brandOperations':
        await this.scenarios.brandOperationsFlow(userId);
        break;
      case 'healthChecks':
        await this.scenarios.healthCheckFlow(userId);
        break;
    }
  }

  async runUser() {
    const userId = ++this.userCounter;
    
    while (this.isRunning) {
      const scenario = this.selectScenario();
      await this.runScenario(userId, scenario);
      
      // Random delay between requests (1-5 seconds)
      const delay = Math.random() * 4000 + 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async rampUp() {
    const usersPerSecond = CONFIG.maxConcurrentUsers / CONFIG.rampUpTime;
    const interval = 1000 / usersPerSecond;
    
    console.log(`🔄 Ramping up ${usersPerSecond.toFixed(2)} users per second...`);
    
    for (let i = 0; i < CONFIG.maxConcurrentUsers && this.isRunning; i++) {
      this.runUser().catch(error => {
        console.error(`User ${i} error:`, error.message);
      });
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  startReporting() {
    const reportInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(reportInterval);
        return;
      }
      
      const elapsed = (Date.now() - this.metrics.metrics.startTime) / 1000;
      const rps = this.metrics.metrics.totalRequests / elapsed;
      const successRate = (this.metrics.metrics.successfulRequests / this.metrics.metrics.totalRequests * 100) || 0;
      
      console.log(`⏱️  ${elapsed.toFixed(0)}s | RPS: ${rps.toFixed(1)} | Success: ${successRate.toFixed(1)}% | Active: ${this.metrics.metrics.concurrentUsers} | Total: ${this.metrics.metrics.totalRequests}`);
    }, CONFIG.reportInterval * 1000);
  }

  async generateReport() {
    const report = this.metrics.getReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(CONFIG.outputDir, `stress-test-${timestamp}.json`);
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`Duration: ${report.summary.duration}`);
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`Requests/sec: ${report.summary.requestsPerSecond}`);
    console.log(`Avg Response Time: ${report.summary.avgResponseTime}`);
    console.log(`P95 Response Time: ${report.summary.p95}`);
    console.log(`P99 Response Time: ${report.summary.p99}`);
    console.log(`\n📁 Detailed report saved to: ${reportPath}`);
    
    if (Object.keys(report.errors).length > 0) {
      console.log('\n❌ Errors:');
      for (const [error, count] of Object.entries(report.errors)) {
        console.log(`  ${error}: ${count}`);
      }
    }
  }

  async run() {
    await this.setup();
    
    this.isRunning = true;
    this.metrics.metrics.startTime = Date.now();
    
    // Start reporting
    this.startReporting();
    
    // Start ramp-up
    const rampUpPromise = this.rampUp();
    
    // Set test duration
    setTimeout(() => {
      this.isRunning = false;
      this.metrics.metrics.endTime = Date.now();
    }, CONFIG.testDuration * 1000);
    
    await rampUpPromise;
    
    // Wait for test to complete
    while (this.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Wait for remaining requests to complete
    console.log('\n⏳ Waiting for remaining requests to complete...');
    let waitTime = 0;
    while (this.metrics.activeRequests.size > 0 && waitTime < 30000) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waitTime += 1000;
    }
    
    await this.generateReport();
  }
}

// Run the stress test
if (require.main === module) {
  const runner = new StressTestRunner();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping stress test...');
    runner.isRunning = false;
  });
  
  runner.run().catch(error => {
    console.error('❌ Stress test failed:', error);
    process.exit(1);
  });
}

module.exports = StressTestRunner;