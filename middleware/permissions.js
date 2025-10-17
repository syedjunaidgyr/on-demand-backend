const { Permission, HospitalPermission, UnitPermission, StaffPermission, PermissionMaster } = require('../models');
const { Op } = require('sequelize');

/**
 * Check if user has a specific permission
 * @param {string} permissionCode - The permission code to check
 * @param {string} resource - The resource being accessed (optional)
 * @param {number} hospitalId - Hospital ID for hospital-specific permissions (optional)
 * @param {string} unitCode - Unit code for unit-specific permissions (optional)
 */
const hasPermission = async (userId, permissionCode, resource = null, hospitalId = null, unitCode = null) => {
  try {
    // Get the permission details
    const permission = await Permission.findOne({
      where: { code: permissionCode, isActive: true }
    });

    if (!permission) {
      return false;
    }

    // Check if user has global permission (ADMIN role or global scope)
    const globalPermission = await StaffPermission.findOne({
      where: {
        userId,
        permissionId: permission.id,
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });

    if (globalPermission) {
      return true;
    }

    // Check hospital-specific permission
    if (hospitalId) {
      const hospitalPermission = await HospitalPermission.findOne({
        where: {
          userId,
          hospitalId,
          permissionId: permission.id,
          isActive: true,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } }
          ]
        }
      });

      if (hospitalPermission) {
        return true;
      }
    }

    // Check unit-specific permission
    if (hospitalId && unitCode) {
      const unitPermission = await UnitPermission.findOne({
        where: {
          userId,
          hospitalId,
          unitCode,
          permissionId: permission.id,
          isActive: true,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } }
          ]
        }
      });

      if (unitPermission) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Check if user has any of the specified permissions
 * @param {Array} permissionCodes - Array of permission codes to check
 * @param {string} resource - The resource being accessed (optional)
 * @param {number} hospitalId - Hospital ID for hospital-specific permissions (optional)
 * @param {string} unitCode - Unit code for unit-specific permissions (optional)
 */
const hasAnyPermission = async (userId, permissionCodes, resource = null, hospitalId = null, unitCode = null) => {
  for (const permissionCode of permissionCodes) {
    if (await hasPermission(userId, permissionCode, resource, hospitalId, unitCode)) {
      return true;
    }
  }
  return false;
};

/**
 * Check if user has all of the specified permissions
 * @param {Array} permissionCodes - Array of permission codes to check
 * @param {string} resource - The resource being accessed (optional)
 * @param {number} hospitalId - Hospital ID for hospital-specific permissions (optional)
 * @param {string} unitCode - Unit code for unit-specific permissions (optional)
 */
const hasAllPermissions = async (userId, permissionCodes, resource = null, hospitalId = null, unitCode = null) => {
  for (const permissionCode of permissionCodes) {
    if (!(await hasPermission(userId, permissionCode, resource, hospitalId, unitCode))) {
      return false;
    }
  }
  return true;
};

/**
 * Get all permissions for a user
 * @param {number} userId - User ID
 * @param {number} hospitalId - Hospital ID (optional)
 * @param {string} unitCode - Unit code (optional)
 */
const getUserPermissions = async (userId, hospitalId = null, unitCode = null) => {
  try {
    const permissions = {
      global: [],
      hospital: [],
      unit: []
    };

    // Get global permissions
    const globalPermissions = await StaffPermission.findAll({
      where: {
        userId,
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      include: [{
        model: Permission,
        as: 'permission',
        where: { isActive: true }
      }]
    });

    permissions.global = globalPermissions.map(p => p.permission);

    // Get hospital-specific permissions
    if (hospitalId) {
      const hospitalPermissions = await HospitalPermission.findAll({
        where: {
          userId,
          hospitalId,
          isActive: true,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } }
          ]
        },
        include: [{
          model: Permission,
          as: 'permission',
          where: { isActive: true }
        }]
      });

      permissions.hospital = hospitalPermissions.map(p => p.permission);
    }

    // Get unit-specific permissions
    if (hospitalId && unitCode) {
      const unitPermissions = await UnitPermission.findAll({
        where: {
          userId,
          hospitalId,
          unitCode,
          isActive: true,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } }
          ]
        },
        include: [{
          model: Permission,
          as: 'permission',
          where: { isActive: true }
        }]
      });

      permissions.unit = unitPermissions.map(p => p.permission);
    }

    return permissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return { global: [], hospital: [], unit: [] };
  }
};

