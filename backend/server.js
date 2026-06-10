const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());

// Database Connection Setup
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_db',
    port: process.env.DB_PORT || 3306
});

db.connect(err => {
    if (err) console.error("Database connection failed:", err);
    else console.log("✅ Connected to MySQL Database securely.");
});

// ==========================================
// --- 1. LOGIN ROUTE ---
// ==========================================
app.post('/api/login', (req, res) => {
    const { role, identifier, password, campusId, section } = req.body;
    
    if (!role || !identifier || !password) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const normalizedRole = role.toLowerCase();

    let sql = `
        SELECT u.*, s.name AS section_name
        FROM users u
        LEFT JOIN sections s ON u.section_id = s.id
        WHERE u.email_or_id = ? AND u.role = ?
    `;
    let params = [identifier.trim(), normalizedRole];

    sql += " AND u.password = ?";
    params.push(password);

    if (normalizedRole === 'student') {
        if (campusId) {
            sql += " AND u.campus_id = ?";
            params.push(parseInt(campusId, 10));
        }
        if (section) {
            sql += " AND u.section_id = ?";
            params.push(parseInt(section, 10));
        }
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Login error:", err);
            return res.status(500).json({ error: err.sqlMessage });
        }
        
        if (results.length > 0) {
            const userMatch = results[0];
            const { password: _, ...userWithoutPassword } = userMatch;
            res.json({ success: true, user: userWithoutPassword });
        } else {
            res.status(401).json({ success: false, message: "Invalid authentication credentials." });
        }
    });
});

// ==========================================
// --- 2. STUDENT MANAGEMENT ---
// ==========================================

