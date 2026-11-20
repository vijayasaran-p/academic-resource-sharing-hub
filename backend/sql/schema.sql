-- ============================================================================
-- Academic Resource Sharing Hub - Database Schema (MySQL 8)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS academic_resource_hub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE academic_resource_hub;

-- ----------------------------------------------------------------------------
-- 1. Departments Table
-- Stores academic departments (e.g., AI&DS, CSE, IT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Users Table
-- Stores students and staff credentials and department affiliations
-- Note: Role is strictly restricted to 'student' or 'staff'.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'staff') NOT NULL DEFAULT 'student',
  department_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Subjects Table
-- Subjects belong to a department and are taught in specific years/semesters
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  department_id INT NOT NULL,
  year VARCHAR(20) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_subjects_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Resource Types Table
-- Categories like Lecture Notes, Question Papers, Lab Manuals, etc.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Resources Table
-- Core repository containing metadata for all uploaded academic materials
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  subject_id INT NOT NULL,
  resource_type_id INT NOT NULL,
  uploaded_by INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  status ENUM('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'PUBLISHED', 'REJECTED', 'ARCHIVED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_resources_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_resources_type
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_resources_uploader
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  -- Optimized compound index for high-frequency search and filter queries
  INDEX idx_resources_filters (subject_id, resource_type_id, status, academic_year),
  -- Full-text index for fast title and description keyword search
  FULLTEXT INDEX ft_resources_title_desc (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Resource Requests Table
-- Allows students to request materials not yet available on the platform
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  status ENUM('PENDING', 'COMPLETED', 'CLOSED') NOT NULL DEFAULT 'PENDING',
  staff_remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_requests_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_requests_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Bookmarks Table
-- Frequently accessed resources saved by students (unique pair)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  resource_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bookmarks_student_resource (student_id, resource_id),
  CONSTRAINT fk_bookmarks_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_bookmarks_resource
    FOREIGN KEY (resource_id) REFERENCES resources(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Resource Downloads Table
-- Tracks student downloads for analytical and usage reporting
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_downloads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  resource_id INT NOT NULL,
  downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_downloads_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_downloads_resource
    FOREIGN KEY (resource_id) REFERENCES resources(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Resource Reviews Table
-- Audit log of verification decisions made by staff on student contributions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  staff_id INT NOT NULL,
  status ENUM('UNDER_REVIEW', 'VERIFIED', 'REJECTED') NOT NULL,
  remarks TEXT NULL,
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_resource
    FOREIGN KEY (resource_id) REFERENCES resources(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_staff
    FOREIGN KEY (staff_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
