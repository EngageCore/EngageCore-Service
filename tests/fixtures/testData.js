/**
 * Test fixtures and mock data for all entities
 * Used across unit and integration tests
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Generate consistent UUIDs for testing
const generateTestUUID = (seed) => {
  const uuids = {
    brand1: '550e8400-e29b-41d4-a716-446655440001',
    brand2: '550e8400-e29b-41d4-a716-446655440002',
    user1: '550e8400-e29b-41d4-a716-446655440011',
    user2: '550e8400-e29b-41d4-a716-446655440012',
    member1: '550e8400-e29b-41d4-a716-446655440021',
    member2: '550e8400-e29b-41d4-a716-446655440022',
    wheel1: '550e8400-e29b-41d4-a716-446655440031',
    mission1: '550e8400-e29b-41d4-a716-446655440041',
    transaction1: '550e8400-e29b-41d4-a716-446655440051'
  };
  return uuids[seed] || uuidv4();
};

// Brand test data
const brands = {
  validBrand: {
    id: generateTestUUID('brand1'),
    name: 'Test Brand',
    slug: 'test-brand',
    settings: {
      timezone: 'UTC',
      currency: 'USD',
      theme: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d'
      }
    },
    logo_url: 'https://example.com/logo.png',
    theme_config: {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d'
      },
      fonts: {
        primary: 'Arial, sans-serif'
      }
    },
    active: true
  },
  secondBrand: {
    id: generateTestUUID('brand2'),
    name: 'Second Test Brand',
    slug: 'second-brand',
    settings: {
      timezone: 'EST',
      currency: 'EUR'
    },
    active: true
  },
  createBrandData: {
    name: 'New Test Brand',
    slug: 'new-test-brand',
    settings: {
      timezone: 'PST',
      currency: 'USD'
    }
  },
  updateBrandData: {
    name: 'Updated Test Brand',
    settings: {
      timezone: 'UTC',
      currency: 'GBP'
    }
  }
};

// User test data
const users = {
  validUser: {
    id: generateTestUUID('user1'),
    brand_id: generateTestUUID('brand1'),
    email: 'test@example.com',
    password_hash: bcrypt.hashSync('password123', 10),
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890',
    profile_data: {
      avatar: 'https://example.com/avatar.jpg',
      preferences: {
        notifications: true,
        language: 'en'
      }
    },
    active: true
  },
  secondUser: {
    id: generateTestUUID('user2'),
    brand_id: generateTestUUID('brand1'),
    email: 'jane@example.com',
    password_hash: bcrypt.hashSync('password456', 10),
    first_name: 'Jane',
    last_name: 'Smith',
    active: true
  },
  registerData: {
    email: 'newuser@example.com',
    password: 'newpassword123',
    first_name: 'New',
    last_name: 'User',
    brand_id: generateTestUUID('brand1')
  },
  loginData: {
    email: 'test@example.com',
    password: 'password123'
  },
  invalidLoginData: {
    email: 'test@example.com',
    password: 'wrongpassword'
  }
};

// Member test data
const members = {
  validMember: {
    id: generateTestUUID('member1'),
    user_id: generateTestUUID('user1'),
    brand_id: generateTestUUID('brand1'),
    membership_tier_id: null,
    points: 1500,
    total_points_earned: 2000,
    achievements: [
      {
        id: 'first_spin',
        name: 'First Spin',
        earned_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 'mission_master',
        name: 'Mission Master',
        earned_at: '2024-01-20T15:30:00Z'
      }
    ],
    joined_at: '2024-01-01T00:00:00Z',
    last_active_at: '2024-01-25T12:00:00Z'
  },
  secondMember: {
    id: generateTestUUID('member2'),
    user_id: generateTestUUID('user2'),
    brand_id: generateTestUUID('brand1'),
    points: 500,
    total_points_earned: 500,
    achievements: [],
    joined_at: '2024-01-10T00:00:00Z'
  }
};

// Membership tiers test data
const membershipTiers = {
  bronze: {
    id: uuidv4(),
    brand_id: generateTestUUID('brand1'),
    name: 'Bronze',
    min_points: 0,
    benefits: ['Basic rewards', 'Email support'],
    commission_rate: 0.01,
    sort_order: 1,
    active: true
  },
  silver: {
    id: uuidv4(),
    brand_id: generateTestUUID('brand1'),
    name: 'Silver',
    min_points: 1000,
    benefits: ['Basic rewards', 'Priority support', 'Monthly bonus'],
    commission_rate: 0.015,
    sort_order: 2,
    active: true
  },
  gold: {
    id: uuidv4(),
    brand_id: generateTestUUID('brand1'),
    name: 'Gold',
    min_points: 5000,
    benefits: ['All Silver benefits', 'Exclusive offers', 'VIP support'],
    commission_rate: 0.02,
    sort_order: 3,
    active: true
  }
};

// Wheel configuration test data
const wheelConfigs = {
  validWheel: {
    id: generateTestUUID('wheel1'),
    brand_id: generateTestUUID('brand1'),
    name: 'Daily Lucky Wheel',
    daily_spin_limit: 3,
    spin_requirements: {
      min_points: 100,
      member_only: true,
      cooldown_hours: 24
    },
    active: true
  }
};

// Wheel items test data
const wheelItems = [
  {
    id: uuidv4(),
    wheel_config_id: generateTestUUID('wheel1'),
    name: '10 Points',
    type: 'points',
    value: { amount: 10 },
    probability: 0.4,
    image_url: 'https://example.com/10points.png',
    active: true
  },
  {
    id: uuidv4(),
    wheel_config_id: generateTestUUID('wheel1'),
    name: '50 Points',
    type: 'points',
    value: { amount: 50 },
    probability: 0.3,
    active: true
  },
  {
    id: uuidv4(),
    wheel_config_id: generateTestUUID('wheel1'),
    name: '100 Points',
    type: 'points',
    value: { amount: 100 },
    probability: 0.2,
    active: true
  },
  {
    id: uuidv4(),
    wheel_config_id: generateTestUUID('wheel1'),
    name: 'Free Coffee',
    type: 'reward',
    value: { description: 'Free coffee voucher', code: 'COFFEE2024' },
    probability: 0.1,
    active: true
  }
];

// Mission test data
const missions = {
  dailyMission: {
    id: generateTestUUID('mission1'),
    brand_id: generateTestUUID('brand1'),
    title: 'Daily Login',
    description: 'Login to your account daily',
    type: 'daily',
    requirements: {
      action: 'login',
      count: 1,
      period: 'day'
    },
    reward_points: 10,
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    active: true
  },
  weeklyMission: {
    id: uuidv4(),
    brand_id: generateTestUUID('brand1'),
    title: 'Weekly Spinner',
    description: 'Spin the wheel 5 times this week',
    type: 'weekly',
    requirements: {
      action: 'wheel_spin',
      count: 5,
      period: 'week'
    },
    reward_points: 100,
    active: true
  },
  completeMissionData: {
    mission_id: generateTestUUID('mission1'),
    member_id: generateTestUUID('member1'),
    proof_data: {
      timestamp: new Date().toISOString(),
      action: 'login'
    }
  }
};

// Transaction test data
const transactions = {
  pointsEarned: {
    id: generateTestUUID('transaction1'),
    member_id: generateTestUUID('member1'),
    type: 'points_earned',
    amount: 50,
    description: 'Mission completion reward',
    reference_type: 'mission',
    reference_id: generateTestUUID('mission1'),
    balance_after: 1550
  },
  pointsSpent: {
    id: uuidv4(),
    member_id: generateTestUUID('member1'),
    type: 'points_spent',
    amount: -25,
    description: 'Wheel spin cost',
    reference_type: 'wheel_spin',
    reference_id: uuidv4(),
    balance_after: 1525
  },
  wheelPrize: {
    id: uuidv4(),
    member_id: generateTestUUID('member1'),
    type: 'wheel_prize',
    amount: 100,
    description: 'Lucky wheel prize',
    reference_type: 'wheel_spin',
    reference_id: uuidv4(),
    balance_after: 1625
  }
};

// Spin history test data
const spinHistory = {
  validSpin: {
    id: uuidv4(),
    member_id: generateTestUUID('member1'),
    wheel_config_id: generateTestUUID('wheel1'),
    wheel_item_id: wheelItems[0].id,
    spun_at: new Date().toISOString(),
    claimed_at: null,
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 Test Browser'
  },
  claimedSpin: {
    id: uuidv4(),
    member_id: generateTestUUID('member1'),
    wheel_config_id: generateTestUUID('wheel1'),
    wheel_item_id: wheelItems[1].id,
    spun_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    claimed_at: new Date().toISOString(),
    ip_address: '192.168.1.1'
  }
};

// User roles test data
const userRoles = {
  superAdmin: {
    id: uuidv4(),
    user_id: generateTestUUID('user1'),
    role: 'super_admin',
    permissions: ['*'],
    granted_by: null,
    granted_at: new Date().toISOString()
  },
  brandAdmin: {
    id: uuidv4(),
    user_id: generateTestUUID('user2'),
    role: 'brand_admin',
    permissions: ['brand:*', 'user:*', 'member:*'],
    granted_by: generateTestUUID('user1'),
    granted_at: new Date().toISOString()
  }
};

// API response templates
const apiResponses = {
  success: (data = null, message = 'Success') => ({
    success: true,
    message,
    data
  }),
  error: (message = 'Error', code = 'GENERIC_ERROR') => ({
    success: false,
    message,
    error: {
      code,
      details: message
    }
  }),
  validationError: (errors) => ({
    success: false,
    message: 'Validation failed',
    error: {
      code: 'VALIDATION_ERROR',
      details: errors
    }
  }),
  authError: (message = 'Authentication failed') => ({
    success: false,
    message,
    error: {
      code: 'AUTH_ERROR',
      details: message
    }
  })
};

// Test database cleanup functions
const cleanup = {
  async cleanupTestData(db) {
    try {
      // Clean up in reverse dependency order
      await db.query('DELETE FROM spin_history WHERE member_id IN ($1, $2)', [generateTestUUID('member1'), generateTestUUID('member2')]);
      await db.query('DELETE FROM mission_completions WHERE member_id IN ($1, $2)', [generateTestUUID('member1'), generateTestUUID('member2')]);
      await db.query('DELETE FROM transactions WHERE member_id IN ($1, $2)', [generateTestUUID('member1'), generateTestUUID('member2')]);
      await db.query('DELETE FROM claim_history WHERE member_id IN ($1, $2)', [generateTestUUID('member1'), generateTestUUID('member2')]);
      await db.query('DELETE FROM member_membership_history WHERE member_id IN ($1, $2)', [generateTestUUID('member1'), generateTestUUID('member2')]);
      await db.query('DELETE FROM members WHERE id IN ($1, $2)', [generateTestUUID('member1'), generateTestUUID('member2')]);
      await db.query('DELETE FROM user_roles WHERE user_id IN ($1, $2)', [generateTestUUID('user1'), generateTestUUID('user2')]);
      await db.query('DELETE FROM users WHERE id IN ($1, $2)', [generateTestUUID('user1'), generateTestUUID('user2')]);
      await db.query('DELETE FROM wheel_items WHERE wheel_config_id = $1', [generateTestUUID('wheel1')]);
      await db.query('DELETE FROM wheel_configs WHERE id = $1', [generateTestUUID('wheel1')]);
      await db.query('DELETE FROM missions WHERE id = $1', [generateTestUUID('mission1')]);
      await db.query('DELETE FROM membership_tiers WHERE brand_id IN ($1, $2)', [generateTestUUID('brand1'), generateTestUUID('brand2')]);
      await db.query('DELETE FROM brands WHERE id IN ($1, $2)', [generateTestUUID('brand1'), generateTestUUID('brand2')]);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  },

  async setupTestData(db) {
    try {
      // Insert test brands
      await db.query(`
        INSERT INTO brands (id, name, slug, settings, logo_url, theme_config, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [brands.validBrand.id, brands.validBrand.name, brands.validBrand.slug, 
          JSON.stringify(brands.validBrand.settings), brands.validBrand.logo_url, 
          JSON.stringify(brands.validBrand.theme_config), brands.validBrand.active]);

      // Insert test users
      await db.query(`
        INSERT INTO users (id, brand_id, email, password_hash, first_name, last_name, phone, profile_data, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (brand_id, email) DO NOTHING
      `, [users.validUser.id, users.validUser.brand_id, users.validUser.email,
          users.validUser.password_hash, users.validUser.first_name, users.validUser.last_name,
          users.validUser.phone, JSON.stringify(users.validUser.profile_data), users.validUser.active]);

      // Insert test members
      await db.query(`
        INSERT INTO members (id, user_id, brand_id, points, total_points_earned, achievements)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, brand_id) DO NOTHING
      `, [members.validMember.id, members.validMember.user_id, members.validMember.brand_id,
          members.validMember.points, members.validMember.total_points_earned, 
          JSON.stringify(members.validMember.achievements)]);

    } catch (error) {
      console.error('Setup error:', error);
    }
  }
};

module.exports = {
  generateTestUUID,
  brands,
  users,
  members,
  membershipTiers,
  wheelConfigs,
  wheelItems,
  missions,
  transactions,
  spinHistory,
  userRoles,
  apiResponses,
  cleanup,
  setupTestData: cleanup.setupTestData,
  cleanupTestData: cleanup.cleanupTestData,
  testData: {
    brands,
    users,
    members,
    membershipTiers,
    wheelConfigs,
    wheelItems,
    missions,
    transactions,
    spinHistory,
    userRoles
  }
};