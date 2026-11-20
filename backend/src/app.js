/**
 * Express Application Configuration
 * 
 * Sets up middleware, security headers, routing, and error handlers.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const staffRoutes = require('./routes/staffRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// 1. Security Headers Middleware
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);

// 3. Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Base Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Academic Resource Sharing Hub API is healthy and running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// 5. API Feature Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api', categoryRoutes);
app.use('/api/resources', resourceRoutes);

// 6. 404 Undefined Route Handler
app.use(notFoundHandler);

// 7. Central Error Handling Middleware
app.use(errorHandler);

module.exports = app;
