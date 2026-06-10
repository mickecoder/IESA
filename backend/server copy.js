const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'evaluation_db'
});

db.connect(err => {
    if (err) console.error("Database connection failed:", err);
    else console.log("Connected to MySQL Database.");
});

// --- 1. LOGIN ROUTE ---
app.post('/api/login', (req, res) => {
    const { role, identifier, password, campusId, section } = req.body;
    const normalizedRole = role.toLowerCase();

    let sql = `SELECT * FROM users WHERE email_or_id = ? AND role = ?`;
    let params = [identifier, normalizedRole];

    if (normalizedRole === 'student') {
        sql += " AND campus_id = ? AND section_id = ?";
        params.push(campusId, section);
    } else {
        sql += " AND password = ?";
        params.push(password);
    }

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        
        if (results.length > 0) {
            const { password, ...userWithoutPassword } = results[0];
            res.json({ success: true, user: userWithoutPassword });
        } else {
            // Fixes 401 Unauthorized by providing a clear failure response
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    });
});

// --- UPDATED DEPARTMENTS ROUTE ---
app.get('/api/admin/departments', (req, res) => {
    // We select 'location' directly from the departments table 
    // because 'campus_id' does not exist in your schema.
    const sql = "SELECT dept_id, name, location, dean_id FROM departments";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ SQL ERROR:", err.sqlMessage); 
            return res.status(500).json({ error: err.sqlMessage });
        }
        res.json(results);
    });
});
app.post('/api/admin/departments', (req, res) => {
    const { name, campus_id } = req.body;
    const sql = "INSERT INTO departments (name, campus_id) VALUES (?, ?)";
    db.query(sql, [name, campus_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        res.json({ success: true, id: result.insertId });
    });
});

// --- 3. CAMPUS & INSTRUCTOR ROUTES ---
app.get('/api/admin/campuses', (req, res) => {
    db.query("SELECT * FROM campuses", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/admin/instructors', (req, res) => {
    db.query("SELECT * FROM instructor", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// --- 4. EVALUATION SETUP (Fixes 404 "Loading Form") ---
app.get('/api/setup-eval/:courseId', (req, res) => {
    const courseId = req.params.courseId;
    
    // First, get the course and instructor details
    const courseSql = `
        SELECT c.id, c.course_name, i.name as instructor_name 
        FROM courses c 
        LEFT JOIN instructor i ON c.instructor_id = i.instructor_id 
        WHERE c.id = ?`;

    db.query(courseSql, [courseId], (err, courseResult) => {
        if (err) return res.status(500).json({ error: err.sqlMessage });
        if (courseResult.length === 0) return res.status(404).json({ message: "Course not found" });

        // Second, fetch questions from the criteria table
        db.query("SELECT id, question FROM criteria", (err, criteriaResults) => {
            if (err) return res.status(500).json({ error: err.sqlMessage });
            res.json({ 
                course: courseResult[0], 
                questions: criteriaResults 
            });
        });
    });
});

// --- 5. STUDENT ROUTES ---
app.get('/api/courses/section/:sectionId', (req, res) => {
    const sql = "SELECT id, course_name, course_code FROM courses WHERE section_id = ?";
    db.query(sql, [req.params.sectionId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));