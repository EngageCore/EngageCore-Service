/**
 * Auth Routes Tests
 * Tests all authentication API endpoints
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const authRoutes = require('../../src/routes/auth');
const { generateTestToken, testData, mockDatabaseQueries } = require('../utils/testHelpers');
const { mockPool } = require('../mocks/database');

// Mock middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    if (req.headers.authorization) {
      req.user = { id: 1, email: 'test@example.com', role: 'user' };
      next();
    } else {
      res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  }
}));

jest.mock('../../src/middleware/validation', () => ({
  validate: () => (req, res, next) => next()
}));

jest.mock('../../src/middleware/rateLimit', () => ({
  authRateLimit: (req, res, next) => next(),
  generalRateLimit: (req, res, next) => next(),
  passwordResetRateLimit: (req, res, next) => next()
}));

// Mock controllers with inline definition to avoid hoisting issues
jest.mock('../../src/controllers', () => ({
  AuthController: {
    register: jest.fn((req, res) => {
      const { email, password, firstName, lastName } = req.body;
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: 1,
            email,
            firstName,
            lastName,
            role: 'user',
            isActive: true,
            emailVerified: false
          },
          token: 'mock-jwt-token'
        }
      });
    }),
    login: jest.fn((req, res) => {
      const { email } = req.body;
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 1,
            email,
            firstName: 'Test',
            lastName: 'User',
            role: 'user',
            isActive: true
          },
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token'
        }
      });
    }),
    refreshToken: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          token: 'new-mock-jwt-token',
          refreshToken: 'new-mock-refresh-token'
        }
      });
    }),
    logout: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Logout successful'
      });
    }),
    forgotPassword: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Password reset email sent'
      });
    }),
    resetPassword: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Password reset successful'
      });
    }),
    changePassword: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    }),
    verifyEmail: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    }),
    resendVerification: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Verification email sent'
      });
    }),
    getProfile: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          id: 1,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'user',
          isActive: true,
          emailVerified: true,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }),
    updateProfile: jest.fn((req, res) => {
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          ...req.body,
          id: 1,
          updatedAt: new Date()
        }
      });
    }),
    setup2FA: jest.fn((req, res) => {
      res.json({
        success: true,
        message: '2FA setup initiated',
        data: {
          qrCode: 'data:image/png;base64,mock-qr-code',
          secret: 'mock-secret-key',
          backupCodes: ['123456', '789012']
        }
      });
    }),
    verify2FA: jest.fn((req, res) => {
      res.json({
        success: true,
        message: '2FA verified successfully',
        data: {
          twoFactorEnabled: true,
          backupCodes: ['123456', '789012']
        }
      });
    }),
    getAuthStatus: jest.fn((req, res) => {
      res.json({
        success: true,
        data: {
          authenticated: true,
          user: {
            id: 1,
            email: 'test@example.com',
            role: 'user'
          },
          permissions: ['read', 'write'],
          sessionExpiry: new Date(Date.now() + 3600000)
        }
      });
    }),
    validateToken: jest.fn((req, res) => {
       res.json({
         success: true,
         data: {
           valid: true,
           user: {
             id: 1,
             email: 'test@example.com',
             role: 'user'
           },
           expiresAt: new Date(Date.now() + 3600000)
         }
       });
     })
   }
 }));

// Get reference to mocked controller for test assertions
const { AuthController } = require('../../src/controllers');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  let userToken;

  beforeEach(() => {
    jest.clearAllMocks();
    userToken = generateTestToken();
  });

  describe('POST /register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(AuthController.register).toHaveBeenCalled();
    });

    test('should handle registration with missing fields', async () => {
      const userData = {
        email: 'incomplete@example.com'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(AuthController.register).toHaveBeenCalled();
    });
  });

  describe('POST /login', () => {
    test('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(AuthController.login).toHaveBeenCalled();
    });

    test('should handle login with invalid credentials', async () => {
      const loginData = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(AuthController.login).toHaveBeenCalled();
    });
  });

  describe('POST /refresh', () => {
    test('should refresh token successfully', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token'
      };

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(AuthController.refreshToken).toHaveBeenCalled();
    });
  });

  describe('POST /logout', () => {
    test('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(AuthController.logout).toHaveBeenCalled();
    });

    test('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Password Management', () => {
    test('should handle forgot password request', async () => {
      const forgotData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(forgotData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(AuthController.forgotPassword).toHaveBeenCalled();
    });

    test('should handle password reset', async () => {
      const resetData = {
        token: 'valid-reset-token',
        password: 'newpassword123'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(AuthController.resetPassword).toHaveBeenCalled();
    });

    test('should handle password change', async () => {
      const changeData = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(changeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(AuthController.changePassword).toHaveBeenCalled();
    });
  });

  describe('Email Verification', () => {
    test('should verify email successfully', async () => {
      const verifyData = {
        token: 'valid-verification-token'
      };

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send(verifyData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(AuthController.verifyEmail).toHaveBeenCalled();
    });

    test('should resend verification email', async () => {
      const resendData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send(resendData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(AuthController.resendVerification).toHaveBeenCalled();
    });
  });

  describe('Profile Management', () => {
    test('should get user profile', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('firstName');
      expect(AuthController.getProfile).toHaveBeenCalled();
    });

    test('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1234567890'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updateData);
      expect(AuthController.updateProfile).toHaveBeenCalled();
    });

    test('should reject profile access without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Two-Factor Authentication', () => {
    test('should setup 2FA', async () => {
      const response = await request(app)
        .post('/api/auth/setup-2fa')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('qrCode');
      expect(response.body.data).toHaveProperty('secret');
      expect(response.body.data).toHaveProperty('backupCodes');
      expect(AuthController.setup2FA).toHaveBeenCalled();
    });

    test('should verify 2FA', async () => {
      const verifyData = {
        token: '123456'
      };

      const response = await request(app)
        .post('/api/auth/verify-2fa')
        .set('Authorization', `Bearer ${userToken}`)
        .send(verifyData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('twoFactorEnabled');
      expect(AuthController.verify2FA).toHaveBeenCalled();
    });
  });

  describe('Authentication Status', () => {
    test('should get auth status', async () => {
      const response = await request(app)
        .get('/api/auth/status')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('authenticated');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('permissions');
      expect(AuthController.getAuthStatus).toHaveBeenCalled();
    });

    test('should validate token', async () => {
      const response = await request(app)
        .post('/api/auth/validate-token')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('valid');
      expect(response.body.data).toHaveProperty('user');
      expect(AuthController.validateToken).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send('invalid-json')
        .set('Content-Type', 'application/json');

      // Express should reject malformed JSON with 400 status
      expect(response.status).toBe(400);
      // Controller should not be called due to malformed JSON
      expect(AuthController.login).not.toHaveBeenCalled();
    });

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(AuthController.login).toHaveBeenCalled();
    });
  });
});