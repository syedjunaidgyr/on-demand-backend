const express = require('express');
const staffRoutes = require('./staff');

const router = express.Router();

// Mount all staff routes under /nurse prefix
// This creates endpoints like /api/v1/nurse/jobs/available, /api/v1/nurse/assignments, etc.
router.use('/', staffRoutes);

module.exports = router;
