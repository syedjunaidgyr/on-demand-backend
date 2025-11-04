const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AssignmentActivity = sequelize.define('AssignmentActivity', {
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
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  activityTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'assignment_activities',
  indexes: [
    { fields: ['job_assignment_id'] },
    { fields: ['user_id'] },
    { fields: ['activity_time'] },
    { fields: ['job_assignment_id', 'activity_time'] }
  ]
});

module.exports = AssignmentActivity;

