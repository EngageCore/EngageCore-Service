/**
 * Main Server File
 * Sets up Express application with middleware, routes, and graceful shutdown
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Import configurations and utilities
const config = require('./config');
const { logger, dbMonitor, maintenance } = require('./src/utils');
const { errorHandler, queryOptimization } = require('./src/middleware');
const routes = require('./src/routes');

// Import database connection
const db = require('./config/database');

class Server {
  constructor() {
    this.app = express();
    this.server = null;
    this.isShuttingDown = false;
    this.connections = new Set();
  }

  /**
   * Get the Express app instance (for serverless deployment)
   */
  async getApp() {
    if (!this.app._initialized) {
      await this.initialize();
      this.app._initialized = true;
    }
    return this.app;
  }

  /**
   * Initialize server with all middleware and routes
   */
  async initialize() {
    try {
      // Test database connection
      await this.testDatabaseConnection();

      
      // Setup middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      // Start database monitoring if enabled
      if (config.monitoring.enabled) {
        dbMonitor.startMonitoring();
      }
      
      logger.info('Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection() {
    try {
      // Use the enhanced health check method if available
      if (typeof db.healthCheck === 'function') {
        const health = await db.healthCheck();
        if (health.status === 'healthy') {
          logger.info('Database connection established successfully', {
            timestamp: health.timestamp,
            poolStats: health.poolStats
          });
        } else {
          throw new Error(`Database health check failed: ${health.error}`);
        }
      } else {
        // Fallback to simple connection test
        const client = await db.connect();
        await client.query('SELECT NOW()');
        client.release();
        logger.info('Database connection established successfully');
      }
    } catch (error) {
      logger.error('Database connection failed:', {
        error: error.message,
        host: config.database.host,
        database: config.database.database,
        isServerless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
      });
      
      // In serverless environments, don't throw - let it fail gracefully on first request
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        logger.warn('Serverless environment detected - database connection will be retried on first request');
        return;
      }
      
      throw new Error('Database connection failed');
    }
  }


  /**
   * Setup middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Brand-ID', 'X-API-Key']
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ 
      limit: config.server.bodyLimit,
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: config.server.bodyLimit 
    }));

    // Cookie parsing
    this.app.use(cookieParser(config.jwt.cookieSecret));

    // Request logging
    if (config.server.env !== 'test') {
      const morganFormat = config.server.env === 'production' ? 'combined' : 'dev';
      this.app.use(morgan(morganFormat, {
        stream: {
          write: (message) => logger.info(message.trim())
        },
        skip: (req) => req.url === '/api/health'
      }));
    }

    // Global rate limiting
    this.app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks and internal requests
        return req.url === '/api/health' || req.ip === '127.0.0.1';
      }
    }));

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.id = require('crypto').randomUUID();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Request context middleware
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      req.context = {
        requestId: req.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.url
      };
      next();
    });

    // Performance optimization middleware
    this.app.use(queryOptimization.connectionPoolOptimizer());
    this.app.use(queryOptimization.queryPerformanceMonitor(2000)); // Log queries > 2 seconds
    this.app.use(queryOptimization.paginationOptimizer());
    this.app.use(queryOptimization.indexOptimizer());
    this.app.use(queryOptimization.transactionOptimizer());
    this.app.use(queryOptimization.bulkOperationOptimizer());

    // Maintenance mode middleware (simplified - can be enhanced later)
    this.app.use((req, res, next) => {
      // Skip maintenance mode check for now - can be implemented when needed
      // Future enhancement: Add environment variable or config-based maintenance mode
      next();
    });
  }

  /**
   * Setup Swagger UI Documentation
   */
  setupSwaggerUI() {
    try {
      // Load swagger.yaml file
      const swaggerPath = path.join(__dirname, 'docs', 'api', 'swagger.yaml');
      
      if (fs.existsSync(swaggerPath)) {
        const swaggerDocument = YAML.load(fs.readFileSync(swaggerPath, 'utf8'));
        
        // Swagger UI options
        const options = {
          explorer: true,
          swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            showExtensions: true,
            showCommonExtensions: true
          },
          customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info .title { color: #3b82f6 }
          `,
          customSiteTitle: 'Engage Service API Documentation'
        };
        
        // Setup Swagger UI routes
        this.app.use('/api-docs', swaggerUi.serve);
        this.app.get('/api-docs', swaggerUi.setup(swaggerDocument, options));
        this.app.use('/swagger', swaggerUi.serve);
        this.app.get('/swagger', swaggerUi.setup(swaggerDocument, options));
        
        logger.info('Swagger UI documentation loaded successfully');
      } else {
        logger.warn('Swagger documentation file not found at:', swaggerPath);
        logger.info('Run "npm run generate-docs" to generate API documentation');
        
        // Serve a simple message if swagger.yaml doesn't exist
        this.app.get('/api-docs', (req, res) => {
          res.status(404).json({
            error: 'API Documentation Not Found',
            message: 'Swagger documentation has not been generated yet.',
            instructions: 'Run "npm run generate-docs" to generate the API documentation'
          });
        });
        
        this.app.get('/swagger', (req, res) => {
          res.redirect('/api-docs');
        });
      }
    } catch (error) {
      logger.error('Failed to setup Swagger UI:', error);
      
      // Fallback error handler
      this.app.get('/api-docs', (req, res) => {
        res.status(500).json({
          error: 'Swagger UI Setup Failed',
          message: 'There was an error setting up the API documentation',
          details: error.message
        });
      });
    }
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // Swagger UI Documentation
    this.setupSwaggerUI();
    
    // API routes
    this.app.use('/api', routes);

    // Webhook proxy for development (if configured)
    if (config.server.env === 'development' && config.webhook?.proxyUrl) {
      this.app.use('/webhooks', createProxyMiddleware({
        target: config.webhook.proxyUrl,
        changeOrigin: true,
        pathRewrite: {
          '^/webhooks': ''
        }
      }));
    }

    // Static file serving for uploads
    this.app.use('/uploads', express.static('uploads', {
      maxAge: '1d',
      etag: true
    }));

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Engage Service API',
        version: process.env.npm_package_version || '1.0.0',
        environment: config.server.env,
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          api: '/api',
          health: '/api/health',
          docs: '/api-docs',
          swagger: '/swagger'
        }
      });
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use(errorHandler.errorHandler);
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    // Track connections
    this.app.use((req, res, next) => {
      this.connections.add(req.socket);
      req.socket.on('close', () => {
        this.connections.delete(req.socket);
      });
      next();
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      if (this.isShuttingDown) {
        logger.warn(`Received ${signal} during shutdown, forcing exit`);
        process.exit(1);
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new connections
      if (this.server) {
        this.server.close(async () => {
          logger.info('HTTP server closed');

          try {
            // Stop database monitoring
            if (config.monitoring.enabled) {
              dbMonitor.stopMonitoring();
            }

            // Close database connections
            await db.end();
            logger.info('Database connections closed');

            // Close remaining connections
            for (const connection of this.connections) {
              connection.destroy();
            }

            logger.info('Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            logger.error('Error during graceful shutdown:', error);
            process.exit(1);
          }
        });

        // Force shutdown after timeout
        setTimeout(() => {
          logger.error('Graceful shutdown timeout, forcing exit');
          process.exit(1);
        }, config.server.shutdownTimeout || 30000);
      } else {
        process.exit(0);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.initialize();

      const port = config.server.port;
      const host = config.server.host;

      this.server = this.app.listen(port, host, () => {
        logger.info(`Server started on ${host}:${port}`);
        logger.info(`Environment: ${config.server.env}`);
        logger.info(`Process ID: ${process.pid}`);
        
        if (config.server.env === 'development') {
          logger.info(`API Documentation: http://${host}:${port}/api`);
          logger.info(`Health Check: http://${host}:${port}/api/health`);
        }
      });

      // Handle server errors
      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${port} is already in use`);
        } else {
          logger.error('Server error:', error);
        }
        process.exit(1);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }
}

// Create and export server instance
const server = new Server();

// Start server if this file is run directly
if (require.main === module) {
  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = server;