app.get('/api/admin/students', (req, res) => {
    const sql = `
        SELECT 
            u.id, 
            u.name,
            u.email_or_id, 
            u.password,
            u.campus_id,
            u.dept_id,
            u.section_id,
            c.name AS campus_name, 
            d.name AS dept_name, 
            s.name AS section_name
        FROM users u
        LEFT JOIN campuses c ON u.campus_id = c.id
        LEFT JOIN departments d ON u.dept_id = d.dept_id
        LEFT JOIN sections s ON u.section_id = s.id
        WHERE u.role = 'student'
        ORDER BY u.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ STUDENT RETRIEVAL ERROR:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/admin/students', (req, res) => {
    const { name, email_or_id, password, campus_id, dept_id, section_id } = req.body;
    
    if (!email_or_id) {
        return res.status(400).json({ error: "Student ID is required." });
    }

    const finalPassword = password && password.trim() !== '' ? password.trim() : '123456';

    const sql = `
        INSERT INTO users (name, email_or_id, password, role, campus_id, dept_id, section_id) 
        VALUES (?, ?, ?, 'student', ?, ?, ?)
    `;
    
    db.query(sql, [
        name ? name.trim() : "Unknown Student", 
        email_or_id.trim(), 
        finalPassword, 
        campus_id ? parseInt(campus_id, 10) : null, 
        dept_id ? parseInt(dept_id, 10) : null, 
        section_id ? parseInt(section_id, 10) : null
    ], (err, result) => {
        if (err) {
            console.error("❌ INSERT ERROR:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        res.json({ success: true, message: "Student registered successfully!", id: result.insertId });
    });
});

app.put('/api/admin/students/:id', (req, res) => {
    const { id } = req.params;
    const { name, email_or_id, password, campus_id, dept_id, section_id } = req.body;

    const sql = `
        UPDATE users 
        SET name = ?, email_or_id = ?, password = ?, campus_id = ?, dept_id = ?, section_id = ? 
        WHERE id = ? AND role = 'student'
    `;

    db.query(sql, [
        name ? name.trim() : "Unknown Student", 
        email_or_id ? email_or_id.trim() : "", 
        password, 
        campus_id ? parseInt(campus_id, 10) : null, 
        dept_id ? parseInt(dept_id, 10) : null, 
        section_id ? parseInt(section_id, 10) : null, 
        id
    ], (err, result) => {
        if (err) {
            console.error("❌ UPDATE ERROR:", err);
            return res.status(500).json({ error: err.sqlMessage || err.message });
        }
        res.json({ success: true, message: "Student profile updated!" });
    });
});

app.post('/api/admin/import-students', (req, res) => {
    const studentsArray = req.body;

    if (!Array.isArray(studentsArray) || studentsArray.length === 0) {
        return res.status(400).json({ error: "Payload is empty or invalid." });
    }

    const validStudents = studentsArray.filter(s => s.email_or_id && String(s.email_or_id).trim() !== "");

    if (validStudents.length === 0) {
        return res.status(400).json({ error: "No valid student profiles found." });
    }

    const getCampuses = "SELECT id, LOWER(TRIM(name)) AS name FROM campuses";
    const getDepts = "SELECT dept_id, LOWER(TRIM(name)) AS name FROM departments";
    const getSections = "SELECT id, LOWER(TRIM(name)) AS name FROM sections";

    db.query(getCampuses, (camErr, camRows) => {
        if (camErr) return res.status(500).json({ error: "Failed to fetch campuses." });

        db.query(getDepts, (deptErr, deptRows) => {
            if (deptErr) return res.status(500).json({ error: "Failed to fetch departments." });

            db.query(getSections, (secErr, secRows) => {
                if (secErr) return res.status(500).json({ error: "Failed to fetch sections." });

                const campusMap = {};
                camRows.forEach(row => { if (row.name) campusMap[row.name] = row.id; });

                const deptMap = {};
                deptRows.forEach(row => { if (row.name) deptMap[row.name] = row.dept_id; });

                const sectionMap = {};
                secRows.forEach(row => { if (row.name) sectionMap[row.name] = row.id; });

                const values = validStudents.map(s => {
                    const csvCampus = s.campus_name ? String(s.campus_name).toLowerCase().trim() : '';
                    const csvDept = s.dept_name ? String(s.dept_name).toLowerCase().trim() : '';
                    const csvSection = s.section_name ? String(s.section_name).toLowerCase().trim() : '';

                    return [
                        s.name ? String(s.name).trim() : '',
                        String(s.email_or_id).trim(),
                        s.password ? String(s.password).trim() : '123456', 
                        campusMap[csvCampus] || null,   
                        deptMap[csvDept] || null,     
                        sectionMap[csvSection] || null,  
                        'student'
                    ];
                });

                const sql = "INSERT INTO users (name, email_or_id, password, campus_id, dept_id, section_id, role) VALUES ?";
                db.query(sql, [values], (err, result) => {
                    if (err) {
                        console.error("Import Error:", err);
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ success: true, message: `Successfully imported ${result.affectedRows} students!` });
                });
            });
        });
    });
});

app.delete('/api/admin/students/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM users WHERE id = ? AND role = 'student'";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Student deleted successfully!" });
    });
});

app.post('/api/admin/students/bulk-delete', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No student IDs provided" });
    }
    const sql = "DELETE FROM users WHERE id IN (?) AND role = 'student'";
    db.query(sql, [ids], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `${result.affectedRows} students deleted successfully!` });
    });
});

// ==========================================
// --- 3. CAMPUS MANAGEMENT ---
// ==========================================
app.get('/api/admin/campuses', (req, res) => {
    db.query("SELECT * FROM campuses", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/admin/campuses', (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: "Campus name required." });
    }
    const sql = "INSERT INTO campuses (name) VALUES (?)";
    db.query(sql, [name.trim()], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Campus added successfully!" });
    });
});

app.put('/api/admin/campuses/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Campus name required." });
    db.query("UPDATE campuses SET name = ? WHERE id = ?", [name, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Campus updated successfully!" });
    });
});

app.delete('/api/admin/campuses/:id', (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM campuses WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Campus deleted successfully!" });
    });
});

// ==========================================
// --- 4. DEPARTMENTS ---
// ==========================================
app.get('/api/admin/departments', (req, res) => {
    db.query("SELECT dept_id, name, code, location FROM departments ORDER BY name ASC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/admin/departments', (req, res) => {
    const { name, code, location } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: "Department name required." });
    }
    const sql = "INSERT INTO departments (name, code, location) VALUES (?, ?, ?)";
    db.query(sql, [name.trim(), code || null, location || null], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Department added successfully!" });
    });
});

app.put('/api/admin/departments/:id', (req, res) => {
    const { id } = req.params;
    const { name, code, location } = req.body;
    const sql = "UPDATE departments SET name = ?, code = ?, location = ? WHERE dept_id = ?";
    db.query(sql, [name, code, location, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Department updated successfully!" });
    });
});

app.delete('/api/admin/departments/:id', (req, res) => {
    db.query("DELETE FROM departments WHERE dept_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// --- 5. SECTIONS ---
// ==========================================
app.get('/api/admin/sections', (req, res) => {
    const sql = `
        SELECT s.id, s.name, s.campus_id, c.name AS campus_name 
        FROM sections s
        LEFT JOIN campuses c ON s.campus_id = c.id
        ORDER BY s.name ASC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// --- 6. INSTRUCTORS ---
// ==========================================
app.get('/api/admin/instructors', (req, res) => {
    const sql = `
        SELECT 
            i.instructor_id, 
            i.name, 
            i.email as email_or_id,
            i.dept_id,
            d.name as dept_name
        FROM instructor i 
        LEFT JOIN departments d ON i.dept_id = d.dept_id
        ORDER BY i.name ASC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/admin/instructors', (req, res) => {
    const { name, email, password, dept_id } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
    }
    
    const userSql = "INSERT INTO users (name, email_or_id, password, role) VALUES (?, ?, ?, 'instructor')";
    db.query(userSql, [name, email, password], (err, userResult) => {
        if (err) return res.status(500).json({ error: "Failed to create user account" });
        
        const userId = userResult.insertId;
        const insSql = "INSERT INTO instructor (name, email, password, user_id, dept_id) VALUES (?, ?, ?, ?, ?)";
        db.query(insSql, [name, email, password, userId, dept_id || null], (err) => {
            if (err) return res.status(500).json({ error: "Failed to create instructor profile" });
            res.json({ success: true, message: "Instructor created successfully!" });
        });
    });
});

app.put('/api/admin/instructors/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, dept_id } = req.body;
    const sql = "UPDATE instructor SET name = ?, email = ?, dept_id = ? WHERE instructor_id = ?";
    db.query(sql, [name, email, dept_id || null, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Instructor updated successfully!" });
    });
});

app.delete('/api/admin/instructors/:id', (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM instructor WHERE instructor_id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// --- 7. COURSES ---
// ==========================================
app.get('/api/admin/courses-detailed', (req, res) => {
    const sql = `
        SELECT 
            c.id, c.course_name, c.course_code, c.dept_id, c.section_id, c.instructor_id,
            d.name AS dept_name, i.name AS instructor_name, s.name AS section_name, cam.name AS campus_name
        FROM courses c 
        LEFT JOIN departments d ON c.dept_id = d.dept_id
        LEFT JOIN instructor i ON c.instructor_id = i.instructor_id 
        LEFT JOIN sections s ON c.section_id = s.id
        LEFT JOIN campuses cam ON s.campus_id = cam.id
        ORDER BY c.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/admin/courses', (req, res) => {
    db.query("SELECT * FROM courses", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/admin/courses', (req, res) => {
    const { course_name, course_code, dept_id, instructor_id, section_id } = req.body;
    if (!course_name) return res.status(400).json({ error: "Course Name is required!" });
    if (!dept_id) return res.status(400).json({ error: "Department is required!" });
    if (!section_id) return res.status(400).json({ error: "Section is required!" });

    const sql = `INSERT INTO courses (course_name, course_code, dept_id, instructor_id, section_id) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [course_name, course_code || null, dept_id, instructor_id || null, section_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Course created successfully!", id: result.insertId });
    });
});

app.put('/api/admin/courses/:id', (req, res) => {
    const { id } = req.params;
    const { course_name, course_code, dept_id, instructor_id, section_id } = req.body;
    const sql = `UPDATE courses SET course_name = ?, course_code = ?, dept_id = ?, instructor_id = ?, section_id = ? WHERE id = ?`;
    db.query(sql, [course_name, course_code || null, dept_id || null, instructor_id || null, section_id || null, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Course updated successfully!" });
    });
});

app.post('/api/admin/courses/:id/assign', (req, res) => {
    const { id } = req.params;
    const { instructor_id } = req.body;
    const sql = "UPDATE courses SET instructor_id = ? WHERE id = ?";
    db.query(sql, [instructor_id, id], (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to assign instructor." });
        res.json({ success: true, message: "Instructor assigned successfully!" });
    });
});

// ==========================================
// --- 8. BULK COURSE ASSIGNMENT ---
// ==========================================
app.post('/api/admin/courses/bulk-assign-section', (req, res) => {
    const { course_ids, section_id } = req.body;
    if (!course_ids || !Array.isArray(course_ids) || course_ids.length === 0) {
        return res.status(400).json({ error: "Please select at least one course" });
    }
    const placeholders = course_ids.map(() => '?').join(',');
    const sql = `UPDATE courses SET section_id = ? WHERE id IN (${placeholders})`;
    db.query(sql, [section_id, ...course_ids], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Assigned ${result.affectedRows} course(s) to section` });
    });
});

