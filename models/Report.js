const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM(
      'JOB_POSTINGS',
      'JOB_ASSIGNMENTS',
      'STAFF_PERFORMANCE',
      'FINANCIAL',
      'ATTENDANCE',
      'UTILIZATION',
      'CUSTOM'
    ),
    allowNull: false
  },
  generatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  parameters: {
    type: DataTypes.JSON,
    allowNull: true
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  summary: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('GENERATING', 'COMPLETED', 'FAILED'),
    defaultValue: 'GENERATING'
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  fileFormat: {
    type: DataTypes.ENUM('JSON', 'CSV', 'PDF', 'EXCEL'),
    defaultValue: 'JSON'
  },
  generatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isScheduled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  schedulePattern: {
    type: DataTypes.JSON,
    allowNull: true
  },
  lastGenerated: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextGeneration: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'reports'
});

// Instance methods
Report.prototype.isCompleted = function() {
  return this.status === 'COMPLETED';
};

Report.prototype.isGenerating = function() {
  return this.status === 'GENERATING';
};

Report.prototype.isFailed = function() {
  return this.status === 'FAILED';
};

Report.prototype.isExpired = function() {
  if (this.expiresAt) {
    return new Date() > this.expiresAt;
  }
  return false;
};

Report.prototype.getFileExtension = function() {
  const extensions = {
    'JSON': '.json',
    'CSV': '.csv',
    'PDF': '.pdf',
    'EXCEL': '.xlsx'
  };
  return extensions[this.fileFormat] || '.json';
};

module.exports = Report;
