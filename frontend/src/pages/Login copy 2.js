import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
    const [activePortal, setActivePortal] = useState('student');
    const [campuses, setCampuses] = useState([]);
    // Default section is '1' to match your DB ID for CoSc_2018_A
    const [form, setForm] = useState({ identifier: '', password: '', section: '1', campusId: '' });
    const navigate = useNavigate();

    const mainBlue = '#1da1d2';

    useEffect(() => {
        axios.get('http://localhost:5000/api/admin/campuses')
            .then(res => setCampuses(res.data))
            .catch(err => console.error("Error loading campuses:", err));
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/api/login', { 
                ...form, 
                role: activePortal 
            });

            if (response.data.success) {
                // Merge the server user data with the section ID from our form
                const userData = {
                    ...response.data.user,
                    selectedSection: form.section // This saves '1' or '2' into LocalStorage
                };

                localStorage.setItem('user', JSON.stringify(userData));

                // Route handling
                if (activePortal === 'student') {
                    navigate('/student-home'); // Matches your Route path in App.js
                } else if (activePortal === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/reports');
                }
            }
        } catch (err) {
            console.error(err);
            alert("Login Failed. Check credentials and Campus selection.");
        }
    };

    const portalButtonStyle = (isChosen) => ({
        flex: 1,
        padding: '15px',
        margin: '0 5px',
        cursor: 'pointer',
        borderRadius: '4px',
        fontWeight: 'bold',
        border: `2px solid ${mainBlue}`,
        backgroundColor: isChosen ? mainBlue : '#fff',
        color: isChosen ? '#fff' : mainBlue,
    });

    const inputStyle = { width: '100%', padding: '15px', margin: '10px 0 20px', borderRadius: '4px', border: '1px solid #ddd', background: '#f9f9f9', boxSizing: 'border-box' };

    return (
        <div style={{ maxWidth: '800px', margin: '50px auto', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', marginBottom: '30px' }}>
                <button type="button" onClick={() => setActivePortal('student')} style={portalButtonStyle(activePortal === 'student')}>Student Portal</button>
                <button type="button" onClick={() => setActivePortal('department')} style={portalButtonStyle(activePortal === 'department')}>Department</button>
                <button type="button" onClick={() => setActivePortal('admin')} style={portalButtonStyle(activePortal === 'admin')}>Admin Portal</button>
            </div>

            <form onSubmit={handleLogin} style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                {activePortal === 'student' ? (
                    <>
                        <label><b>Select Your Campus</b></label>
                        <select required style={inputStyle} onChange={(e) => setForm({...form, campusId: e.target.value})}>
                            <option value="">-- Select Campus --</option>
                            {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        <label><b>Student Section</b></label>
                        {/* Important: Values here match your DB section_id column */}
                        <select style={inputStyle} value={form.section} onChange={(e) => setForm({...form, section: e.target.value})}>
                            <option value="1">CoSc_2018_A</option>
                            <option value="2">CoSc_2018_B</option>
                        </select>

                        <label><b>Student ID</b></label>
                        <input style={inputStyle} placeholder="E.g: AD/0204/16" required onChange={(e) => setForm({...form, identifier: e.target.value})} />
                    </>
                ) : (
                    <>
                        <label><b>{activePortal === 'admin' ? 'Staff Name' : 'User Name'}</b></label>
                        <input style={inputStyle} placeholder="Enter Name Here ..." required onChange={(e) => setForm({...form, identifier: e.target.value})} />
                        <label><b>{activePortal === 'admin' ? 'Staff Password' : 'Password'}</b></label>
                        <input type="password" style={inputStyle} placeholder="Enter Password here ...." required onChange={(e) => setForm({...form, password: e.target.value})} />
                    </>
                )}
                
                <div style={{ textAlign: 'center' }}>
                    <button type="submit" style={{ background: mainBlue, color: '#fff', padding: '15px 60px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                        LOGIN !
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Login;