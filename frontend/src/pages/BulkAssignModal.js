import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BulkAssignModal = ({ selectedCourses, onClose, onAssignComplete }) => {
    const [sections, setSections] = useState([]);
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadSections();
    }, []);

    const loadSections = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/sections');
            console.log("📚 Sections loaded:", res.data);
            setSections(res.data);
        } catch (err) {
            console.error("Error loading sections:", err);
            setError("Failed to load sections: " + (err.response?.data?.error || err.message));
        }
    };

    const handleAssign = async () => {
        if (!selectedSectionId) {
            setError("Please select a section");
            return;
        }

        if (selectedCourses.length === 0) {
            setError("No courses selected");
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log("📤 Sending bulk assign request:", {
                course_ids: selectedCourses,
                section_id: parseInt(selectedSectionId)
            });

            const response = await axios.post('http://localhost:5000/api/admin/courses/bulk-assign-section', {
                course_ids: selectedCourses,
                section_id: parseInt(selectedSectionId)
            });

            console.log("📥 Response:", response.data);

            if (response.data.success) {
                alert(`✅ ${response.data.message}`);
                if (onAssignComplete) onAssignComplete();
                onClose();
            } else {
                setError(response.data.error || "Assignment failed");
            }
        } catch (err) {
            console.error("❌ Bulk assign error:", err);
            console.error("Error response:", err.response);
            
            let errorMessage = "Failed to assign courses. ";
            if (err.response?.status === 404) {
                errorMessage = "API endpoint not found. Please restart your backend server.";
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.message) {
                errorMessage += err.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const selectedSection = sections.find(s => s.id === parseInt(selectedSectionId));

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modal}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>📦 Bulk Assign Courses to Section</h3>
                    <button onClick={onClose} style={styles.closeBtn}>×</button>
                </div>

                <div style={styles.summaryBox}>
                    <strong>{selectedCourses.length}</strong> course(s) selected for assignment
                </div>

                {error && (
                    <div style={styles.errorBox}>
                        <strong>❌ Error:</strong> {error}
                    </div>
                )}

                <div style={styles.formGroup}>
                    <label style={styles.label}>Select Target Section *</label>
                    <select
                        value={selectedSectionId}
                        onChange={(e) => setSelectedSectionId(e.target.value)}
                        style={styles.select}
                        required
                    >
                        <option value="">-- Choose a section --</option>
                        {sections.map(section => (
                            <option key={section.id} value={section.id}>
                                {section.name} {section.campus_name ? `(${section.campus_name})` : ''}
                            </option>
                        ))}
                    </select>
                    
                    {selectedSection && (
                        <div style={styles.infoBox}>
                            <small>
                                📍 All selected courses will be assigned to: <strong>{selectedSection.name}</strong>
                                {selectedSection.campus_name && ` at ${selectedSection.campus_name}`}
                            </small>
                        </div>
                    )}
                </div>

                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} style={styles.cancelBtn}>
                        Cancel
                    </button>
                    <button 
                        onClick={handleAssign} 
                        disabled={loading || !selectedSectionId || selectedCourses.length === 0}
                        style={styles.assignBtn}
                    >
                        {loading ? "Assigning..." : `Assign ${selectedCourses.length} Course(s)`}
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
        padding: '30px',
        width: '500px',
        maxWidth: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e2e8f0'
    },
    modalTitle: {
        margin: 0,
        fontSize: '18px',
        color: '#1e293b'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '28px',
        cursor: 'pointer',
        color: '#64748b'
    },
    summaryBox: {
        backgroundColor: '#e0f2fe',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#0369a1'
    },
    errorBox: {
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '14px',
        border: '1px solid #fecaca'
    },
    infoBox: {
        backgroundColor: '#f1f5f9',
        padding: '10px',
        borderRadius: '8px',
        marginTop: '10px',
        fontSize: '13px',
        color: '#475569'
    },
    formGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        fontSize: '14px',
        color: '#334155'
    },
    select: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '14px',
        backgroundColor: 'white',
        cursor: 'pointer'
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '25px',
        paddingTop: '20px',
        borderTop: '1px solid #e2e8f0'
    },
    cancelBtn: {
        padding: '10px 20px',
        backgroundColor: '#f1f5f9',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        color: '#475569'
    },
    assignBtn: {
        padding: '10px 24px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
    }
};

export default BulkAssignModal;