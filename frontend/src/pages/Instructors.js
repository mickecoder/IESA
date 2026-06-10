import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const Instructors = () => {
    const [instructors, setInstructors] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const [sections, setSections] = useState([]);
    
    const [formData, setFormData] = useState({ name: '', email_or_id: '', password: '', dept_id: '' });
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({ name: '', email_or_id: '', password: '', dept_id: '' });
    const [assignment, setAssignment] = useState({ courseId: '', instructorId: '' });
    
    const [selectedInstructorCourses, setSelectedInstructorCourses] = useState([]);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [selectedInstructorForCourses, setSelectedInstructorForCourses] = useState(null);

    useEffect(() => {
        refreshAllData();
    }, []);

    const refreshAllData = async () => {
        setLoading(true);
        try {
            const [instRes, courseRes, deptRes, sectionRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/instructors'),
                axios.get('http://localhost:5000/api/admin/courses-detailed'),
                axios.get('http://localhost:5000/api/admin/departments'),
                axios.get('http://localhost:5000/api/admin/sections')
            ]);
            setInstructors(Array.isArray(instRes.data) ? instRes.data : []);
            setCourses(Array.isArray(courseRes.data) ? courseRes.data : []);
            setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
            setSections(Array.isArray(sectionRes.data) ? sectionRes.data : []);
        } catch (err) {
            console.error("System synchronization drop:", err);
        } finally {
            setLoading(false);
        }
    };

    // Export to Excel
    const exportToExcel = () => {
        const exportData = instructors.map(i => ({
            'ID': i.instructor_id,
            'Name': i.name,
            'Department': i.dept_name || 'Not Assigned',
            'Email/ID': i.email_or_id || 'N/A',
            'Courses Taught': courses.filter(c => c.instructor_id === i.instructor_id).length
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Instructors');
        XLSX.writeFile(wb, `instructors_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    
    const handleCreateInstructor = async (e) => {
        e.preventDefault();
        const { name, email_or_id, password, dept_id } = formData;
        
        if (!name.trim() || !email_or_id.trim() || !password.trim()) {
            return alert("All field inputs must be populated.");
        }
        
        try {
            await axios.post('http://localhost:5000/api/admin/system-users', {
                name: name.trim(),
                email_or_id: email_or_id.trim(),
                password: password.trim(),
                role: 'instructor',
                dept_id: dept_id || null
            });
            
            alert("Instructor provisioned safely.");
            setFormData({ name: '', email_or_id: '', password: '', dept_id: '' });
            refreshAllData(); 
        } catch (err) {
            alert(err.response?.data?.error || "Failed to initialize account profile.");
        }
    };

    const startInlineEdit = (inst) => {
        setEditingId(inst.instructor_id);
        setEditFormData({
            name: inst.name || '',
            email_or_id: inst.email_or_id || '',
            password: inst.password || '123456',
            dept_id: inst.dept_id || ''
        });
    };

    const handleEditChange = (e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

    const handleSaveUpdate = async (id) => {
        try {
            await axios.put(`http://localhost:5000/api/admin/system-users/${id}/instructor`, {
                name: editFormData.name.trim(),
                email_or_id: editFormData.email_or_id.trim(),
                password: editFormData.password.trim(),
                role: 'instructor',
                dept_id: editFormData.dept_id || null
            });
            alert("Changes saved cleanly.");
            setEditingId(null);
            refreshAllData();
        } catch (err) {
            alert(err.response?.data?.error || "Update operation failed.");
        }
    };

    const handleDeleteInstructor = async (id) => {
        if (!window.confirm("Are you sure you want to delete this instructor?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/admin/system-users/${id}/instructor`);
            alert("Instructor profile wiped out.");
            refreshAllData();
        } catch (err) {
            alert("Database drop execution failed.");
        }
    };

    const handleAssignSelectionChange = (e) => setAssignment({ ...assignment, [e.target.name]: e.target.value });

    const executeCourseAssignment = async (e) => {
        e.preventDefault();
        const { courseId, instructorId } = assignment;
        if (!courseId || !instructorId) return alert("Select matching course and instructor metrics.");
        try {
            await axios.post(`http://localhost:5000/api/admin/courses/${courseId}/assign`, {
                instructor_id: parseInt(instructorId, 10)
            });
            alert("Instructor linked safely!");
            setAssignment({ courseId: '', instructorId: '' });
            refreshAllData();
        } catch (err) {
            alert(err.response?.data?.error || "Assignment allocation conflict.");
        }
    };

    const viewInstructorCourses = async (instructor) => {
        setSelectedInstructorForCourses(instructor);
        try {
            const instructorCourses = courses.filter(course => course.instructor_id === instructor.instructor_id);
            setSelectedInstructorCourses(instructorCourses);
            setShowCourseModal(true);
        } catch (err) {
            alert("Failed to load instructor courses");
        }
    };

    const removeCourseFromInstructor = async (courseId) => {
        if (!window.confirm("Remove this course from the instructor?")) return;
        try {
            await axios.post(`http://localhost:5000/api/admin/courses/${courseId}/assign`, {
                instructor_id: null
            });
            alert("Course removed from instructor");
            refreshAllData();
            if (selectedInstructorForCourses) {
                const updatedCourses = courses.filter(course => 
                    course.instructor_id === selectedInstructorForCourses.instructor_id && course.id !== courseId
                );
                setSelectedInstructorCourses(updatedCourses);
            }
        } catch (err) {
            alert("Failed to remove course");
        }
    };

    const [bulkAssignMode, setBulkAssignMode] = useState(false);
    const [selectedCoursesForBulk, setSelectedCoursesForBulk] = useState([]);
    const [targetInstructorId, setTargetInstructorId] = useState('');

    const startBulkAssign = () => {
        setBulkAssignMode(true);
        setSelectedCoursesForBulk([]);
        setTargetInstructorId('');
    };

    const toggleCourseSelection = (courseId) => {
        setSelectedCoursesForBulk(prev => 
            prev.includes(courseId) 
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const executeBulkAssign = async () => {
        if (!targetInstructorId) {
            alert("Please select an instructor");
            return;
        }
        if (selectedCoursesForBulk.length === 0) {
            alert("Please select at least one course");
            return;
        }

        try {
            for (const courseId of selectedCoursesForBulk) {
                await axios.post(`http://localhost:5000/api/admin/courses/${courseId}/assign`, {
                    instructor_id: parseInt(targetInstructorId, 10)
                });
            }
            alert(`Successfully assigned ${selectedCoursesForBulk.length} course(s) to instructor`);
            setBulkAssignMode(false);
            setSelectedCoursesForBulk([]);
            setTargetInstructorId('');
            refreshAllData();
        } catch (err) {
            alert("Failed to assign courses: " + (err.response?.data?.error || err.message));
        }
    };

    const unassignedCourses = courses.filter(course => !course.instructor_name);

    return (
        <div style={styles.workspacePageContainer}>
            <div style={styles.headerRow}>
                <h1 style={styles.mainTitle}>Instructor & Course Allocation Dashboard</h1>
                <button onClick={exportToExcel} style={styles.excelBtn}>📊 Export Excel</button>
            </div>

            {/* Bulk Assign Button */}
            <div style={styles.bulkBar}>
                <button onClick={startBulkAssign} style={styles.bulkAssignBtn}>📦 Bulk Assign Courses to Instructor</button>
                {unassignedCourses.length > 0 && (<span style={styles.unassignedBadge}>{unassignedCourses.length} course(s) need instructor assignment</span>)}
            </div>

            {/* Bulk Assign Modal */}
            {bulkAssignMode && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>Bulk Assign Courses to Instructor</h3>
                            <button onClick={() => setBulkAssignMode(false)} style={styles.closeBtn}>×</button>
                        </div>
                        <div style={styles.formGroup}>
                            <label>Select Instructor:</label>
                            <select value={targetInstructorId} onChange={(e) => setTargetInstructorId(e.target.value)} style={styles.select}>
                                <option value="">-- Choose Instructor --</option>
                                {instructors.map(inst => (<option key={inst.instructor_id} value={inst.instructor_id}>{inst.name}</option>))}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label>Select Courses to Assign:</label>
                            <div style={styles.courseList}>
                                {courses.map(course => (
                                    <label key={course.id} style={styles.courseCheckbox}>
                                        <input type="checkbox" checked={selectedCoursesForBulk.includes(course.id)} onChange={() => toggleCourseSelection(course.id)} />
                                        <span><strong>{course.course_name}</strong>{course.course_code && ` (${course.course_code})`}{course.instructor_name && ` - Currently: ${course.instructor_name}`}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setBulkAssignMode(false)} style={styles.cancelBtn}>Cancel</button>
                            <button onClick={executeBulkAssign} style={styles.saveBtn}>Assign {selectedCoursesForBulk.length} Course(s)</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TWO FORMS ROW */}
            <div style={styles.formsContainerRow}>
                {/* PROVISION CARD */}
                <div style={styles.systemCard}>
                    <h3 style={styles.cardHeaderTitle}>➕ Provision New Faculty Account</h3>
                    <form onSubmit={handleCreateInstructor} style={styles.verticalFormLayout}>
                        <div style={styles.inputGroup}><label style={styles.fieldDescriptorLabel}>Display/Full Name</label><input name="name" style={styles.formInput} placeholder="e.g. Dr. Abebe" value={formData.name} onChange={handleFormChange} /></div>
                        <div style={styles.inputGroup}><label style={styles.fieldDescriptorLabel}>Email Address / Login ID</label><input name="email_or_id" style={styles.formInput} placeholder="name@domain.com" value={formData.email_or_id} onChange={handleFormChange} /></div>
                        <div style={styles.inputGroup}><label style={styles.fieldDescriptorLabel}>Initial System Password</label><input name="password" type="text" style={styles.formInput} placeholder="Create pass-key..." value={formData.password} onChange={handleFormChange} /></div>
                        <div style={styles.inputGroup}><label style={styles.fieldDescriptorLabel}>Department (Optional)</label><select name="dept_id" style={styles.selectInput} value={formData.dept_id} onChange={handleFormChange}><option value="">-- Select Department --</option>{departments.map(d => (<option key={d.dept_id} value={d.dept_id}>{d.name}</option>))}</select></div>
                        <button type="submit" style={styles.registerButton}>Register Instructor</button>
                    </form>
                </div>

                {/* ALLOCATION CARD */}
                <div style={styles.systemCard}>
                    <h3 style={styles.cardHeaderTitle}>🔗 Assign Faculty to Active Academic Courses</h3>
                    <form onSubmit={executeCourseAssignment} style={styles.verticalFormLayout}>
                        <div style={styles.inputGroup}><label style={styles.fieldDescriptorLabel}>Choose Target Curriculum Course:</label><select name="courseId" style={styles.selectInput} value={assignment.courseId} onChange={handleAssignSelectionChange}><option value="">-- Select Active Course --</option>{courses.map(c => (<option key={c.id} value={c.id}>{c.course_name} ({c.course_code || 'No Code'}) {c.instructor_name ? ` - Assigned to: ${c.instructor_name}` : ' - Unassigned'}</option>))}</select></div>
                        <div style={styles.inputGroup}><label style={styles.fieldDescriptorLabel}>Choose Faculty Assignee:</label><select name="instructorId" style={styles.selectInput} value={assignment.instructorId} onChange={handleAssignSelectionChange}><option value="">-- Select Instructor --</option>{instructors.map(i => (<option key={i.instructor_id} value={i.instructor_id}>{i.name}</option>))}</select></div>
                        <button type="submit" style={styles.linkAssignmentButton}>Link Faculty Assignment</button>
                    </form>
                </div>
            </div>

            {/* SYSTEM TABLE REGISTRY */}
            <div style={styles.tableCardContainer}>
                <h3 style={styles.cardHeaderTitle}>📋 Faculty Registry Operations (CRUD)</h3>
                {loading ? (<p style={styles.statusStateText}>Syncing records registry...</p>) : (
                    <div style={styles.tableResponsiveContainer}>
                        <table style={styles.registryTable}>
                            <thead><tr style={styles.tableHeaderRow}><th style={{ ...styles.tableTh, width: '60px' }}>ID</th><th style={styles.tableTh}>Instructor Full Name</th><th style={styles.tableTh}>Department</th><th style={styles.tableTh}>Login Email Reference</th><th style={styles.tableTh}>Assigned Courses</th><th style={{ ...styles.tableTh, textAlign: 'center', width: '200px' }}>Management Actions</th></tr></thead>
                            <tbody>
                                {instructors.map((inst) => {
                                    const isEditing = editingId === inst.instructor_id;
                                    const instructorCourseCount = courses.filter(c => c.instructor_id === inst.instructor_id).length;
                                    return (
                                        <tr key={inst.instructor_id} style={styles.tableRow}>
                                            {isEditing ? (
                                                <>
                                                    <td style={styles.tableTd}>#{inst.instructor_id}</td>
                                                    <td style={styles.tableTd}><input name="name" style={styles.tableInlineInput} value={editFormData.name} onChange={handleEditChange} /></td>
                                                    <td style={styles.tableTd}><select name="dept_id" style={styles.tableInlineSelect} value={editFormData.dept_id} onChange={handleEditChange}><option value="">-- None --</option>{departments.map(d => (<option key={d.dept_id} value={d.dept_id}>{d.name}</option>))}</select></td>
                                                    <td style={styles.tableTd}><input name="email_or_id" style={styles.tableInlineInput} value={editFormData.email_or_id} onChange={handleEditChange} /></td>
                                                    <td style={styles.tableTd}>-</td>
                                                    <td style={styles.tableActionTd}><button onClick={() => handleSaveUpdate(inst.instructor_id)} style={styles.actionSaveButton}>Save</button><button onClick={() => setEditingId(null)} style={styles.actionCancelButton}>Cancel</button></td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ ...styles.tableTd, color: '#64748b' }}>#{inst.instructor_id}</td>
                                                    <td style={styles.tableTdName}>{inst.name}</td>
                                                    <td style={styles.tableTd}>{inst.dept_name || '—'}</td>
                                                    <td style={styles.tableTd}>{inst.email_or_id || "No Email Registered"}</td>
                                                    <td style={styles.tableTd}><button onClick={() => viewInstructorCourses(inst)} style={styles.viewCoursesBtn}>📚 View ({instructorCourseCount})</button></td>
                                                    <td style={styles.tableActionTd}><button onClick={() => startInlineEdit(inst)} style={styles.actionEditButton}>Edit</button><button onClick={() => handleDeleteInstructor(inst.instructor_id)} style={styles.actionDeleteButton}>Delete</button></td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* View Courses Modal */}
            {showCourseModal && selectedInstructorForCourses && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}><h3>Courses Assigned to: {selectedInstructorForCourses.name}</h3><button onClick={() => setShowCourseModal(false)} style={styles.closeBtn}>×</button></div>
                        {selectedInstructorCourses.length === 0 ? (<p style={styles.noCoursesText}>No courses assigned to this instructor yet.</p>) : (
                            <table style={styles.modalTable}><thead><tr><th>Course Name</th><th>Course Code</th><th>Department</th><th>Section</th><th>Action</th></tr></thead><tbody>{selectedInstructorCourses.map(course => (<tr key={course.id}><td>{course.course_name}</td><td>{course.course_code || '—'}</td><td>{course.dept_name || '—'}</td><td>{course.section_name || '—'}</td><td><button onClick={() => removeCourseFromInstructor(course.id)} style={styles.removeBtn}>Remove</button></td></tr>))}</tbody></table>
                        )}
                        <div style={styles.modalFooter}><button onClick={() => setShowCourseModal(false)} style={styles.cancelBtn}>Close</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    workspacePageContainer: { flex: 1, padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box', overflowY: 'auto' },
    headerRow: { marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    mainTitle: { fontSize: '26px', color: '#1a2235', margin: 0, fontWeight: 'bold' },
    excelBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
    bulkBar: { backgroundColor: '#e0f2fe', padding: '12px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' },
    bulkAssignBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
    unassignedBadge: { backgroundColor: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' },
    formsContainerRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px', boxSizing: 'border-box' },
    systemCard: { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', padding: '24px', boxSizing: 'border-box' },
    tableCardContainer: { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', padding: '24px', boxSizing: 'border-box' },
    cardHeaderTitle: { margin: '0 0 20px 0', fontSize: '16px', fontWeight: 'bold', color: '#1a2235' },
    verticalFormLayout: { display: 'flex', flexDirection: 'column', gap: '16px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    fieldDescriptorLabel: { fontSize: '13px', fontWeight: '600', color: '#475569' },
    formInput: { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#334155', boxSizing: 'border-box', outline: 'none' },
    selectInput: { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#334155', backgroundColor: '#ffffff', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' },
    registerButton: { backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
    linkAssignmentButton: { backgroundColor: '#00a8ff', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
    tableResponsiveContainer: { width: '100%', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' },
    registryTable: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff' },
    tableHeaderRow: { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
    tableTh: { padding: '14px 18px', fontSize: '13px', fontWeight: '600', color: '#64748b', textAlign: 'left' },
    tableRow: { borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' },
    tableTd: { padding: '12px 18px', fontSize: '14px', color: '#475569', verticalAlign: 'middle' },
    tableTdName: { padding: '12px 18px', fontSize: '14px', color: '#1a2235', fontWeight: 'bold', verticalAlign: 'middle' },
    tableActionTd: { padding: '12px 18px', gap: '8px', display: 'flex', alignItems: 'center' },
    tableInlineInput: { width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' },
    tableInlineSelect: { width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: 'white' },
    statusStateText: { color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px' },
    viewCoursesBtn: { backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' },
    actionEditButton: { backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    actionDeleteButton: { backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    actionSaveButton: { backgroundColor: '#dcfce7', color: '#15803d', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    actionCancelButton: { backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', borderRadius: '12px', padding: '30px', width: '600px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #e2e8f0' },
    closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' },
    formGroup: { marginBottom: '20px' },
    select: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' },
    courseList: { maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' },
    courseCheckbox: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' },
    cancelBtn: { padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' },
    saveBtn: { padding: '8px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    removeBtn: { backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    noCoursesText: { textAlign: 'center', padding: '40px', color: '#64748b' },
    modalTable: { width: '100%', borderCollapse: 'collapse' }
};

export default Instructors;