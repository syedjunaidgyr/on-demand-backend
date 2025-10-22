const express = require('express');
const staffRoutes = require('./staff');

const router = express.Router();

// Mount all staff routes under /doctor prefix
// This creates endpoints like /api/v1/doctor/jobs/available, /api/v1/doctor/assignments, etc.
router.use('/', staffRoutes);

module.exports = router;
