const express = require('express');
const { Hospital, Unit } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply authentication and ADMIN authorization to all routes
router.use(authenticate);
router.use(authorize('ADMIN'));

// Hospital CRUD operations

// Create new hospital
router.post('/hospitals', validate(schemas.hospitalCreation), async (req, res) => {
  try {
    const hospital = await Hospital.create(req.body);
    res.status(201).json({
      message: 'Hospital created successfully',
      hospital
    });
  } catch (error) {
    console.error('Create hospital error:', error);
    res.status(500).json({
      error: 'Failed to create hospital',
      message: error.message
    });
  }
});

// Update hospital
router.put('/hospitals/:id', validate(schemas.hospitalUpdate), async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Hospital.update(req.body, {
      where: { id }
    });
    
    if (updated === 0) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    const hospital = await Hospital.findByPk(id);
    res.json({
      message: 'Hospital updated successfully',
      hospital
    });
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({
      error: 'Failed to update hospital',
      message: error.message
    });
  }
});

// Delete hospital (soft delete by setting isActive to false)
router.delete('/hospitals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Hospital.update(
      { isActive: false },
      { where: { id } }
    );
    
    if (updated === 0) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    res.json({
      message: 'Hospital deactivated successfully'
    });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({
      error: 'Failed to delete hospital',
      message: error.message
    });
  }
});

// Unit CRUD operations

// Create new unit for a hospital
router.post('/hospitals/:hospitalId/units', validate(schemas.unitCreation), async (req, res) => {
  try {
    const { hospitalId } = req.params;
    
    // Verify hospital exists
    const hospital = await Hospital.findByPk(hospitalId);
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }
    
    const unitData = {
      ...req.body,
      hospitalId: parseInt(hospitalId)
    };
    
    const unit = await Unit.create(unitData);
    res.status(201).json({
      message: 'Unit created successfully',
      unit
    });
  } catch (error) {
    console.error('Create unit error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Unit already exists',
        message: 'A unit with this code already exists for this hospital'
      });
    }
    res.status(500).json({
      error: 'Failed to create unit',
      message: error.message
    });
  }
});

// Update unit
router.put('/hospitals/:hospitalId/units/:unitCode', validate(schemas.unitUpdate), async (req, res) => {
  try {
    const { hospitalId, unitCode } = req.params;
    const [updated] = await Unit.update(req.body, {
      where: { hospitalId, unitCode }
    });
    
    if (updated === 0) {
      return res.status(404).json({
        error: 'Unit not found'
      });
    }
    
    const unit = await Unit.findOne({
      where: { hospitalId, unitCode }
    });
    
    res.json({
      message: 'Unit updated successfully',
      unit
    });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({
      error: 'Failed to update unit',
      message: error.message
    });
  }
});

// Delete unit (soft delete by setting isActive to false)
router.delete('/hospitals/:hospitalId/units/:unitCode', async (req, res) => {
  try {
    const { hospitalId, unitCode } = req.params;
    const [updated] = await Unit.update(
      { isActive: false },
      { where: { hospitalId, unitCode } }
    );
    
    if (updated === 0) {
      return res.status(404).json({
        error: 'Unit not found'
      });
    }
    
    res.json({
      message: 'Unit deactivated successfully'
    });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({
      error: 'Failed to delete unit',
      message: error.message
    });
  }
});

module.exports = router;
