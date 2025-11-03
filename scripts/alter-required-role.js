require('dotenv').config();
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

async function alterRequiredRole() {
  try {
    console.log('🔄 Adding AGENCY role to jobs.required_role enum...');
    
    // Check current enum values
    const [currentEnums] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'jobs' 
      AND COLUMN_NAME = 'required_role'
    `, { type: QueryTypes.SELECT });
    
    console.log('Current required_role enum:', currentEnums?.COLUMN_TYPE);
    
    // Alter enum to add AGENCY
    await sequelize.query(`
      ALTER TABLE jobs 
      MODIFY COLUMN required_role ENUM('DOCTOR','NURSE','AGENCY') NOT NULL
    `);
    
    console.log('✅ AGENCY role added to jobs.required_role successfully!');
    
    // Verify the change
    const [updatedEnums] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'jobs' 
      AND COLUMN_NAME = 'required_role'
    `, { type: QueryTypes.SELECT });
    
    console.log('Updated required_role enum:', updatedEnums?.COLUMN_TYPE);
    
  } catch (error) {
    console.error('❌ Error adding AGENCY role:', error);
    throw error;
  } finally {
    if (!process.env.NO_CLOSE_SEQUELIZE) {
      await sequelize.close();
    }
  }
}

// Run migration if executed directly
if (require.main === module) {
  alterRequiredRole()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { alterRequiredRole };


