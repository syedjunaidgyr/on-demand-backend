const { Permission, PermissionMaster, StaffPermission, HospitalPermission, UnitPermission, User, Hospital } = require('../models');

const seedPermissions = async () => {
  try {
    console.log('🔐 Starting permission seeding process...');

    // Check if permissions already exist
    const existingPermissions = await Permission.count();
    if (existingPermissions > 0) {
      console.log('⚠️  Permissions already exist in database. Skipping permission seeding.');
      return;
    }

    // Get admin user for createdBy field
    const adminUser = await User.findOne({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      throw new Error('Admin user not found. Please run hospital seeding first.');
    }

    // Create base permissions
    const permissions = await Permission.bulkCreate([
      // User Management Permissions
      {
        name: 'Create Users',
        code: 'USERS_CREATE',
        description: 'Create new users in the system',
        category: 'USER_MANAGEMENT',
        resource: 'users',
        action: 'CREATE',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },
      {
        name: 'Read Users',
        code: 'USERS_READ',
        description: 'View user information',
        category: 'USER_MANAGEMENT',
        resource: 'users',
        action: 'READ',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },
      {
        name: 'Update Users',
        code: 'USERS_UPDATE',
        description: 'Update user information',
        category: 'USER_MANAGEMENT',
        resource: 'users',
        action: 'UPDATE',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },
      {
        name: 'Delete Users',
        code: 'USERS_DELETE',
        description: 'Delete users from the system',
        category: 'USER_MANAGEMENT',
        resource: 'users',
        action: 'DELETE',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },

      // Job Management Permissions
      {
        name: 'Create Jobs',
        code: 'JOBS_CREATE',
        description: 'Create new job postings',
        category: 'JOB_MANAGEMENT',
        resource: 'jobs',
        action: 'CREATE',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },
      {
        name: 'Read Jobs',
        code: 'JOBS_READ',
        description: 'View job postings',
        category: 'JOB_MANAGEMENT',
        resource: 'jobs',
        action: 'READ',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },
      {
        name: 'Update Jobs',
        code: 'JOBS_UPDATE',
        description: 'Update job postings',
        category: 'JOB_MANAGEMENT',
        resource: 'jobs',
        action: 'UPDATE',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },
      {
        name: 'Delete Jobs',
        code: 'JOBS_DELETE',
        description: 'Delete job postings',
        category: 'JOB_MANAGEMENT',
        resource: 'jobs',
        action: 'DELETE',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },
      {
        name: 'Cancel Jobs',
        code: 'JOBS_CANCEL',
        description: 'Cancel job postings',
        category: 'JOB_MANAGEMENT',
        resource: 'jobs',
        action: 'UPDATE',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },

      // Assignment Management Permissions
      {
        name: 'Assign Jobs',
        code: 'ASSIGNMENTS_CREATE',
        description: 'Assign jobs to staff members',
        category: 'ASSIGNMENT_MANAGEMENT',
        resource: 'assignments',
        action: 'ASSIGN',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },
      {
        name: 'Read Assignments',
        code: 'ASSIGNMENTS_READ',
        description: 'View job assignments',
        category: 'ASSIGNMENT_MANAGEMENT',
        resource: 'assignments',
        action: 'READ',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },
      {
        name: 'Update Assignments',
        code: 'ASSIGNMENTS_UPDATE',
        description: 'Update job assignments',
        category: 'ASSIGNMENT_MANAGEMENT',
        resource: 'assignments',
        action: 'UPDATE',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },
      {
        name: 'Approve Assignments',
        code: 'ASSIGNMENTS_APPROVE',
        description: 'Approve job assignments',
        category: 'ASSIGNMENT_MANAGEMENT',
        resource: 'assignments',
        action: 'APPROVE',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },
      {
        name: 'Reject Assignments',
        code: 'ASSIGNMENTS_REJECT',
        description: 'Reject job assignments',
        category: 'ASSIGNMENT_MANAGEMENT',
        resource: 'assignments',
        action: 'REJECT',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },

      // Check-in/Check-out Permissions
      {
        name: 'Check In',
        code: 'CHECKIN_CREATE',
        description: 'Check in for assigned jobs',
        category: 'ASSIGNMENT_MANAGEMENT',
        resource: 'checkins',
        action: 'CREATE',
        scope: 'PERSONAL',
        createdBy: adminUser.id
      },
      {
        name: 'Check Out',
        code: 'CHECKOUT_UPDATE',
        description: 'Check out from assigned jobs',
        category: 'ASSIGNMENT_MANAGEMENT',
        resource: 'checkins',
        action: 'UPDATE',
        scope: 'PERSONAL',
        createdBy: adminUser.id
      },
      {
        name: 'Manage Breaks',
        code: 'BREAKS_MANAGE',
        description: 'Start and end breaks during work',
        category: 'ASSIGNMENT_MANAGEMENT',
        resource: 'checkins',
        action: 'UPDATE',
        scope: 'PERSONAL',
        createdBy: adminUser.id
      },

      // Report Management Permissions
      {
        name: 'Create Reports',
        code: 'REPORTS_CREATE',
        description: 'Generate reports',
        category: 'REPORT_MANAGEMENT',
        resource: 'reports',
        action: 'CREATE',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },
      {
        name: 'Read Reports',
        code: 'REPORTS_READ',
        description: 'View reports',
        category: 'REPORT_MANAGEMENT',
        resource: 'reports',
        action: 'READ',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },
      {
        name: 'Export Reports',
        code: 'REPORTS_EXPORT',
        description: 'Export reports to various formats',
        category: 'REPORT_MANAGEMENT',
        resource: 'reports',
        action: 'EXPORT',
        scope: 'HOSPITAL',
        createdBy: adminUser.id
      },

      // Hospital Management Permissions
      {
        name: 'Create Hospitals',
        code: 'HOSPITALS_CREATE',
        description: 'Create new hospitals',
        category: 'HOSPITAL_MANAGEMENT',
        resource: 'hospitals',
        action: 'CREATE',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },
      {
        name: 'Read Hospitals',
        code: 'HOSPITALS_READ',
        description: 'View hospital information',
        category: 'HOSPITAL_MANAGEMENT',
        resource: 'hospitals',
        action: 'READ',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },
      {
        name: 'Update Hospitals',
        code: 'HOSPITALS_UPDATE',
        description: 'Update hospital information',
        category: 'HOSPITAL_MANAGEMENT',
        resource: 'hospitals',
        action: 'UPDATE',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },
      {
        name: 'Delete Hospitals',
        code: 'HOSPITALS_DELETE',
        description: 'Delete hospitals',
        category: 'HOSPITAL_MANAGEMENT',
        resource: 'hospitals',
        action: 'DELETE',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },

      // Permission Management Permissions
      {
        name: 'Manage Permissions',
        code: 'PERMISSIONS_MANAGE',
        description: 'Manage user permissions',
        category: 'PERMISSION_MANAGEMENT',
        resource: 'permissions',
        action: 'UPDATE',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },
      {
        name: 'Grant Permissions',
        code: 'PERMISSIONS_GRANT',
        description: 'Grant permissions to users',
        category: 'PERMISSION_MANAGEMENT',
        resource: 'permissions',
        action: 'ASSIGN',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },
      {
        name: 'Revoke Permissions',
        code: 'PERMISSIONS_REVOKE',
        description: 'Revoke permissions from users',
        category: 'PERMISSION_MANAGEMENT',
        resource: 'permissions',
        action: 'DELETE',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },

      // System Management Permissions
      {
        name: 'System Administration',
        code: 'SYSTEM_ADMIN',
        description: 'Full system administration access',
        category: 'SYSTEM_MANAGEMENT',
        resource: 'system',
        action: 'UPDATE',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      },
      {
        name: 'View System Logs',
        code: 'SYSTEM_LOGS',
        description: 'View system logs and audit trails',
        category: 'SYSTEM_MANAGEMENT',
        resource: 'system',
        action: 'READ',
        scope: 'GLOBAL',
        createdBy: adminUser.id
      }
    ]);

    console.log(`✅ Created ${permissions.length} permissions`);

    // Create permission masters
    const permissionMasters = await PermissionMaster.bulkCreate([
      {
        name: 'Admin Full Access',
        code: 'ADMIN_FULL_ACCESS',
        description: 'Full system access for administrators',
        role: 'ADMIN',
        permissions: permissions.map(p => p.id), // All permissions
        isDefault: true,
        createdBy: adminUser.id
      },
      {
        name: 'HR Standard Access',
        code: 'HR_STANDARD_ACCESS',
        description: 'Standard HR access for job and user management',
        role: 'HR',
        permissions: permissions.filter(p => 
          ['USERS_CREATE', 'USERS_READ', 'USERS_UPDATE', 'JOBS_CREATE', 'JOBS_READ', 
           'JOBS_UPDATE', 'JOBS_CANCEL', 'ASSIGNMENTS_CREATE', 'ASSIGNMENTS_READ', 
           'ASSIGNMENTS_UPDATE', 'ASSIGNMENTS_APPROVE', 'ASSIGNMENTS_REJECT', 
           'REPORTS_CREATE', 'REPORTS_READ', 'REPORTS_EXPORT', 'HOSPITALS_READ'].includes(p.code)
        ).map(p => p.id),
        hospitalPermissions: permissions.filter(p => 
          ['JOBS_CREATE', 'JOBS_READ', 'JOBS_UPDATE', 'JOBS_CANCEL', 
           'ASSIGNMENTS_CREATE', 'ASSIGNMENTS_READ', 'ASSIGNMENTS_UPDATE', 
           'ASSIGNMENTS_APPROVE', 'ASSIGNMENTS_REJECT', 'REPORTS_CREATE', 
           'REPORTS_READ', 'REPORTS_EXPORT'].includes(p.code)
        ).map(p => p.id),
        isDefault: true,
        createdBy: adminUser.id
      },
      {
        name: 'Doctor Standard Access',
        code: 'DOCTOR_STANDARD_ACCESS',
        description: 'Standard access for doctors',
        role: 'DOCTOR',
        permissions: permissions.filter(p => 
          ['JOBS_READ', 'ASSIGNMENTS_READ', 'CHECKIN_CREATE', 'CHECKOUT_UPDATE', 
           'BREAKS_MANAGE'].includes(p.code)
        ).map(p => p.id),
        hospitalPermissions: permissions.filter(p => 
          ['JOBS_READ', 'ASSIGNMENTS_READ'].includes(p.code)
        ).map(p => p.id),
        isDefault: true,
        createdBy: adminUser.id
      },
      {
        name: 'Nurse Standard Access',
        code: 'NURSE_STANDARD_ACCESS',
        description: 'Standard access for nurses',
        role: 'NURSE',
        permissions: permissions.filter(p => 
          ['JOBS_READ', 'ASSIGNMENTS_READ', 'CHECKIN_CREATE', 'CHECKOUT_UPDATE', 
           'BREAKS_MANAGE'].includes(p.code)
        ).map(p => p.id),
        hospitalPermissions: permissions.filter(p => 
          ['JOBS_READ', 'ASSIGNMENTS_READ'].includes(p.code)
        ).map(p => p.id),
        isDefault: true,
        createdBy: adminUser.id
      }
    ]);

    console.log(`✅ Created ${permissionMasters.length} permission masters`);

    // Apply default permissions to existing users
    const users = await User.findAll();
    const hospitals = await Hospital.findAll();

    for (const user of users) {
      const roleMaster = permissionMasters.find(m => m.role === user.role && m.isDefault);
      if (roleMaster) {
        // Apply global permissions
        for (const permissionId of roleMaster.permissions) {
          try {
            await StaffPermission.create({
              userId: user.id,
              permissionId,
              grantedBy: adminUser.id,
              notes: `Default permission from master: ${roleMaster.name}`
            });
          } catch (error) {
            // Permission might already exist, skip
            console.warn(`Skipped duplicate permission for user ${user.id}`);
          }
        }

        // Apply hospital-specific permissions if user has a hospital
        if (user.hospitalId && roleMaster.hospitalPermissions) {
          for (const permissionId of roleMaster.hospitalPermissions) {
            try {
              await HospitalPermission.create({
                userId: user.id,
                hospitalId: user.hospitalId,
                permissionId,
                grantedBy: adminUser.id,
                notes: `Default hospital permission from master: ${roleMaster.name}`
              });
            } catch (error) {
              // Permission might already exist, skip
              console.warn(`Skipped duplicate hospital permission for user ${user.id}`);
            }
          }
        }

        // Apply unit-specific permissions if user has a unit
        if (user.hospitalId && user.unitCode && roleMaster.unitPermissions) {
          for (const permissionId of roleMaster.unitPermissions) {
            try {
              await UnitPermission.create({
                userId: user.id,
                hospitalId: user.hospitalId,
                unitCode: user.unitCode,
                permissionId,
                grantedBy: adminUser.id,
                notes: `Default unit permission from master: ${roleMaster.name}`
              });
            } catch (error) {
              // Permission might already exist, skip
              console.warn(`Skipped duplicate unit permission for user ${user.id}`);
            }
          }
        }
      }
    }

    console.log(`✅ Applied default permissions to ${users.length} users`);

    console.log('\n🔐 Permission System Summary:');
    console.log(`- ${permissions.length} base permissions created`);
    console.log(`- ${permissionMasters.length} permission masters created`);
    console.log(`- Default permissions applied to ${users.length} users`);
    console.log('\n📋 Permission Categories:');
    console.log('- USER_MANAGEMENT: User CRUD operations');
    console.log('- JOB_MANAGEMENT: Job posting and management');
    console.log('- ASSIGNMENT_MANAGEMENT: Job assignments and check-ins');
    console.log('- REPORT_MANAGEMENT: Report generation and viewing');
    console.log('- HOSPITAL_MANAGEMENT: Hospital CRUD operations');
    console.log('- PERMISSION_MANAGEMENT: Permission granting and revoking');
    console.log('- SYSTEM_MANAGEMENT: System administration');

    console.log('🎉 Permission seeding completed successfully!');
  } catch (error) {
    console.error('❌ Permission seeding failed:', error);
    throw error;
  }
};

module.exports = seedPermissions;
