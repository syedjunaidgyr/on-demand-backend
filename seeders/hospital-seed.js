const { User, Job, JobAssignment, CheckIn, Hospital } = require('../models');
const bcrypt = require('bcryptjs');

const seedHospitals = async () => {
  try {
    console.log('🏥 Starting hospital seeding process...');
    
    // Check if hospitals already exist
    const existingHospitals = await Hospital.count();
    if (existingHospitals > 0) {
      console.log('⚠️  Hospitals already exist in database. Use "npm run reset-db" to clear existing data first.');
      console.log('ℹ️  Skipping hospital seeding to avoid duplicates.');
      return;
    }

    // Create hospitals
    const hospitals = await Hospital.bulkCreate([
      {
        name: 'New York General Hospital',
        code: 'NYGH',
        address: {
          street: '123 Medical Center Dr',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        contactInfo: {
          phone: '+1-555-0101',
          email: 'info@nygh.com',
          website: 'https://www.nygh.com'
        },
        units: [
          { name: 'Emergency Department', code: 'ER' },
          { name: 'Intensive Care Unit', code: 'ICU' },
          { name: 'Surgery', code: 'SURGERY' },
          { name: 'Cardiology', code: 'CARDIO' },
          { name: 'Pediatrics', code: 'PEDS' }
        ],
        description: 'Leading medical center in New York',
        isActive: true
      },
      {
        name: 'Los Angeles Medical Center',
        code: 'LAMC',
        address: {
          street: '456 Health Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA'
        },
        contactInfo: {
          phone: '+1-555-0202',
          email: 'contact@lamc.com',
          website: 'https://www.lamc.com'
        },
        units: [
          { name: 'Emergency Department', code: 'ER' },
          { name: 'Intensive Care Unit', code: 'ICU' },
          { name: 'Surgery', code: 'SURGERY' },
          { name: 'Oncology', code: 'ONCO' },
          { name: 'Neurology', code: 'NEURO' }
        ],
        description: 'Premier healthcare facility in Los Angeles',
        isActive: true
      },
      {
        name: 'Chicago Regional Hospital',
        code: 'CRH',
        address: {
          street: '789 Hospital Blvd',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA'
        },
        contactInfo: {
          phone: '+1-555-0303',
          email: 'admin@crh.com',
          website: 'https://www.crh.com'
        },
        units: [
          { name: 'Emergency Department', code: 'ER' },
          { name: 'Intensive Care Unit', code: 'ICU' },
          { name: 'Surgery', code: 'SURGERY' },
          { name: 'Orthopedics', code: 'ORTHO' },
          { name: 'Maternity', code: 'MAT' }
        ],
        description: 'Comprehensive medical services in Chicago',
        isActive: true
      }
    ]);

    console.log(`✅ Created ${hospitals.length} hospitals`);

    // Create users with hospital assignments (hash passwords manually for bulkCreate)
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const hashedHrPassword = await bcrypt.hash('hr123456', 12);
    const hashedDoctorPassword = await bcrypt.hash('doctor123456', 12);
    const hashedNursePassword = await bcrypt.hash('nurse123456', 12);

    const users = await User.bulkCreate([
      // Admin users
      {
        email: 'admin@locum.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567890',
        role: 'ADMIN',
        department: 'Administration',
        location: 'New York',
        hospitalId: hospitals[0].id,
        unitCode: 'ADMIN',
        isActive: true
      },
      
      // HR users
      {
        email: 'hr1@locum.com',
        password: hashedHrPassword,
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '+1234567891',
        role: 'HR',
        department: 'Human Resources',
        location: 'New York',
        hospitalId: hospitals[0].id,
        unitCode: 'HR',
        isActive: true
      },
      {
        email: 'hr2@locum.com',
        password: hashedHrPassword,
        firstName: 'Michael',
        lastName: 'Brown',
        phone: '+1234567892',
        role: 'HR',
        department: 'Human Resources',
        location: 'Los Angeles',
        hospitalId: hospitals[1].id,
        unitCode: 'HR',
        isActive: true
      },
      
      // Doctors
      {
        email: 'dr.smith@locum.com',
        password: hashedDoctorPassword,
        firstName: 'Dr. John',
        lastName: 'Smith',
        phone: '+1234567893',
        role: 'DOCTOR',
        department: 'Emergency Medicine',
        location: 'New York',
        specialization: 'Emergency Medicine',
        licenseNumber: 'MD123456',
        hospitalId: hospitals[0].id,
        unitCode: 'ER',
        preferredHospitals: [hospitals[0].id, hospitals[1].id], // Can work at multiple hospitals
        isActive: true
      },
      {
        email: 'dr.wilson@locum.com',
        password: hashedDoctorPassword,
        firstName: 'Dr. Emily',
        lastName: 'Wilson',
        phone: '+1234567894',
        role: 'DOCTOR',
        department: 'Surgery',
        location: 'Los Angeles',
        specialization: 'General Surgery',
        licenseNumber: 'MD123457',
        hospitalId: hospitals[1].id,
        unitCode: 'SURGERY',
        preferredHospitals: [hospitals[1].id, hospitals[2].id],
        isActive: true
      },
      {
        email: 'dr.davis@locum.com',
        password: hashedDoctorPassword,
        firstName: 'Dr. Robert',
        lastName: 'Davis',
        phone: '+1234567895',
        role: 'DOCTOR',
        department: 'Cardiology',
        location: 'Chicago',
        specialization: 'Cardiology',
        licenseNumber: 'MD123458',
        hospitalId: hospitals[2].id,
        unitCode: 'CARDIO',
        preferredHospitals: [hospitals[2].id],
        isActive: true
      },
      
      // Nurses
      {
        email: 'nurse.taylor@locum.com',
        password: hashedNursePassword,
        firstName: 'Jennifer',
        lastName: 'Taylor',
        phone: '+1234567896',
        role: 'NURSE',
        department: 'ICU',
        location: 'New York',
        specialization: 'Critical Care',
        licenseNumber: 'RN123456',
        hospitalId: hospitals[0].id,
        unitCode: 'ICU',
        preferredHospitals: [hospitals[0].id, hospitals[1].id],
        isActive: true
      },
      {
        email: 'nurse.martinez@locum.com',
        password: hashedNursePassword,
        firstName: 'Maria',
        lastName: 'Martinez',
        phone: '+1234567897',
        role: 'NURSE',
        department: 'Surgery',
        location: 'Los Angeles',
        specialization: 'Surgical Nursing',
        licenseNumber: 'RN123457',
        hospitalId: hospitals[1].id,
        unitCode: 'SURGERY',
        preferredHospitals: [hospitals[1].id, hospitals[2].id],
        isActive: true
      },
      {
        email: 'nurse.anderson@locum.com',
        password: hashedNursePassword,
        firstName: 'Lisa',
        lastName: 'Anderson',
        phone: '+1234567898',
        role: 'NURSE',
        department: 'Pediatrics',
        location: 'Chicago',
        specialization: 'Pediatric Nursing',
        licenseNumber: 'RN123458',
        hospitalId: hospitals[2].id,
        unitCode: 'PEDS',
        preferredHospitals: [hospitals[2].id],
        isActive: true
      }
    ]);

    console.log(`👥 Created ${users.length} users`);

    // Create jobs with hospital assignments
    const jobs = await Job.bulkCreate([
      {
        title: 'Emergency Medicine Physician - Night Shift',
        description: 'Provide emergency medical care during night shifts. Handle trauma cases, medical emergencies, and urgent care situations.',
        department: 'Emergency Medicine',
        location: 'New York',
        requiredRole: 'DOCTOR',
        specialization: 'Emergency Medicine',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        startTime: '22:00',
        endTime: '06:00',
        hourlyRate: 150.00,
        priority: 'URGENT',
        maxAssignments: 2,
        requirements: {
          experience: '3+ years',
          certifications: ['ACLS', 'PALS', 'ATLS'],
          skills: ['Trauma care', 'Emergency procedures']
        },
        benefits: {
          mealAllowance: 25,
          parking: true,
          uniform: true
        },
        createdBy: users[1].id, // HR user
        hospitalId: hospitals[0].id,
        unitCode: 'ER',
        facilityName: 'New York General Hospital',
        facilityAddress: {
          street: '123 Medical Center Dr',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        contactPerson: {
          name: 'Dr. Sarah Johnson',
          phone: '+1234567891',
          email: 'hr1@locum.com'
        },
        notes: 'Night shift position with high patient volume'
      },
      {
        title: 'ICU Nurse - Day Shift',
        description: 'Provide critical care nursing services in the intensive care unit. Monitor patients, administer medications, and assist with procedures.',
        department: 'Intensive Care',
        location: 'Los Angeles',
        requiredRole: 'NURSE',
        specialization: 'Critical Care',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Same day
        startTime: '07:00',
        endTime: '19:00',
        hourlyRate: 75.00,
        priority: 'HIGH',
        maxAssignments: 3,
        requirements: {
          experience: '2+ years ICU',
          certifications: ['BLS', 'ACLS', 'CCRN'],
          skills: ['Ventilator management', 'Hemodynamic monitoring']
        },
        benefits: {
          mealAllowance: 20,
          parking: true,
          uniform: true
        },
        createdBy: users[2].id, // HR user
        hospitalId: hospitals[1].id,
        unitCode: 'ICU',
        facilityName: 'Los Angeles Medical Center',
        facilityAddress: {
          street: '456 Health Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA'
        },
        contactPerson: {
          name: 'Michael Brown',
          phone: '+1234567892',
          email: 'hr2@locum.com'
        },
        notes: 'Day shift ICU position'
      },
      {
        title: 'General Surgery Assistant',
        description: 'Assist surgeons during procedures, prepare operating rooms, and provide post-operative care.',
        department: 'Surgery',
        location: 'Chicago',
        requiredRole: 'NURSE',
        specialization: 'Surgical Nursing',
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Same day
        startTime: '08:00',
        endTime: '16:00',
        hourlyRate: 80.00,
        priority: 'MEDIUM',
        maxAssignments: 2,
        requirements: {
          experience: '1+ years surgery',
          certifications: ['BLS', 'CNOR'],
          skills: ['Sterile technique', 'Surgical instruments']
        },
        benefits: {
          mealAllowance: 15,
          parking: true,
          uniform: true
        },
        createdBy: users[1].id, // HR user
        hospitalId: hospitals[2].id,
        unitCode: 'SURGERY',
        facilityName: 'Chicago Regional Hospital',
        facilityAddress: {
          street: '789 Hospital Blvd',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA'
        },
        contactPerson: {
          name: 'Sarah Johnson',
          phone: '+1234567891',
          email: 'hr1@locum.com'
        },
        notes: 'Surgical assistant position'
      },
      {
        title: 'Pediatric Nurse - Weekend Coverage',
        description: 'Provide nursing care for pediatric patients during weekend shifts.',
        department: 'Pediatrics',
        location: 'New York',
        requiredRole: 'NURSE',
        specialization: 'Pediatric Nursing',
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        startTime: '12:00',
        endTime: '00:00',
        hourlyRate: 85.00,
        priority: 'MEDIUM',
        maxAssignments: 2,
        requirements: {
          experience: '2+ years pediatrics',
          certifications: ['BLS', 'PALS'],
          skills: ['Pediatric assessment', 'Family communication']
        },
        benefits: {
          mealAllowance: 20,
          parking: true,
          uniform: true
        },
        createdBy: users[2].id, // HR user
        hospitalId: hospitals[0].id,
        unitCode: 'PEDS',
        facilityName: 'New York General Hospital',
        facilityAddress: {
          street: '123 Medical Center Dr',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        contactPerson: {
          name: 'Michael Brown',
          phone: '+1234567892',
          email: 'hr2@locum.com'
        },
        notes: 'Weekend pediatric coverage'
      }
    ]);

    console.log(`💼 Created ${jobs.length} jobs`);

    // Create some job assignments
    const assignments = await JobAssignment.bulkCreate([
      {
        jobId: jobs[0].id,
        userId: users[3].id, // Dr. Smith
        status: 'ACCEPTED',
        assignedBy: users[1].id, // HR
        assignedAt: new Date(),
        acceptedAt: new Date(),
        hourlyRate: 150.00,
        totalHours: 8,
        totalPayment: 1200.00,
        isDirectAssignment: true
      },
      {
        jobId: jobs[1].id,
        userId: users[6].id, // Nurse Taylor
        status: 'PENDING',
        assignedBy: users[2].id, // HR
        assignedAt: new Date(),
        hourlyRate: 75.00,
        totalHours: 12,
        totalPayment: 900.00,
        isDirectAssignment: true
      }
    ]);

    console.log(`📋 Created ${assignments.length} assignments`);

    // Create a check-in record
    const checkIns = await CheckIn.bulkCreate([
      {
        jobAssignmentId: assignments[0].id,
        userId: users[3].id, // Dr. Smith
        checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        checkOutTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        status: 'CHECKED_OUT',
        totalWorkTime: 90, // 1.5 hours in minutes
        isLate: false,
        isEarlyCheckout: false,
        supervisorApproval: true
      }
    ]);

    console.log(`⏰ Created ${checkIns.length} check-ins`);

    console.log('\n🔐 Login Credentials:');
    console.log('Admin: admin@locum.com / admin123');
    console.log('HR: hr1@locum.com / hr123456');
    console.log('Doctor: dr.smith@locum.com / doctor123456');
    console.log('Nurse: nurse.taylor@locum.com / nurse123456');
    
    console.log('\n🏥 Hospital Information:');
    hospitals.forEach((hospital, index) => {
      console.log(`${index + 1}. ${hospital.name} (${hospital.code})`);
      console.log(`   Units: ${hospital.units.map(u => u.name).join(', ')}`);
    });

    console.log('\n🎉 Hospital seeding completed successfully!');
  } catch (error) {
    console.error('❌ Hospital seeding failed:', error);
    throw error;
  }
};

module.exports = seedHospitals;
