#!/usr/bin/env node
require('dotenv').config();

const { sequelize } = require('../models');

async function main() {
  try {
    console.log('🔧 Applying enum fixes...');
    // Ensure users.role supports AGENCY
    await sequelize.query("ALTER TABLE `users` MODIFY `role` ENUM('HR','DOCTOR','NURSE','ADMIN','AGENCY') NOT NULL DEFAULT 'DOCTOR';");
    console.log('✅ users.role enum updated to include AGENCY');
  } catch (error) {
    console.error('❌ Failed to apply enum fixes:', error);
    process.exitCode = 1;
  } finally {
    try { await sequelize.close(); } catch (_) {}
  }
}

main();


