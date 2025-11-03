const { sequelize } = require('../models');

async function columnExists(tableName, columnName) {
  const [results] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE :column`, { replacements: { column: columnName } });
  return Array.isArray(results) && results.length > 0;
}

async function enumHasValue(tableName, columnName, value) {
  const [rows] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE :column`, { replacements: { column: columnName } });
  if (!Array.isArray(rows) || rows.length === 0) return false;
  const type = rows[0].Type || '';
  // Type format: enum('A','B','C')
  return type.includes(`'${value}'`);
}

async function addCheckInApprovalColumns() {
  const table = 'check_ins';

  // approval_status ENUM
  const hasApprovalStatus = await columnExists(table, 'approval_status');
  if (!hasApprovalStatus) {
    await sequelize.query(
      "ALTER TABLE `check_ins` ADD COLUMN `approval_status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' AFTER `status`"
    );
    console.log('✅ Added check_ins.approval_status');
  } else {
    // Ensure enum contains all three values (best-effort; MySQL requires full MODIFY)
    const needsPending = !(await enumHasValue(table, 'approval_status', 'PENDING'));
    const needsApproved = !(await enumHasValue(table, 'approval_status', 'APPROVED'));
    const needsRejected = !(await enumHasValue(table, 'approval_status', 'REJECTED'));
    if (needsPending || needsApproved || needsRejected) {
      await sequelize.query(
        "ALTER TABLE `check_ins` MODIFY COLUMN `approval_status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING'"
      );
      console.log('✅ Ensured enum values for check_ins.approval_status');
    }
  }

  // approved_by INT
  if (!(await columnExists(table, 'approved_by'))) {
    await sequelize.query(
      "ALTER TABLE `check_ins` ADD COLUMN `approved_by` INT NULL AFTER `approval_status`"
    );
    console.log('✅ Added check_ins.approved_by');
  }

  // approved_at DATETIME
  if (!(await columnExists(table, 'approved_at'))) {
    await sequelize.query(
      "ALTER TABLE `check_ins` ADD COLUMN `approved_at` DATETIME NULL AFTER `approved_by`"
    );
    console.log('✅ Added check_ins.approved_at');
  }

  // rejection_reason TEXT
  if (!(await columnExists(table, 'rejection_reason'))) {
    await sequelize.query(
      "ALTER TABLE `check_ins` ADD COLUMN `rejection_reason` TEXT NULL AFTER `approved_at`"
    );
    console.log('✅ Added check_ins.rejection_reason');
  }
}

module.exports = { addCheckInApprovalColumns };


