/**
 * Resource Management Controller
 * 
 * Handles uploading, metadata editing, archiving, deletion, searching,
 * filtering, pagination, and download tracking for academic resources.
 */

const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const storage = require('../utils/storage');

/**
 * Helper to build the base SELECT query with all required joined tables
 */
const BASE_RESOURCE_SELECT = `
  SELECT 
    r.id,
    r.title,
    r.description,
    r.file_path,
    r.academic_year,
    r.status,
    r.created_at,
    r.subject_id,
    s.name AS subject_name,
    s.department_id,
    d.name AS department_name,
    s.year,
    s.semester,
    r.resource_type_id,
    rt.name AS resource_type_name,
    r.uploaded_by,
    u.name AS uploader_name,
    u.role AS uploader_role
  FROM resources r
  JOIN subjects s ON r.subject_id = s.id
  JOIN departments d ON s.department_id = d.id
  JOIN resource_types rt ON r.resource_type_id = rt.id
  JOIN users u ON r.uploaded_by = u.id
`;

/**
 * Dynamic SQL Search and Filter Helper
 * 
 * Safely constructs parameterized WHERE clauses and ORDER BY.
 * Never concatenates unsanitized user inputs into SQL.
 * Supports FULLTEXT search with fallback to LIKE for terms < 4 characters.
 */
