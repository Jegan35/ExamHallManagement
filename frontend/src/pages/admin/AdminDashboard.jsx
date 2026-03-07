import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Papa from 'papaparse';
import { Trash2, X } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [activeTab, setActiveTab] = useState('student');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // Forms
  const [staffForm, setStaffForm] = useState({ user_id: '', password: '' });
  const [studentForm, setStudentForm] = useState({ user_id: '', password: '', name: '', class_name: 'CSE' });
  const [hallForm, setHallForm] = useState({ hall_no: '', total_rows: '', total_columns: '' });
  const [bulkFile, setBulkFile] = useState(null);

  // Data View States
  const [staffList, setStaffList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [hallList, setHallList] = useState([]);

  // Delete States
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const fetchData = async () => {
    try {
      if (activeTab === 'staff') {
        const res = await axios.get('http://localhost:5000/api/admin/staff', authConfig);
        setStaffList(res.data);
      } else if (activeTab === 'student') {
        const res = await axios.get('http://localhost:5000/api/admin/students', authConfig);
        setStudentList(res.data);
      } else if (activeTab === 'hall') {
        const res = await axios.get('http://localhost:5000/api/admin/halls', authConfig);
        setHallList(res.data);
      }
    } catch (err) { console.error("Error fetching data"); }
  };

  useEffect(() => {
    fetchData();
    setIsDeleteMode(false);
    setSelectedIds([]);
  }, [activeTab]);

  // Handle Checkboxes
  const handleSelectAll = (e, list, idKey) => {
    if (e.target.checked) setSelectedIds(list.map(item => item[idKey]));
    else setSelectedIds([]);
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(item => item !== id));
  };

  // Bulk Delete
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} record(s)?`)) return;

    try {
      let endpoint = '';
      if (activeTab === 'staff') endpoint = 'delete-staff';
      else if (activeTab === 'student') endpoint = 'delete-students';
      else if (activeTab === 'hall') endpoint = 'delete-halls';

      await axios.post(`http://localhost:5000/api/admin/${endpoint}`, { ids: selectedIds }, authConfig);
      showMessage(`Successfully deleted ${selectedIds.length} records.`, 'success');
      setSelectedIds([]);
      setIsDeleteMode(false);
      fetchData();
    } catch (err) {
      alert("Error deleting records.");
    }
  };

  // Add Data Handlers
  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/admin/add-staff', staffForm, authConfig);
      showMessage(res.data.message, 'success');
      setStaffForm({ user_id: '', password: '' });
      fetchData();
    } catch (err) { 
      // Ithu actual MySQL error-ai unga screen-la red box-la kaatum!
      showMessage(err.response?.data?.error || err.response?.data?.message || 'Error', 'error'); 
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/admin/add-student', studentForm, authConfig);
      showMessage(res.data.message, 'success');
      setStudentForm({ user_id: '', password: '', name: '', class_name: 'CSE' });
      fetchData();
    } catch (err) { showMessage(err.response?.data?.message || 'Error', 'error'); }
  };

  const handleAddHall = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/admin/add-hall', hallForm, authConfig);
      showMessage(res.data.message, 'success');
      setHallForm({ hall_no: '', total_rows: '', total_columns: '' });
      fetchData();
    } catch (err) { showMessage(err.response?.data?.message || 'Error', 'error'); }
  };

  const handleBulkUpload = (e, type) => {
    e.preventDefault();
    if (!bulkFile) return showMessage("Please select a CSV file.", "error");
    setLoading(true);

    Papa.parse(bulkFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0; let errorCount = 0;
        const url = type === 'student' ? 'http://localhost:5000/api/admin/add-student' : 'http://localhost:5000/api/admin/add-staff';
        for (let row of results.data) {
          try { await axios.post(url, row, authConfig); successCount++; } 
          catch (err) { errorCount++; }
        }
        showMessage(`Import Complete: ${successCount} added, ${errorCount} failed.`, 'success');
        setLoading(false); setBulkFile(null);
        document.getElementById(`csvInput-${type}`).value = "";
        fetchData();
      }
    });
  };

  const TabButton = ({ id, label }) => (
    <button onClick={() => { setActiveTab(id); setMessage({text: '', type: ''}); }}
      className={`px-4 py-2 font-mono text-sm uppercase tracking-widest transition-all ${activeTab === id ? 'text-accent border-b-2 border-accent' : 'text-gray-500 hover:text-gray-300'}`}>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-base text-gray-200">
      <nav className="bg-panel border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-black uppercase tracking-widest text-white">Admin<span className="text-accent">Portal</span></h1>
        <button onClick={handleLogout} className="px-4 py-2 text-xs font-bold uppercase text-alert border border-alert rounded-sm hover:bg-alert hover:text-black">Logout</button>
      </nav>

      <div className="max-w-6xl mx-auto mt-10 p-6">
        {message.text && (
          <div className={`mb-6 p-4 text-sm font-mono border rounded-sm ${message.type === 'success' ? 'bg-teal-900/20 text-accent border-accent' : 'bg-red-900/20 text-alert border-alert'}`}>
            [ SYSTEM ] : {message.text}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-800 pb-2">
          <TabButton id="student" label="Students" />
          <TabButton id="staff" label="Staff" />
          <TabButton id="hall" label="Exam Halls" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: FORMS */}
          <div className="lg:col-span-1 space-y-8">
            
            {activeTab === 'student' && (
              <>
                <div className="bg-panel p-6 border border-gray-800 shadow-xl">
                  <h3 className="text-sm font-bold text-accent uppercase mb-4 border-b border-gray-700 pb-2">Add Student</h3>
                  <form onSubmit={handleAddStudent} className="space-y-4">
                    <input type="text" required value={studentForm.user_id} onChange={e => setStudentForm({...studentForm, user_id: e.target.value})} className="w-full p-2 bg-base border border-gray-700 font-mono text-sm" placeholder="Roll No (e.g. 21CS001)" />
                    <input type="text" required value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full p-2 bg-base border border-gray-700 font-mono text-sm" placeholder="Full Name" />
                    <select value={studentForm.class_name} onChange={e => setStudentForm({...studentForm, class_name: e.target.value})} className="w-full p-2 bg-base border border-gray-700 font-mono text-sm">
                      <option value="CSE">CSE</option><option value="IT">IT</option><option value="ECE">ECE</option><option value="EEE">EEE</option><option value="MECH">MECH</option>
                    </select>
                    <input type="password" required value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} className="w-full p-2 bg-base border border-gray-700 font-mono text-sm" placeholder="Password" />
                    <button type="submit" className="w-full py-3 bg-accent text-black font-bold uppercase text-xs hover:bg-teal-400">Register</button>
                  </form>
                </div>
                <div className="bg-panel p-6 border border-gray-800">
                  <h3 className="text-sm font-bold text-accent uppercase mb-4 border-b border-gray-700 pb-2">Bulk Import Students</h3>
                  <form onSubmit={e => handleBulkUpload(e, 'student')} className="space-y-4">
                    <p className="text-[10px] text-gray-500 font-mono">CSV: user_id, name, class_name, password</p>
                    <input id="csvInput-student" type="file" accept=".csv" required onChange={e => setBulkFile(e.target.files[0])} className="w-full text-xs text-gray-400 file:bg-gray-700 file:text-white file:border-0 file:px-3 file:py-1 file:mr-3" />
                    <button type="submit" disabled={loading} className="w-full py-2 bg-gray-800 text-white text-xs font-bold uppercase hover:bg-gray-700">Upload CSV</button>
                  </form>
                </div>
              </>
            )}

            {activeTab === 'staff' && (
              <>
                <div className="bg-panel p-6 border border-gray-800 shadow-xl">
                  <h3 className="text-sm font-bold text-accent uppercase mb-4 border-b border-gray-700 pb-2">Add Staff</h3>
                  <form onSubmit={handleAddStaff} className="space-y-4">
                    <input type="text" required value={staffForm.user_id} onChange={e => setStaffForm({...staffForm, user_id: e.target.value})} className="w-full p-2 bg-base border border-gray-700 font-mono text-sm" placeholder="Staff ID" />
                    <input type="password" required value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} className="w-full p-2 bg-base border border-gray-700 font-mono text-sm" placeholder="Password" />
                    <button type="submit" className="w-full py-3 bg-accent text-black font-bold uppercase text-xs hover:bg-teal-400">Register</button>
                  </form>
                </div>
                <div className="bg-panel p-6 border border-gray-800">
                  <h3 className="text-sm font-bold text-accent uppercase mb-4 border-b border-gray-700 pb-2">Bulk Import Staff</h3>
                  <form onSubmit={e => handleBulkUpload(e, 'staff')} className="space-y-4">
                    <p className="text-[10px] text-gray-500 font-mono">CSV: user_id, password</p>
                    <input id="csvInput-staff" type="file" accept=".csv" required onChange={e => setBulkFile(e.target.files[0])} className="w-full text-xs text-gray-400 file:bg-gray-700 file:text-white file:border-0 file:px-3 file:py-1 file:mr-3" />
                    <button type="submit" disabled={loading} className="w-full py-2 bg-gray-800 text-white text-xs font-bold uppercase hover:bg-gray-700">Upload CSV</button>
                  </form>
                </div>
              </>
            )}

            {activeTab === 'hall' && (
              <div className="bg-panel p-6 border border-gray-800 shadow-xl">
                <h3 className="text-sm font-bold text-accent uppercase mb-4 border-b border-gray-700 pb-2">Add Exam Hall</h3>
                <form onSubmit={handleAddHall} className="space-y-4">
                  <input type="text" required value={hallForm.hall_no} onChange={e => setHallForm({...hallForm, hall_no: e.target.value})} className="w-full p-2 bg-base border border-gray-700 font-mono text-sm" placeholder="Hall No (e.g. 101)" />
                  <div className="flex gap-4">
                    <input type="number" min="1" required value={hallForm.total_rows} onChange={e => setHallForm({...hallForm, total_rows: e.target.value})} className="w-full p-2 bg-base border border-gray-700 font-mono text-sm" placeholder="Rows" />
                    <input type="number" min="1" required value={hallForm.total_columns} onChange={e => setHallForm({...hallForm, total_columns: e.target.value})} className="w-full p-2 bg-base border border-gray-700 font-mono text-sm" placeholder="Cols" />
                  </div>
                  <button type="submit" className="w-full py-3 bg-accent text-black font-bold uppercase text-xs hover:bg-teal-400">Register Hall</button>
                </form>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: DATA TABLES WITH DELETE FEATURE */}
          <div className="lg:col-span-2">
            <div className="bg-panel p-6 border border-gray-800 h-full max-h-[800px] overflow-y-auto">
              
              <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white uppercase tracking-widest">
                    {activeTab === 'student' ? 'Students' : activeTab === 'staff' ? 'Staff' : 'Halls'}
                  </h3>
                  <span className="text-xs font-mono text-accent bg-teal-900/30 px-2 py-1 border border-accent">Total: {activeTab === 'student' ? studentList.length : activeTab === 'staff' ? staffList.length : hallList.length}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  {isDeleteMode ? (
                    <div className="flex items-center gap-2">
                      <button onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className="bg-alert px-4 py-1 text-black font-bold text-[10px] uppercase rounded-sm disabled:opacity-30">Delete Selected ({selectedIds.length})</button>
                      <button onClick={() => {setIsDeleteMode(false); setSelectedIds([]);}} className="text-gray-500 hover:text-white"><X size={18}/></button>
                    </div>
                  ) : (
                    <button onClick={() => setIsDeleteMode(true)} className="text-gray-500 hover:text-alert transition-all" title="Delete Records"><Trash2 size={20}/></button>
                  )}
                </div>
              </div>

              {activeTab === 'student' && (
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                      {isDeleteMode && <th className="py-2 px-2 w-10"><input type="checkbox" onChange={(e) => handleSelectAll(e, studentList, 'user_id')} checked={selectedIds.length > 0 && selectedIds.length === studentList.length} /></th>}
                      <th className="py-2 px-2">Roll No</th>
                      <th className="py-2 px-2">Name</th>
                      <th className="py-2 px-2">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentList.map(student => (
                      <tr key={student.user_id} className={`border-b border-gray-800 hover:bg-base ${selectedIds.includes(student.user_id) ? 'bg-base' : ''}`}>
                        {isDeleteMode && <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(student.user_id)} onChange={e => handleSelectOne(e, student.user_id)} /></td>}
                        <td className="py-3 px-2 text-accent">{student.user_id}</td>
                        <td className="py-3 px-2 text-gray-300">{student.name}</td>
                        <td className="py-3 px-2 text-gray-500">{student.class_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'staff' && (
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                      {isDeleteMode && <th className="py-2 px-2 w-10"><input type="checkbox" onChange={(e) => handleSelectAll(e, staffList, 'user_id')} checked={selectedIds.length > 0 && selectedIds.length === staffList.length} /></th>}
                      <th className="py-2 px-2">Staff ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map(staff => (
                      <tr key={staff.user_id} className={`border-b border-gray-800 hover:bg-base ${selectedIds.includes(staff.user_id) ? 'bg-base' : ''}`}>
                        {isDeleteMode && <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(staff.user_id)} onChange={e => handleSelectOne(e, staff.user_id)} /></td>}
                        <td className="py-3 px-2 text-accent">{staff.user_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'hall' && (
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                      {isDeleteMode && <th className="py-2 px-2 w-10"><input type="checkbox" onChange={(e) => handleSelectAll(e, hallList, 'hall_no')} checked={selectedIds.length > 0 && selectedIds.length === hallList.length} /></th>}
                      <th className="py-2 px-2">Hall No</th>
                      <th className="py-2 px-2">Grid (Row x Col)</th>
                      <th className="py-2 px-2 text-right">Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hallList.map(hall => (
                      <tr key={hall.hall_no} className={`border-b border-gray-800 hover:bg-base ${selectedIds.includes(hall.hall_no) ? 'bg-base' : ''}`}>
                        {isDeleteMode && <td className="py-3 px-2"><input type="checkbox" checked={selectedIds.includes(hall.hall_no)} onChange={e => handleSelectOne(e, hall.hall_no)} /></td>}
                        <td className="py-3 px-2 text-accent font-bold">Hall {hall.hall_no}</td>
                        <td className="py-3 px-2 text-gray-400">{hall.total_rows} x {hall.total_columns}</td>
                        <td className="py-3 px-2 text-white text-right">{hall.total_rows * hall.total_columns}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;