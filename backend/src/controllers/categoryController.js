/**
 * Category Management Controller
 * 
 * Provides CRUD operations for departments, subjects, resource types,
 * and academic years.
 * - Read endpoints are available to all authenticated users.
 * - Create/Update/Delete endpoints are restricted to Staff members.
 * - Prevents orphan/cascading deletion of referenced entities with friendly 409 Conflict responses.
 */

const { pool } = require('../config/db');

// ============================================================================
// DEPARTMENTS
// ============================================================================

/**
 * Get all departments
 * GET /api/departments
 */
async function getDepartments(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, created_at FROM departments ORDER BY name ASC'
    );
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new department (Staff only)
 * POST /api/departments
 */
async function createDepartment(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required.',
      });
    }

    const trimmedName = name.trim();

    // Check for duplicate name
    const [existing] = await pool.query(
      'SELECT id FROM departments WHERE name = ?',
      [trimmedName]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Department '${trimmedName}' already exists.`,
      });
    }

    const [result] = await pool.query(
      'INSERT INTO departments (name) VALUES (?)',
      [trimmedName]
    );

    return res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: {
        id: result.insertId,
        name: trimmedName,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing department (Staff only)
 * PUT /api/departments/:id
 */
async function updateDepartment(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required.',
      });
    }

    const trimmedName = name.trim();

    // Check if department exists
    const [current] = await pool.query('SELECT id FROM departments WHERE id = ?', [id]);
    if (current.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Department with ID ${id} not found.`,
      });
    }

    // Check if another department with the same name exists
    const [duplicate] = await pool.query(
      'SELECT id FROM departments WHERE name = ? AND id != ?',
      [trimmedName, id]
    );
    if (duplicate.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Another department named '${trimmedName}' already exists.`,
      });
    }

    await pool.query('UPDATE departments SET name = ? WHERE id = ?', [trimmedName, id]);

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully.',
      data: {
        id: parseInt(id, 10),
        name: trimmedName,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a department (Staff only)
 * DELETE /api/departments/:id
 * Fails with 409 if active users or subjects reference this department.
 */
async function deleteDepartment(req, res, next) {
  try {
    const { id } = req.params;

    const [dept] = await pool.query('SELECT id, name FROM departments WHERE id = ?', [id]);
    if (dept.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Department with ID ${id} not found.`,
      });
    }

    // Check usage in users
    const [users] = await pool.query(
      'SELECT COUNT(*) AS count FROM users WHERE department_id = ?',
      [id]
    );
    if (users[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete department '${dept[0].name}': ${users[0].count} user(s) are affiliated with it.`,
      });
    }

    // Check usage in subjects
    const [subjects] = await pool.query(
      'SELECT COUNT(*) AS count FROM subjects WHERE department_id = ?',
      [id]
    );
    if (subjects[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete department '${dept[0].name}': ${subjects[0].count} subject(s) are assigned to it.`,
      });
    }

    await pool.query('DELETE FROM departments WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: `Department '${dept[0].name}' deleted successfully.`,
    });
  } catch (err) {
    if (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete department: it is referenced by existing database records.',
      });
    }
    next(err);
  }
}

// ============================================================================
// SUBJECTS
// ============================================================================

/**
 * Get subjects with optional filters: department_id, year, semester
 * GET /api/subjects
 */
