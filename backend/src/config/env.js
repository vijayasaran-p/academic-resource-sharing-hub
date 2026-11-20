/**
 * Environment Configuration Loader
 * 
 * Centralizes all process.env accesses and provides sensible defaults.
 * Loads variables from .env file when in local development.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // Database settings
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'academic_resource_hub',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },

  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'academic_resource_hub_super_secret_jwt_key_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Upload limits
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
};

module.exports = env;