// ==========================================
// --- 9. PERFORMANCE ---
// ==========================================
app.get('/api/admin/performance', (req, res) => {
    const sql = `
        SELECT 
            i.instructor_id, 
            i.name as instructor_name, 
            d.name as department,
            i.dept_id as department_id,
            COUNT(DISTINCT e.id) as total_evaluations,
            ROUND(COALESCE(AVG(e.rating), 0), 2) as average_rating
        FROM instructor i
        LEFT JOIN departments d ON i.dept_id = d.dept_id
        LEFT JOIN courses c ON c.instructor_id = i.instructor_id
        LEFT JOIN evaluations e ON e.course_id = c.id
        GROUP BY i.instructor_id, i.name, d.name, i.dept_id
        ORDER BY average_rating DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Performance error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get('/api/instructor/performance/:instructorId', (req, res) => {
    const { instructorId } = req.params;
    db.query('SELECT user_id FROM instructor WHERE instructor_id = ?', [instructorId], (err, mapRows) => {
        const userFk = (mapRows && mapRows[0]) ? mapRows[0].user_id : parseInt(instructorId, 10);
        const statsSql = `SELECT AVG(e.rating) as overall_rating, COUNT(DISTINCT e.student_id) as total_evaluations FROM evaluations e WHERE e.instructor_id = ?`;
        db.query(statsSql, [userFk], (err, statsResults) => {
            res.json({ summary: statsResults[0] || { overall_rating: 0, total_evaluations: 0 }, comments: [] });
        });
    });
});

// ==========================================
// --- 10. STUDENT DASHBOARD ---
// ==========================================
app.get('/api/courses/section/:sectionId', (req, res) => {
    const sql = "SELECT id, course_name, course_code FROM courses WHERE section_id = ?";
    db.query(sql, [req.params.sectionId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Get rating distribution for a course
app.get('/api/courses/:id/distribution', (req, res) => {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) return res.status(400).json({ error: 'Invalid course id' });

    const sql = `
        SELECT rating, COUNT(*) as count
        FROM evaluations
        WHERE course_id = ? AND rating IS NOT NULL
        GROUP BY rating
    `;

    db.query(sql, [courseId], (err, rows) => {
        if (err) {
            console.error('Distribution query error:', err);
            return res.status(500).json({ error: err.message });
        }

        // build counts for ratings 1..5
        const counts = { 1:0, 2:0, 3:0, 4:0, 5:0 };
        let total = 0;
        (rows || []).forEach(r => {
            const rt = Number(r.rating);
            const c = Number(r.count) || 0;
            if (rt >=1 && rt <=5) {
                counts[rt] = c;
                total += c;
            }
        });

        const percentages = {};
        for (let i=1;i<=5;i++) {
            percentages[i] = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
        }

        res.json({ total, counts, percentages });
    });
});

// ==========================================
// --- 11. EVALUATIONS (FIXED - NO FOREIGN KEY ISSUE) ---
// ==========================================

// Check if already evaluated
app.get('/api/evaluations/check', (req, res) => {
    const { student_id, course_id } = req.query;
    
    if (!student_id || !course_id) {
        return res.status(400).json({ error: "Missing student_id or course_id" });
    }
    
    const sql = "SELECT id FROM evaluations WHERE student_id = ? AND course_id = ? LIMIT 1";
    db.query(sql, [student_id, course_id], (err, results) => {
        if (err) {
            console.error("Check evaluation error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ completed: results.length > 0 });
    });
});

// Setup evaluation form
app.get('/api/setup-eval/:courseId', (req, res) => {
    const { courseId } = req.params;
    
    const courseSql = `
        SELECT 
            c.id, 
            c.course_name, 
            c.course_code,
            i.instructor_id,
            i.name AS instructor_name
        FROM courses c 
        LEFT JOIN instructor i ON c.instructor_id = i.instructor_id 
        WHERE c.id = ?
    `;
    
    db.query(courseSql, [courseId], (err, courseResult) => {
        if (err) {
            console.error("Course fetch error:", err);
            return res.status(500).json({ error: err.message });
        }
        
        if (courseResult.length === 0) {
            return res.status(404).json({ message: "Course not found" });
        }
        
        const criteriaSql = "SELECT id, question FROM criteria ORDER BY id";
        db.query(criteriaSql, (err, criteriaResults) => {
            if (err) {
                console.error("Criteria fetch error:", err);
                return res.status(500).json({ error: err.message });
            }
            
            res.json({ 
                course: courseResult[0], 
                questions: criteriaResults 
            });
        });
    });
});

// Submit evaluation (with NULL instructor_id to avoid foreign key issues)
app.post('/api/evaluations/submit', (req, res) => {
    const { student_id, course_id, ratings, comments } = req.body;

    if (!student_id || !course_id || !ratings || Object.keys(ratings).length === 0) {
        return res.status(400).json({ error: "Missing student, course, or ratings data." });
    }

    const parsedStudentId = parseInt(student_id, 10);
    const parsedCourseId = parseInt(course_id, 10);
    
    if (isNaN(parsedStudentId) || isNaN(parsedCourseId)) {
        return res.status(400).json({ error: "Invalid student or course identifier." });
    }

    // Check if already evaluated
    const checkSql = "SELECT id FROM evaluations WHERE student_id = ? AND course_id = ? LIMIT 1";
    db.query(checkSql, [parsedStudentId, parsedCourseId], (checkErr, checkRows) => {
        if (checkErr) {
            console.error('EVALUATION DUPLICATE CHECK ERROR:', checkErr);
            return res.status(500).json({ error: 'Failed to validate prior evaluation status.' });
        }

        if (checkRows && checkRows.length > 0) {
            return res.status(409).json({ error: 'You have already evaluated this course.' });
        }

        const instructorSql = `
            SELECT c.instructor_id
            FROM courses c
            WHERE c.id = ?
            LIMIT 1
        `;

        db.query(instructorSql, [parsedCourseId], (instErr, instRows) => {
            if (instErr) {
                console.error('FETCH INSTRUCTOR ID ERROR:', instErr);
                return res.status(500).json({ error: 'Failed to determine instructor for this course.' });
            }

            const finalInstructorId = instRows && instRows[0] ? instRows[0].instructor_id : null;

            const values = Object.entries(ratings).map(([criteria_id, rating]) => [
                parsedStudentId,
                finalInstructorId,
                parsedCourseId,
                parseInt(criteria_id, 10),
                parseInt(rating, 10),
                comments || ""
            ]);

            const insertSql = "INSERT INTO evaluations (student_id, instructor_id, course_id, criteria_id, rating, comments) VALUES ?";
            db.query(insertSql, [values], (err, result) => {
                if (err) {
                    console.error('EVALUATION SUBMIT ERROR:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.json({ success: true, message: "Evaluation submitted successfully!" });
            });
        });
    });
});

// ==========================================
// --- 12. SYSTEM USERS MANAGEMENT ---
// ==========================================

app.get('/api/admin/system-users', (req, res) => {
    const queryUsers = `
        SELECT id, name, email_or_id, password, role 
        FROM users 
        WHERE role IN ('admin', 'department', 'superadmin')
    `;
    
    const queryInstructors = `
        SELECT instructor_id AS id, name, email AS email_or_id, password, 'instructor' AS role 
        FROM instructor
    `;

    db.query(queryUsers, (err, usersRows) => {
        if (err) {
            console.error("❌ ERROR FETCHING USERS:", err);
            return res.status(500).json({ error: err.message });
        }

        db.query(queryInstructors, (instErr, instRows) => {
            if (instErr) {
                console.error("❌ ERROR FETCHING INSTRUCTORS:", instErr);
                return res.json(usersRows || []);
            }

            const allUsers = [...(usersRows || []), ...(instRows || [])];
            res.json(allUsers);
        });
    });
});

app.post('/api/admin/system-users', (req, res) => {
    const { name, email_or_id, password, role, dept_id } = req.body;

    if (!name || !email_or_id || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    if (role === 'instructor') {
        const userSql = "INSERT INTO users (name, email_or_id, password, role) VALUES (?, ?, ?, 'instructor')";
        db.query(userSql, [name, email_or_id, password], (err, userResult) => {
            if (err) {
                console.error("User creation error:", err);
                return res.status(500).json({ error: err.message });
            }
            
            const newUserId = userResult.insertId;
            const insSql = "INSERT INTO instructor (name, email, password, user_id, dept_id) VALUES (?, ?, ?, ?, ?)";
            db.query(insSql, [name, email_or_id, password, newUserId, dept_id || null], (insErr) => {
                if (insErr) {
                    console.error("Instructor creation error:", insErr);
                    return res.status(500).json({ error: insErr.message });
                }
                res.json({ success: true, message: "Instructor created successfully!" });
            });
        });
    } else {
        const checkSql = "SELECT * FROM users WHERE email_or_id = ?";
        db.query(checkSql, [email_or_id], (err, exists) => {
            if (exists && exists.length > 0) {
                return res.status(400).json({ error: "Email/ID already exists" });
            }
            
            const userSql = "INSERT INTO users (name, email_or_id, password, role) VALUES (?, ?, ?, ?)";
            db.query(userSql, [name, email_or_id, password, role], (userErr) => {
                if (userErr) {
                    console.error("User creation error:", userErr);
                    return res.status(500).json({ error: userErr.message });
                }
                res.json({ success: true, message: "User created successfully!" });
            });
        });
    }
});

app.put('/api/admin/system-users/:id/:role', (req, res) => {
    const { id, role } = req.params;
    const { name, email_or_id, password } = req.body;

    if (!name || !email_or_id || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    if (role === 'instructor') {
        const sql = "UPDATE instructor SET name = ?, email = ?, password = ? WHERE instructor_id = ?";
        db.query(sql, [name, email_or_id, password, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Instructor updated successfully!" });
        });
    } else {
        const sql = "UPDATE users SET name = ?, email_or_id = ?, password = ? WHERE id = ? AND role = ?";
        db.query(sql, [name, email_or_id, password, id, role], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "User updated successfully!" });
        });
    }
});

app.delete('/api/admin/system-users/:id/:role', (req, res) => {
    const { id, role } = req.params;

    if (role === 'instructor') {
        db.query("DELETE FROM instructor WHERE instructor_id = ?", [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Instructor deleted successfully!" });
        });
    } else {
        db.query("DELETE FROM users WHERE id = ? AND role = ?", [id, role], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "User deleted successfully!" });
        });
    }
});

// ==========================================
// --- 13. INSTRUCTOR RESULTS ---
// ==========================================

app.get('/api/instructor/results', (req, res) => {
    const userId = parseInt(req.query.user_id, 10);
    
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "user_id query parameter required" });
    }

    const findInstructorSql = `
        SELECT i.instructor_id, i.name, i.user_id
        FROM instructor i
        WHERE i.user_id = ?
    `;
    
    db.query(findInstructorSql, [userId], (err, instructorRows) => {
        if (err) {
            console.error("Instructor lookup error:", err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!instructorRows || instructorRows.length === 0) {
            return res.status(404).json({ error: "Instructor profile not found for this user" });
        }
        
        const instructor = instructorRows[0];
        const instructorId = instructor.instructor_id;
        
        const coursesSql = `
            SELECT 
                c.id as course_id,
                c.course_name,
                c.course_code,
                COUNT(DISTINCT e.id) as total_evaluations,
                ROUND(COALESCE(AVG(e.rating), 0), 2) as average_rating,
                COUNT(DISTINCT e.student_id) as unique_students
            FROM courses c
            LEFT JOIN evaluations e ON e.course_id = c.id
            WHERE c.instructor_id = ?
            GROUP BY c.id, c.course_name, c.course_code
            ORDER BY c.course_name ASC
        `;
        
        db.query(coursesSql, [instructorId], (err, courseResults) => {
            if (err) {
                console.error("Courses fetch error:", err);
                return res.status(500).json({ error: err.message });
            }
            
            const summarySql = `
                SELECT 
                    COUNT(DISTINCT e.id) as totalEvaluations,
                    ROUND(COALESCE(AVG(e.rating), 0), 2) as averageRating,
                    COUNT(DISTINCT e.student_id) as uniqueStudents,
                    COUNT(DISTINCT e.course_id) as courseCount
                FROM evaluations e
                LEFT JOIN courses c ON e.course_id = c.id
                WHERE c.instructor_id = ?
            `;
            
            db.query(summarySql, [instructorId], (err, summaryResults) => {
                if (err) {
                    console.error("Summary error:", err);
                    return res.status(500).json({ error: err.message });
                }
                
                const summary = summaryResults[0] || { 
                    totalEvaluations: 0, 
                    averageRating: 0, 
                    uniqueStudents: 0, 
                    courseCount: 0 
                };
                
                res.json({
                    courses: courseResults || [],
                    evaluations: courseResults || [],
                    summary: summary
                });
            });
        });
    });
});

// ==========================================
// --- SEMESTER RESET / BULK UNLINK FEATURE ---
// ==========================================

// 1. Unlink all instructors from courses
app.post('/api/admin/reset/instructor-courses', (req, res) => {
    const sql = "UPDATE courses SET instructor_id = NULL WHERE instructor_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Reset instructor-courses error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            success: true, 
            message: `Successfully unlinked ${result.affectedRows} instructor-course relationships`,
            affectedRows: result.affectedRows
        });
    });
});

// 2. Unlink all courses from sections
app.post('/api/admin/reset/course-sections', (req, res) => {
    const sql = "UPDATE courses SET section_id = NULL WHERE section_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Reset course-sections error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            success: true, 
            message: `Successfully unlinked ${result.affectedRows} course-section relationships`,
            affectedRows: result.affectedRows
        });
    });
});

// 3. Unlink all students from sections
app.post('/api/admin/reset/student-sections', (req, res) => {
    const sql = "UPDATE users SET section_id = NULL WHERE role = 'student' AND section_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Reset student-sections error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            success: true, 
            message: `Successfully unlinked ${result.affectedRows} student-section relationships`,
            affectedRows: result.affectedRows
        });
    });
});

// 4. Complete Semester Reset (all three operations)
app.post('/api/admin/reset/semester', async (req, res) => {
    const results = {
        instructorCourses: 0,
        courseSections: 0,
        studentSections: 0
    };
    
    try {
        // Unlink instructors from courses
        const [instResult] = await db.promise().query("UPDATE courses SET instructor_id = NULL WHERE instructor_id IS NOT NULL");
        results.instructorCourses = instResult.affectedRows;
        
        // Unlink courses from sections
        const [courseResult] = await db.promise().query("UPDATE courses SET section_id = NULL WHERE section_id IS NOT NULL");
        results.courseSections = courseResult.affectedRows;
        
        // Unlink students from sections
        const [studentResult] = await db.promise().query("UPDATE users SET section_id = NULL WHERE role = 'student' AND section_id IS NOT NULL");
        results.studentSections = studentResult.affectedRows;
        
        res.json({ 
            success: true, 
            message: "Semester reset completed successfully!",
            details: results
        });
    } catch (err) {
        console.error("Semester reset error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Get current linkage statistics
app.get('/api/admin/reset/stats', (req, res) => {
    const queries = {
        instructorCourses: "SELECT COUNT(*) as count FROM courses WHERE instructor_id IS NOT NULL",
        courseSections: "SELECT COUNT(*) as count FROM courses WHERE section_id IS NOT NULL",
        studentSections: "SELECT COUNT(*) as count FROM users WHERE role = 'student' AND section_id IS NOT NULL"
    };
    
    db.query(queries.instructorCourses, (err, instResult) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query(queries.courseSections, (err, courseResult) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.query(queries.studentSections, (err, studentResult) => {
                if (err) return res.status(500).json({ error: err.message });
                
                res.json({
                    instructorCoursesLinked: instResult[0].count,
                    courseSectionsLinked: courseResult[0].count,
                    studentSectionsLinked: studentResult[0].count
                });
            });
        });
    });
});
// ==========================================
// --- SEMESTER RESET / BULK UNLINK FEATURE ---
// ==========================================

// 1. Unlink all instructors from courses
app.post('/api/admin/reset/instructor-courses', (req, res) => {
    const sql = "UPDATE courses SET instructor_id = NULL WHERE instructor_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Unlinked ${result.affectedRows} instructor-course relationships` });
    });
});

