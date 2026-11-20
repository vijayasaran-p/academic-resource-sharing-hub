/**
 * Storage Service Abstraction
 * 
 * Provides an isolated storage layer for saving, locating, and deleting uploaded files.
 * Currently stores files on local disk in /backend/uploads.
 * Designed to easily swap with cloud providers (e.g. Cloudinary, AWS S3) in deployment
 * without altering controller logic.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Target directory for local storage: d:\dd22\backend\uploads
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Saves an uploaded file to storage.
 * @param {Object} file - Multer file object (with buffer or temp path)
 * @returns {Promise<string>} Stored relative file path/identifier
 */
async function saveFile(file) {
  if (!file) {
    throw new Error('No file provided to storage service.');
  }

  // Generate unique filename: <random_hex>-<timestamp><ext>
  const ext = path.extname(file.originalname).toLowerCase();
  const randomPrefix = crypto.randomBytes(12).toString('hex');
  const uniqueName = `${randomPrefix}-${Date.now()}${ext}`;
  const targetPath = path.join(UPLOAD_DIR, uniqueName);

  if (file.buffer) {
    // Memory storage mode: write buffer directly to destination
    await fs.promises.writeFile(targetPath, file.buffer);
  } else if (file.path) {
    // Disk storage / temp file mode: move/copy file to uploads directory
    await fs.promises.copyFile(file.path, targetPath);
    await fs.promises.unlink(file.path).catch(() => {});
  } else {
    throw new Error('File object lacks buffer or file path.');
  }

  // Return the filename/relative path to be stored in the database
  return uniqueName;
}

/**
 * Resolves the absolute local disk location for a stored file.
 * @param {string} filePath - Stored relative filename or path
 * @returns {string} Absolute system path
 */
function getFileLocation(filePath) {
  if (!filePath) return null;
  // If filePath already looks like an absolute path or includes directories, normalize it
  const baseName = path.basename(filePath);
  return path.join(UPLOAD_DIR, baseName);
}

/**
 * Deletes a file from storage if it exists.
 * @param {string} filePath - Stored filename or relative path
 */
async function deleteFile(filePath) {
  try {
    const fullPath = getFileLocation(filePath);
    if (fullPath && fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch (err) {
    console.error(`[Storage Warning] Failed to delete file ${filePath}:`, err.message);
  }
}

module.exports = {
  saveFile,
  getFileLocation,
  deleteFile,
  UPLOAD_DIR,
};
