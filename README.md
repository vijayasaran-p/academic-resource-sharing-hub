# Academic Resource Sharing Hub (College Micro Project)

A role-based SaaS web application designed for colleges to centralize, discover, verify, and share academic resources (lecture notes, question banks, previous-year question papers, lab manuals, and more).

---

## 1. Project Overview & Architecture

### Target Users & Roles
- **Student**: Discovers, searches, bookmarks, downloads academic resources, requests missing materials, and contributes new resources for staff review. Students self-register via the portal.
- **Staff**: Department faculty / administrators who verify student contributions, approve/reject submissions with feedback, upload official course materials, manage categories (departments, subjects, resource types), respond to student requests, and monitor repository statistics. Staff accounts are seeded or created administratively (public registration is disabled).

### Tech Stack
- **Backend**: Node.js + Express.js (RESTful APIs)
- **Database**: MySQL 8 (Mandatory, using `mysql2/promise` connection pool, no ORM)
- **Authentication**: JSON Web Token (JWT) + bcrypt password hashing
- **File Upload**: Multer with extension + MIME-type dual validation & storage abstraction (`src/utils/storage.js`)
- **Security & Validation**: Helmet, CORS, parameterized SQL queries, express-validator
- **Frontend** *(Upcoming Milestone)*: React (Vite) + Tailwind CSS

---

## 2. Project Directory Structure

```text
dd22/
├── backend/
│   ├── sql/
│   │   ├── schema.sql              # MySQL DDL for all 9 tables + compound & fulltext indexes
│   │   └── seed.sql                # Departments, subjects, resource types, staff & demo resources
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js               # mysql2/promise connection pool
│   │   │   └── env.js              # Environment variable loader & defaults
│   │   ├── controllers/
│   │   │   ├── authController.js   # register, login, getProfile, updateProfile
│   │   │   ├── categoryController.js # CRUD for departments, subjects, resource types, academic years
│   │   │   ├── resourceController.js # Upload, search, filter, paginate, archive, download tracking
│   │   │   └── staffController.js  # Staff route handlers & ping
│   │   ├── middleware/
│   │   │   ├── auth.js             # verifyToken & requireRole RBAC middleware
│   │   │   ├── errorHandler.js     # 404 handler and centralized JSON error handler
│   │   │   ├── upload.js           # Multer file validation (ext + MIME + size)
│   │   │   └── validate.js         # express-validator request validation chains
│   │   ├── routes/
│   │   │   ├── authRoutes.js       # /api/auth routes
│   │   │   ├── categoryRoutes.js   # /api/departments, /api/subjects, /api/resource-types, /api/academic-years
│   │   │   ├── resourceRoutes.js   # /api/resources routes (public & staff management)
│   │   │   └── staffRoutes.js      # /api/staff routes (RBAC protected)
│   │   ├── utils/
│   │   │   ├── hashPassword.js     # CLI tool to generate bcrypt hashes
│   │   │   └── storage.js          # File storage abstraction (disk/Cloudinary ready)
│   │   ├── app.js                  # Express app & middleware composition
│   │   └── server.js               # HTTP server listener & DB connection check
│   ├── uploads/                    # Local storage directory for uploaded documents
│   ├── .env.example                # Environment variable template
│   └── package.json                # Backend dependencies and scripts
├── frontend/                       # Placeholder for upcoming React application
├── .gitignore                      # Git ignore rules (.env, node_modules, uploads)
└── README.md                       # Setup guide, API documentation table & viva reference
```

---

## 3. Database Schema & Tables

The system uses 9 normalized relational tables:
1. `departments` (`id`, `name UNIQUE`, `created_at`)
2. `users` (`id`, `name`, `email UNIQUE`, `password_hash`, `role ENUM('student','staff')`, `department_id`, `created_at`)
3. `subjects` (`id`, `name`, `department_id`, `year`, `semester`, `created_at`)
4. `resource_types` (`id`, `name UNIQUE`, `created_at`)
5. `resources` (`id`, `title`, `description`, `subject_id`, `resource_type_id`, `uploaded_by`, `file_path`, `academic_year`, `status ENUM('PENDING','UNDER_REVIEW','VERIFIED','PUBLISHED','REJECTED','ARCHIVED')`, `created_at`)
   - Compound index on `(subject_id, resource_type_id, status, academic_year)`
   - FULLTEXT index on `(title, description)`
6. `resource_requests` (`id`, `student_id`, `subject_id`, `title`, `description`, `status ENUM('PENDING','COMPLETED','CLOSED')`, `staff_remarks`, `created_at`)
7. `bookmarks` (`id`, `student_id`, `resource_id`, `created_at`, `UNIQUE(student_id, resource_id)`)
8. `resource_downloads` (`id`, `student_id`, `resource_id`, `downloaded_at`)
9. `resource_reviews` (`id`, `resource_id`, `staff_id`, `status ENUM(...)`, `remarks`, `reviewed_at`)

---

## 4. API Reference Table