// 2. Unlink all courses from sections
app.post('/api/admin/reset/course-sections', (req, res) => {
    const sql = "UPDATE courses SET section_id = NULL WHERE section_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Unlinked ${result.affectedRows} course-section relationships` });
    });
});

// 3. Unlink all students from sections
app.post('/api/admin/reset/student-sections', (req, res) => {
    const sql = "UPDATE users SET section_id = NULL WHERE role = 'student' AND section_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Unlinked ${result.affectedRows} student-section relationships` });
    });
});

// 4. Complete Semester Reset
app.post('/api/admin/reset/semester', (req, res) => {
    const queries = [
        "UPDATE courses SET instructor_id = NULL WHERE instructor_id IS NOT NULL",
        "UPDATE courses SET section_id = NULL WHERE section_id IS NOT NULL", 
        "UPDATE users SET section_id = NULL WHERE role = 'student' AND section_id IS NOT NULL"
    ];
    
    let results = { instructorCourses: 0, courseSections: 0, studentSections: 0 };
    
    db.query(queries[0], (err, result1) => {
        if (err) return res.status(500).json({ error: err.message });
        results.instructorCourses = result1.affectedRows;
        
        db.query(queries[1], (err, result2) => {
            if (err) return res.status(500).json({ error: err.message });
            results.courseSections = result2.affectedRows;
            
            db.query(queries[2], (err, result3) => {
                if (err) return res.status(500).json({ error: err.message });
                results.studentSections = result3.affectedRows;
                res.json({ success: true, message: "Semester reset completed!", details: results });
            });
        });
    });
});

