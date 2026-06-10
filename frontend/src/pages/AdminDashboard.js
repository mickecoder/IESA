import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import SemesterResetModal from '../components/SemesterResetModal';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalInstructors: 0,
        totalCourses: 0,
        totalCampuses: 0,
        totalDepartments: 0,
        totalEvaluations: 0,
        avgRating: 0,
        pendingEvaluations: 0,
        completionRate: 0
    });
    
    const [recentActivities, setRecentActivities] = useState([]);
    const [topPerformers, setTopPerformers] = useState([]);
    const [recentStudents, setRecentStudents] = useState([]);
    const [ratingDistribution, setRatingDistribution] = useState({
        excellent: 0,
        veryGood: 0,
        good: 0,
        satisfactory: 0,
        needsImprovement: 0
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            const [studentsRes, instructorsRes, coursesRes, campusesRes, departmentsRes, performanceRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/students'),
                axios.get('http://localhost:5000/api/admin/instructors'),
                axios.get('http://localhost:5000/api/admin/courses'),
                axios.get('http://localhost:5000/api/admin/campuses'),
                axios.get('http://localhost:5000/api/admin/departments'),
                axios.get('http://localhost:5000/api/admin/performance')
            ]);
            
            const students = studentsRes.data || [];
            const instructors = instructorsRes.data || [];
            const courses = coursesRes.data || [];
            const campuses = campusesRes.data || [];
            const departments = departmentsRes.data || [];
            const performance = performanceRes.data || [];
            
            const totalEvaluations = performance.reduce((sum, p) => sum + (parseInt(p.total_evaluations) || 0), 0);
            const validRatings = performance.filter(p => parseFloat(p.average_rating) > 0);
            const avgRating = validRatings.length > 0 
                ? validRatings.reduce((sum, p) => sum + (parseFloat(p.average_rating) || 0), 0) / validRatings.length 
                : 0;
            
            const distribution = {
                excellent: performance.filter(p => parseFloat(p.average_rating) >= 4.5).length,
                veryGood: performance.filter(p => parseFloat(p.average_rating) >= 3.5 && parseFloat(p.average_rating) < 4.5).length,
                good: performance.filter(p => parseFloat(p.average_rating) >= 3.0 && parseFloat(p.average_rating) < 3.5).length,
                satisfactory: performance.filter(p => parseFloat(p.average_rating) >= 2.0 && parseFloat(p.average_rating) < 3.0).length,
                needsImprovement: performance.filter(p => parseFloat(p.average_rating) > 0 && parseFloat(p.average_rating) < 2.0).length
            };
            
            const top5 = [...performance]
                .sort((a, b) => (parseFloat(b.average_rating) || 0) - (parseFloat(a.average_rating) || 0))
                .slice(0, 5)
                .map(p => ({
                    name: p.instructor_name,
                    rating: parseFloat(p.average_rating) || 0,
                    evaluations: parseInt(p.total_evaluations) || 0,
                    department: p.department
                }));
            
            const recent = students.slice(0, 10);
            
            setStats({
                totalStudents: students.length,
                totalInstructors: instructors.length,
                totalCourses: courses.length,
                totalCampuses: campuses.length,
                totalDepartments: departments.length,
                totalEvaluations: totalEvaluations,
                avgRating: avgRating.toFixed(2),
                pendingEvaluations: Math.max(0, students.length * 3 - totalEvaluations),
                completionRate: students.length > 0 ? ((totalEvaluations / (students.length * 3)) * 100).toFixed(1) : 0
            });
            
            setRatingDistribution(distribution);
            setTopPerformers(top5);
            setRecentStudents(recent);
            setRecentActivities(generateRecentActivities(students, courses, performance));
            
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
        } finally {
            setLoading(false);
        }
    };
    
    const generateRecentActivities = (students, courses, performance) => {
        const activities = [];
        
        if (students.length > 0) {
            activities.push({
                type: 'student',
                message: `${students.length} total students enrolled`,
                time: 'Current',
                icon: '🎓'
            });
        }
        
        if (courses.length > 0) {
            activities.push({
                type: 'course',
                message: `${courses.length} active courses`,
                time: 'Current',
                icon: '📚'
            });
        }
        
        const recentEvals = performance.filter(p => parseInt(p.total_evaluations) > 0).slice(0, 3);
        recentEvals.forEach(evaluation => {
            activities.push({
                type: 'evaluation',
                message: `${evaluation.instructor_name} received ${evaluation.total_evaluations} evaluations`,
                time: 'Recent',
                icon: '⭐'
            });
        });
        
        return activities.slice(0, 5);
    };
    
    const exportToExcel = () => {
        const exportData = {
            'System Statistics': [
                ['Metric', 'Value'],
                ['Total Students', stats.totalStudents],
                ['Total Instructors', stats.totalInstructors],
                ['Total Courses', stats.totalCourses],
                ['Total Campuses', stats.totalCampuses],
                ['Total Departments', stats.totalDepartments],
                ['Total Evaluations', stats.totalEvaluations],
                ['Average Rating', `${stats.avgRating} / 5.0`],
                ['Completion Rate', `${stats.completionRate}%`]
            ],
            'Top Performers': [
                ['Instructor Name', 'Department', 'Average Rating', 'Evaluations'],
                ...topPerformers.map(p => [p.name, p.department || 'N/A', p.rating.toFixed(2), p.evaluations])
            ],
            'Rating Distribution': [
                ['Level', 'Count'],
                ['Excellent (4.5+)', ratingDistribution.excellent],
                ['Very Good (3.5-4.5)', ratingDistribution.veryGood],
                ['Good (3.0-3.5)', ratingDistribution.good],
                ['Satisfactory (2.0-3.0)', ratingDistribution.satisfactory],
                ['Needs Improvement (<2.0)', ratingDistribution.needsImprovement]
            ]
        };
        
        const wb = XLSX.utils.book_new();
        
        for (const [sheetName, data] of Object.entries(exportData)) {
            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
        
        XLSX.writeFile(wb, `admin_dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
    };
    
    const exportToPDF = () => {
        setExporting(true);
        
        try {
            const doc = new jsPDF('landscape', 'mm', 'a4');
            
            doc.setFontSize(20);
            doc.setTextColor(0, 51, 102);
            doc.text('IESA - Admin Dashboard Report', 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
            doc.text('Admas University - Instructor Evaluation System', 14, 36);
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text('System Statistics', 14, 48);
            
            const statsData = [
                ['Total Students', stats.totalStudents.toString()],
                ['Total Instructors', stats.totalInstructors.toString()],
                ['Total Courses', stats.totalCourses.toString()],
                ['Total Campuses', stats.totalCampuses.toString()],
                ['Total Departments', stats.totalDepartments.toString()],
                ['Total Evaluations', stats.totalEvaluations.toString()],
                ['Average Rating', `${stats.avgRating} / 5.0`],
                ['Completion Rate', `${stats.completionRate}%`]
            ];
            
            doc.autoTable({
                startY: 52,
                head: [['Metric', 'Value']],
                body: statsData,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
                margin: { left: 14, right: 14 }
            });
            
            let yPos = doc.lastAutoTable.finalY + 10;
            doc.text('Top Performing Instructors', 14, yPos);
            
            const performersData = topPerformers.map(p => [
                p.name,
                p.department || 'N/A',
                p.rating.toFixed(2),
                p.evaluations.toString()
            ]);
            
            doc.autoTable({
                startY: yPos + 5,
                head: [['Instructor Name', 'Department', 'Avg Rating', 'Evaluations']],
                body: performersData,
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
            
            doc.save(`admin_dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
            
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("Failed to generate PDF");
        } finally {
            setExporting(false);
        }
    };
    
    const StatCard = ({ icon, title, value, color, subtitle }) => (
        <div style={styles.statCard}>
            <div style={{...styles.statIcon, backgroundColor: color + '20', color: color }}>
                {icon}
            </div>
            <div>
                <p style={styles.statLabel}>{title}</p>
                <h3 style={styles.statValue}>{value}</h3>
                {subtitle && <p style={styles.statSubtitle}>{subtitle}</p>}
            </div>
        </div>
    );
    
    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading dashboard data...</p>
            </div>
        );
    }
    
    return (
        <main style={styles.main}>
            <header style={styles.header}>
                <div>
                    <h2 style={styles.title}>📊 Admin Dashboard Overview</h2>
                    <p style={styles.subtitle}>Welcome back! Here's what's happening with your system today.</p>
                </div>
                {/* header distribution removed - moved to Student Dashboard */}
                <div style={styles.headerButtons}>
                    <button onClick={exportToExcel} style={styles.excelBtn}>📊 Export Excel</button>
                    <button onClick={exportToPDF} style={styles.pdfBtn} disabled={exporting}>
                        {exporting ? '⏳ Generating...' : '📑 Export PDF'}
                    </button>
                    <button onClick={() => window.print()} style={styles.printBtn}>🖨️ Print</button>
                    <button onClick={() => setShowResetModal(true)} style={styles.resetBtn}>🔄 Semester Reset</button>
                </div>
            </header>
            
            <div style={styles.statsGrid}>
                <StatCard icon="👨‍🎓" title="Total Students" value={stats.totalStudents} color="#0ea5e9" />
                <StatCard icon="👨‍🏫" title="Total Instructors" value={stats.totalInstructors} color="#10b981" />
                <StatCard icon="📚" title="Total Courses" value={stats.totalCourses} color="#f59e0b" />
                <StatCard icon="🏫" title="Total Campuses" value={stats.totalCampuses} color="#8b5cf6" />
                <StatCard icon="🏢" title="Departments" value={stats.totalDepartments} color="#ec4899" />
                <StatCard icon="⭐" title="Avg Rating" value={`${stats.avgRating} / 5.0`} color="#06b6d4" />
                <StatCard icon="📝" title="Evaluations" value={stats.totalEvaluations} color="#ef4444" />
                <StatCard icon="📊" title="Completion Rate" value={`${stats.completionRate}%`} color="#84cc16" subtitle={`${stats.pendingEvaluations} pending`} />
            </div>
            
            <div style={styles.twoColumnGrid}>
                {/* Left Column */}
                <div>
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>🏆 Top Performing Instructors</h3>
                            <span style={styles.cardBadge}>Last 30 days</span>
                        </div>
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.theadRow}>
                                        <th style={styles.th}>#</th>
                                        <th style={styles.th}>Instructor</th>
                                        <th style={styles.th}>Department</th>
                                        <th style={styles.th}>Rating</th>
                                        <th style={styles.th}>Evals</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topPerformers.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={styles.emptyState}>No data available</td>
                                        </tr>
                                    ) : (
                                        topPerformers.map((performer, idx) => (
                                            <tr key={idx} style={styles.tr}>
                                                <td style={styles.td}><span style={styles.rankBadge}>{idx + 1}</span></td>
                                                <td style={{...styles.td, fontWeight: '600'}}>{performer.name}</td>
                                                <td style={styles.td}>{performer.department || '—'}</td>
                                                <td style={styles.td}>
                                                    <span style={{
                                                        ...styles.ratingBadge,
                                                        backgroundColor: performer.rating >= 4 ? '#dcfce7' : performer.rating >= 3 ? '#fef3c7' : '#fee2e2',
                                                        color: performer.rating >= 4 ? '#166534' : performer.rating >= 3 ? '#92400e' : '#991b1b'
                                                    }}>
                                                        {performer.rating.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>{performer.evaluations}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>📊 Rating Distribution</h3>
                        <div style={styles.distributionContainer}>
                            <div style={styles.distributionItem}>
                                <div style={styles.distributionLabel}>
                                    <span style={{...styles.distributionDot, backgroundColor: '#10b981'}}></span>
                                    Excellent (4.5+)
                                </div>
                                <div style={styles.distributionBar}>
                                    <div style={{...styles.distributionFill, width: `${(ratingDistribution.excellent / stats.totalInstructors) * 100}%`, backgroundColor: '#10b981'}}></div>
                                </div>
                                <span style={styles.distributionCount}>{ratingDistribution.excellent}</span>
                            </div>
                            <div style={styles.distributionItem}>
                                <div style={styles.distributionLabel}>
                                    <span style={{...styles.distributionDot, backgroundColor: '#0ea5e9'}}></span>
                                    Very Good (3.5-4.5)
                                </div>
                                <div style={styles.distributionBar}>
                                    <div style={{...styles.distributionFill, width: `${(ratingDistribution.veryGood / stats.totalInstructors) * 100}%`, backgroundColor: '#0ea5e9'}}></div>
                                </div>
                                <span style={styles.distributionCount}>{ratingDistribution.veryGood}</span>
                            </div>
                            <div style={styles.distributionItem}>
                                <div style={styles.distributionLabel}>
                                    <span style={{...styles.distributionDot, backgroundColor: '#f59e0b'}}></span>
                                    Good (3.0-3.5)
                                </div>
                                <div style={styles.distributionBar}>
                                    <div style={{...styles.distributionFill, width: `${(ratingDistribution.good / stats.totalInstructors) * 100}%`, backgroundColor: '#f59e0b'}}></div>
                                </div>
                                <span style={styles.distributionCount}>{ratingDistribution.good}</span>
                            </div>
                            <div style={styles.distributionItem}>
                                <div style={styles.distributionLabel}>
                                    <span style={{...styles.distributionDot, backgroundColor: '#84cc16'}}></span>
                                    Satisfactory (2.0-3.0)
                                </div>
                                <div style={styles.distributionBar}>
                                    <div style={{...styles.distributionFill, width: `${(ratingDistribution.satisfactory / stats.totalInstructors) * 100}%`, backgroundColor: '#84cc16'}}></div>
                                </div>
                                <span style={styles.distributionCount}>{ratingDistribution.satisfactory}</span>
                            </div>
                            <div style={styles.distributionItem}>
                                <div style={styles.distributionLabel}>
                                    <span style={{...styles.distributionDot, backgroundColor: '#ef4444'}}></span>
                                    Needs Improvement (&lt;2.0)
                                </div>
                                <div style={styles.distributionBar}>
                                    <div style={{...styles.distributionFill, width: `${(ratingDistribution.needsImprovement / stats.totalInstructors) * 100}%`, backgroundColor: '#ef4444'}}></div>
                                </div>
                                <span style={styles.distributionCount}>{ratingDistribution.needsImprovement}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Right Column */}
                <div>
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>🎓 Recent Students</h3>
                            <button style={styles.viewAllBtn} onClick={() => navigate('/students')}>View All →</button>
                        </div>
                        <div style={styles.studentList}>
                            {recentStudents.length === 0 ? (
                                <p style={styles.emptyState}>No students found</p>
                            ) : (
                                recentStudents.map((student, idx) => (
                                    <div key={idx} style={styles.studentItem}>
                                        <div style={styles.studentAvatar}>
                                            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                                        </div>
                                        <div style={styles.studentInfo}>
                                            <p style={styles.studentName}>{student.name || 'Unknown'}</p>
                                            <p style={styles.studentId}>{student.email_or_id}</p>
                                        </div>
                                        <div style={styles.studentBadge}>
                                            {student.section_name || 'No Section'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>🔄 Recent Activities</h3>
                        <div style={styles.activityList}>
                            {recentActivities.length === 0 ? (
                                <p style={styles.emptyState}>No recent activities</p>
                            ) : (
                                recentActivities.map((activity, idx) => (
                                    <div key={idx} style={styles.activityItem}>
                                        <div style={styles.activityIcon}>{activity.icon}</div>
                                        <div style={styles.activityContent}>
                                            <p style={styles.activityMessage}>{activity.message}</p>
                                            <p style={styles.activityTime}>{activity.time}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div style={styles.footer}>
                <p>📊 Data last updated: {new Date().toLocaleString()}</p>
                <p style={styles.footerNote}>IESA - Instructor Evaluation System for Admas University</p>
            </div>

            {/* Semester Reset Modal */}
            {showResetModal && (
                <SemesterResetModal 
                    onClose={() => setShowResetModal(false)}
                    onResetComplete={() => {
                        fetchDashboardData();
                    }}
                />
            )}
        </main>
    );
};

const styles = {
    main: { padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
    loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' },
    spinner: { width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' },
    title: { fontSize: '26px', color: '#1e293b', margin: 0, fontWeight: '700' },
    subtitle: { color: '#64748b', marginTop: '5px', fontSize: '14px' },
    headerButtons: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    excelBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
    pdfBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
    printBtn: { backgroundColor: '#1e293b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
    resetBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' },
    statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' },
    statIcon: { width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
    statLabel: { color: '#64748b', fontSize: '13px', marginBottom: '5px' },
    statValue: { fontSize: '24px', color: '#1e293b', fontWeight: 'bold', margin: 0 },
    statSubtitle: { fontSize: '11px', color: '#94a3b8', marginTop: '4px' },
    twoColumnGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '30px' },
    card: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '25px' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e2e8f0' },
    cardTitle: { margin: 0, fontSize: '18px', color: '#334155', fontWeight: '600' },
    cardBadge: { fontSize: '12px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' },
    viewAllBtn: { backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    theadRow: { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
    th: { textAlign: 'left', padding: '12px 16px', color: '#64748b', fontSize: '12px', fontWeight: '600' },
    tr: { borderBottom: '1px solid #f1f5f9' },
    td: { padding: '12px 16px', color: '#334155', fontSize: '14px' },
    emptyState: { textAlign: 'center', padding: '40px', color: '#64748b' },
    rankBadge: { display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f1f5f9', textAlign: 'center', lineHeight: '24px', fontSize: '12px', fontWeight: '600' },
    ratingBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
    distributionContainer: { padding: '20px' },
    distributionItem: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' },
    distributionLabel: { display: 'flex', alignItems: 'center', gap: '8px', width: '140px', fontSize: '13px', color: '#475569' },
    distributionDot: { width: '10px', height: '10px', borderRadius: '50%' },
    distributionBar: { flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' },
    distributionFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' },
    distributionCount: { width: '30px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#334155' },
    studentList: { padding: '0 20px' },
    studentItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
    studentAvatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#0369a1' },
    studentInfo: { flex: 1 },
    studentName: { margin: 0, fontSize: '14px', fontWeight: '600', color: '#1e293b' },
    studentId: { margin: 0, fontSize: '12px', color: '#64748b' },
    studentBadge: { padding: '4px 10px', backgroundColor: '#f1f5f9', borderRadius: '20px', fontSize: '11px', color: '#475569' },
    activityList: { padding: '0 20px' },
    activityItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
    activityIcon: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
    activityContent: { flex: 1 },
    activityMessage: { margin: 0, fontSize: '13px', color: '#334155' },
    activityTime: { margin: 0, fontSize: '11px', color: '#94a3b8', marginTop: '2px' },
    footer: { textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '12px', borderTop: '1px solid #e2e8f0', marginTop: '20px' },
    footerNote: { fontSize: '11px', color: '#94a3b8', marginTop: '5px' }
};

// Header distribution styles
// header distribution styles removed (moved to StudentDashboard)

const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    @media print {
        body * { visibility: hidden; }
        #root, #report-content { visibility: visible; }
        #report-content { position: absolute; top: 0; left: 0; width: 100%; }
        .no-print { display: none; }
    }
`;
document.head.appendChild(styleSheet);

export default AdminDashboard;