function buildResourceQuery(queryParams, forceStatus = null) {
  const {
    q,
    department,
    year,
    semester,
    subject,
    type,
    academicYear,
    status,
    sort,
  } = queryParams;

  const conditions = [];
  const params = [];

  // 1. Role / Status filtering
  if (forceStatus) {
    conditions.push('r.status = ?');
    params.push(forceStatus);
  } else if (status) {
    conditions.push('r.status = ?');
    params.push(status);
  }

  // 2. Keyword search (FULLTEXT with LIKE fallback)
  if (q && typeof q === 'string' && q.trim().length > 0) {
    const trimmed = q.trim();
    // MySQL InnoDB fulltext index default min token size is 3 or 4.
    // For short search keywords (e.g., 'AI', 'OS', 'DB'), fall back to LIKE.
    if (trimmed.length < 4) {
      conditions.push('(r.title LIKE ? OR r.description LIKE ?)');
      params.push(`%${trimmed}%`, `%${trimmed}%`);
    } else {
      // Use FULLTEXT in boolean mode with wildcard suffix for prefix matching
      conditions.push('MATCH(r.title, r.description) AGAINST(? IN BOOLEAN MODE)');
      params.push(`+${trimmed}*`);
    }
  }

  // 3. Department filter (numeric ID or department name)
  if (department) {
    if (!isNaN(department)) {
      conditions.push('s.department_id = ?');
      params.push(parseInt(department, 10));
    } else {
      conditions.push('(d.name LIKE ?)');
      params.push(`%${department.trim()}%`);
    }
  }

  // 4. Academic year attribute filter (from subjects)
  if (year) {
    conditions.push('s.year = ?');
    params.push(String(year).trim());
  }

  // 5. Semester filter (from subjects)
  if (semester) {
    conditions.push('s.semester = ?');
    params.push(String(semester).trim());
  }

  // 6. Subject filter (numeric ID or subject name)
  if (subject) {
    if (!isNaN(subject)) {
      conditions.push('r.subject_id = ?');
      params.push(parseInt(subject, 10));
    } else {
      conditions.push('s.name LIKE ?');
      params.push(`%${subject.trim()}%`);
    }
  }

  // 7. Resource Type filter (numeric ID or type name)
  if (type) {
    if (!isNaN(type)) {
      conditions.push('r.resource_type_id = ?');
      params.push(parseInt(type, 10));
    } else {
      conditions.push('rt.name LIKE ?');
      params.push(`%${type.trim()}%`);
    }
  }

  // 8. Academic Year calendar string (e.g. '2026-27')
  if (academicYear) {
    conditions.push('r.academic_year = ?');
    params.push(String(academicYear).trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 9. Whitelist-based sorting to prevent SQL injection
  let orderByClause = 'ORDER BY r.created_at DESC';
  if (sort === 'oldest') {
    orderByClause = 'ORDER BY r.created_at ASC';
  } else if (sort === 'title') {
    orderByClause = 'ORDER BY r.title ASC';
  } else if (sort === 'newest') {
    orderByClause = 'ORDER BY r.created_at DESC';
  }

  return { whereClause, params, orderByClause };
}

// ============================================================================
// PUBLIC / STUDENT-FACING RESOURCE DISCOVERY
// ============================================================================

/**
 * Search and browse published academic resources
 * GET /api/resources
 * Accessible to any authenticated user. Strictly restricts students to PUBLISHED items.
 */
async function getResources(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // Students only ever see PUBLISHED resources
    const { whereClause, params, orderByClause } = buildResourceQuery(req.query, 'PUBLISHED');

    // Total count query for pagination metadata
    const countSql = `
      SELECT COUNT(*) AS total
      FROM resources r
      JOIN subjects s ON r.subject_id = s.id
      JOIN departments d ON s.department_id = d.id
      JOIN resource_types rt ON r.resource_type_id = rt.id
      JOIN users u ON r.uploaded_by = u.id
      ${whereClause}
    `;
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch paginated records
    const dataSql = `
      ${BASE_RESOURCE_SELECT}
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;
    const [items] = await pool.query(dataSql, [...params, limit, offset]);

    return res.status(200).json({
      success: true,
      data: {
        items,
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get detailed metadata for an individual resource
 * GET /api/resources/:id
 */
async function getResourceById(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `${BASE_RESOURCE_SELECT} WHERE r.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    const resource = rows[0];

    // Students are forbidden from seeing non-PUBLISHED resources
    if (req.user.role === 'student' && resource.status !== 'PUBLISHED') {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Download a resource file and track student download statistics
 * GET /api/resources/:id/download
 */
async function downloadResource(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT r.id, r.title, r.file_path, r.status
       FROM resources r
       WHERE r.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    const resource = rows[0];

    // Access check: students cannot download unapproved/archived items
    if (req.user.role === 'student' && resource.status !== 'PUBLISHED') {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or not available for download.',
      });
    }

    // Resolve physical file location
    const filePath = storage.getFileLocation(resource.file_path);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'The requested resource file is missing from storage.',
      });
    }

    // Record student download in analytics table
    if (req.user.role === 'student') {
      await pool.query(
        'INSERT INTO resource_downloads (student_id, resource_id) VALUES (?, ?)',
        [req.user.id, resource.id]
      );
    }

    // Prepare human-friendly download filename preserving extension
    const ext = path.extname(resource.file_path) || '';
    const sanitizedTitle = resource.title
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .substring(0, 60);
    const downloadName = `${sanitizedTitle}${ext}`;

    // Stream file to client with attachment headers
    return res.download(filePath, downloadName);
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// STAFF RESOURCE MANAGEMENT
// ============================================================================

/**
 * Staff Resource Upload
 * POST /api/resources
 * Staff uploads are automatically assigned status = 'PUBLISHED'.
 */
