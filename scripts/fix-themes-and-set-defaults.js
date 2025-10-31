require('dotenv').config();
const { sequelize, Hospital } = require('../models');
const { QueryTypes } = require('sequelize');

const DEFAULT_THEMES = [
  {
    id: 'default',
    name: 'Professional Blue',
    primaryColor: '#2563eb',
    secondaryColor: '#3b82f6',
    backgroundColor: '#f8fafc',
    textColor: '#1e293b',
    accentTextColor: '#ffffff'
  },
  {
    id: 'theme_1',
    name: 'Medical Green',
    primaryColor: '#059669',
    secondaryColor: '#10b981',
    backgroundColor: '#f0fdf4',
    textColor: '#064e3b',
    accentTextColor: '#ffffff'
  },
  {
    id: 'theme_2',
    name: 'Warm Coral',
    primaryColor: '#dc2626',
    secondaryColor: '#f87171',
    backgroundColor: '#fff7ed',
    textColor: '#7c2d12',
    accentTextColor: '#ffffff'
  },
  {
    id: 'theme_3',
    name: 'Royal Purple',
    primaryColor: '#7c3aed',
    secondaryColor: '#a78bfa',
    backgroundColor: '#faf5ff',
    textColor: '#4c1d95',
    accentTextColor: '#ffffff'
  }
];

async function fixThemesAndSetDefaults() {
  try {
    console.log('🔄 Starting theme fix and default setup for existing hospitals...');
    
    // Get all hospitals
    const hospitals = await Hospital.findAll({
      attributes: ['id', 'name', 'themes', 'defaultThemeId']
    });
    
    console.log(`📋 Found ${hospitals.length} hospitals to process\n`);
    
    let fixedCount = 0;
    let createdCount = 0;
    
    for (const hospital of hospitals) {
      console.log(`Processing Hospital ID ${hospital.id}: ${hospital.name}`);
      
      let needsUpdate = false;
      let themes = hospital.themes;
      let defaultThemeId = hospital.defaultThemeId;
      
      // Check if themes column exists and is valid
      if (!themes || !Array.isArray(themes) || themes.length === 0) {
        console.log('  ⚠️  No themes found, creating default theme set...');
        themes = [...DEFAULT_THEMES];
        needsUpdate = true;
        createdCount++;
      } else {
        // Validate and fix themes
        const validThemes = [];
        const invalidThemes = [];
        
        for (const theme of themes) {
          if (!theme || typeof theme !== 'object') {
            invalidThemes.push(theme);
            continue;
          }
          
          // Check required fields
          const requiredFields = ['id', 'name', 'primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'accentTextColor'];
          const missingFields = requiredFields.filter(field => !theme[field]);
          
          if (missingFields.length > 0) {
            console.log(`  ⚠️  Theme "${theme.id || 'unknown'}" missing fields: ${missingFields.join(', ')}`);
            invalidThemes.push(theme);
            continue;
          }
          
          // Validate hex colors
          const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
          const colorFields = ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'accentTextColor'];
          const invalidColors = colorFields.filter(field => !hexColorRegex.test(theme[field]));
          
          if (invalidColors.length > 0) {
            console.log(`  ⚠️  Theme "${theme.id}" has invalid colors: ${invalidColors.join(', ')}`);
            invalidThemes.push(theme);
            continue;
          }
          
          validThemes.push(theme);
        }
        
        if (invalidThemes.length > 0 || validThemes.length === 0) {
          console.log(`  ⚠️  Found ${invalidThemes.length} invalid themes, ${validThemes.length} valid themes`);
          
          if (validThemes.length === 0) {
            console.log('  🔄 Replacing all themes with default set...');
            themes = [...DEFAULT_THEMES];
            createdCount++;
          } else {
            console.log(`  ✅ Keeping ${validThemes.length} valid themes`);
            themes = validThemes;
            
            // Add missing default themes if needed
            const existingIds = validThemes.map(t => t.id);
            const missingDefaults = DEFAULT_THEMES.filter(t => !existingIds.includes(t.id));
            if (missingDefaults.length > 0) {
              console.log(`  ➕ Adding ${missingDefaults.length} missing default themes...`);
              themes = [...validThemes, ...missingDefaults];
            }
          }
          
          needsUpdate = true;
          fixedCount++;
        }
      }
      
      // Check if defaultThemeId is set and valid
      if (!defaultThemeId) {
        console.log('  ⚠️  No default theme set, setting to "default"...');
        defaultThemeId = 'default';
        needsUpdate = true;
      } else {
        // Check if defaultThemeId exists in themes
        const defaultTheme = themes.find(t => t.id === defaultThemeId);
        if (!defaultTheme) {
          console.log(`  ⚠️  Default theme "${defaultThemeId}" not found in themes, setting to first theme...`);
          defaultThemeId = themes[0].id;
          needsUpdate = true;
        }
      }
      
      // Update hospital if needed
      if (needsUpdate) {
        await Hospital.update(
          { themes, defaultThemeId },
          { where: { id: hospital.id } }
        );
        console.log('  ✅ Hospital updated\n');
      } else {
        console.log('  ✅ No changes needed\n');
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Total hospitals processed: ${hospitals.length}`);
    console.log(`   Hospitals fixed: ${fixedCount}`);
    console.log(`   Theme sets created: ${createdCount}`);
    
    // Verify results
    console.log('\n🔍 Verifying results...');
    const verifyHospitals = await Hospital.findAll({
      attributes: ['id', 'name', 'themes', 'defaultThemeId']
    });
    
    let allValid = true;
    for (const hospital of verifyHospitals) {
      const themes = hospital.themes || [];
      const defaultThemeId = hospital.defaultThemeId;
      
      if (!themes || themes.length === 0) {
        console.log(`   ❌ Hospital ${hospital.id} still has no themes`);
        allValid = false;
      } else if (!defaultThemeId) {
        console.log(`   ❌ Hospital ${hospital.id} still has no default theme`);
        allValid = false;
      } else {
        const defaultTheme = themes.find(t => t.id === defaultThemeId);
        if (!defaultTheme) {
          console.log(`   ❌ Hospital ${hospital.id} has invalid default theme ID`);
          allValid = false;
        } else {
          console.log(`   ✅ Hospital ${hospital.id}: ${themes.length} themes, default: "${defaultTheme.name}"`);
        }
      }
    }
    
    if (allValid) {
      console.log('\n🎉 All hospitals have valid themes and default theme set!');
    } else {
      console.log('\n⚠️  Some hospitals still have issues. Please review manually.');
    }
    
  } catch (error) {
    console.error('❌ Error during theme fix and default setup:', error);
    throw error;
  } finally {
    if (!process.env.NO_CLOSE_SEQUELIZE) {
      await sequelize.close();
    }
  }
}

// Run migration if executed directly
if (require.main === module) {
  fixThemesAndSetDefaults()
    .then(() => {
      console.log('\n✅ Theme fix and default setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Theme fix and default setup failed:', error);
      process.exit(1);
    });
}

module.exports = { fixThemesAndSetDefaults };

