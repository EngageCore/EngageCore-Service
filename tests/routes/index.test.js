/**
 * Tests for Index Routes
 * Tests main router endpoints including health check and API info
 */

const request = require('supertest');
const express = require('express');
const indexRoutes = require('../../src/routes/index');

// Mock all route modules
jest.mock('../../src/routes/auth', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ message: 'auth test' }));
  return router;
});

jest.mock('../../src/routes/brands', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ message: 'brands test' }));
  return router;
});

jest.mock('../../src/routes/members', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ message: 'members test' }));
  return router;
});

jest.mock('../../src/routes/tiers', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ message: 'tiers test' }));
  return router;
});

jest.mock('../../src/routes/wheels', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ message: 'wheels test' }));
  return router;
});

jest.mock('../../src/routes/missions', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ message: 'missions test' }));
  return router;
});

jest.mock('../../src/routes/transactions', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ message: 'transactions test' }));
  return router;
});

jest.mock('../../src/routes/users', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ message: 'users test' }));
  return router;
});

jest.mock('../../src/routes/admin', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ message: 'admin test' }));
  return router;
});

// Mock middleware
jest.mock('../../src/middleware', () => ({
  errorHandler: {
    handle: (err, req, res, next) => {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}));

// Mock utils
jest.mock('../../src/utils', () => ({
  response: {
    success: (res, data, message) => {
      res.status(200).json({
        success: true,
        message,
        data
      });
    },
    error: (res, message, statusCode = 500, details = null) => {
      res.status(statusCode).json({
        success: false,
        message,
        details
      });
    }
  }
}));

describe('Index Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use('/api', indexRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variables
    process.env.NODE_ENV = 'test';
    process.env.npm_package_version = '1.0.0';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.npm_package_version;
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'API is healthy',
        data: {
          status: 'OK',
          environment: 'test',
          version: '1.0.0'
        }
      });

      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(typeof response.body.data.uptime).toBe('number');
    });

    it('should use default values when env vars are not set', async () => {
      delete process.env.NODE_ENV;
      delete process.env.npm_package_version;

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.data.environment).toBe('development');
      expect(response.body.data.version).toBe('1.0.0');
    });
  });

  describe('GET /api', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Welcome to Engage Service API',
        data: {
          name: 'Engage Service API',
          version: '1.0.0',
          description: 'Customer engagement and loyalty platform API',
          environment: 'test',
          endpoints: {
            auth: '/api/auth',
            brands: '/api/brands',
            users: '/api/users',
            admin: '/api/admin',
            health: '/api/health',
            tiers: '/api/brands/:brandId/tiers'
          },
          documentation: '/api/docs'
        }
      });

      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should use default values when env vars are not set', async () => {
      delete process.env.NODE_ENV;
      delete process.env.npm_package_version;

      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.data.environment).toBe('development');
      expect(response.body.data.version).toBe('1.0.0');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Route not found',
        details: {
          path: '/api/nonexistent',
          method: 'GET'
        }
      });

      expect(response.body.details).toHaveProperty('timestamp');
    });

    it('should handle POST requests to undefined routes', async () => {
      const response = await request(app)
        .post('/api/undefined')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Route not found',
        details: {
          path: '/api/undefined',
          method: 'POST'
        }
      });
    });

    it('should handle PUT requests to undefined routes', async () => {
      const response = await request(app)
        .put('/api/missing')
        .expect(404);

      expect(response.body.details.method).toBe('PUT');
    });

    it('should handle DELETE requests to undefined routes', async () => {
      const response = await request(app)
        .delete('/api/notfound')
        .expect(404);

      expect(response.body.details.method).toBe('DELETE');
    });
  });

  describe('Route Mounting', () => {
    it('should mount auth routes', async () => {
      const response = await request(app)
        .get('/api/auth/test')
        .expect(200);

      expect(response.body.message).toBe('auth test');
    });

    it('should mount users routes', async () => {
      const response = await request(app)
        .get('/api/users/test')
        .expect(200);

      expect(response.body.message).toBe('users test');
    });

    it('should mount admin routes', async () => {
      const response = await request(app)
        .get('/api/admin/test')
        .expect(200);

      expect(response.body.message).toBe('admin test');
    });

    it('should mount brands routes', async () => {
      const response = await request(app)
        .get('/api/brands/test')
        .expect(200);

      expect(response.body.message).toBe('brands test');
    });
  });

  describe('Nested Brand Routes', () => {
    it('should mount members routes under brands', async () => {
      const response = await request(app)
        .get('/api/brands/123/members/test')
        .expect(200);

      expect(response.body.message).toBe('members test');
    });

    it('should mount tiers routes under brands', async () => {
      const response = await request(app)
        .get('/api/brands/123/tiers/test')
        .expect(200);

      expect(response.body.message).toBe('tiers test');
    });

    it('should mount wheels routes under brands', async () => {
      const response = await request(app)
        .get('/api/brands/123/wheels/test')
        .expect(200);

      expect(response.body.message).toBe('wheels test');
    });

    it('should mount missions routes under brands', async () => {
      const response = await request(app)
        .get('/api/brands/123/missions/test')
        .expect(200);

      expect(response.body.message).toBe('missions test');
    });

    it('should mount transactions routes under brands', async () => {
      const response = await request(app)
        .get('/api/brands/123/transactions/test')
        .expect(200);

      expect(response.body.message).toBe('transactions test');
    });
  });
});