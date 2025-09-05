/**
 * Database Seed Script
 * Populates the database with initial data for development and testing
 */

const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../src/utils');

class DatabaseSeeder {
  constructor() {
    this.client = null;
    this.seedData = {
      users: [],
      brands: [],
      members: [],
      wheels: [],
      wheelItems: [],
      missions: [],
      transactions: []
    };
  }

  async connect() {
    try {
      this.client = await db.connect();
      logger.info('Connected to database for seeding');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      this.client.release();
      logger.info('Disconnected from database');
    }
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  async seedUsers() {
    logger.info('Seeding users...');
    
    const users = [
      {
        email: 'admin@engage-service.com',
        password: 'Admin123!',
        first_name: 'Super',
        last_name: 'Admin',
        is_admin: true,
        email_verified: true
      },
      {
        email: 'admin@demo-brand.com',
        password: 'BrandAdmin123!',
        first_name: 'Brand',
        last_name: 'Administrator',
        is_admin: true,
        email_verified: true
      },
      {
        email: 'manager@demo-brand.com',
        password: 'Manager123!',
        first_name: 'Brand',
        last_name: 'Manager',
        is_admin: false,
        email_verified: true
      }
    ];

    for (const user of users) {
      const passwordHash = await this.hashPassword(user.password);
      
      const result = await this.client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, role, status,
          email_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `, [
        user.email, passwordHash, user.first_name, user.last_name,
        user.is_admin ? 'super_admin' : 'brand_admin', 'active', user.email_verified,
        new Date(), new Date()
      ]);

      if (result.rows.length > 0) {
        this.seedData.users.push({ ...user, id: result.rows[0].id });
        logger.info(`Created user: ${user.email}`);
      } else {
        // User already exists, get the existing ID
        const existingUser = await this.client.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );
        if (existingUser.rows.length > 0) {
          this.seedData.users.push({ ...user, id: existingUser.rows[0].id });
        }
      }
    }
  }

  async checkDatabaseStatus() {
    logger.info('Checking database status...');
    
    // Check if data already exists from migrations
    const userCount = await this.client.query('SELECT COUNT(*) FROM users');
    const brandCount = await this.client.query('SELECT COUNT(*) FROM brands');
    const memberCount = await this.client.query('SELECT COUNT(*) FROM members');
    const wheelCount = await this.client.query('SELECT COUNT(*) FROM wheels');
    const missionCount = await this.client.query('SELECT COUNT(*) FROM missions');
    
    logger.info(`Database already contains:`);
    logger.info(`- Users: ${userCount.rows[0].count}`);
    logger.info(`- Brands: ${brandCount.rows[0].count}`);
    logger.info(`- Members: ${memberCount.rows[0].count}`);
    logger.info(`- Wheels: ${wheelCount.rows[0].count}`);
    logger.info(`- Missions: ${missionCount.rows[0].count}`);
    
    return {
      users: parseInt(userCount.rows[0].count),
      brands: parseInt(brandCount.rows[0].count),
      members: parseInt(memberCount.rows[0].count),
      wheels: parseInt(wheelCount.rows[0].count),
      missions: parseInt(missionCount.rows[0].count)
    };
  }

  async seedMembers() {
    logger.info('Seeding members...');
    
    const demoBrand = this.seedData.brands.find(b => b.slug === 'demo-brand');
    
    const members = [
      {
        brand_id: demoBrand.id,
        email: 'john.doe@email.com',
        phone: '+1-555-0101',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1985-06-15',
        gender: 'male',
        status: 'active',
        points_balance: 2500,
        total_points_earned: 5000,
        total_points_redeemed: 2500,
        tier_level: 'gold',
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          language: 'en',
          timezone: 'America/New_York'
        },
        tags: ['vip', 'frequent_buyer', 'mobile_user'],
        external_id: 'CUST001'
      },
      {
        brand_id: demoBrand.id,
        email: 'jane.smith@email.com',
        phone: '+1-555-0102',
        first_name: 'Jane',
        last_name: 'Smith',
        date_of_birth: '1990-03-22',
        gender: 'female',
        status: 'active',
        points_balance: 1200,
        total_points_earned: 2400,
        total_points_redeemed: 1200,
        tier_level: 'silver',
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          language: 'en',
          timezone: 'America/Los_Angeles'
        },
        tags: ['new_member', 'social_media'],
        external_id: 'CUST002'
      },
      {
        brand_id: demoBrand.id,
        email: 'mike.johnson@email.com',
        phone: '+1-555-0103',
        first_name: 'Mike',
        last_name: 'Johnson',
        date_of_birth: '1978-11-08',
        gender: 'male',
        status: 'active',
        points_balance: 500,
        total_points_earned: 800,
        total_points_redeemed: 300,
        tier_level: 'bronze',
        preferences: {
          emailNotifications: false,
          smsNotifications: false,
          language: 'en',
          timezone: 'America/Chicago'
        },
        tags: ['occasional_buyer'],
        external_id: 'CUST003'
      },
      {
        brand_id: demoBrand.id,
        email: 'sarah.wilson@email.com',
        phone: '+1-555-0104',
        first_name: 'Sarah',
        last_name: 'Wilson',
        date_of_birth: '1992-07-14',
        gender: 'female',
        status: 'active',
        points_balance: 3800,
        total_points_earned: 7600,
        total_points_redeemed: 3800,
        tier_level: 'platinum',
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          language: 'en',
          timezone: 'America/New_York'
        },
        tags: ['vip', 'brand_ambassador', 'high_value'],
        external_id: 'CUST004'
      }
    ];

    for (const member of members) {
      const result = await this.client.query(`
        INSERT INTO members (
          brand_id, email, phone, first_name, last_name, date_of_birth, gender,
          status, points_balance, total_points_earned, total_points_redeemed,
          tier_level, join_date, last_activity, preferences, tags, external_id,
          metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (brand_id, email) DO NOTHING
        RETURNING id
      `, [
        member.brand_id, member.email, member.phone, member.first_name, member.last_name,
        member.date_of_birth, member.gender, member.status, member.points_balance,
        member.total_points_earned, member.total_points_redeemed, member.tier_level,
        new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Random join date within last 6 months
        new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random last activity within last week
        JSON.stringify(member.preferences), member.tags, member.external_id,
        '{}', new Date(), new Date()
      ]);

      if (result.rows.length > 0) {
        this.seedData.members.push({ ...member, id: result.rows[0].id });
        logger.info(`Created member: ${member.email}`);
      }
    }
  }

  async seedWheels() {
    logger.info('Seeding wheels...');
    
    const demoBrand = this.seedData.brands.find(b => b.slug === 'demo-brand');
    const brandAdmin = this.seedData.users.find(u => u.email === 'admin@demo-brand.com');
    
    const wheels = [
      {
        id: uuidv4(),
        brand_id: demoBrand.id,
        name: 'Daily Rewards Wheel',
        description: 'Spin daily to earn bonus points and exclusive rewards',
        status: 'active',
        max_spins_per_day: 3,
        cost_per_spin: 0,
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        settings: {
          animation: {
            duration: 3000,
            easing: 'ease-out'
          },
          sound: {
            enabled: true,
            volume: 0.5
          },
          colors: {
            background: '#f8f9fa',
            border: '#dee2e6'
          }
        },
        created_by: brandAdmin.id
      },
      {
        id: uuidv4(),
        brand_id: demoBrand.id,
        name: 'VIP Exclusive Wheel',
        description: 'Premium wheel for VIP members with higher rewards',
        status: 'active',
        max_spins_per_day: 5,
        cost_per_spin: 100,
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        settings: {
          animation: {
            duration: 4000,
            easing: 'ease-in-out'
          },
          sound: {
            enabled: true,
            volume: 0.7
          },
          colors: {
            background: '#ffd700',
            border: '#ffb347'
          },
          restrictions: {
            minTierLevel: 'gold'
          }
        },
        created_by: brandAdmin.id
      }
    ];

    for (const wheel of wheels) {
      const result = await this.client.query(`
        INSERT INTO wheels (
          id, brand_id, name, description, status, max_spins_per_day,
          cost_per_spin, start_date, end_date, settings, metadata,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        wheel.id, wheel.brand_id, wheel.name, wheel.description, wheel.status,
        wheel.max_spins_per_day, wheel.cost_per_spin, wheel.start_date,
        wheel.end_date, JSON.stringify(wheel.settings), '{}',
        wheel.created_by, new Date(), new Date()
      ]);

      if (result.rows.length > 0) {
        this.seedData.wheels.push({ ...wheel, id: result.rows[0].id });
        logger.info(`Created wheel: ${wheel.name}`);
      }
    }

    await this.seedWheelItems();
  }

  async seedWheelItems() {
    logger.info('Seeding wheel items...');
    
    const dailyWheel = this.seedData.wheels.find(w => w.name === 'Daily Rewards Wheel');
    const vipWheel = this.seedData.wheels.find(w => w.name === 'VIP Exclusive Wheel');
    
    const wheelItems = [
      // Daily Rewards Wheel Items
      {
        wheel_id: dailyWheel.id,
        name: '50 Points',
        description: 'Earn 50 bonus points',
        reward_type: 'points',
        reward_value: 50,
        probability: 0.3,
        color: '#28a745',
        position: 1
      },
      {
        wheel_id: dailyWheel.id,
        name: '100 Points',
        description: 'Earn 100 bonus points',
        reward_type: 'points',
        reward_value: 100,
        probability: 0.25,
        color: '#007bff',
        position: 2
      },
      {
        wheel_id: dailyWheel.id,
        name: '200 Points',
        description: 'Earn 200 bonus points',
        reward_type: 'points',
        reward_value: 200,
        probability: 0.15,
        color: '#ffc107',
        position: 3
      },
      {
        wheel_id: dailyWheel.id,
        name: '10% Discount',
        description: '10% off your next purchase',
        reward_type: 'discount',
        reward_value: 10,
        probability: 0.2,
        color: '#e91e63',
        position: 4
      },
      {
        wheel_id: dailyWheel.id,
        name: 'Try Again',
        description: 'Better luck next time!',
        reward_type: 'points',
        reward_value: 0,
        probability: 0.1,
        color: '#6c757d',
        position: 5
      },
      // VIP Exclusive Wheel Items
      {
        wheel_id: vipWheel.id,
        name: '500 Points',
        description: 'Earn 500 premium points',
        reward_type: 'points',
        reward_value: 500,
        probability: 0.25,
        color: '#28a745',
        position: 1
      },
      {
        wheel_id: vipWheel.id,
        name: '1000 Points',
        description: 'Earn 1000 premium points',
        reward_type: 'points',
        reward_value: 1000,
        probability: 0.15,
        color: '#007bff',
        position: 2
      },
      {
        wheel_id: vipWheel.id,
        name: '25% Discount',
        description: '25% off your next purchase',
        reward_type: 'discount',
        reward_value: 25,
        probability: 0.2,
        color: '#e91e63',
        position: 3
      },
      {
        wheel_id: vipWheel.id,
        name: 'Free Shipping',
        description: 'Free shipping on your next order',
        reward_type: 'discount',
        reward_value: 100,
        probability: 0.25,
        color: '#17a2b8',
        position: 4
      },
      {
        wheel_id: vipWheel.id,
        name: 'VIP Experience',
        description: 'Exclusive VIP shopping experience',
        reward_type: 'experience',
        reward_value: 1,
        probability: 0.15,
        color: '#ffd700',
        position: 5
      }
    ];

    for (const item of wheelItems) {
      const result = await this.client.query(`
        INSERT INTO wheel_items (
          wheel_id, name, description, reward_type, reward_value,
          probability, color, position, is_active, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        item.wheel_id, item.name, item.description, item.reward_type,
        item.reward_value, item.probability, item.color, item.position,
        true, '{}', new Date(), new Date()
      ]);

      if (result.rows.length > 0) {
        this.seedData.wheelItems.push({ ...item, id: result.rows[0].id });
        logger.info(`Created wheel item: ${item.name}`);
      }
    }
  }

  async seedMissions() {
    logger.info('Seeding missions...');
    
    const demoBrand = this.seedData.brands.find(b => b.slug === 'demo-brand');
    const brandAdmin = this.seedData.users.find(u => u.email === 'admin@demo-brand.com');
    
    const missions = [
      {
        id: uuidv4(),
        brand_id: demoBrand.id,
        name: 'Daily Login',
        description: 'Login to your account daily to earn bonus points',
        type: 'daily',
        status: 'active',
        target_value: 1,
        target_unit: 'login',
        reward_points: 50,
        reward_description: 'Earn 50 points for daily login',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        max_completions_per_member: 1,
        requirements: {
          action: 'login',
          frequency: 'daily'
        },
        settings: {
          autoReset: true,
          resetTime: '00:00'
        },
        created_by: brandAdmin.id
      },
      {
        id: uuidv4(),
        brand_id: demoBrand.id,
        name: 'Weekly Spinner',
        description: 'Spin the wheel 5 times this week',
        type: 'weekly',
        status: 'active',
        target_value: 5,
        target_unit: 'spins',
        reward_points: 200,
        reward_description: 'Earn 200 bonus points for spinning 5 times',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        max_completions_per_member: 1,
        requirements: {
          action: 'wheel_spin',
          count: 5,
          period: 'week'
        },
        settings: {
          autoReset: true,
          resetDay: 'monday'
        },
        created_by: brandAdmin.id
      },
      {
        id: uuidv4(),
        brand_id: demoBrand.id,
        name: 'Points Collector',
        description: 'Earn 1000 points through various activities',
        type: 'one_time',
        status: 'active',
        target_value: 1000,
        target_unit: 'points',
        reward_points: 500,
        reward_description: 'Earn 500 bonus points for collecting 1000 points',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        max_completions_per_member: 1,
        requirements: {
          action: 'earn_points',
          amount: 1000
        },
        settings: {
          trackingEnabled: true
        },
        created_by: brandAdmin.id
      },
      {
        id: uuidv4(),
        brand_id: demoBrand.id,
        name: 'Monthly Challenge',
        description: 'Complete 10 activities this month',
        type: 'monthly',
        status: 'active',
        target_value: 10,
        target_unit: 'activities',
        reward_points: 1000,
        reward_description: 'Earn 1000 bonus points for monthly challenge',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        max_completions_per_member: 1,
        requirements: {
          actions: ['login', 'wheel_spin', 'profile_update'],
          count: 10,
          period: 'month'
        },
        settings: {
          autoReset: true,
          resetDay: 1
        },
        created_by: brandAdmin.id
      }
    ];

    for (const mission of missions) {
      const result = await this.client.query(`
        INSERT INTO missions (
          id, brand_id, name, description, type, status, target_value,
          target_unit, reward_points, reward_description, start_date,
          end_date, max_completions_per_member, requirements, settings,
          metadata, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id
      `, [
        mission.id, mission.brand_id, mission.name, mission.description,
        mission.type, mission.status, mission.target_value, mission.target_unit,
        mission.reward_points, mission.reward_description, mission.start_date,
        mission.end_date, mission.max_completions_per_member,
        JSON.stringify(mission.requirements), JSON.stringify(mission.settings),
        '{}', mission.created_by, new Date(), new Date()
      ]);

      if (result.rows.length > 0) {
        this.seedData.missions.push({ ...mission, id: result.rows[0].id });
        logger.info(`Created mission: ${mission.name}`);
      }
    }
  }

  async seedTransactions() {
    logger.info('Seeding sample transactions...');
    
    const demoBrand = this.seedData.brands.find(b => b.slug === 'demo-brand');
    const members = this.seedData.members;
    
    const transactionTypes = ['earn', 'redeem', 'bonus', 'adjustment'];
    const descriptions = {
      earn: ['Purchase reward', 'Activity bonus', 'Referral reward'],
      redeem: ['Product redemption', 'Discount applied', 'Gift card purchase'],
      bonus: ['Welcome bonus', 'Birthday bonus', 'Loyalty bonus'],
      adjustment: ['Points correction', 'Customer service adjustment']
    };

    for (const member of members) {
      // Create 3-5 random transactions per member
      const transactionCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < transactionCount; i++) {
        const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
        const amount = type === 'redeem' 
          ? -(Math.floor(Math.random() * 500) + 50) // Negative for redemptions
          : Math.floor(Math.random() * 300) + 25; // Positive for earnings
        
        const description = descriptions[type][Math.floor(Math.random() * descriptions[type].length)];
        const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Random date within last 90 days
        
        await this.client.query(`
          INSERT INTO transactions (
            brand_id, member_id, type, status, amount, description,
            reference_type, processed_at, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          demoBrand.id, member.id, type, 'completed', amount, description,
          'seed_data', createdAt, '{}', createdAt, createdAt
        ]);
      }
    }

    logger.info(`Created sample transactions for ${members.length} members`);
  }

  async cleanup() {
    logger.info('Cleaning up existing seed data...');
    
    const tables = [
      'audit_logs',
      'refresh_tokens',
      'mission_completions',
      'spins',
      'transactions',
      'wheel_items',
      'wheels',
      'missions',
      'members',
      'brand_users',
      'brands',
      'users'
    ];

    for (const table of tables) {
      try {
        await this.client.query(`DELETE FROM ${table} WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'`);
        logger.info(`Cleaned up ${table}`);
      } catch (error) {
        logger.warn(`Failed to cleanup ${table}:`, error.message);
      }
    }
  }

  async seed() {
    try {
      await this.connect();
      
      logger.info('Starting database seeding...');
      
      // Check if database is already populated from migrations
      const dbStatus = await this.checkDatabaseStatus();
      
      if (dbStatus.users > 0 && dbStatus.brands > 0) {
        logger.info('Database already contains seed data from migrations. Skipping additional seeding.');
      } else {
        await this.seedUsers();
        logger.info('Additional seed data created.');
      }
      
      logger.info('Database seeding completed successfully!');
      
      // Print summary
      console.log('\n=== Database Status Summary ===');
      console.log(`Users: ${dbStatus.users}`);
      console.log(`Brands: ${dbStatus.brands}`);
      console.log(`Members: ${dbStatus.members}`);
      console.log(`Wheels: ${dbStatus.wheels}`);
      console.log(`Missions: ${dbStatus.missions}`);
      console.log('===============================\n');
      
      console.log('Test Accounts:');
      console.log('Super Admin: admin@engage-service.com / Admin123!');
      console.log('Brand Admin: admin@demo-brand.com / BrandAdmin123!');
      console.log('Brand Manager: manager@demo-brand.com / Manager123!');
      console.log('\nTest Members:');
      this.seedData.members.forEach(member => {
        console.log(`${member.first_name} ${member.last_name}: ${member.email} (${member.tier_level}, ${member.points_balance} points)`);
      });
      
    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI execution
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  
  const command = process.argv[2];
  
  if (command === 'cleanup') {
    seeder.connect()
      .then(() => seeder.cleanup())
      .then(() => {
        console.log('Cleanup completed successfully!');
        process.exit(0);
      })
      .catch(error => {
        console.error('Cleanup failed:', error);
        process.exit(1);
      })
      .finally(() => seeder.disconnect());
  } else {
    seeder.seed()
      .then(() => {
        console.log('Seeding completed successfully!');
        process.exit(0);
      })
      .catch(error => {
        console.error('Seeding failed:', error);
        process.exit(1);
      });
  }
}

module.exports = DatabaseSeeder;