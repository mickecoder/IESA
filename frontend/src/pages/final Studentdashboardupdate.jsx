import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        // Match your backend: uses section_id from the user object
        const sectionId = user.section_id;

        if (sectionId) {
            axios.get(`http://localhost:5000/api/courses/section/${sectionId}`)
                .then(res => {
                    setCourses(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching courses:", err);
                    setLoading(false);
                });
        }
    }, [navigate]);

    return (
        <div style={styles.dashboardContainer}>
            {/* Header Banner - Matches Evaluation Form style */}
            <div style={styles.headerCard}>
                <h2 style={styles.welcomeText}>
                    Welcome back, <span style={{ color: '#fff' }}>{user?.email_or_id}</span> 👋
                </h2>
                <div style={styles.sectionBadge}>SECTION ID: {user?.section_id}</div>
                <p style={styles.headerSubtitle}>
                    Select a course below to begin your instructor evaluation.
                </p>
            </div>

            {/* Courses Grid */}
            <div style={styles.gridContainer}>
                {loading ? (
                    <div style={styles.message}>Loading...</div>
                ) : courses.length > 0 ? (
                    courses.map(course => (
                        <div key={course.id} style={styles.courseCard}>
                            <div style={styles.cardInfo}>
                                <span style={styles.courseCode}>{course.course_code}</span>
                                <h3 style={styles.courseTitle}>{course.course_name}</h3>
                                <p style={styles.status}>Status: <span style={{color: '#0ea5e9'}}>Pending</span></p>
                            </div>
                            <button 
                                style={styles.evaluateBtn}
                                onClick={() => navigate(`/evaluate/${course.id}`)}
                            >
                                EVALUATE INSTRUCTOR
                            </button>
                        </div>
                    ))
                ) : (
                    <div style={styles.emptyState}>No courses found for your section.</div>
                )}
            </div>
        </div>
    );
};

const styles = {
    dashboardContainer: { padding: '40px', maxWidth: '1200px', margin: '0 auto' },
    headerCard: {
        background: '#1da1d2',
        color: '#fff',
        padding: '35px',
        borderRadius: '12px',
        marginBottom: '30px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    },
    welcomeText: { margin: 0, fontSize: '26px' },
    sectionBadge: {
        display: 'inline-block',
        marginTop: '10px',
        background: 'rgba(255,255,255,0.2)',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 'bold'
    },
    headerSubtitle: { marginTop: '15px', opacity: 0.9 },
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '25px'
    },
    courseCard: {
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        border: '1px solid #f2f4f7',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
    },
    cardInfo: { padding: '20px' },
    courseCode: { color: '#1da1d2', fontWeight: 'bold', fontSize: '12px' },
    courseTitle: { margin: '10px 0', fontSize: '18px', color: '#101828' },
    status: { fontSize: '13px', color: '#667085' },
    evaluateBtn: {
        background: '#1da1d2',
        color: '#fff',
        border: 'none',
        padding: '15px',
        fontWeight: 'bold',
        cursor: 'pointer',
        width: '100%'
    },
    message: { textAlign: 'center', gridColumn: '1/-1' },
    emptyState: { 
        textAlign: 'center', 
        gridColumn: '1/-1', 
        padding: '60px', 
        background: '#fff', 
        borderRadius: '12px', 
        border: '2px dashed #d0d5dd' 
    }
};

export default StudentDashboard;