import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState('Student'); 
    const [campuses, setCampuses] = useState([]);
    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
        campusId: '',
        section: '1' 
    });

    useEffect(() => {
        axios.get('http://localhost:5000/api/admin/campuses')
            .then(res => setCampuses(res.data))
            .catch(err => console.error("Error fetching campuses:", err));
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const activeRole = role.toLowerCase();
            const response = await axios.post('http://localhost:5000/api/login', {
                role: activeRole, 
                identifier: formData.identifier,
                password: formData.password,
                campusId: formData.campusId,
                section: formData.section
            });

            if (response.data.success) {
                const dbUser = response.data.user;
                const userData = { ...dbUser, selectedSection: formData.section };
                localStorage.setItem('user', JSON.stringify(userData));

                // REDIRECTION LOGIC based on DATABASE ROLE
                const targetRole = dbUser.role.toLowerCase();

                if (targetRole === 'student') {
                    navigate('/student-home');
                } else if (targetRole === 'admin') {
                    navigate('/admin');
                } else if (targetRole === 'department') {
                    navigate('/reports'); // Specifically for department portal
                }
            }
        } catch (err) {
            alert("Invalid Login: Please check credentials and role selection.");
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.loginHeader}>LOGIN PAGE</div>
                <form onSubmit={handleLogin} style={styles.form}>
                    <label style={styles.label}>Select your Role</label>
                    <select style={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="Student">Student</option>
                        <option value="Department">Department</option>
                        <option value="Admin">Admin</option>
                    </select>

                    {role === 'Student' ? (
                        <>
                            <label style={styles.label}>Select Your Campus</label>
                            <select style={styles.input} required value={formData.campusId} onChange={(e) => setFormData({...formData, campusId: e.target.value})}>
                                <option value="">-- Select Campus --</option>
                                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <label style={styles.label}>Student Section</label>
                            <select style={styles.input} value={formData.section} onChange={(e) => setFormData({...formData, section: e.target.value})}>
                                <option value="1">CoSc_2018_A</option>
                                <option value="2">CoSc_2018_B</option>
                            </select>
                            <label style={styles.label}>Student ID</label>
                            <input style={styles.input} placeholder="E.g. AD/0204/16" required value={formData.identifier} onChange={(e) => setFormData({...formData, identifier: e.target.value})} />
                        </>
                    ) : (
                        <>
                            <label style={styles.label}>User Name</label>
                            <input style={styles.input} placeholder="Enter Name..." required value={formData.identifier} onChange={(e) => setFormData({...formData, identifier: e.target.value})} />
                            <label style={styles.label}>Password</label>
                            <input type="password" style={styles.input} placeholder="Enter Password..." required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                        </>
                    )}
                    <button type="submit" style={styles.loginBtn}>LOGIN !</button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' },
    card: { padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '500px', backgroundColor: 'white', position: 'relative' },
    loginHeader: { position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '10px 40px', border: '2px solid #1ab5f1', borderRadius: '8px', color: '#1ab5f1', fontWeight: 'bold' },
    form: { display: 'flex', flexDirection: 'column', marginTop: '20px' },
    label: { fontWeight: 'bold', marginBottom: '8px' },
    input: { padding: '12px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' },
    loginBtn: { padding: '15px', backgroundColor: '#1ab5f1', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }
};

export default Login;