import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    
    // Form Credentials
    const [formData, setFormData] = useState({
        identifier: '',
        password: ''
    });

    useEffect(() => {
        const rememberedUser = localStorage.getItem('rememberedUser');
        if (rememberedUser) {
            const user = JSON.parse(rememberedUser);
            setFormData({
                identifier: user.identifier || '',
                password: user.password || ''
            });
            setRememberMe(true);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const inputIdentifier = formData.identifier.trim();

        try {
            let finalizedRole = 'student'; 
            let studentCampusId = "";
            let studentSectionId = "";

            /* SECURITY STEP: 
              Pre-check endpoint to securely look up user details from the DB 
              without exposing credentials or relying on client-side format guessing.
            */
            try {
                const preCheck = await axios.post('http://localhost:5000/api/login/pre-check', { 
                    identifier: inputIdentifier 
                });
                
                if (preCheck.data && preCheck.data.role) {
                    finalizedRole = preCheck.data.role.toLowerCase();
                    
                    // Securely assign database-verified campus and section strings for students
                    if (finalizedRole === 'student') {
                        studentCampusId = preCheck.data.campusId || "";
                        studentSectionId = preCheck.data.sectionId || "";
                    }
                }
            } catch (preCheckErr) {
                console.warn("Pre-check fallback lookup active:", preCheckErr.message);
                // Fallback baseline defaults if pre-check endpoint isn't fully configured yet
                if (inputIdentifier.toUpperCase().startsWith('INST/')) finalizedRole = 'instructor';
                else if (['superadmin', 'admin'].includes(inputIdentifier.toLowerCase())) finalizedRole = 'admin';
                else if (inputIdentifier.toLowerCase().startsWith('dpt')) finalizedRole = 'department';
            }

            // 2. Perform the authoritative authentication request using server-sourced data
            const response = await axios.post('http://localhost:5000/api/login', {
                role: finalizedRole,
                identifier: formData.identifier,
                password: formData.password,
                campusId: studentCampusId, 
                section: studentSectionId   
            });

            if (response.data.success) {
                const dbUser = response.data.user;
                const targetRole = dbUser.role ? dbUser.role.toLowerCase() : finalizedRole;

                // Handle Remember Me credentials securely
                if (rememberMe) {
                    localStorage.setItem('rememberedUser', JSON.stringify({
                        identifier: formData.identifier,
                        password: formData.password
                    }));
                } else {
                    localStorage.removeItem('rememberedUser');
                }

                // 3. Direct, instant routing with zero frontend intercept modal popups
                completeRouting(dbUser, targetRole, studentSectionId);
            }
        } catch (err) {
            console.error("Authentication Error Response Context:", err.response?.data);
            const errorMsg = err.response?.data?.message || "Login Failed: Invalid credentials or verification error.";
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const completeRouting = (user, role, verifiedSection = null) => {
        const userData = { 
            ...user, 
            selectedSection: user.section_id || verifiedSection,
            role: user.role || role,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('user', JSON.stringify(userData));

        switch(role) {
            case 'student':
                navigate('/student-home');
                break;
            case 'admin':
                navigate('/admin');
                break;
            case 'department':
                navigate('/reports');
                break;
            case 'instructor':
                navigate('/instructor-results');
                break;
            default:
                alert("User role verified, but no target dashboard configuration matches.");
        }
    };

    const fillDemoCredentials = (demoRole) => {
        if (demoRole === 'admin') {
            setFormData({ identifier: 'SuperAdmin', password: 'admin123' });
        } else if (demoRole === 'student') {
            setFormData({ identifier: 'AD/0204/16', password: '12345' });
        } else if (demoRole === 'department') {
            setFormData({ identifier: 'DptHeadAcct', password: 'password123' });
        } else if (demoRole === 'instructor') {
            setFormData({ identifier: 'INST/001', password: 'password123' });
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.bgAnimation}>
                <div style={styles.bgCircle1}></div>
                <div style={styles.bgCircle2}></div>
                <div style={styles.bgCircle3}></div>
                <div style={styles.bgCircle4}></div>
            </div>
            
            <div style={styles.watermark}>ADMAS UNIVERSITY</div>
            
            <div style={styles.card}>
                <div style={styles.logoSection}>
                    <div style={styles.logoIcon}>🎓</div>
                    <h1 style={styles.logoText}>IESA</h1>
                    <p style={styles.tagline}>Instructor Evaluation System for Admas</p>
                    <div style={styles.divider}></div>
                </div>

                <form onSubmit={handleLogin} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Username or ID Number</label>
                        <input 
                            type="text"
                            style={styles.input}
                            placeholder="Enter your ID or Username..."
                            name="username"
                            autoComplete="username"
                            value={formData.identifier}
                            onChange={(e) => setFormData({...formData, identifier: e.target.value})}
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
                        <div style={styles.passwordWrapper}>
                            <input 
                                type={showPassword ? "text" : "password"}
                                style={styles.passwordInput}
                                placeholder="Enter Password..."
                                name="current-password"
                                autoComplete="current-password"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                required
                            />
                            <button 
                                type="button"
                                style={styles.eyeBtn}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div style={styles.optionsRow}>
                        <label style={styles.checkboxLabel}>
                            <input 
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                style={styles.checkbox}
                            />
                            Remember me
                        </label>
                        <a href="#" style={styles.forgotLink}>Forgot Password?</a>
                    </div>

                    <button type="submit" style={styles.loginBtn} disabled={loading}>
                        {loading ? '⏳ Verifying Profile...' : '🔐 LOGIN'}
                    </button>

                    <div style={styles.demoSection}>
                        <p style={styles.demoTitle}>Demo Credentials (Click to fill):</p>
                        <div style={styles.demoButtons}>
                            <button type="button" onClick={() => fillDemoCredentials('admin')} style={styles.demoBtnAdmin}>👑 Admin</button>
                            <button type="button" onClick={() => fillDemoCredentials('department')} style={styles.demoBtnDept}>📊 Dept</button>
                            <button type="button" onClick={() => fillDemoCredentials('instructor')} style={styles.demoBtnInstructor}>👨‍🏫 Instructor</button>
                            <button type="button" onClick={() => fillDemoCredentials('student')} style={styles.demoBtnStudent}>🎓 Student</button>
                        </div>
                    </div>
                    
                    <div style={styles.footer}>
                        <p>© 2026 Admas University. All rights reserved.</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' },
    bgAnimation: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0 },
    bgCircle1: { position: 'absolute', top: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', animation: 'float 20s ease-in-out infinite' },
    bgCircle2: { position: 'absolute', bottom: '-30%', left: '-15%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', animation: 'float 25s ease-in-out infinite reverse' },
    bgCircle3: { position: 'absolute', top: '40%', left: '20%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)', animation: 'float 15s ease-in-out infinite' },
    bgCircle4: { position: 'absolute', bottom: '20%', right: '15%', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)', animation: 'float 18s ease-in-out infinite reverse' },
    watermark: { position: 'absolute', bottom: '20px', right: '30px', fontSize: '60px', fontWeight: 'bold', color: 'rgba(255,255,255,0.03)', fontFamily: 'Arial, sans-serif', letterSpacing: '5px', pointerEvents: 'none', zIndex: 0, transform: 'rotate(-15deg)' },
    card: { padding: '40px', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '480px', maxWidth: '90%', backgroundColor: 'rgba(255,255,255,0.98)', position: 'relative', zIndex: 10, backdropFilter: 'blur(10px)', animation: 'slideUp 0.5s ease' },
    logoSection: { textAlign: 'center', marginBottom: '30px' },
    logoIcon: { fontSize: '48px', marginBottom: '5px' },
    logoText: { fontSize: '36px', fontWeight: '800', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0', letterSpacing: '2px' },
    tagline: { fontSize: '11px', color: '#64748b', marginTop: '5px' },
    divider: { width: '60px', height: '3px', background: 'linear-gradient(90deg, #667eea, #764ba2)', margin: '15px auto 0', borderRadius: '3px' },
    form: { display: 'flex', flexDirection: 'column' },
    inputGroup: { marginBottom: '18px' },
    label: { fontWeight: '600', marginBottom: '8px', fontSize: '13px', color: '#334155', display: 'block' },
    input: { padding: '12px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '14px', width: '100%', boxSizing: 'border-box', transition: 'all 0.3s ease', outline: 'none' },
    passwordWrapper: { position: 'relative', width: '100%' },
    passwordInput: { padding: '12px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '14px', width: '100%', boxSizing: 'border-box', paddingRight: '45px', outline: 'none', transition: 'all 0.3s ease' },
    eyeBtn: { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '0', opacity: 0.6 },
    optionsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', cursor: 'pointer' },
    checkbox: { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#667eea' },
    forgotLink: { fontSize: '13px', color: '#667eea', textDecoration: 'none' },
    loginBtn: { padding: '14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '5px', transition: 'all 0.3s ease', width: '100%' },
    demoSection: { marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center' },
    demoTitle: { fontSize: '12px', color: '#64748b', marginBottom: '10px' },
    demoButtons: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' },
    demoBtnAdmin: { padding: '8px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'transform 0.2s' },
    demoBtnDept: { padding: '8px 12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'transform 0.2s' },
    demoBtnInstructor: { padding: '8px 12px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'transform 0.2s' },
    demoBtnStudent: { padding: '8px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'transform 0.2s' },
    footer: { marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes float { 0% { transform: translate(0, 0) scale(1); } 50% { transform: translate(20px, -20px) scale(1.05); } 100% { transform: translate(0, 0) scale(1); } }
    input:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
    button:hover { transform: translateY(-2px); opacity: 0.9; }
`;
document.head.appendChild(styleSheet);

export default Login;