-- ============================================================================
-- Academic Resource Sharing Hub - Initial Seed Data
-- ============================================================================

USE academic_resource_hub;

-- ----------------------------------------------------------------------------
-- 1. Seed Departments (3 departments including AI&DS)
-- ----------------------------------------------------------------------------
INSERT INTO departments (id, name) VALUES
  (1, 'Artificial Intelligence and Data Science'),
  (2, 'Computer Science and Engineering'),
  (3, 'Information Technology')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ----------------------------------------------------------------------------
-- 2. Seed Resource Types (8 types matching project brief)
-- ----------------------------------------------------------------------------
INSERT INTO resource_types (id, name) VALUES
  (1, 'Lecture Notes'),
  (2, 'Question Paper'),
  (3, 'Question Bank'),
  (4, 'Lab Manual'),
  (5, 'Study Materials'),
  (6, 'PowerPoint Presentations'),
  (7, 'Syllabus and Course Documents'),
  (8, 'Project Guidelines')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ----------------------------------------------------------------------------
-- 3. Seed Subjects (with Year & Semester)
-- ----------------------------------------------------------------------------
INSERT INTO subjects (id, name, department_id, year, semester) VALUES
  (1, 'Database Management Systems', 1, '2', '4'),
  (2, 'Machine Learning Techniques', 1, '3', '5'),
  (3, 'Operating Systems', 2, '2', '4'),
  (4, 'Object Oriented Programming', 2, '2', '3'),
  (5, 'Data Structures and Algorithms', 3, '2', '3')
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  department_id = VALUES(department_id),
  year = VALUES(year),
  semester = VALUES(semester);

-- ----------------------------------------------------------------------------
-- 4. Seed Initial Staff User (Demo Account)
-- Demo Credentials:
--   Email    : staff@college.edu
--   Password : Staff@123
-- Note: Staff accounts cannot be self-registered via public APIs.
-- Password hash generated using: node src/utils/hashPassword.js Staff@123
-- ----------------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, department_id) VALUES
  (
    1,
    'Dr. Ramesh Kumar',
    'staff@college.edu',
    '$2a$10$wXZh4XGAurRvwnu.z.SuieNqMOR4nh68Z4UZaDp9PY6.DcccTaZsS',
    'staff',
    1
  )
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  department_id = VALUES(department_id);

-- ----------------------------------------------------------------------------
-- 5. Seed Initial Demo Resources (Published)
-- Clearly labelled demo materials with verified files
-- ----------------------------------------------------------------------------
INSERT INTO resources (id, title, description, subject_id, resource_type_id, uploaded_by, file_path, academic_year, status) VALUES
  (
    1,
    'DBMS Unit 1 Relational Model & SQL Lecture Notes',
    'Comprehensive lecture notes covering relational algebra, normalization up to BCNF, and SQL DDL/DML queries.',
    1,
    1,
    1,
    'demo-dbms-notes.pdf',
    '2026-27',
    'PUBLISHED'
  ),
  (
    2,
    'Operating Systems IA-1 Model Question Paper 2026',
    'Internal assessment practice question paper covering process management, CPU scheduling algorithms, and IPC.',
    3,
    2,
    1,
    'demo-os-qp.pdf',
    '2026-27',
    'PUBLISHED'
  ),
  (
    3,
    'Machine Learning Techniques Lab Manual with Python Exercises',
    'Laboratory manual containing regression, classification, clustering implementations and sample datasets.',
    2,
    4,
    1,
    'demo-ml-manual.pdf',
    '2026-27',
    'PUBLISHED'
  )
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  subject_id = VALUES(subject_id),
  resource_type_id = VALUES(resource_type_id),
  uploaded_by = VALUES(uploaded_by),
  file_path = VALUES(file_path),
  academic_year = VALUES(academic_year),
  status = VALUES(status);
