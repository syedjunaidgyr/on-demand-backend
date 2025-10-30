const { Hospital } = require('../models');

/**
 * Middleware to enforce hospital-level access control
 * HOSPITAL_ADMIN can only access their assigned hospital
 * ADMIN can access all hospitals
 */
const ensureHospitalAccess = async (req, res, next) => {
  try {
    const user = req.user;
    const hospitalId = req.params.id || req.params.hospitalId;
    
    // Skip if no hospitalId in params
    if (!hospitalId) {
      return next();
    }
    
    // Verify hospital exists and is accessible
    const hospital = await Hospital.findByPk(hospitalId, {
      attributes: ['id', 'name', 'isActive']
    });
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    // HOSPITAL_ADMIN can only access their assigned hospital
    if (user.role === 'HOSPITAL_ADMIN') {
      if (!user.hospitalId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You must be assigned to a hospital'
        });
      }
      
      const parsedHospitalId = parseInt(hospitalId);
      
      if (user.hospitalId !== parsedHospitalId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your assigned hospital'
        });
      }
    }
    
    req.hospital = hospital;
    next();
  } catch (error) {
    console.error('Hospital access check error:', error);
    return res.status(500).json({
      error: 'Access check failed',
      message: error.message
    });
  }
};

/**
 * Middleware to get hospital admin's hospital context
 * Automatically filters all operations to hospital admin's hospital
 */
const getHospitalContext = (req, res, next) => {
  try {
    const user = req.user;
    
    // If HOSPITAL_ADMIN, attach their hospitalId to request
    if (user.role === 'HOSPITAL_ADMIN' && user.hospitalId) {
      req.hospitalAdminId = user.hospitalId;
    }
    
    next();
  } catch (error) {
    console.error('Hospital context error:', error);
    next();
  }
};

module.exports = {
  ensureHospitalAccess,
  getHospitalContext
};

