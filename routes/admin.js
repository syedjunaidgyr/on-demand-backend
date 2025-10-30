const express = require('express');
const fs = require('fs');
const path = require('path');
const { Hospital, Unit, User, Job, JobAssignment, CheckIn, sequelize } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { upload } = require('../utils/upload');
const { validateTheme, generateUniqueThemeId } = require('../utils/themeHelpers');
const { Op } = require('sequelize');

const router = express.Router();

// Apply authentication and ADMIN authorization to all routes
router.use(authenticate);
router.use(authorize('ADMIN'));

// ==========================================
// ADMIN DASHBOARD (System-wide)
// ==========================================

// Get system dashboard with all hospitals statistics
router.get('/dashboard', async (req, res) => {
  try {
    // Get total hospitals
    const totalHospitals = await Hospital.count();
    const activeHospitals = await Hospital.count({ where: { isActive: true } });
    
    // Get total users
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    
    // Get users by role
    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role'],
      raw: true
    });
    
    // Get total jobs
    const totalJobs = await Job.count();
    const activeJobs = await Job.count({ 
      where: { status: { [Op.in]: ['ACTIVE', 'ASSIGNED', 'IN_PROGRESS'] } } 
    });
    
    // Get total assignments
    const totalAssignments = await JobAssignment.count();
    const activeAssignments = await JobAssignment.count({ 
      where: { status: 'IN_PROGRESS' } 
    });
    
    // Get total units across all hospitals
    const totalUnits = await Unit.count();
    const activeUnits = await Unit.count({ where: { isActive: true } });
    
    // Get recent hospitals
    const recentHospitals = await Hospital.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'code', 'isActive', 'createdAt']
    });
    
    // Get top hospitals by job count
    const topHospitals = await Job.findAll({
      attributes: [
        'hospitalId',
        [sequelize.fn('COUNT', sequelize.col('Job.id')), 'jobCount']
      ],
      include: [{
        model: Hospital,
        as: 'hospital',
        attributes: ['id', 'name', 'code']
      }],
      group: ['hospitalId', 'hospital.id'],
      order: [[sequelize.literal('jobCount'), 'DESC']],
      limit: 10,
      raw: false
    });
    
    res.json({
      statistics: {
        hospitals: {
          total: totalHospitals,
          active: activeHospitals,
          inactive: totalHospitals - activeHospitals
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: usersByRole
        },
        jobs: {
          total: totalJobs,
          active: activeJobs,
          completed: totalJobs - activeJobs
        },
        assignments: {
          total: totalAssignments,
          active: activeAssignments
        },
        units: {
          total: totalUnits,
          active: activeUnits
        }
      },
      recentHospitals,
      topHospitals
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard',
      message: error.message
    });
  }
});

// Hospital CRUD operations

// Create new hospital (with optional logo upload)
router.post('/hospitals', upload.single('logo'), async (req, res) => {
  try {
    // Validate non-file fields
    const { error: validationError, value } = schemas.hospitalCreation.validate(req.body, { abortEarly: false });
    if (validationError) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details.map(d => ({ field: d.path.join('.'), message: d.message }))
      });
    }

    const hospitalData = { ...value };
    
    // If logo uploaded, add path
    if (req.file) {
      hospitalData.logo = `/uploads/hospitals/${req.file.filename}`;
    }

    const hospital = await Hospital.create(hospitalData);
    res.status(201).json({
      message: 'Hospital created successfully',
      hospital,
      ...(req.file && { logo: hospitalData.logo, logoUrl: `${req.protocol}://${req.get('host')}${hospitalData.logo}` })
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Create hospital error:', error);
    res.status(500).json({
      error: 'Failed to create hospital',
      message: error.message
    });
  }
});

// Update hospital
router.put('/hospitals/:id', validate(schemas.hospitalUpdate), async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Hospital.update(req.body, {
      where: { id }
    });
    
    if (updated === 0) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    const hospital = await Hospital.findByPk(id);
    res.json({
      message: 'Hospital updated successfully',
      hospital
    });
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({
      error: 'Failed to update hospital',
      message: error.message
    });
  }
});

// Delete hospital (soft delete by setting isActive to false)
router.delete('/hospitals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Hospital.update(
      { isActive: false },
      { where: { id } }
    );
    
    if (updated === 0) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    res.json({
      message: 'Hospital deactivated successfully'
    });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({
      error: 'Failed to delete hospital',
      message: error.message
    });
  }
});

// Unit CRUD operations

