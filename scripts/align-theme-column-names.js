require('dotenv').config();
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

async function alignThemeColumnNames() {
  try {
    console.log('🔄 Aligning theme-related column names (snake_case)...');

    // hospitals.default_theme_id
    const [hasDefaultThemeSnake] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'hospitals' 
      AND COLUMN_NAME = 'default_theme_id'
    `, { type: QueryTypes.SELECT });

    if (!hasDefaultThemeSnake) {
      console.log('📝 Adding hospitals.default_theme_id...');
      await sequelize.query(`
        ALTER TABLE hospitals 
        ADD COLUMN default_theme_id VARCHAR(50) NULL 
        COMMENT 'ID of the default theme (snake_case for ORM)'
        AFTER themes
      `);
      console.log('✅ Added hospitals.default_theme_id');
    } else {
      console.log('⏭️  hospitals.default_theme_id already exists');
    }

    // Backfill hospitals.default_theme_id from hospitals.defaultThemeId if present
    console.log('📝 Backfilling hospitals.default_theme_id from defaultThemeId if available...');
    await sequelize.query(`
      UPDATE hospitals 
      SET default_theme_id = COALESCE(default_theme_id, defaultThemeId, 'default')
    `);
    console.log('✅ Backfilled hospitals.default_theme_id');

    // users.selected_theme_id
    const [hasSelectedThemeSnake] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'selected_theme_id'
    `, { type: QueryTypes.SELECT });

    if (!hasSelectedThemeSnake) {
      console.log('📝 Adding users.selected_theme_id...');
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN selected_theme_id VARCHAR(50) NULL 
        COMMENT 'User selected theme ID (snake_case for ORM)'
        AFTER address
      `);
      console.log('✅ Added users.selected_theme_id');
    } else {
      console.log('⏭️  users.selected_theme_id already exists');
    }

    // Backfill users.selected_theme_id from users.selectedThemeId if present
    console.log('📝 Backfilling users.selected_theme_id from selectedThemeId if available...');
    await sequelize.query(`
      UPDATE users 
      SET selected_theme_id = COALESCE(selected_theme_id, selectedThemeId)
    `);
    console.log('✅ Backfilled users.selected_theme_id');

    console.log('🎉 Alignment complete');
  } catch (error) {
    console.error('❌ Alignment failed:', error);
    throw error;
  } finally {
    if (!process.env.NO_CLOSE_SEQUELIZE) {
      await sequelize.close();
    }
  }
}

if (require.main === module) {
  alignThemeColumnNames()
    .then(() => { console.log('Done'); process.exit(0); })
    .catch((e) => { console.error('Failed', e); process.exit(1); });
}

module.exports = { alignThemeColumnNames };
