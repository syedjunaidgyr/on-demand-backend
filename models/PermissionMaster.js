const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PermissionMaster = sequelize.define('PermissionMaster', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [3, 100]
    }
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      is: /^[A-Z_]+$/
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('ADMIN', 'HR', 'DOCTOR', 'NURSE'),
    allowNull: false
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of permission IDs included in this master template',
    validate: {
      isValidPermissions(value) {
        if (!Array.isArray(value)) {
          throw new Error('Permissions must be an array');
        }
      }
    }
  },
  hospitalPermissions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Hospital-specific permissions for this role',
    validate: {
      isValidHospitalPermissions(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Hospital permissions must be an array');
        }
      }
    }
  },
  unitPermissions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Unit-specific permissions for this role',
    validate: {
      isValidUnitPermissions(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Unit permissions must be an array');
        }
      }
    }
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this is the default permission set for the role'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'permission_masters',
  timestamps: true,
  indexes: [
    {
      fields: ['code']
    },
    {
      fields: ['role']
    },
    {
      fields: ['is_default']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = PermissionMaster;