async function createResource(req, res, next) {
  try {
    const { title, description, subject_id, resource_type_id, academic_year } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required for resource upload.',
      });
    }

    if (!title || !subject_id || !resource_type_id || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'title, subject_id, resource_type_id, and academic_year are required.',
      });
    }

    // Verify subject exists
    const [subjectRows] = await pool.query(
      'SELECT id FROM subjects WHERE id = ?',
      [subject_id]
    );
    if (subjectRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Subject with ID ${subject_id} does not exist.`,
      });
    }

    // Verify resource type exists
    const [typeRows] = await pool.query(
      'SELECT id FROM resource_types WHERE id = ?',
      [resource_type_id]
    );
    if (typeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resource type with ID ${resource_type_id} does not exist.`,
      });
    }

    // Save file via storage service abstraction
    const savedFileName = await storage.saveFile(req.file);

    // Insert resource with status PUBLISHED (staff direct upload)
    const [result] = await pool.query(
      `INSERT INTO resources 
        (title, description, subject_id, resource_type_id, uploaded_by, file_path, academic_year, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')`,
      [
        title.trim(),
        description ? description.trim() : null,
        subject_id,
        resource_type_id,
        req.user.id,
        savedFileName,
        String(academic_year).trim(),
      ]
    );

    // Retrieve created record
    const [created] = await pool.query(
      `${BASE_RESOURCE_SELECT} WHERE r.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Resource published successfully.',
      data: created[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Edit resource metadata or optionally replace file (Staff only)
 * PUT /api/resources/:id
 */
async function updateResource(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, subject_id, resource_type_id, academic_year } = req.body;

    // Check if resource exists
    const [existing] = await pool.query(
      'SELECT id, file_path FROM resources WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resource with ID ${id} not found.`,
      });
    }

    // If subject_id provided, verify it exists
    if (subject_id) {
      const [subjectRows] = await pool.query(
        'SELECT id FROM subjects WHERE id = ?',
        [subject_id]
      );
      if (subjectRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Subject with ID ${subject_id} does not exist.`,
        });
      }
    }

    // If resource_type_id provided, verify it exists
    if (resource_type_id) {
      const [typeRows] = await pool.query(
        'SELECT id FROM resource_types WHERE id = ?',
        [resource_type_id]
      );
      if (typeRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Resource type with ID ${resource_type_id} does not exist.`,
        });
      }
    }

    let newFilePath = null;
    if (req.file) {
      // Save replacement file
      newFilePath = await storage.saveFile(req.file);
      // Remove old file from storage
      await storage.deleteFile(existing[0].file_path);
    }

    await pool.query(
      `UPDATE resources
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           subject_id = COALESCE(?, subject_id),
           resource_type_id = COALESCE(?, resource_type_id),
           academic_year = COALESCE(?, academic_year),
           file_path = COALESCE(?, file_path)
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        description !== undefined ? description : null,
        subject_id || null,
        resource_type_id || null,
        academic_year ? String(academic_year).trim() : null,
        newFilePath,
        id,
      ]
    );

    const [updated] = await pool.query(
      `${BASE_RESOURCE_SELECT} WHERE r.id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Resource updated successfully.',
      data: updated[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Archive a resource (Staff only)
 * PATCH /api/resources/:id/archive
 */
async function archiveResource(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id, title, status FROM resources WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resource with ID ${id} not found.`,
      });
    }

    await pool.query(
      "UPDATE resources SET status = 'ARCHIVED' WHERE id = ?",
      [id]
    );

    return res.status(200).json({
      success: true,
      message: `Resource '${existing[0].title}' has been archived.`,
      data: {
        id: parseInt(id, 10),
        status: 'ARCHIVED',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Permanently delete a resource and its physical file (Staff only)
 * DELETE /api/resources/:id
 */
async function deleteResource(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT id, title, file_path FROM resources WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resource with ID ${id} not found.`,
      });
    }

    const resource = rows[0];

    // Delete record from database (cascades to bookmarks, downloads, reviews)
    await pool.query('DELETE FROM resources WHERE id = ?', [id]);

    // Delete associated file from storage
    await storage.deleteFile(resource.file_path);

    return res.status(200).json({
      success: true,
      message: `Resource '${resource.title}' deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff view of all resources (all statuses, with search, filters, and pagination)
 * GET /api/staff/resources
 */
async function getStaffResources(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // Staff view does NOT force PUBLISHED status (can view PENDING, ARCHIVED, etc.)
    const { whereClause, params, orderByClause } = buildResourceQuery(req.query);

    const countSql = `
      SELECT COUNT(*) AS total
      FROM resources r
      JOIN subjects s ON r.subject_id = s.id
      JOIN departments d ON s.department_id = d.id
      JOIN resource_types rt ON r.resource_type_id = rt.id
      JOIN users u ON r.uploaded_by = u.id
      ${whereClause}
    `;
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const dataSql = `
      ${BASE_RESOURCE_SELECT}
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;
    const [items] = await pool.query(dataSql, [...params, limit, offset]);

    return res.status(200).json({
      success: true,
      data: {
        items,
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getResources,
  getResourceById,
  downloadResource,
  createResource,
  updateResource,
  archiveResource,
  deleteResource,
  getStaffResources,
};
