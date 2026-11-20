/**
 * File Upload Middleware using Multer
 * 
 * - Enforces extension and MIME-type dual validation
 * - Enforces file size limits configured via MAX_FILE_SIZE_MB
 * - Returns friendly, consistent error responses on violations
 */

const multer = require('multer');
const path = require('path');
const env = require('../config/env');

// Allowed extensions and corresponding MIME types
const ALLOWED_MIME_TYPES = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.txt': ['text/plain'],
  '.zip': [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
    'multipart/x-zip',
    'application/octet-stream', // Some browsers / OS upload zip as octet-stream
  ],
};

const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_MIME_TYPES);

// Configure memory storage so files are held in buffer and passed to storage service
const storage = multer.memoryStorage();

// File filter function validating BOTH extension and MIME type
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error(`File extension '${ext}' is not permitted. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  const validMimes = ALLOWED_MIME_TYPES[ext];
  if (!validMimes || !validMimes.includes(mime)) {
    const error = new Error(`MIME type '${mime}' is not permitted for extension '${ext}'.`);
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  cb(null, true);
}

const maxSizeBytes = (env.maxFileSizeMB || 10) * 1024 * 1024;

const upload = multer({
  storage,
  limits: {
    fileSize: maxSizeBytes,
  },
  fileFilter,
});

/**
 * Express wrapper for single file upload that traps Multer exceptions
 * and converts them to consistent { success: false, message } responses.
 */
function handleSingleUpload(fieldName = 'file') {
  const uploader = upload.single(fieldName);

  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum allowed size is ${env.maxFileSizeMB || 10} MB.`,
          });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`,
        });
      }
      next();
    });
  };
}

module.exports = {
  handleSingleUpload,
  ALLOWED_EXTENSIONS,
};
