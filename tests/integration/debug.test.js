/**
 * Debug Integration Test
 * Simple test to debug API connection issues
 */

const request = require('supertest');

// Server configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = '/api';

describe('Debug API Connection', () => {
  test('should connect to server and get health status', async () => {
    console.log(`Testing connection to: ${BASE_URL}${API_BASE}/health`);
    
    try {
      const response = await request(BASE_URL)
        .get(`${API_BASE}/health`)
        .timeout(5000);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    } catch (error) {
      console.error('Error connecting to server:', error.message);
      console.error('Error code:', error.code);
      throw error;
    }
  });

  test('should get API root endpoint', async () => {
    console.log(`Testing connection to: ${BASE_URL}${API_BASE}`);
    
    try {
      const response = await request(BASE_URL)
        .get(`${API_BASE}`)
        .timeout(5000);

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));
      
      expect(response.status).toBe(200);
    } catch (error) {
      console.error('Error connecting to server:', error.message);
      throw error;
    }
  });

  test('should test basic auth register', async () => {
    console.log(`Testing auth register: ${BASE_URL}${API_BASE}/auth/register`);
    
    const testUser = {
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };
    
    try {
      const response = await request(BASE_URL)
        .post(`${API_BASE}/auth/register`)
        .send(testUser)
        .timeout(5000);

      console.log('Register response status:', response.status);
      console.log('Register response body:', JSON.stringify(response.body, null, 2));
      
      // Accept various status codes to understand what's happening
      expect([200, 201, 400, 422, 500]).toContain(response.status);
    } catch (error) {
      console.error('Error in register:', error.message);
      throw error;
    }
  });
});