#!/usr/bin/env node
require('dotenv').config();

const { syncDatabase, sequelize } = require('../models');
const { addThemeColumnsNoDefault } = require('./add-theme-columns-no-default');
const { alignThemeColumnNames } = require('./align-theme-column-names');
const { fixThemesAndSetDefaults } = require('./fix-themes-and-set-defaults');
const { addHospitalAdminRole } = require('./add-hospital-admin-role');

async function main() {
  try {
    console.log('🔧 Starting database sync...');
    await syncDatabase();
    console.log('✅ Database sync completed successfully.');

    // Idempotent post-sync setup steps
    process.env.NO_CLOSE_SEQUELIZE = '1';
    console.log('🔧 Ensuring users.role enum includes HOSPITAL_ADMIN...');
    await addHospitalAdminRole();
    console.log('🔧 Ensuring theme columns exist (no defaults)...');
    await addThemeColumnsNoDefault();
    console.log('🔧 Aligning theme column names...');
    await alignThemeColumnNames();
    console.log('🔧 Populating themes and default theme for hospitals...');
    await fixThemesAndSetDefaults();
    console.log('✅ Theme setup ensured.');
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch (_) {}
  }
}

main();


