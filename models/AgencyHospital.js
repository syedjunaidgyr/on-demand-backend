const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AgencyHospital = sequelize.define('AgencyHospital', {
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
  hospitalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'hospitals',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REVOKED'),
    defaultValue: 'APPROVED'
  },
  onboardedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  onboardedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'agency_hospitals',
  indexes: [
    { unique: true, fields: ['agencyId', 'hospitalId'] }
  ]
});

module.exports = AgencyHospital;


