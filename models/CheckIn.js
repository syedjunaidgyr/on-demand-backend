const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CheckIn = sequelize.define('CheckIn', {
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
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  checkOutTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkInLocation: {
    type: DataTypes.JSON,
    allowNull: true
  },
  checkOutLocation: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('CHECKED_IN', 'CHECKED_OUT', 'BREAK_START', 'BREAK_END'),
    defaultValue: 'CHECKED_IN'
  },
  breakStartTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  breakEndTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalBreakTime: {
    type: DataTypes.INTEGER, // in minutes
    defaultValue: 0
  },
  totalWorkTime: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isLate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lateMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isEarlyCheckout: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  earlyCheckoutMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  approvalStatus: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    allowNull: false,
    defaultValue: 'PENDING',
    field: 'approval_status'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  supervisorApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  supervisorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  supervisorNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'check_ins'
});

// Instance methods
CheckIn.prototype.isCheckedIn = function() {
  return this.status === 'CHECKED_IN';
};

CheckIn.prototype.isCheckedOut = function() {
  return this.status === 'CHECKED_OUT';
};

CheckIn.prototype.calculateTotalWorkTime = function() {
  if (this.checkInTime && this.checkOutTime) {
    const start = new Date(this.checkInTime);
    const end = new Date(this.checkOutTime);
    const totalMinutes = (end - start) / (1000 * 60);
    this.totalWorkTime = Math.round(totalMinutes - this.totalBreakTime);
    return this.totalWorkTime;
  }
  return 0;
};

CheckIn.prototype.calculateBreakTime = function() {
  if (this.breakStartTime && this.breakEndTime) {
    const start = new Date(this.breakStartTime);
    const end = new Date(this.breakEndTime);
    const breakMinutes = (end - start) / (1000 * 60);
    this.totalBreakTime = Math.round(breakMinutes);
    return this.totalBreakTime;
  }
  return 0;
};

CheckIn.prototype.checkIfLate = function(expectedStartTime) {
  if (this.checkInTime && expectedStartTime) {
    const checkIn = new Date(this.checkInTime);
    const expected = new Date(expectedStartTime);
    if (checkIn > expected) {
      this.isLate = true;
      this.lateMinutes = Math.round((checkIn - expected) / (1000 * 60));
      return true;
    }
  }
  return false;
};

CheckIn.prototype.checkIfEarlyCheckout = function(expectedEndTime) {
  if (this.checkOutTime && expectedEndTime) {
    const checkOut = new Date(this.checkOutTime);
    const expected = new Date(expectedEndTime);
    if (checkOut < expected) {
      this.isEarlyCheckout = true;
      this.earlyCheckoutMinutes = Math.round((expected - checkOut) / (1000 * 60));
      return true;
    }
  }
  return false;
};

module.exports = CheckIn;
