#!/usr/bin/env node
require('dotenv').config();

const { sequelize, Hospital, Unit, User, Job, JobAssignment, HospitalPermission, UnitPermission, AgencyHospital } = require('../models');
const { Op } = require('sequelize');

async function deleteNonBangaloreHospitals() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🗑️  Deleting all non-Bangalore hospitals...\n');

    // Step 1: Find all non-Bangalore hospitals
    console.log('📋 Step 1: Finding non-Bangalore hospitals...');
    const allHospitals = await Hospital.findAll({
      transaction
    });

    const nonBangaloreHospitalIds = [];
    const bangaloreHospitalIds = [];

    for (const hospital of allHospitals) {
      const address = hospital.address || {};
      const city = (address.city || '').toLowerCase();
      const state = (address.state || '').toLowerCase();
      
      if (city === 'bangalore' || city === 'bengaluru' || state === 'karnataka') {
        bangaloreHospitalIds.push(hospital.id);
      } else {
        nonBangaloreHospitalIds.push(hospital.id);
      }
    }

    if (nonBangaloreHospitalIds.length === 0) {
      console.log('✅ No non-Bangalore hospitals found. Nothing to delete.\n');
      await transaction.commit();
      return;
    }

    console.log(`   Found ${nonBangaloreHospitalIds.length} non-Bangalore hospitals to delete`);
    console.log(`   Keeping ${bangaloreHospitalIds.length} Bangalore hospitals\n`);

    // Step 2: Delete related records from dependent tables
    console.log('📋 Step 2: Deleting related records...');

    // Delete units
    const deletedUnits = await Unit.destroy({
      where: { hospitalId: { [Op.in]: nonBangaloreHospitalIds } },
      transaction
    });
    console.log(`   ✅ Deleted ${deletedUnits} units`);

    // Delete hospital permissions
    const deletedHospitalPermissions = await HospitalPermission.destroy({
      where: { hospitalId: { [Op.in]: nonBangaloreHospitalIds } },
      transaction
    });
    console.log(`   ✅ Deleted ${deletedHospitalPermissions} hospital permissions`);

    // Delete unit permissions (for these hospitals)
    const deletedUnitPermissions = await UnitPermission.destroy({
      where: { hospitalId: { [Op.in]: nonBangaloreHospitalIds } },
      transaction
    });
    console.log(`   ✅ Deleted ${deletedUnitPermissions} unit permissions`);

    // Delete agency hospital relationships
    const deletedAgencyHospitals = await AgencyHospital.destroy({
      where: { hospitalId: { [Op.in]: nonBangaloreHospitalIds } },
      transaction
    });
    console.log(`   ✅ Deleted ${deletedAgencyHospitals} agency-hospital relationships`);

    // Update users: Set hospitalId to NULL for users assigned to deleted hospitals
    // Use raw SQL to bypass Sequelize validations (since DOCTOR/NURSE/HR require hospitalId)
    const [updatedUsersResult] = await sequelize.query(
      `UPDATE users SET hospital_id = NULL, unit_code = NULL WHERE hospital_id IN (${nonBangaloreHospitalIds.join(',')})`,
      { transaction }
    );
    const updatedUsersCount = updatedUsersResult?.affectedRows || 0;
    console.log(`   ✅ Updated ${updatedUsersCount} users (set hospitalId to NULL)`);

    // Delete jobs and their assignments
    const jobsToDelete = await Job.findAll({
      where: { hospitalId: { [Op.in]: nonBangaloreHospitalIds } },
      attributes: ['id'],
      transaction
    });
    const jobIds = jobsToDelete.map(j => j.id);

    if (jobIds.length > 0) {
      // Delete job assignments
      const deletedAssignments = await JobAssignment.destroy({
        where: { jobId: { [Op.in]: jobIds } },
        transaction
      });
      console.log(`   ✅ Deleted ${deletedAssignments} job assignments`);

      // Delete jobs
      const deletedJobs = await Job.destroy({
        where: { hospitalId: { [Op.in]: nonBangaloreHospitalIds } },
        transaction
      });
      console.log(`   ✅ Deleted ${deletedJobs} jobs`);
    }

    console.log('');

    // Step 3: Delete the hospitals themselves
    console.log('📋 Step 3: Deleting non-Bangalore hospitals...');
    const deletedHospitals = await Hospital.destroy({
      where: { id: { [Op.in]: nonBangaloreHospitalIds } },
      transaction
    });
    console.log(`   ✅ Deleted ${deletedHospitals} hospitals\n`);

    // Commit transaction
    await transaction.commit();

    console.log('🎉 Successfully deleted all non-Bangalore hospitals!');
    console.log('\n📊 Summary:');
    console.log(`   - Hospitals deleted: ${deletedHospitals}`);
    console.log(`   - Units deleted: ${deletedUnits}`);
    console.log(`   - Hospital permissions deleted: ${deletedHospitalPermissions}`);
    console.log(`   - Unit permissions deleted: ${deletedUnitPermissions}`);
    console.log(`   - Agency-hospital relationships deleted: ${deletedAgencyHospitals}`);
    console.log(`   - Users updated: ${updatedUsersCount}`);
    if (jobIds.length > 0) {
      console.log(`   - Jobs deleted: ${jobIds.length}`);
      console.log(`   - Job assignments deleted: ${jobIds.length > 0 ? 'see above' : 0}`);
    }
    console.log(`   - Bangalore hospitals remaining: ${bangaloreHospitalIds.length}`);

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error deleting non-Bangalore hospitals:', error);
    throw error;
  }
}

async function main() {
  try {
    await deleteNonBangaloreHospitals();
  } catch (error) {
    console.error('❌ Deletion failed:', error);
    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch (_) {}
  }
}

if (require.main === module) {
  main();
}

module.exports = { deleteNonBangaloreHospitals };

