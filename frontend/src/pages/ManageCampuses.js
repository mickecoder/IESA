import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManageCampuses = () => {
    const [campuses, setCampuses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [name, setName] = useState('');
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [deptForm, setDeptForm] = useState({ name: '', code: '', location: '', campus_id: '' });
    
    // Inline CRUD state monitors for campuses
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    useEffect(() => { 
        fetchCampuses();
        fetchDepartments();
    }, []);

    const fetchCampuses = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/campuses');
            setCampuses(res.data);
        } catch (err) {
            console.error("Error fetching campuses:", err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error("Error fetching departments:", err);
        }
    };

    // ========== CAMPUS CRUD ==========
    const handleAddCampus = async () => {
        if (!name.trim()) return alert("Campus name cannot be empty.");

        try {
            await axios.post('http://localhost:5000/api/admin/campuses', { name: name.trim() });
            setName('');
            fetchCampuses(); 
        } catch (err) {
            console.error("Error creating campus:", err);
            alert("Failed to create new campus entry.");
        }
    };

    const startEditCampus = (campus) => {
        setEditingId(campus.id);
        setEditName(campus.name);
    };

    const cancelEditCampus = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleUpdateCampus = async (id) => {
        if (!editName.trim()) return alert("Campus name cannot be empty.");

        try {
            await axios.put(`http://localhost:5000/api/admin/campuses/${id}`, { name: editName.trim() });
            setEditingId(null);
            setEditName('');
            fetchCampuses();
        } catch (err) {
            console.error("Error updating campus:", err);
            alert("Failed to save campus edits.");
        }
    };

    const handleDeleteCampus = async (id) => {
        if (!window.confirm("Are you sure you want to remove this campus? This may affect assigned sections and users!")) return;

        try {
            await axios.delete(`http://localhost:5000/api/admin/campuses/${id}`);
            fetchCampuses();
        } catch (err) {
            console.error("Error deleting campus:", err);
            alert("Failed to remove campus record.");
        }
    };

    // ========== DEPARTMENT CRUD ==========
    const handleAddDepartment = async () => {
        if (!deptForm.name.trim()) return alert("Department name is required.");

        try {
            await axios.post('http://localhost:5000/api/admin/departments', deptForm);
            setDeptForm({ name: '', code: '', location: '', campus_id: '' });
            setShowDeptModal(false);
            fetchDepartments();
            alert("Department added successfully!");
        } catch (err) {
            console.error("Error creating department:", err);
            alert("Failed to create department.");
        }
    };

    const handleUpdateDepartment = async () => {
        if (!deptForm.name.trim()) return alert("Department name is required.");

        try {
            await axios.put(`http://localhost:5000/api/admin/departments/${editingDept.dept_id}`, deptForm);
            setEditingDept(null);
            setDeptForm({ name: '', code: '', location: '', campus_id: '' });
            setShowDeptModal(false);
            fetchDepartments();
            alert("Department updated successfully!");
        } catch (err) {
            console.error("Error updating department:", err);
            alert("Failed to update department.");
        }
    };

    const handleDeleteDepartment = async (id) => {
        if (!window.confirm("Are you sure you want to delete this department? This will affect all associated courses and users!")) return;

        try {
            await axios.delete(`http://localhost:5000/api/admin/departments/${id}`);
            fetchDepartments();
            alert("Department deleted successfully!");
        } catch (err) {
            console.error("Error deleting department:", err);
            alert("Failed to delete department. It may have associated courses or users.");
        }
    };

    const openAddDeptModal = () => {
        setEditingDept(null);
        setDeptForm({ name: '', code: '', location: '', campus_id: '' });
        setShowDeptModal(true);
    };

    const openEditDeptModal = (dept) => {
        setEditingDept(dept);
        setDeptForm({
            name: dept.name || '',
            code: dept.code || '',
            location: dept.location || '',
            campus_id: dept.campus_id || ''
        });
        setShowDeptModal(true);
    };

    // Get campus name by ID
    const getCampusName = (campusId) => {
        const campus = campuses.find(c => c.id === campusId);
        return campus ? campus.name : '—';
    };

    return (
        <div style={styles.workspace}>
            {/* PAGE HEADING */}
            <h2 style={styles.mainTitle}>Campus & Department Management Directory</h2>
            
            {/* TWO-COLUMN SYSTEM WORKSPACE */}
            <div style={styles.workspaceGrid}>
                
                {/* LEFT PANEL: CAMPUS MANAGEMENT */}
                <div style={styles.leftFormPanel}>
                    <div style={styles.systemCard}>
                        <h3 style={styles.cardHeaderTitle}>🏢 Add New Campus</h3>
                        <div style={styles.fieldWrapper}>
                            <label style={styles.fieldLabel}>Campus Location Name</label>
                            <input 
                                style={styles.formInput} 
                                placeholder="e.g., Kality" 
                                value={name}
                                onChange={(e) => setName(e.target.value)} 
                            />
                        </div>
                        <button type="button" onClick={handleAddCampus} style={styles.primaryActionButton}>
                            + Add Campus
                        </button>
                    </div>

                    {/* DEPARTMENT MANAGEMENT CARD */}
                    <div style={styles.systemCard}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardHeaderTitle}>📚 Department Management</h3>
                            <button onClick={openAddDeptModal} style={styles.addDeptBtn}>+ Add Department</button>
                        </div>
                        
                        <div style={styles.deptList}>
                            {departments.length === 0 ? (
                                <p style={styles.emptyText}>No departments found. Click "Add Department" to create one.</p>
                            ) : (
                                departments.map((dept) => (
                                    <div key={dept.dept_id} style={styles.deptItem}>
                                        <div style={styles.deptInfo}>
                                            <strong>{dept.name}</strong>
                                            {dept.code && <span style={styles.deptCode}>{dept.code}</span>}
                                            {dept.location && <span style={styles.deptLocation}>📍 {dept.location}</span>}
                                            <span style={styles.deptCampus}>
                                                🏫 {getCampusName(dept.campus_id)}
                                            </span>
                                        </div>
                                        <div style={styles.deptActions}>
                                            <button onClick={() => openEditDeptModal(dept)} style={styles.editDeptBtn}>Edit</button>
                                            <button onClick={() => handleDeleteDepartment(dept.dept_id)} style={styles.deleteDeptBtn}>Delete</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: CAMPUS TABLE */}
                <div style={styles.rightTablePanel}>
                    <div style={styles.systemCard}>
                        <h3 style={styles.cardHeaderTitle}>
                            🏫 Active System Campuses ({campuses.length})
                        </h3>
                        
                        <div style={styles.tableResponsiveContainer}>
                            <table style={styles.registryTable}>
                                <thead>
                                    <tr style={styles.tableHeaderRow}>
                                        <th style={{ ...styles.tableTh, width: '15%' }}>ID Code</th>
                                        <th style={{ ...styles.tableTh, width: '55%' }}>Campus Name</th>
                                        <th style={{ ...styles.tableTh, width: '30%', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campuses.map((c) => (
                                        <tr key={c.id} style={styles.tableRow}>
                                            <td style={styles.tableTd}>
                                                <span style={styles.idBadgeText}>#{c.id}</span>
                                            </td>
                                            <td style={styles.tableTd}>
                                                {editingId === c.id ? (
                                                    <input
                                                        type="text"
                                                        style={styles.inlineEditInput}
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span style={styles.campusNameText}>
                                                        {c.name}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ ...styles.tableTd, textAlign: 'center' }}>
                                                {editingId === c.id ? (
                                                    <div style={styles.controlButtonsGroup}>
                                                        <button onClick={() => handleUpdateCampus(c.id)} style={styles.actionSaveButton}>Save</button>
                                                        <button onClick={cancelEditCampus} style={styles.actionCancelButton}>Cancel</button>
                                                    </div>
                                                ) : (
                                                    <div style={styles.controlButtonsGroup}>
                                                        <button onClick={() => startEditCampus(c)} style={styles.actionEditButton}>Edit</button>
                                                        <button onClick={() => handleDeleteCampus(c.id)} style={styles.actionDeleteButton}>Delete</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {campuses.length === 0 && (
                                        <tr>
                                            <td colSpan="3" style={styles.emptyTableStateMessage}>
                                                No campus records found in the database.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* DEPARTMENT MODAL with Campus Selection */}
            {showDeptModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>{editingDept ? '✏️ Edit Department' : '➕ Add New Department'}</h3>
                            <button onClick={() => setShowDeptModal(false)} style={styles.closeBtn}>×</button>
                        </div>
                        
                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label>Department Name *</label>
                                <input
                                    type="text"
                                    value={deptForm.name}
                                    onChange={(e) => setDeptForm({...deptForm, name: e.target.value})}
                                    style={styles.modalInput}
                                    placeholder="e.g., Computer Science"
                                />
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label>Department Code</label>
                                <input
                                    type="text"
                                    value={deptForm.code}
                                    onChange={(e) => setDeptForm({...deptForm, code: e.target.value})}
                                    style={styles.modalInput}
                                    placeholder="e.g., CS"
                                />
                            </div>
                            
                            <div style={styles.formGroup}>
                                <label>Location / Office</label>
                                <input
                                    type="text"
                                    value={deptForm.location}
                                    onChange={(e) => setDeptForm({...deptForm, location: e.target.value})}
                                    style={styles.modalInput}
                                    placeholder="e.g., Building A, Room 201"
                                />
                            </div>

                            {/* NEW: Campus Selection Dropdown */}
                            <div style={styles.formGroup}>
                                <label>🏫 Assigned Campus</label>
                                <select
                                    value={deptForm.campus_id}
                                    onChange={(e) => setDeptForm({...deptForm, campus_id: e.target.value})}
                                    style={styles.modalSelect}
                                >
                                    <option value="">-- Select Campus --</option>
                                    {campuses.map(campus => (
                                        <option key={campus.id} value={campus.id}>
                                            {campus.name}
                                        </option>
                                    ))}
                                </select>
                                <small style={styles.helpText}>
                                    Select which campus this department belongs to
                                </small>
                            </div>
                        </div>
                        
                        <div style={styles.modalFooter}>
                            <button onClick={() => setShowDeptModal(false)} style={styles.cancelBtn}>Cancel</button>
                            <button onClick={editingDept ? handleUpdateDepartment : handleAddDepartment} style={styles.saveBtn}>
                                {editingDept ? 'Update Department' : 'Add Department'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    workspace: { 
        flex: 1,
        width: '100%',
        padding: '30px', 
        backgroundColor: '#f8fafc', 
        minHeight: '100vh', 
        fontFamily: 'Inter, system-ui, sans-serif',
        boxSizing: 'border-box'
    },
    mainTitle: { 
        fontSize: '24px', 
        color: '#0f172a', 
        margin: '0 0 25px 0', 
        fontWeight: '700',
        letterSpacing: '-0.02em'
    },
    workspaceGrid: {
        display: 'flex',
        gap: '24px',
        width: '100%',
        alignItems: 'flex-start'
    },
    leftFormPanel: {
        width: '420px',
        flexShrink: 0
    },
    rightTablePanel: {
        flex: 1
    },
    systemCard: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        padding: '24px',
        width: '100%',
        boxSizing: 'border-box',
        marginBottom: '24px'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    cardHeaderTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '700',
        color: '#1e293b'
    },
    fieldWrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '20px'
    },
    fieldLabel: {
        fontWeight: '600',
        fontSize: '13px',
        color: '#475569'
    },
    formInput: {
        width: '100%',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '14px',
        color: '#334155',
        backgroundColor: '#ffffff',
        outline: 'none',
        boxSizing: 'border-box'
    },
    primaryActionButton: {
        width: '100%',
        backgroundColor: '#0ea5e9',
        color: '#ffffff',
        border: 'none',
        padding: '12px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '700',
        fontSize: '14px',
        textAlign: 'center',
        boxSizing: 'border-box'
    },
    addDeptBtn: {
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '13px'
    },
    deptList: {
        maxHeight: '400px',
        overflowY: 'auto'
    },
    deptItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        borderBottom: '1px solid #e2e8f0',
        '&:hover': {
            backgroundColor: '#f8fafc'
        }
    },
    deptInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1
    },
    deptCode: {
        fontSize: '11px',
        color: '#64748b',
        backgroundColor: '#f1f5f9',
        padding: '2px 6px',
        borderRadius: '4px',
        marginLeft: '8px'
    },
    deptLocation: {
        fontSize: '11px',
        color: '#64748b'
    },
    deptCampus: {
        fontSize: '11px',
        color: '#0ea5e9',
        marginTop: '2px'
    },
    deptActions: {
        display: 'flex',
        gap: '8px'
    },
    editDeptBtn: {
        backgroundColor: '#f59e0b',
        color: 'white',
        border: 'none',
        padding: '4px 10px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '11px'
    },
    deleteDeptBtn: {
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        padding: '4px 10px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '11px'
    },
    emptyText: {
        color: '#94a3b8',
        textAlign: 'center',
        padding: '20px',
        fontSize: '13px'
    },
    tableResponsiveContainer: {
        width: '100%',
        overflowX: 'auto'
    },
    registryTable: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left'
    },
    tableHeaderRow: {
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0'
    },
    tableTh: {
        padding: '12px 16px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'none'
    },
    tableRow: {
        borderBottom: '1px solid #f1f5f9',
        transition: 'background-color 0.2s'
    },
    tableTd: {
        padding: '14px 16px',
        verticalAlign: 'middle',
        fontSize: '14px',
        color: '#334155'
    },
    idBadgeText: {
        color: '#64748b',
        fontWeight: '500'
    },
    campusNameText: {
        fontWeight: '500',
        color: '#334155'
    },
    inlineEditInput: {
        width: '100%',
        padding: '6px 12px',
        borderRadius: '6px',
        border: '1px solid #0ea5e9',
        outline: 'none',
        fontSize: '14px',
        color: '#1e293b',
        backgroundColor: '#ffffff'
    },
    controlButtonsGroup: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center'
    },
    actionEditButton: {
        backgroundColor: '#f59e0b',
        color: '#ffffff',
        border: 'none',
        padding: '6px 14px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600'
    },
    actionDeleteButton: {
        backgroundColor: '#ef4444',
        color: '#ffffff',
        border: 'none',
        padding: '6px 14px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600'
    },
    actionSaveButton: {
        backgroundColor: '#10b981',
        color: '#ffffff',
        border: 'none',
        padding: '6px 14px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600'
    },
    actionCancelButton: {
        backgroundColor: '#64748b',
        color: '#ffffff',
        border: 'none',
        padding: '6px 14px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600'
    },
    emptyTableStateMessage: {
        padding: '30px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '14px',
        fontStyle: 'italic'
    },
    // Modal styles
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
        width: '450px',
        maxWidth: '90%'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderBottom: '1px solid #e2e8f0'
    },
    modalBody: {
        padding: '20px'
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        padding: '20px',
        borderTop: '1px solid #e2e8f0'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: '#64748b'
    },
    formGroup: {
        marginBottom: '16px'
    },
    modalInput: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '14px',
        boxSizing: 'border-box',
        marginTop: '5px'
    },
    modalSelect: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '14px',
        backgroundColor: 'white',
        boxSizing: 'border-box',
        marginTop: '5px',
        cursor: 'pointer'
    },
    helpText: {
        display: 'block',
        marginTop: '5px',
        fontSize: '11px',
        color: '#64748b'
    },
    cancelBtn: {
        padding: '8px 16px',
        backgroundColor: '#f1f5f9',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    saveBtn: {
        padding: '8px 20px',
        backgroundColor: '#0ea5e9',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
    }
};

export default ManageCampuses;