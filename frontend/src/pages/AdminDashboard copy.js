import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
    const navigate = useNavigate();
    const [campuses, setCampuses] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [newCampus, setNewCampus] = useState('');
    const [newCourse, setNewCourse] = useState({ name: '', instructor_id: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const campRes = await axios.get('http://localhost:5000/api/admin/campuses');
            const instRes = await axios.get('http://localhost:5000/api/admin/instructors');
            setCampuses(campRes.data);
            setInstructors(instRes.data);
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };

    const handleAddCampus = async () => {
        if (!newCampus) return alert("Please enter a campus name");
        try {
            await axios.post('http://localhost:5000/api/admin/campuses', { name: newCampus });
            setNewCampus('');
            fetchData();
            alert("Campus added!");
        } catch (err) { 
            alert("Error adding campus"); 
        }
    };

    const handleAssignCourse = async () => {
        if (!newCourse.name || !newCourse.instructor_id) return alert("Fill all fields");
        try {
            await axios.post('http://localhost:5000/api/admin/courses', newCourse);
            setNewCourse({ name: '', instructor_id: '' });
            fetchData();
            alert("Course Assigned!");
        } catch (err) { 
            alert("Error assigning course"); 
        }
    };

    return (
        /* Removed styles.container and the <aside> block to eliminate the second sidebar */
        <main style={styles.main}>
            <header style={styles.header}>
                <h2>Dashboard Overview</h2>
                <button style={styles.logoutBtn} onClick={() => { localStorage.clear(); navigate('/'); }}>
                    Logout
                </button>
            </header>

            <div style={styles.statsRow}>
                <div style={styles.statCard}>
                    <h4 style={styles.statValue}>{campuses.length}</h4>
                    <p>Total Campuses</p>
                </div>
                <div style={styles.statCard}>
                    <h4 style={styles.statValue}>{instructors.length}</h4>
                    <p>Active Instructors</p>
                </div>
                <div style={styles.statCard}>
                    <h4 style={styles.statValue}>94%</h4>
                    <p>Avg. Evaluation</p>
                </div>
            </div>

            <div style={styles.grid}>
                <div style={styles.contentCard}>
                    <h3 style={styles.cardTitle}>Campuses</h3>
                    <div style={styles.inputGroup}>
                        <input 
                            style={styles.input}
                            value={newCampus} 
                            onChange={(e) => setNewCampus(e.target.value)} 
                            placeholder="Campus Name" 
                        />
                        <button style={styles.primaryBtn} onClick={handleAddCampus}>Add</button>
                    </div>
                    <ul style={styles.list}>
                        {campuses.map(c => (
                            <li key={c.id} style={styles.listItem}>{c.name}</li>
                        ))}
                    </ul>
                </div>

                <div style={styles.contentCard}>
                    <h3 style={styles.cardTitle}>Course & Instructor Linking</h3>
                    <input 
                        style={styles.input}
                        placeholder="Course Name" 
                        value={newCourse.name}
                        onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                    />
                    <select 
                        style={styles.input}
                        value={newCourse.instructor_id}
                        onChange={(e) => setNewCourse({...newCourse, instructor_id: e.target.value})}
                    >
                        <option value="">Choose Instructor...</option>
                        {instructors.map(inst => (
                            <option key={inst.instructor_id} value={inst.instructor_id}>
                                {inst.name}
                            </option>
                        ))}
                    </select>
                    <button style={{...styles.primaryBtn, width: '100%'}} onClick={handleAssignCourse}>
                        Assign Course
                    </button>
                </div>
            </div>
        </main>
    );
};

const styles = {
    /* Main now takes the full remaining width next to the App.js Sidebar */
    main: { flex: 1, padding: '40px', overflowY: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px' },
    logoutBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' },
    statsRow: { display: 'flex', gap: '20px', marginBottom: '30px' },
    statCard: { flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' },
    statValue: { fontSize: '28px', color: '#1ab5f1', margin: '10px 0' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' },
    contentCard: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    cardTitle: { marginBottom: '20px', color: '#334155' },
    inputGroup: { display: 'flex', gap: '10px', marginBottom: '20px' },
    input: { padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', marginBottom: '15px' },
    primaryBtn: { backgroundColor: '#1ab5f1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    list: { listStyle: 'none', padding: 0 },
    listItem: { padding: '12px', borderBottom: '1px solid #f1f5f9' }
};

export default Admin;