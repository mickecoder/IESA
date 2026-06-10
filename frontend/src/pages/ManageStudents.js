import axios from 'axios';
import Papa from 'papaparse';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const ManageStudents = () => {
    const [file, setFile] = useState(null);
    const [students, setStudents] = useState([]);
    const [campuses, setCampuses] = useState([]);
    const [departments, setDepartments] = useState([]); 
    const [sections, setSections] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [fileError, setFileError] = useState('');
    const [showBulkSectionModal, setShowBulkSectionModal] = useState(false);
    const [bulkSectionId, setBulkSectionId] = useState('');
    const [showCoursesModal, setShowCoursesModal] = useState(false);
    const [selectedStudentCourses, setSelectedStudentCourses] = useState([]);
    const [selectedStudentName, setSelectedStudentName] = useState('');

    const [formData, setFormData] = useState({ name: '', email_or_id: '', password: '', campus_id: '', dept_id: '', section_id: '' });
    const [editingId, setEditingId] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    const [filterData, setFilterData] = useState({
        searchQuery: '',
        campus_id: '',
        dept_id: '',
        section_id: ''
    });

    useEffect(() => { 
        fetchStudents(); 
        fetchMetadata(); 
    }, []);

    const fetchStudents = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/students');
            setStudents(res.data);
            setSelectedIds([]); 
        } catch (err) { console.error("Fetch error", err); }
    };

    const fetchMetadata = async () => {
        try {
            const campusRes = await axios.get('http://localhost:5000/api/admin/campuses');
            const deptRes = await axios.get('http://localhost:5000/api/admin/departments');
            const sectionRes = await axios.get('http://localhost:5000/api/admin/sections');
            setCampuses(campusRes.data);
            setDepartments(deptRes.data);
            setSections(sectionRes.data);
        } catch (err) { console.error("Error loading dropdown data layers", err); }
    };

    // ==================== FILE IMPORT (Excel + CSV) ====================
    const handleFileUpload = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        
        const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
        
        if (fileExtension === 'csv') {
            handleCSVImport(selectedFile);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            handleExcelImport(selectedFile);
        } else {
            setFileError('Please upload a CSV or Excel (.xlsx, .xls) file');
            alert('Unsupported file format. Please upload CSV or Excel files only.');
        }
    };

    const handleCSVImport = (csvFile) => {
        setUploading(true);
        setFileError('');

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const payload = results.data.map(row => ({
                    name: row.name || row.Name || row['Full Name'] || '',
                    email_or_id: row.email_or_id || row['Student ID'] || row.student_id || row.id || '',
                    password: row.password || '123456',
                    campus_name: row.campus_name || row.Campus || row.campus || '',
                    dept_name: row.dept_name || row.Department || row.department || '',
                    section_name: row.section_name || row.Section || row.section || ''
                })).filter(s => s.email_or_id);

                await processImport(payload);
            },
            error: (err) => {
                console.error("CSV Parse error:", err);
                setFileError('Failed to parse CSV file');
                setUploading(false);
            }
        });
    };

    const handleExcelImport = (excelFile) => {
        setUploading(true);
        setFileError('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                
                console.log("Excel data:", jsonData);
                
                const payload = jsonData.map(row => ({
                    name: row.name || row.Name || row['Full Name'] || row.FullName || '',
                    email_or_id: row.email_or_id || row['Student ID'] || row.student_id || row.id || row.StudentID || '',
                    password: row.password || '123456',
                    campus_name: row.campus_name || row.Campus || row.campus || '',
                    dept_name: row.dept_name || row.Department || row.department || '',
                    section_name: row.section_name || row.Section || row.section || ''
                })).filter(s => s.email_or_id);
                
                if (payload.length === 0) {
                    throw new Error('No valid student records found in Excel file');
                }
                
                await processImport(payload);
            } catch (err) {
                console.error("Excel Parse error:", err);
                setFileError(err.message || 'Failed to parse Excel file');
                alert('Failed to parse Excel file: ' + err.message);
                setUploading(false);
            }
        };
        
        reader.onerror = () => {
            setFileError('Failed to read file');
            setUploading(false);
        };
        
        reader.readAsArrayBuffer(excelFile);
    };

    const processImport = async (payload) => {
        try {
            const res = await axios.post('http://localhost:5000/api/admin/import-students', payload);
            alert(res.data.message || `Successfully imported ${payload.length} students!`);
            fetchStudents();
        } catch (err) {
            console.error("Import error:", err);
            const errorMsg = err.response?.data?.error || "Import operation failed.";
            alert(errorMsg);
            setFileError(errorMsg);
        } finally {
            setUploading(false);
            setFile(null);
            // Reset file input
            const fileInput = document.getElementById('student-file-input');
            if (fileInput) fileInput.value = '';
        }
    };

    // ==================== EXPORT FUNCTIONS ====================
    const exportToExcel = () => {
        const dataToExport = filteredStudents.length > 0 ? filteredStudents : students;
        
        const exportData = dataToExport.map(s => ({
            'Student ID': s.email_or_id,
            'Full Name': s.name || '',
            'Password': s.password,
            'Campus': s.campus_name || '',
            'Department': s.dept_name || '',
            'Section': s.section_name || ''
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Students');
        XLSX.writeFile(wb, `students_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToCSV = () => {
        const dataToExport = filteredStudents.length > 0 ? filteredStudents : students;
        
        const csvData = dataToExport.map(s => ({
            'Student ID': s.email_or_id,
            'Full Name': s.name || '',
            'Password': s.password,
            'Campus': s.campus_name || '',
            'Department': s.dept_name || '',
            'Section': s.section_name || ''
        }));
        
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleBulkAssignSection = async () => {
        if (selectedIds.length === 0) {
            alert("No students selected");
            return;
        }
        if (!bulkSectionId) {
            alert("Please select a section");
            return;
        }
        
        try {
            for (const studentId of selectedIds) {
                await axios.put(`http://localhost:5000/api/admin/students/${studentId}`, {
                    section_id: parseInt(bulkSectionId, 10)
                });
            }
            alert(`✅ Successfully assigned ${selectedIds.length} student(s) to section`);
            setSelectedIds([]);
            setShowBulkSectionModal(false);
            setBulkSectionId('');
            fetchStudents();
        } catch (err) {
            alert("Failed to assign students: " + (err.response?.data?.error || err.message));
        }
    };

    const viewStudentCourses = async (student) => {
        setSelectedStudentName(student.name || student.email_or_id);
        try {
            const res = await axios.get(`http://localhost:5000/api/courses/section/${student.section_id}`);
            setSelectedStudentCourses(res.data);
            setShowCoursesModal(true);
        } catch (err) {
            alert("Failed to load student courses");
        }
    };

    const availableFormSections = sections.filter(sec => {
        const matchesCampus = String(sec.campus_id) === String(formData.campus_id);
        if (!matchesCampus) return false;

        const activeDept = departments.find(d => String(d.dept_id) === String(formData.dept_id));
        if (!activeDept) return false;

        const deptName = activeDept.name.toLowerCase();

        if (deptName.includes('computer science') || deptName.includes('cs')) {
            return sec.name && sec.name.endsWith('CS1');
        } else if (deptName.includes('accounting') || deptName.includes('finance')) {
            return sec.name && sec.name.endsWith('A1');
        } else if (deptName.includes('marketing')) {
            return sec.name && sec.name.endsWith('M1');
        } else if (deptName.includes('business')) {
            return sec.name && sec.name.endsWith('B1');
        }
        return true;
    });

    const availableFilterSections = sections.filter(sec => {
        const matchesCampus = filterData.campus_id === '' || String(sec.campus_id) === String(filterData.campus_id);
        if (!matchesCampus) return false;

        if (filterData.dept_id === '') return true; 

        const activeDept = departments.find(d => String(d.dept_id) === String(filterData.dept_id));
        if (!activeDept) return false;

        const deptName = activeDept.name.toLowerCase();

        if (deptName.includes('computer science') || deptName.includes('cs')) {
            return sec.name && sec.name.endsWith('CS1');
        } else if (deptName.includes('accounting') || deptName.includes('finance')) {
            return sec.name && sec.name.endsWith('A1');
        } else if (deptName.includes('marketing')) {
            return sec.name && sec.name.endsWith('M1');
        } else if (deptName.includes('business')) {
            return sec.name && sec.name.endsWith('B1');
        }
        return true;
    });

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email_or_id) return alert("Student ID field is required!");

        const submissionData = {
            name: formData.name ? formData.name.trim() : '',
            email_or_id: formData.email_or_id.trim(),
            password: formData.password || '123456', 
            campus_id: formData.campus_id ? parseInt(formData.campus_id, 10) : null,
            dept_id: formData.dept_id ? parseInt(formData.dept_id, 10) : null,
            section_id: formData.section_id ? parseInt(formData.section_id, 10) : null
        };

        try {
            if (editingId) {
                await axios.put(`http://localhost:5000/api/admin/students/${editingId}`, submissionData);
                alert("Student profile updated successfully!");
            } else {
                await axios.post('http://localhost:5000/api/admin/students', submissionData);
                alert("Student registered successfully!");
            }
            setFormData({ name: '', email_or_id: '', password: '', campus_id: '', dept_id: '', section_id: '' });
            setEditingId(null);
            fetchStudents();
        } catch (err) { alert(`Error processing action: ${err.response?.data?.error || err.message}`); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this student profile?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/admin/students/${id}`);
            fetchStudents();
        } catch (err) { alert("Deletion failed."); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Delete all ${selectedIds.length} selected records?`)) return;
        try {
            await axios.post('http://localhost:5000/api/admin/students/bulk-delete', { ids: selectedIds });
            setSelectedIds([]);
            fetchStudents();
        } catch (err) { alert("Bulk Action Interrupted."); }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
    };

    const handleSelectAll = (filteredRows) => {
        const filteredIds = filteredRows.map(s => s.id);
        const allSelected = filteredIds.every(id => selectedIds.includes(id));
        
        if (allSelected) {
            setSelectedIds(selectedIds.filter(id => !filteredIds.includes(id)));
        } else {
            setSelectedIds([...new Set([...selectedIds, ...filteredIds])]);
        }
    };

    const startEdit = (student) => {
        setEditingId(student.id);
        setFormData({
            name: student.name || '',
            email_or_id: student.email_or_id || '',
            password: student.password || '', 
            campus_id: student.campus_id || '',
            dept_id: student.dept_id || '',
            section_id: student.section_id || ''
        });
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch = 
            (student.email_or_id || '').toLowerCase().includes(filterData.searchQuery.toLowerCase()) ||
            (student.name || '').toLowerCase().includes(filterData.searchQuery.toLowerCase());
            
        const matchesCampus = filterData.campus_id === '' || String(student.campus_id) === String(filterData.campus_id);
        const matchesDept = filterData.dept_id === '' || String(student.dept_id) === String(filterData.dept_id);
        const matchesSection = filterData.section_id === '' || String(student.section_id) === String(filterData.section_id);

        return matchesSearch && matchesCampus && matchesDept && matchesSection;
    });

    const resetFilters = () => {
        setFilterData({ searchQuery: '', campus_id: '', dept_id: '', section_id: '' });
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Student Portal Management Workspace</h2>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div style={styles.bulkBar}>
                    <span style={styles.bulkCount}>✅ {selectedIds.length} student(s) selected</span>
                    <button onClick={() => setShowBulkSectionModal(true)} style={styles.bulkAssignBtn}>
                        📦 Bulk Assign to Section
                    </button>
                    <button onClick={handleBulkDelete} style={styles.bulkDeleteBtn}>
                        🗑️ Delete Selected
                    </button>
                    <button onClick={() => setSelectedIds([])} style={styles.bulkClearBtn}>
                        Clear Selection
                    </button>
                </div>
            )}

            {/* Export Buttons */}
            <div style={styles.exportBar}>
                <button onClick={exportToExcel} style={styles.excelBtn}>📊 Export Excel</button>
                <button onClick={exportToCSV} style={styles.exportBtn}>📥 Export CSV</button>
            </div>

            {/* Bulk Assign Section Modal */}
            {showBulkSectionModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>📦 Bulk Assign Students to Section</h3>
                            <button onClick={() => setShowBulkSectionModal(false)} style={styles.closeBtn}>×</button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <p style={styles.modalInfo}>
                                <strong>{selectedIds.length}</strong> student(s) selected for assignment
                            </p>
                            
                            <div style={styles.formGroup}>
                                <label>Select Target Section:</label>
                                <select 
                                    value={bulkSectionId} 
                                    onChange={(e) => setBulkSectionId(e.target.value)}
                                    style={styles.modalSelect}
                                >
                                    <option value="">-- Choose a section --</option>
                                    {sections.map(section => (
                                        <option key={section.id} value={section.id}>
                                            {section.name} {section.campus_name ? `(${section.campus_name})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button onClick={() => setShowBulkSectionModal(false)} style={styles.cancelBtn}>Cancel</button>
                            <button onClick={handleBulkAssignSection} style={styles.saveBtn}>
                                Assign {selectedIds.length} Student(s)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Courses Modal */}
            {showCoursesModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>📚 Courses for: {selectedStudentName}</h3>
                            <button onClick={() => setShowCoursesModal(false)} style={styles.closeBtn}>×</button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            {selectedStudentCourses.length === 0 ? (
                                <p style={styles.noCoursesText}>No courses enrolled for this student.</p>
                            ) : (
                                <table style={styles.modalTable}>
                                    <thead><tr><th>Course Name</th><th>Course Code</th></tr></thead>
                                    <tbody>
                                        {selectedStudentCourses.map(course => (
                                            <tr key={course.id}>
                                                <td>{course.course_name}</td>
                                                <td>{course.course_code || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setShowCoursesModal(false)} style={styles.cancelBtn}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Card */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>{editingId ? "✏️ Modify Student Profile" : "➕ Deploy Student Instance Manually"}</h3>
                <form onSubmit={handleFormSubmit} style={styles.formInline}>
                    <input type="text" placeholder="Full Name" style={styles.input} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    <input type="text" placeholder="Student ID" style={styles.input} value={formData.email_or_id} onChange={(e) => setFormData({...formData, email_or_id: e.target.value})} />
                    <input type="text" placeholder="Password (Default: 123456)" style={styles.input} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    
                    <select style={styles.select} value={formData.campus_id} onChange={(e) => setFormData({...formData, campus_id: e.target.value, section_id: ''})}>
                        <option value="">-- Campus --</option>
                        {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select style={styles.select} value={formData.dept_id} onChange={(e) => setFormData({...formData, dept_id: e.target.value, section_id: ''})}>
                        <option value="">-- Department --</option>
                        {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.name}</option>)}
                    </select>

                    <select style={styles.select} value={formData.section_id} onChange={(e) => setFormData({...formData, section_id: e.target.value})} disabled={!formData.campus_id || !formData.dept_id}>
                        <option value="">
                            {!formData.campus_id ? "Select Campus First" : !formData.dept_id ? "Select Department First" : availableFormSections.length === 0 ? "No Sections Found" : "-- Section --"}
                        </option>
                        {availableFormSections.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                    
                    <button type="submit" style={editingId ? styles.editBtn : styles.submitBtn}>{editingId ? "Update Info" : "Register Student"}</button>
                    {editingId && <button type="button" style={styles.cancelBtn} onClick={() => { setEditingId(null); setFormData({ name: '', email_or_id: '', password: '', campus_id: '', section_id: '', dept_id: '' }); }}>Cancel</button>}
                </form>
            </div>

            {/* Import Section - Now supports both CSV and Excel */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📥 Import Students (CSV or Excel)</h3>
                <p style={styles.helpText}>
                    Supported formats: <b>CSV, Excel (.xlsx, .xls)</b>
                    <br />
                    Required columns: <b>name, email_or_id, password, campus_name, dept_name, section_name</b>
                </p>
                <div style={styles.uploadBox}>
                    <input 
                        type="file" 
                        id="student-file-input"
                        accept=".csv,.xlsx,.xls" 
                        onChange={handleFileUpload} 
                        disabled={uploading}
                    />
                    <button onClick={() => document.getElementById('student-file-input').click()} 
                            style={styles.importBtn} 
                            disabled={uploading}>
                        {uploading ? "📤 Importing..." : "📂 Choose File"}
                    </button>
                    {uploading && <span style={styles.uploadingText}>Processing file...</span>}
                </div>
                {fileError && <p style={styles.errorText}>{fileError}</p>}
            </div>

            {/* Filter Panel */}
            <div style={styles.filterCard}>
                <h3 style={styles.filterCardTitle}>🔍 Live Directory Filter Matrix</h3>
                <div style={styles.formInline}>
                    <input type="text" placeholder="Search ID or Name..." style={styles.filterInput} value={filterData.searchQuery} onChange={(e) => setFilterData({...filterData, searchQuery: e.target.value})} />
                    <select style={styles.filterSelect} value={filterData.campus_id} onChange={(e) => setFilterData({...filterData, campus_id: e.target.value, section_id: ''})}>
                        <option value="">All Campuses</option>
                        {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select style={styles.filterSelect} value={filterData.dept_id} onChange={(e) => setFilterData({...filterData, dept_id: e.target.value, section_id: ''})}>
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.name}</option>)}
                    </select>
                    <select style={styles.filterSelect} value={filterData.section_id} onChange={(e) => setFilterData({...filterData, section_id: e.target.value})}>
                        <option value="">All Sections</option>
                        {availableFilterSections.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                    <button type="button" style={styles.resetBtn} onClick={resetFilters}>Reset Filters</button>
                </div>
            </div>

            {/* Data Table */}
            <div style={styles.card}>
                <div style={styles.tableHeaderArea}>
                    <h3 style={styles.cardTitle}>📋 Administrative Control Directory <span style={styles.rowCountText}> (Showing {filteredStudents.length} of {students.length} records)</span></h3>
                </div>

                <table style={styles.table}>
                    <thead>
                        <tr style={styles.thRow}>
                            <th style={styles.th}><input type="checkbox" checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.includes(s.id))} onChange={() => handleSelectAll(filteredStudents)} /></th>
                            <th style={styles.th}>Student ID</th><th style={styles.th}>Full Name</th><th style={styles.th}>Password</th>
                            <th style={styles.th}>Campus</th><th style={styles.th}>Department</th><th style={styles.th}>Section</th>
                            <th style={styles.th}>Courses</th><th style={styles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.length === 0 ? (
                            <tr><td colSpan="9" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>No students match your filter settings.</td></tr>
                        ) : (
                            filteredStudents.map((s) => (
                                <tr key={s.id} style={styles.tr}>
                                    <td style={styles.td}><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => handleSelectRow(s.id)} /></td>
                                    <td style={styles.td}>{s.email_or_id}</td>
                                    <td style={styles.td}>{s.name || <span style={{color: '#94a3b8'}}>None</span>}</td>
                                    <td style={styles.td}>{s.password}</td>
                                    <td style={styles.td}>{s.campus_name || <span style={{color: '#94a3b8'}}>None</span>}</td>
                                    <td style={styles.td}>{s.dept_name || <span style={{color: '#94a3b8'}}>None</span>}</td>
                                    <td style={styles.td}>{s.section_name || <span style={{color: '#94a3b8'}}>None</span>}</td>
                                    <td style={styles.td}><button onClick={() => viewStudentCourses(s)} style={styles.viewCoursesBtn} disabled={!s.section_id}>📚 View Courses</button></td>
                                    <td style={styles.td}><button onClick={() => startEdit(s)} style={styles.actionEdit}>Edit</button><button onClick={() => handleDelete(s.id)} style={styles.actionDelete}>Delete</button></td>
                                 </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' },
    title: { color: '#1e293b', marginBottom: '25px', fontWeight: '700' },
    bulkBar: { backgroundColor: '#10b981', padding: '12px 20px', borderRadius: '12px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px', color: 'white' },
    bulkCount: { fontWeight: '600', fontSize: '14px' },
    bulkAssignBtn: { backgroundColor: 'white', color: '#10b981', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    bulkDeleteBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    bulkClearBtn: { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' },
    exportBar: { display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', gap: '10px' },
    excelBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
    exportBtn: { backgroundColor: '#059669', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
    card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
    cardTitle: { margin: '0 0 15px 0', fontSize: '18px', color: '#334155', fontWeight: '600' },
    filterCard: { backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' },
    filterCardTitle: { margin: '0 0 12px 0', fontSize: '15px', color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
    filterInput: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', flex: '1.5', minWidth: '180px' },
    filterSelect: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '14px', flex: '1', minWidth: '130px', cursor: 'pointer' },
    resetBtn: { backgroundColor: '#64748b', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    rowCountText: { fontSize: '14px', color: '#64748b', fontWeight: 'normal' },
    helpText: { color: '#64748b', fontSize: '13px', marginTop: '-10px', marginBottom: '15px', lineHeight: '1.5' },
    errorText: { color: '#ef4444', fontSize: '12px', marginTop: '10px' },
    uploadingText: { marginLeft: '10px', color: '#0ea5e9', fontSize: '13px' },
    formInline: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', flex: '1', minWidth: '150px' },
    select: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '14px', flex: '1', minWidth: '120px', cursor: 'pointer' },
    submitBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    editBtn: { backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    cancelBtn: { backgroundColor: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' },
    uploadBox: { display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' },
    importBtn: { backgroundColor: '#0ea5e9', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
    tableHeaderArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thRow: { backgroundColor: '#f1f5f9' },
    th: { textAlign: 'left', padding: '12px 15px', color: '#475569', fontSize: '13px', fontWeight: 'bold' },
    tr: { borderBottom: '1px solid #f1f5f9' },
    td: { padding: '12px 15px', color: '#334155', fontSize: '14px' },
    actionEdit: { backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontWeight: '500' },
    actionDelete: { backgroundColor: '#fef2f2', color: '#dc2626', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' },
    viewCoursesBtn: { backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', borderRadius: '12px', width: '500px', maxWidth: '90%', maxHeight: '80vh', overflow: 'hidden' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e2e8f0' },
    modalBody: { padding: '20px', maxHeight: '400px', overflowY: 'auto' },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '20px', borderTop: '1px solid #e2e8f0' },
    closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' },
    modalInfo: { marginBottom: '20px', padding: '10px', backgroundColor: '#e0f2fe', borderRadius: '8px', textAlign: 'center' },
    formGroup: { marginBottom: '15px' },
    modalSelect: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' },
    modalTable: { width: '100%', borderCollapse: 'collapse' },
    noCoursesText: { textAlign: 'center', padding: '30px', color: '#64748b' },
    saveBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }
};

export default ManageStudents;