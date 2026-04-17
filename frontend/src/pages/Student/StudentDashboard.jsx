import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, BookOpen, MapPin, User, Hash } from 'lucide-react';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [profile, setProfile] = useState({});
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    const fetchMyData = async () => {
      try {
        const authConfig = { headers: { Authorization: `Bearer ${token}` } };
        const timestamp = new Date().getTime();
        const res = await axios.get(`http://localhost:5000/api/student/my-allocations?t=${timestamp}`, authConfig);
        
        setProfile(res.data.profile);
        setAllocations(res.data.allocations);
      } catch (err) {
        console.error("Error fetching student data");
      } finally {
        setLoading(false);
      }
    };
    fetchMyData();
  }, [token]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 relative font-mono">
      
      {/* NAVBAR */}
      <nav className="bg-[#121212] border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-black uppercase tracking-widest text-white">
          Exam<span className="text-[#00ffcc]">Management</span>
        </h1>
        <button 
          onClick={handleLogout} 
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-500 border border-red-500 rounded-sm hover:bg-red-500 hover:text-black transition-all"
        >
          Logout
        </button>
      </nav>

      <div className="max-w-6xl mx-auto mt-10 p-6">
        
        {loading ? (
          <p className="text-[#00ffcc] font-bold text-center mt-20 animate-pulse tracking-widest">LOADING PROFILE...</p>
        ) : (
          <>
            {/* PROFILE SECTION */}
            <div className="bg-[#121212] border border-[#00ffcc] p-6 mb-10 shadow-[0_0_30px_rgba(0,255,204,0.05)] rounded-sm flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-[#00ffcc]/10 border border-[#00ffcc] rounded-full flex items-center justify-center text-[#00ffcc]">
                  <User size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-widest">{profile.name}</h2>
                  <div className="flex gap-4 mt-2 text-sm text-gray-400 font-bold">
                    <span className="bg-gray-900 px-3 py-1 border border-gray-700">{profile.user_id}</span>
                    <span className="bg-gray-900 px-3 py-1 border border-gray-700">{profile.class_name} DEPT</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 md:mt-0 text-right">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Scheduled Exams</p>
                <p className="text-4xl font-black text-[#00ffcc]">{allocations.length}</p>
              </div>
            </div>

            {/* EXAM ALLOCATIONS GRID */}
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-widest border-b border-gray-800 pb-3 mb-6">
                My Seating Arrangements
              </h3>
              
              {allocations.length === 0 ? (
                <div className="bg-[#121212] border border-gray-800 p-10 text-center">
                  <p className="text-gray-500 italic">You have no upcoming exams allocated yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allocations.map((exam, index) => (
                    <div key={index} className="bg-[#121212] border border-gray-800 hover:border-[#00ffcc]/50 transition-all rounded-sm group relative overflow-hidden">
                      
                      {/* Top Decor Line */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00ffcc] to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="p-6">
                        {/* Subject & Date Header */}
                        <div className="mb-6">
                          <h4 className="text-xl font-bold text-[#00ffcc] truncate" title={exam.subject}>
                            {exam.subject}
                          </h4>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
                            <Calendar size={14} className="text-[#00ffcc]" />
                            <span>{exam.exam_date}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 font-bold uppercase tracking-wider">
                            <Clock size={14} className="text-[#00ffcc]" />
                            <span>{exam.timing}</span>
                          </div>
                        </div>

                        {/* Hall & Seat Info */}
                        <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-5">
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Exam Hall</p>
                            <p className="text-lg font-black text-white flex items-center gap-2">
                              <MapPin size={16} className="text-gray-400" />
                              {exam.hall_no}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Seat No</p>
                            <p className="text-2xl font-black text-[#00ffcc] flex items-center justify-end gap-1">
                              <Hash size={20} />
                              {exam.seat_no}
                            </p>
                            <p className="text-xs text-gray-400 font-bold tracking-widest mt-1">
                              R{exam.row_num} - C{exam.col_num}
                            </p>
                          </div>
                        </div>
                        
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
