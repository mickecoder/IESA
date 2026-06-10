import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [evaluatedCourses, setEvaluatedCourses] = useState({});
    const [sectionName, setSectionName] = useState('');
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                navigate('/');
                return;
            }
            
            const sectionId = user.section_id;
            
            if (!sectionId) {
                setLoading(false);
                return;
            }

            if (!user.section_name && !sectionName) {
                try {
                    const sectionsRes = await axios.get('http://localhost:5000/api/admin/sections');
                    const sectionRecord = sectionsRes.data.find(s => Number(s.id) === Number(sectionId));
                    if (sectionRecord) {
                        setSectionName(sectionRecord.name);
                    }
                } catch (sectionErr) {
                    console.error('Error fetching section name:', sectionErr);
                }
            }
            
            try {
                // Fetch courses first
                const coursesRes = await axios.get(`http://localhost:5000/api/courses/section/${sectionId}`);
                const coursesData = coursesRes.data;
                setCourses(coursesData);
                
                // Check evaluation status for all courses in parallel
                const statusPromises = coursesData.map(course =>
                    axios.get('http://localhost:5000/api/evaluations/check', {
                        params: { student_id: user.id, course_id: course.id }
                    }).then(response => ({ 
                        courseId: course.id, 
                        completed: response.data.completed 
                    })).catch(() => ({ 
                        courseId: course.id, 
                        completed: false 
                    }))
                );
                
                const results = await Promise.all(statusPromises);
                const evalStatus = {};
                results.forEach(result => {
                    evalStatus[result.courseId] = result.completed;
                });
                setEvaluatedCourses(evalStatus);
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [navigate, user]);

    const getStatusBadge = (isEvaluated) => {
        if (isEvaluated) {
            return {
                text: '✅ Evaluated',
                color: '#10b981',
                backgroundColor: '#dcfce7'
            };
        }
        return {
            text: '⏳ Pending',
            color: '#f59e0b',
            backgroundColor: '#fef3c7'
        };
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading your courses...</p>
            </div>
        );
    }

    const evaluatedCount = Object.values(evaluatedCourses).filter(v => v === true).length;
    const pendingCount = courses.length - evaluatedCount;

    return (
        <div style={styles.dashboardContainer}>
            {/* Header Banner */}
            <div style={styles.headerCard}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={styles.welcomeText}>
                        Welcome back, <span style={{ color: '#fff' }}>{user?.name}</span> 👋
                    </h2>
                    <div style={styles.sectionBadge}>
                        Section: {sectionName || user?.section_name || user?.section_id || 'Not assigned'}
                    </div>
                    <p style={styles.headerSubtitle}>
                        Select a course below to evaluate your instructor.
                    </p>
                </div>

                
            </div>

            {/* Statistics Summary */}
            <div style={styles.statsRow}>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{courses.length}</div>
                    <div style={styles.statLabel}>Total Courses</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{...styles.statNumber, color: '#10b981'}}>
                        {evaluatedCount}
                    </div>
                    <div style={styles.statLabel}>Evaluated</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{...styles.statNumber, color: '#f59e0b'}}>
                        {pendingCount}
                    </div>
                    <div style={styles.statLabel}>Pending</div>
                </div>
            </div>

            {/* Courses Grid */}
            <div style={styles.gridContainer}>
                {courses.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📚</div>
                        <h3>No Courses Found</h3>
                        <p>You are not enrolled in any courses yet.</p>
                        <p style={styles.emptySubtext}>Please contact your department head for enrollment.</p>
                    </div>
                ) : (
                    courses.map(course => {
                        const isEvaluated = evaluatedCourses[course.id] || false;
                        const status = getStatusBadge(isEvaluated);
                        
                        return (
                            <div key={course.id} style={styles.courseCard}>
                                <div style={styles.cardHeader}>
                                    <span style={styles.courseCode}>{course.course_code || 'N/A'}</span>
                                    <span style={{...styles.statusBadge, backgroundColor: status.backgroundColor, color: status.color}}>
                                        {status.text}
                                    </span>
                                </div>
                                <div style={styles.cardInfo}>
                                    <h3 style={styles.courseTitle}>{course.course_name}</h3>
                                </div>
                                <button 
                                    style={{
                                        ...styles.evaluateBtn,
                                        backgroundColor: isEvaluated ? '#64748b' : '#1da1d2',
                                        cursor: isEvaluated ? 'not-allowed' : 'pointer'
                                    }}
                                    onClick={() => {
                                        if (!isEvaluated) {
                                            navigate(`/evaluate/${course.id}`);
                                        } else {
                                            alert('You have already evaluated this course. Thank you for your feedback!');
                                        }
                                    }}
                                    disabled={isEvaluated}
                                >
                                    {isEvaluated ? '✓ Already Evaluated' : '📝 Evaluate Instructor'}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Note */}
            <div style={styles.footer}>
                <p>💡 Note: Each course can only be evaluated once. Thank you for your valuable feedback!</p>
            </div>
        </div>
    );
};

const styles = {
    dashboardContainer: { padding: '40px', maxWidth: '1200px', margin: '0 auto' },
    loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' },
    spinner: { width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    
    headerCard: {
        background: 'linear-gradient(135deg, #1da1d2 0%, #0ea5e9 100%)',
        color: '#fff',
        padding: '28px',
        borderRadius: '16px',
        marginBottom: '30px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '20px'
    },
    welcomeText: { margin: 0, fontSize: '26px', fontWeight: '600' },
    sectionBadge: {
        display: 'inline-block',
        marginTop: '12px',
        background: 'rgba(255,255,255,0.2)',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '500'
    },
    headerSubtitle: { marginTop: '15px', opacity: 0.95, fontSize: '14px' },
    
    statsRow: { display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' },
    statCard: { 
        flex: 1, 
        minWidth: '120px',
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '12px', 
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
    },
    statNumber: { fontSize: '32px', fontWeight: 'bold', color: '#1e293b' },
    statLabel: { fontSize: '13px', color: '#64748b', marginTop: '5px' },
    
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '25px'
    },
    courseCard: {
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 20px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0'
    },
    courseCode: { 
        color: '#1da1d2', 
        fontWeight: 'bold', 
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    statusBadge: {
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '600'
    },
    cardInfo: { padding: '20px', flex: 1 },
    courseTitle: { margin: 0, fontSize: '18px', color: '#1e293b', fontWeight: '600', lineHeight: '1.4' },
    evaluateBtn: {
        color: '#fff',
        border: 'none',
        padding: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        width: '100%',
        fontSize: '14px',
        transition: 'all 0.2s'
    },
    
    emptyState: { 
        textAlign: 'center', 
        gridColumn: '1/-1', 
        padding: '60px', 
        background: '#fff', 
        borderRadius: '16px', 
        border: '2px dashed #cbd5e1' 
    },
    emptyIcon: { fontSize: '64px', marginBottom: '20px' },
    emptySubtext: { fontSize: '13px', color: '#94a3b8', marginTop: '10px' },
    
    footer: { 
        marginTop: '30px', 
        padding: '15px', 
        textAlign: 'center', 
        fontSize: '12px', 
        color: '#64748b',
        backgroundColor: '#f1f5f9',
        borderRadius: '8px'
    }
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export default StudentDashboard;