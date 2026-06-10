import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PerformanceReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [departments, setDepartments] = useState([]);
    const [sortBy, setSortBy] = useState('rating');
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchTerm, setSearchTerm] = useState('');
    const [exporting, setExporting] = useState(false);
    const [summary, setSummary] = useState({
        totalInstructors: 0,
        avgSystemRating: 0,
        totalEvaluations: 0,
        topPerformer: null,
        highPerformersCount: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            const perfRes = await axios.get('http://localhost:5000/api/admin/performance');
            const deptRes = await axios.get('http://localhost:5000/api/admin/departments');
            setDepartments(deptRes.data);
            
            let performanceData = (perfRes.data || []).map(item => ({
                ...item,
                average_rating: parseFloat(item.average_rating) || 0,
                total_evaluations: parseInt(item.total_evaluations) || 0
            }));
            
            const totalEvals = performanceData.reduce((sum, r) => sum + (r.total_evaluations || 0), 0);
            const validRatings = performanceData.filter(r => r.average_rating > 0);
            const avgRating = validRatings.length > 0 
                ? validRatings.reduce((sum, r) => sum + r.average_rating, 0) / validRatings.length 
                : 0;
            const highPerformers = performanceData.filter(r => r.average_rating >= 4).length;
            const topPerformer = performanceData.length > 0 
                ? performanceData.reduce((max, r) => r.average_rating > max.average_rating ? r : max, performanceData[0])
                : null;
            
            setSummary({
                totalInstructors: performanceData.length,
                avgSystemRating: avgRating.toFixed(2),
                totalEvaluations: totalEvals,
                topPerformer: topPerformer,
                highPerformersCount: highPerformers
            });
            
            setReports(performanceData);
        } catch (err) {
            console.error("Error fetching performance data:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatRating = (rating) => {
        const num = parseFloat(rating);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    const getFilteredAndSortedReports = () => {
        let filtered = [...reports];
        
        if (selectedDepartment !== 'all') {
            filtered = filtered.filter(r => r.department_id === parseInt(selectedDepartment));
        }
        
        if (searchTerm) {
            filtered = filtered.filter(r => 
                (r.instructor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.department || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        filtered.sort((a, b) => {
            let aVal, bVal;
            switch(sortBy) {
                case 'rating':
                    aVal = a.average_rating || 0;
                    bVal = b.average_rating || 0;
                    break;
                case 'name':
                    aVal = a.instructor_name || '';
                    bVal = b.instructor_name || '';
                    return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                case 'evals':
                    aVal = a.total_evaluations || 0;
                    bVal = b.total_evaluations || 0;
                    break;
                default:
                    aVal = a.average_rating || 0;
                    bVal = b.average_rating || 0;
            }
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
        
        return filtered;
    };

    // ==================== PDF EXPORT (FIXED) ====================
    const exportToPDF = () => {
        setExporting(true);
        
        try {
            const filteredData = getFilteredAndSortedReports();
            // Create new PDF document
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            // Add Header
            doc.setFontSize(18);
            doc.setTextColor(0, 51, 102);
            doc.text('IESA - Instructor Performance Report', 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
            doc.text(`Admas University - Instructor Evaluation System`, 14, 36);
            
            // Add Summary Section
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text('Summary Statistics', 14, 48);
            
            const summaryData = [
                ['Total Instructors', summary.totalInstructors.toString()],
                ['Average System Rating', `${summary.avgSystemRating} / 5.0`],
                ['Total Evaluations', summary.totalEvaluations.toString()],
                ['High Performers', `${summary.highPerformersCount} / ${summary.totalInstructors}`],
                ['Top Performer', summary.topPerformer?.instructor_name || 'N/A']
            ];
            
            // Use doc.autoTable with proper syntax
            doc.autoTable({
                startY: 52,
                head: [['Metric', 'Value']],
                body: summaryData,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontSize: 10 },
                bodyStyles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            });
            
            // Add Filters Info
            let filtersY = doc.lastAutoTable.finalY + 8;
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            let filterText = `Filters: Department - ${selectedDepartment === 'all' ? 'All' : departments.find(d => d.dept_id === parseInt(selectedDepartment))?.name || 'All'}`;
            if (searchTerm) filterText += ` | Search: "${searchTerm}"`;
            filterText += ` | Sort: ${sortBy === 'rating' ? 'Average Rating' : sortBy === 'evals' ? 'Total Evaluations' : 'Instructor Name'} (${sortOrder === 'desc' ? 'Highest First' : 'Lowest First'})`;
            doc.text(filterText, 14, filtersY);
            
            // Add Performance Table
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text('Instructor Performance Details', 14, filtersY + 10);
            
            const tableData = filteredData.map((report, index) => [
                (index + 1).toString(),
                report.instructor_name || 'N/A',
                report.department || '—',
                (report.total_evaluations || 0).toString(),
                formatRating(report.average_rating),
                getPerformanceLevel(report.average_rating || 0)
            ]);
            
            doc.autoTable({
                startY: filtersY + 14,
                head: [['#', 'Instructor Name', 'Department', 'Evals', 'Avg Rating', 'Performance Level']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 14, right: 14 }
            });
            
            // Add Footer on all pages
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`© 2024 Admas University - IESA System | Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
            }
            
            // Save PDF
            doc.save(`performance_report_${new Date().toISOString().split('T')[0]}.pdf`);
            
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("Failed to generate PDF: " + err.message);
        } finally {
            setExporting(false);
        }
    };

    // ==================== EXCEL EXPORT ====================
    const exportToExcel = () => {
        const filteredData = getFilteredAndSortedReports();
        const exportData = filteredData.map(r => ({
            'Instructor Name': r.instructor_name || '',
            'Department': r.department || '',
            'Total Evaluations': r.total_evaluations || 0,
            'Average Rating': r.average_rating || 0,
            'Performance Level': getPerformanceLevel(r.average_rating || 0),
            'Rank': getRankLabel(r.average_rating || 0)
        }));
        
        const summarySheetData = [
            ['Metric', 'Value'],
            ['Total Instructors', summary.totalInstructors],
            ['Average System Rating', `${summary.avgSystemRating} / 5.0`],
            ['Total Evaluations', summary.totalEvaluations],
            ['High Performers', `${summary.highPerformersCount} / ${summary.totalInstructors}`],
            ['Top Performer', summary.topPerformer?.instructor_name || 'N/A'],
            ['Generated On', new Date().toLocaleString()]
        ];
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
        const wsData = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
        XLSX.utils.book_append_sheet(wb, wsData, 'Performance Data');
        
        XLSX.writeFile(wb, `performance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const getRatingColor = (rating) => {
        const num = parseFloat(rating);
        if (num >= 4.5) return '#10b981';
        if (num >= 3.5) return '#0ea5e9';
        if (num >= 3.0) return '#f59e0b';
        return '#ef4444';
    };

    const getPerformanceLevel = (rating) => {
        const num = parseFloat(rating);
        if (num >= 4.5) return 'Excellent';
        if (num >= 3.5) return 'Very Good';
        if (num >= 3.0) return 'Good';
        if (num >= 2.0) return 'Satisfactory';
        return 'Needs Improvement';
    };

    const getRankLabel = (rating) => {
        const num = parseFloat(rating);
        if (num >= 4.5) return '🏆 Top Performer';
        if (num >= 3.5) return '⭐ High Performer';
        if (num >= 3.0) return '👍 Average';
        return '📈 Needs Focus';
    };

    const filteredReports = getFilteredAndSortedReports();

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading performance data...</p>
            </div>
        );
    }

    return (
        <main style={styles.main}>
            <header style={styles.header}>
                <div>
                    <h2 style={styles.title}>📊 Instructor Performance Analytics</h2>
                    <p style={styles.subtitle}>Real-time evaluation metrics across all departments</p>
                </div>
                <div style={styles.headerButtons}>
                    <button onClick={exportToExcel} style={styles.excelBtn}>📊 Export Excel</button>
                    <button onClick={exportToPDF} style={styles.pdfBtn} disabled={exporting}>
                        {exporting ? '⏳ Generating...' : '📑 Export PDF'}
                    </button>
                    <button onClick={() => window.print()} style={styles.printBtn}>🖨️ Print</button>
                </div>
            </header>

            {/* Summary Cards */}
            <div style={styles.statsRow}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>👨‍🏫</div>
                    <div>
                        <p style={styles.statLabel}>Total Instructors</p>
                        <h3 style={styles.statValue}>{summary.totalInstructors}</h3>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>⭐</div>
                    <div>
                        <p style={styles.statLabel}>System Average</p>
                        <h3 style={{...styles.statValue, color: '#0ea5e9'}}>
                            {summary.avgSystemRating} / 5.0
                        </h3>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>📝</div>
                    <div>
                        <p style={styles.statLabel}>Total Evaluations</p>
                        <h3 style={styles.statValue}>{summary.totalEvaluations}</h3>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>🏆</div>
                    <div>
                        <p style={styles.statLabel}>Top Performer</p>
                        <h3 style={{...styles.statValue, color: '#10b981', fontSize: '18px'}}>
                            {summary.topPerformer?.instructor_name || 'N/A'}
                        </h3>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>🎯</div>
                    <div>
                        <p style={styles.statLabel}>High Performers</p>
                        <h3 style={{...styles.statValue, color: '#f59e0b'}}>
                            {summary.highPerformersCount} / {summary.totalInstructors}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div style={styles.filterBar}>
                <div style={styles.filterGroup}>
                    <label>Department:</label>
                    <select 
                        value={selectedDepartment} 
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        style={styles.select}
                    >
                        <option value="all">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept.dept_id} value={dept.dept_id}>{dept.name}</option>
                        ))}
                    </select>
                </div>
                
                <div style={styles.filterGroup}>
                    <label>Sort by:</label>
                    <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        style={styles.select}
                    >
                        <option value="rating">Average Rating</option>
                        <option value="evals">Total Evaluations</option>
                        <option value="name">Instructor Name</option>
                    </select>
                </div>
                
                <div style={styles.filterGroup}>
                    <label>Order:</label>
                    <select 
                        value={sortOrder} 
                        onChange={(e) => setSortOrder(e.target.value)}
                        style={styles.select}
                    >
                        <option value="desc">Highest First</option>
                        <option value="asc">Lowest First</option>
                    </select>
                </div>
                
                <div style={styles.filterGroup}>
                    <label>Search:</label>
                    <input 
                        type="text" 
                        placeholder="Search instructor or department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {/* Performance Table */}
            <div style={styles.tableCard}>
                <div style={styles.tableHeader}>
                    <h3 style={styles.tableTitle}>📋 Instructor Performance Matrix</h3>
                    <span style={styles.resultCount}>
                        Showing {filteredReports.length} of {reports.length} instructors
                    </span>
                </div>
                
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.theadRow}>
                                <th style={styles.th}>#</th>
                                <th style={styles.th}>Instructor Name</th>
                                <th style={styles.th}>Department</th>
                                <th style={styles.th}>Total Evals</th>
                                <th style={styles.th}>Avg. Rating</th>
                                <th style={styles.th}>Performance Level</th>
                                <th style={styles.th}>Rank</th>
                             </tr>
                        </thead>
                        <tbody>
                            {filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={styles.emptyState}>
                                        No performance data available
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((report, index) => {
                                    const rating = report.average_rating || 0;
                                    return (
                                        <tr key={report.instructor_id || index} style={styles.tr}>
                                            <td style={styles.td}>{index + 1}</td>
                                            <td style={{...styles.td, fontWeight: '600'}}>
                                                {report.instructor_name || 'N/A'}
                                            </td>
                                            <td style={styles.td}>{report.department || '—'}</td>
                                            <td style={styles.td}>{report.total_evaluations || 0}</td>
                                            <td style={{...styles.td, color: getRatingColor(rating), fontWeight: 'bold'}}>
                                                {formatRating(rating)}
                                            </td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    ...styles.levelBadge,
                                                    backgroundColor: rating >= 4 ? '#dcfce7' : rating >= 3 ? '#fef3c7' : '#fee2e2',
                                                    color: rating >= 4 ? '#166534' : rating >= 3 ? '#92400e' : '#991b1b'
                                                }}>
                                                    {getPerformanceLevel(rating)}
                                                </span>
                                            </td>
                                            <td style={styles.td}>
                                                <span style={styles.rankBadge}>
                                                    {getRankLabel(rating)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Statistics */}
            <div style={styles.footer}>
                <div style={styles.footerStats}>
                    <div>
                        <span>📊 Average Rating Distribution:</span>
                        <div style={styles.legend}>
                            <span style={{...styles.legendDot, backgroundColor: '#10b981'}}></span> Excellent (4.5+)
                            <span style={{...styles.legendDot, backgroundColor: '#0ea5e9'}}></span> Very Good (3.5-4.5)
                            <span style={{...styles.legendDot, backgroundColor: '#f59e0b'}}></span> Good (3.0-3.5)
                            <span style={{...styles.legendDot, backgroundColor: '#ef4444'}}></span> Needs Improvement (&lt;3.0)
                        </div>
                    </div>
                    <div>
                        <span>Last updated: {new Date().toLocaleString()}</span>
                    </div>
                </div>
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
    subtitle: { color: '#64748b', marginTop: '5px', fontSize: '14px' },
    headerButtons: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    excelBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
    pdfBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
    printBtn: { backgroundColor: '#1e293b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
    statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' },
    statIcon: { fontSize: '32px' },
    statLabel: { color: '#64748b', fontSize: '13px', marginBottom: '5px' },
    statValue: { fontSize: '24px', color: '#1e293b', fontWeight: 'bold', margin: 0 },
    filterBar: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '25px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end', border: '1px solid #e2e8f0' },
    filterGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    select: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer' },
    searchInput: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', width: '250px' },
    tableCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' },
    tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e2e8f0' },
    tableTitle: { margin: 0, fontSize: '18px', color: '#334155', fontWeight: '600' },
    resultCount: { fontSize: '13px', color: '#64748b' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    theadRow: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
    th: { padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' },
    tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
    td: { padding: '14px 16px', color: '#334155', fontSize: '14px' },
    emptyState: { textAlign: 'center', padding: '60px', color: '#64748b' },
    levelBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
    rankBadge: { fontSize: '12px', display: 'inline-block' },
    footer: { marginTop: '30px', padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' },
    footerStats: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', fontSize: '13px', color: '#64748b' },
    legend: { display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px', flexWrap: 'wrap' },
    legendDot: { display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', marginRight: '5px' }
};

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

export default PerformanceReports;