// 5. Get current linkage statistics
app.get('/api/admin/reset/stats', (req, res) => {
    const queries = {
        instructorCourses: "SELECT COUNT(*) as count FROM courses WHERE instructor_id IS NOT NULL",
        courseSections: "SELECT COUNT(*) as count FROM courses WHERE section_id IS NOT NULL",
        studentSections: "SELECT COUNT(*) as count FROM users WHERE role = 'student' AND section_id IS NOT NULL"
    };
    
    db.query(queries.instructorCourses, (err, instResult) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query(queries.courseSections, (err, courseResult) => {
            if (err) return res.status(500).json({ error: err.message });
            db.query(queries.studentSections, (err, studentResult) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    instructorCoursesLinked: instResult[0].count,
                    courseSectionsLinked: courseResult[0].count,
                    studentSectionsLinked: studentResult[0].count
                });
            });
        });
    });
});
// ==========================================
// --- SEMESTER RESET ENDPOINTS ---
// ==========================================

// Get statistics
app.get('/api/admin/reset/stats', (req, res) => {
    const queries = {
        instructorCourses: "SELECT COUNT(*) as count FROM courses WHERE instructor_id IS NOT NULL",
        courseSections: "SELECT COUNT(*) as count FROM courses WHERE section_id IS NOT NULL",
        studentSections: "SELECT COUNT(*) as count FROM users WHERE role = 'student' AND section_id IS NOT NULL"
    };
    
    db.query(queries.instructorCourses, (err, instResult) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query(queries.courseSections, (err, courseResult) => {
            if (err) return res.status(500).json({ error: err.message });
            db.query(queries.studentSections, (err, studentResult) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    instructorCoursesLinked: instResult[0].count,
                    courseSectionsLinked: courseResult[0].count,
                    studentSectionsLinked: studentResult[0].count
                });
            });
        });
    });
});

