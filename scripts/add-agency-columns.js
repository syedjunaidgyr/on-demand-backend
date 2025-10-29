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
    console.log('🔧 Applying agency-related schema updates...');

    await ensureColumn(
      'job_assignments',
      'agency_id',
      "ALTER TABLE `job_assignments` ADD COLUMN `agency_id` INTEGER NULL AFTER `user_id`, ADD CONSTRAINT `fk_job_assignments_agency` FOREIGN KEY (`agency_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;"
    );

    await ensureColumn(
      'agency_hospitals',
      'blacklist_reason',
      "ALTER TABLE `agency_hospitals` ADD COLUMN `blacklist_reason` TEXT NULL AFTER `onboarded_at`;"
    );
    await ensureColumn(
      'agency_hospitals',
      'blacklisted_by',
      "ALTER TABLE `agency_hospitals` ADD COLUMN `blacklisted_by` INTEGER NULL AFTER `blacklist_reason`, ADD CONSTRAINT `fk_ah_blacklisted_by` FOREIGN KEY (`blacklisted_by`) REFERENCES `users` (`id`);"
    );
    await ensureColumn(
      'agency_hospitals',
      'blacklisted_at',
      "ALTER TABLE `agency_hospitals` ADD COLUMN `blacklisted_at` DATETIME NULL AFTER `blacklisted_by`;"
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


