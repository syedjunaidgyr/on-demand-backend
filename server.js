const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Models initialize DB connection; syncing is done via scripts/sync-db.js on demand

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // 1000 requests in dev, 100 in production
  message: {
    error: 'Too many requests',
    message: 'Too many requests, please try again later.',
    retryAfter: Math.round(15 * 60) // 15 minutes in seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/hr', require('./routes/hr'));
app.use('/api/v1/staff', require('./routes/staff')); // Unified route for doctors and nurses
app.use('/api/v1/doctor', require('./routes/doctor')); // Doctor-specific routes
app.use('/api/v1/nurse', require('./routes/nurse')); // Nurse-specific routes
app.use('/api/v1/jobs', require('./routes/jobs'));
app.use('/api/v1/reports', require('./routes/reports'));
app.use('/api/v1/tracking', require('./routes/tracking')); // Real-time tracking routes
app.use('/api/v1/financial', require('./routes/financial')); // Financial dashboard routes
app.use('/api/v1/performance', require('./routes/performance')); // Performance analytics routes
app.use('/api/v1/permissions', require('./routes/permissions'));
app.use('/api/v1/admin', require('./routes/admin')); // Admin routes for hospital/unit management
app.use('/api/v1/public', require('./routes/public')); // Public routes (no auth required)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Locum Backend API'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server (no implicit DB sync)
app.listen(PORT, () => {
  console.log(`🚀 Locum Backend API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
