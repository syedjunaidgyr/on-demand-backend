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
    type: DataTypes.ENUM('HR', 'DOCTOR', 'NURSE', 'ADMIN', 'AGENCY', 'HOSPITAL_ADMIN'),
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
  },
  selectedThemeId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'User selected theme ID. If null, user will use hospital default theme.'
  }
}, {
  tableName: 'users',
  validate: {
    doctorNurseHrMustHaveUnit() {
      // DOCTOR, NURSE, HR must have both hospitalId and unitCode
      if (['DOCTOR', 'NURSE', 'HR'].includes(this.role)) {
        if (!this.hospitalId) {
          throw new Error(`${this.role} must be assigned to a hospital`);
        }
        if (!this.unitCode) {
          throw new Error(`${this.role} must be assigned to a unit`);
        }
      }
      
      // HOSPITAL_ADMIN must have hospitalId but NOT unitCode
      if (this.role === 'HOSPITAL_ADMIN') {
        if (!this.hospitalId) {
          throw new Error('HOSPITAL_ADMIN must be assigned to a hospital');
        }
        if (this.unitCode) {
          throw new Error('HOSPITAL_ADMIN should not be assigned to a specific unit');
        }
      }
      
      // ADMIN should not have hospitalId or unitCode
      if (this.role === 'ADMIN') {
        if (this.hospitalId) {
          throw new Error('ADMIN should not be assigned to a hospital (they have system-wide access)');
        }
        if (this.unitCode) {
          throw new Error('ADMIN should not be assigned to a unit (they have system-wide access)');
        }
      }
      
      // AGENCY should NOT have hospitalId (onboarded via AgencyHospital table)
      if (this.role === 'AGENCY') {
        if (this.hospitalId) {
          throw new Error('AGENCY should not have a direct hospital assignment (use AgencyHospital table for onboarding)');
        }
        if (this.unitCode) {
          throw new Error('AGENCY should not be assigned to a specific unit');
        }
      }
    }
  },
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

// Instance method to get effective theme (combines user selection with hospital default)
User.prototype.getEffectiveTheme = async function() {
  // If user has no hospital, return null
  if (!this.hospitalId) {
    return null;
  }
  
  // Get hospital with themes (avoid circular dependency by using sequelize)
  const { sequelize } = require('../config/database');
  const { QueryTypes } = require('sequelize');
  
  const [hospitalData] = await sequelize.query(`
    SELECT themes, defaultThemeId 
    FROM hospitals 
    WHERE id = :hospitalId
  `, {
    replacements: { hospitalId: this.hospitalId },
    type: QueryTypes.SELECT
  });
  
  if (!hospitalData) {
    return null;
  }
  
  const themes = hospitalData.themes || [];
  
  // If user has selected a theme, try to use it
  if (this.selectedThemeId) {
    const userTheme = themes.find(theme => theme.id === this.selectedThemeId);
    if (userTheme) {
      return userTheme;
    }
  }
  
  // Otherwise, use hospital default
  if (hospitalData.defaultThemeId) {
    const defaultTheme = themes.find(theme => theme.id === hospitalData.defaultThemeId);
    if (defaultTheme) {
      return defaultTheme;
    }
  }
  
  // Fallback to first theme
  return themes.length > 0 ? themes[0] : null;
};

module.exports = User;
