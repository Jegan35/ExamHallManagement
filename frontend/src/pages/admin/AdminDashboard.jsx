import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

const AdminDashboard = () => {
  // --- STATES ---
  const [activeTab, setActiveTab] = useState('student');
  const [studentList, setStudentList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [hallList, setHallList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkFile, setBulkFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Accordion State
  const [expandedDept, setExpandedDept] = useState({});
  // Checkbox Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  // Single Add States (Student)
  const [rollNo, setRollNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [dept, setDept] = useState('IT');
  const [password, setPassword] = useState('');

  // Single Add States (Staff)
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // Single Add States (Hall)
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
    setSelectedIds([]); // Tab mathumbothu pazhaiya selections clear aaganum
    setSearchQuery('');
  };

  // --- FETCH DATA ---
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

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const toggleDept = (department) => {
    setExpandedDept(prev => ({ ...prev, [department]: !prev[department] }));
  };

  // --- CHECKBOX SELECTION LOGIC ---
  const handleSelectAll = (e, currentList) => {
    if (e.target.checked) {
      const ids = currentList.map(item => item.user_id || item.hall_no);
      setSelectedIds(prev => [...new Set([...prev, ...ids])]); // Prevent duplicates
    } else {
      const idsToRemove = currentList.map(item => item.user_id || item.hall_no);
      setSelectedIds(selectedIds.filter(id => !idsToRemove.includes(id)));
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    }
  };

  // --- ADD SINGLE DATA ---
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
    } catch (err) {
      showMessage(err.response?.data?.message || `Error adding ${activeTab}`, "error");
    }
  };

  // --- BULK UPLOAD ---
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
            if (type === 'student' && row.rollno) {
              finalData.push({ user_id: row.rollno, name: row.name, class_name: row.department, password: row.password });
            } else if (type === 'staff' && (row.staff_id || row.staffid)) {
              finalData.push({ user_id: row.staff_id || row.staffid, name: row.staff_name || row.staffname, password: row.password });
            }
          }
          if (finalData.length === 0) {
            setLoading(false); return showMessage("No valid data found.", "error");
          }

          const url = type === 'student' ? 'http://localhost:5000/api/admin/bulk-students' : 'http://localhost:5000/api/admin/bulk-staff';
          const res = await axios.post(url, { data: finalData }, authConfig);
          showMessage(res.data.message, 'success');
        } catch (err) {
          showMessage("Server error during upload.", 'error');
        } finally {
          setLoading(false); setBulkFile(null);
          document.getElementById(`csvInput-${type}`).value = "";
          fetchData(); 
        }
      }
    });
  };

  // --- BULK DELETE LOGIC ---
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return showMessage("Please select checkboxes to delete.", "error");
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} records?`)) return;

    const url = activeTab === 'student' ? 'http://localhost:5000/api/admin/delete-students' : 
                activeTab === 'staff' ? 'http://localhost:5000/api/admin/delete-staff' : 
                'http://localhost:5000/api/admin/delete-halls';
    try {
       await axios.post(url, { ids: selectedIds }, authConfig);
       showMessage(`Deleted ${selectedIds.length} records successfully.`, "success");
       setSelectedIds([]); // Clear selection after delete
       fetchData();
    } catch(err) {
       showMessage("Delete failed", "error");
    }
  };

  const getFilteredData = () => {
    const q = searchQuery.toLowerCase();
    if (activeTab === 'student') return studentList.filter(s => (s.user_id?.toLowerCase().includes(q)) || (s.name?.toLowerCase().includes(q)) || (s.class_name?.toLowerCase().includes(q)));
    if (activeTab === 'staff') return staffList.filter(s => (s.user_id?.toLowerCase().includes(q)) || (s.name?.toLowerCase().includes(q)));
    if (activeTab === 'hall') return hallList.filter(h => h.hall_no?.toString().toLowerCase().includes(q));
    return [];
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 p-6 font-mono">
      
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
            
            {/* STUDENT FORM */}
            {activeTab === 'student' && (
              <form onSubmit={handleSingleAdd} className="flex flex-col gap-4">
                <input type="text" placeholder="Roll No" value={rollNo} onChange={e => setRollNo(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <input type="text" placeholder="Student Name" value={studentName} onChange={e => setStudentName(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <select value={dept} onChange={e => setDept(e.target.value)} className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none">
                  <option value="IT" className="bg-black">IT</option><option value="CSE" className="bg-black">CSE</option>
                </select>
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <button type="submit" className="mt-2 bg-[#00ffcc] text-black font-bold p-3 uppercase hover:bg-[#00ccaa]">REGISTER</button>
              </form>
            )}

            {/* STAFF FORM */}
            {activeTab === 'staff' && (
              <form onSubmit={handleSingleAdd} className="flex flex-col gap-4">
                <input type="text" placeholder="Staff ID" value={staffId} onChange={e => setStaffId(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <input type="text" placeholder="Staff Name" value={staffName} onChange={e => setStaffName(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <input type="password" placeholder="Password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <button type="submit" className="mt-2 bg-[#00ffcc] text-black font-bold p-3 uppercase hover:bg-[#00ccaa]">ADD STAFF</button>
              </form>
            )}

            {/* HALL FORM */}
            {activeTab === 'hall' && (
              <form onSubmit={handleSingleAdd} className="flex flex-col gap-4">
                <input type="text" placeholder="Hall No (e.g. 101)" value={hallNo} onChange={e => setHallNo(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <input type="number" placeholder="Total Rows" value={totalRows} onChange={e => setTotalRows(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <input type="number" placeholder="Total Columns" value={totalColumns} onChange={e => setTotalColumns(e.target.value)} required className="bg-transparent border border-gray-700 p-3 text-white focus:border-[#00ffcc] outline-none" />
                <button type="submit" className="mt-2 bg-[#00ffcc] text-black font-bold p-3 uppercase hover:bg-[#00ccaa]">ADD HALL</button>
              </form>
            )}
          </div>

          {/* BULK UPLOAD (Only for Student & Staff) */}
          {(activeTab === 'student' || activeTab === 'staff') && (
             <div className="bg-[#121212] p-6 border border-gray-800">
                <h2 className="text-[#00ffcc] font-bold mb-4 tracking-widest">BULK IMPORT</h2>
                <form onSubmit={(e) => handleBulkUpload(e, activeTab)} className="flex flex-col gap-4">
                  <input type="file" id={`csvInput-${activeTab}`} accept=".csv" onChange={(e) => setBulkFile(e.target.files[0])} className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-[#1a1a1a] file:text-[#00ffcc] hover:file:bg-[#222]" />
                  <button type="submit" disabled={loading} className="mt-2 bg-[#1a1a1a] border border-gray-700 text-white font-bold p-3 uppercase hover:border-[#00ffcc]">{loading ? 'UPLOADING...' : 'UPLOAD CSV'}</button>
                </form>
             </div>
          )}
        </div>

        {/* RIGHT PANEL - LIST VIEW */}
        <div className="w-full lg:w-2/3 bg-[#121212] p-6 border border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white tracking-widest uppercase">{activeTab}S</h2>
              <span className="border border-[#00ffcc] text-[#00ffcc] px-2 py-1 text-xs font-bold">
                Selected: {selectedIds.length}
              </span>
              {/* DELETE SELECTED BUTTON */}
              {selectedIds.length > 0 && (
                <button onClick={handleBulkDelete} className="bg-red-500/20 text-red-500 border border-red-500 px-3 py-1 text-sm font-bold hover:bg-red-500 hover:text-black transition-colors">
                  DELETE SELECTED
                </button>
              )}
            </div>
            <div className="w-1/3">
               <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent border border-gray-700 p-2 text-white focus:border-[#00ffcc] outline-none" />
            </div>
          </div>

          {/* STUDENTS ACCORDION TAB WITH CHECKBOXES */}
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
                              <th className="px-4 py-3">
                                <input type="checkbox" onChange={(e) => handleSelectAll(e, grouped[deptKey])} className="accent-[#00ffcc]" />
                              </th>
                              <th className="px-4 py-3">Roll No</th>
                              <th className="px-4 py-3">Name</th>
                              <th className="px-4 py-3">Dept</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grouped[deptKey].map(student => (
                              <tr key={student.user_id} className="border-b border-gray-800/50 hover:bg-[#1a1a1a]">
                                <td className="px-4 py-3">
                                  <input type="checkbox" checked={selectedIds.includes(student.user_id)} onChange={(e) => handleSelectOne(e, student.user_id)} className="accent-[#00ffcc]" />
                                </td>
                                <td className="px-4 py-3 text-[#00ffcc] font-bold">{student.user_id}</td>
                                <td className="px-4 py-3">{student.name}</td>
                                <td className="px-4 py-3">{student.class_name}</td>
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

          {/* STAFF & HALL TABS WITH CHECKBOXES */}
          {(activeTab === 'staff' || activeTab === 'hall') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-300 text-sm">
                <thead className="text-xs uppercase text-gray-500 border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3">
                      <input type="checkbox" onChange={(e) => handleSelectAll(e, getFilteredData())} className="accent-[#00ffcc]" />
                    </th>
                    <th className="px-4 py-3">{activeTab === 'staff' ? 'Staff ID' : 'Hall No'}</th>
                    <th className="px-4 py-3">{activeTab === 'staff' ? 'Name' : 'Capacity'}</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredData().map(item => {
                    const id = activeTab === 'staff' ? item.user_id : item.hall_no;
                    return (
                      <tr key={id} className="border-b border-gray-800/50 hover:bg-[#1a1a1a]">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.includes(id)} onChange={(e) => handleSelectOne(e, id)} className="accent-[#00ffcc]" />
                        </td>
                        <td className="px-4 py-3 text-[#00ffcc] font-bold">{id}</td>
                        <td className="px-4 py-3">{activeTab === 'staff' ? item.name : `${item.total_rows * item.total_columns} Seats`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;