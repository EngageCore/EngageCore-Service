/**
 * Simple Test Server
 * Provides basic endpoints for testing without full application dependencies
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

class TestServer {
  constructor(port = 3000) {
    this.app = express();
    this.port = port;
    this.server = null;
    this.users = new Map();
    this.brands = new Map();
    this.wheels = new Map();
    this.spinHistory = new Map();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupTestData();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
      next();
    });
  }

  setupTestData() {
    // Create test brand
    const brandId = '550e8400-e29b-41d4-a716-446655440001';
    this.brands.set(brandId, {
      id: brandId,
      name: 'Test Brand',
      slug: 'test-brand',
      status: 'active',
      created_at: new Date().toISOString()
    });

    // Create test wheel
    const wheelId = '550e8400-e29b-41d4-a716-446655440031';
    this.wheels.set(wheelId, {
      id: wheelId,
      brand_id: brandId,
      name: 'Test Wheel',
      status: 'active',
      daily_spin_limit: 3,
      points_required: 100,
      items: [
        { id: '1', name: 'Prize 1', probability: 0.3, type: 'points', value: 100 },
        { id: '2', name: 'Prize 2', probability: 0.2, type: 'points', value: 200 },
        { id: '3', name: 'Prize 3', probability: 0.5, type: 'points', value: 50 }
      ]
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Auth routes
    this.app.post('/api/v1/auth/register', (req, res) => {
      const { email, password, first_name, last_name, brand_id } = req.body;
      
      if (!email || !password || !brand_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (this.users.has(email)) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const userId = uuidv4();
      const user = {
        id: userId,
        email,
        first_name,
        last_name,
        brand_id,
        status: 'active',
        points: 1000, // Give test users some points
        created_at: new Date().toISOString()
      };

      this.users.set(email, user);
      
      res.status(201).json({
        success: true,
        data: {
          user: { ...user, password: undefined },
          token: `test-token-${userId}`,
          refreshToken: `test-refresh-${userId}`
        }
      });
    });

    this.app.post('/api/v1/auth/login', (req, res) => {
      const { email, password, brand_id } = req.body;
      
      if (!email || !password || !brand_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const user = this.users.get(email);
      if (!user || user.brand_id !== brand_id) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.json({
        success: true,
        data: {
          user,
          token: `test-token-${user.id}`,
          refreshToken: `test-refresh-${user.id}`
        }
      });
    });

    this.app.get('/api/v1/auth/me', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const userId = token.replace('test-token-', '');
      
      const user = Array.from(this.users.values()).find(u => u.id === userId);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.json({ success: true, data: { user } });
    });

    // Brand routes
    this.app.get('/api/v1/brands', (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const brands = Array.from(this.brands.values());
      
      res.json({
        success: true,
        data: {
          brands: brands.slice((page - 1) * limit, page * limit),
          pagination: {
            page,
            limit,
            total: brands.length,
            pages: Math.ceil(brands.length / limit)
          }
        }
      });
    });

    this.app.get('/api/v1/brands/:id', (req, res) => {
      const brand = this.brands.get(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: 'Brand not found' });
      }
      res.json({ success: true, data: { brand } });
    });

    // Wheel routes
    this.app.get('/api/v1/wheels/:id', (req, res) => {
      const wheel = this.wheels.get(req.params.id);
      if (!wheel) {
        return res.status(404).json({ error: 'Wheel not found' });
      }
      res.json({ success: true, data: { wheel } });
    });

    this.app.post('/api/v1/wheels/:id/spin', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const userId = token.replace('test-token-', '');
      
      const user = Array.from(this.users.values()).find(u => u.id === userId);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const wheel = this.wheels.get(req.params.id);
      if (!wheel) {
        return res.status(404).json({ error: 'Wheel not found' });
      }

      // Simple rate limiting check
      const today = new Date().toDateString();
      const userSpinsToday = Array.from(this.spinHistory.values())
        .filter(spin => spin.user_id === userId && new Date(spin.created_at).toDateString() === today)
        .length;

      if (userSpinsToday >= wheel.daily_spin_limit) {
        return res.status(429).json({ error: 'Daily spin limit exceeded' });
      }

      // Select random prize
      const random = Math.random();
      let cumulative = 0;
      let selectedItem = wheel.items[0];
      
      for (const item of wheel.items) {
        cumulative += item.probability;
        if (random <= cumulative) {
          selectedItem = item;
          break;
        }
      }

      // Record spin
      const spinId = uuidv4();
      const spin = {
        id: spinId,
        user_id: userId,
        wheel_id: wheel.id,
        item_id: selectedItem.id,
        prize_name: selectedItem.name,
        prize_value: selectedItem.value,
        created_at: new Date().toISOString()
      };

      this.spinHistory.set(spinId, spin);

      // Update user points
      if (selectedItem.type === 'points') {
        user.points += selectedItem.value;
      }

      res.json({
        success: true,
        data: {
          spin,
          prize: selectedItem,
          user_points: user.points
        }
      });
    });

    this.app.get('/api/v1/wheels/history', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const userId = token.replace('test-token-', '');
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const userSpins = Array.from(this.spinHistory.values())
        .filter(spin => spin.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      res.json({
        success: true,
        data: {
          spins: userSpins.slice((page - 1) * limit, page * limit),
          pagination: {
            page,
            limit,
            total: userSpins.length,
            pages: Math.ceil(userSpins.length / limit)
          }
        }
      });
    });

    // Member routes
    this.app.get('/api/v1/members/profile', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const userId = token.replace('test-token-', '');
      
      const user = Array.from(this.users.values()).find(u => u.id === userId);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.json({
        success: true,
        data: {
          member: {
            ...user,
            tier: 'bronze',
            total_spins: Array.from(this.spinHistory.values()).filter(s => s.user_id === userId).length
          }
        }
      });
    });

    // Transaction routes
    this.app.get('/api/v1/transactions', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      // Mock transactions based on spin history
      const token = authHeader.substring(7);
      const userId = token.replace('test-token-', '');
      
      const transactions = Array.from(this.spinHistory.values())
        .filter(spin => spin.user_id === userId)
        .map(spin => ({
          id: `txn-${spin.id}`,
          user_id: userId,
          type: 'reward',
          amount: spin.prize_value,
          description: `Wheel spin reward: ${spin.prize_name}`,
          created_at: spin.created_at
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      res.json({
        success: true,
        data: {
          transactions: transactions.slice((page - 1) * limit, page * limit),
          pagination: {
            page,
            limit,
            total: transactions.length,
            pages: Math.ceil(transactions.length / limit)
          }
        }
      });
    });

    // Mission routes
    this.app.get('/api/v1/missions/available', (req, res) => {
      const missions = [
        {
          id: uuidv4(),
          name: 'Daily Login',
          description: 'Login to the platform',
          reward_points: 50,
          status: 'available'
        },
        {
          id: uuidv4(),
          name: 'Spin the Wheel',
          description: 'Spin the wheel 3 times',
          reward_points: 100,
          status: 'available'
        }
      ];

      res.json({ success: true, data: { missions } });
    });

    // Catch all for unhandled routes
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Error handler
    this.app.use((error, req, res, next) => {
      console.error('Server error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`🚀 Test server running on http://localhost:${this.port}`);
          resolve();
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Test server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getStats() {
    return {
      users: this.users.size,
      brands: this.brands.size,
      wheels: this.wheels.size,
      spins: this.spinHistory.size
    };
  }
}

// CLI usage
if (require.main === module) {
  const server = new TestServer();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down test server...');
    await server.stop();
    process.exit(0);
  });
  
  server.start().catch(error => {
    console.error('❌ Failed to start test server:', error);
    process.exit(1);
  });
}

module.exports = TestServer;