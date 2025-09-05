/**
 * Unit tests for BrandService
 * Tests brand management logic, CRUD operations, and validation
 */

const BrandService = require('../../../src/services/BrandService');
const BrandRepository = require('../../../src/repositories/BrandRepository');
const { brands, apiResponses } = require('../../fixtures/testData');

// Mock dependencies
jest.mock('../../../src/repositories/BrandRepository');

describe('BrandService', () => {
  let brandService;
  let mockBrandRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock repository
    mockBrandRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    };
    
    BrandRepository.mockImplementation(() => mockBrandRepository);
    
    // Create service instance
    brandService = new BrandService();
  });

  describe('getAllBrands', () => {
    it('should return all brands with pagination', async () => {
      // Arrange
      const mockBrands = [brands.validBrand, brands.secondBrand];
      const page = 1;
      const limit = 10;
      const totalCount = 2;
      
      mockBrandRepository.findAll.mockResolvedValue(mockBrands);
      mockBrandRepository.count.mockResolvedValue(totalCount);

      // Act
      const result = await brandService.getAllBrands(page, limit);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.brands).toEqual(mockBrands);
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      });
      expect(mockBrandRepository.findAll).toHaveBeenCalledWith({}, limit, 0);
      expect(mockBrandRepository.count).toHaveBeenCalledWith({});
    });

    it('should handle empty results', async () => {
      // Arrange
      mockBrandRepository.findAll.mockResolvedValue([]);
      mockBrandRepository.count.mockResolvedValue(0);

      // Act
      const result = await brandService.getAllBrands(1, 10);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.brands).toEqual([]);
      expect(result.data.pagination.total).toBe(0);
    });

    it('should handle database errors', async () => {
      // Arrange
      mockBrandRepository.findAll.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await brandService.getAllBrands(1, 10);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to fetch brands');
    });
  });

  describe('getBrandById', () => {
    it('should return brand by valid ID', async () => {
      // Arrange
      const brandId = brands.validBrand.id;
      
      mockBrandRepository.findById.mockResolvedValue(brands.validBrand);

      // Act
      const result = await brandService.getBrandById(brandId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(brands.validBrand);
      expect(mockBrandRepository.findById).toHaveBeenCalledWith(brandId);
    });

    it('should return error for non-existent brand', async () => {
      // Arrange
      const brandId = 'non-existent-id';
      
      mockBrandRepository.findById.mockResolvedValue(null);

      // Act
      const result = await brandService.getBrandById(brandId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Brand not found');
    });

    it('should handle database errors', async () => {
      // Arrange
      const brandId = brands.validBrand.id;
      
      mockBrandRepository.findById.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await brandService.getBrandById(brandId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to fetch brand');
    });
  });

  describe('getBrandBySlug', () => {
    it('should return brand by valid slug', async () => {
      // Arrange
      const slug = brands.validBrand.slug;
      
      mockBrandRepository.findBySlug.mockResolvedValue(brands.validBrand);

      // Act
      const result = await brandService.getBrandBySlug(slug);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(brands.validBrand);
      expect(mockBrandRepository.findBySlug).toHaveBeenCalledWith(slug);
    });

    it('should return error for non-existent slug', async () => {
      // Arrange
      const slug = 'non-existent-slug';
      
      mockBrandRepository.findBySlug.mockResolvedValue(null);

      // Act
      const result = await brandService.getBrandBySlug(slug);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Brand not found');
    });
  });

  describe('createBrand', () => {
    it('should successfully create a new brand', async () => {
      // Arrange
      const brandData = brands.createBrandData;
      const createdBrand = { ...brands.validBrand, ...brandData };
      
      mockBrandRepository.findBySlug.mockResolvedValue(null);
      mockBrandRepository.create.mockResolvedValue(createdBrand);

      // Act
      const result = await brandService.createBrand(brandData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdBrand);
      expect(mockBrandRepository.findBySlug).toHaveBeenCalledWith(brandData.slug);
      expect(mockBrandRepository.create).toHaveBeenCalledWith({
        ...brandData,
        active: true
      });
    });

    it('should fail to create brand with existing slug', async () => {
      // Arrange
      const brandData = brands.createBrandData;
      
      mockBrandRepository.findBySlug.mockResolvedValue(brands.validBrand);

      // Act
      const result = await brandService.createBrand(brandData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Brand slug already exists');
      expect(mockBrandRepository.findBySlug).toHaveBeenCalledWith(brandData.slug);
    });

    it('should handle creation errors', async () => {
      // Arrange
      const brandData = brands.createBrandData;
      
      mockBrandRepository.findBySlug.mockResolvedValue(null);
      mockBrandRepository.create.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await brandService.createBrand(brandData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to create brand');
    });
  });

  describe('updateBrand', () => {
    it('should successfully update existing brand', async () => {
      // Arrange
      const brandId = brands.validBrand.id;
      const updateData = brands.updateBrandData;
      const updatedBrand = { ...brands.validBrand, ...updateData };
      
      mockBrandRepository.findById.mockResolvedValue(brands.validBrand);
      mockBrandRepository.update.mockResolvedValue(updatedBrand);

      // Act
      const result = await brandService.updateBrand(brandId, updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedBrand);
      expect(mockBrandRepository.findById).toHaveBeenCalledWith(brandId);
      expect(mockBrandRepository.update).toHaveBeenCalledWith(brandId, updateData);
    });

    it('should fail to update non-existent brand', async () => {
      // Arrange
      const brandId = 'non-existent-id';
      const updateData = brands.updateBrandData;
      
      mockBrandRepository.findById.mockResolvedValue(null);

      // Act
      const result = await brandService.updateBrand(brandId, updateData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Brand not found');
    });

    it('should handle slug conflicts during update', async () => {
      // Arrange
      const brandId = brands.validBrand.id;
      const updateData = { slug: 'existing-slug' };
      
      mockBrandRepository.findById.mockResolvedValue(brands.validBrand);
      mockBrandRepository.findBySlug.mockResolvedValue(brands.secondBrand);

      // Act
      const result = await brandService.updateBrand(brandId, updateData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Brand slug already exists');
    });

    it('should allow updating same brand with same slug', async () => {
      // Arrange
      const brandId = brands.validBrand.id;
      const updateData = { slug: brands.validBrand.slug };
      const updatedBrand = { ...brands.validBrand, ...updateData };
      
      mockBrandRepository.findById.mockResolvedValue(brands.validBrand);
      mockBrandRepository.findBySlug.mockResolvedValue(brands.validBrand);
      mockBrandRepository.update.mockResolvedValue(updatedBrand);

      // Act
      const result = await brandService.updateBrand(brandId, updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedBrand);
    });
  });

  describe('deleteBrand', () => {
    it('should successfully delete existing brand', async () => {
      // Arrange
      const brandId = brands.validBrand.id;
      
      mockBrandRepository.findById.mockResolvedValue(brands.validBrand);
      mockBrandRepository.delete.mockResolvedValue(brands.validBrand);

      // Act
      const result = await brandService.deleteBrand(brandId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Brand deleted successfully');
      expect(mockBrandRepository.findById).toHaveBeenCalledWith(brandId);
      expect(mockBrandRepository.delete).toHaveBeenCalledWith(brandId);
    });

    it('should fail to delete non-existent brand', async () => {
      // Arrange
      const brandId = 'non-existent-id';
      
      mockBrandRepository.findById.mockResolvedValue(null);

      // Act
      const result = await brandService.deleteBrand(brandId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Brand not found');
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const brandId = brands.validBrand.id;
      
      mockBrandRepository.findById.mockResolvedValue(brands.validBrand);
      mockBrandRepository.delete.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await brandService.deleteBrand(brandId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to delete brand');
    });
  });

  describe('validateBrandData', () => {
    it('should validate correct brand data', () => {
      // Arrange
      const validData = brands.createBrandData;

      // Act
      const result = brandService.validateBrandData(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid brand data', () => {
      // Arrange
      const invalidData = {
        name: '', // Empty name
        slug: 'invalid slug with spaces', // Invalid slug format
        settings: 'not an object' // Invalid settings type
      };

      // Act
      const result = brandService.validateBrandData(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('generateSlug', () => {
    it('should generate valid slug from brand name', () => {
      // Arrange
      const brandName = 'Test Brand Name';

      // Act
      const slug = brandService.generateSlug(brandName);

      // Assert
      expect(slug).toBe('test-brand-name');
    });

    it('should handle special characters in brand name', () => {
      // Arrange
      const brandName = 'Test & Brand! @#$%';

      // Act
      const slug = brandService.generateSlug(brandName);

      // Assert
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('isSlugAvailable', () => {
    it('should return true for available slug', async () => {
      // Arrange
      const slug = 'available-slug';
      
      mockBrandRepository.findBySlug.mockResolvedValue(null);

      // Act
      const result = await brandService.isSlugAvailable(slug);

      // Assert
      expect(result).toBe(true);
      expect(mockBrandRepository.findBySlug).toHaveBeenCalledWith(slug);
    });

    it('should return false for taken slug', async () => {
      // Arrange
      const slug = brands.validBrand.slug;
      
      mockBrandRepository.findBySlug.mockResolvedValue(brands.validBrand);

      // Act
      const result = await brandService.isSlugAvailable(slug);

      // Assert
      expect(result).toBe(false);
    });
  });
});