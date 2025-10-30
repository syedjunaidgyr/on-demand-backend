require('dotenv').config();
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

async function addHospitalAdminRole() {
  try {
    console.log('🔄 Adding HOSPITAL_ADMIN role to User model...');
    
    // Check current enum values
    const [currentEnums] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `, { type: QueryTypes.SELECT });
    
    console.log('Current role enum:', currentEnums?.COLUMN_TYPE);
    
    // Alter enum to add HOSPITAL_ADMIN
    await sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('HR', 'DOCTOR', 'NURSE', 'ADMIN', 'AGENCY', 'HOSPITAL_ADMIN') NOT NULL DEFAULT 'DOCTOR'
    `);
    
    console.log('✅ Hospital Admin role added successfully!');
    
    // Verify the change
    const [updatedEnums] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `, { type: QueryTypes.SELECT });
    
    console.log('Updated role enum:', updatedEnums?.COLUMN_TYPE);
    
  } catch (error) {
    console.error('❌ Error adding hospital admin role:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if executed directly
if (require.main === module) {
  addHospitalAdminRole()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addHospitalAdminRole };

