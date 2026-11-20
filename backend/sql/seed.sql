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
