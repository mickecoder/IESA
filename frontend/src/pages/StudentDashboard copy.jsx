import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
    const [courses, setCourses] = useState([]);
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }

        if (user.selectedSection) {
            axios.get(`http://localhost:5000/api/courses/section/${user.selectedSection}`)
                .then(res => setCourses(res.data))
                .catch(err => console.error("Error fetching courses:", err));
        }
    }, [user, navigate]);

    return (
        <main className="content-area">
            <header className="header-section">
                <h2>Welcome, <span style={{ color: '#1da1d2' }}>{user?.email_or_id}</span></h2>
                <p>Your Courses for Evaluation</p>
            </header>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {courses.map(course => (
                    <div key={course.id} className="content-card" style={{ borderLeft: '5px solid #1da1d2' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#1da1d2' }}>{course.course_name}</h4>
                        <p style={{ fontSize: '14px' }}>Code: <b>{course.course_code}</b></p>
                        <button 
                            className="primary-btn"
                            onClick={() => navigate(`/evaluate/${course.id}`)}
                        >
                            Evaluate Instructor
                        </button>
                    </div>
                ))}
            </div>
        </main>
    );
};

export default StudentDashboard;