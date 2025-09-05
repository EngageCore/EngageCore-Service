/**
 * Integration tests for Authentication endpoints
 * Tests complete authentication flow including login, register, and token refresh
 */

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const { users, brands, cleanup } = require('../fixtures/testData');

describe('Authentication Endpoints', () => {
  let testBrand;
  let testUser;
  let authToken;
  let refreshToken;

  beforeAll(async () => {
    // Setup test data
    await cleanup.setupTestData(db);
    
    // Create test brand
    const brandResult = await db.query(`
      INSERT INTO brands (id, name, slug, active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [brands.validBrand.id, brands.validBrand.name, brands.validBrand.slug, true]);
    testBrand = brandResult.rows[0];
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanup.cleanupTestData(db);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const registerData = {
        email: 'newuser@test.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        brand_id: testBrand.id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(registerData.email);
      expect(response.body.data.user.first_name).toBe(registerData.first_name);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
      
      // Store for cleanup
      testUser = response.body.data.user;
    });

    it('should fail registration with existing email', async () => {
      // Arrange
      const registerData = {
        email: 'newuser@test.com', // Same email as above
        password: 'password456',
        first_name: 'Jane',
        last_name: 'Smith',
        brand_id: testBrand.id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already exists');
    });

    it('should fail registration with invalid email format', async () => {
      // Arrange
      const registerData = {
        email: 'invalid-email',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        brand_id: testBrand.id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should fail registration with weak password', async () => {
      // Arrange
      const registerData = {
        email: 'test2@test.com',
        password: '123', // Too short
        first_name: 'John',
        last_name: 'Doe',
        brand_id: testBrand.id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should fail registration with missing required fields', async () => {
      // Arrange
      const registerData = {
        email: 'test3@test.com',
        // Missing password, first_name, last_name, brand_id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should fail registration with non-existent brand', async () => {
      // Arrange
      const registerData = {
        email: 'test4@test.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        brand_id: '00000000-0000-0000-0000-000000000000'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Brand not found');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'newuser@test.com',
        password: 'password123',
        brand_id: testBrand.id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
      
      // Store tokens for other tests
      authToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;
    });

    it('should fail login with invalid email', async () => {
      // Arrange
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'password123',
        brand_id: testBrand.id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail login with invalid password', async () => {
      // Arrange
      const loginData = {
        email: 'newuser@test.com',
        password: 'wrongpassword',
        brand_id: testBrand.id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail login with missing brand_id', async () => {
      // Arrange
      const loginData = {
        email: 'newuser@test.com',
        password: 'password123'
        // Missing brand_id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should fail login with wrong brand context', async () => {
      // Arrange
      const loginData = {
        email: 'newuser@test.com',
        password: 'password123',
        brand_id: '00000000-0000-0000-0000-000000000000'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token successfully with valid refresh token', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.token).not.toBe(authToken); // Should be new token
      
      // Update tokens
      authToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;
    });

    it('should fail refresh with invalid refresh token', async () => {
      // Arrange
      const invalidRefreshToken = 'invalid.refresh.token';

      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: invalidRefreshToken })
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should fail refresh with missing refresh token', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should get current user profile with valid token', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('newuser@test.com');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should fail without authorization header', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should fail with invalid token', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should fail with malformed authorization header', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid authorization format');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should fail logout without token', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });
  });

  describe('Password Reset Flow', () => {
    it('should request password reset successfully', async () => {
      // Arrange
      const resetData = {
        email: 'newuser@test.com',
        brand_id: testBrand.id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send(resetData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset email sent');
    });

    it('should fail password reset with non-existent email', async () => {
      // Arrange
      const resetData = {
        email: 'nonexistent@test.com',
        brand_id: testBrand.id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send(resetData)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login attempts', async () => {
      // Arrange
      const loginData = {
        email: 'newuser@test.com',
        password: 'wrongpassword',
        brand_id: testBrand.id
      };

      // Act - Make multiple failed login attempts
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .send(loginData)
        );
      }
      
      const responses = await Promise.all(promises);

      // Assert - Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          brand_id: testBrand.id
        });

      // Assert
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      // Act
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      // Assert
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });
});