| Method | Endpoint | Access Role | Purpose / Description |
|---|---|---|---|
| **GET** | `/api/health` | Public | Health check & environment status |
| **POST** | `/api/auth/register` | Public (Student) | Self-registration for students (role forced to `student`) |
| **POST** | `/api/auth/login` | Public | Authenticates student/staff and returns JWT token |
| **GET** | `/api/auth/me` | Authenticated | Fetches profile of currently logged-in user |
| **PUT** | `/api/auth/profile` | Authenticated | Updates name and/or department of logged-in user |
| **GET** | `/api/staff/ping` | Staff only | Verification ping endpoint for RBAC |
| **GET** | `/api/staff/resources` | Staff only | Staff view of all resources across all statuses with search/pagination |
| **GET** | `/api/departments` | Authenticated | Lists all academic departments |
| **POST** | `/api/departments` | Staff only | Creates a new department |
| **PUT** | `/api/departments/:id` | Staff only | Updates department name |
| **DELETE** | `/api/departments/:id` | Staff only | Deletes a department (returns 409 if in use) |
| **GET** | `/api/subjects` | Authenticated | Lists subjects (optional filters: `department_id`, `year`, `semester`) |
| **POST** | `/api/subjects` | Staff only | Creates a new subject |
| **PUT** | `/api/subjects/:id` | Staff only | Updates subject details |
| **DELETE** | `/api/subjects/:id` | Staff only | Deletes a subject (returns 409 if in use) |
| **GET** | `/api/resource-types` | Authenticated | Lists all 8 resource types |
| **POST** | `/api/resource-types` | Staff only | Creates a new resource type |
| **PUT** | `/api/resource-types/:id`| Staff only | Updates a resource type name |
| **DELETE** | `/api/resource-types/:id`| Staff only | Deletes a resource type (returns 409 if in use) |
| **GET** | `/api/academic-years` | Authenticated | Returns distinct academic years from resources (e.g. `['2026-27']`) |
| **GET** | `/api/resources` | Authenticated | Search & browse resources (students only see `PUBLISHED`; supports `q`, filters, pagination, sort) |
| **GET** | `/api/resources/:id` | Authenticated | Returns full metadata for a resource (student gets 404 if not `PUBLISHED`) |
| **GET** | `/api/resources/:id/download` | Authenticated | Tracks download for students, then streams file safely |
| **POST** | `/api/resources` | Staff only | Uploads a new resource (multipart: file + metadata, status `PUBLISHED`) |
| **PUT** | `/api/resources/:id` | Staff only | Updates metadata or replaces the uploaded document |
| **PATCH**| `/api/resources/:id/archive` | Staff only | Archives an outdated or retired resource |
| **DELETE**| `/api/resources/:id` | Staff only | Deletes resource and removes physical file from disk |

---

## 5. Daily Commands: Starting & Stopping

### 1. Portable MySQL (Port 3307)
```cmd
# Start
D:\mysql-portable\start-mysql.bat

# Stop
D:\mysql-portable\stop-mysql.bat
```

### 2. Backend Server
```powershell
cd D:\dd22\backend
npm run dev
```

---

## 6. Viva-Ready Technical Explanations

### Dynamic Search & Filtering Implementation
- **FULLTEXT with LIKE Fallback**: In `resourceController.js`, queries use MySQL's `MATCH(r.title, r.description) AGAINST(? IN BOOLEAN MODE)` utilizing the composite FULLTEXT index. Because InnoDB full-text token indexing has a minimum word length threshold (typically 3–4 characters), queries with terms shorter than 4 characters (e.g. "AI", "OS", "DB") gracefully fall back to `(r.title LIKE ? OR r.description LIKE ?)`.
- **Relational Joins**: Filters for `department`, `year`, and `semester` are resolved by `JOIN subjects s ON r.subject_id = s.id` and `JOIN departments d ON s.department_id = d.id`.
- **SQL Injection Prevention**: Every user-supplied filter value is pushed to a `params` array and passed to `pool.query(sql, params)`. The `sort` parameter is strictly whitelisted against allowed column mappings (`newest`, `oldest`, `title`).
- **Student Data Isolation**: For `GET /api/resources`, `r.status = 'PUBLISHED'` is hardcoded into the query criteria, ensuring students can never inspect unapproved, pending, or archived resources.

### File Upload & Validation Architecture
- **Dual Validation**: `middleware/upload.js` inspects both the file extension (`.pdf, .doc, .docx, .ppt, .pptx, .xls, .xlsx, .txt, .zip`) and the HTTP `Content-Type` MIME header. Executable binaries (e.g., `.exe`, `.bat`, `.sh`) are rejected with an explicit HTTP 400.
- **Size Limitation**: The upload size limit is enforced by Multer via `MAX_FILE_SIZE_MB` (default: 10 MB) configured in `.env`.
- **Protected Storage Abstraction**: Files are saved with a cryptographically generated prefix (`<random_hex>-<timestamp><ext>`) via `utils/storage.js`. Uploads are **never served statically**; clients can only download files through the authenticated `/api/resources/:id/download` route, ensuring access checks and audit tracking.
- **Cloud Readiness**: Moving to Cloudinary or AWS S3 in deployment only requires updating `utils/storage.js` without modifying any route or controller code.
