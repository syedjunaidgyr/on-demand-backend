const sequelize = require('../config/database');
const User = require('./User');
const Job = require('./Job');
const JobAssignment = require('./JobAssignment');
const CheckIn = require('./CheckIn');
const Report = require('./Report');
const Hospital = require('./Hospital');
const Unit = require('./Unit');
const Permission = require('./Permission');
const HospitalPermission = require('./HospitalPermission');
const UnitPermission = require('./UnitPermission');
const StaffPermission = require('./StaffPermission');
const PermissionMaster = require('./PermissionMaster');
const AgencyHospital = require('./AgencyHospital');
const AgencyNurse = require('./AgencyNurse');
const AssignmentSegment = require('./AssignmentSegment');
const AssignmentActivity = require('./AssignmentActivity');

// Define associations
// Hospital associations
Hospital.hasMany(User, { foreignKey: 'hospitalId', as: 'users' });
User.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Hospital.hasMany(Job, { foreignKey: 'hospitalId', as: 'jobs' });
Job.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

// Unit associations (alias avoids collision with Hospital JSON field `units`)
Hospital.hasMany(Unit, { foreignKey: 'hospitalId', as: 'unitMasters' });
Unit.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

// User and Job associations
User.hasMany(Job, { foreignKey: 'createdBy', as: 'createdJobs' });
Job.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(JobAssignment, { foreignKey: 'userId', as: 'jobAssignments' });
JobAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Job.hasMany(JobAssignment, { foreignKey: 'jobId', as: 'assignments' });
JobAssignment.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

User.hasMany(JobAssignment, { foreignKey: 'assignedBy', as: 'assignedJobs' });
JobAssignment.belongsTo(User, { foreignKey: 'assignedBy', as: 'assigner' });

// Agency relationships
User.hasMany(JobAssignment, { foreignKey: 'agencyId', as: 'agencyAssignments' });
JobAssignment.belongsTo(User, { foreignKey: 'agencyId', as: 'agency' });

User.hasMany(AgencyHospital, { foreignKey: 'agencyId', as: 'linkedHospitals' });
AgencyHospital.belongsTo(User, { foreignKey: 'agencyId', as: 'agency' });

Hospital.hasMany(AgencyHospital, { foreignKey: 'hospitalId', as: 'agencies' });
AgencyHospital.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

User.hasMany(AgencyNurse, { foreignKey: 'agencyId', as: 'agencyNurses' });
AgencyNurse.belongsTo(User, { foreignKey: 'agencyId', as: 'agency' });

User.hasMany(AgencyNurse, { foreignKey: 'nurseId', as: 'agencyMemberships' });
AgencyNurse.belongsTo(User, { foreignKey: 'nurseId', as: 'nurse' });

JobAssignment.hasMany(CheckIn, { foreignKey: 'jobAssignmentId', as: 'checkIns' });
CheckIn.belongsTo(JobAssignment, { foreignKey: 'jobAssignmentId', as: 'jobAssignment' });

// Assignment segments
JobAssignment.hasMany(AssignmentSegment, { foreignKey: 'jobAssignmentId', as: 'segments' });
AssignmentSegment.belongsTo(JobAssignment, { foreignKey: 'jobAssignmentId', as: 'jobAssignment' });

// Assignment activities
JobAssignment.hasMany(AssignmentActivity, { foreignKey: 'jobAssignmentId', as: 'activities' });
AssignmentActivity.belongsTo(JobAssignment, { foreignKey: 'jobAssignmentId', as: 'jobAssignment' });

User.hasMany(AssignmentActivity, { foreignKey: 'userId', as: 'activities' });
AssignmentActivity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(CheckIn, { foreignKey: 'userId', as: 'checkIns' });
CheckIn.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(CheckIn, { foreignKey: 'supervisorId', as: 'supervisedCheckIns' });
CheckIn.belongsTo(User, { foreignKey: 'supervisorId', as: 'supervisor' });

User.hasMany(Report, { foreignKey: 'generatedBy', as: 'generatedReports' });
Report.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });

