const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AgencyNurse = sequelize.define('AgencyNurse', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  agencyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  nurseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REVOKED'),
    defaultValue: 'APPROVED'
  },
  addedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'agency_nurses',
  indexes: [
    { unique: true, fields: [{ name: 'agency_id' }, { name: 'nurse_id' }] }
  ]
});

module.exports = AgencyNurse;


