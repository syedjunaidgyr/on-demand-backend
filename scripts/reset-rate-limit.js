#!/usr/bin/env node

const { sequelize } = require('../models');

const resetRateLimit = async () => {
  try {
    console.log('🔄 Resetting rate limit...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Note: Rate limiting is handled in memory by express-rate-limit
    // To reset it, you need to restart the server
    console.log('ℹ️  Rate limiting is handled in memory by express-rate-limit');
    console.log('💡 To reset rate limits, restart the server:');
    console.log('   1. Stop the current server (Ctrl+C)');
    console.log('   2. Run: npm run dev');
    console.log('');
    console.log('🔧 Alternative: The rate limit has been increased to 1000 requests per 15 minutes in development mode');
    console.log('📊 Current rate limit settings:');
    console.log('   - Development: 1000 requests per 15 minutes');
    console.log('   - Production: 100 requests per 15 minutes');
    console.log('   - Health check endpoint: No rate limit');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
};

// Run the reset info
resetRateLimit();
