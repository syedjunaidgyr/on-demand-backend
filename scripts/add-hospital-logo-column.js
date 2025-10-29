#!/usr/bin/env node
require('dotenv').config();

const { sequelize } = require('../models');

async function ensureColumn(table, column, ddl) {
  const [rows] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}';`);
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`➕ Adding column ${table}.${column} ...`);
    await sequelize.query(ddl);
    console.log(`✅ Added ${table}.${column}`);
  } else {
    console.log(`ℹ️  Column ${table}.${column} already exists`);
  }
}

async function main() {
  try {
    console.log('🔧 Adding hospital logo column...');

    await ensureColumn(
      'hospitals',
      'logo',
      "ALTER TABLE `hospitals` ADD COLUMN `logo` VARCHAR(500) NULL AFTER `email`;"
    );

    console.log('✅ Schema updates completed');
  } catch (error) {
    console.error('❌ Failed to apply schema updates:', error);
    process.exitCode = 1;
  } finally {
    try { await sequelize.close(); } catch (_) {}
  }
}

main();

