import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DeptDashboard = ({ user }) => {
    const navigate = useNavigate();
    const [instructors, setInstructors] = useState([]);
    const [stats, setStats] = useState({ avgRating: 0, totalEvaluations: 0 });

    useEffect(() => {
        if (user && user.dept_id) {
            fetchDeptData();
        }
    }, [user]);

    const fetchDeptData = async () => {
        try {
            // Fetch instructors for THIS department only
            const instRes = await axios.get(`http://localhost:5000/api/dept/instructors/${user.dept_id}`);
            // Fetch performance metrics for THIS department
            const statRes = await axios.get(`http://localhost:5000/api/dept/stats/${user.dept_id}`);
            
            setInstructors(instRes.data);
            setStats(statRes.data);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        }
    };

    return (
        <main style={styles.main}>
            <header style={styles.header}>
                <div>
                    <h2 style={styles.title}>Department Overview</h2>
                    <p style={styles.subtitle}>Welcome back, {user?.name || 'Department Head'}</p>
                </div>
                <button style={styles.logoutBtn} onClick={() => { localStorage.clear(); navigate('/'); }}>
                    Sign Out
                </button>
            </header>

            {/* STATS CARDS */}
            <div style={styles.statsRow}>
                <div style={styles.statCard}>
                    <h4 style={styles.statValue}>{instructors.length}</h4>
                    <p>Department Instructors</p>
                </div>
                <div style={styles.statCard}>
                    <h4 style={{...styles.statValue, color: '#10b981'}}>
                        {stats.avgRating.toFixed(2)} / 5.0
                    </h4>
                    <p>Average Evaluation</p>
                </div>
                <div style={styles.statCard}>
                    <h4 style={styles.statValue}>{stats.totalEvaluations}</h4>
                    <p>Total Feedbacks</p>
                </div>
            </div>

            {/* INSTRUCTOR LIST */}
            <div style={styles.contentCard}>
                <h3 style={styles.cardTitle}>Instructor Performance</h3>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.tableHeaderRow}>
                            <th style={styles.th}>Instructor Name</th>
                            <th style={styles.th}>Total Evals</th>
                            <th style={styles.th}>Avg Rating</th>
                            <th style={styles.th}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {instructors.map((inst) => (
                            <tr key={inst.instructor_id} style={styles.tableRow}>
                                <td style={styles.td}>{inst.name}</td>
                                <td style={styles.td}>{inst.eval_count || 0}</td>
                                <td style={styles.td}>{inst.avg_rating || 'N/A'}</td>
                                <td style={styles.td}><span style={styles.badge}>Active</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    );
};

const styles = {
    main: { padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    title: { fontSize: '28px', color: '#1e293b', margin: 0 },
    subtitle: { color: '#64748b', marginTop: '5px' },
    logoutBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    statsRow: { display: 'flex', gap: '20px', marginBottom: '30px' },
    statCard: { flex: 1, backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #e2e8f0' },
    statValue: { fontSize: '32px', color: '#0ea5e9', fontWeight: 'bold', margin: '10px 0' },
    contentCard: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
    cardTitle: { marginBottom: '20px', color: '#334155', fontSize: '18px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHeaderRow: { borderBottom: '2px solid #f1f5f9' },
    th: { textAlign: 'left', padding: '16px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' },
    tableRow: { borderBottom: '1px solid #f1f5f9' },
    td: { padding: '16px', color: '#334155', fontSize: '14px' },
    badge: { backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }
};

export default DeptDashboard;