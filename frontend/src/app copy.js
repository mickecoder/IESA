import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import EvaluationForm from './pages/EvaluationForm';
import Admin from './pages/Admin';

// import Reports from './pages/Reports'; // Uncomment if you have this file

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student-home" element={<StudentDashboard />} />
        <Route path="/evaluate/:courseId" element={<EvaluationForm />} />
        <Route path="/admin" element={<Admin />} /> 
        <Route path="/admin-dashboard" element={<Admin />} /> 

      </Routes>
    </Router>
  );
}

export default App;