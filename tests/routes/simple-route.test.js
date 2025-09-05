/**
 * Simple Route Test
 * Basic route test to verify Express and Supertest setup
 */

const request = require('supertest');
const express = require('express');

// Create a simple test app
const app = express();
app.use(express.json());

// Simple test routes
app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Test route working' });
});

app.post('/test', (req, res) => {
  res.json({ success: true, data: req.body });
});

app.get('/test/error', (req, res) => {
  res.status(400).json({ success: false, message: 'Test error' });
});

describe('Simple Route Tests', () => {
  test('should handle GET request', async () => {
    const response = await request(app)
      .get('/test');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Test route working');
  });

  test('should handle POST request with data', async () => {
    const testData = { name: 'test', value: 123 };
    
    const response = await request(app)
      .post('/test')
      .send(testData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(testData);
  });

  test('should handle error responses', async () => {
    const response = await request(app)
      .get('/test/error');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Test error');
  });

  test('should handle 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown');

    expect(response.status).toBe(404);
  });
});