/**
 * Swagger Documentation Generator
 * Automatically generates OpenAPI 3.0 YAML documentation from controllers and routes
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

// Install js-yaml if not present
try {
  require('js-yaml');
} catch (error) {
  console.log('Installing js-yaml dependency...');
  require('child_process').execSync('npm install js-yaml', { stdio: 'inherit' });
}

class SwaggerGenerator {
  constructor() {
    this.controllersDir = path.join(__dirname, 'src', 'controllers');
    this.routesDir = path.join(__dirname, 'src', 'routes');
    this.validatorsDir = path.join(__dirname, 'src', 'validators');
    this.outputFile = path.join(__dirname, 'docs', 'api', 'swagger.yaml');
    
    this.swaggerSpec = {
      openapi: '3.0.3',
      info: {
        title: 'Engage Service API',
        description: 'Lucky Wheel Engagement Platform API Documentation',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@engage-service.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        },
        {
          url: 'https://api.engage-service.com',
          description: 'Production server'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token for authentication'
          },
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key for brand-specific operations'
          }
        },
        responses: {
          Success: {
            description: 'Successful operation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: { type: 'object' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          Error: {
            description: 'Error response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string' },
                    error: { type: 'string' },
                    code: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          ValidationError: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Validation failed' },
                    errors: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field: { type: 'string' },
                          message: { type: 'string' }
                        }
                      }
                    },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          Unauthorized: {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Authentication required' },
                    code: { type: 'string', example: 'UNAUTHORIZED' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          Forbidden: {
            description: 'Insufficient permissions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Insufficient permissions' },
                    code: { type: 'string', example: 'FORBIDDEN' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          NotFound: {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Resource not found' },
                    code: { type: 'string', example: 'NOT_FOUND' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          RateLimit: {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Rate limit exceeded' },
                    code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
                    retryAfter: { type: 'integer', example: 60 },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      },
      tags: [
        { name: 'Authentication', description: 'User authentication and authorization' },
        { name: 'Brands', description: 'Brand management operations' },
        { name: 'Users', description: 'User management operations' },
        { name: 'Members', description: 'Member management and loyalty operations' },
        { name: 'Wheels', description: 'Wheel configuration and spinning operations' },
        { name: 'Missions', description: 'Mission and reward management' },
        { name: 'Transactions', description: 'Points and transaction management' },
        { name: 'Admin', description: 'Administrative operations' }
      ]
    };
  }

  /**
   * Generate complete Swagger documentation
   */
  async generate() {
    try {
      console.log('🚀 Starting Swagger documentation generation...');
      
      // Create output directory if it doesn't exist
      await this.ensureOutputDirectory();
      
      // Parse routes and generate paths
      await this.parseRoutes();
      
      // Generate schemas from validators
      await this.generateSchemas();
      
      // Write YAML file
      await this.writeSwaggerFile();
      
      console.log('✅ Swagger documentation generated successfully!');
      console.log(`📄 Output file: ${this.outputFile}`);
      
    } catch (error) {
      console.error('❌ Error generating Swagger documentation:', error);
      throw error;
    }
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDirectory() {
    const outputDir = path.dirname(this.outputFile);
    try {
      await fs.access(outputDir);
    } catch (error) {
      await fs.mkdir(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }
  }

  /**
   * Parse all route files and extract endpoints
   */
  async parseRoutes() {
    const routeFiles = await fs.readdir(this.routesDir);
    
    for (const file of routeFiles) {
      if (file.endsWith('.js') && file !== 'index.js') {
        await this.parseRouteFile(file);
      }
    }
  }

  /**
   * Parse individual route file
   */
  async parseRouteFile(filename) {
    const filePath = path.join(this.routesDir, filename);
    const content = await fs.readFile(filePath, 'utf8');
    
    console.log(`📋 Parsing routes from ${filename}...`);
    
    // Extract route definitions using regex patterns
    const routePattern = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"\`]+)['"`]([^;]+);/g;
    const commentPattern = /\/\*\*[\s\S]*?\*\//g;
    
    let match;
    const routes = [];
    
    // Extract JSDoc comments
    const comments = [];
    let commentMatch;
    while ((commentMatch = commentPattern.exec(content)) !== null) {
      comments.push({
        content: commentMatch[0],
        index: commentMatch.index
      });
    }
    
    // Extract routes
    while ((match = routePattern.exec(content)) !== null) {
      const method = match[1].toLowerCase();
      const path = match[2];
      const middlewareChain = match[3];
      
      // Find associated comment
      const routeIndex = match.index;
      const associatedComment = comments.find(comment => 
        comment.index < routeIndex && routeIndex - comment.index < 500
      );
      
      routes.push({
        method,
        path,
        middlewareChain,
        comment: associatedComment?.content,
        filename
      });
    }
    
    // Process routes and add to swagger spec
    for (const route of routes) {
      this.addRouteToSwagger(route, filename);
    }
  }

  /**
   * Add route to swagger specification
   */
  addRouteToSwagger(route, filename) {
    const { method, path, comment, middlewareChain } = route;
    
    // Convert Express path to OpenAPI path
    const swaggerPath = this.convertPathToSwagger(path, filename);
    
    // Parse JSDoc comment for route information
    const routeInfo = this.parseJSDocComment(comment);
    
    // Determine tag based on filename
    const tag = this.getTagFromFilename(filename);
    
    // Check if authentication is required
    const requiresAuth = middlewareChain.includes('auth.authenticate');
    const requiresAdmin = middlewareChain.includes('auth.authorize');
    const requiresBrandAccess = middlewareChain.includes('brandContext.validateBrandAccess');
    
    // Build operation object
    const operation = {
      tags: [tag],
      summary: routeInfo.desc || this.generateSummary(method, path),
      description: routeInfo.description || routeInfo.desc,
      operationId: this.generateOperationId(method, path, filename),
      parameters: this.extractParameters(path, middlewareChain),
      responses: this.generateResponses(method),
      ...(requiresAuth && { security: [{ BearerAuth: [] }] }),
      ...(requiresBrandAccess && { 
        security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }] 
      })
    };
    
    // Add request body for POST/PUT/PATCH methods
    if (['post', 'put', 'patch'].includes(method)) {
      operation.requestBody = this.generateRequestBody(middlewareChain, filename);
    }
    
    // Initialize path object if it doesn't exist
    if (!this.swaggerSpec.paths[swaggerPath]) {
      this.swaggerSpec.paths[swaggerPath] = {};
    }
    
    // Add operation to path
    this.swaggerSpec.paths[swaggerPath][method] = operation;
  }

  /**
   * Convert Express path to OpenAPI path format
   */
  convertPathToSwagger(path, filename) {
    let swaggerPath = path;
    
    // Add base path based on filename
    const basePath = this.getBasePathFromFilename(filename);
    if (basePath && !path.startsWith('/api')) {
      swaggerPath = `${basePath}${path}`;
    }
    
    // Convert :param to {param}
    swaggerPath = swaggerPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
    
    return swaggerPath;
  }

  /**
   * Get base path from filename
   */
  getBasePathFromFilename(filename) {
    const basePathMap = {
      'auth.js': '/api/auth',
      'brands.js': '/api/brands',
      'users.js': '/api/users',
      'members.js': '/api/brands/{brandId}/members',
      'wheels.js': '/api/brands/{brandId}/wheels',
      'missions.js': '/api/brands/{brandId}/missions',
      'transactions.js': '/api/brands/{brandId}/transactions',
      'admin.js': '/api/admin'
    };
    
    return basePathMap[filename] || '/api';
  }

  /**
   * Get tag from filename
   */
  getTagFromFilename(filename) {
    const tagMap = {
      'auth.js': 'Authentication',
      'brands.js': 'Brands',
      'users.js': 'Users',
      'members.js': 'Members',
      'wheels.js': 'Wheels',
      'missions.js': 'Missions',
      'transactions.js': 'Transactions',
      'admin.js': 'Admin'
    };
    
    return tagMap[filename] || 'API';
  }

  /**
   * Parse JSDoc comment
   */
  parseJSDocComment(comment) {
    if (!comment) return {};
    
    const routeMatch = comment.match(/@route\s+([A-Z]+)\s+([^\n]+)/);
    const descMatch = comment.match(/@desc\s+([^\n]+)/);
    const accessMatch = comment.match(/@access\s+([^\n]+)/);
    
    return {
      route: routeMatch ? routeMatch[2].trim() : null,
      desc: descMatch ? descMatch[1].trim() : null,
      access: accessMatch ? accessMatch[1].trim() : null
    };
  }

  /**
   * Generate operation summary
   */
  generateSummary(method, path) {
    const methodMap = {
      get: 'Get',
      post: 'Create',
      put: 'Update',
      patch: 'Update',
      delete: 'Delete'
    };
    
    const resource = path.split('/').pop().replace(/[{}:]/g, '');
    return `${methodMap[method]} ${resource}`;
  }

  /**
   * Generate operation ID
   */
  generateOperationId(method, path, filename) {
    const controller = filename.replace('.js', '');
    const resource = path.split('/').filter(p => p && !p.includes(':')).pop() || 'resource';
    return `${method}${controller.charAt(0).toUpperCase() + controller.slice(1)}${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
  }

  /**
   * Extract parameters from path and middleware
   */
  extractParameters(path, middlewareChain) {
    const parameters = [];
    
    // Extract path parameters
    const pathParams = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (pathParams) {
      pathParams.forEach(param => {
        const paramName = param.substring(1);
        parameters.push({
          name: paramName,
          in: 'path',
          required: true,
          schema: {
            type: paramName.includes('Id') ? 'string' : 'string',
            format: paramName.includes('Id') ? 'uuid' : undefined
          },
          description: `${paramName.charAt(0).toUpperCase() + paramName.slice(1)} identifier`
        });
      });
    }
    
    // Add common query parameters for GET requests
    if (middlewareChain.includes('GET')) {
      parameters.push(
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 },
          description: 'Page number for pagination'
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          description: 'Number of items per page'
        },
        {
          name: 'search',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Search query'
        }
      );
    }
    
    return parameters;
  }

  /**
   * Generate request body schema
   */
  generateRequestBody(middlewareChain, filename) {
    // Extract validator from middleware chain
    const validatorMatch = middlewareChain.match(/validation\.validate\(([^)]+)\)/);
    
    if (validatorMatch) {
      const validatorName = validatorMatch[1].replace(/Validators?\./g, '');
      const schemaRef = `#/components/schemas/${this.capitalizeFirst(validatorName)}`;
      
      return {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: schemaRef }
          }
        }
      };
    }
    
    // Default request body
    return {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' }
        }
      }
    };
  }

  /**
   * Generate response schemas
   */
  generateResponses(method) {
    const responses = {
      '200': { $ref: '#/components/responses/Success' },
      '400': { $ref: '#/components/responses/ValidationError' },
      '401': { $ref: '#/components/responses/Unauthorized' },
      '403': { $ref: '#/components/responses/Forbidden' },
      '404': { $ref: '#/components/responses/NotFound' },
      '429': { $ref: '#/components/responses/RateLimit' },
      '500': { $ref: '#/components/responses/Error' }
    };
    
    if (method === 'post') {
      responses['201'] = { $ref: '#/components/responses/Success' };
    }
    
    return responses;
  }

  /**
   * Generate schemas from validators
   */
  async generateSchemas() {
    console.log('📝 Generating schemas from validators...');
    
    // Define common schemas
    this.swaggerSpec.components.schemas = {
      ...this.swaggerSpec.components.schemas,
      
      // User schemas
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          role: { type: 'string', enum: ['super_admin', 'brand_admin', 'brand_manager', 'brand_user'] },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
          email_verified: { type: 'boolean' },
          last_login: { type: 'string', format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      
      // Brand schemas
      Brand: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          logo_url: { type: 'string', format: 'uri' },
          website_url: { type: 'string', format: 'uri' },
          contact_email: { type: 'string', format: 'email' },
          contact_phone: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
          settings: { type: 'object' },
          points_currency_name: { type: 'string' },
          points_currency_symbol: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      
      // Member schemas
      Member: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          brand_id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          date_of_birth: { type: 'string', format: 'date' },
          gender: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
          points_balance: { type: 'integer' },
          total_points_earned: { type: 'integer' },
          total_points_redeemed: { type: 'integer' },
          tier_level: { type: 'string' },
          join_date: { type: 'string', format: 'date-time' },
          last_activity: { type: 'string', format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      
      // Wheel schemas
      Wheel: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          brand_id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'draft'] },
          max_spins_per_day: { type: 'integer' },
          max_spins_per_member: { type: 'integer' },
          cost_per_spin: { type: 'integer' },
          start_date: { type: 'string', format: 'date-time' },
          end_date: { type: 'string', format: 'date-time' },
          settings: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      
      // Mission schemas
      Mission: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          brand_id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'one_time', 'recurring'] },
          status: { type: 'string', enum: ['active', 'inactive', 'draft', 'completed', 'expired'] },
          target_value: { type: 'integer' },
          target_unit: { type: 'string' },
          reward_points: { type: 'integer' },
          reward_description: { type: 'string' },
          start_date: { type: 'string', format: 'date-time' },
          end_date: { type: 'string', format: 'date-time' },
          max_completions: { type: 'integer' },
          max_completions_per_member: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      
      // Transaction schemas
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          brand_id: { type: 'string', format: 'uuid' },
          member_id: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['earn', 'redeem', 'adjustment', 'bonus', 'penalty'] },
          status: { type: 'string', enum: ['pending', 'completed', 'failed', 'cancelled', 'reversed'] },
          amount: { type: 'integer' },
          balance_after: { type: 'integer' },
          description: { type: 'string' },
          reference_id: { type: 'string' },
          reference_type: { type: 'string' },
          processed_at: { type: 'string', format: 'date-time' },
          expires_at: { type: 'string', format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      
      // Request schemas
      RegisterRequest: {
        type: 'object',
        required: ['first_name', 'last_name', 'email', 'password', 'confirm_password'],
        properties: {
          first_name: { type: 'string', minLength: 2, maxLength: 50 },
          last_name: { type: 'string', minLength: 2, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          confirm_password: { type: 'string' },
          role: { type: 'string', enum: ['brand_admin', 'brand_manager', 'brand_user'] },
          brand_id: { type: 'string', format: 'uuid' },
          phone: { type: 'string' },
          timezone: { type: 'string', default: 'UTC' },
          language: { type: 'string', default: 'en' }
        }
      },
      
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          remember_me: { type: 'boolean', default: false }
        }
      },
      
      CreateBrandRequest: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 255 },
          slug: { type: 'string', minLength: 2, maxLength: 255 },
          description: { type: 'string' },
          website_url: { type: 'string', format: 'uri' },
          contact_email: { type: 'string', format: 'email' },
          contact_phone: { type: 'string' },
          points_currency_name: { type: 'string', default: 'Points' },
          points_currency_symbol: { type: 'string', default: 'pts' },
          timezone: { type: 'string', default: 'UTC' },
          language: { type: 'string', default: 'en' }
        }
      },
      
      // Response schemas
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          tokens: {
            type: 'object',
            properties: {
              access_token: { type: 'string' },
              refresh_token: { type: 'string' },
              expires_in: { type: 'integer' }
            }
          }
        }
      },
      
      PaginatedResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: {} },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              pages: { type: 'integer' },
              hasNext: { type: 'boolean' },
              hasPrev: { type: 'boolean' }
            }
          }
        }
      }
    };
  }

  /**
   * Write swagger specification to YAML file
   */
  async writeSwaggerFile() {
    const yamlContent = yaml.dump(this.swaggerSpec, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    
    await fs.writeFile(this.outputFile, yamlContent, 'utf8');
    console.log(`📄 Swagger YAML written to: ${this.outputFile}`);
  }

  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// CLI interface
if (require.main === module) {
  const generator = new SwaggerGenerator();
  
  generator.generate()
    .then(() => {
      console.log('\n🎉 Swagger documentation generation completed!');
      console.log('\n📖 Usage:');
      console.log('  - View the generated swagger.yaml file in docs/api/');
      console.log('  - Use Swagger UI to visualize the API documentation');
      console.log('  - Import the YAML file into Postman or other API tools');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = SwaggerGenerator;