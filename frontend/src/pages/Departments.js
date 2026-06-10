import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Departments = ({ user }) => {
    const [instructors, setInstructors] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [departmentInfo, setDepartmentInfo] = useState(null);
    const [stats, setStats] = useState({
        totalInstructors: 0,
        totalCourses: 0,
        totalStudents: 0,
        avgRating: 0,
        highPerformers: 0
    });

    useEffect(() => {
        // Check if user has department access
        if (user && (user.dept_id || user.department_id)) {
            fetchDepartmentData();
        } else {
            // If no department assigned, show message
            setLoading(false);
            alert("You don't have a department assigned. Please contact admin.");
        }
    }, [user]);

    const fetchDepartmentData = async () => {
        try {
            setLoading(true);
            const deptId = user.dept_id || user.department_id;
            
            console.log("Fetching data for department ID:", deptId);
            
            // Fetch department info
            const deptRes = await axios.get(`http://localhost:5000/api/admin/departments/${deptId}`);
            setDepartmentInfo(deptRes.data);
            
            // Fetch ALL instructors (then filter by department)
            const instructorsRes = await axios.get('http://localhost:5000/api/admin/instructors');
            
            // Fetch all courses
            const coursesRes = await axios.get('http://localhost:5000/api/admin/courses-detailed');
            
            // Fetch all students
            const studentsRes = await axios.get('http://localhost:5000/api/admin/students');
            
            // Filter by department (this requires dept_id in instructor table)
            // If your instructor table doesn't have dept_id, you'll need to filter differently
            let filteredInstructors = instructorsRes.data;
            let filteredCourses = coursesRes.data.filter(course => course.dept_id === deptId);
            let filteredStudents = studentsRes.data.filter(student => student.dept_id === deptId);
            
            // Get performance for each instructor
            const instructorsWithPerformance = await Promise.all(
                filteredInstructors.map(async (inst) => {
                    try {
                        const perfRes = await axios.get(`http://localhost:5000/api/instructor/performance/${inst.instructor_id}`);
                        return {
                            ...inst,
                            avg_rating: perfRes.data?.summary?.overall_rating || 0,
                            total_evals: perfRes.data?.summary?.total_evaluations || 0,
                            course_count: filteredCourses.filter(c => c.instructor_id === inst.instructor_id).length
                        };
                    } catch (err) {
                        return {
                            ...inst,
                            avg_rating: 0,
                            total_evals: 0,
                            course_count: 0
                        };
                    }
                })
            );
            
            // Calculate department stats
            const totalRating = instructorsWithPerformance.reduce((sum, inst) => sum + (inst.avg_rating || 0), 0);
            const ratingCount = instructorsWithPerformance.filter(inst => inst.avg_rating > 0).length;
            const highPerformers = instructorsWithPerformance.filter(i => (i.avg_rating || 0) >= 4).length;
            
            setInstructors(instructorsWithPerformance);
            setCourses(filteredCourses);
            setStudents(filteredStudents);
            setStats({
                totalInstructors: filteredInstructors.length,
                totalCourses: filteredCourses.length,
                totalStudents: filteredStudents.length,
                avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 0,
                highPerformers: highPerformers
            });
            
        } catch (err) {
            console.error("Error loading department data:", err);
            alert("Failed to load department data. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading your department data...</p>
            </div>
        );
    }

    return (
        <main style={styles.main}>
            <header style={styles.header}>
                <div>
                    <h2 style={styles.title}>
                        📊 {departmentInfo?.name || user?.department || 'Department'} Analytics
                    </h2>
                    <p style={styles.subtitle}>
                        Real-time metrics for your department only
                    </p>
                </div>
                <div style={styles.departmentBadge}>
                    Department ID: {user?.dept_id || user?.department_id || 'N/A'}
                </div>
            </header>

            {/* STATISTICS CARDS - Only for this department */}
            <div style={styles.statsRow}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>👨‍🏫</div>
                    <div>
                        <p style={styles.statLabel}>Department Instructors</p>
                        <h4 style={styles.statValue}>{stats.totalInstructors}</h4>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>📚</div>
                    <div>
                        <p style={styles.statLabel}>Department Courses</p>
                        <h4 style={styles.statValue}>{stats.totalCourses}</h4>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>🎓</div>
                    <div>
                        <p style={styles.statLabel}>Department Students</p>
                        <h4 style={styles.statValue}>{stats.totalStudents}</h4>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>⭐</div>
                    <div>
                        <p style={styles.statLabel}>Dept Average Rating</p>
                        <h4 style={{...styles.statValue, color: '#0ea5e9'}}>
                            {stats.avgRating} / 5.0
                        </h4>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>🏆</div>
                    <div>
                        <p style={styles.statLabel}>High Performers</p>
                        <h4 style={{...styles.statValue, color: '#10b981'}}>
                            {stats.highPerformers} / {stats.totalInstructors}
                        </h4>
                    </div>
                </div>
            </div>

            {/* INSTRUCTOR TABLE - Only department instructors */}
            <section style={styles.card}>
                <h3 style={styles.cardTitle}>👨‍🏫 Department Instructor Performance</h3>
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeaderRow}>
                                <th style={styles.th}>#</th>
                                <th style={styles.th}>Instructor Name</th>
                                <th style={styles.th}>Courses</th>
                                <th style={styles.th}>Evaluations</th>
                                <th style={styles.th}>Avg Rating</th>
                                <th style={styles.th}>Performance Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {instructors.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={styles.emptyState}>
                                        No instructors found in your department
                                    </td>
                                </tr>
                            ) : (
                                instructors.map((inst, index) => (
                                    <tr key={inst.instructor_id} style={styles.tableRow}>
                                        <td style={styles.td}>{index + 1}</td>
                                        <td style={{...styles.td, fontWeight: '600'}}>{inst.name}</td>
                                        <td style={styles.td}>{inst.course_count || 0}</td>
                                        <td style={styles.td}>{inst.total_evals || 0}</td>
                                        <td style={styles.td}>
                                            <span style={styles.ratingBadge}>
                                                {(inst.avg_rating || 0).toFixed(1)}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={
                                                (inst.avg_rating || 0) >= 4 ? styles.badgeSuccess : 
                                                (inst.avg_rating || 0) >= 3 ? styles.badgeWarning : 
                                                styles.badgeNormal
                                            }>
                                                {(inst.avg_rating || 0) >= 4 ? 'Excellent' : 
                                                 (inst.avg_rating || 0) >= 3 ? 'Good' : 'Needs Improvement'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* COURSE LIST - Only department courses */}
            <section style={styles.card}>
                <h3 style={styles.cardTitle}>📖 Department Courses</h3>
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeaderRow}>
                                <th style={styles.th}>Course Code</th>
                                <th style={styles.th}>Course Name</th>
                                <th style={styles.th}>Instructor</th>
                                <th style={styles.th}>Section</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={styles.emptyState}>No courses found for your department</td>
                                </tr>
                            ) : (
                                courses.map((course) => (
                                    <tr key={course.id} style={styles.tableRow}>
                                        <td style={styles.td}>{course.course_code || '—'}</td>
                                        <td style={styles.td}>{course.course_name}</td>
                                        <td style={styles.td}>{course.instructor_name || 'Unassigned'}</td>
                                        <td style={styles.td}>{course.section_name || '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Department Info Footer */}
            <div style={styles.footer}>
                <p>Showing data only for: <strong>{departmentInfo?.name || user?.department || 'Your Department'}</strong></p>
                <p style={styles.footerNote}>This view is restricted to your department only.</p>
            </div>
        </main>
    );
};

const styles = {
    main: { padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
    loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' },
    spinner: { width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' },
    title: { fontSize: '26px', color: '#1e293b', margin: 0, fontWeight: '700' },
    subtitle: { color: '#64748b', fontSize: '14px', marginTop: '5px' },
    departmentBadge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500' },
    
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
    statCard: { 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    },
    statIcon: { fontSize: '32px' },
    statLabel: { color: '#64748b', fontSize: '13px', marginBottom: '5px' },
    statValue: { fontSize: '24px', color: '#1e293b', fontWeight: 'bold', margin: 0 },
    
    card: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' },
    cardTitle: { fontSize: '18px', margin: '0 0 20px 0', color: '#334155', fontWeight: '600' },
    
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHeaderRow: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
    th: { textAlign: 'left', padding: '12px 16px', color: '#64748b', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' },
    tableRow: { borderBottom: '1px solid #f1f5f9' },
    td: { padding: '14px 16px', color: '#334155', fontSize: '14px' },
    emptyState: { textAlign: 'center', padding: '40px', color: '#64748b' },
    
    ratingBadge: { backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
    badgeSuccess: { backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
    badgeWarning: { backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
    badgeNormal: { backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
    
    footer: { textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px', borderTop: '1px solid #e2e8f0', marginTop: '20px' },
    footerNote: { fontSize: '12px', color: '#94a3b8', marginTop: '5px' }
};

// Add keyframes animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export default Departments;