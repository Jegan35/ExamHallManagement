import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { Trash2, X, Edit } from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('student');
  const [studentList, setStudentList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [hallList, setHallList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkFile, setBulkFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [expandedDept, setExpandedDept] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const [editModal, setEditModal] = useState({ isOpen: false, type: '', data: {} });

  const [rollNo, setRollNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [dept, setDept] = useState('IT');
  const [password, setPassword] = useState('');
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [hallNo, setHallNo] = useState('');
  const [totalRows, setTotalRows] = useState('');
  const [totalColumns, setTotalColumns] = useState('');

  const token = localStorage.getItem('token');
  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setIsDeleteMode(false);
    setSearchQuery('');
  };

  const fetchData = async () => {
    try {
      const timestamp = new Date().getTime(); 
      if (activeTab === 'staff') {
        const res = await axios.get(`http://localhost:5000/api/admin/staff?t=${timestamp}`, authConfig);
        setStaffList(res.data);
      } else if (activeTab === 'student') {
        const res = await axios.get(`http://localhost:5000/api/admin/students?t=${timestamp}`, authConfig);
        setStudentList(res.data);
      } else if (activeTab === 'hall') {
        const res = await axios.get(`http://localhost:5000/api/admin/halls?t=${timestamp}`, authConfig);
        setHallList(res.data);
      }
    } catch (err) { console.error("Error fetching data"); }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const toggleDept = (department) => {
    setExpandedDept(prev => ({ ...prev, [department]: !prev[department] }));
  };

  const handleSelectAll = (e, currentList) => {
    if (e.target.checked) {
      const ids = currentList.map(item => item.user_id || item.hall_no);
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    } else {
      const idsToRemove = currentList.map(item => item.user_id || item.hall_no);
      setSelectedIds(selectedIds.filter(id => !idsToRemove.includes(id)));
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) setSelectedIds([...selectedIds, id]);
    else setSelectedIds(selectedIds.filter(itemId => itemId !== id));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { type, data } = editModal;
    const url = type === 'student' ? `http://localhost:5000/api/admin/update-student/${data.user_id}` :
                type === 'staff' ? `http://localhost:5000/api/admin/update-staff/${data.user_id}` :
                `http://localhost:5000/api/admin/update-hall/${data.hall_no}`;
    try {
      await axios.put(url, data, authConfig);
      showMessage(`${type.toUpperCase()} updated successfully!`, "success");
      setEditModal({ isOpen: false, type: '', data: {} });
      fetchData();
    } catch (err) {
      showMessage(err.response?.data?.error || "Error updating data", "error");
    }
  };

  const handleSingleAdd = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'student') {
        await axios.post('http://localhost:5000/api/admin/add-student', { user_id: rollNo, name: studentName, class_name: dept, password: password }, authConfig);
        setRollNo(''); setStudentName(''); setPassword('');
      } else if (activeTab === 'staff') {
        await axios.post('http://localhost:5000/api/admin/add-staff', { user_id: staffId, name: staffName, password: staffPassword }, authConfig);
        setStaffId(''); setStaffName(''); setStaffPassword('');
      } else if (activeTab === 'hall') {
        await axios.post('http://localhost:5000/api/admin/add-hall', { hall_no: hallNo, total_rows: totalRows, total_columns: totalColumns }, authConfig);
        setHallNo(''); setTotalRows(''); setTotalColumns('');
      }
      showMessage(`${activeTab.toUpperCase()} added successfully!`, "success");
      fetchData();
    } catch (err) { showMessage(err.response?.data?.message || `Error adding ${activeTab}`, "error"); }
  };

  const handleBulkUpload = (e, type) => {
    e.preventDefault();
    if (!bulkFile) return showMessage("Please select a CSV file.", "error");

    setLoading(true);
    Papa.parse(bulkFile, {
      header: true, skipEmptyLines: true,
      transformHeader: function(header) { return header.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase(); },
      complete: async (results) => {
        try {
          let finalData = [];
          for (let row of results.data) {
            if (type === 'student' && (row.rollno || row.id)) {
              finalData.push({ user_id: row.rollno || row.id, name: row.name || row.studentname, class_name: row.department || row.dept, password: row.password || row.pass });
            } else if (type === 'staff' && (row.id || row.staffid || row.staff_id)) {
              finalData.push({ user_id: row.id || row.staffid || row.staff_id, name: row.staffname || row.name || row.staff_name, password: row.pass || row.password });
            }
          }
          if (finalData.length === 0) {
            setLoading(false); return showMessage("No valid data found. Check columns (id, name, pass).", "error");
          }

          const url = type === 'student' ? 'http://localhost:5000/api/admin/bulk-students' : 'http://localhost:5000/api/admin/bulk-staff';
          const res = await axios.post(url, { data: finalData }, authConfig);
          showMessage(res.data.message, 'success');
        } catch (err) { showMessage("Server error during upload.", 'error'); } 
        finally {
          setLoading(false); setBulkFile(null);
          document.getElementById(`csvInput-${type}`).value = "";
          fetchData(); 
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} records?`)) return;

    const url = activeTab === 'student' ? 'http://localhost:5000/api/admin/delete-students' : 
                activeTab === 'staff' ? 'http://localhost:5000/api/admin/delete-staff' : 
                `http://localhost:5000/api/admin/delete-halls`;
    try {
       await axios.post(url, { ids: selectedIds }, authConfig);
       showMessage(`Deleted ${selectedIds.length} records successfully.`, "success");
       setSelectedIds([]); 
       setIsDeleteMode(false);
       fetchData();
    } catch(err) { showMessage("Delete failed", "error"); }
  };

  const getFilteredData = () => {
    const q = searchQuery.toLowerCase();
    if (activeTab === 'student') return studentList.filter(s => (s.user_id?.toLowerCase().includes(q)) || (s.name?.toLowerCase().includes(q)) || (s.class_name?.toLowerCase().includes(q)));
    if (activeTab === 'staff') return staffList.filter(s => (s.user_id?.toLowerCase().includes(q)) || (s.name?.toLowerCase().includes(q)));
    if (activeTab === 'hall') return hallList.filter(h => h.hall_no?.toString().toLowerCase().includes(q));
    return [];
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 p-6 font-mono relative">
      
      {/* HEADER & TABS */}
      <div className="mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold text-[#00ffcc] mb-6 tracking-widest">EXAM MANAGEMENT ADMIN</h1>
        <div className="flex gap-8">
          {['student', 'staff', 'hall'].map((tab) => (
            <button key={tab} onClick={() => handleTabSwitch(tab)} className={`pb-2 uppercase tracking-widest font-bold text-sm transition-colors ${activeTab === tab ? 'text-[#00ffcc] border-b-2 border-[#00ffcc]' : 'text-gray-500 hover:text-gray-300'}`}>
              {tab === 'hall' ? 'Exam Halls' : `${tab}s`}
            </button>
          ))}
        </div>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 font-bold border ${message.type === 'success' ? 'border-[#00ffcc] text-[#00ffcc] bg-[#00ffcc]/10' : 'border-red-500 text-red-500 bg-red-500/10'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* LEFT PANEL - FORMS */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="bg-[#121212] p-6 border border-gray-800">
            <h2 className="text-[#00ffcc] font-bold mb-6 tracking-widest uppercase">ADD {activeTab}</h2>
            {activeTab === 'student' && (
              <form onSubmit={handleSingleAdd} className="flex flex-col gap-4">
                <input type="text" placeholder="Roll No" value={rollNo} onChange={e => setRollNo(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <input type="text" placeholder="Student Name" value={studentName} onChange={e => setStudentName(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <select value={dept} onChange={e => setDept(e.target.value)} className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none">
                  <option value="IT" className="bg-black">IT</option><option value="CSE" className="bg-black">CSE</option>
                </select>
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <button type="submit" className="mt-2 bg-[#00ffcc] text-black font-bold p-3 uppercase hover:bg-[#00ccaa] transition-colors">REGISTER</button>
              </form>
            )}
            {activeTab === 'staff' && (
              <form onSubmit={handleSingleAdd} className="flex flex-col gap-4">
                <input type="text" placeholder="Staff ID" value={staffId} onChange={e => setStaffId(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <input type="text" placeholder="Staff Name" value={staffName} onChange={e => setStaffName(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <input type="password" placeholder="Password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <button type="submit" className="mt-2 bg-[#00ffcc] text-black font-bold p-3 uppercase hover:bg-[#00ccaa] transition-colors">ADD STAFF</button>
              </form>
            )}
            {activeTab === 'hall' && (
              <form onSubmit={handleSingleAdd} className="flex flex-col gap-4">
                <input type="text" placeholder="Hall No (e.g. 101)" value={hallNo} onChange={e => setHallNo(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <input type="number" placeholder="Total Rows" value={totalRows} onChange={e => setTotalRows(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <input type="number" placeholder="Total Columns" value={totalColumns} onChange={e => setTotalColumns(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <button type="submit" className="mt-2 bg-[#00ffcc] text-black font-bold p-3 uppercase hover:bg-[#00ccaa] transition-colors">ADD HALL</button>
              </form>
            )}
          </div>

          {(activeTab === 'student' || activeTab === 'staff') && (
             <div className="bg-[#121212] p-6 border border-gray-800">
                <h2 className="text-[#00ffcc] font-bold mb-4 tracking-widest">BULK IMPORT</h2>
                <form onSubmit={(e) => handleBulkUpload(e, activeTab)} className="flex flex-col gap-4">
                  <input type="file" id={`csvInput-${activeTab}`} accept=".csv" onChange={(e) => setBulkFile(e.target.files[0])} className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-[#1a1a1a] file:text-[#00ffcc] hover:file:bg-[#222] cursor-pointer" />
                  <button type="submit" disabled={loading} className="mt-2 bg-[#1a1a1a] border border-gray-700 text-white font-bold p-3 uppercase hover:border-[#00ffcc] transition-colors">{loading ? 'UPLOADING...' : 'UPLOAD CSV'}</button>
                </form>
             </div>
          )}
        </div>

        {/* RIGHT PANEL - LIST VIEW */}
        <div className="w-full lg:w-2/3 bg-[#121212] p-6 border border-gray-800">
          
          <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white tracking-widest uppercase">{activeTab}S</h2>
              
              {isDeleteMode ? (
                <>
                  <span className="border border-[#00ffcc] text-[#00ffcc] px-2 py-1 text-xs font-bold">Selected: {selectedIds.length}</span>
                  <button onClick={handleBulkDelete} disabled={selectedIds.length === 0} className="bg-red-500/20 text-red-500 border border-red-500 px-3 py-1 text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Confirm Delete
                  </button>
                  <button onClick={() => {setIsDeleteMode(false); setSelectedIds([]);}} className="p-1 text-gray-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </>
              ) : (
                <button onClick={() => setIsDeleteMode(true)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Enable Bulk Delete">
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            <div className="w-1/3">
               <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent border border-gray-700 p-2 text-white focus:border-[#00ffcc] outline-none text-sm" />
            </div>
          </div>

          {activeTab === 'student' && (
            <div className="overflow-x-auto">
              {(() => {
                const students = getFilteredData();
                const grouped = students.reduce((acc, s) => {
                  const d = s.class_name || 'Unknown';
                  if (!acc[d]) acc[d] = [];
                  acc[d].push(s); return acc;
                }, {});

                if (Object.keys(grouped).length === 0) return <p className="text-gray-500">No students found.</p>;

                return Object.keys(grouped).map(deptKey => (
                  <div key={deptKey} className="mb-4 border border-gray-800 bg-[#0a0a0a]">
                    <button onClick={() => toggleDept(deptKey)} className="w-full p-4 flex justify-between items-center bg-[#151515] hover:bg-[#1a1a1a] text-[#00ffcc] border-b border-gray-800">
                      <span className="text-lg font-bold tracking-widest">{expandedDept[deptKey] ? '▼' : '▶'} {deptKey} LIST</span>
                      <span className="bg-[#00ffcc] text-black px-3 py-1 text-sm font-bold">{grouped[deptKey].length}</span>
                    </button>

                    {expandedDept[deptKey] && (
                      <div className="p-4">
                        <table className="w-full text-left text-gray-300 text-sm">
                          <thead className="text-xs uppercase text-gray-500 border-b border-gray-800">
                            <tr>
                              {isDeleteMode && <th className="px-4 py-3 w-10"><input type="checkbox" onChange={(e) => handleSelectAll(e, grouped[deptKey])} className="accent-[#00ffcc]" /></th>}
                              <th className="px-4 py-3">Roll No</th>
                              <th className="px-4 py-3">Name</th>
                              <th className="px-4 py-3">Dept</th>
                              {!isDeleteMode && <th className="px-4 py-3 text-right">Action</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {grouped[deptKey].map(student => (
                              <tr key={student.user_id} className="border-b border-gray-800/50 hover:bg-[#1a1a1a] transition-colors">
                                {isDeleteMode && (
                                  <td className="px-4 py-3">
                                    <input type="checkbox" checked={selectedIds.includes(student.user_id)} onChange={(e) => handleSelectOne(e, student.user_id)} className="accent-[#00ffcc]" />
                                  </td>
                                )}
                                <td className="px-4 py-3 text-[#00ffcc] font-bold">{student.user_id}</td>
                                <td className="px-4 py-3">{student.name}</td>
                                <td className="px-4 py-3">{student.class_name}</td>
                                {!isDeleteMode && (
                                  <td className="px-4 py-3 text-right">
                                    <button onClick={() => setEditModal({ isOpen: true, type: 'student', data: { ...student } })} className="text-blue-400 hover:text-blue-300 mr-2" title="Edit">
                                      <Edit size={18} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          )}

          {(activeTab === 'staff' || activeTab === 'hall') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-300 text-sm">
                <thead className="text-xs uppercase text-gray-500 border-b border-gray-800">
                  <tr>
                    {isDeleteMode && <th className="px-4 py-3 w-10"><input type="checkbox" onChange={(e) => handleSelectAll(e, getFilteredData())} className="accent-[#00ffcc]" /></th>}
                    <th className="px-4 py-3">{activeTab === 'staff' ? 'Staff ID' : 'Hall No'}</th>
                    <th className="px-4 py-3">{activeTab === 'staff' ? 'Name' : 'Capacity'}</th>
                    {!isDeleteMode && <th className="px-4 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {getFilteredData().map(item => {
                    const id = activeTab === 'staff' ? item.user_id : item.hall_no;
                    return (
                      <tr key={id} className="border-b border-gray-800/50 hover:bg-[#1a1a1a] transition-colors">
                        {isDeleteMode && (
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedIds.includes(id)} onChange={(e) => handleSelectOne(e, id)} className="accent-[#00ffcc]" />
                          </td>
                        )}
                        <td className="px-4 py-3 text-[#00ffcc] font-bold">{id}</td>
                        <td className="px-4 py-3">{activeTab === 'staff' ? item.name : `${item.total_rows * item.total_columns} Seats`}</td>
                        {!isDeleteMode && (
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => setEditModal({ isOpen: true, type: activeTab, data: { ...item } })} className="text-blue-400 hover:text-blue-300 mr-2" title="Edit">
                              <Edit size={18} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* --- EDIT MODAL (POPUP) --- */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121212] border border-[#00ffcc] p-6 w-full max-w-md shadow-[0_0_20px_rgba(0,255,204,0.1)]">
            
            <div className="flex justify-between items-center border-b border-gray-800 pb-2 mb-6">
               <h2 className="text-[#00ffcc] font-bold text-xl tracking-widest uppercase">EDIT {editModal.type}</h2>
               <button onClick={() => setEditModal({ isOpen: false, type: '', data: {} })} className="text-gray-500 hover:text-red-500">
                 <X size={24} />
               </button>
            </div>
            
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              
              {editModal.type === 'student' && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Roll No (Uneditable)</label>
                    <input type="text" value={editModal.data.user_id} disabled className="w-full bg-[#1a1a1a] border border-gray-700 p-3 text-gray-500 cursor-not-allowed outline-none font-bold" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Name</label>
                    <input type="text" value={editModal.data.name} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })} required className="w-full bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Department</label>
                    <select value={editModal.data.class_name} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, class_name: e.target.value } })} className="w-full bg-[#121212] border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none">
                      <option value="IT">IT</option>
                      <option value="CSE">CSE</option>
                      <option value="ECE">ECE</option>
                      <option value="MECH">MECH</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#00ffcc] uppercase tracking-wider block mb-1">Password (Visible)</label>
                    <input type="text" value={editModal.data.password || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, password: e.target.value } })} className="w-full bg-transparent border border-[#00ffcc]/50 p-3 text-[#00ffcc] font-bold focus:border-[#00ffcc] outline-none" placeholder="Enter new password" />
                  </div>
                </>
              )}

              {editModal.type === 'staff' && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Staff ID (Uneditable)</label>
                    <input type="text" value={editModal.data.user_id} disabled className="w-full bg-[#1a1a1a] border border-gray-700 p-3 text-gray-500 cursor-not-allowed outline-none font-bold" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Name</label>
                    <input type="text" value={editModal.data.name} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })} required className="w-full bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-[#00ffcc] uppercase tracking-wider block mb-1">Password (Visible)</label>
                    <input type="text" value={editModal.data.password || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, password: e.target.value } })} className="w-full bg-transparent border border-[#00ffcc]/50 p-3 text-[#00ffcc] font-bold focus:border-[#00ffcc] outline-none" placeholder="Enter new password" />
                  </div>
                </>
              )}

              {editModal.type === 'hall' && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Hall No (Uneditable)</label>
                    <input type="text" value={editModal.data.hall_no} disabled className="w-full bg-[#1a1a1a] border border-gray-700 p-3 text-gray-500 cursor-not-allowed outline-none font-bold" />
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Total Rows</label>
                      <input type="number" value={editModal.data.total_rows} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, total_rows: e.target.value } })} required className="w-full bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                    </div>
                    <div className="w-1/2">
                      <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Total Columns</label>
                      <input type="number" value={editModal.data.total_columns} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, total_columns: e.target.value } })} required className="w-full bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">New Capacity: <span className="text-[#00ffcc] font-bold">{editModal.data.total_rows * editModal.data.total_columns} Seats</span></p>
                </>
              )}

              <div className="mt-6">
                <button type="submit" className="w-full py-3 bg-[#00ffcc] text-black font-bold uppercase text-sm hover:bg-[#00ccaa] transition-colors tracking-widest">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;