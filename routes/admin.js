const express = require('express');
const fs = require('fs');
const path = require('path');
const { Hospital, Unit } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { upload } = require('../utils/upload');

const router = express.Router();

// Apply authentication and ADMIN authorization to all routes
router.use(authenticate);
router.use(authorize('ADMIN'));

// Hospital CRUD operations

// Create new hospital (with optional logo upload)
router.post('/hospitals', upload.single('logo'), async (req, res) => {
  try {
    // Validate non-file fields
    const { error: validationError, value } = schemas.hospitalCreation.validate(req.body, { abortEarly: false });
    if (validationError) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details.map(d => ({ field: d.path.join('.'), message: d.message }))
      });
    }

    const hospitalData = { ...value };
    
    // If logo uploaded, add path
    if (req.file) {
      hospitalData.logo = `/uploads/hospitals/${req.file.filename}`;
    }

    const hospital = await Hospital.create(hospitalData);
    res.status(201).json({
      message: 'Hospital created successfully',
      hospital,
      ...(req.file && { logo: hospitalData.logo, logoUrl: `${req.protocol}://${req.get('host')}${hospitalData.logo}` })
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

// Upload hospital logo
router.post('/hospitals/:id/logo', upload.single('logo'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload an image file'
      });
    }

    const hospital = await Hospital.findByPk(id);
    if (!hospital) {
      // Delete uploaded file if hospital doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }

    // Delete old logo if exists
    if (hospital.logo) {
      const oldLogoPath = path.join(__dirname, '../public/uploads/hospitals', path.basename(hospital.logo));
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Save relative path to database (usable by frontend)
    const logoPath = `/uploads/hospitals/${req.file.filename}`;
    await hospital.update({ logo: logoPath });

    // Reload hospital to get updated data
    await hospital.reload();

    res.json({
      message: 'Logo uploaded successfully',
      logo: logoPath,
      logoUrl: `${req.protocol}://${req.get('host')}${logoPath}`,
      hospital: hospital.toJSON()
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: 'Failed to upload logo',
      message: error.message
    });
  }
});

// Delete hospital logo
router.delete('/hospitals/:id/logo', async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findByPk(id);
    
    if (!hospital) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }

    if (!hospital.logo) {
      return res.status(404).json({
        error: 'No logo found',
        message: 'Hospital has no logo to delete'
      });
    }

    // Delete file from filesystem
    const logoPath = path.join(__dirname, '../public/uploads/hospitals', path.basename(hospital.logo));
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }

    // Remove logo path from database
    await hospital.update({ logo: null });

    res.json({
      message: 'Logo deleted successfully',
      hospital: hospital.toJSON()
    });
  } catch (error) {
    console.error('Delete logo error:', error);
    res.status(500).json({
      error: 'Failed to delete logo',
      message: error.message
    });
  }
});

module.exports = router;
