const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AssignmentSegment = sequelize.define('AssignmentSegment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  jobAssignmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'job_assignments',
      key: 'id'
    }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'assignment_segments'
});

module.exports = AssignmentSegment;


