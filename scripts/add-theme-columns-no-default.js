require('dotenv').config();
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

async function addThemeColumnsNoDefault() {
  try {
    console.log('🔄 Starting theme columns migration (no JSON defaults)...');

    // Add themes column to hospitals table (no default JSON)
    const [hospitalsColumnExists] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'hospitals' 
      AND COLUMN_NAME = 'themes'
    `, { type: QueryTypes.SELECT });

    if (!hospitalsColumnExists) {
      console.log('📝 Adding themes column to hospitals table...');
      await sequelize.query(`
        ALTER TABLE hospitals 
        ADD COLUMN themes JSON NULL 
        AFTER logo
      `);
      console.log('✅ Added themes column to hospitals');
    } else {
      console.log('⏭️  themes column already exists in hospitals table');
    }

    // Add defaultThemeId column to hospitals table
    const [defaultThemeColumnExists] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'hospitals' 
      AND COLUMN_NAME = 'defaultThemeId'
    `, { type: QueryTypes.SELECT });

    if (!defaultThemeColumnExists) {
      console.log('📝 Adding defaultThemeId column to hospitals table...');
      await sequelize.query(`
        ALTER TABLE hospitals 
        ADD COLUMN defaultThemeId VARCHAR(50) NULL
        COMMENT 'ID of the default theme. Users without personal theme selection will use this.'
        AFTER themes
      `);
      console.log('✅ Added defaultThemeId column to hospitals');
    } else {
      console.log('⏭️  defaultThemeId column already exists in hospitals table');
    }

    // Add selectedThemeId column to users table
    const [usersColumnExists] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'selectedThemeId'
    `, { type: QueryTypes.SELECT });

    if (!usersColumnExists) {
      console.log('📝 Adding selectedThemeId column to users table...');
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN selectedThemeId VARCHAR(50) NULL
        COMMENT 'User selected theme ID. If null, user will use hospital default theme.'
        AFTER address
      `);
      console.log('✅ Added selectedThemeId column to users');
    } else {
      console.log('⏭️  selectedThemeId column already exists in users table');
    }

    // Initialize defaultThemeId for existing hospitals to 'default' (will be created by fix script)
    console.log('📝 Setting default theme for existing hospitals (placeholder id)...');
    await sequelize.query(`
      UPDATE hospitals 
      SET defaultThemeId = COALESCE(defaultThemeId, 'default')
    `);
    console.log('✅ Set defaultThemeId placeholder for existing hospitals');

    console.log('🎉 Theme columns (no defaults) migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during theme columns migration (no defaults):', error);
    throw error;
  } finally {
    if (!process.env.NO_CLOSE_SEQUELIZE) {
      await sequelize.close();
    }
  }
}

if (require.main === module) {
  addThemeColumnsNoDefault()
    .then(() => {
      console.log('Migration (no defaults) completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration (no defaults) failed:', error);
      process.exit(1);
    });
}

module.exports = { addThemeColumnsNoDefault };
