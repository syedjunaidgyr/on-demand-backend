require('dotenv').config();
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

async function addThemeColumns() {
  try {
    console.log('🔄 Starting theme columns migration...');
    
    // Add themes column to hospitals table
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
        ADD COLUMN themes JSON NOT NULL DEFAULT '[
          {
            "id": "default",
            "name": "Professional Blue",
            "primaryColor": "#2563eb",
            "secondaryColor": "#3b82f6",
            "backgroundColor": "#f8fafc",
            "textColor": "#1e293b",
            "accentTextColor": "#ffffff"
          }
        ]'
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
    
    // Set default theme for existing hospitals
    console.log('📝 Setting default theme for existing hospitals...');
    await sequelize.query(`
      UPDATE hospitals 
      SET defaultThemeId = 'default' 
      WHERE defaultThemeId IS NULL
    `);
    console.log('✅ Set default theme for existing hospitals');
    
    console.log('🎉 Theme columns migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during theme columns migration:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if executed directly
if (require.main === module) {
  addThemeColumns()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addThemeColumns };