async function getSubjects(req, res, next) {
  try {
    const { department_id, year, semester } = req.query;

    let sql = `
      SELECT s.id, s.name, s.department_id, d.name AS department_name, s.year, s.semester, s.created_at
      FROM subjects s
      JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (department_id) {
      sql += ' AND s.department_id = ?';
      params.push(department_id);
    }
    if (year) {
      sql += ' AND s.year = ?';
      params.push(year);
    }
    if (semester) {
      sql += ' AND s.semester = ?';
      params.push(semester);
    }

    sql += ' ORDER BY s.name ASC';

    const [rows] = await pool.query(sql, params);
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new subject (Staff only)
 * POST /api/subjects
 */
async function createSubject(req, res, next) {
  try {
    const { name, department_id, year, semester } = req.body;

    if (!name || !department_id || !year || !semester) {
      return res.status(400).json({
        success: false,
        message: 'name, department_id, year, and semester are all required.',
      });
    }

    // Check that department exists
    const [dept] = await pool.query('SELECT id, name FROM departments WHERE id = ?', [department_id]);
    if (dept.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Department with ID ${department_id} does not exist.`,
      });
    }

    const trimmedName = name.trim();
    const [result] = await pool.query(
      `INSERT INTO subjects (name, department_id, year, semester)
       VALUES (?, ?, ?, ?)`,
      [trimmedName, department_id, String(year).trim(), String(semester).trim()]
    );

    return res.status(201).json({
      success: true,
      message: 'Subject created successfully.',
      data: {
        id: result.insertId,
        name: trimmedName,
        department_id,
        department_name: dept[0].name,
        year: String(year).trim(),
        semester: String(semester).trim(),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing subject (Staff only)
 * PUT /api/subjects/:id
 */
async function updateSubject(req, res, next) {
  try {
    const { id } = req.params;
    const { name, department_id, year, semester } = req.body;

    // Check if subject exists
    const [existing] = await pool.query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Subject with ID ${id} not found.`,
      });
    }

    // If department_id is being changed, verify target department exists
    if (department_id) {
      const [dept] = await pool.query('SELECT id FROM departments WHERE id = ?', [department_id]);
      if (dept.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Department with ID ${department_id} does not exist.`,
        });
      }
    }

    await pool.query(
      `UPDATE subjects
       SET name = COALESCE(?, name),
           department_id = COALESCE(?, department_id),
           year = COALESCE(?, year),
           semester = COALESCE(?, semester)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        department_id || null,
        year ? String(year).trim() : null,
        semester ? String(semester).trim() : null,
        id,
      ]
    );

    // Fetch refreshed row
    const [updated] = await pool.query(
      `SELECT s.id, s.name, s.department_id, d.name AS department_name, s.year, s.semester, s.created_at
       FROM subjects s
       JOIN departments d ON s.department_id = d.id
       WHERE s.id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Subject updated successfully.',
      data: updated[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a subject (Staff only)
 * DELETE /api/subjects/:id
 * Returns 409 if resources or resource_requests reference this subject.
 */
async function deleteSubject(req, res, next) {
  try {
    const { id } = req.params;

    const [subject] = await pool.query('SELECT id, name FROM subjects WHERE id = ?', [id]);
    if (subject.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Subject with ID ${id} not found.`,
      });
    }

    // Check usage in resources
    const [resources] = await pool.query(
      'SELECT COUNT(*) AS count FROM resources WHERE subject_id = ?',
      [id]
    );
    if (resources[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete subject '${subject[0].name}': ${resources[0].count} academic resource(s) are attached to it.`,
      });
    }

    // Check usage in resource requests
    const [requests] = await pool.query(
      'SELECT COUNT(*) AS count FROM resource_requests WHERE subject_id = ?',
      [id]
    );
    if (requests[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete subject '${subject[0].name}': ${requests[0].count} resource request(s) reference it.`,
      });
    }

    await pool.query('DELETE FROM subjects WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: `Subject '${subject[0].name}' deleted successfully.`,
    });
  } catch (err) {
    if (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete subject: it is in use by existing records.',
      });
    }
    next(err);
  }
}

// ============================================================================
// RESOURCE TYPES
// ============================================================================

/**
 * Get all resource types
 * GET /api/resource-types
 */
async function getResourceTypes(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, created_at FROM resource_types ORDER BY name ASC'
    );
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new resource type (Staff only)
 * POST /api/resource-types
 */
async function createResourceType(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Resource type name is required.',
      });
    }

    const trimmedName = name.trim();

    // Check for duplicate name
    const [existing] = await pool.query(
      'SELECT id FROM resource_types WHERE name = ?',
      [trimmedName]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Resource type '${trimmedName}' already exists.`,
      });
    }

    const [result] = await pool.query(
      'INSERT INTO resource_types (name) VALUES (?)',
      [trimmedName]
    );

    return res.status(201).json({
      success: true,
      message: 'Resource type created successfully.',
      data: {
        id: result.insertId,
        name: trimmedName,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update a resource type (Staff only)
 * PUT /api/resource-types/:id
 */
async function updateResourceType(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Resource type name is required.',
      });
    }

    const trimmedName = name.trim();

    // Check existence
    const [current] = await pool.query('SELECT id FROM resource_types WHERE id = ?', [id]);
    if (current.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resource type with ID ${id} not found.`,
      });
    }

    // Check duplicate name
    const [duplicate] = await pool.query(
      'SELECT id FROM resource_types WHERE name = ? AND id != ?',
      [trimmedName, id]
    );
    if (duplicate.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Another resource type named '${trimmedName}' already exists.`,
      });
    }

    await pool.query('UPDATE resource_types SET name = ? WHERE id = ?', [trimmedName, id]);

    return res.status(200).json({
      success: true,
      message: 'Resource type updated successfully.',
      data: {
        id: parseInt(id, 10),
        name: trimmedName,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a resource type (Staff only)
 * DELETE /api/resource-types/:id
 * Returns 409 if resources reference this resource type.
 */
async function deleteResourceType(req, res, next) {
  try {
    const { id } = req.params;

    const [type] = await pool.query('SELECT id, name FROM resource_types WHERE id = ?', [id]);
    if (type.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resource type with ID ${id} not found.`,
      });
    }

    // Check usage in resources
    const [resources] = await pool.query(
      'SELECT COUNT(*) AS count FROM resources WHERE resource_type_id = ?',
      [id]
    );
    if (resources[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete resource type '${type[0].name}': ${resources[0].count} resource(s) are categorized under it.`,
      });
    }

    await pool.query('DELETE FROM resource_types WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: `Resource type '${type[0].name}' deleted successfully.`,
    });
  } catch (err) {
    if (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete resource type: it is in use by existing records.',
      });
    }
    next(err);
  }
}

// ============================================================================
// ACADEMIC YEARS
// ============================================================================

/**
 * Get distinct academic years from published/existing resources
 * GET /api/academic-years
 */
async function getAcademicYears(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT academic_year
       FROM resources
       WHERE academic_year IS NOT NULL AND academic_year != ''
       ORDER BY academic_year DESC`
    );

    const years = rows.map((r) => r.academic_year);
    return res.status(200).json({
      success: true,
      data: years,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getResourceTypes,
  createResourceType,
  updateResourceType,
  deleteResourceType,
  getAcademicYears,
};
