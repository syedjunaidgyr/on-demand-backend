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
    
    if (!user.hospitalId) {
      return res.status(400).json({
        error: 'No hospital assigned',
        message: 'You must be assigned to a hospital to view the dashboard'
      });
    }
    
    // Get hospital with all details
    const hospital = await Hospital.findByPk(user.hospitalId);
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found',
        message: 'Your assigned hospital does not exist'
      });
    }
    
    // Get users for this hospital separately
    const users = await User.findAll({
      where: { hospitalId: user.hospitalId },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
      order: [['createdAt', 'DESC']]
    });
    
    // Get units for this hospital separately
    const units = await Unit.findAll({
      where: { hospitalId: user.hospitalId },
      attributes: ['id', 'unitCode', 'unitName', 'isActive'],
      order: [['unitName', 'ASC']]
    });
    
    // Get statistics for the hospital
    const [totalJobs, activeJobs, totalAssignments, activeAssignments, totalUsers, activeUsers] = await Promise.all([
      Job.count({ where: { hospitalId: user.hospitalId } }),
      Job.count({ where: { hospitalId: user.hospitalId, status: { [Op.in]: ['ACTIVE', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      JobAssignment.count({
        include: [{
          model: Job,
          as: 'job',
          where: { hospitalId: user.hospitalId },
          attributes: [],
          required: true
        }]
      }),
      JobAssignment.count({
        where: { status: 'IN_PROGRESS' },
        include: [{
          model: Job,
          as: 'job',
          where: { hospitalId: user.hospitalId },
          attributes: [],
          required: true
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
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ]
    });
    
    // Convert hospital to JSON and add users/units
    const hospitalData = hospital.toJSON();
    hospitalData.users = users;
    hospitalData.unitMasters = units;
    // Add alias for frontend compatibility (frontend checks hospital.units.length)
    hospitalData.units = units;
    
    // Return data structure that matches frontend expectations
    res.json({
      hospital: hospitalData,
      // Statistics flattened for frontend compatibility
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
      units: units.length,
      recentJobs: recentJobs,
      // Also include nested statistics for backward compatibility
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
        units: units.length
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

// Update hospital details
router.put('/hospital', validate(schemas.hospitalUpdate), async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.hospitalId) {
      return res.status(400).json({
        error: 'No hospital assigned',
        message: 'You must be assigned to a hospital to update it'
      });
    }
    
    const hospital = await Hospital.findByPk(user.hospitalId);
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    // Prepare update data
    const updateData = { ...req.body };
    
    // Hospital admin cannot update code or isActive (admin-only fields)
    delete updateData.code;
    delete updateData.isActive;
    
    // Handle address - merge with existing if provided (partial updates allowed)
    if (updateData.address) {
      const existingAddress = hospital.address || {};
      updateData.address = {
        ...existingAddress,
        ...updateData.address
      };
    }
    
    // Handle contactInfo - merge with existing if provided
    if (updateData.contactInfo) {
      const existingContactInfo = hospital.contactInfo || {};
      updateData.contactInfo = {
        ...existingContactInfo,
        ...updateData.contactInfo
      };
    }
    
    // Update hospital
    await hospital.update(updateData);
    
    // Reload to get updated data
    await hospital.reload();
    
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
    
    // Debug logging
    console.log('[Hospital Admin Jobs] User:', { id: user.id, role: user.role, hospitalId: user.hospitalId });
    
    if (!user.hospitalId) {
      return res.status(400).json({
        error: 'No hospital assigned',
        message: 'You must be assigned to a hospital to view jobs'
      });
    }

    const { page = 1, limit = 50, status, department, search } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause - ensure hospitalId is always included
    const whereConditions = [{ hospitalId: user.hospitalId }];
    
    // Add status filter
    if (status) {
      whereConditions.push({ status });
    }
    
    // Add department filter
    if (department) {
      whereConditions.push({ department });
    }
    
    // Add search functionality
    if (search) {
      whereConditions.push({
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { department: { [Op.like]: `%${search}%` } },
          { location: { [Op.like]: `%${search}%` } }
        ]
      });
    }

    // Build final where clause
    const where = whereConditions.length === 1 
      ? whereConditions[0]  // Just hospitalId
      : { [Op.and]: whereConditions };  // Multiple conditions

    console.log('[Hospital Admin Jobs] Query params:', { page, limit, status, department, search, hospitalId: user.hospitalId });
    console.log('[Hospital Admin Jobs] Where clause:', JSON.stringify(where, null, 2));

    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false  // LEFT JOIN - allow jobs without creator
        },
        {
          model: JobAssignment,
          as: 'assignments',
          attributes: ['id', 'userId', 'status', [Job.sequelize.literal('`assignments`.`created_at`'), 'assignedAt']],
          required: false,  // LEFT JOIN - allow jobs without assignments
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false  // LEFT JOIN - allow assignments without user
          }]
        }
      ]
    });

    console.log('[Hospital Admin Jobs] Found jobs:', count, 'rows:', jobs.length);

    // Transform jobs to include assignment status breakdown (similar to HR endpoint)
    const transformedJobs = jobs.map(job => {
      const jobData = job.toJSON();
      
      // Ensure assignments is an array (handle null/undefined)
      const assignments = jobData.assignments || [];
      
      // Count assignments by status
      const assignmentsByStatus = {
        PENDING: assignments.filter(a => a && a.status === 'PENDING').length,
        ACCEPTED: assignments.filter(a => a && a.status === 'ACCEPTED').length,
        ASSIGNED: assignments.filter(a => a && a.status === 'ASSIGNED').length,
        IN_PROGRESS: assignments.filter(a => a && a.status === 'IN_PROGRESS').length,
        COMPLETED: assignments.filter(a => a && a.status === 'COMPLETED').length,
        REJECTED: assignments.filter(a => a && a.status === 'REJECTED').length,
        CANCELLED: assignments.filter(a => a && a.status === 'CANCELLED').length
      };
      
      const currentAssignments = assignments.filter(assignment => 
        assignment && ['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'].includes(assignment.status)
      ).length;
      
      return {
        ...jobData,
        assignments, // Ensure assignments is always an array
        currentAssignments,
        assignmentStatus: assignmentsByStatus
      };
    });

    const response = {
      jobs: transformedJobs,
      data: transformedJobs, // Alias for frontend compatibility
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
        totalPages: Math.ceil(count / limit) // Alias for frontend compatibility
      }
    };

    console.log('[Hospital Admin Jobs] Response:', {
      jobsCount: transformedJobs.length,
      totalCount: count,
      pagination: response.pagination
    });

    res.json(response);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      error: 'Failed to fetch jobs',
      message: error.message
    });
  }
});

module.exports = router;

