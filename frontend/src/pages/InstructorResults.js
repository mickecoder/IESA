import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const InstructorResults = ({ user }) => {
    const [evaluations, setEvaluations] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            setError(null);
            try {
                let currentUser = user;
                if (!currentUser) {
                    const saved = localStorage.getItem('user');
                    currentUser = saved ? JSON.parse(saved) : null;
                }

                if (!currentUser || !currentUser.id) {
                    setError('User not found. Please login again.');
                    setLoading(false);
                    return;
                }

                const res = await axios.get(`http://localhost:5000/api/instructor/results?user_id=${currentUser.id}`);
                const data = res.data || {};
                
                const rows = Array.isArray(data.courses) ? data.courses : (Array.isArray(data.evaluations) ? data.evaluations : []);
                setEvaluations(rows);
                setSummary(data.summary || null);
            } catch (err) {
                console.error('Failed to fetch instructor results', err);
                setError(err.response?.data?.error || err.message || 'Failed to fetch results');
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [user]);

    // Helper function to safely get number
    const safeNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    const getPerformanceLevel = (rating) => {
        const num = safeNumber(rating);
        if (num >= 4.5) return { label: 'Excellent', color: '#10b981', icon: '🏆' };
        if (num >= 3.5) return { label: 'Very Good', color: '#0ea5e9', icon: '⭐' };
        if (num >= 3.0) return { label: 'Good', color: '#f59e0b', icon: '👍' };
        if (num >= 2.0) return { label: 'Satisfactory', color: '#84cc16', icon: '📈' };
        return { label: 'Needs Improvement', color: '#ef4444', icon: '⚠️' };
    };

    const getRatingColor = (rating) => {
        const num = safeNumber(rating);
        if (num >= 4.5) return '#10b981';
        if (num >= 3.5) return '#0ea5e9';
        if (num >= 3.0) return '#f59e0b';
        if (num >= 2.0) return '#84cc16';
        return '#ef4444';
    };

    // Format rating safely
    const formatRating = (rating) => {
        const num = safeNumber(rating);
        return num.toFixed(2);
    };

    // Export to Excel
    const exportToExcel = () => {
        const exportData = evaluations.map(ev => ({
            'Course Name': ev.course_name || '—',
            'Course Code': ev.course_code || '—',
            'Total Evaluations': safeNumber(ev.total_evaluations),
            'Average Rating': formatRating(ev.average_rating),
            'Performance Level': getPerformanceLevel(ev.average_rating).label,
            'Unique Students': safeNumber(ev.unique_students)
        }));
        
        const summaryData = [
            ['Metric', 'Value'],
            ['Average Rating', `${formatRating(summary?.averageRating)} / 5.0`],
            ['Total Evaluations', safeNumber(summary?.totalEvaluations)],
            ['Courses Taught', safeNumber(summary?.courseCount) || evaluations.length],
            ['Unique Students', safeNumber(summary?.uniqueStudents)]
        ];
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        const wsData = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
        XLSX.utils.book_append_sheet(wb, wsData, 'Course Details');
        
        XLSX.writeFile(wb, `instructor_results_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Export to PDF
    const exportToPDF = () => {
        setExporting(true);
        
        try {
            const doc = new jsPDF('landscape', 'mm', 'a4');
            
            doc.setFontSize(20);
            doc.setTextColor(0, 51, 102);
            doc.text('IESA - Instructor Evaluation Results', 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
            doc.text(`Instructor: ${user?.name || 'N/A'}`, 14, 36);
            doc.text('Admas University - Instructor Evaluation System', 14, 42);
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text('Performance Summary', 14, 54);
            
            const summaryData = [
                ['Average Rating', `${formatRating(summary?.averageRating)} / 5.0`],
                ['Total Evaluations', safeNumber(summary?.totalEvaluations).toString()],
                ['Courses Taught', (safeNumber(summary?.courseCount) || evaluations.length).toString()],
                ['Unique Students', safeNumber(summary?.uniqueStudents).toString()]
            ];
            
            doc.autoTable({
                startY: 58,
                head: [['Metric', 'Value']],
                body: summaryData,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
                margin: { left: 14, right: 14 }
            });
            
            let yPos = doc.lastAutoTable.finalY + 10;
            doc.text('Course Performance Details', 14, yPos);
            
            const tableData = evaluations.map(ev => [
                ev.course_name || '—',
                ev.course_code || '—',
                safeNumber(ev.total_evaluations).toString(),
                formatRating(ev.average_rating),
                getPerformanceLevel(ev.average_rating).label
            ]);
            
            doc.autoTable({
                startY: yPos + 5,
                head: [['Course Name', 'Course Code', 'Evaluations', 'Avg Rating', 'Performance Level']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
                margin: { left: 14, right: 14 }
            });
            
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`© 2024 Admas University - IESA System | Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
            }
            
            doc.save(`instructor_results_${new Date().toISOString().split('T')[0]}.pdf`);
            
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("Failed to generate PDF");
        } finally {
            setExporting(false);
        }
    };

    const avgRating = safeNumber(summary?.averageRating);
    const totalEvals = safeNumber(summary?.totalEvaluations);
    const performanceLevel = getPerformanceLevel(avgRating);

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading your evaluation results...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.errorContainer}>
                <div style={styles.errorIcon}>⚠️</div>
                <h3>Error Loading Results</h3>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} style={styles.retryBtn}>Retry</button>
            </div>
        );
    }

    return (
        <main style={styles.main}>
            {/* Header Section */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>📊 My Evaluation Results</h1>
                    <p style={styles.subtitle}>View your performance metrics and student feedback</p>
                </div>
                <div style={styles.headerButtons}>
                    <button onClick={exportToExcel} style={styles.excelBtn}>📊 Export Excel</button>
                    <button onClick={exportToPDF} style={styles.pdfBtn} disabled={exporting}>
                        {exporting ? '⏳ Generating...' : '📑 Export PDF'}
                    </button>
                </div>
            </div>

            {/* Welcome Banner */}
            <div style={styles.welcomeBanner}>
                <div style={styles.welcomeIcon}>👨‍🏫</div>
                <div>
                    <h2 style={styles.welcomeTitle}>Welcome back, {user?.name || 'Instructor'}!</h2>
                    <p style={styles.welcomeText}>Here's your performance summary based on student evaluations.</p>
                </div>
                <div style={styles.dateBadge}>
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* Statistics Cards */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>⭐</div>
                    <div>
                        <p style={styles.statLabel}>Average Rating</p>
                        <h3 style={{...styles.statValue, color: getRatingColor(avgRating)}}>
                            {formatRating(avgRating)} <span style={styles.statUnit}>/ 5.0</span>
                        </h3>
                        <p style={styles.statSubtitle}>{performanceLevel.label}</p>
                    </div>
                </div>
                
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>📝</div>
                    <div>
                        <p style={styles.statLabel}>Total Evaluations</p>
                        <h3 style={styles.statValue}>{totalEvals}</h3>
                        <p style={styles.statSubtitle}>from {safeNumber(summary?.uniqueStudents)} students</p>
                    </div>
                </div>
                
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>📚</div>
                    <div>
                        <p style={styles.statLabel}>Courses Taught</p>
                        <h3 style={styles.statValue}>{safeNumber(summary?.courseCount) || evaluations.length}</h3>
                        <p style={styles.statSubtitle}>active courses</p>
                    </div>
                </div>
                
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>🎓</div>
                    <div>
                        <p style={styles.statLabel}>Unique Students</p>
                        <h3 style={styles.statValue}>{safeNumber(summary?.uniqueStudents)}</h3>
                        <p style={styles.statSubtitle}>who evaluated you</p>
                    </div>
                </div>
            </div>

            {/* Performance Level Banner */}
            <div style={{...styles.performanceBanner, backgroundColor: performanceLevel.color + '15', borderLeftColor: performanceLevel.color}}>
                <span style={styles.performanceIcon}>{performanceLevel.icon}</span>
                <div>
                    <span style={styles.performanceLabel}>Performance Level: </span>
                    <span style={{...styles.performanceValue, color: performanceLevel.color}}>{performanceLevel.label}</span>
                </div>
                <div style={styles.performanceMessage}>
                    {avgRating >= 4.5 ? 'Excellent work! Keep inspiring your students!' :
                     avgRating >= 3.5 ? 'Great job! You are doing very well!' :
                     avgRating >= 3.0 ? 'Good work! There\'s room for improvement.' :
                     avgRating >= 2.0 ? 'Keep working on improving your teaching methods.' :
                     'Focus on improving student engagement and teaching effectiveness.'}
                </div>
            </div>

            {/* Course Performance Table */}
            <div style={styles.tableCard}>
                <div style={styles.tableHeader}>
                    <h3 style={styles.tableTitle}>📋 Course Performance Details</h3>
                    <span style={styles.tableCount}>{evaluations.length} courses</span>
                </div>
                
                <div style={styles.tableContainer}>
                    {evaluations.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>📭</div>
                            <p>No evaluation data available yet.</p>
                            <p style={styles.emptySubtext}>Once students evaluate your courses, results will appear here.</p>
                        </div>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.theadRow}>
                                    <th style={styles.th}>#</th>
                                    <th style={styles.th}>Course Name</th>
                                    <th style={styles.th}>Course Code</th>
                                    <th style={styles.th}>Evaluations</th>
                                    <th style={styles.th}>Avg Rating</th>
                                    <th style={styles.th}>Performance</th>
                                    <th style={styles.th}>Students</th>
                                   </tr>
                            </thead>
                            <tbody>
                                {evaluations.map((ev, idx) => {
                                    const rating = safeNumber(ev.average_rating);
                                    const level = getPerformanceLevel(rating);
                                    
                                    return (
                                        <tr key={ev.course_id || ev.id || idx} style={styles.tableRow}>
                                            <td style={styles.td}>{idx + 1}</td>
                                            <td style={{...styles.td, fontWeight: '600'}}>{ev.course_name || '—'}</td>
                                            <td style={styles.td}>{ev.course_code || '—'}</td>
                                            <td style={styles.td}>{safeNumber(ev.total_evaluations)}</td>
                                            <td style={styles.td}>
                                                <span style={{...styles.ratingBadge, color: getRatingColor(rating), fontWeight: 'bold'}}>
                                                    {formatRating(rating)}
                                                </span>
                                             </td>
                                            <td style={styles.td}>
                                                <span style={{...styles.levelBadge, backgroundColor: level.color + '20', color: level.color}}>
                                                    {level.icon} {level.label}
                                                </span>
                                             </td>
                                            <td style={styles.td}>{safeNumber(ev.unique_students)}</td>
                                           </tr>
                                    );
                                })}
                            </tbody>
                         </table>
                    )}
                </div>
            </div>

            {/* Tips Section */}
            <div style={styles.tipsCard}>
                <h4 style={styles.tipsTitle}>💡 Tips to Improve Your Ratings</h4>
                <div style={styles.tipsGrid}>
                    <div style={styles.tipItem}>
                        <span style={styles.tipIcon}>🎯</span>
                        <span>Clearly communicate learning objectives</span>
                    </div>
                    <div style={styles.tipItem}>
                        <span style={styles.tipIcon}>💬</span>
                        <span>Encourage student participation and questions</span>
                    </div>
                    <div style={styles.tipItem}>
                        <span style={styles.tipIcon}>📝</span>
                        <span>Provide timely and constructive feedback</span>
                    </div>
                    <div style={styles.tipItem}>
                        <span style={styles.tipIcon}>🕐</span>
                        <span>Start and end classes on time</span>
                    </div>
                    <div style={styles.tipItem}>
                        <span style={styles.tipIcon}>📚</span>
                        <span>Use diverse teaching methods and materials</span>
                    </div>
                    <div style={styles.tipItem}>
                        <span style={styles.tipIcon}>🤝</span>
                        <span>Be available for student consultations</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={styles.footer}>
                <p>📊 Data last updated: {new Date().toLocaleString()}</p>
                <p style={styles.footerNote}>IESA - Instructor Evaluation System for Admas University</p>
            </div>
        </main>
    );
};

