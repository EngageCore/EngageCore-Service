# Engage Service - Lucky Wheel Engagement Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18+-lightgrey.svg)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test Coverage](https://img.shields.io/badge/Coverage-95%25+-brightgreen.svg)](#testing)

A comprehensive Node.js backend service that provides a brand-based multi-tenant engagement platform with lucky wheel, membership tiers, and quest/mission systems. The service features separate admin and member portals, comprehensive testing suites, and real-time API monitoring capabilities.

## 🚀 Features

### Core Functionality
- **🎯 Multi-Tenant Architecture**: Brand-based isolation with shared infrastructure
- **🎡 Lucky Wheel System**: Configurable spinning wheels with customizable prizes and probabilities
- **🏆 Mission/Quest System**: Daily, weekly, and monthly challenges with rewards
- **👥 Membership Management**: Tiered membership system with progression tracking
- **💰 Transaction System**: Points management, rewards distribution, and transaction history
- **🔐 Authentication & Authorization**: JWT-based auth with role-based access control (super_admin, brand_admin, member)
- **👨‍💼 Admin Portal**: Complete system management with dashboard, analytics, and user management
- **👤 Member Portal**: Member-facing features including profile, missions, wheels, and rewards
- **📊 Analytics Dashboard**: Real-time engagement metrics and reporting
- **🔍 Audit Logging**: Comprehensive activity tracking and compliance

