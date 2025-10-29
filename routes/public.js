const express = require('express');
const { Hospital, Unit } = require('../models');

const router = express.Router();

// List hospitals (public - no auth required for registration)
router.get('/hospitals', async (req, res) => {
  try {
    const hospitals = await Hospital.findAll({
      attributes: ['id', 'name', 'code', 'isActive', 'logo']
    });
    res.json({ hospitals });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({
      error: 'Failed to fetch hospitals',
      message: error.message
    });
  }
});

// List units for a hospital (public - no auth required for registration)
router.get('/hospitals/:id/units', async (req, res) => {
  try {
    const { id } = req.params;
    const units = await Unit.findAll({
      where: { hospitalId: id, isActive: true },
      attributes: ['unitCode', 'unitName', 'isActive']
    });
    res.json({ units });
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({
      error: 'Failed to fetch units',
      message: error.message
    });
  }
});

module.exports = router;
