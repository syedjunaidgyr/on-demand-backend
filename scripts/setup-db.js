#!/usr/bin/env node

const { sequelize } = require('../models');

const setupDatabase = async () => {
  try {
    console.log('🔧 Setting up database for first time...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Force sync to create tables (this will drop existing tables)
    console.log('⚠️  WARNING: This will drop all existing tables and data!');
    console.log('🔄 Creating fresh database schema...');
    
    await sequelize.sync({ force: true });
    console.log('✅ Database schema created successfully');
    
    // Add unique constraints
    try {
      await sequelize.query(`
        ALTER TABLE job_assignments 
        ADD CONSTRAINT unique_job_user 
        UNIQUE (jobId, userId)
      `);
      console.log('✅ Unique constraints added successfully');
    } catch (constraintError) {
      console.log('ℹ️  Unique constraint already exists or could not be added');
    }
    
    console.log('🎉 Database setup completed successfully!');
    console.log('💡 Now run "npm run seed" to populate with sample data');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Database setup interrupted by user');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Database setup terminated');
  await sequelize.close();
  process.exit(0);
});

// Run the setup
setupDatabase();
