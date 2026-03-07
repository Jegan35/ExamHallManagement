import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trash2, X, FileText, Eye } from 'lucide-react';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [activeTab, setActiveTab] = useState('allocate');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [halls, setHalls] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]); 
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  
  // Modal View States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewData, setViewData] = useState([]);
  const [viewDetails, setViewDetails] = useState({ allocationId: '', hallNo: '', rawDate: '', date: '', timing: '', subject: '' });
  
  // Form State
  const [allocationForm, setAllocationForm] = useState({
    hall_no: '', exam_date: '', timing: 'F.N: 9.30 AM to 12.30 PM', subject: '', seating_style: 'Normal', class_a: 'CSE', class_b: 'IT'
  });

  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch Halls and History
  const fetchData = async () => {
    try {
      const hallRes = await axios.get('http://localhost:5000/api/staff/halls', authConfig);
      setHalls(hallRes.data);
      if (hallRes.data.length > 0 && !allocationForm.hall_no) {
        setAllocationForm(prev => ({ ...prev, hall_no: hallRes.data[0].hall_no }));
      }
      const histRes = await axios.get('http://localhost:5000/api/staff/allocations', authConfig);
      setHistory(histRes.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    fetchData();
    setSelectedIds([]); 
    setIsDeleteMode(false);
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Create Allocation Form Submit
  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await axios.post('http://localhost:5000/api/staff/allocate', allocationForm, authConfig);
      setMessage({ text: res.data.message, type: 'success' });
      setActiveTab('history');
      fetchData(); // Refresh history immediately
    } catch (err) {
      setMessage({ text: err.response?.data?.message || err.response?.data?.error || 'Error creating allocation', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Bulk Delete Actions
  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(history.map(h => h.allocation_id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(item => item !== id));
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} allocation(s)? This cannot be undone.`)) return;

    try {
      await axios.post('http://localhost:5000/api/staff/allocations/delete', { ids: selectedIds }, authConfig);
      setMessage({ text: `Successfully deleted ${selectedIds.length} allocations.`, type: 'success' });
      setSelectedIds([]);
      setIsDeleteMode(false);
      fetchData(); 
    } catch (err) {
      alert("Error deleting allocations.");
    }
  };

  // View Matrix
  const handleViewMatrix = async (allocationId, hallNo, examDate, timing, subject) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/staff/allocations/${allocationId}`, authConfig);
      setViewData(res.data);
      setViewDetails({ allocationId, hallNo, rawDate: examDate, date: new Date(examDate).toLocaleDateString(), timing, subject });
      setIsModalOpen(true);
    } catch (error) {
      alert("Error fetching matrix data for view.");
    }
  };

  // Generate PDF
  const generatePDF = async (allocationId, hallNo, examDate, timing, subject) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/staff/allocations/${allocationId}`, authConfig);
      const seatingData = res.data;

      if (!seatingData || seatingData.length === 0) {
        alert("Warning: No students found in this allocation.");
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Exam Hall Allocation - Hall ${hallNo}`, 14, 22);
      doc.setFontSize(10);
      const formattedDate = new Date(examDate).toLocaleDateString();
      doc.text(`Date: ${formattedDate} | Session: ${timing} | Subject: ${subject}`, 14, 32);

      const tableData = seatingData.map(seat => [
        `R${seat.row_num} - C${seat.col_num}`, 
        seat.roll_no,
        seat.name,
        seat.class_name
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Seat Coordinate', 'Student Roll No', 'Student Name', 'Department']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 255, 204], textColor: [10, 10, 10], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
      });

      doc.save(`Hall_${hallNo}_${formattedDate}.pdf`);

    } catch (error) {
      alert("Error generating PDF document.");
    }
  };

  return (
    <div className="min-h-screen bg-base text-gray-200 relative">
      <nav className="bg-panel border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-black uppercase tracking-widest text-white">
          Exam<span className="text-accent">Management</span>
        </h1>
        <button onClick={handleLogout} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-alert border border-alert rounded-sm hover:bg-alert hover:text-black transition-all">
          Logout
        </button>
      </nav>

      <div className="max-w-5xl mx-auto mt-10 p-6">
        
        {message.text && (
          <div className={`mb-6 p-4 text-sm font-mono border rounded-sm ${message.type === 'success' ? 'bg-teal-900/20 text-accent border-accent' : 'bg-red-900/20 text-alert border-alert'}`}>
            [ SYSTEM ] : {message.text}
          </div>
        )}

        <div className="flex space-x-4 mb-8 border-b border-gray-800 pb-2">
          <button onClick={() => setActiveTab('allocate')} className={`px-4 py-2 font-mono text-sm uppercase tracking-widest transition-all ${activeTab === 'allocate' ? 'text-accent border-b-2 border-accent' : 'text-gray-500 hover:text-gray-300'}`}>
            Create Allocation
          </button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 font-mono text-sm uppercase tracking-widest transition-all ${activeTab === 'history' ? 'text-accent border-b-2 border-accent' : 'text-gray-500 hover:text-gray-300'}`}>
            View History & Export
          </button>
        </div>

        {activeTab === 'allocate' ? (
          <div className="bg-panel p-6 rounded-sm border border-gray-800 shadow-xl">
            <form onSubmit={handleCreateAllocation} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left side details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Hall</label>
                    <select value={allocationForm.hall_no} onChange={(e) => setAllocationForm({...allocationForm, hall_no: e.target.value})} className="w-full px-4 py-3 bg-base border border-gray-700 rounded-sm focus:border-accent font-mono text-gray-200" required>
                      {halls.length === 0 && <option value="">No Halls Available</option>}
                      {halls.map(hall => <option key={hall.hall_no} value={hall.hall_no}>Hall {hall.hall_no} (Capacity: {hall.capacity || hall.total_rows * hall.total_columns})</option>)}
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Exam Date</label>
                      <input type="date" required value={allocationForm.exam_date} onChange={(e) => setAllocationForm({...allocationForm, exam_date: e.target.value})} className="w-full px-4 py-3 bg-base border border-gray-700 rounded-sm focus:border-accent font-mono text-gray-400 [color-scheme:dark]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Timing</label>
                      <select value={allocationForm.timing} onChange={(e) => setAllocationForm({...allocationForm, timing: e.target.value})} className="w-full px-4 py-3 bg-base border border-gray-700 rounded-sm focus:border-accent font-mono text-gray-200">
                        <option value="F.N: 9.30 AM to 12.30 PM">F.N (9:30 - 12:30)</option>
                        <option value="A.N: 1.30 PM to 4.30 PM">A.N (1:30 - 4:30)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Subject</label>
                    <input type="text" required value={allocationForm.subject} onChange={(e) => setAllocationForm({...allocationForm, subject: e.target.value})} className="w-full px-4 py-3 bg-base border border-gray-700 rounded-sm focus:border-accent font-mono" placeholder="e.g. Data Structures" />
                  </div>
                </div>

                {/* Right side config */}
                <div className="space-y-4 bg-base p-5 border border-gray-800 rounded-sm">
                  <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
                    <h3 className="text-xs font-bold text-accent uppercase tracking-widest">Arrangement Configuration</h3>
                    <select 
                      value={allocationForm.seating_style} 
                      onChange={(e) => setAllocationForm({...allocationForm, seating_style: e.target.value})} 
                      className="px-3 py-1 bg-panel border border-gray-600 rounded-sm text-xs font-bold text-white outline-none cursor-pointer hover:border-accent"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Zig-Zag">Zig-Zag</option>
                    </select>
                  </div>

                  {allocationForm.seating_style === 'Normal' ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Class</label>
                      <select value={allocationForm.class_a} onChange={(e) => setAllocationForm({...allocationForm, class_a: e.target.value})} className="w-full px-4 py-3 bg-panel border border-gray-700 rounded-sm focus:border-accent font-mono text-gray-200">
                        <option value="CSE">CSE</option><option value="IT">IT</option><option value="ECE">ECE</option><option value="EEE">EEE</option><option value="MECH">MECH</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Class A (Odd Columns: 1, 3...)</label>
                        <select value={allocationForm.class_a} onChange={(e) => setAllocationForm({...allocationForm, class_a: e.target.value})} className="w-full px-4 py-3 bg-panel border border-gray-700 rounded-sm focus:border-accent font-mono text-gray-200">
                          <option value="CSE">CSE</option><option value="IT">IT</option><option value="ECE">ECE</option><option value="EEE">EEE</option><option value="MECH">MECH</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Class B (Even Columns: 2, 4...)</label>
                        <select value={allocationForm.class_b} onChange={(e) => setAllocationForm({...allocationForm, class_b: e.target.value})} className="w-full px-4 py-3 bg-panel border border-gray-700 rounded-sm focus:border-accent font-mono text-gray-200">
                          <option value="CSE">CSE</option><option value="IT">IT</option><option value="ECE">ECE</option><option value="EEE">EEE</option><option value="MECH">MECH</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button type="submit" disabled={loading || halls.length === 0} className={`w-full py-4 mt-6 text-sm font-bold uppercase tracking-widest text-black bg-accent rounded-sm hover:bg-teal-400 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {loading ? 'Processing Matrix...' : `Generate ${allocationForm.seating_style} Matrix`}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-panel p-6 rounded-sm border border-gray-800 shadow-xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">Allocation History</h2>
              
              <div className="flex items-center space-x-3">
                {isDeleteMode ? (
                  <>
                    <button 
                      onClick={handleDeleteSelected}
                      disabled={selectedIds.length === 0}
                      className="px-4 py-2 bg-alert text-black font-bold text-xs uppercase tracking-widest rounded-sm hover:bg-red-500 transition-all disabled:opacity-50"
                    >
                      Confirm Delete ({selectedIds.length})
                    </button>
                    <button onClick={() => {setIsDeleteMode(false); setSelectedIds([]);}} className="p-2 text-gray-400 hover:text-white transition-all">
                      <X size={20}/>
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsDeleteMode(true)} className="p-2 text-gray-400 hover:text-alert transition-all" title="Delete Records">
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
            
            {history.length === 0 ? (
              <p className="text-gray-500 font-mono text-sm">No allocations found in the database.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                      {isDeleteMode && (
                        <th className="py-3 px-4 w-10">
                          <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === history.length} className="cursor-pointer" />
                        </th>
                      )}
                      <th className="py-3 px-4 font-bold">Hall No</th>
                      <th className="py-3 px-4 font-bold">Date & Session</th>
                      <th className="py-3 px-4 font-bold">Subject</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-sm">
                    {history.map((alloc) => (
                      <tr key={alloc.allocation_id} className={`border-b border-gray-800 hover:bg-base transition-colors ${selectedIds.includes(alloc.allocation_id) ? 'bg-base' : ''}`}>
                        {isDeleteMode && (
                          <td className="py-3 px-4">
                            <input type="checkbox" checked={selectedIds.includes(alloc.allocation_id)} onChange={(e) => handleSelectOne(e, alloc.allocation_id)} className="cursor-pointer" />
                          </td>
                        )}
                        <td className="py-3 px-4 text-accent font-bold">Hall {alloc.hall_no}</td>
                        <td className="py-3 px-4">
                          <span className="block text-white">{new Date(alloc.exam_date).toLocaleDateString()}</span>
                          <span className="block text-xs text-gray-500 mt-1">{alloc.timing || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{alloc.subject}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <button 
                              onClick={() => handleViewMatrix(alloc.allocation_id, alloc.hall_no, alloc.exam_date, alloc.timing, alloc.subject)}
                              className="px-3 py-2 text-accent border border-accent/30 rounded-sm hover:bg-accent hover:text-black transition-all flex items-center gap-2"
                              title="View Matrix"
                            >
                              <Eye size={16} />
                              <span className="text-[10px] font-bold uppercase tracking-wider">View</span>
                            </button>
                            <button 
                              onClick={() => generatePDF(alloc.allocation_id, alloc.hall_no, alloc.exam_date, alloc.timing, alloc.subject)}
                              className="px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-sm hover:bg-gray-700 transition-all flex items-center gap-2"
                              title="Download PDF"
                            >
                              <FileText size={16} />
                              <span className="text-[10px] font-bold uppercase tracking-wider">PDF</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* The Modal Overlay for Viewing Data */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-panel border border-accent rounded-sm w-full max-w-4xl max-h-[85vh] flex flex-col shadow-[0_0_40px_rgba(0,255,204,0.15)]">
            
            <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-base">
              <div>
                <h3 className="text-lg font-black text-accent uppercase tracking-widest">Hall {viewDetails.hallNo} Arrangement</h3>
                <p className="text-xs font-mono text-gray-400 mt-1">Date: {viewDetails.date} | Session: {viewDetails.timing} | Sub: {viewDetails.subject}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-alert transition-colors text-2xl font-bold px-2">
                <X size={28} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow">
              {viewData.length === 0 ? (
                <p className="text-center text-gray-500 font-mono py-10">No seating data found.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-3 font-bold">Seat Coordinate</th>
                      <th className="py-3 px-3 font-bold">Roll No</th>
                      <th className="py-3 px-3 font-bold">Name</th>
                      <th className="py-3 px-3 font-bold">Department</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-sm">
                    {viewData.map((seat, index) => (
                      <tr key={index} className="border-b border-gray-800 hover:bg-base transition-colors">
                        <td className="py-3 px-3 text-accent font-bold">
                          R{seat.row_num} - C{seat.col_num}
                        </td>
                        <td className="py-3 px-3 text-white">{seat.roll_no}</td>
                        <td className="py-3 px-3 text-gray-300">{seat.name}</td>
                        <td className="py-3 px-3 text-gray-500">{seat.class_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-5 border-t border-gray-800 flex justify-end bg-base space-x-3">
              <button 
                onClick={() => generatePDF(viewDetails.allocationId, viewDetails.hallNo, viewDetails.rawDate, viewDetails.timing, viewDetails.subject)}
                className="px-6 py-3 bg-gray-800 text-white font-black text-xs uppercase tracking-widest rounded-sm hover:bg-gray-700 transition-all"
              >
                Generate PDF
              </button>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-8 py-3 bg-alert text-black font-black text-xs uppercase tracking-widest rounded-sm hover:bg-red-500 transition-all"
              >
                Close Viewer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default StaffDashboard;