// Permission associations
// Permission associations
User.hasMany(Permission, { foreignKey: 'createdBy', as: 'createdPermissions' });
Permission.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(PermissionMaster, { foreignKey: 'createdBy', as: 'createdPermissionMasters' });
PermissionMaster.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Hospital Permission associations
User.hasMany(HospitalPermission, { foreignKey: 'userId', as: 'hospitalPermissions' });
HospitalPermission.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Hospital.hasMany(HospitalPermission, { foreignKey: 'hospitalId', as: 'permissions' });
HospitalPermission.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Permission.hasMany(HospitalPermission, { foreignKey: 'permissionId', as: 'hospitalGrants' });
HospitalPermission.belongsTo(Permission, { foreignKey: 'permissionId', as: 'permission' });

User.hasMany(HospitalPermission, { foreignKey: 'grantedBy', as: 'grantedHospitalPermissions' });
HospitalPermission.belongsTo(User, { foreignKey: 'grantedBy', as: 'grantedByUser' });

// Unit Permission associations
User.hasMany(UnitPermission, { foreignKey: 'userId', as: 'unitPermissions' });
UnitPermission.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Hospital.hasMany(UnitPermission, { foreignKey: 'hospitalId', as: 'unitPermissions' });
UnitPermission.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Permission.hasMany(UnitPermission, { foreignKey: 'permissionId', as: 'unitGrants' });
UnitPermission.belongsTo(Permission, { foreignKey: 'permissionId', as: 'permission' });

User.hasMany(UnitPermission, { foreignKey: 'grantedBy', as: 'grantedUnitPermissions' });
UnitPermission.belongsTo(User, { foreignKey: 'grantedBy', as: 'grantedByUser' });

// Staff Permission associations
User.hasMany(StaffPermission, { foreignKey: 'userId', as: 'staffPermissions' });
StaffPermission.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Permission.hasMany(StaffPermission, { foreignKey: 'permissionId', as: 'staffGrants' });
StaffPermission.belongsTo(Permission, { foreignKey: 'permissionId', as: 'permission' });

User.hasMany(StaffPermission, { foreignKey: 'grantedBy', as: 'grantedStaffPermissions' });
StaffPermission.belongsTo(User, { foreignKey: 'grantedBy', as: 'grantedByUser' });

// Sync database
const syncDatabase = async () => {
  try {
    // Use alter: false to avoid key limit issues, force: true only for initial setup
    const syncOptions = { alter: false };
    await sequelize.sync(syncOptions);
    
    // Skip adding unique constraints to avoid key limit issues
    console.log('ℹ️  Skipping unique constraint addition to avoid key limit issues.');
    
    console.log('✅ Database models synchronized successfully.');

    // Bootstrap Unit master from Hospital.units JSON if Units are empty
    const [unitsCountResult] = await sequelize.query('SELECT COUNT(*) as count FROM units');
    const unitsCount = Array.isArray(unitsCountResult) ? unitsCountResult[0].count : unitsCountResult.count;
    if (Number(unitsCount) === 0) {
      const hospitals = await Hospital.findAll();
      const unitsToCreate = [];
      for (const hospital of hospitals) {
        const jsonUnits = hospital.units || [];
        for (const u of jsonUnits) {
          if (u && u.code && u.name) {
            unitsToCreate.push({ hospitalId: hospital.id, unitCode: u.code, unitName: u.name, isActive: true });
          }
        }
      }
      if (unitsToCreate.length > 0) {
        await Unit.bulkCreate(unitsToCreate, { ignoreDuplicates: true });
        console.log(`✅ Bootstrapped ${unitsToCreate.length} unit records from Hospital JSON.`);
      }
    }
  } catch (error) {
    console.error('❌ Error synchronizing database models:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Job,
  JobAssignment,
  CheckIn,
  Report,
  Hospital,
  Unit,
  Permission,
  HospitalPermission,
  UnitPermission,
  StaffPermission,
  PermissionMaster,
  AgencyHospital,
  AgencyNurse,
  AssignmentSegment,
  AssignmentActivity,
  syncDatabase
};
