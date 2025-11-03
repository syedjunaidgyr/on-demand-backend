#!/usr/bin/env node
require('dotenv').config();

const { sequelize, Hospital, Unit } = require('../models');
const { Op } = require('sequelize');

// 15 Bangalore hospitals with their unit codes
const bangaloreHospitals = [
  {
    name: 'Apollo Hospitals Bangalore',
    code: 'APL-BLR-001',
    address: {
      street: '154/11, Bannerghatta Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560076',
      country: 'India'
    },
    phone: '+91-80-26304050',
    email: 'info@apollobangalore.com',
    website: 'https://www.apollohospitals.com',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'Cardiology', code: 'CARD' },
      { name: 'Surgery', code: 'SURG' },
      { name: 'Pediatrics', code: 'PEDS' }
    ]
  },
  {
    name: 'Manipal Hospital Bangalore',
    code: 'MAN-BLR-002',
    address: {
      street: '98, HAL Airport Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560017',
      country: 'India'
    },
    phone: '+91-80-25024444',
    email: 'info@manipalhospitals.com',
    website: 'https://www.manipalhospitals.com',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'Orthopedics', code: 'ORTHO' },
      { name: 'Neurology', code: 'NEURO' },
      { name: 'Oncology', code: 'ONCO' }
    ]
  },
  {
    name: 'Fortis Hospital Bangalore',
    code: 'FOR-BLR-003',
    address: {
      street: '154/9, Bannerghatta Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560076',
      country: 'India'
    },
    phone: '+91-80-66214444',
    email: 'info@fortisbangalore.com',
    website: 'https://www.fortishealthcare.com',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'Cardiac Care Unit', code: 'CCU' },
      { name: 'General Surgery', code: 'GEN-SURG' },
      { name: 'Maternity', code: 'MAT' }
    ]
  },
  {
    name: 'Narayana Health City Bangalore',
    code: 'NAR-BLR-004',
    address: {
      street: '258/A, Bommasandra Industrial Area',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560099',
      country: 'India'
    },
    phone: '+91-80-27835000',
    email: 'info@narayanahealth.org',
    website: 'https://www.narayanahealth.org',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'Cardiology', code: 'CARD' },
      { name: 'Pediatric ICU', code: 'PICU' },
      { name: 'Neonatal ICU', code: 'NICU' }
    ]
  },
  {
    name: 'Columbia Asia Hospital Yeshwanthpur',
    code: 'COL-BLR-005',
    address: {
      street: '#4/1, Toll Gate Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560022',
      country: 'India'
    },
    phone: '+91-80-66491111',
    email: 'info@columbiaasia.com',
    website: 'https://www.columbiaasia.com',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'Obstetrics & Gynecology', code: 'OBGYN' },
      { name: 'Urology', code: 'URO' },
      { name: 'ENT', code: 'ENT' }
    ]
  },
  {
    name: 'BGS Gleneagles Global Hospitals',
    code: 'BGS-BLR-006',
    address: {
      street: '67, Uttarahalli Main Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560060',
      country: 'India'
    },
    phone: '+91-80-26422222',
    email: 'info@gleneaglesbangalore.com',
    website: 'https://www.gleneaglesglobalhospitals.com',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'Transplant ICU', code: 'TICU' },
      { name: 'Hepatology', code: 'HEPAT' },
      { name: 'Gastroenterology', code: 'GI' }
    ]
  },
  {
    name: 'Sakra World Hospital',
    code: 'SAK-BLR-007',
    address: {
      street: 'Devarabeesanahalli, Varthur Hobli',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560103',
      country: 'India'
    },
    phone: '+91-80-49684968',
    email: 'info@sakrahospital.com',
    website: 'https://www.sakraworldhospital.com',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'Cardiac ICU', code: 'CICU' },
      { name: 'Neuro ICU', code: 'NICU' },
      { name: 'Burns Unit', code: 'BURNS' }
    ]
  },
  {
    name: 'Mazumdar Shaw Medical Center',
    code: 'MAZ-BLR-008',
    address: {
      street: '258/A, Bommasandra Industrial Area',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560099',
      country: 'India'
    },
    phone: '+91-80-27763456',
    email: 'info@msmcblr.com',
    website: 'https://www.msmcblr.com',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'Cancer Care', code: 'ONCO' },
      { name: 'Radiotherapy', code: 'RADIO' },
      { name: 'Chemotherapy', code: 'CHEMO' }
    ]
  },
  {
    name: 'Hosmat Hospital',
    code: 'HOS-BLR-009',
    address: {
      street: '45, Magrath Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560025',
      country: 'India'
    },
    phone: '+91-80-25593793',
    email: 'info@hosmathospitals.com',
    website: 'https://www.hosmathospitals.com',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'Orthopedics', code: 'ORTHO' },
      { name: 'Spine Surgery', code: 'SPINE' },
      { name: 'Sports Medicine', code: 'SPORT' }
    ]
  },
  {
    name: 'St. John\'s Medical College Hospital',
    code: 'STJ-BLR-010',
    address: {
      street: 'Sarjapur Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560034',
      country: 'India'
    },
    phone: '+91-80-22065000',
    email: 'info@stjohns.in',
    website: 'https://www.stjohns.in',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'General Medicine', code: 'GEN-MED' },
      { name: 'Pediatrics', code: 'PEDS' },
      { name: 'Psychiatry', code: 'PSYCH' }
    ]
  },
  {
    name: 'Cloudnine Hospital Bangalore',
    code: 'CLD-BLR-011',
    address: {
      street: '47/2, 24th Main Road, JP Nagar',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560078',
      country: 'India'
    },
    phone: '+91-80-49499999',
    email: 'info@cloudninecare.com',
    website: 'https://www.cloudninecare.com',
    units: [
      { name: 'Maternity Unit', code: 'MAT' },
      { name: 'Neonatal ICU', code: 'NICU' },
      { name: 'Obstetrics', code: 'OB' },
      { name: 'Gynecology', code: 'GYN' },
      { name: 'Fertility Center', code: 'FERT' }
    ]
  },
  {
    name: 'Sparsh Hospital',
    code: 'SPA-BLR-012',
    address: {
      street: '147, Infantry Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    },
    phone: '+91-80-22210700',
    email: 'info@sparshhospital.com',
    website: 'https://www.sparshhospital.com',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'Cardiac Care', code: 'CARD' },
      { name: 'Dermatology', code: 'DERM' },
      { name: 'Plastic Surgery', code: 'PLASTIC' }
    ]
  },
  {
    name: 'Dr. Agarwal\'s Eye Hospital',
    code: 'AGR-BLR-013',
    address: {
      street: '19, Kasturba Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    },
    phone: '+91-80-22255577',
    email: 'info@dragarwal.com',
    website: 'https://www.dragarwal.com',
    units: [
      { name: 'Eye Emergency', code: 'EYE-ER' },
      { name: 'Retina Unit', code: 'RETINA' },
      { name: 'Cornea Unit', code: 'CORNEA' },
      { name: 'Glaucoma Unit', code: 'GLAUCOMA' },
      { name: 'Pediatric Ophthalmology', code: 'PED-OPHTH' }
    ]
  },
  {
    name: 'Bangalore Baptist Hospital',
    code: 'BBH-BLR-014',
    address: {
      street: 'Bellary Road, Hebbal',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560024',
      country: 'India'
    },
    phone: '+91-80-23431111',
    email: 'info@bbh.org.in',
    website: 'https://www.bbh.org.in',
    units: [
      { name: 'Intensive Care Unit', code: 'ICU' },
      { name: 'Emergency Department', code: 'ER' },
      { name: 'General Medicine', code: 'GEN-MED' },
      { name: 'General Surgery', code: 'GEN-SURG' },
      { name: 'Obstetrics', code: 'OB' }
    ]
  },
  {
    name: 'Kidwai Memorial Institute of Oncology',
    code: 'KID-BLR-015',
    address: {
      street: 'Dr. M.H. Marigowda Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560029',
      country: 'India'
    },
    phone: '+91-80-26094000',
    email: 'info@kidwai.kar.nic.in',
    website: 'https://www.kidwai.kar.nic.in',
    units: [
      { name: 'Medical Oncology', code: 'MED-ONCO' },
      { name: 'Surgical Oncology', code: 'SURG-ONCO' },
      { name: 'Radiation Oncology', code: 'RAD-ONCO' },
      { name: 'Bone Marrow Transplant', code: 'BMT' },
      { name: 'Palliative Care', code: 'PALLIATIVE' }
    ]
  }
];

