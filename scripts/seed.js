#!/usr/bin/env node

const { seedDatabase } = require('../seeders/seed');
const { sequelize } = require('../models');

const runSeeder = async () => {
  try {
    console.log('🌱 Starting database seeding process...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Run the seeder
    await seedDatabase();
    
    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Seeding interrupted by user');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Seeding terminated');
  await sequelize.close();
  process.exit(0);
});

// Run the seeder
runSeeder();