// Create new unit for a hospital
router.post('/hospitals/:hospitalId/units', validate(schemas.unitCreation), async (req, res) => {
  try {
    const { hospitalId } = req.params;
    
    // Verify hospital exists
    const hospital = await Hospital.findByPk(hospitalId);
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    const unitData = {
      ...req.body,
      hospitalId: parseInt(hospitalId)
    };
    
    const unit = await Unit.create(unitData);
    res.status(201).json({
      message: 'Unit created successfully',
      unit
    });
  } catch (error) {
    console.error('Create unit error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Unit already exists',
        message: 'A unit with this code already exists for this hospital'
      });
    }
    res.status(500).json({
      error: 'Failed to create unit',
      message: error.message
    });
  }
});

// Update unit
router.put('/hospitals/:hospitalId/units/:unitCode', validate(schemas.unitUpdate), async (req, res) => {
  try {
    const { hospitalId, unitCode } = req.params;
    const [updated] = await Unit.update(req.body, {
      where: { hospitalId, unitCode }
    });
    
    if (updated === 0) {
      return res.status(404).json({
        error: 'Unit not found'
      });
    }
    
    const unit = await Unit.findOne({
      where: { hospitalId, unitCode }
    });
    
    res.json({
      message: 'Unit updated successfully',
      unit
    });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({
      error: 'Failed to update unit',
      message: error.message
    });
  }
});

// Delete unit (soft delete by setting isActive to false)
router.delete('/hospitals/:hospitalId/units/:unitCode', async (req, res) => {
  try {
    const { hospitalId, unitCode } = req.params;
    const [updated] = await Unit.update(
      { isActive: false },
      { where: { hospitalId, unitCode } }
    );
    
    if (updated === 0) {
      return res.status(404).json({
        error: 'Unit not found'
      });
    }
    
    res.json({
      message: 'Unit deactivated successfully'
    });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({
      error: 'Failed to delete unit',
      message: error.message
    });
  }
});

// Upload hospital logo
router.post('/hospitals/:id/logo', upload.single('logo'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload an image file'
      });
    }

    const hospital = await Hospital.findByPk(id);
    if (!hospital) {
      // Delete uploaded file if hospital doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }

    // Delete old logo if exists
    if (hospital.logo) {
      const oldLogoPath = path.join(__dirname, '../public/uploads/hospitals', path.basename(hospital.logo));
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Save relative path to database (usable by frontend)
    const logoPath = `/uploads/hospitals/${req.file.filename}`;
    await hospital.update({ logo: logoPath });

    // Reload hospital to get updated data
    await hospital.reload();

    res.json({
      message: 'Logo uploaded successfully',
      logo: logoPath,
      logoUrl: `${req.protocol}://${req.get('host')}${logoPath}`,
      hospital: hospital.toJSON()
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: 'Failed to upload logo',
      message: error.message
    });
  }
});

// Delete hospital logo
router.delete('/hospitals/:id/logo', async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findByPk(id);
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }

    if (!hospital.logo) {
      return res.status(404).json({
        error: 'No logo found',
        message: 'Hospital has no logo to delete'
      });
    }

    // Delete file from filesystem
    const logoPath = path.join(__dirname, '../public/uploads/hospitals', path.basename(hospital.logo));
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }

    // Remove logo path from database
    await hospital.update({ logo: null });

    res.json({
      message: 'Logo deleted successfully',
      hospital: hospital.toJSON()
    });
  } catch (error) {
    console.error('Delete logo error:', error);
    res.status(500).json({
      error: 'Failed to delete logo',
      message: error.message
    });
  }
});

// Theme Management endpoints

// Get all themes for a hospital
router.get('/hospitals/:id/themes', async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findByPk(id, {
      attributes: ['id', 'themes', 'defaultThemeId']
    });
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    res.json({
      hospital: {
        id: hospital.id,
        defaultThemeId: hospital.defaultThemeId
      },
      themes: hospital.themes || [],
      defaultTheme: hospital.getDefaultTheme()
    });
  } catch (error) {
    console.error('Get themes error:', error);
    res.status(500).json({
      error: 'Failed to fetch themes',
      message: error.message
    });
  }
});

