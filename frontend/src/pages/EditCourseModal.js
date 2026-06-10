import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EditCourseModal = ({ course, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        course_name: '',
        course_code: '',
        dept_id: '',
        section_id: '',
        instructor_id: ''
    });
    const [sections, setSections] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadSections();
        loadDepartments();
        loadInstructors();
    }, []);

    useEffect(() => {
        if (course) {
            console.log("📝 Editing course:", course);
            setFormData({
                course_name: course.course_name || '',
                course_code: course.course_code || '',
                dept_id: course.dept_id || '',
                section_id: course.section_id || '',
                instructor_id: course.instructor_id || ''
            });
        }
    }, [course]);

    const loadSections = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/sections');
            console.log("📚 Loaded sections:", res.data);
            setSections(res.data);
        } catch (err) {
            console.error("Error loading sections:", err);
        }
    };

    const loadDepartments = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error("Error loading departments:", err);
        }
    };

    const loadInstructors = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/instructors');
            setInstructors(res.data);
        } catch (err) {
            console.error("Error loading instructors:", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!formData.course_name.trim()) {
            setError("Course name is required");
            return;
        }
        
        if (!formData.section_id) {
            setError("⚠️ Please select a section for this course");
            return;
        }

        setLoading(true);
        
        try {
            console.log("🔄 Sending update for course ID:", course.id);
            console.log("📦 Update data:", formData);
            
            // Create a clean update object
            const updatePayload = {
                course_name: formData.course_name,
                course_code: formData.course_code || null,
                dept_id: formData.dept_id || null,
                instructor_id: formData.instructor_id || null,
                section_id: parseInt(formData.section_id) // Make sure it's a number
            };
            
            console.log("🎯 Final payload:", updatePayload);
            
            const response = await axios.put(
                `http://localhost:5000/api/admin/courses/${course.id}`,
                updatePayload
            );
            
            console.log("✅ Update response:", response.data);
            
            if (response.data.success) {
                alert("✅ Course updated successfully!");
                if (onUpdate) onUpdate();
                onClose();
            } else {
                setError(response.data.error || "Failed to update course");
            }
        } catch (err) {
            console.error("❌ Update error:", err);
            console.error("❌ Error response:", err.response);
            
            let errorMessage = "Failed to update course. ";
            if (err.response?.data?.error) {
                errorMessage += err.response.data.error;
            } else if (err.message) {
                errorMessage += err.message;
            }
            
            setError(errorMessage);
            alert(`❌ ${errorMessage}\n\nCheck console for details.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modal}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>✏️ Edit Course: {course?.course_name}</h3>
                    <button onClick={onClose} style={styles.closeBtn}>×</button>
                </div>
                
                {error && (
                    <div style={styles.errorBox}>
                        <strong>Error:</strong> {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Course Name *</label>
                        <input
                            type="text"
                            value={formData.course_name}
                            onChange={(e) => setFormData({...formData, course_name: e.target.value})}
                            required
                            style={styles.input}
                            placeholder="Enter course name"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Course Code</label>
                        <input
                            type="text"
                            value={formData.course_code}
                            onChange={(e) => setFormData({...formData, course_code: e.target.value})}
                            style={styles.input}
                            placeholder="e.g., COSC-2111"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Department</label>
                        <select
                            value={formData.dept_id}
                            onChange={(e) => setFormData({...formData, dept_id: e.target.value})}
                            style={styles.select}
                        >
                            <option value="">-- Select Department --</option>
                            {departments.map(dept => (
                                <option key={dept.dept_id} value={dept.dept_id}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>📌 Assign to Section *</label>
                        <select
                            value={formData.section_id}
                            onChange={(e) => setFormData({...formData, section_id: e.target.value})}
                            required
                            style={styles.select}
                        >
                            <option value="">-- Select Section --</option>
                            {sections.map(section => (
                                <option key={section.id} value={section.id}>
                                    {section.name} {section.campus_name ? `📍 ${section.campus_name}` : ''}
                                </option>
                            ))}
                        </select>
                        <small style={styles.helpText}>
                            💡 Students in this section will be able to access and evaluate this course
                        </small>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>👨‍🏫 Assign Instructor (Optional)</label>
                        <select
                            value={formData.instructor_id}
                            onChange={(e) => setFormData({...formData, instructor_id: e.target.value})}
                            style={styles.select}
                        >
                            <option value="">-- Select Instructor --</option>
                            {instructors.map(inst => (
                                <option key={inst.instructor_id} value={inst.instructor_id}>
                                    {inst.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.modalFooter}>
                        <button type="button" onClick={onClose} style={styles.cancelBtn}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} style={styles.saveBtn}>
                            {loading ? "💾 Saving..." : "💾 Save Changes"}
                        </button>
                    </div>
                </form>
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
        width: '550px',
        maxWidth: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
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
        fontSize: '20px',
        color: '#1e293b'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '28px',
        cursor: 'pointer',
        color: '#64748b',
        padding: '0 8px'
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
    input: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '14px',
        boxSizing: 'border-box'
    },
    select: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '14px',
        backgroundColor: 'white',
        boxSizing: 'border-box',
        cursor: 'pointer'
    },
    helpText: {
        display: 'block',
        marginTop: '6px',
        fontSize: '12px',
        color: '#64748b'
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
    saveBtn: {
        padding: '10px 24px',
        backgroundColor: '#0ea5e9',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
    }
};

export default EditCourseModal;