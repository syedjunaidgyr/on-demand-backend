const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { 
  User, 
  Permission, 
  HospitalPermission, 
  UnitPermission, 
  StaffPermission, 
  PermissionMaster,
  Hospital 
} = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { checkPermission, getUserPermissions, grantPermission, revokePermission } = require('../middleware/permissions');
const { validate, schemas } = require('../middleware/validation');
const { sendNotifications } = require('../utils/notifications');

// @route   GET /api/v1/permissions
// @desc    Get all permissions (Admin only)
// @access  Private (ADMIN)
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 50, category, resource, action, scope } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { isActive: true };
    if (category) whereClause.category = category;
    if (resource) whereClause.resource = resource;
    if (action) whereClause.action = action;
    if (scope) whereClause.scope = scope;

    const { count, rows: permissions } = await Permission.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['category', 'ASC'], ['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      permissions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// @route   POST /api/v1/permissions
// @desc    Create a new permission (Admin only)
// @access  Private (ADMIN)
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, code, description, category, resource, action, scope } = req.body;

    // Check if permission code already exists
    const existingPermission = await Permission.findOne({
      where: { code }
    });

    if (existingPermission) {
      return res.status(400).json({
        error: 'Permission already exists',
        message: `Permission with code '${code}' already exists`
      });
    }

    const permission = await Permission.create({
      name,
      code,
      description,
      category,
      resource,
      action,
      scope,
      createdBy: req.userId
    });

    res.status(201).json({
      message: 'Permission created successfully',
      permission
    });
  } catch (error) {
    console.error('Error creating permission:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// @route   GET /api/v1/permissions/masters
// @desc    Get all permission masters (Admin only)
// @access  Private (ADMIN)
router.get('/masters', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { isActive: true };
    if (role) whereClause.role = role;

    const { count, rows: masters } = await PermissionMaster.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['role', 'ASC'], ['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      masters,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching permission masters:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// @route   POST /api/v1/permissions/masters
// @desc    Create a new permission master (Admin only)
// @access  Private (ADMIN)
router.post('/masters', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, code, description, role, permissions, hospitalPermissions, unitPermissions, isDefault } = req.body;

    // Check if master code already exists
    const existingMaster = await PermissionMaster.findOne({
      where: { code }
    });

    if (existingMaster) {
      return res.status(400).json({
        error: 'Permission master already exists',
        message: `Permission master with code '${code}' already exists`
      });
    }

    // If this is set as default, unset other defaults for the same role
    if (isDefault) {
      await PermissionMaster.update(
        { isDefault: false },
        { where: { role, isDefault: true } }
      );
    }

    const master = await PermissionMaster.create({
      name,
      code,
      description,
      role,
      permissions,
      hospitalPermissions,
      unitPermissions,
      isDefault,
      createdBy: req.userId
    });

    res.status(201).json({
      message: 'Permission master created successfully',
      master
    });
  } catch (error) {
    console.error('Error creating permission master:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// @route   GET /api/v1/permissions/users/:userId
// @desc    Get permissions for a specific user
// @access  Private (ADMIN, HR)
router.get('/users/:userId', authenticate, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { hospitalId, unitCode } = req.query;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'hospitalId', 'unitCode']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permissions = await getUserPermissions(userId, hospitalId, unitCode);

    // Get permission masters for the user's role
    const roleMasters = await PermissionMaster.findAll({
      where: { role: user.role, isActive: true },
      order: [['isDefault', 'DESC'], ['name', 'ASC']]
    });

    res.status(200).json({
      user,
      permissions,
      roleMasters
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// @route   POST /api/v1/permissions/users/:userId/grant
// @desc    Grant permission to a user
// @access  Private (ADMIN, HR)
router.post('/users/:userId/grant', authenticate, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissionCode, hospitalId, unitCode, expiresAt, notes } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permissionRecord = await grantPermission(userId, permissionCode, req.userId, {
      hospitalId,
      unitCode,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes
    });

    // Notify target user
    try {
      await sendNotifications('PermissionGranted_User', [{
        userId: String(user.id),
        userType: (user.role || '').toLowerCase(),
        placeholders: {
          permissionCode,
          scopeSummary: [req.body.hospitalId ? `hospital:${req.body.hospitalId}` : null, req.body.unitCode ? `unit:${req.body.unitCode}` : null].filter(Boolean).join(', '),
          expiresAt: req.body.expiresAt || ''
        }
      }]);
    } catch (e) {}

    res.status(201).json({
      message: 'Permission granted successfully',
      permission: permissionRecord
    });
  } catch (error) {
    console.error('Error granting permission:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// @route   POST /api/v1/permissions/users/:userId/revoke
// @desc    Revoke permission from a user
// @access  Private (ADMIN, HR)
router.post('/users/:userId/revoke', authenticate, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissionCode, hospitalId, unitCode } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await revokePermission(userId, permissionCode, {
      hospitalId,
      unitCode
    });

    // Notify target user
    try {
      const target = await User.findByPk(userId);
      if (target) {
        await sendNotifications('PermissionRevoked_User', [{
          userId: String(target.id),
          userType: (target.role || '').toLowerCase(),
          placeholders: {
            permissionCode,
            scopeSummary: [hospitalId ? `hospital:${hospitalId}` : null, unitCode ? `unit:${unitCode}` : null].filter(Boolean).join(', ')
          }
        }]);
      }
    } catch (e) {}

    res.status(200).json({
      message: 'Permission revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking permission:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// @route   POST /api/v1/permissions/users/:userId/apply-master
// @desc    Apply a permission master to a user
// @access  Private (ADMIN, HR)
router.post('/users/:userId/apply-master', authenticate, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { masterId, hospitalId, unitCode } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const master = await PermissionMaster.findByPk(masterId);
    if (!master) {
      return res.status(404).json({ error: 'Permission master not found' });
    }

    const grantedPermissions = [];

    // Apply global permissions
    if (master.permissions && master.permissions.length > 0) {
      for (const permissionId of master.permissions) {
        try {
          const permission = await Permission.findByPk(permissionId);
          if (permission) {
            const permissionRecord = await grantPermission(userId, permission.code, req.userId, {
              notes: `Applied from master: ${master.name}`
            });
            grantedPermissions.push(permissionRecord);
          }
        } catch (error) {
          console.warn(`Failed to grant permission ${permissionId}:`, error.message);
        }
      }
    }

    // Apply hospital-specific permissions
    if (hospitalId && master.hospitalPermissions && master.hospitalPermissions.length > 0) {
      for (const permissionId of master.hospitalPermissions) {
        try {
          const permission = await Permission.findByPk(permissionId);
          if (permission) {
            const permissionRecord = await grantPermission(userId, permission.code, req.userId, {
              hospitalId,
              notes: `Applied from master: ${master.name}`
            });
            grantedPermissions.push(permissionRecord);
          }
        } catch (error) {
          console.warn(`Failed to grant hospital permission ${permissionId}:`, error.message);
        }
      }
    }

    // Apply unit-specific permissions
    if (hospitalId && unitCode && master.unitPermissions && master.unitPermissions.length > 0) {
      for (const permissionId of master.unitPermissions) {
        try {
          const permission = await Permission.findByPk(permissionId);
          if (permission) {
            const permissionRecord = await grantPermission(userId, permission.code, req.userId, {
              hospitalId,
              unitCode,
              notes: `Applied from master: ${master.name}`
            });
            grantedPermissions.push(permissionRecord);
          }
        } catch (error) {
          console.warn(`Failed to grant unit permission ${permissionId}:`, error.message);
        }
      }
    }

    // Notify target user
    try {
      const userTarget = await User.findByPk(userId);
      if (userTarget) {
        await sendNotifications('PermissionMasterApplied_User', [{
          userId: String(userTarget.id),
          userType: (userTarget.role || '').toLowerCase(),
          placeholders: { masterName: master.name }
        }]);
      }
    } catch (e) {}

    res.status(200).json({
      message: 'Permission master applied successfully',
      grantedPermissions: grantedPermissions.length,
      master: master.name
    });
  } catch (error) {
    console.error('Error applying permission master:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// @route   GET /api/v1/permissions/hospitals/:hospitalId
// @desc    Get all permissions for a specific hospital
// @access  Private (ADMIN, HR)
router.get('/hospitals/:hospitalId', authenticate, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const hospital = await Hospital.findByPk(hospitalId);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    const { count, rows: permissions } = await HospitalPermission.findAndCountAll({
      where: { hospitalId, isActive: true },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: Permission,
          as: 'permission',
          attributes: ['id', 'name', 'code', 'category', 'resource', 'action']
        },
        {
          model: User,
          as: 'grantedByUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['grantedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      hospital,
      permissions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching hospital permissions:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// @route   GET /api/v1/permissions/my-permissions
// @desc    Get current user's permissions
// @access  Private
router.get('/my-permissions', authenticate, async (req, res) => {
  try {
    const { hospitalId, unitCode } = req.query;

    const permissions = await getUserPermissions(req.userId, hospitalId, unitCode);

    res.status(200).json({
      userId: req.userId,
      permissions
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;
