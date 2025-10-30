const { Hospital, User } = require('../models');

/**
 * Validate hex color format
 * @param {string} color - Hex color string (e.g., #2563eb)
 * @returns {boolean} - True if valid
 */
function isValidHexColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate a theme object
 * @param {Object} theme - Theme object
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateTheme(theme) {
  if (!theme.id || typeof theme.id !== 'string') {
    return { valid: false, error: 'Theme must have an id (string)' };
  }
  if (!theme.name || typeof theme.name !== 'string') {
    return { valid: false, error: 'Theme must have a name (string)' };
  }
  
  const requiredColors = ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'accentTextColor'];
  for (const colorField of requiredColors) {
    if (!theme[colorField] || typeof theme[colorField] !== 'string') {
      return { valid: false, error: `Theme must have ${colorField} (string)` };
    }
    if (!isValidHexColor(theme[colorField])) {
      return { valid: false, error: `${colorField} must be a valid hex color (e.g., #2563eb)` };
    }
  }
  
  return { valid: true, error: null };
}

/**
 * Get effective theme for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} - Effective theme object or null
 */
async function getUserEffectiveTheme(userId) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'selectedThemeId', 'hospitalId']
  });
  
  if (!user || !user.hospitalId) {
    return null;
  }
  
  return await user.getEffectiveTheme();
}

/**
 * Check if a theme ID exists in hospital themes
 * @param {number} hospitalId - Hospital ID
 * @param {string} themeId - Theme ID
 * @returns {Promise<boolean>} - True if theme exists
 */
async function themeExists(hospitalId, themeId) {
  const hospital = await Hospital.findByPk(hospitalId, {
    attributes: ['id', 'themes']
  });
  
  if (!hospital) {
    return false;
  }
  
  const theme = hospital.getThemeById(themeId);
  return theme !== null;
}

/**
 * Generate a unique theme ID
 * @param {Array} existingThemes - Array of existing themes
 * @returns {string} - Unique theme ID
 */
function generateUniqueThemeId(existingThemes) {
  if (!existingThemes || existingThemes.length === 0) {
    return 'theme_1';
  }
  
  const ids = existingThemes.map(t => t.id);
  let counter = 1;
  let newId;
  
  do {
    newId = `theme_${counter}`;
    counter++;
  } while (ids.includes(newId));
  
  return newId;
}

module.exports = {
  isValidHexColor,
  validateTheme,
  getUserEffectiveTheme,
  themeExists,
  generateUniqueThemeId
};

