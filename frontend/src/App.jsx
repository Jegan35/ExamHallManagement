import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from './pages/Student/StudentDashboard';

// 1. Importing the actual functional pages
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import StaffDashboard from './pages/Staff/StaffDashboard'; 

// 2. ONLY Student is left as a placeholder now
const StudentPortal = () => <div className="p-10 text-center text-accent text-2xl font-bold tracking-widest uppercase">Student Telemetry (Coming Soon)</div>;

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-base text-gray-200 font-sans">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/staff" element={<StaffDashboard />} /> {/* Now pointing to the real file */}
          <Route path="/student" element={<StudentDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
