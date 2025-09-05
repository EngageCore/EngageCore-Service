/**
 * Simple Swagger UI Server
 * Serves only the Swagger UI documentation
 */

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Setup Swagger UI
try {
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
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; }
      `,
      customSiteTitle: 'Engage Service API Documentation'
    };
    
    // Setup Swagger UI routes
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(swaggerDocument, options));
    app.use('/swagger', swaggerUi.serve);
    app.get('/swagger', swaggerUi.setup(swaggerDocument, options));
    
    console.log('✅ Swagger UI documentation loaded successfully');
  } else {
    console.warn('⚠️  Swagger documentation file not found at:', swaggerPath);
    console.log('💡 Run "npm run generate-docs" to generate API documentation');
    
    // Serve a simple message if swagger.yaml doesn't exist
    app.get('/api-docs', (req, res) => {
      res.status(404).json({
        error: 'API Documentation Not Found',
        message: 'Swagger documentation has not been generated yet.',
        instructions: 'Run "npm run generate-docs" to generate the API documentation'
      });
    });
    
    app.get('/swagger', (req, res) => {
      res.redirect('/api-docs');
    });
  }
} catch (error) {
  console.error('❌ Failed to setup Swagger UI:', error);
  
  // Fallback error handler
  app.get('/api-docs', (req, res) => {
    res.status(500).json({
      error: 'Swagger UI Setup Failed',
      message: 'There was an error setting up the API documentation',
      details: error.message
    });
  });
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Engage Service API Documentation Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      swagger: '/swagger',
      docs: '/api-docs'
    },
    message: 'Welcome to the API Documentation Server'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      root: '/',
      swagger: '/swagger',
      docs: '/api-docs',
      health: '/health'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Swagger Documentation Server started!`);
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/swagger`);
  console.log(`📖 API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log(`\n🎯 Ready to serve API documentation!\n`);
});

// Error handling
app.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

module.exports = app;