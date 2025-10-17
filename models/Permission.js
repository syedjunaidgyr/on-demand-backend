const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
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
  category: {
    type: DataTypes.ENUM('USER_MANAGEMENT', 'JOB_MANAGEMENT', 'ASSIGNMENT_MANAGEMENT', 'REPORT_MANAGEMENT', 'HOSPITAL_MANAGEMENT', 'PERMISSION_MANAGEMENT', 'SYSTEM_MANAGEMENT'),
    allowNull: false
  },
  resource: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Resource this permission applies to (e.g., users, jobs, hospitals)'
  },
  action: {
    type: DataTypes.ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'ASSIGN', 'APPROVE', 'REJECT', 'EXPORT', 'IMPORT'),
    allowNull: false,
    comment: 'Action this permission allows'
  },
  scope: {
    type: DataTypes.ENUM('GLOBAL', 'HOSPITAL', 'UNIT', 'PERSONAL'),
    allowNull: false,
    defaultValue: 'PERSONAL',
    comment: 'Scope of the permission'
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
  tableName: 'permissions',
  timestamps: true,
  indexes: [
    {
      fields: ['code']
    },
    {
      fields: ['category']
    },
    {
      fields: ['resource', 'action']
    },
    {
      fields: ['scope']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = Permission;