// Create a new theme for a hospital
router.post('/hospitals/:id/themes', async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findByPk(id, {
      attributes: ['id', 'themes']
    });
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    const themeData = req.body;
    
    // Validate the theme
    const validation = validateTheme(themeData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid theme data',
        message: validation.error
      });
    }
    
    // Generate ID if not provided
    if (!themeData.id) {
      themeData.id = generateUniqueThemeId(hospital.themes || []);
    }
    
    // Check if theme ID already exists
    const existingTheme = hospital.getThemeById(themeData.id);
    if (existingTheme) {
      return res.status(400).json({
        error: 'Theme already exists',
        message: `A theme with ID "${themeData.id}" already exists`
      });
    }
    
    // Add new theme to themes array
    const updatedThemes = [...(hospital.themes || []), themeData];
    
    await hospital.update({ themes: updatedThemes });
    
    res.status(201).json({
      message: 'Theme created successfully',
      theme: themeData,
      hospital: hospital.toJSON()
    });
  } catch (error) {
    console.error('Create theme error:', error);
    res.status(500).json({
      error: 'Failed to create theme',
      message: error.message
    });
  }
});

// Update an existing theme
router.put('/hospitals/:id/themes/:themeId', async (req, res) => {
  try {
    const { id, themeId } = req.params;
    const hospital = await Hospital.findByPk(id, {
      attributes: ['id', 'themes']
    });
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    const existingTheme = hospital.getThemeById(themeId);
    if (!existingTheme) {
      return res.status(404).json({
        error: 'Theme not found',
        message: `Theme with ID "${themeId}" does not exist`
      });
    }
    
    // Validate updated theme data
    const updatedTheme = { ...existingTheme, ...req.body };
    const validation = validateTheme(updatedTheme);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid theme data',
        message: validation.error
      });
    }
    
    // Prevent changing theme ID
    if (updatedTheme.id !== themeId) {
      return res.status(400).json({
        error: 'Cannot change theme ID',
        message: 'Theme ID cannot be modified'
      });
    }
    
    // Update theme in array
    const updatedThemes = hospital.themes.map(theme => 
      theme.id === themeId ? updatedTheme : theme
    );
    
    await hospital.update({ themes: updatedThemes });
    
    res.json({
      message: 'Theme updated successfully',
      theme: updatedTheme,
      hospital: hospital.toJSON()
    });
  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({
      error: 'Failed to update theme',
      message: error.message
    });
  }
});

// Delete a theme
router.delete('/hospitals/:id/themes/:themeId', async (req, res) => {
  try {
    const { id, themeId } = req.params;
    const hospital = await Hospital.findByPk(id, {
      attributes: ['id', 'themes', 'defaultThemeId']
    });
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    const existingTheme = hospital.getThemeById(themeId);
    if (!existingTheme) {
      return res.status(404).json({
        error: 'Theme not found',
        message: `Theme with ID "${themeId}" does not exist`
      });
    }
    
    // Prevent deleting the default theme
    if (hospital.defaultThemeId === themeId) {
      return res.status(400).json({
        error: 'Cannot delete default theme',
        message: 'You must set a different default theme before deleting this one'
      });
    }
    
    // Filter out the theme
    const updatedThemes = hospital.themes.filter(theme => theme.id !== themeId);
    
    // Must have at least one theme
    if (updatedThemes.length === 0) {
      return res.status(400).json({
        error: 'Cannot delete last theme',
        message: 'Hospital must have at least one theme'
      });
    }
    
    await hospital.update({ themes: updatedThemes });
    
    // Set selectedThemeId to null for users who had this theme selected
    await User.update(
      { selectedThemeId: null },
      { where: { hospitalId: id, selectedThemeId: themeId } }
    );
    
    res.json({
      message: 'Theme deleted successfully',
      hospital: hospital.toJSON()
    });
  } catch (error) {
    console.error('Delete theme error:', error);
    res.status(500).json({
      error: 'Failed to delete theme',
      message: error.message
    });
  }
});

// Set default theme for a hospital
router.put('/hospitals/:id/themes/default/:themeId', async (req, res) => {
  try {
    const { id, themeId } = req.params;
    const hospital = await Hospital.findByPk(id, {
      attributes: ['id', 'themes', 'defaultThemeId']
    });
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    const theme = hospital.getThemeById(themeId);
    if (!theme) {
      return res.status(404).json({
        error: 'Theme not found',
        message: `Theme with ID "${themeId}" does not exist`
      });
    }
    
    await hospital.update({ defaultThemeId: themeId });
    
    res.json({
      message: 'Default theme updated successfully',
      defaultTheme: theme,
      hospital: hospital.toJSON()
    });
  } catch (error) {
    console.error('Set default theme error:', error);
    res.status(500).json({
      error: 'Failed to set default theme',
      message: error.message
    });
  }
});

module.exports = router;
