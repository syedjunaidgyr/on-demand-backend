#!/usr/bin/env node

const { sequelize } = require('../models');

const resetDatabase = async () => {
  try {
    console.log('🔄 Resetting database...');
    
    // Drop all tables
    await sequelize.drop();
    console.log('✅ All tables dropped successfully');
    
    // Recreate all tables
    await sequelize.sync({ force: true });
    console.log('✅ All tables recreated successfully');
    
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
    
    console.log('🎉 Database reset completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Database reset interrupted by user');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Database reset terminated');
  await sequelize.close();
  process.exit(0);
});

// Run the reset
resetDatabase();
