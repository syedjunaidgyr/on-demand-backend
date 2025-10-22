const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JobAssignment = sequelize.define('JobAssignment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'jobs',
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
  status: {
    type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'ASSIGNED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'PENDING'
  },
  assignedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  actualStartTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualEndTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  totalPayment: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isDirectAssignment: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  requestForExtension: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  extensionRequestReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'job_assignments'
});

// Instance methods
JobAssignment.prototype.isPending = function() {
  return this.status === 'PENDING';
};

JobAssignment.prototype.isAccepted = function() {
  return this.status === 'ACCEPTED';
};

JobAssignment.prototype.isAssigned = function() {
  return this.status === 'ASSIGNED';
};

JobAssignment.prototype.isInProgress = function() {
  return this.status === 'IN_PROGRESS';
};

JobAssignment.prototype.isCompleted = function() {
  return this.status === 'COMPLETED';
};

JobAssignment.prototype.isCancelled = function() {
  return this.status === 'CANCELLED';
};

JobAssignment.prototype.calculateTotalHours = function() {
  if (this.actualStartTime && this.actualEndTime) {
    const start = new Date(this.actualStartTime);
    const end = new Date(this.actualEndTime);
    const hours = (end - start) / (1000 * 60 * 60);
    this.totalHours = Math.round(hours * 100) / 100; // Round to 2 decimal places
    return this.totalHours;
  }
  return 0;
};

JobAssignment.prototype.calculatePayment = function() {
  if (this.totalHours && this.hourlyRate) {
    this.totalPayment = this.totalHours * this.hourlyRate;
    return this.totalPayment;
  }
  return 0;
};

module.exports = JobAssignment;