/**
 * Middleware to check permission
 * @param {string} permissionCode - Permission code to check
 * @param {Object} options - Options for permission check
 */
const checkPermission = (permissionCode, options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.userId) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'Authentication required'
        });
      }

      const { resource = null, hospitalId = null, unitCode = null, requireAll = false } = options;

      // Extract hospitalId and unitCode from request if not provided
      const finalHospitalId = hospitalId || req.params.hospitalId || req.body.hospitalId || req.user.hospitalId;
      const finalUnitCode = unitCode || req.params.unitCode || req.body.unitCode || req.user.unitCode;

      let hasAccess = false;

      if (Array.isArray(permissionCode)) {
        if (requireAll) {
          hasAccess = await hasAllPermissions(req.userId, permissionCode, resource, finalHospitalId, finalUnitCode);
        } else {
          hasAccess = await hasAnyPermission(req.userId, permissionCode, resource, finalHospitalId, finalUnitCode);
        }
      } else {
        hasAccess = await hasPermission(req.userId, permissionCode, resource, finalHospitalId, finalUnitCode);
      }

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          message: `Insufficient permissions. Required: ${Array.isArray(permissionCode) ? permissionCode.join(' or ') : permissionCode}`,
          requiredPermission: permissionCode,
          resource,
          hospitalId: finalHospitalId,
          unitCode: finalUnitCode
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        error: 'Permission check failed',
        message: error.message
      });
    }
  };
};

/**
 * Middleware to check if user can access a specific resource
 * @param {string} resource - Resource type (users, jobs, hospitals, etc.)
 * @param {string} action - Action (CREATE, READ, UPDATE, DELETE)
 */
const checkResourceAccess = (resource, action) => {
  return checkPermission(`${resource.toUpperCase()}_${action.toUpperCase()}`);
};

/**
 * Grant permission to a user
 * @param {number} userId - User ID
 * @param {string} permissionCode - Permission code
 * @param {number} grantedBy - User ID who is granting the permission
 * @param {Object} options - Additional options
 */
const grantPermission = async (userId, permissionCode, grantedBy, options = {}) => {
  try {
    const { hospitalId = null, unitCode = null, expiresAt = null, notes = null } = options;

    const permission = await Permission.findOne({
      where: { code: permissionCode, isActive: true }
    });

    if (!permission) {
      throw new Error(`Permission ${permissionCode} not found`);
    }

    let permissionRecord;

    if (hospitalId && unitCode) {
      // Grant unit-specific permission
      permissionRecord = await UnitPermission.create({
        userId,
        hospitalId,
        unitCode,
        permissionId: permission.id,
        grantedBy,
        expiresAt,
        notes
      });
    } else if (hospitalId) {
      // Grant hospital-specific permission
      permissionRecord = await HospitalPermission.create({
        userId,
        hospitalId,
        permissionId: permission.id,
        grantedBy,
        expiresAt,
        notes
      });
    } else {
      // Grant global permission
      permissionRecord = await StaffPermission.create({
        userId,
        permissionId: permission.id,
        grantedBy,
        expiresAt,
        notes
      });
    }

    return permissionRecord;
  } catch (error) {
    console.error('Error granting permission:', error);
    throw error;
  }
};

/**
 * Revoke permission from a user
 * @param {number} userId - User ID
 * @param {string} permissionCode - Permission code
 * @param {Object} options - Additional options
 */
const revokePermission = async (userId, permissionCode, options = {}) => {
  try {
    const { hospitalId = null, unitCode = null } = options;

    const permission = await Permission.findOne({
      where: { code: permissionCode, isActive: true }
    });

    if (!permission) {
      throw new Error(`Permission ${permissionCode} not found`);
    }

    let whereClause = {
      userId,
      permissionId: permission.id
    };

    if (hospitalId && unitCode) {
      whereClause.hospitalId = hospitalId;
      whereClause.unitCode = unitCode;
      await UnitPermission.update({ isActive: false }, { where: whereClause });
    } else if (hospitalId) {
      whereClause.hospitalId = hospitalId;
      await HospitalPermission.update({ isActive: false }, { where: whereClause });
    } else {
      await StaffPermission.update({ isActive: false }, { where: whereClause });
    }

    return true;
  } catch (error) {
    console.error('Error revoking permission:', error);
    throw error;
  }
};

module.exports = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  checkPermission,
  checkResourceAccess,
  grantPermission,
  revokePermission
};
