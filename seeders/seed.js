const { User, Job, JobAssignment, CheckIn, Report, Hospital } = require('../models');
const seedHospitals = require('./hospital-seed');
const seedPermissions = require('./permission-seed');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Check if data already exists
    const existingUsers = await User.count();
    if (existingUsers > 0) {
      console.log('⚠️  Data already exists in database. Use "npm run reset-db" to clear existing data first.');
      console.log('ℹ️  Skipping seeding to avoid duplicates.');
      return;
    }

    // Use hospital seed for the new structure
    await seedHospitals();
    
    // Seed permissions after users and hospitals are created
    await seedPermissions();
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
};

module.exports = { seedDatabase };