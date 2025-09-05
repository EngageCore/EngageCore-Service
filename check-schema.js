/**
 * Quick script to check database schema
 */

const db = require('./config/database');

async function checkSchema() {
  let client;
  
  try {
    client = await db.connect();
    console.log('Connected to database');
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nExisting tables:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check users table structure if it exists
    const usersTableExists = tablesResult.rows.some(row => row.table_name === 'users');
    
    if (usersTableExists) {
      console.log('\nUsers table columns:');
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      columnsResult.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('\nUsers table does not exist');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (client) {
      client.release();
    }
    process.exit(0);
  }
}

checkSchema();