// Reset instructor-course links
app.post('/api/admin/reset/instructor-courses', (req, res) => {
    const sql = "UPDATE courses SET instructor_id = NULL WHERE instructor_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Unlinked ${result.affectedRows} instructor-course relationships` });
    });
});

// Reset course-section links
app.post('/api/admin/reset/course-sections', (req, res) => {
    const sql = "UPDATE courses SET section_id = NULL WHERE section_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Unlinked ${result.affectedRows} course-section relationships` });
    });
});

// Reset student-section links
app.post('/api/admin/reset/student-sections', (req, res) => {
    const sql = "UPDATE users SET section_id = NULL WHERE role = 'student' AND section_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Unlinked ${result.affectedRows} student-section relationships` });
    });
});

// Complete semester reset
app.post('/api/admin/reset/semester', (req, res) => {
    const queries = [
        "UPDATE courses SET instructor_id = NULL WHERE instructor_id IS NOT NULL",
        "UPDATE courses SET section_id = NULL WHERE section_id IS NOT NULL", 
        "UPDATE users SET section_id = NULL WHERE role = 'student' AND section_id IS NOT NULL"
    ];
    
    let results = { instructorCourses: 0, courseSections: 0, studentSections: 0 };
    
    db.query(queries[0], (err, result1) => {
        if (err) return res.status(500).json({ error: err.message });
        results.instructorCourses = result1.affectedRows;
        
        db.query(queries[1], (err, result2) => {
            if (err) return res.status(500).json({ error: err.message });
            results.courseSections = result2.affectedRows;
            
            db.query(queries[2], (err, result3) => {
                if (err) return res.status(500).json({ error: err.message });
                results.studentSections = result3.affectedRows;
                res.json({ success: true, message: "Semester reset completed!", details: results });
            });
        });
    });
});
// ==========================================
// --- SEMESTER RESET ENDPOINTS (UPDATED) ---
// ==========================================

