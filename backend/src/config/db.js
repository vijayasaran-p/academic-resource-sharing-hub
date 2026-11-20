/**
 * Database Connection Module
 * 
 * Uses mysql2/promise connection pool for high-performance, non-blocking queries.
 * A pool manages multiple reusable database connections rather than opening and
 * closing a connection per HTTP request.
 */

const mysql = require('mysql2/promise');
const env = require('./env');

// Create connection pool using config loaded from environment
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  ssl: env.db.ssl,
  waitForConnections: env.db.waitForConnections,
  connectionLimit: env.db.connectionLimit,
  queueLimit: env.db.queueLimit,
  // Automatically format dates as JS Date objects and return rows as plain objects
  dateStrings: true,
});

/**
 * Tests the database connection and logs the outcome.
 * Called during server startup to verify connectivity.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Successfully connected to MySQL database: ${env.db.database}`);
    connection.release();
    return true;
  } catch (error) {
    console.error(`[Database Error] Could not connect to MySQL: ${error.message}`);
    console.error('[Database Error] Please check your .env database credentials and ensure MySQL is running.');
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
};