async function setupBangaloreHospitals() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🏥 Setting up 15 Bangalore hospitals...\n');

    // Step 1: Deactivate existing non-Bangalore hospitals (preserve relationships)
    console.log('📋 Step 1: Checking existing hospitals...');
    const existingHospitals = await Hospital.findAll({
      where: { isActive: true },
      transaction
    });

    // Deactivate hospitals that are not in Bangalore
    let deactivatedCount = 0;
    for (const hospital of existingHospitals) {
      const address = hospital.address || {};
      const city = (address.city || '').toLowerCase();
      const state = (address.state || '').toLowerCase();
      
      // Check if hospital is not in Bangalore
      if (city !== 'bangalore' && city !== 'bengaluru' && 
          state !== 'karnataka') {
        await Hospital.update(
          { isActive: false },
          { where: { id: hospital.id }, transaction }
        );
        deactivatedCount++;
        console.log(`   ⚠️  Deactivated: ${hospital.name} (not in Bangalore)`);
      }
    }

    if (deactivatedCount > 0) {
      console.log(`\n   ✅ Deactivated ${deactivatedCount} non-Bangalore hospitals\n`);
    } else {
      console.log('   ℹ️  All existing hospitals are already in Bangalore or no hospitals found\n');
    }

    // Step 2: Create or update Bangalore hospitals
    console.log('📋 Step 2: Creating/updating Bangalore hospitals...');
    const createdHospitals = [];
    const updatedHospitals = [];

    for (const hospitalData of bangaloreHospitals) {
      // Check if hospital with this code already exists
      const existingHospital = await Hospital.findOne({
        where: { code: hospitalData.code },
        transaction
      });

      if (existingHospital) {
        // Update existing hospital
        await Hospital.update(
          {
            name: hospitalData.name,
            address: hospitalData.address,
            phone: hospitalData.phone,
            email: hospitalData.email,
            website: hospitalData.website,
            units: hospitalData.units,
            isActive: true
          },
          { where: { id: existingHospital.id }, transaction }
        );
        updatedHospitals.push({ ...hospitalData, id: existingHospital.id });
        console.log(`   ✅ Updated: ${hospitalData.name} (ID: ${existingHospital.id})`);
      } else {
        // Create new hospital
        const hospital = await Hospital.create(
          {
            ...hospitalData,
            isActive: true
          },
          { transaction }
        );
        createdHospitals.push({ ...hospitalData, id: hospital.id });
        console.log(`   ✅ Created: ${hospitalData.name} (ID: ${hospital.id})`);
      }
    }

    console.log(`\n   ✅ Created ${createdHospitals.length} new hospitals`);
    console.log(`   ✅ Updated ${updatedHospitals.length} existing hospitals\n`);

    // Step 3: Create units for all hospitals
    console.log('📋 Step 3: Setting up units for hospitals...');
    let totalUnitsCreated = 0;
    let totalUnitsUpdated = 0;

    const allHospitals = [...createdHospitals, ...updatedHospitals];

    for (const hospitalData of allHospitals) {
      const hospitalId = hospitalData.id;
      
      for (const unitData of hospitalData.units) {
        // Check if unit already exists
        const existingUnit = await Unit.findOne({
          where: {
            hospitalId: hospitalId,
            unitCode: unitData.code
          },
          transaction
        });

        if (existingUnit) {
          // Update existing unit
          await Unit.update(
            {
              unitName: unitData.name,
              isActive: true
            },
            {
              where: {
                hospitalId: hospitalId,
                unitCode: unitData.code
              },
              transaction
            }
          );
          totalUnitsUpdated++;
        } else {
          // Create new unit
          await Unit.create(
            {
              hospitalId: hospitalId,
              unitCode: unitData.code,
              unitName: unitData.name,
              isActive: true
            },
            { transaction }
          );
          totalUnitsCreated++;
        }
      }
      console.log(`   ✅ Processed units for: ${hospitalData.name}`);
    }

    console.log(`\n   ✅ Created ${totalUnitsCreated} new units`);
    console.log(`   ✅ Updated ${totalUnitsUpdated} existing units\n`);

    // Step 4: Deactivate units that don't match the hospital's units (cleanup)
    console.log('📋 Step 4: Cleaning up orphaned units...');
    let deactivatedUnits = 0;
    
    for (const hospitalData of allHospitals) {
      const validUnitCodes = hospitalData.units.map(u => u.code);
      const orphanedUnits = await Unit.findAll({
        where: {
          hospitalId: hospitalData.id,
          unitCode: { [Op.notIn]: validUnitCodes },
          isActive: true
        },
        transaction
      });

      if (orphanedUnits.length > 0) {
        await Unit.update(
          { isActive: false },
          {
            where: {
              hospitalId: hospitalData.id,
              unitCode: { [Op.notIn]: validUnitCodes },
              isActive: true
            },
            transaction
          }
        );
        deactivatedUnits += orphanedUnits.length;
      }
    }

    if (deactivatedUnits > 0) {
      console.log(`   ✅ Deactivated ${deactivatedUnits} orphaned units\n`);
    } else {
      console.log('   ℹ️  No orphaned units found\n');
    }

    // Commit transaction
    await transaction.commit();

    console.log('🎉 Successfully set up 15 Bangalore hospitals with their unit codes!');
    console.log('\n📊 Summary:');
    console.log(`   - Hospitals created: ${createdHospitals.length}`);
    console.log(`   - Hospitals updated: ${updatedHospitals.length}`);
    console.log(`   - Non-Bangalore hospitals deactivated: ${deactivatedCount}`);
    console.log(`   - Units created: ${totalUnitsCreated}`);
    console.log(`   - Units updated: ${totalUnitsUpdated}`);
    console.log(`   - Orphaned units deactivated: ${deactivatedUnits}`);

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error setting up Bangalore hospitals:', error);
    throw error;
  }
}

async function main() {
  try {
    await setupBangaloreHospitals();
  } catch (error) {
    console.error('❌ Setup failed:', error);
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

module.exports = { setupBangaloreHospitals };

