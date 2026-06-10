import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Departments from './pages/Departments';
import Reports from './pages/Reports';
import StudentDashboard from './pages/StudentDashboard';
import EvaluationForm from './pages/EvaluationForm';
import ManageStudents from './pages/ManageStudents';
import ManageCampuses from './pages/ManageCampuses';
import ManageCourses from './pages/ManageCourses';
import ManageUsers from './pages/ManageUsers';
import Instructors from './pages/Instructors';
import InstructorResults from './pages/InstructorResults';
import React, { useState } from 'react';
import './App.css';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 1. Initialize user from localStorage to prevent crash on refresh
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // 2. Function to handle login success
  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Redirect based on role
    if (userData.role === 'admin') navigate('/admin');
    else if (userData.role === 'instructor') navigate('/instructor-results');
    else navigate('/student-home');
  };

  const isLoginPage = location.pathname === "/";

  return (
    <div style={{ display: 'flex' }}>
      {!isLoginPage && <Sidebar user={user} />}
      <div style={{ 
        flex: 1, 
        marginLeft: isLoginPage ? '0' : '250px', 
        minHeight: '100vh', 
        background: '#f8fafc' 
      }}>
        <Routes>
          <Route path="/" element={<Login onLoginSuccess={handleLogin} />} />
          
          <Route path="/admin" element={<AdminDashboard user={user} />} />
          <Route path="/departments" element={<Departments user={user} />} />          
          
          {/* Updated paths to match Sidebar links */}
          <Route path="/reports" element={<Reports />} />
          <Route path="/students" element={<ManageStudents />} /> 
          <Route path="/courses" element={<ManageCourses />} />
          <Route path="/campuses" element={<ManageCampuses />} />
          
          {/* 👥 PLACED CORRECTLY INSIDE ROUTES ENGINE */}
          <Route path="/instructors" element={<Instructors />} />
          <Route path="/users" element={<ManageUsers />} />

          {/* Student Routes */}
          <Route path="/student-home" element={<StudentDashboard user={user} />} />
          <Route path="/evaluate/:courseId" element={<EvaluationForm user={user} />} />
          <Route path="/instructor" element={<Instructors />} />
          <Route path="/instructor-results" element={<InstructorResults user={user} />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;