#!/usr/bin/env node

const { sequelize, syncDatabase } = require('../models');

const syncDatabaseOnly = async () => {
  try {
    console.log('🔄 Syncing database models...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sync database models
    await syncDatabase();
    
    console.log('✅ Database models synced successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Database sync interrupted by user');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Database sync terminated');
  await sequelize.close();
  process.exit(0);
});

// Run the sync
syncDatabaseOnly();