/**
 * Category Management Routes
 * 
 * Routes for departments, subjects, resource types, and academic years.
 * Reading is accessible to all authenticated users.
 * Mutations (POST, PUT, DELETE) are restricted to Staff.
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All category routes require an active login
router.use(verifyToken);

// ============================================================================
// DEPARTMENTS
// ============================================================================
router.get('/departments', categoryController.getDepartments);
router.post('/departments', requireRole('staff'), categoryController.createDepartment);
router.put('/departments/:id', requireRole('staff'), categoryController.updateDepartment);
router.delete('/departments/:id', requireRole('staff'), categoryController.deleteDepartment);

// ============================================================================
// SUBJECTS
// ============================================================================
router.get('/subjects', categoryController.getSubjects);
router.post('/subjects', requireRole('staff'), categoryController.createSubject);
router.put('/subjects/:id', requireRole('staff'), categoryController.updateSubject);
router.delete('/subjects/:id', requireRole('staff'), categoryController.deleteSubject);

// ============================================================================
// RESOURCE TYPES
// ============================================================================
router.get('/resource-types', categoryController.getResourceTypes);
router.post('/resource-types', requireRole('staff'), categoryController.createResourceType);
router.put('/resource-types/:id', requireRole('staff'), categoryController.updateResourceType);
router.delete('/resource-types/:id', requireRole('staff'), categoryController.deleteResourceType);

// ============================================================================
// ACADEMIC YEARS
// ============================================================================
router.get('/academic-years', categoryController.getAcademicYears);

module.exports = router;
