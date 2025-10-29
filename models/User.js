const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[\+]?[1-9][\d]{0,15}$/
    }
  },
  role: {
    type: DataTypes.ENUM('HR', 'DOCTOR', 'NURSE', 'ADMIN', 'AGENCY'),
    allowNull: false,
    defaultValue: 'DOCTOR'
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  hospitalId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'hospitals',
      key: 'id'
    }
  },
  unitCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Unit code within the hospital (e.g., ICU, ER, SURGERY)'
  },
  preferredHospitals: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of hospital IDs where user can work (for temp staff)',
    validate: {
      isValidPreferredHospitals(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Preferred hospitals must be an array');
        }
      }
    }
  },
  specialization: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  licenseNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  profileImage: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  emergencyContact: {
    type: DataTypes.JSON,
    allowNull: true
  },
  address: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      // Only hash password if it's being changed and is a plain text password
      if (user.changed('password') && user.password) {
        // Check if it's already hashed (bcrypt hashes start with $2a$ or $2b$)
        if (!user.password.startsWith('$2')) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      }
    }
  }
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = User;