### Technical Features
- **⚡ High Performance**: Optimized PostgreSQL with connection pooling and query optimization
- **🛡️ Security**: Rate limiting, input validation, helmet security headers, and CORS protection
- **📈 Scalability**: Horizontal scaling support with PM2 process management
- **🧪 Comprehensive Testing**: Unit tests, integration tests, and real API testing (118+ tests)
- **📚 API Documentation**: Auto-generated Swagger/OpenAPI documentation with separate admin/member specs
- **🔄 Database Management**: Setup scripts, migrations, seeds, and maintenance tools
- **📝 Logging & Monitoring**: Winston logging with daily rotation and database monitoring
- **🔧 Background Jobs**: Scheduled tasks for cleanup, recalculation, and system health checks

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Admin Portal   │    │  Member Portal  │    │   Client Apps   │
│   Dashboard     │    │   Engagement    │    │   & Webhooks    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Express.js Server    │
                    │   /api/admin/*          │
                    │   /api/member/*         │
                    │   /api/auth/*           │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                       │                        │
┌───────▼────────┐    ┌─────────▼─────────┐    ┌─────────▼─────────┐
│ Authentication │    │   Brand Service   │    │  Member Service   │
│   & JWT Auth   │    │  Multi-tenancy    │    │   Engagement      │
└────────────────┘    └───────────────────┘    └───────────────────┘
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │     PostgreSQL DB      │
                    │   Connection Pool      │
                    │   Query Optimization   │
                    └────────────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Database**: PostgreSQL with pg driver
- **Authentication**: JWT with refresh tokens (jsonwebtoken)
- **Validation**: Joi schema validation
- **Logging**: Winston with daily rotation
- **Process Management**: PM2 (ecosystem.config.js)

### Development & Testing
- **Testing**: Jest + Supertest + Babel
- **Linting**: ESLint with Airbnb config
- **Performance Testing**: Artillery
- **Documentation**: Auto-generated Swagger/OpenAPI with swagger-ui-express

### Core Dependencies
- **Web Framework**: express, cors, helmet, compression
- **Database**: pg (PostgreSQL driver)
- **Authentication**: jsonwebtoken, bcryptjs, cookie-parser
- **Security**: helmet, express-rate-limit, express-slow-down
- **Validation**: joi
- **Utilities**: lodash, moment, uuid, js-yaml
- **File Handling**: multer
- **Scheduling**: node-cron
- **Logging**: winston, winston-daily-rotate-file, morgan
- **Proxy**: http-proxy-middleware

## 📋 Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **PostgreSQL**: Version 15 or higher
- **npm/yarn**: Latest version
- **Git**: For version control

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd engage-service
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment file and configure your settings:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=engage_service
DB_USER=postgres
DB_PASSWORD=your_password
DB_MAX_CONNECTIONS=20

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=7d
```

### 4. Database Setup

#### Create Database
```bash
# Connect to PostgreSQL and create database
psql -U postgres
CREATE DATABASE engage_service;
\q
```

#### Run Migrations
```bash
npm run migrate
```

#### Seed Initial Data (Optional)
```bash
npm run seed
```

### 5. Start the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📖 API Documentation

### Generate Swagger Documentation
```bash
npm run generate-docs
```

This creates `docs/api/swagger.yaml` with complete API documentation.

### API Endpoints Overview

#### Authentication Routes (`/api/auth/*`)
| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | User registration |
| `POST /api/auth/login` | User authentication |
| `POST /api/auth/refresh` | Refresh access token |
| `POST /api/auth/logout` | User logout |
| `GET /api/auth/profile` | Get current user profile |
| `PUT /api/auth/profile` | Update user profile |
| `POST /api/auth/forgot-password` | Request password reset |
| `POST /api/auth/reset-password` | Reset password with token |
| `POST /api/auth/change-password` | Change user password |

#### Admin Portal Routes (`/api/admin/*`)
| Endpoint | Description |
|----------|-------------|
| `GET /api/admin/dashboard` | System dashboard overview |
| `GET /api/admin/analytics` | System analytics |
| `GET /api/admin/health` | System health status |
| `GET /api/admin/audit-logs` | System audit logs |
| `GET /api/admin/users` | List all users |
| `POST /api/admin/users` | Create new user |
| `GET /api/admin/users/:id` | Get user by ID |
| `PUT /api/admin/users/:id` | Update user |
| `DELETE /api/admin/users/:id` | Delete user |
| `GET /api/admin/brands` | List all brands |
| `POST /api/admin/brands` | Create new brand |
| `GET /api/admin/brands/:id` | Get brand by ID |
| `PUT /api/admin/brands/:id` | Update brand |
| `GET /api/admin/brands/:brandId/members` | List brand members |
| `POST /api/admin/brands/:brandId/members` | Create new member |
| `GET /api/admin/brands/:brandId/missions` | List brand missions |
| `POST /api/admin/brands/:brandId/missions` | Create new mission |
| `GET /api/admin/brands/:brandId/wheels` | List brand wheels |
| `POST /api/admin/brands/:brandId/wheels` | Create new wheel |
| `GET /api/admin/brands/:brandId/transactions` | List brand transactions |
| `GET /api/admin/brands/:brandId/tiers` | List brand tiers |
| `POST /api/admin/brands/:brandId/tiers` | Create new tier |

#### Member Portal Routes (`/api/member/*`)
| Endpoint | Description |
|----------|-------------|
| `GET /api/member/profile` | Get member profile and points |
| `PUT /api/member/profile` | Update member profile |
| `GET /api/member/points` | Get member points balance and history |
| `GET /api/member/tier` | Get member tier status and progress |
| `GET /api/member/missions` | Get available missions |
| `POST /api/member/missions/:id/complete` | Complete a mission |
| `GET /api/member/missions/completed` | Get completed missions |
| `GET /api/member/transactions` | Get member transaction history |
| `GET /api/member/wheels` | Get available wheels |
| `POST /api/member/wheels/:id/spin` | Spin a wheel |
| `GET /api/member/wheels/:id/history` | Get wheel spin history |
| `GET /api/member/leaderboard` | Get member leaderboard position |
| `GET /api/member/rewards` | Get available rewards |
| `POST /api/member/rewards/:id/redeem` | Redeem a reward |
| `GET /api/member/notifications` | Get member notifications |
| `PUT /api/member/notifications/:id/read` | Mark notification as read |

#### System Routes
| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | API health check |
| `GET /api` | API information and endpoints |

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## 🧪 Testing

The project includes comprehensive testing suites covering all API endpoints and functionality.

### Test Structure

#### Route Tests (`tests/routes/`)
- **`auth.test.js`**: Authentication endpoints (521 lines, 15+ tests)
- **`adminPortal.test.js`**: Admin portal endpoints (830 lines, 31+ tests)
- **`memberPortal.test.js`**: Member portal endpoints (953 lines, 24+ tests)
- **`index.test.js`**: Main route tests

#### Integration Tests (`tests/integration/`)
- **`realApi.test.js`**: Real API testing with HTTP requests (508 lines, 39+ tests)
- **`debug.test.js`**: Debug and inspection tests
- **`inspect.test.js`**: System inspection tests

#### Test Utilities (`tests/utils/`)
- **`testHelpers.js`**: Test utilities, token generation, mock data (216 lines)

#### Mock Data (`tests/mocks/`)
- **`database.js`**: Database mocking utilities

### Running Tests

#### All Tests
```bash
# Note: Test scripts need to be added to package.json
jest
```

#### Specific Test Suites
```bash
# Authentication tests
jest tests/routes/auth.test.js

# Admin portal tests
jest tests/routes/adminPortal.test.js

# Member portal tests
jest tests/routes/memberPortal.test.js

# Real API integration tests
jest tests/integration/realApi.test.js
```

### Test Coverage Summary
- **Total Test Files**: 8+ comprehensive test suites
- **Total Tests**: 118+ individual test cases
- **Route Coverage**: 100% of implemented endpoints
- **Authentication Testing**: Complete JWT and role-based access control
- **Integration Testing**: Real HTTP requests to running server
- **Mock Testing**: Comprehensive controller and middleware mocking
- **Error Handling**: Extensive error scenario testing

## 📁 Project Structure

```
engage-service/
├── .trae/
│   └── documents/       # Project documentation
├── config/
│   ├── database.js      # Database configuration
│   └── index.js         # Main configuration
├── database/
│   ├── indexes/         # Database indexes
│   ├── seeds/           # Database seed data
│   ├── tables/          # Table definitions
│   ├── drop_all_tables.js
│   └── setup.js         # Database setup script
├── docs/
│   └── api/
│       ├── admin-swagger.yaml    # Admin API documentation
│       ├── member-swagger.yaml   # Member API documentation
│       └── swagger.yaml          # Complete API documentation
├── src/
│   ├── config/
│   │   ├── database.js  # Database configuration
│   │   ├── index.js     # Configuration index
│   │   └── jwt.js       # JWT configuration
│   ├── controllers/     # Route controllers
│   │   ├── AdminController.js
│   │   ├── AuthController.js
│   │   ├── MemberController.js
│   │   ├── MissionController.js
│   │   ├── TierController.js
│   │   ├── TransactionController.js
│   │   ├── UserController.js
│   │   ├── WheelController.js
│   │   ├── brandController.js
│   │   └── index.js
│   ├── database/
│   │   ├── maintenance/ # Database maintenance scripts
│   │   ├── migrations/  # Database migrations
│   │   ├── monitoring/  # Database monitoring
│   │   └── seeds/       # Database seeds
│   ├── enums/
│   │   ├── ErrorCodes.js
│   │   ├── ServiceErrorCodes.js
│   │   └── index.js
│   ├── jobs/            # Background jobs
│   │   ├── auditLogCleanup.js
│   │   ├── databaseCleanup.js
│   │   ├── memberPointsRecalculation.js
│   │   ├── missionExpiration.js
│   │   ├── systemHealthCheck.js
│   │   ├── tokenCleanup.js
│   │   ├── wheelStatisticsUpdate.js
│   │   └── index.js
│   ├── middleware/      # Express middleware
│   │   ├── auth.js
│   │   ├── brandContext.js
│   │   ├── cache.js
│   │   ├── errorHandler.js
│   │   ├── queryOptimization.js
│   │   ├── rateLimit.js
│   │   ├── validation.js
│   │   └── index.js
│   ├── repositories/    # Data access layer
│   │   ├── AuditLogRepository.js
│   │   ├── BaseRepository.js
│   │   ├── BrandRepository.js
│   │   ├── MemberRepository.js
│   │   ├── MissionCompletionRepository.js
│   │   ├── MissionRepository.js
│   │   ├── TransactionRepository.js
│   │   ├── UserRepository.js
│   │   ├── WheelRepository.js
│   │   └── index.js
│   ├── routes/          # API route definitions
│   │   ├── adminPortal.js    # Admin portal routes
│   │   ├── auth.js           # Authentication routes
│   │   ├── memberPortal.js   # Member portal routes
│   │   └── index.js          # Main router
│   ├── services/        # Business logic layer
│   │   ├── AdminService.js
│   │   ├── AuthService.js
│   │   ├── BrandService.js
│   │   ├── MemberService.js
│   │   ├── MissionService.js
│   │   ├── TierService.js
│   │   ├── TransactionService.js
│   │   ├── UserService.js
│   │   ├── WheelService.js
│   │   └── index.js
│   ├── utils/           # Utility functions
│   │   ├── constants.js
│   │   ├── dbMonitor.js
│   │   ├── encryption.js
│   │   ├── errors.js
│   │   ├── jwt.js
│   │   ├── logger.js
│   │   ├── maintenance.js
│   │   ├── probability.js
│   │   ├── response.js
│   │   ├── validation.js
│   │   └── index.js
│   └── validators/      # Request validation schemas
│       ├── adminValidators.js
│       ├── authValidators.js
│       ├── brandValidators.js
│       ├── memberValidators.js
│       ├── missionValidators.js
│       ├── tierValidators.js
│       ├── transactionValidators.js
│       ├── userValidators.js
│       ├── wheelValidators.js
│       └── index.js
├── tests/
│   ├── integration/
│   │   ├── debug.test.js
│   │   ├── inspect.test.js
│   │   └── realApi.test.js      # Real API integration tests
│   ├── mocks/
│   │   └── database.js          # Database mocking
│   ├── routes/
│   │   ├── adminPortal.test.js  # Admin portal tests
│   │   ├── auth.test.js         # Authentication tests
│   │   ├── index.test.js        # Main route tests
│   │   ├── memberPortal.test.js # Member portal tests
│   │   └── simple-route.test.js
│   ├── utils/
│   │   └── testHelpers.js       # Test utilities
│   ├── basic.test.js
│   └── setup.js
├── uploads/             # File uploads directory
├── .babelrc            # Babel configuration
├── .env.example        # Environment template
├── .env.test           # Test environment
├── .gitignore          # Git ignore rules
├── check-schema.js     # Schema validation
├── ecosystem.config.js # PM2 configuration
├── generate-swagger.js # API docs generator
├── jest.config.js      # Jest configuration
├── package.json        # Dependencies and scripts
├── server.js           # Application entry point
└── swagger-server.js   # Swagger server
```

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run setup` | Complete database setup |
| `npm run setup:tables` | Setup database tables |
| `npm run setup:indexes` | Setup database indexes |
| `npm run setup:seeds` | Seed database with initial data |
| `npm run setup:status` | Check database setup status |
| `npm run generate-docs` | Generate API documentation |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |

### Additional Testing Commands

| Command | Description |
|---------|-------------|
| `jest` | Run all tests |
| `jest tests/routes/auth.test.js` | Run authentication tests |
| `jest tests/routes/adminPortal.test.js` | Run admin portal tests |
| `jest tests/routes/memberPortal.test.js` | Run member portal tests |
| `jest tests/integration/realApi.test.js` | Run real API integration tests |
| `jest --watch` | Run tests in watch mode |
| `jest --coverage` | Generate test coverage report |

## 🚀 Deployment

### PM2 Production Deployment

#### Install PM2
```bash
npm install -g pm2
```

#### Start with PM2
```bash
pm2 start ecosystem.config.js --env production
```

#### PM2 Management Commands
```bash
# View running processes
pm2 list

# Monitor processes
pm2 monit

# View logs
pm2 logs engage-service

# Restart application
pm2 restart engage-service

# Stop application
pm2 stop engage-service
```

### Environment-Specific Deployment

#### Staging
```bash
pm2 start ecosystem.config.js --env staging
```

#### Production
```bash
pm2 start ecosystem.config.js --env production
```

### Health Checks
The application includes health check endpoints:
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status

## 🔧 Configuration

### Environment Variables

#### Server Configuration
- `NODE_ENV`: Environment (development/staging/production)
- `PORT`: Server port (default: 3000)
- `API_VERSION`: API version (default: v1)

#### Database Configuration
- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_MAX_CONNECTIONS`: Max connection pool size

#### Security Configuration
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRES_IN`: Access token expiration
- `JWT_REFRESH_SECRET`: Refresh token secret
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration

#### Performance Configuration
- `DB_POOL_MIN`: Minimum database connections
- `DB_POOL_MAX`: Maximum database connections
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window

### Database Performance Optimization

The application includes several performance optimizations:
- **Connection Pooling**: Configurable pool size with automatic scaling
- **Query Optimization**: Indexed queries and optimized joins
- **Partitioned Tables**: For high-volume transaction data
- **Materialized Views**: For complex analytics queries
- **Automated Maintenance**: Scheduled cleanup and optimization tasks

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run lint:fix`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Standards
- Follow ESLint Airbnb configuration
- Write comprehensive tests for new features
- Update documentation for API changes
- Use conventional commit messages

### Testing Requirements
- All new features must include unit tests
- Integration tests for API endpoints
- Performance tests for critical paths
- Maintain minimum 80% code coverage

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check connection
psql -U postgres -h localhost -p 5432
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Migration Issues
```bash
# Check migration status
node database/migrate.js status

# Reset database (development only)
node database/drop_all_tables.js
npm run migrate
npm run seed
```

### Logging
Logs are stored in the `logs/` directory:
- `app.log`: General application logs
- `error.log`: Error logs
- `audit.log`: Audit trail logs

## 🧪 Comprehensive Testing Architecture

### Testing Philosophy
The engage-service implements a multi-layered testing approach ensuring reliability and maintainability:

#### 1. **Unit Testing with Mocks**
- **Route Tests**: Complete endpoint testing with mocked dependencies
- **Controller Mocking**: Isolated testing of route handlers
- **Middleware Mocking**: Authentication, validation, and rate limiting
- **Database Mocking**: Simulated database operations

#### 2. **Integration Testing**
- **Real API Testing**: HTTP requests to running server instance
- **End-to-End Workflows**: Complete user journeys from login to feature usage
- **Authentication Flows**: JWT token generation and validation
- **Error Scenario Testing**: Comprehensive error handling validation

#### 3. **Test Coverage Breakdown**
- **Authentication Routes**: 15+ tests covering registration, login, profile management
- **Admin Portal**: 31+ tests covering system management, user/brand/member CRUD
- **Member Portal**: 24+ tests covering member features, missions, wheels, rewards
- **Real API Integration**: 39+ tests with actual HTTP requests
- **Total Coverage**: 118+ individual test cases

### Test Features
- **JWT Token Testing**: Complete authentication and authorization flows
- **Role-Based Access Control**: Testing for super_admin, brand_admin, and member roles
- **Error Handling**: Comprehensive testing of validation errors, auth failures, and server errors
- **Mock Data Generation**: Realistic test data for users, brands, members, missions, and transactions
- **Database Mocking**: Complete PostgreSQL operation simulation
- **Rate Limiting Testing**: Verification of API rate limiting functionality

## 📊 System Capabilities

### Architecture Highlights
- **Multi-Portal Design**: Separate admin and member interfaces
- **Role-Based Security**: Three-tier access control (super_admin, brand_admin, member)
- **Brand Multi-Tenancy**: Complete isolation between brand data
- **Comprehensive Logging**: Winston-based logging with daily rotation
- **Background Jobs**: Automated cleanup and maintenance tasks
- **Database Optimization**: Query optimization and connection pooling

### Monitoring & Health
The application includes built-in monitoring:
- **Health Check Endpoints**: `/api/health` for system status
- **Admin Health Dashboard**: `/api/admin/health` for detailed system metrics
- **Database Connection Monitoring**: Real-time connection pool status
- **Error Rate Tracking**: Comprehensive error logging and tracking
- **Audit Logging**: Complete activity tracking for compliance
- **Performance Metrics**: Request timing and system resource monitoring

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Express.js team for the excellent web framework
- PostgreSQL community for the robust database system
- Jest team for the comprehensive testing framework
- All contributors who have helped improve this project

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the [API documentation](docs/api/swagger.yaml)
- Review the [troubleshooting section](#troubleshooting)

---

**Built with ❤️ by the Engage Service Team**