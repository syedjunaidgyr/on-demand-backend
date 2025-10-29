const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Hospital = sequelize.define('Hospital', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 20]
    }
  },
  address: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      isValidAddress(value) {
        if (!value || typeof value !== 'object') {
          throw new Error('Address must be a valid object');
        }
        const required = ['street', 'city', 'state', 'zipCode', 'country'];
        for (const field of required) {
          if (!value[field] || typeof value[field] !== 'string') {
            throw new Error(`Address ${field} is required and must be a string`);
          }
        }
      }
    }
  },
  contactInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    validate: {
      isValidContactInfo(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Contact info must be a valid object');
        }
      }
    }
  },
  units: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    validate: {
      isValidUnits(value) {
        if (!Array.isArray(value)) {
          throw new Error('Units must be an array');
        }
        for (const unit of value) {
          if (!unit.name || !unit.code) {
            throw new Error('Each unit must have name and code');
          }
        }
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Path to hospital logo image file'
  }
}, {
  tableName: 'hospitals',
  timestamps: true,
  indexes: [
    {
      fields: ['code']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['name']
    }
  ]
});

module.exports = Hospital;