const styles = {
    main: { padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
    loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' },
    spinner: { width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    errorContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' },
    errorIcon: { fontSize: '48px', marginBottom: '20px' },
    retryBtn: { marginTop: '20px', padding: '10px 20px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' },
    title: { fontSize: '26px', color: '#1e293b', margin: 0, fontWeight: '700' },
    subtitle: { color: '#64748b', marginTop: '5px', fontSize: '14px' },
    headerButtons: { display: 'flex', gap: '10px' },
    excelBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
    pdfBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
    
    welcomeBanner: { display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: 'white', padding: '25px', borderRadius: '16px', marginBottom: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' },
    welcomeIcon: { fontSize: '48px' },
    welcomeTitle: { margin: 0, fontSize: '20px', color: '#1e293b' },
    welcomeText: { margin: '5px 0 0', color: '#64748b', fontSize: '14px' },
    dateBadge: { marginLeft: 'auto', padding: '6px 12px', backgroundColor: '#f1f5f9', borderRadius: '20px', fontSize: '12px', color: '#64748b' },
    
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '25px' },
    statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' },
    statIcon: { fontSize: '32px' },
    statLabel: { color: '#64748b', fontSize: '13px', marginBottom: '5px' },
    statValue: { fontSize: '28px', fontWeight: 'bold', margin: 0 },
    statUnit: { fontSize: '14px', fontWeight: 'normal', color: '#94a3b8' },
    statSubtitle: { fontSize: '11px', color: '#94a3b8', marginTop: '4px' },
    
    performanceBanner: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', borderRadius: '12px', marginBottom: '25px', borderLeft: '4px solid', flexWrap: 'wrap' },
    performanceIcon: { fontSize: '24px' },
    performanceLabel: { fontWeight: '600', fontSize: '14px' },
    performanceValue: { fontWeight: '700', fontSize: '14px' },
    performanceMessage: { fontSize: '13px', color: '#475569', flex: 1 },
    
    tableCard: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '25px' },
    tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e2e8f0' },
    tableTitle: { margin: 0, fontSize: '18px', color: '#334155', fontWeight: '600' },
    tableCount: { fontSize: '13px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    theadRow: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
    th: { textAlign: 'left', padding: '14px 16px', color: '#475569', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' },
    tableRow: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
    td: { padding: '14px 16px', color: '#334155', fontSize: '14px' },
    ratingBadge: { display: 'inline-block', padding: '4px 8px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' },
    levelBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
    
    emptyState: { textAlign: 'center', padding: '60px', color: '#64748b' },
    emptyIcon: { fontSize: '48px', marginBottom: '15px' },
    emptySubtext: { fontSize: '13px', marginTop: '8px', color: '#94a3b8' },
    
    tipsCard: { backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #dcfce7' },
    tipsTitle: { margin: '0 0 15px 0', fontSize: '16px', color: '#166534' },
    tipsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' },
    tipItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#14532d' },
    tipIcon: { fontSize: '16px' },
    
    footer: { textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '12px', borderTop: '1px solid #e2e8f0', marginTop: '20px' },
    footerNote: { fontSize: '11px', color: '#94a3b8', marginTop: '5px' }
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export default InstructorResults;