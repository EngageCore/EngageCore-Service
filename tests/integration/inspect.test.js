/**
 * Inspect API Responses
 * Simple test to inspect actual API response structures
 */

const request = require('supertest');

// Server configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = '/api';

describe('Inspect API Responses', () => {
  test('should inspect health endpoint response', async () => {
    const response = await request(BASE_URL)
      .get(`${API_BASE}/health`);

    console.log('Health endpoint response:');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(response.body, null, 2));
    
    expect(response.status).toBe(200);
  });

  test('should inspect API root endpoint response', async () => {
    const response = await request(BASE_URL)
      .get(`${API_BASE}`);

    console.log('API root endpoint response:');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(response.body, null, 2));
    
    expect(response.status).toBe(200);
  });
});