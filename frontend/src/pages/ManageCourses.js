import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EditCourseModal from './EditCourseModal';
import BulkAssignModal from './BulkAssignModal';
import * as XLSX from 'xlsx';

const ManageCourses = () => {
    const [courses, setCourses] = useState([]);
    const [depts, setDepts] = useState([]);
    const [campuses, setCampuses] = useState([]);
    const [sections, setSections] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [selectedCampusId, setSelectedCampusId] = useState('');
    const [editingCourse, setEditingCourse] = useState(null);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    
    const [form, setForm] = useState({ 
        course_name: '', 
        course_code: '', 
        dept_id: '', 
        instructor_id: '', 
        section_id: '' 
    });

    const loadData = async () => {
        try {
            const [c, d, i, s, camp] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/courses-detailed'),
                axios.get('http://localhost:5000/api/admin/departments'),
                axios.get('http://localhost:5000/api/admin/instructors'),
                axios.get('http://localhost:5000/api/admin/sections'),
                axios.get('http://localhost:5000/api/admin/campuses')
            ]);
            setCourses(c.data); 
            setDepts(d.data); 
            setInstructors(i.data);
            setSections(s.data);
            setCampuses(camp.data);
        } catch (err) { 
            console.error("Error loading data", err); 
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Export to Excel
    const exportToExcel = () => {
        const exportData = courses.map(c => ({
            'Course Code': c.course_code || 'N/A',
            'Course Name': c.course_name,
            'Department': c.dept_name || 'None',
            'Section': c.section_name || 'Not Linked',
            'Instructor': c.instructor_name || 'Unassigned',
            'Campus': c.campus_name || 'N/A'
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Courses');
        XLSX.writeFile(wb, `courses_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleSelectCourse = (courseId) => {
        setSelectedCourses(prev => {
            if (prev.includes(courseId)) {
                return prev.filter(id => id !== courseId);
            } else {
                return [...prev, courseId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedCourses.length === courses.length) {
            setSelectedCourses([]);
        } else {
            setSelectedCourses(courses.map(c => c.id));
        }
    };

    const handleBulkAssignComplete = () => {
        setSelectedCourses([]);
        loadData();
    };

    const filteredSections = sections.filter(sec => {
        const matchesCampus = String(sec.campus_id) === String(selectedCampusId);
        if (!matchesCampus) return false;

        const activeDept = depts.find(d => String(d.dept_id) === String(form.dept_id));
        if (!activeDept) return true;

        const deptName = activeDept.name.toLowerCase();

        if (deptName.includes('computer science') || deptName.includes('cs')) {
            return sec.name.endsWith('CS1');
        } else if (deptName.includes('accounting')) {
            return sec.name.endsWith('A1');
        } else if (deptName.includes('marketing')) {
            return sec.name.endsWith('M1');
        } else if (deptName.includes('business')) {
            return sec.name.endsWith('B1');
        }
        return true;
    });

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        if (!form.course_name || !form.dept_id || !form.section_id) {
            return alert("Course Name, Department, and Section are required!");
        }
        
        try {
            await axios.post('http://localhost:5000/api/admin/courses', form);
            alert("Course successfully added!");
            setForm({ course_name: '', course_code: '', dept_id: '', instructor_id: '', section_id: '' }); 
            setSelectedCampusId('');
            loadData(); 
        } catch (err) { 
            alert(`Error: ${err.response?.data?.error || err.message}`); 
        }
    };

    const handleEditCourse = (course) => {
        setEditingCourse(course);
    };

    const refreshCourses = () => {
        loadData();
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Academic Curriculum Management Workspace</h2>

            {/* Bulk Actions Bar */}
            {selectedCourses.length > 0 && (
                <div style={styles.bulkBar}>
                    <span style={styles.bulkCount}>✅ {selectedCourses.length} course(s) selected</span>
                    <button onClick={() => setShowBulkModal(true)} style={styles.bulkAssignBtn}>📦 Bulk Assign to Section</button>
                    <button onClick={() => setSelectedCourses([])} style={styles.bulkClearBtn}>Clear Selection</button>
                </div>
            )}

            {/* Creation Card Interface */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>➕ Deploy New Course Instance</h3>
                <form onSubmit={handleSubmit} style={styles.gridForm}>
                    <input type="text" placeholder="Course Name *" style={styles.input} value={form.course_name} onChange={(e) => setForm({...form, course_name: e.target.value})} required />
                    <input type="text" placeholder="Course Code (e.g., CoSc-2111)" style={styles.input} value={form.course_code} onChange={(e) => setForm({...form, course_code: e.target.value})} />
                    <select style={styles.input} value={form.dept_id} onChange={(e) => { setForm({...form, dept_id: e.target.value, section_id: ''}); }} required>
                        <option value="">-- Select Department --</option>
                        {depts.map(d => <option key={d.dept_id} value={d.dept_id}>{d.name}</option>)}
                    </select>
                    <select style={styles.input} value={selectedCampusId} onChange={(e) => { setSelectedCampusId(e.target.value); setForm({...form, section_id: ''}); }} required>
                        <option value="">-- Select Campus --</option>
                        {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select style={styles.input} value={form.section_id} onChange={(e) => setForm({...form, section_id: e.target.value})} disabled={!selectedCampusId || !form.dept_id} required>
                        <option value="">
                            {!form.dept_id ? "-- Select Department First --" : !selectedCampusId ? "-- Select Campus First --" : filteredSections.length === 0 ? "-- No Matching Sections Found --" : "-- Select Section --"}
                        </option>
                        {filteredSections.map(s => (<option key={s.id} value={s.id}>{s.name} ({s.campus_name})</option>))}
                    </select>
                    <select style={styles.input} value={form.instructor_id} onChange={(e) => setForm({...form, instructor_id: e.target.value})}>
                        <option value="">-- Assign Instructor (Optional) --</option>
                        {instructors.map(i => <option key={i.instructor_id} value={i.instructor_id}>{i.name}</option>)}
                    </select>
                    <button type="submit" style={styles.submitBtn}>Save & Route Course Structure</button>
                </form>
            </div>

            {/* Master Data Inventory Table */}
            <div style={styles.card}>
                <div style={styles.tableHeader}>
                    <h3 style={styles.cardTitle}>📋 Active Course Master Inventory</h3>
                    <div style={styles.tableControls}>
                        <button onClick={exportToExcel} style={styles.excelBtn}>📊 Export Excel</button>
                        <label style={styles.selectAllLabel}>
                            <input type="checkbox" checked={selectedCourses.length === courses.length && courses.length > 0} onChange={handleSelectAll} style={styles.checkbox} />
                            Select All ({courses.length})
                        </label>
                    </div>
                </div>
                
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.theadRow}>
                                <th style={styles.thCheckbox}>Select</th>
                                <th style={styles.th}>Code</th>
                                <th style={styles.th}>Course Title</th>
                                <th style={styles.th}>Department</th>
                                <th style={styles.th}>Section</th>
                                <th style={styles.th}>Instructor</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No courses registered in inventory</td></tr>
                            ) : (
                                courses.map((course) => (
                                    <tr key={course.id} style={styles.tr}>
                                        <td style={styles.tdCheckbox}><input type="checkbox" checked={selectedCourses.includes(course.id)} onChange={() => handleSelectCourse(course.id)} style={styles.checkbox} /></td>
                                        <td style={styles.td}><code style={styles.code}>{course.course_code || 'N/A'}</code></td>
                                        <td style={styles.td}><strong>{course.course_name}</strong></td>
                                        <td style={styles.td}>{course.dept_name || <span style={{color: '#94a3b8'}}>None</span>}</td>
                                        <td style={styles.td}><span style={{...styles.sectionBadge, backgroundColor: course.section_name ? '#dcfce7' : '#fee2e2', color: course.section_name ? '#166534' : '#991b1b'}}>{course.section_name || '⚠️ Not Linked'}</span></td>
                                        <td style={styles.td}><span style={{...styles.badge, backgroundColor: course.instructor_name ? '#e0f2fe' : '#fee2e2', color: course.instructor_name ? '#0369a1' : '#991b1b'}}>{course.instructor_name || 'Unassigned'}</span></td>
                                        <td style={styles.td}><button onClick={() => handleEditCourse(course)} style={styles.editBtn}>✏️ Edit</button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {editingCourse && <EditCourseModal course={editingCourse} onClose={() => setEditingCourse(null)} onUpdate={refreshCourses} />}
            {showBulkModal && <BulkAssignModal selectedCourses={selectedCourses} onClose={() => setShowBulkModal(false)} onAssignComplete={handleBulkAssignComplete} />}
        </div>
    );
};

const styles = {
    container: { padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' },
    title: { color: '#1e293b', marginBottom: '25px', fontWeight: '700', fontSize: '24px' },
    bulkBar: { backgroundColor: '#e0f2fe', padding: '12px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #bae6fd' },
    bulkCount: { fontWeight: '600', color: '#0369a1', fontSize: '14px' },
    bulkAssignBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    bulkClearBtn: { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
    card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px' },
    cardTitle: { margin: '0 0 20px 0', fontSize: '18px', color: '#334155', fontWeight: '600' },
    gridForm: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '14px', outline: 'none' },
    submitBtn: { gridColumn: 'span 2', backgroundColor: '#0ea5e9', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '15px', marginTop: '5px' },
    tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    tableControls: { display: 'flex', alignItems: 'center', gap: '15px' },
    excelBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', marginRight: '10px' },
    selectAllLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', cursor: 'pointer' },
    checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    theadRow: { backgroundColor: '#f1f5f9' },
    th: { textAlign: 'left', padding: '14px 16px', color: '#475569', fontSize: '13px', fontWeight: 'bold' },
    thCheckbox: { textAlign: 'center', padding: '14px 16px', width: '50px' },
    tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
    td: { padding: '14px 16px', color: '#334155', fontSize: '14px' },
    tdCheckbox: { textAlign: 'center', padding: '14px 16px' },
    code: { backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' },
    sectionBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
    badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
    editBtn: { backgroundColor: '#0ea5e9', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }
};

export default ManageCourses;