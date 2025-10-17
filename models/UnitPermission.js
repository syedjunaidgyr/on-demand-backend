const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UnitPermission = sequelize.define('UnitPermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  hospitalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'hospitals',
      key: 'id'
    }
  },
  unitCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Unit code within the hospital (e.g., ICU, ER, SURGERY)'
  },
  permissionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'permissions',
      key: 'id'
    }
  },
  grantedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  grantedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Optional expiration date for the permission'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about this permission grant'
  }
}, {
  tableName: 'unit_permissions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'hospital_id', 'unit_code', 'permission_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['hospital_id', 'unit_code']
    },
    {
      fields: ['permission_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['expires_at']
    }
  ]
});

module.exports = UnitPermission;