// Clear all evaluations (ratings and comments)
app.post('/api/admin/reset/evaluations', (req, res) => {
    const sql = "DELETE FROM evaluations";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
            success: true, 
            message: `Cleared ${result.affectedRows} evaluation records` 
        });
    });
});

// Complete System Reset (including evaluations)
app.post('/api/admin/reset/complete-system', (req, res) => {
    const queries = [
        "DELETE FROM evaluations",                                    // Clear all evaluations
        "UPDATE courses SET instructor_id = NULL WHERE instructor_id IS NOT NULL",  // Unlink instructors
        "UPDATE courses SET section_id = NULL WHERE section_id IS NOT NULL",        // Unlink course sections
        "UPDATE users SET section_id = NULL WHERE role = 'student' AND section_id IS NOT NULL"  // Unlink student sections
    ];
    
    let results = { evaluations: 0, instructorCourses: 0, courseSections: 0, studentSections: 0 };
    
    db.query(queries[0], (err, result1) => {
        if (err) return res.status(500).json({ error: err.message });
        results.evaluations = result1.affectedRows;
        
        db.query(queries[1], (err, result2) => {
            if (err) return res.status(500).json({ error: err.message });
            results.instructorCourses = result2.affectedRows;
            
            db.query(queries[2], (err, result3) => {
                if (err) return res.status(500).json({ error: err.message });
                results.courseSections = result3.affectedRows;
                
                db.query(queries[3], (err, result4) => {
                    if (err) return res.status(500).json({ error: err.message });
                    results.studentSections = result4.affectedRows;
                    
                    res.json({ 
                        success: true, 
                        message: "Complete system reset completed!",
                        details: results 
                    });
                });
            });
        });
    });
});

