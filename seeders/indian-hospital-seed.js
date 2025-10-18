const { User, Job, JobAssignment, CheckIn, Hospital, Unit } = require('../models');
const bcrypt = require('bcryptjs');

const seedIndianHospitals = async () => {
  try {
    console.log('🏥 Starting Indian hospital seeding process...');
    
    // Check if hospitals already exist
    const existingHospitals = await Hospital.count();
    if (existingHospitals > 0) {
      console.log('⚠️  Hospitals already exist in database. Use "npm run reset-db" to clear existing data first.');
      console.log('ℹ️  Skipping hospital seeding to avoid duplicates.');
      return;
    }

    // Create 10 Indian hospitals
    const hospitals = await Hospital.bulkCreate([
      {
        name: 'Apollo Hospital Mumbai',
        code: 'AHM',
        address: {
          street: 'Bandra Kurla Complex',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400051',
          country: 'India'
        },
        contactInfo: {
          phone: '+91-22-6660-6060',
          email: 'info@apollohospitals.com',
          website: 'https://www.apollohospitals.com'
        },
        units: [], // Empty since we'll create proper units table records
        description: 'Leading multi-specialty hospital in Mumbai',
        isActive: true
      },
      {
        name: 'Fortis Hospital Delhi',
        code: 'FHD',
        address: {
          street: 'Sector 62',
          city: 'Noida',
          state: 'Uttar Pradesh',
          zipCode: '201301',
          country: 'India'
        },
        contactInfo: {
          phone: '+91-120-240-9000',
          email: 'info@fortishealthcare.com',
          website: 'https://www.fortishealthcare.com'
        },
        units: [],
        description: 'Advanced healthcare facility in Delhi NCR',
        isActive: true
      },
      {
        name: 'Max Hospital Bangalore',
        code: 'MHB',
        address: {
          street: 'Bannerghatta Road',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560076',
          country: 'India'
        },
        contactInfo: {
          phone: '+91-80-2656-9999',
          email: 'info@maxhealthcare.com',
          website: 'https://www.maxhealthcare.com'
        },
        units: [],
        description: 'Comprehensive medical services in Bangalore',
        isActive: true
      },
      {
        name: 'Manipal Hospital Chennai',
        code: 'MHC',
        address: {
          street: 'Velachery Main Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          zipCode: '600032',
          country: 'India'
        },
        contactInfo: {
          phone: '+91-44-2500-7000',
          email: 'info@manipalhospitals.com',
          website: 'https://www.manipalhospitals.com'
        },
        units: [],
        description: 'Premier healthcare facility in Chennai',
        isActive: true
      },
      {
        name: 'Kokilaben Dhirubhai Ambani Hospital',
        code: 'KDAH',
        address: {
          street: 'Rao Saheb Achutrao Patwardhan Marg',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400053',
          country: 'India'
        },
        contactInfo: {
          phone: '+91-22-3099-9999',
          email: 'info@kokilabenhospital.com',
          website: 'https://www.kokilabenhospital.com'
        },
        units: [],
        description: 'State-of-the-art medical facility in Mumbai',
        isActive: true
      },
      {
        name: 'AIIMS Delhi',
        code: 'AIIMSD',
        address: {
          street: 'Ansari Nagar',
          city: 'New Delhi',
          state: 'Delhi',
          zipCode: '110029',
          country: 'India'
        },
        contactInfo: {
          phone: '+91-11-2658-8500',
          email: 'info@aiims.edu',
          website: 'https://www.aiims.edu'
        },
        units: [],
        description: 'All India Institute of Medical Sciences Delhi',
        isActive: true
      },
      {
        name: 'Narayana Health Bangalore',
        code: 'NHB',
        address: {
          street: 'Hosur Road',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560099',
          country: 'India'
        },
        contactInfo: {
          phone: '+91-80-6750-6900',
          email: 'info@narayanahealth.org',
          website: 'https://www.narayanahealth.org'
        },
        units: [],
        description: 'Affordable healthcare solutions in Bangalore',
        isActive: true
      },
      {
        name: 'Medanta Gurgaon',
        code: 'MG',
        address: {
          street: 'Sector 38',
          city: 'Gurgaon',
          state: 'Haryana',
          zipCode: '122001',
          country: 'India'
        },
        contactInfo: {
          phone: '+91-124-414-1414',
          email: 'info@medanta.org',
          website: 'https://www.medanta.org'
        },
        units: [],
        description: 'Multi-specialty hospital in Gurgaon',
        isActive: true
      },
      {
        name: 'Sir Ganga Ram Hospital Delhi',
        code: 'SGRH',
        address: {
          street: 'Rajinder Nagar',
          city: 'New Delhi',
          state: 'Delhi',
          zipCode: '110060',
          country: 'India'
        },
        contactInfo: {
          phone: '+91-11-2575-0000',
          email: 'info@sgrh.com',
          website: 'https://www.sgrh.com'
        },
        units: [],
        description: 'Leading private hospital in Delhi',
        isActive: true
      },
      {
        name: 'Columbia Asia Hospital Pune',
        code: 'CAHP',
        address: {
          street: 'Kharadi Bypass Road',
          city: 'Pune',
          state: 'Maharashtra',
          zipCode: '411014',
          country: 'India'
        },
        contactInfo: {
          phone: '+91-20-6704-4444',
          email: 'info@columbiaasia.com',
          website: 'https://www.columbiaasia.com'
        },
        units: [],
        description: 'International standard healthcare in Pune',
        isActive: true
      }
    ]);

    console.log(`✅ Created ${hospitals.length} Indian hospitals`);

    // Create units for each hospital
    const unitsData = [];
    const unitTypes = [
      { code: 'ER', name: 'Emergency Department' },
      { code: 'ICU', name: 'Intensive Care Unit' },
      { code: 'SURGERY', name: 'Surgery' },
      { code: 'CARDIO', name: 'Cardiology' },
      { code: 'NEURO', name: 'Neurology' },
      { code: 'ONCO', name: 'Oncology' },
      { code: 'PEDS', name: 'Pediatrics' },
      { code: 'ORTHO', name: 'Orthopedics' },
      { code: 'MAT', name: 'Maternity' },
      { code: 'DERMA', name: 'Dermatology' },
      { code: 'OPHTH', name: 'Ophthalmology' },
      { code: 'ENT', name: 'ENT' },
      { code: 'URO', name: 'Urology' },
      { code: 'GASTRO', name: 'Gastroenterology' },
      { code: 'PULMO', name: 'Pulmonology' }
    ];

    hospitals.forEach(hospital => {
      // Each hospital gets 5-7 random units
      const shuffledUnits = unitTypes.sort(() => 0.5 - Math.random());
      const selectedUnits = shuffledUnits.slice(0, Math.floor(Math.random() * 3) + 5); // 5-7 units
      
      selectedUnits.forEach(unit => {
        unitsData.push({
          hospitalId: hospital.id,
          unitCode: unit.code,
          unitName: unit.name,
          isActive: true
        });
      });
    });

    // Create units in the database
    const units = await Unit.bulkCreate(unitsData);
    console.log(`🏢 Created ${units.length} units across all hospitals`);

    // Create users with hospital assignments
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
        phone: '+919876543210',
        role: 'ADMIN',
        department: 'Administration',
        location: 'Mumbai',
        hospitalId: hospitals[0].id,
        unitCode: 'ADMIN',
        isActive: true
      },
      
      // HR users
      {
        email: 'hr1@locum.com',
        password: hashedHrPassword,
        firstName: 'Priya',
        lastName: 'Sharma',
        phone: '+919876543211',
        role: 'HR',
        department: 'Human Resources',
        location: 'Mumbai',
        hospitalId: hospitals[0].id,
        unitCode: 'HR',
        isActive: true
      },
      {
        email: 'hr2@locum.com',
        password: hashedHrPassword,
        firstName: 'Rajesh',
        lastName: 'Kumar',
        phone: '+919876543212',
        role: 'HR',
        department: 'Human Resources',
        location: 'Delhi',
        hospitalId: hospitals[1].id,
        unitCode: 'HR',
        isActive: true
      },
      
      // Doctors
      {
        email: 'dr.patel@locum.com',
        password: hashedDoctorPassword,
        firstName: 'Dr. Amit',
        lastName: 'Patel',
        phone: '+919876543213',
        role: 'DOCTOR',
        department: 'Emergency Medicine',
        location: 'Mumbai',
        specialization: 'Emergency Medicine',
        licenseNumber: 'MD123456',
        hospitalId: hospitals[0].id,
        unitCode: 'ER',
        preferredHospitals: [hospitals[0].id, hospitals[1].id],
        isActive: true
      },
      {
        email: 'dr.singh@locum.com',
        password: hashedDoctorPassword,
        firstName: 'Dr. Priya',
        lastName: 'Singh',
        phone: '+919876543214',
        role: 'DOCTOR',
        department: 'Surgery',
        location: 'Delhi',
        specialization: 'General Surgery',
        licenseNumber: 'MD123457',
        hospitalId: hospitals[1].id,
        unitCode: 'SURGERY',
        preferredHospitals: [hospitals[1].id, hospitals[2].id],
        isActive: true
      },
      
      // Nurses
      {
        email: 'nurse.gupta@locum.com',
        password: hashedNursePassword,
        firstName: 'Suman',
        lastName: 'Gupta',
        phone: '+919876543215',
        role: 'NURSE',
        department: 'ICU',
        location: 'Mumbai',
        specialization: 'Critical Care',
        licenseNumber: 'RN123456',
        hospitalId: hospitals[0].id,
        unitCode: 'ICU',
        preferredHospitals: [hospitals[0].id, hospitals[1].id],
        isActive: true
      },
      {
        email: 'nurse.verma@locum.com',
        password: hashedNursePassword,
        firstName: 'Rekha',
        lastName: 'Verma',
        phone: '+919876543216',
        role: 'NURSE',
        department: 'Surgery',
        location: 'Bangalore',
        specialization: 'Surgical Nursing',
        licenseNumber: 'RN123457',
        hospitalId: hospitals[2].id,
        unitCode: 'SURGERY',
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
        location: 'Mumbai',
        requiredRole: 'DOCTOR',
        specialization: 'Emergency Medicine',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        startTime: '22:00',
        endTime: '06:00',
        hourlyRate: 2500.00,
        priority: 'URGENT',
        maxAssignments: 2,
        requirements: {
          experience: '3+ years',
          certifications: ['ACLS', 'PALS', 'ATLS'],
          skills: ['Trauma care', 'Emergency procedures']
        },
        benefits: {
          mealAllowance: 500,
          parking: true,
          uniform: true
        },
        createdBy: users[1].id, // HR user
        hospitalId: hospitals[0].id,
        unitCode: 'ER',
        facilityName: 'Apollo Hospital Mumbai',
        facilityAddress: {
          street: 'Bandra Kurla Complex',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400051',
          country: 'India'
        },
        contactPerson: {
          name: 'Priya Sharma',
          phone: '+919876543211',
          email: 'hr1@locum.com'
        },
        notes: 'Night shift position with high patient volume'
      },
      {
        title: 'ICU Nurse - Day Shift',
        description: 'Provide critical care nursing services in the intensive care unit. Monitor patients, administer medications, and assist with procedures.',
        department: 'Intensive Care',
        location: 'Delhi',
        requiredRole: 'NURSE',
        specialization: 'Critical Care',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Same day
        startTime: '07:00',
        endTime: '19:00',
        hourlyRate: 800.00,
        priority: 'HIGH',
        maxAssignments: 3,
        requirements: {
          experience: '2+ years ICU',
          certifications: ['BLS', 'ACLS', 'CCRN'],
          skills: ['Ventilator management', 'Hemodynamic monitoring']
        },
        benefits: {
          mealAllowance: 300,
          parking: true,
          uniform: true
        },
        createdBy: users[2].id, // HR user
        hospitalId: hospitals[1].id,
        unitCode: 'ICU',
        facilityName: 'Fortis Hospital Delhi',
        facilityAddress: {
          street: 'Sector 62',
          city: 'Noida',
          state: 'Uttar Pradesh',
          zipCode: '201301',
          country: 'India'
        },
        contactPerson: {
          name: 'Rajesh Kumar',
          phone: '+919876543212',
          email: 'hr2@locum.com'
        },
        notes: 'Day shift ICU position'
      }
    ]);

    console.log(`💼 Created ${jobs.length} jobs`);

    // Create some job assignments
    const assignments = await JobAssignment.bulkCreate([
      {
        jobId: jobs[0].id,
        userId: users[3].id, // Dr. Patel
        status: 'ACCEPTED',
        assignedBy: users[1].id, // HR
        assignedAt: new Date(),
        acceptedAt: new Date(),
        hourlyRate: 2500.00,
        totalHours: 8,
        totalPayment: 20000.00,
        isDirectAssignment: true
      },
      {
        jobId: jobs[1].id,
        userId: users[5].id, // Nurse Gupta
        status: 'PENDING',
        assignedBy: users[2].id, // HR
        assignedAt: new Date(),
        hourlyRate: 800.00,
        totalHours: 12,
        totalPayment: 9600.00,
        isDirectAssignment: true
      }
    ]);

    console.log(`📋 Created ${assignments.length} assignments`);

    // Create a check-in record
    const checkIns = await CheckIn.bulkCreate([
      {
        jobAssignmentId: assignments[0].id,
        userId: users[3].id, // Dr. Patel
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
    console.log('Doctor: dr.patel@locum.com / doctor123456');
    console.log('Nurse: nurse.gupta@locum.com / nurse123456');
    
    console.log('\n🏥 Indian Hospital Information:');
    hospitals.forEach((hospital, index) => {
      console.log(`${index + 1}. ${hospital.name} (${hospital.code})`);
      console.log(`   Location: ${hospital.address.city}, ${hospital.address.state}`);
      const hospitalUnits = units.filter(unit => unit.hospitalId === hospital.id);
      console.log(`   Units: ${hospitalUnits.map(u => `${u.unitName} (${u.unitCode})`).join(', ')}`);
    });

    console.log('\n🎉 Indian hospital seeding completed successfully!');
  } catch (error) {
    console.error('❌ Indian hospital seeding failed:', error);
    throw error;
  }
};

module.exports = seedIndianHospitals;