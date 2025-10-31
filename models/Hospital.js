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
  },
  themes: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [
      {
        id: 'default',
        name: 'Professional Blue',
        primaryColor: '#2563eb',
        secondaryColor: '#3b82f6',
        backgroundColor: '#f8fafc',
        textColor: '#1e293b',
        accentTextColor: '#ffffff'
      }
    ],
    validate: {
      isValidThemes(value) {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('Themes must be a non-empty array');
        }
        
        // Validate each theme object
        for (const theme of value) {
          if (!theme.id || typeof theme.id !== 'string') {
            throw new Error('Each theme must have an id (string)');
          }
          if (!theme.name || typeof theme.name !== 'string') {
            throw new Error('Each theme must have a name (string)');
          }
          
          // Validate color fields
          const requiredColors = ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'accentTextColor'];
          for (const colorField of requiredColors) {
            if (!theme[colorField] || typeof theme[colorField] !== 'string') {
              throw new Error(`Each theme must have ${colorField} (string)`);
            }
            // Validate hex color format
            if (!/^#[0-9A-Fa-f]{6}$/.test(theme[colorField])) {
              throw new Error(`${colorField} must be a valid hex color (e.g., #2563eb)`);
            }
          }
        }
        
        // Check for duplicate IDs
        const ids = value.map(t => t.id);
        if (new Set(ids).size !== ids.length) {
          throw new Error('Theme IDs must be unique');
        }
      }
    }
  },
  defaultThemeId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'ID of the default theme. Users without personal theme selection will use this.'
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

// Instance method to get a specific theme by ID
Hospital.prototype.getThemeById = function(themeId) {
  if (!this.themes || !Array.isArray(this.themes)) {
    return null;
  }
  return this.themes.find(theme => theme.id === themeId) || null;
};

// Instance method to get the default theme
Hospital.prototype.getDefaultTheme = function() {
  if (!this.defaultThemeId) {
    // If no default set, return first theme
    return (this.themes && this.themes.length > 0) ? this.themes[0] : null;
  }
  return this.getThemeById(this.defaultThemeId);
};

module.exports = Hospital;
