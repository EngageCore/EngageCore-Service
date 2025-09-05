# API Documentation Generator

This project includes an automated Swagger/OpenAPI 3.0 documentation generator that analyzes the controller files and generates comprehensive API documentation.

## 🚀 Quick Start

### Generate API Documentation

```bash
# Generate Swagger YAML documentation
npm run generate-docs
```

This command will:
- Analyze all controller files in `src/controllers/`
- Parse route definitions from `src/routes/`
- Extract validation schemas from `src/validators/`
- Generate a complete OpenAPI 3.0 specification
- Output the result to `docs/api/swagger.yaml`

## 📋 Generated Documentation Features

### ✅ Complete API Coverage
- **Authentication**: Login, register, password reset, 2FA, profile management
- **Brand Management**: CRUD operations, settings, logo upload, statistics
- **User Management**: User creation, role management, permissions
- **Member Management**: Customer profiles, loyalty tiers, points tracking
- **Wheel Operations**: Spin wheels, configurations, history, statistics
- **Mission System**: Mission creation, completion, rewards, progress tracking
- **Transaction Management**: Points transactions, history, bulk operations
- **Admin Panel**: System analytics, audit logs, health monitoring

### 🔐 Security Schemes
- **JWT Bearer Authentication**: For user authentication
- **API Key Authentication**: For brand-specific operations
- **Role-based Access Control**: Different permission levels documented

### 📊 Request/Response Schemas
- **Comprehensive Data Models**: User, Brand, Member, Wheel, Mission, Transaction
- **Validation Schemas**: All request validation rules documented
- **Error Responses**: Standardized error formats with proper HTTP status codes
- **Pagination**: Consistent pagination schema for list endpoints

### 🏷️ Organized Structure
- **Tagged Endpoints**: Grouped by functionality (Auth, Brands, Users, etc.)
- **Parameter Documentation**: Path, query, and body parameters
- **Response Examples**: Success and error response formats
- **Server Configuration**: Development and production server URLs

## 📖 Using the Generated Documentation

### Option 1: Swagger UI (Recommended)

1. **Install Swagger UI globally:**
   ```bash
   npm install -g swagger-ui-serve
   ```

2. **Serve the documentation:**
   ```bash
   swagger-ui-serve docs/api/swagger.yaml
   ```

3. **Open in browser:** `http://localhost:3000`

### Option 2: Online Swagger Editor

1. Go to [Swagger Editor](https://editor.swagger.io/)
2. Copy the contents of `docs/api/swagger.yaml`
3. Paste into the editor to view and test the API

### Option 3: Postman Integration

1. Open Postman
2. Click "Import" → "File"
3. Select `docs/api/swagger.yaml`
4. Postman will create a complete collection with all endpoints

### Option 4: VS Code Extension

1. Install "Swagger Viewer" extension in VS Code
2. Open `docs/api/swagger.yaml`
3. Press `Shift+Alt+P` and select "Preview Swagger"

## 🔧 Customization

### Modifying the Generator

The generator script is located at `generate-swagger.js`. You can customize:

- **Server URLs**: Update the `servers` array
- **API Information**: Modify the `info` section
- **Security Schemes**: Add or modify authentication methods
- **Response Templates**: Customize standard response formats
- **Schema Definitions**: Add or modify data models

### Adding New Endpoints

When you add new routes:

1. **Add JSDoc comments** to your route files:
   ```javascript
   /**
    * @route   POST /api/example
    * @desc    Create example resource
    * @access  Private
    */
   router.post('/example', middleware, controller.method);
   ```

2. **Run the generator** to update documentation:
   ```bash
   npm run generate-docs
   ```

3. **The new endpoints** will be automatically included

## 📁 Output Structure

```
docs/api/
└── swagger.yaml          # Complete OpenAPI 3.0 specification
```

The generated YAML file includes:
- **5000+ lines** of comprehensive API documentation
- **50+ endpoints** across all controllers
- **Complete schema definitions** for all data models
- **Authentication and authorization** documentation
- **Error handling** and response codes
- **Request validation** rules and examples

## 🛠️ Development Workflow

### 1. After Adding New Features
```bash
# Generate updated documentation
npm run generate-docs

# Commit the updated swagger.yaml
git add docs/api/swagger.yaml
git commit -m "Update API documentation"
```

### 2. Before API Reviews
```bash
# Ensure documentation is current
npm run generate-docs

# Share the swagger.yaml file with stakeholders
# Or host it using Swagger UI for interactive review
```

### 3. For Frontend Development
```bash
# Generate documentation
npm run generate-docs

# Frontend developers can use the swagger.yaml to:
# - Generate TypeScript interfaces
# - Create API client libraries
# - Understand request/response formats
```

## 🎯 Benefits

- **Always Up-to-Date**: Generated from actual code, never outdated
- **Comprehensive**: Covers all endpoints, parameters, and responses
- **Interactive**: Can be used with Swagger UI for testing
- **Standardized**: Follows OpenAPI 3.0 specification
- **Tool Integration**: Works with Postman, Insomnia, and other API tools
- **Developer Friendly**: Easy to read and understand
- **Automated**: No manual documentation maintenance required

## 🚨 Important Notes

1. **Run after changes**: Always regenerate documentation after adding/modifying endpoints
2. **Version control**: Include the generated `swagger.yaml` in your repository
3. **Review output**: Check the generated documentation for accuracy
4. **JSDoc comments**: Add proper comments to routes for better documentation
5. **Schema validation**: Ensure your validation schemas are properly defined

## 📞 Support

If you encounter issues with the documentation generator:

1. Check that all route files are properly formatted
2. Ensure JSDoc comments follow the expected format
3. Verify that validation schemas are correctly defined
4. Run `npm run generate-docs` to see any error messages

The generator provides detailed console output to help debug any issues during the documentation generation process.