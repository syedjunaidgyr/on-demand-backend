#!/usr/bin/env node

const { User, Job, JobAssignment, CheckIn, Report, Hospital, Permission, HospitalPermission, UnitPermission, StaffPermission, PermissionMaster } = require('../models');
const { sequelize } = require('../models');

const forceSeedDatabase = async () => {
  try {
    console.log('🌱 Starting force database seeding...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Clear all existing data (with error handling for non-existent tables)
    console.log('🧹 Clearing all existing data...');
    
    const clearTable = async (model, name) => {
      try {
        await model.destroy({ where: {}, force: true });
        console.log(`✅ Cleared ${name}`);
      } catch (error) {
        if (error.message.includes("doesn't exist")) {
          console.log(`ℹ️  Table ${name} doesn't exist, skipping`);
        } else {
          throw error;
        }
      }
    };

    await clearTable(CheckIn, 'check_ins');
    await clearTable(JobAssignment, 'job_assignments');
    await clearTable(Job, 'jobs');
    await clearTable(Report, 'reports');
    await clearTable(StaffPermission, 'staff_permissions');
    await clearTable(UnitPermission, 'unit_permissions');
    await clearTable(HospitalPermission, 'hospital_permissions');
    await clearTable(PermissionMaster, 'permission_masters');
    await clearTable(Permission, 'permissions');
    await clearTable(User, 'users');
    await clearTable(Hospital, 'hospitals');
    
    console.log('✅ All existing data cleared');
    
    // Import and run the seeder
    const { seedDatabase } = require('../seeders/seed');
    await seedDatabase();
    
    console.log('🎉 Force seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Force seeding failed:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Force seeding interrupted by user');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Force seeding terminated');
  await sequelize.close();
  process.exit(0);
});

// Run the force seeder
forceSeedDatabase();
