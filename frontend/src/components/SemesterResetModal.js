import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SemesterResetModal = ({ onClose, onResetComplete }) => {
    const [stats, setStats] = useState({
        evaluations: 0,
        instructorCoursesLinked: 0,
        courseSectionsLinked: 0,
        studentSectionsLinked: 0
    });
    const [loading, setLoading] = useState(false);
    const [resetType, setResetType] = useState('full');
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/reset/stats');
            setStats(res.data);
        } catch (err) {
            console.error("Error fetching stats:", err);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleReset = async () => {
        let confirmMessage = '';
        let endpoint = '';
        
        switch(resetType) {
            case 'full-system':
                confirmMessage = "⚠️⚠️⚠️ COMPLETE SYSTEM RESET ⚠️⚠️⚠️\n\nThis will DELETE ALL:\n- All evaluation records (ratings & comments)\n- All instructor-course links\n- All course-section links\n- All student-section links\n\nThis action CANNOT be undone!\n\nAll evaluation data will be lost forever.\n\nAre you ABSOLUTELY sure you want to proceed?";
                endpoint = '/api/admin/reset/complete-system';
                break;
            case 'evaluations':
                confirmMessage = "⚠️ This will DELETE ALL evaluation records (ratings and comments).\n\nThis action cannot be undone. Are you sure you want to proceed?";
                endpoint = '/api/admin/reset/evaluations';
                break;
            case 'instructors':
                confirmMessage = "⚠️ This will remove ALL instructor-course assignments. Continue?";
                endpoint = '/api/admin/reset/instructor-courses';
                break;
            case 'courses':
                confirmMessage = "⚠️ This will remove ALL course-section links. Continue?";
                endpoint = '/api/admin/reset/course-sections';
                break;
            case 'students':
                confirmMessage = "⚠️ This will remove ALL student-section assignments. Continue?";
                endpoint = '/api/admin/reset/student-sections';
                break;
            default:
                confirmMessage = "⚠️ This will remove ALL instructor-course links, course-section links, and student-section links. Continue?";
                endpoint = '/api/admin/reset/semester';
        }
        
        if (!window.confirm(confirmMessage)) return;
        
        setLoading(true);
        
        try {
            const res = await axios.post(`http://localhost:5000${endpoint}`);
            alert(res.data.message || "Reset completed successfully!");
            
            if (onResetComplete) onResetComplete();
            fetchStats(); // Refresh stats
        } catch (err) {
            alert("Reset failed: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modal}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>🔄 Semester Reset / Bulk Unlink</h3>
                    <button onClick={onClose} style={styles.closeBtn}>×</button>
                </div>

                <div style={styles.modalBody}>
                    <p style={styles.warningText}>
                        ⚠️ Use this feature at the beginning of each semester to reset relationships and clear evaluation data.
                    </p>

                    {/* Current Statistics */}
                    <div style={styles.statsSection}>
                        <h4>📊 Current System Statistics</h4>
                        {loadingStats ? (
                            <p>Loading statistics...</p>
                        ) : (
                            <div style={styles.statsGrid}>
                                <div style={{...styles.statCard, backgroundColor: '#fee2e2'}}>
                                    <div style={styles.statNumber}>{stats.evaluations}</div>
                                    <div style={styles.statLabel}>Evaluation Records</div>
                                </div>
                                <div style={styles.statCard}>
                                    <div style={styles.statNumber}>{stats.instructorCoursesLinked}</div>
                                    <div style={styles.statLabel}>Instructor → Courses</div>
                                </div>
                                <div style={styles.statCard}>
                                    <div style={styles.statNumber}>{stats.courseSectionsLinked}</div>
                                    <div style={styles.statLabel}>Courses → Sections</div>
                                </div>
                                <div style={styles.statCard}>
                                    <div style={styles.statNumber}>{stats.studentSectionsLinked}</div>
                                    <div style={styles.statLabel}>Students → Sections</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reset Options */}
                    <div style={styles.resetOptions}>
                        <h4>🎯 Select Reset Type:</h4>
                        
                        {/* Danger Option - Complete System Reset */}
                        <label style={{...styles.radioLabel, backgroundColor: '#fee2e2', borderColor: '#fecaca'}}>
                            <input 
                                type="radio" 
                                value="full-system" 
                                checked={resetType === 'full-system'} 
                                onChange={(e) => setResetType(e.target.value)}
                            />
                            <strong style={{color: '#dc2626'}}>⚠️ COMPLETE SYSTEM RESET (DANGER)</strong>
                            <span style={styles.radioDesc}>Deletes ALL evaluations AND clears ALL relationships (Instructors, Courses, Students)</span>
                        </label>
                        
                        {/* Clear Evaluations Only */}
                        <label style={styles.radioLabel}>
                            <input 
                                type="radio" 
                                value="evaluations" 
                                checked={resetType === 'evaluations'} 
                                onChange={(e) => setResetType(e.target.value)}
                            />
                            <strong>Clear All Evaluations</strong>
                            <span style={styles.radioDesc}>Delete ALL evaluation records (ratings and comments) for new semester</span>
                        </label>
                        
                        <div style={styles.divider}></div>
                        
                        <label style={styles.radioLabel}>
                            <input 
                                type="radio" 
                                value="instructors" 
                                checked={resetType === 'instructors'} 
                                onChange={(e) => setResetType(e.target.value)}
                            />
                            <strong>Reset Instructor-Course Links</strong>
                            <span style={styles.radioDesc}>Remove all instructor assignments from courses</span>
                        </label>
                        
                        <label style={styles.radioLabel}>
                            <input 
                                type="radio" 
                                value="courses" 
                                checked={resetType === 'courses'} 
                                onChange={(e) => setResetType(e.target.value)}
                            />
                            <strong>Reset Course-Section Links</strong>
                            <span style={styles.radioDesc}>Remove all section assignments from courses</span>
                        </label>
                        
                        <label style={styles.radioLabel}>
                            <input 
                                type="radio" 
                                value="students" 
                                checked={resetType === 'students'} 
                                onChange={(e) => setResetType(e.target.value)}
                            />
                            <strong>Reset Student-Section Links</strong>
                            <span style={styles.radioDesc}>Remove all section assignments from students</span>
                        </label>
                    </div>
                    
                    <div style={styles.noteBox}>
                        <p>💡 <strong>Note:</strong> For a new semester, you typically want to:</p>
                        <ol style={styles.noteList}>
                            <li>Clear all evaluations (ratings from previous semester)</li>
                            <li>Reset student-section links (students move to new sections)</li>
                            <li>Reset course-section links (courses assigned to new sections)</li>
                            <li>Reset instructor-course links (instructors assigned to new courses)</li>
                        </ol>
                    </div>
                </div>

                <div style={styles.modalFooter}>
                    <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
                    <button 
                        onClick={handleReset} 
                        disabled={loading}
                        style={{
                            ...styles.resetBtn,
                            backgroundColor: resetType === 'full-system' ? '#dc2626' : '#ef4444',
                            opacity: loading ? 0.6 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Processing...' : resetType === 'full-system' ? '⚠️ EXECUTE FULL RESET' : 'Execute Reset'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '600px',
        maxWidth: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderBottom: '1px solid #e2e8f0'
    },
    modalTitle: { margin: 0, fontSize: '18px', color: '#1e293b' },
    closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' },
    modalBody: { padding: '20px' },
    warningText: { backgroundColor: '#fef3c7', color: '#92400e', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', borderLeft: '4px solid #f59e0b' },
    statsSection: { marginBottom: '25px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' },
    statCard: { textAlign: 'center', padding: '10px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' },
    statNumber: { fontSize: '24px', fontWeight: 'bold', color: '#0ea5e9' },
    statLabel: { fontSize: '11px', color: '#64748b', marginTop: '5px' },
    resetOptions: { marginBottom: '20px' },
    radioLabel: { display: 'flex', flexDirection: 'column', padding: '12px', marginBottom: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', cursor: 'pointer', border: '1px solid #e2e8f0' },
    radioDesc: { fontSize: '11px', color: '#64748b', marginTop: '4px', marginLeft: '24px' },
    divider: { height: '1px', backgroundColor: '#e2e8f0', margin: '15px 0' },
    noteBox: { backgroundColor: '#e0f2fe', padding: '15px', borderRadius: '8px', marginTop: '15px' },
    noteList: { margin: '10px 0 0 20px', fontSize: '12px', color: '#0369a1', lineHeight: '1.6' },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px', borderTop: '1px solid #e2e8f0' },
    cancelBtn: { padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    resetBtn: { padding: '8px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }
};

export default SemesterResetModal;