/**
 * Password Hashing Utility
 * 
 * Generates a bcrypt hash for any given plain-text password.
 * Used for seeding initial staff/admin accounts or testing credentials.
 * 
 * Usage:
 *   node src/utils/hashPassword.js [optional_password]
 * 
 * Example:
 *   node src/utils/hashPassword.js Staff@123
 */

const bcrypt = require('bcryptjs');

async function generateHash() {
  const plainPassword = process.argv[2] || 'Staff@123';
  const saltRounds = 10;

  try {
    const hash = await bcrypt.hash(plainPassword, saltRounds);

    console.log('========================================');
    console.log(' PASSWORD HASH GENERATOR');
    console.log('========================================');
    console.log(`Input Password : ${plainPassword}`);
    console.log(`Salt Rounds    : ${saltRounds}`);
    console.log(`Bcrypt Hash    : ${hash}`);
    console.log('----------------------------------------');
    console.log('SQL Seed Snippet:');
    console.log(`'${hash}'`);
    console.log('========================================');

    return hash;
  } catch (error) {
    console.error('Error generating password hash:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  generateHash();
}

module.exports = { generateHash };
