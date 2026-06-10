import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
    FaHome, FaBuilding, FaMapMarkerAlt, FaBook, 
    FaUserGraduate, FaChartLine, FaClipboardList, FaSignOutAlt,
    FaUsers, FaChalkboardTeacher
} from 'react-icons/fa';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const userData = localStorage.getItem('user');
    
    // Hide sidebar on login page or if no user is found
    if (location.pathname === '/' || !userData) return null;

    let user = { role: '', email_or_id: '' };
    try {
        user = JSON.parse(userData);
    } catch (e) {
        console.error("Error parsing user data");
    }

    const role = user.role ? user.role.toLowerCase() : '';

    // --- FIXED STYLES OBJECT ---
    const styles = {
        sidebar: {
            width: '260px',
            height: '100vh',
            backgroundColor: '#1a2235', 
            color: 'white',
            position: 'fixed',
            left: 0,
            top: 0,
            display: 'flex',
            flexDirection: 'column', 
            padding: '25px 20px',
            boxSizing: 'border-box',
            zIndex: 1000,
        },
        brand: {
            color: '#00a8ff',
            fontSize: '22px',
            fontWeight: 'bold',
            margin: '0 0 10px 0',
        },
        userBox: {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '30px',
        },
        navContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
        },
        navLink: (isActive) => ({
            display: 'flex',
            alignItems: 'center',
            color: isActive ? '#ffffff' : '#bdc3c7',
            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            textDecoration: 'none',
            fontSize: '15px',
            padding: '10px 12px',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
        }),
        icon: (color) => ({
            marginRight: '15px',
            fontSize: '18px',
            color: color,
        }),
        footer: {
            marginTop: 'auto', 
        },
        logoutBtn: {
            width: '100%',
            backgroundColor: '#e74c3c', 
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
        }
    };

    return (
        <div style={styles.sidebar}>
            <div style={{ flexGrow: 1 }}>
                <h2 style={styles.brand}>IEAS System</h2>
                
                <div style={styles.userBox}>
                    <p style={{ fontSize: '11px', color: '#bdc3c7', margin: 0, textTransform: 'uppercase' }}>
                        {role || 'USER'}: {user.name || user.email_or_id}
                    </p>
                    {user.dept_name && (
                        <p style={{ fontSize: '10px', color: '#7f8c8d', margin: '4px 0 0 0' }}>
                            Dept: {user.dept_name}
                        </p>
                    )}
                </div>

                <nav style={styles.navContainer}>
                    {role === 'admin' && (
                        <>
                            <Link to="/admin" style={styles.navLink(location.pathname === '/admin')}>
                                <FaHome style={styles.icon('#ff9f43')} /> Admin Dashboard
                            </Link>
                            <Link to="/users" style={styles.navLink(location.pathname === '/users')}>
                                <FaUsers style={styles.icon('#00a8ff')} /> Manage Users
                            </Link>
                            <Link to="/departments" style={styles.navLink(location.pathname === '/departments')}>
                                <FaBuilding style={styles.icon('#3498db')} /> Department Reports
                            </Link>
                            <Link to="/campuses" style={styles.navLink(location.pathname === '/campuses')}>
                                <FaMapMarkerAlt style={styles.icon('#e91e63')} /> Manage Campuses And Departments
                            </Link>
                        </>
                    )}

                    {(role === 'admin' || role === 'department') && (
                        <>
                            <Link to="/courses" style={styles.navLink(location.pathname === '/courses')}>
                                <FaBook style={styles.icon('#2ecc71')} /> Manage Courses
                            </Link>
                            <Link to="/students" style={styles.navLink(location.pathname === '/students')}>
                                <FaUserGraduate style={styles.icon('#f1c40f')} /> Manage Students
                            </Link>
                            <Link to="/instructors" style={styles.navLink(location.pathname === '/instructors')}>
                                <FaChalkboardTeacher style={styles.icon('#00d2d3')} /> Instructors Directory
                            </Link>
                            <Link to="/reports" style={styles.navLink(location.pathname === '/reports')}>
                                <FaChartLine style={styles.icon('#9b59b6')} /> Performance Reports
                            </Link>
                        </>
                    )}

                    {role === 'student' && (
                        <Link to="/student-home" style={styles.navLink(location.pathname === '/student-home')}>
                            <FaClipboardList style={styles.icon('#1abc9c')} /> My Evaluations
                        </Link>
                    )}
                </nav>
            </div>

            <div style={styles.footer}>
                <button 
                    onClick={() => { localStorage.clear(); navigate('/'); }} 
                    style={styles.logoutBtn}
                >
                    <FaSignOutAlt /> SIGN OUT
                </button>
            </div>
        </div>
    );
};

export default Sidebar;