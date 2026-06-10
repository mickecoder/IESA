import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ name: '', email_or_id: '', password: '', role: 'department' });
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({ name: '', email_or_id: '', password: '', role: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/admin/system-users');
            console.log("Fetched users:", res.data);
            setUsers(res.data);
        } catch (err) {
            console.error("Error fetching users:", err);
            alert("Failed to load users: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEditInputChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        const { name, email_or_id, password, role } = formData;
        if (!name.trim() || !email_or_id.trim() || !password.trim()) {
            return alert("Please fill out all fields.");
        }

        try {
            await axios.post('http://localhost:5000/api/admin/system-users', {
                name: name.trim(),
                email_or_id: email_or_id.trim(),
                password: password.trim(),
                role: role
            });
            alert("User created successfully!");
            setFormData({ name: '', email_or_id: '', password: '', role: 'department' });
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to create user.");
        }
    };

    const startEdit = (user) => {
        setEditingId(user.id);
        setEditFormData({
            name: user.name || '',
            email_or_id: user.email_or_id || '',
            password: user.password || '',
            role: user.role || 'department'
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditFormData({ name: '', email_or_id: '', password: '', role: '' });
    };

    const handleUpdate = async (id, role) => {
        if (!editFormData.name.trim() || !editFormData.email_or_id.trim() || !editFormData.password.trim()) {
            return alert("Name, Email/ID, and Password cannot be blank.");
        }

        try {
            await axios.put(`http://localhost:5000/api/admin/system-users/${id}/${role}`, editFormData);
            alert("User updated successfully!");
            setEditingId(null);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to update user.");
        }
    };

    const handleDelete = async (id, role) => {
        if (!id) return alert("Missing user ID.");
        if (!window.confirm(`Are you sure you want to delete this ${role}?`)) return;
        
        try {
            await axios.delete(`http://localhost:5000/api/admin/system-users/${id}/${role}`);
            alert("User deleted successfully!");
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete user.");
        }
    };

    if (loading) {
        return (
            <div style={styles.workspace}>
                <h2 style={styles.mainTitle}>User Access Authorization Portal</h2>
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner}></div>
                    <p>Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.workspace}>
            <h2 style={styles.mainTitle}>User Access Authorization Portal</h2>
            
            {/* TOP PANEL: PROVISION FORM MODULE */}
            <div style={styles.systemCard}>
                <h3 style={styles.cardHeaderTitle}>➕ Create New User</h3>
                
                <div style={styles.horizontalFormRow}>
                    <div style={styles.inputGroupFluid}>
                        <input 
                            name="name" 
                            style={styles.formInput} 
                            placeholder="Full Name" 
                            value={formData.name} 
                            onChange={handleInputChange} 
                        />
                    </div>
                    <div style={styles.inputGroupFluid}>
                        <input 
                            name="email_or_id" 
                            style={styles.formInput} 
                            placeholder="Email / User ID" 
                            value={formData.email_or_id} 
                            onChange={handleInputChange} 
                        />
                    </div>
                    <div style={styles.inputGroupFluid}>
                        <input 
                            name="password" 
                            type="text" 
                            style={styles.formInput} 
                            placeholder="Password" 
                            value={formData.password} 
                            onChange={handleInputChange} 
                        />
                    </div>
                    <div style={styles.inputGroupFluid}>
                        <select 
                            name="role" 
                            style={styles.selectInput} 
                            value={formData.role} 
                            onChange={handleInputChange}
                        >
                            <option value="department">Department Head</option>
                            <option value="instructor">Instructor</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                    <button onClick={handleSubmit} style={styles.primaryActionButton}>
                        Create User
                    </button>
                </div>
            </div>

            <div style={{ height: '30px' }}></div>

            {/* BOTTOM PANEL: USER LIST */}
            <div style={styles.systemCard}>
                <h3 style={styles.cardHeaderTitle}>👥 User Registry ({users.length})</h3>
                
                <div style={styles.tableResponsiveContainer}>
                    {users.length === 0 ? (
                        <p style={styles.emptyState}>No users found. Create your first user above.</p>
                    ) : (
                        <table style={styles.registryTable}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.tableTh}>Name</th>
                                    <th style={styles.tableTh}>Email / ID</th>
                                    <th style={styles.tableTh}>Password</th>
                                    <th style={styles.tableTh}>Role</th>
                                    <th style={{ ...styles.tableTh, textAlign: 'center', width: '180px' }}>Actions</th>
                                 </tr>
                            </thead>
                            <tbody>
                                {users.map((u, index) => {
                                    const isEditing = editingId === u.id;
                                    const role = u.role || 'user';
                                    
                                    return (
                                        <tr key={index} style={styles.tableRow}>
                                            {isEditing ? (
                                                <>
                                                    <td style={styles.tableTd}>
                                                        <input 
                                                            name="name" 
                                                            style={styles.tableInlineInput} 
                                                            value={editFormData.name} 
                                                            onChange={handleEditInputChange} 
                                                        />
                                                     </td>
                                                    <td style={styles.tableTd}>
                                                        <input 
                                                            name="email_or_id" 
                                                            style={styles.tableInlineInput} 
                                                            value={editFormData.email_or_id} 
                                                            onChange={handleEditInputChange} 
                                                        />
                                                     </td>
                                                    <td style={styles.tableTd}>
                                                        <input 
                                                            name="password" 
                                                            style={styles.tableInlineInput} 
                                                            value={editFormData.password} 
                                                            onChange={handleEditInputChange} 
                                                        />
                                                     </td>
                                                    <td style={styles.tableTd}>
                                                        <select 
                                                            name="role" 
                                                            style={styles.tableInlineSelect} 
                                                            value={editFormData.role} 
                                                            onChange={handleEditInputChange}
                                                        >
                                                            <option value="department">Department</option>
                                                            <option value="instructor">Instructor</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                     </td>
                                                    <td style={styles.tableActionTd}>
                                                        <button onClick={() => handleUpdate(u.id, role)} style={styles.actionSaveButton}>Save</button>
                                                        <button onClick={cancelEdit} style={styles.actionCancelButton}>Cancel</button>
                                                     </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={styles.tableTdName}>{u.name || '—'}</td>
                                                    <td style={styles.tableTd}>{u.email_or_id || '—'}</td>
                                                    <td style={{ ...styles.tableTd, fontFamily: 'monospace', fontWeight: '600', color: '#0284c7' }}>
                                                        {u.password || '••••••'}
                                                     </td>
                                                    <td style={styles.tableTd}>
                                                        <span style={{
                                                            ...styles.roleBadge,
                                                            backgroundColor: role === 'admin' ? '#fee2e2' : role === 'department' ? '#e0f2fe' : '#fef3c7',
                                                            color: role === 'admin' ? '#991b1b' : role === 'department' ? '#075985' : '#92400e'
                                                        }}>
                                                            {role.toUpperCase()}
                                                        </span>
                                                     </td>
                                                    <td style={styles.tableActionTd}>
                                                        <button onClick={() => startEdit(u)} style={styles.actionEditButton}>Edit</button>
                                                        <button onClick={() => handleDelete(u.id, role)} style={styles.actionDeleteButton}>Delete</button>
                                                     </td>
                                                </>
                                            )}
                                         </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    workspace: { flex: 1, width: '100%', padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box' },
    mainTitle: { fontSize: '24px', color: '#0f172a', margin: '0 0 25px 0', fontWeight: '700', letterSpacing: '-0.02em' },
    loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: '50px' },
    spinner: { width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    emptyState: { textAlign: 'center', padding: '40px', color: '#64748b' },
    systemCard: { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '24px', width: '100%', boxSizing: 'border-box' },
    cardHeaderTitle: { margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', color: '#1e293b' },
    horizontalFormRow: { display: 'flex', alignItems: 'center', gap: '15px', width: '100%', flexWrap: 'wrap' },
    inputGroupFluid: { flex: 1, minWidth: '180px' },
    formInput: { width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#334155', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box' },
    selectInput: { width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#334155', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' },
    primaryActionButton: { backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap' },
    tableResponsiveContainer: { width: '100%', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '10px' },
    registryTable: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff' },
    tableHeaderRow: { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
    tableTh: { padding: '14px 18px', fontSize: '13px', fontWeight: '600', color: '#64748b', textAlign: 'left' },
    tableRow: { borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' },
    tableTd: { padding: '12px 18px', fontSize: '14px', color: '#475569', verticalAlign: 'middle' },
    tableTdName: { padding: '12px 18px', fontSize: '14px', color: '#0f172a', fontWeight: '600', verticalAlign: 'middle' },
    tableActionTd: { padding: '12px 18px', gap: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    tableInlineInput: { width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' },
    tableInlineSelect: { width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' },
    roleBadge: { padding: '4px 12px', borderRadius: '50px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.03em', display: 'inline-block' },
    actionEditButton: { backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    actionDeleteButton: { backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    actionSaveButton: { backgroundColor: '#dcfce7', color: '#15803d', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    actionCancelButton: { backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }
};

// Add animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export default ManageUsers;