const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Unit = sequelize.define('Unit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  unitName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'units',
  indexes: [
    // Use actual DB column names (snake_case) for indexes
    { unique: true, fields: ['hospital_id', 'unit_code'] },
    { fields: ['hospital_id'] },
    { fields: ['unit_code'] },
    { fields: ['is_active'] }
  ]
});

module.exports = Unit;


