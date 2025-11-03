const express = require('express');
const path = require('path');
const fs = require('fs');
const { Hospital, Unit, User, Job, JobAssignment, CheckIn } = require('../models');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { upload } = require('../utils/upload');
const { validateTheme, generateUniqueThemeId } = require('../utils/themeHelpers');
const { ensureHospitalAccess, getHospitalContext } = require('../middleware/hospitalAccess');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication and HOSPITAL_ADMIN role
router.use(authenticate);
router.use((req, res, next) => {
  if (req.user.role !== 'HOSPITAL_ADMIN') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'This endpoint requires HOSPITAL_ADMIN role'
    });
  }
  
  if (!req.user.hospitalId) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'You must be assigned to a hospital'
    });
  }
  
  next();
});
router.use(getHospitalContext);

// ==========================================
// HOSPITAL DASHBOARD
// ==========================================

// Get hospital dashboard with statistics
router.get('/dashboard', async (req, res) => {
  try {
    const user = req.user;
    
    const hospital = await Hospital.findByPk(user.hospitalId, {
      attributes: { exclude: [] },
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
          where: { isActive: true },
          required: false
        },
        {
          model: Unit,
          as: 'unitMasters',
          attributes: ['id', 'unitCode', 'unitName', 'isActive'],
          where: { isActive: true },
          required: false
        }
      ]
    });
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found',
        message: 'Your assigned hospital does not exist'
      });
    }
    
    // Get statistics for the hospital
    const [totalJobs, activeJobs, totalAssignments, activeAssignments, totalUsers, activeUsers] = await Promise.all([
      Job.count({ where: { hospitalId: user.hospitalId } }),
      Job.count({ where: { hospitalId: user.hospitalId, status: { [Op.in]: ['ACTIVE', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      JobAssignment.count({
        include: [{
          model: Job,
          as: 'job',
          where: { hospitalId: user.hospitalId },
          attributes: []
        }]
      }),
      JobAssignment.count({
        where: { status: 'IN_PROGRESS' },
        include: [{
          model: Job,
          as: 'job',
          where: { hospitalId: user.hospitalId },
          attributes: []
        }]
      }),
      User.count({ where: { hospitalId: user.hospitalId } }),
      User.count({ where: { hospitalId: user.hospitalId, isActive: true } })
    ]);
    
    // Get recent jobs for this hospital
    const recentJobs = await Job.findAll({
      where: { hospitalId: user.hospitalId },
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    res.json({
      hospital,
      statistics: {
        jobs: {
          total: totalJobs,
          active: activeJobs,
          completed: totalJobs - activeJobs
        },
        assignments: {
          total: totalAssignments,
          active: activeAssignments
        },
        users: {
          total: totalUsers,
          active: activeUsers
        },
        units: hospital.unitMasters ? hospital.unitMasters.length : 0
      },
      recentJobs
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard',
      message: error.message
    });
  }
});

// Get hospital details
router.get('/hospital', async (req, res) => {
  try {
    const user = req.user;
    
    const hospital = await Hospital.findByPk(user.hospitalId, {
      attributes: { exclude: [] },
      include: [
        {
          model: Unit,
          as: 'unitMasters',
          attributes: ['id', 'unitCode', 'unitName', 'isActive']
        }
      ]
    });
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    res.json({ hospital });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({
      error: 'Failed to fetch hospital',
      message: error.message
    });
  }
});

// ==========================================
// THEME MANAGEMENT
// ==========================================

// Get all themes for the hospital
router.get('/themes', async (req, res) => {
  try {
    const user = req.user;
    const hospital = await Hospital.findByPk(user.hospitalId, {
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

// Create a new theme
router.post('/themes', async (req, res) => {
  try {
    const user = req.user;
    const hospital = await Hospital.findByPk(user.hospitalId, {
      attributes: ['id', 'themes']
    });
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    const themeData = req.body;
    
    // Generate ID if not provided (do this BEFORE validation)
    if (!themeData.id) {
      themeData.id = generateUniqueThemeId(hospital.themes || []);
    }

    // Validate the theme
    const validation = validateTheme(themeData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid theme data',
        message: validation.error
      });
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
router.put('/themes/:themeId', async (req, res) => {
  try {
    const user = req.user;
    const { themeId } = req.params;
    const hospital = await Hospital.findByPk(user.hospitalId, {
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
router.delete('/themes/:themeId', async (req, res) => {
  try {
    const user = req.user;
    const { themeId } = req.params;
    const hospital = await Hospital.findByPk(user.hospitalId, {
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
      { where: { hospitalId: user.hospitalId, selectedThemeId: themeId } }
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

// Set default theme
router.put('/themes/default/:themeId', async (req, res) => {
  try {
    const user = req.user;
    const { themeId } = req.params;
    const hospital = await Hospital.findByPk(user.hospitalId, {
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

// ==========================================
// UNIT MANAGEMENT
// ==========================================

// Get all units for the hospital
router.get('/units', async (req, res) => {
  try {
    const user = req.user;
    const units = await Unit.findAll({
      where: { hospitalId: user.hospitalId },
      order: [['unitName', 'ASC']]
    });
    
    res.json({ units });
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({
      error: 'Failed to fetch units',
      message: error.message
    });
  }
});

// Create new unit
router.post('/units', validate(schemas.unitCreation), async (req, res) => {
  try {
    const user = req.user;
    
    // Verify hospital exists
    const hospital = await Hospital.findByPk(user.hospitalId);
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    const unitData = {
      ...req.body,
      hospitalId: user.hospitalId
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
router.put('/units/:unitCode', validate(schemas.unitUpdate), async (req, res) => {
  try {
    const user = req.user;
    const { unitCode } = req.params;
    const [updated] = await Unit.update(req.body, {
      where: { hospitalId: user.hospitalId, unitCode }
    });
    
    if (updated === 0) {
      return res.status(404).json({
        error: 'Unit not found'
      });
    }
    
    const unit = await Unit.findOne({
      where: { hospitalId: user.hospitalId, unitCode }
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
router.delete('/units/:unitCode', async (req, res) => {
  try {
    const user = req.user;
    const { unitCode } = req.params;
    const [updated] = await Unit.update(
      { isActive: false },
      { where: { hospitalId: user.hospitalId, unitCode } }
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

// ==========================================
// HOSPITAL LOGO
// ==========================================

// Upload hospital logo
router.post('/logo', upload.single('logo'), async (req, res) => {
  try {
    const user = req.user;
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload an image file'
      });
    }

    const hospital = await Hospital.findByPk(user.hospitalId);
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
router.delete('/logo', async (req, res) => {
  try {
    const user = req.user;
    const hospital = await Hospital.findByPk(user.hospitalId);
    
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

// ==========================================
// USER MANAGEMENT (Hospital-scoped)
// ==========================================

// Get all users for the hospital
router.get('/users', async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 50, role, search } = req.query;
    const offset = (page - 1) * limit;

    const where = { hospitalId: user.hospitalId };
    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

// ==========================================
// JOB MANAGEMENT (Hospital-scoped)
// ==========================================

// Get all jobs for the hospital
router.get('/jobs', async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 50, status, department } = req.query;
    const offset = (page - 1) * limit;

    const where = { hospitalId: user.hospitalId };
    if (status) where.status = status;
    if (department) where.department = department;

    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: JobAssignment,
          as: 'assignments',
          attributes: ['id', 'userId', 'status', [Job.sequelize.literal('`assignments`.`created_at`'), 'assignedAt']],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }]
        }
      ]
    });

    res.json({
      jobs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      error: 'Failed to fetch jobs',
      message: error.message
    });
  }
});

module.exports = router;