// Get updated statistics (including evaluation count)
app.get('/api/admin/reset/stats', (req, res) => {
    const queries = {
        evaluations: "SELECT COUNT(*) as count FROM evaluations",
        instructorCourses: "SELECT COUNT(*) as count FROM courses WHERE instructor_id IS NOT NULL",
        courseSections: "SELECT COUNT(*) as count FROM courses WHERE section_id IS NOT NULL",
        studentSections: "SELECT COUNT(*) as count FROM users WHERE role = 'student' AND section_id IS NOT NULL"
    };
    
    db.query(queries.evaluations, (err, evalResult) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query(queries.instructorCourses, (err, instResult) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.query(queries.courseSections, (err, courseResult) => {
                if (err) return res.status(500).json({ error: err.message });
                
                db.query(queries.studentSections, (err, studentResult) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    res.json({
                        evaluations: evalResult[0].count,
                        instructorCoursesLinked: instResult[0].count,
                        courseSectionsLinked: courseResult[0].count,
                        studentSectionsLinked: studentResult[0].count
                    });
                });
            });
        });
    });
});
// ==========================================
// --- SEMESTER RESET ENDPOINTS ---
// ==========================================

// Clear all evaluations (ratings and comments)
app.post('/api/admin/reset/evaluations', (req, res) => {
    const sql = "DELETE FROM evaluations";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error clearing evaluations:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            success: true, 
            message: `Cleared ${result.affectedRows} evaluation records` 
        });
    });
});

// Reset instructor-course links
app.post('/api/admin/reset/instructor-courses', (req, res) => {
    const sql = "UPDATE courses SET instructor_id = NULL WHERE instructor_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error resetting instructor-courses:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            success: true, 
            message: `Unlinked ${result.affectedRows} instructor-course relationships` 
        });
    });
});

// Reset course-section links
app.post('/api/admin/reset/course-sections', (req, res) => {
    const sql = "UPDATE courses SET section_id = NULL WHERE section_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error resetting course-sections:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            success: true, 
            message: `Unlinked ${result.affectedRows} course-section relationships` 
        });
    });
});

// Reset student-section links
app.post('/api/admin/reset/student-sections', (req, res) => {
    const sql = "UPDATE users SET section_id = NULL WHERE role = 'student' AND section_id IS NOT NULL";
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error resetting student-sections:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            success: true, 
            message: `Unlinked ${result.affectedRows} student-section relationships` 
        });
    });
});

// Complete system reset (all in one)
app.post('/api/admin/reset/complete-system', (req, res) => {
    const queries = [
        { sql: "DELETE FROM evaluations", name: "evaluations" },
        { sql: "UPDATE courses SET instructor_id = NULL WHERE instructor_id IS NOT NULL", name: "instructorCourses" },
        { sql: "UPDATE courses SET section_id = NULL WHERE section_id IS NOT NULL", name: "courseSections" },
        { sql: "UPDATE users SET section_id = NULL WHERE role = 'student' AND section_id IS NOT NULL", name: "studentSections" }
    ];
    
    let results = { evaluations: 0, instructorCourses: 0, courseSections: 0, studentSections: 0 };
    let completed = 0;
    
    queries.forEach((query) => {
        db.query(query.sql, (err, result) => {
            if (err) {
                console.error(`Error resetting ${query.name}:`, err);
            } else {
                results[query.name] = result.affectedRows;
            }
            completed++;
            
            if (completed === queries.length) {
                res.json({ 
                    success: true, 
                    message: "Complete system reset completed!",
                    details: results 
                });
            }
        });
    });
});

// Get statistics
app.get('/api/admin/reset/stats', (req, res) => {
    const queries = {
        evaluations: "SELECT COUNT(*) as count FROM evaluations",
        instructorCourses: "SELECT COUNT(*) as count FROM courses WHERE instructor_id IS NOT NULL",
        courseSections: "SELECT COUNT(*) as count FROM courses WHERE section_id IS NOT NULL",
        studentSections: "SELECT COUNT(*) as count FROM users WHERE role = 'student' AND section_id IS NOT NULL"
    };
    
    db.query(queries.evaluations, (err, evalResult) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query(queries.instructorCourses, (err, instResult) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.query(queries.courseSections, (err, courseResult) => {
                if (err) return res.status(500).json({ error: err.message });
                
                db.query(queries.studentSections, (err, studentResult) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    res.json({
                        evaluations: evalResult[0].count,
                        instructorCoursesLinked: instResult[0].count,
                        courseSectionsLinked: courseResult[0].count,
                        studentSectionsLinked: studentResult[0].count
                    });
                });
            });
        });
    });
});
// Basic semester reset (without evaluations)
app.post('/api/admin/reset/semester', (req, res) => {
    const queries = [
        "UPDATE courses SET instructor_id = NULL WHERE instructor_id IS NOT NULL",
        "UPDATE courses SET section_id = NULL WHERE section_id IS NOT NULL", 
        "UPDATE users SET section_id = NULL WHERE role = 'student' AND section_id IS NOT NULL"
    ];
    
    let results = { instructorCourses: 0, courseSections: 0, studentSections: 0 };
    let completed = 0;
    
    db.query(queries[0], (err, result1) => {
        if (err) return res.status(500).json({ error: err.message });
        results.instructorCourses = result1.affectedRows;
        completed++;
        
        db.query(queries[1], (err, result2) => {
            if (err) return res.status(500).json({ error: err.message });
            results.courseSections = result2.affectedRows;
            completed++;
            
            db.query(queries[2], (err, result3) => {
                if (err) return res.status(500).json({ error: err.message });
                results.studentSections = result3.affectedRows;
                completed++;
                
                res.json({ 
                    success: true, 
                    message: "Semester reset completed!",
                    details: results 
                });
            });
        });
    });
});

// ==========================================
// --- START SERVER ---
// ==========================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));