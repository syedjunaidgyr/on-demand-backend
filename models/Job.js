const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [5, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  requiredRole: {
    type: DataTypes.ENUM('DOCTOR', 'NURSE', 'AGENCY'),
    allowNull: false
  },
  specialization: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'ACTIVE'
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
    defaultValue: 'MEDIUM'
  },
  maxAssignments: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  requirements: {
    type: DataTypes.JSON,
    allowNull: true
  },
  benefits: {
    type: DataTypes.JSON,
    allowNull: true
  },
  createdBy: {
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
  facilityName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  facilityAddress: {
    type: DataTypes.JSON,
    allowNull: false
  },
  contactPerson: {
    type: DataTypes.JSON,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recurringPattern: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'jobs',
  validate: {
    endDateAfterStartDate() {
      if (this.endDate < this.startDate) {
        throw new Error('End date must be after or equal to start date');
      }
    },
    endTimeAfterStartTime() {
      // If end date is same as start date, end time must be after start time
      if (this.endDate.getTime() === this.startDate.getTime() && this.endTime <= this.startTime) {
        throw new Error('End time must be after start time when on the same date');
      }
    }
  }
});

// Instance methods
Job.prototype.isActive = function() {
  return this.status === 'ACTIVE';
};

Job.prototype.isAssigned = function() {
  return this.status === 'ASSIGNED';
};

Job.prototype.isCompleted = function() {
  return this.status === 'COMPLETED';
};

Job.prototype.isCancelled = function() {
  return this.status === 'CANCELLED';
};

Job.prototype.getDuration = function() {
  const start = new Date(`${this.startDate.toDateString()} ${this.startTime}`);
  const end = new Date(`${this.endDate.toDateString()} ${this.endTime}`);
  return Math.ceil((end - start) / (1000 * 60 * 60)); // hours
};

module.exports = Job;
