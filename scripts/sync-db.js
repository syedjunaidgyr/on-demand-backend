#!/usr/bin/env node
require('dotenv').config();

const { syncDatabase, sequelize } = require('../models');

async function main() {
  try {
    console.log('🔧 Starting database sync...');
    await syncDatabase();
    console.log('✅ Database sync completed successfully.');
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


