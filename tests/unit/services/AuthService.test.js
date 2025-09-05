/**
 * Unit tests for AuthService
 * Tests authentication logic, token generation, and user validation
 */

const AuthService = require('../../../src/services/AuthService');
const UserRepository = require('../../../src/repositories/UserRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users, apiResponses } = require('../../fixtures/testData');

// Mock dependencies
jest.mock('../../../src/repositories/UserRepository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService;
  let mockUserRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock repository
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    };
    
    UserRepository.mockImplementation(() => mockUserRepository);
    
    // Create service instance
    authService = new AuthService();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const loginData = users.loginData;
      const mockUser = users.validUser;
      
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock-access-token');
      jwt.sign.mockReturnValueOnce('mock-refresh-token');

      // Act
      const result = await authService.login(loginData.email, loginData.password, mockUser.brand_id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('refreshToken');
      expect(result.data).toHaveProperty('user');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(loginData.email, mockUser.brand_id);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password_hash);
    });

    it('should fail login with invalid email', async () => {
      // Arrange
      const loginData = users.invalidLoginData;
      
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await authService.login(loginData.email, loginData.password, users.validUser.brand_id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(loginData.email, users.validUser.brand_id);
    });

    it('should fail login with invalid password', async () => {
      // Arrange
      const loginData = users.invalidLoginData;
      const mockUser = users.validUser;
      
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await authService.login(loginData.email, loginData.password, mockUser.brand_id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password_hash);
    });

    it('should fail login with inactive user', async () => {
      // Arrange
      const loginData = users.loginData;
      const mockUser = { ...users.validUser, active: false };
      
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await authService.login(loginData.email, loginData.password, mockUser.brand_id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Account is inactive');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const loginData = users.loginData;
      
      mockUserRepository.findByEmail.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await authService.login(loginData.email, loginData.password, users.validUser.brand_id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Login failed');
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      const registerData = users.registerData;
      const hashedPassword = 'hashed-password';
      const mockCreatedUser = {
        ...users.validUser,
        email: registerData.email,
        first_name: registerData.first_name,
        last_name: registerData.last_name
      };
      
      mockUserRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);
      jwt.sign.mockReturnValue('mock-access-token');
      jwt.sign.mockReturnValueOnce('mock-refresh-token');

      // Act
      const result = await authService.register(registerData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('user');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(registerData.email, registerData.brand_id);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        brand_id: registerData.brand_id,
        email: registerData.email,
        password_hash: hashedPassword,
        first_name: registerData.first_name,
        last_name: registerData.last_name
      });
    });

    it('should fail registration with existing email', async () => {
      // Arrange
      const registerData = users.registerData;
      
      mockUserRepository.findByEmail.mockResolvedValue(users.validUser);

      // Act
      const result = await authService.register(registerData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Email already exists');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(registerData.email, registerData.brand_id);
    });

    it('should handle registration errors gracefully', async () => {
      // Arrange
      const registerData = users.registerData;
      
      mockUserRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockRejectedValue(new Error('Hashing error'));

      // Act
      const result = await authService.register(registerData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Registration failed');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh valid token', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { userId: users.validUser.id, brandId: users.validUser.brand_id };
      const mockUser = users.validUser;
      
      jwt.verify.mockReturnValue(mockPayload);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('new-access-token');
      jwt.sign.mockReturnValueOnce('new-refresh-token');

      // Act
      const result = await authService.refreshToken(refreshToken);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('refreshToken');
      expect(jwt.verify).toHaveBeenCalledWith(refreshToken, process.env.JWT_REFRESH_SECRET);
    });

    it('should fail with invalid refresh token', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = await authService.refreshToken(refreshToken);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid refresh token');
    });

    it('should fail when user not found', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { userId: 'non-existent-user', brandId: users.validUser.brand_id };
      
      jwt.verify.mockReturnValue(mockPayload);
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await authService.refreshToken(refreshToken);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
    });
  });

  describe('validateToken', () => {
    it('should successfully validate valid token', async () => {
      // Arrange
      const token = 'valid-access-token';
      const mockPayload = { userId: users.validUser.id, brandId: users.validUser.brand_id };
      const mockUser = users.validUser;
      
      jwt.verify.mockReturnValue(mockPayload);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await authService.validateToken(token);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('user');
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
    });

    it('should fail with invalid token', async () => {
      // Arrange
      const token = 'invalid-access-token';
      
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = await authService.validateToken(token);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid token');
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      // Arrange
      const user = users.validUser;
      
      jwt.sign.mockReturnValueOnce('access-token');
      jwt.sign.mockReturnValueOnce('refresh-token');

      // Act
      const tokens = authService.generateTokens(user);

      // Assert
      expect(tokens).toHaveProperty('accessToken', 'access-token');
      expect(tokens).toHaveProperty('refreshToken', 'refresh-token');
      expect(jwt.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      // Arrange
      const password = 'test-password';
      const hashedPassword = 'hashed-password';
      
      bcrypt.hash.mockResolvedValue(hashedPassword);

      // Act
      const result = await authService.hashPassword(password);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      // Arrange
      const password = 'test-password';
      const hash = 'hashed-password';
      
      bcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await authService.comparePassword(password, hash);

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it('should return false for non-matching passwords', async () => {
      // Arrange
      const password = 'test-password';
      const hash = 'different-hash';
      
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await authService.comparePassword(password, hash);

      // Assert
      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
    });
  });
});