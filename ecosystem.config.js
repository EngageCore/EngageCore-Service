/**
 * PM2 Configuration File
 * Defines process management settings for production deployment
 */

module.exports = {
  apps: [
    {
      // Application configuration
      name: 'engage-service',
      script: './server.js',
      
      // Instance configuration
      instances: process.env.PM2_INSTANCES || 'max', // Use all CPU cores
      exec_mode: 'cluster', // Enable cluster mode for load balancing
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        DB_HOST: '54.250.29.129',
        DB_PORT: 5432,
        DB_NAME: 'EngageCore',
        DB_USER: 'postgres',
        DB_PASSWORD: '123456',
        DB_SSL: 'false',
        DB_POOL_MIN: 2,
        DB_POOL_MAX: 10,
        JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
        JWT_REFRESH_SECRET: 'your-super-secret-refresh-key-change-in-production',
        JWT_COOKIE_SECRET: 'your-super-secret-cookie-key-change-in-production',
        BCRYPT_ROUNDS: 12,
        RATE_LIMIT_WINDOW: 900000,
        RATE_LIMIT_MAX: 100,
        CORS_ORIGIN: 'http://localhost:3000,http://localhost:5173',
        LOG_LEVEL: 'info',
        MONITORING_ENABLED: 'true',
        RUN_MIGRATIONS_ON_START: 'false'
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        DB_HOST: process.env.DB_HOST || '54.250.29.129',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_NAME: process.env.DB_NAME || 'EngageCore',
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || '123456',
        DB_SSL: process.env.DB_SSL || 'true',
        DB_POOL_MIN: process.env.DB_POOL_MIN || 5,
        DB_POOL_MAX: process.env.DB_POOL_MAX || 20,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        JWT_COOKIE_SECRET: process.env.JWT_COOKIE_SECRET,
        BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS || 12,
        RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || 900000,
        RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 1000,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        LOG_LEVEL: process.env.LOG_LEVEL || 'warn',
        MONITORING_ENABLED: process.env.MONITORING_ENABLED || 'true',
        RUN_MIGRATIONS_ON_START: process.env.RUN_MIGRATIONS_ON_START || 'false'
      },
      
      env_staging: {
        NODE_ENV: 'staging',
        PORT: process.env.PORT || 3000,
        DB_HOST: process.env.DB_HOST || '54.250.29.129',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_NAME: process.env.DB_NAME || 'EngageCore',
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || '123456',
        DB_SSL: process.env.DB_SSL || 'true',
        DB_POOL_MIN: process.env.DB_POOL_MIN || 3,
        DB_POOL_MAX: process.env.DB_POOL_MAX || 15,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        JWT_COOKIE_SECRET: process.env.JWT_COOKIE_SECRET,
        BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS || 12,
        RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || 900000,
        RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 500,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        MONITORING_ENABLED: process.env.MONITORING_ENABLED || 'true',
        RUN_MIGRATIONS_ON_START: process.env.RUN_MIGRATIONS_ON_START || 'false'
      },
      
      // Process management
      watch: false, // Disable file watching in production
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git',
        '*.log'
      ],
      
      // Restart configuration
      max_restarts: 10, // Maximum number of restarts
      min_uptime: '10s', // Minimum uptime before considering restart
      max_memory_restart: '500M', // Restart if memory usage exceeds limit
      
      // Logging configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced options
      kill_timeout: 5000, // Time to wait before force killing
      listen_timeout: 8000, // Time to wait for app to listen
      shutdown_with_message: true,
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Node.js options
      node_args: [
        '--max-old-space-size=2048', // Increase memory limit
        '--optimize-for-size' // Optimize for memory usage
      ],
      
      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: process.env.PM2_CRON_RESTART || null,
      
      // Source map support
      source_map_support: false,
      
      // Disable automatic restart on file changes
      autorestart: true,
      
      // Time before sending SIGKILL
      kill_timeout: 5000,
      
      // Wait time before restart
      restart_delay: 4000,
      
      // Exponential backoff restart delay
      exp_backoff_restart_delay: 100
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: process.env.DEPLOY_USER || 'deploy',
      host: process.env.DEPLOY_HOST || 'your-production-server.com',
      ref: 'origin/main',
      repo: process.env.DEPLOY_REPO || 'git@github.com:your-org/engage-service.git',
      path: process.env.DEPLOY_PATH || '/var/www/engage-service',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    },
    
    staging: {
      user: process.env.DEPLOY_USER || 'deploy',
      host: process.env.DEPLOY_HOST_STAGING || 'your-staging-server.com',
      ref: 'origin/develop',
      repo: process.env.DEPLOY_REPO || 'git@github.com:your-org/engage-service.git',
      path: process.env.DEPLOY_PATH_STAGING || '/var/www/engage-service-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  },
  
  // PM2+ monitoring configuration (optional)
  pmx: {
    enabled: process.env.PMX_ENABLED === 'true',
    network: true, // Network monitoring
    ports: true    // Port monitoring
  }
};