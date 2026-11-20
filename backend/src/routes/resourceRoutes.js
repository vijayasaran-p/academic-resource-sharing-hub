/**
 * Resource Routes
 * 
 * Endpoints for browsing, uploading, editing, archiving, deleting, and downloading
 * academic materials.
 */

const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { handleSingleUpload } = require('../middleware/upload');

// All resource routes require authentication
router.use(verifyToken);

// ============================================================================
// PUBLIC / STUDENT-FACING DISCOVERY & DOWNLOAD
// ============================================================================
router.get('/', resourceController.getResources);
router.get('/:id', resourceController.getResourceById);
router.get('/:id/download', resourceController.downloadResource);

// ============================================================================
// STAFF-ONLY RESOURCE MANAGEMENT
// ============================================================================
router.post(
  '/',
  requireRole('staff'),
  handleSingleUpload('file'),
  resourceController.createResource
);

router.put(
  '/:id',
  requireRole('staff'),
  handleSingleUpload('file'),
  resourceController.updateResource
);

router.patch(
  '/:id/archive',
  requireRole('staff'),
  resourceController.archiveResource
);

router.delete(
  '/:id',
  requireRole('staff'),
  resourceController.deleteResource
);

module.exports = router;
