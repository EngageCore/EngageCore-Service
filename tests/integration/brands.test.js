/**
 * Brand Management Integration Tests
 * Tests all brand-related endpoints including CRUD operations, settings, and theme configuration
 */

const request = require('supertest');
const { testData } = require('../fixtures/testData');

// Mock setup and cleanup functions for test server integration
const setupTestData = async () => {
  // Mock setup - test server handles its own data
  return Promise.resolve();
};

const cleanupTestData = async () => {
  // Mock cleanup - test server handles its own cleanup
  return Promise.resolve();
};

// Mock the entire application since we're testing against test server
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Brand Management Integration Tests', () => {
  let adminToken;
  let userToken;
  let testBrandId;
  let createdBrandIds = [];

  beforeAll(async () => {
    // Setup test data
    await setupTestData();
    
    // Create admin user and get token
    const adminResponse = await request(TEST_BASE_URL)
      .post('/api/v1/auth/register')
      .send({
        email: 'admin@brandtest.com',
        password: 'AdminTest123!',
        first_name: 'Admin',
        last_name: 'User',
        brand_id: testBrandId,
        role: 'admin'
      });
    
    adminToken = adminResponse.body.data?.token;
    
    // Create regular user and get token
    const userResponse = await request(TEST_BASE_URL)
      .post('/api/v1/auth/register')
      .send({
        email: 'user@brandtest.com',
        password: 'UserTest123!',
        first_name: 'Regular',
        last_name: 'User',
        brand_id: testData.brands[0].id
      });
    
    userToken = userResponse.body.data?.token;
    testBrandId = testData.brands.validBrand.id;
  });

  afterAll(async () => {
    // Clean up created brands
    for (const brandId of createdBrandIds) {
      try {
        await request(TEST_BASE_URL)
          .delete(`/api/v1/brands/${brandId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    await cleanupTestData();
  });

  describe('GET /api/v1/brands', () => {
    it('should get all brands with default pagination', async () => {
      const response = await request(TEST_BASE_URL)
        .get('/api/v1/brands')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('brands');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.brands)).toBe(true);
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    it('should get brands with custom pagination', async () => {
      const response = await request(TEST_BASE_URL)
        .get('/api/v1/brands?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.brands.length).toBeLessThanOrEqual(5);
    });

    it('should filter brands by status', async () => {
      const response = await request(TEST_BASE_URL)
        .get('/api/v1/brands?status=active')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.brands.forEach(brand => {
        expect(brand.status).toBe('active');
      });
    });

    it('should search brands by name', async () => {
      const response = await request(TEST_BASE_URL)
        .get('/api/v1/brands?search=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.brands.length > 0) {
        response.body.data.brands.forEach(brand => {
          expect(brand.name.toLowerCase()).toContain('test');
        });
      }
    });

    it('should handle empty results gracefully', async () => {
      const response = await request(TEST_BASE_URL)
        .get('/api/v1/brands?search=nonexistentbrand12345')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.brands).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/v1/brands/:id', () => {
    it('should get a specific brand by ID', async () => {
      const response = await request(TEST_BASE_URL)
        .get(`/api/v1/brands/${testBrandId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('brand');
      expect(response.body.data.brand.id).toBe(testBrandId);
      expect(response.body.data.brand).toHaveProperty('name');
      expect(response.body.data.brand).toHaveProperty('slug');
      expect(response.body.data.brand).toHaveProperty('status');
    });

    it('should return 404 for non-existent brand', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      const response = await request(TEST_BASE_URL)
        .get(`/api/v1/brands/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid brand ID format', async () => {
      const response = await request(TEST_BASE_URL)
        .get('/api/v1/brands/invalid-id')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/brands', () => {
    it('should create a new brand with valid data', async () => {
      const newBrand = {
        name: 'New Test Brand',
        slug: 'new-test-brand',
        description: 'A brand created for testing',
        website: 'https://newtestbrand.com',
        logo_url: 'https://example.com/logo.png',
        theme_config: {
          primary_color: '#007bff',
          secondary_color: '#6c757d',
          font_family: 'Arial, sans-serif'
        },
        settings: {
          max_daily_spins: 5,
          points_per_spin: 10,
          welcome_bonus: 100
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newBrand)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('brand');
      expect(response.body.data.brand.name).toBe(newBrand.name);
      expect(response.body.data.brand.slug).toBe(newBrand.slug);
      expect(response.body.data.brand.status).toBe('active');
      expect(response.body.data.brand).toHaveProperty('id');
      
      // Store for cleanup
      createdBrandIds.push(response.body.data.brand.id);
    });

    it('should auto-generate slug if not provided', async () => {
      const newBrand = {
        name: 'Auto Slug Brand',
        description: 'Testing auto slug generation'
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newBrand)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.brand.slug).toBe('auto-slug-brand');
      
      createdBrandIds.push(response.body.data.brand.id);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidBrand = {
        description: 'Missing name field'
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidBrand)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for duplicate slug', async () => {
      const duplicateBrand = {
        name: 'Duplicate Slug Brand',
        slug: 'test-brand' // Assuming this slug already exists
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateBrand)
        .expect(400);

      expect(response.body.error).toContain('slug');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const newBrand = {
        name: 'Unauthorized Brand',
        slug: 'unauthorized-brand'
      };

      await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .send(newBrand)
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const newBrand = {
        name: 'Forbidden Brand',
        slug: 'forbidden-brand'
      };

      await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newBrand)
        .expect(403);
    });

    it('should validate theme configuration', async () => {
      const brandWithInvalidTheme = {
        name: 'Invalid Theme Brand',
        slug: 'invalid-theme-brand',
        theme_config: {
          primary_color: 'invalid-color', // Invalid color format
          secondary_color: '#6c757d'
        }
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(brandWithInvalidTheme)
        .expect(400);

      expect(response.body.error).toContain('theme');
    });
  });

  describe('PUT /api/v1/brands/:id', () => {
    let updateBrandId;

    beforeAll(async () => {
      // Create a brand for update tests
      const createResponse = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Update Test Brand',
          slug: 'update-test-brand',
          description: 'Brand for update testing'
        });
      
      updateBrandId = createResponse.body.data.brand.id;
      createdBrandIds.push(updateBrandId);
    });

    it('should update brand with valid data', async () => {
      const updateData = {
        name: 'Updated Brand Name',
        description: 'Updated description',
        website: 'https://updated.com',
        theme_config: {
          primary_color: '#28a745',
          secondary_color: '#dc3545'
        }
      };

      const response = await request(TEST_BASE_URL)
        .put(`/api/v1/brands/${updateBrandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.brand.name).toBe(updateData.name);
      expect(response.body.data.brand.description).toBe(updateData.description);
      expect(response.body.data.brand.website).toBe(updateData.website);
    });

    it('should update only provided fields', async () => {
      const partialUpdate = {
        description: 'Partially updated description'
      };

      const response = await request(TEST_BASE_URL)
        .put(`/api/v1/brands/${updateBrandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.brand.description).toBe(partialUpdate.description);
      // Name should remain unchanged
      expect(response.body.data.brand.name).toBe('Updated Brand Name');
    });

    it('should return 404 for non-existent brand', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      const updateData = { name: 'Updated Name' };

      await request(TEST_BASE_URL)
        .put(`/api/v1/brands/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const updateData = { name: 'Unauthorized Update' };

      await request(TEST_BASE_URL)
        .put(`/api/v1/brands/${updateBrandId}`)
        .send(updateData)
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const updateData = { name: 'Forbidden Update' };

      await request(TEST_BASE_URL)
        .put(`/api/v1/brands/${updateBrandId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should validate slug uniqueness on update', async () => {
      const updateData = {
        slug: 'test-brand' // Assuming this slug exists for another brand
      };

      const response = await request(TEST_BASE_URL)
        .put(`/api/v1/brands/${updateBrandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toContain('slug');
    });
  });

  describe('DELETE /api/v1/brands/:id', () => {
    let deleteBrandId;

    beforeEach(async () => {
      // Create a brand for delete tests
      const createResponse = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Delete Test Brand',
          slug: `delete-test-brand-${Date.now()}`,
          description: 'Brand for delete testing'
        });
      
      deleteBrandId = createResponse.body.data.brand.id;
    });

    it('should delete brand successfully', async () => {
      const response = await request(TEST_BASE_URL)
        .delete(`/api/v1/brands/${deleteBrandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify brand is deleted
      await request(TEST_BASE_URL)
        .get(`/api/v1/brands/${deleteBrandId}`)
        .expect(404);
    });

    it('should return 404 for non-existent brand', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';

      await request(TEST_BASE_URL)
        .delete(`/api/v1/brands/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(TEST_BASE_URL)
        .delete(`/api/v1/brands/${deleteBrandId}`)
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      await request(TEST_BASE_URL)
        .delete(`/api/v1/brands/${deleteBrandId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should prevent deletion of brand with active users', async () => {
      // This test assumes the brand has active users
      const response = await request(TEST_BASE_URL)
        .delete(`/api/v1/brands/${testBrandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toContain('active users');
    });
  });

  describe('Brand Settings Management', () => {
    let settingsBrandId;

    beforeAll(async () => {
      // Create a brand for settings tests
      const createResponse = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Settings Test Brand',
          slug: 'settings-test-brand',
          settings: {
            max_daily_spins: 3,
            points_per_spin: 10,
            welcome_bonus: 100,
            referral_bonus: 50
          }
        });
      
      settingsBrandId = createResponse.body.data.brand.id;
      createdBrandIds.push(settingsBrandId);
    });

    it('should get brand settings', async () => {
      const response = await request(TEST_BASE_URL)
        .get(`/api/v1/brands/${settingsBrandId}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('settings');
      expect(response.body.data.settings).toHaveProperty('max_daily_spins');
      expect(response.body.data.settings).toHaveProperty('points_per_spin');
    });

    it('should update brand settings', async () => {
      const newSettings = {
        max_daily_spins: 5,
        points_per_spin: 15,
        welcome_bonus: 150,
        spin_cooldown: 3600 // 1 hour
      };

      const response = await request(TEST_BASE_URL)
        .put(`/api/v1/brands/${settingsBrandId}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ settings: newSettings })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.settings.max_daily_spins).toBe(5);
      expect(response.body.data.settings.points_per_spin).toBe(15);
      expect(response.body.data.settings.welcome_bonus).toBe(150);
    });

    it('should validate settings values', async () => {
      const invalidSettings = {
        max_daily_spins: -1, // Invalid negative value
        points_per_spin: 'invalid' // Invalid type
      };

      const response = await request(TEST_BASE_URL)
        .put(`/api/v1/brands/${settingsBrandId}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ settings: invalidSettings })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Brand Theme Configuration', () => {
    let themeBrandId;

    beforeAll(async () => {
      // Create a brand for theme tests
      const createResponse = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Theme Test Brand',
          slug: 'theme-test-brand',
          theme_config: {
            primary_color: '#007bff',
            secondary_color: '#6c757d',
            accent_color: '#28a745',
            font_family: 'Arial, sans-serif',
            logo_position: 'center'
          }
        });
      
      themeBrandId = createResponse.body.data.brand.id;
      createdBrandIds.push(themeBrandId);
    });

    it('should get brand theme configuration', async () => {
      const response = await request(TEST_BASE_URL)
        .get(`/api/v1/brands/${themeBrandId}/theme`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('theme_config');
      expect(response.body.data.theme_config).toHaveProperty('primary_color');
      expect(response.body.data.theme_config).toHaveProperty('secondary_color');
    });

    it('should update brand theme configuration', async () => {
      const newTheme = {
        primary_color: '#dc3545',
        secondary_color: '#ffc107',
        accent_color: '#17a2b8',
        font_family: 'Helvetica, sans-serif',
        border_radius: '8px',
        button_style: 'rounded'
      };

      const response = await request(TEST_BASE_URL)
        .put(`/api/v1/brands/${themeBrandId}/theme`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ theme_config: newTheme })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.theme_config.primary_color).toBe('#dc3545');
      expect(response.body.data.theme_config.font_family).toBe('Helvetica, sans-serif');
    });

    it('should validate color format in theme', async () => {
      const invalidTheme = {
        primary_color: 'invalid-color',
        secondary_color: '#xyz123' // Invalid hex color
      };

      const response = await request(TEST_BASE_URL)
        .put(`/api/v1/brands/${themeBrandId}/theme`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ theme_config: invalidTheme })
        .expect(400);

      expect(response.body.error).toContain('color');
    });

    it('should reset theme to default', async () => {
      const response = await request(TEST_BASE_URL)
        .delete(`/api/v1/brands/${themeBrandId}/theme`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset');
    });
  });

  describe('Brand Status Management', () => {
    let statusBrandId;

    beforeAll(async () => {
      // Create a brand for status tests
      const createResponse = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Status Test Brand',
          slug: 'status-test-brand'
        });
      
      statusBrandId = createResponse.body.data.brand.id;
      createdBrandIds.push(statusBrandId);
    });

    it('should activate brand', async () => {
      const response = await request(TEST_BASE_URL)
        .patch(`/api/v1/brands/${statusBrandId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.brand.status).toBe('active');
    });

    it('should deactivate brand', async () => {
      const response = await request(TEST_BASE_URL)
        .patch(`/api/v1/brands/${statusBrandId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.brand.status).toBe('inactive');
    });

    it('should suspend brand', async () => {
      const response = await request(TEST_BASE_URL)
        .patch(`/api/v1/brands/${statusBrandId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Policy violation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.brand.status).toBe('suspended');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle very long brand names', async () => {
      const longName = 'A'.repeat(256); // Assuming max length is 255
      const brandData = {
        name: longName,
        slug: 'long-name-brand'
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(brandData)
        .expect(400);

      expect(response.body.error).toContain('name');
    });

    it('should handle special characters in brand data', async () => {
      const specialCharBrand = {
        name: 'Brand with Special Chars: @#$%^&*()',
        slug: 'special-char-brand',
        description: 'Testing special characters: <script>alert("xss")</script>'
      };

      const response = await request(TEST_BASE_URL)
        .post('/api/v1/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(specialCharBrand)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Ensure XSS is prevented
      expect(response.body.data.brand.description).not.toContain('<script>');
      
      createdBrandIds.push(response.body.data.brand.id);
    });

    it('should handle concurrent brand creation with same slug', async () => {
      const brandData = {
        name: 'Concurrent Test Brand',
        slug: `concurrent-test-${Date.now()}`
      };

      // Make two concurrent requests
      const [response1, response2] = await Promise.allSettled([
        request(TEST_BASE_URL)
          .post('/api/v1/brands')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(brandData),
        request(TEST_BASE_URL)
          .post('/api/v1/brands')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(brandData)
      ]);

      // One should succeed, one should fail
      const responses = [response1, response2].map(r => r.value || r.reason);
      const successCount = responses.filter(r => r.status === 201).length;
      const errorCount = responses.filter(r => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(errorCount).toBe(1);

      // Clean up successful creation
      const successResponse = responses.find(r => r.status === 201);
      if (successResponse) {
        createdBrandIds.push(successResponse.body.data.brand.id);
      }
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent read requests', async () => {
      const concurrentRequests = Array(10).fill().map(() => 
        request(TEST_BASE_URL)
          .get('/api/v1/brands')
          .expect(200)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('brands');
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(TEST_BASE_URL)
        .get('/api/v1/brands')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });
  });
});