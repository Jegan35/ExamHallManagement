import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trash2, X, FileText, Eye, Search } from 'lucide-react';


const StaffDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [activeTab, setActiveTab] = useState('allocate');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  
  const [halls, setHalls] = useState([]);
  const [students, setStudents] = useState([]); 
  const [history, setHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]); 
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedHalls, setSelectedHalls] = useState([]);
  const [classSearch, setClassSearch] = useState('');
  const [hallSearch, setHallSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewData, setViewData] = useState([]);
  const [viewDetails, setViewDetails] = useState({ allocationId: '', hallNo: '', date: '', timing: '', subject: '' });
  
  const [allocationForm, setAllocationForm] = useState({
    exam_date: '', timing: 'F.N: 9.30 AM to 12.30 PM', subject: '', seating_style: 'Zig-Zag'
  });

  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  const fetchInitialData = async () => {
    try {
      const timestamp = new Date().getTime();
      const hallRes = await axios.get(`http://localhost:5000/api/staff/halls?t=${timestamp}`, authConfig);
      setHalls(hallRes.data);
      const histRes = await axios.get(`http://localhost:5000/api/staff/allocations?t=${timestamp}`, authConfig);
      setHistory(histRes.data);
    } catch (err) { console.error(err); }
  };

  const fetchStudents = async () => {
    try {
      let url = `http://localhost:5000/api/staff/students?t=${new Date().getTime()}`;
      if (allocationForm.exam_date && allocationForm.timing) {
        url += `&date=${allocationForm.exam_date}&time=${allocationForm.timing}`;
      }
      const res = await axios.get(url, authConfig);
      setStudents(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchInitialData();
    fetchStudents(); 
    setSelectedIds([]); 
    setIsDeleteMode(false);
  }, [activeTab]);

  useEffect(() => {
    setSelectedHalls([]);
    setSelectedClasses([]);
    fetchStudents();
  }, [allocationForm.exam_date, allocationForm.timing]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const classStats = students.reduce((acc, student) => {
    const dept = student.class_name || 'Unknown';
    if (!acc[dept]) acc[dept] = 0;
    acc[dept] += 1;
    return acc;
  }, {});

  const toggleClass = (deptName) => {
    if (selectedClasses.includes(deptName)) setSelectedClasses(selectedClasses.filter(c => c !== deptName));
    else setSelectedClasses([...selectedClasses, deptName]);
  };

  const toggleHall = (hallNo) => {
    if (selectedHalls.includes(hallNo)) setSelectedHalls(selectedHalls.filter(h => h !== hallNo));
    else setSelectedHalls([...selectedHalls, hallNo]);
  };

  const bookedHalls = history
    .filter(h => h.exam_date === allocationForm.exam_date && h.timing === allocationForm.timing)
    .map(h => h.hall_no);
  const availableHalls = halls.filter(h => !bookedHalls.includes(h.hall_no));

  const filteredClasses = Object.keys(classStats).filter(dept => dept.toLowerCase().includes(classSearch.toLowerCase()));
  const filteredHalls = availableHalls.filter(h => h.hall_no.toString().includes(hallSearch));

  const totalSelectedStudents = selectedClasses.reduce((sum, dept) => sum + classStats[dept], 0);
  const totalSelectedCapacity = selectedHalls.reduce((sum, hallNo) => {
    const hall = halls.find(h => h.hall_no === hallNo);
    return sum + (hall ? hall.total_rows * hall.total_columns : 0);
  }, 0);

  const isCapacityEnough = totalSelectedCapacity >= totalSelectedStudents;

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    if (selectedClasses.length === 0) return setMessage({ text: "Please select at least one Class.", type: "error" });
    if (selectedHalls.length === 0) return setMessage({ text: "Please select at least one Exam Hall.", type: "error" });
    if (!isCapacityEnough) return setMessage({ text: "Capacity insufficient! Please add more halls.", type: "error" });

    setLoading(true); setMessage({ text: '', type: '' });

    try {
      const payload = { ...allocationForm, classes: selectedClasses, halls: selectedHalls };
      const res = await axios.post('http://localhost:5000/api/staff/allocate', payload, authConfig);
      setMessage({ text: res.data.message, type: 'success' });
      
      setSelectedClasses([]); setSelectedHalls([]);
      setAllocationForm({ ...allocationForm, subject: '' }); 
      fetchInitialData(); 
      fetchStudents(); 
    } catch (err) {
      setMessage({ text: err.response?.data?.message || err.response?.data?.error || 'Error creating allocation', type: 'error' });
    } finally { setLoading(false); }
  };

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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} allocation(s)?`)) return;

    try {
      await axios.post('http://localhost:5000/api/staff/allocations/delete', { ids: selectedIds }, authConfig);
      setMessage({ text: `Successfully deleted.`, type: 'success' });
      setSelectedIds([]); setIsDeleteMode(false);
      fetchInitialData(); fetchStudents(); 
    } catch (err) { alert("Error deleting allocations."); }
  };

  const handleViewMatrix = async (allocationId, hallNo, examDate, timing, subject) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/staff/allocations/${allocationId}`, authConfig);
      setViewData(res.data);
      setViewDetails({ allocationId, hallNo, date: examDate, timing, subject });
      setIsModalOpen(true);
    } catch (error) { alert("Error fetching matrix data."); }
  };

  // --- PERFECT PDF GENERATOR WITH CAPACITY & SEAT NUMBERS ---
  const generatePDF = async (allocationId, hallNo, examDate, timing, subject) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/staff/allocations/${allocationId}`, authConfig);
      const seatingData = res.data;
      if (!seatingData || seatingData.length === 0) { alert("Warning: No students found."); return; }

      // Calculation for PDF header
      const hallObj = halls.find(h => h.hall_no === hallNo);
      const hallCapacity = hallObj ? (hallObj.total_rows * hallObj.total_columns) : 0;
      const filledSeats = seatingData.length;

      const doc = new jsPDF();
      doc.setFontSize(18); doc.text(`Exam Hall Allocation - Hall ${hallNo}`, 14, 22);
      
      doc.setFontSize(10); 
      doc.text(`Date: ${examDate} | Session: ${timing} | Subject: ${subject}`, 14, 30);
      
      // ADDED: Occupancy Text
      doc.setFontSize(11);
      doc.text(`Occupancy: ${filledSeats} / ${hallCapacity} Seats Filled`, 14, 38);

      // ADDED: Seat Number mapped directly from index
      const tableData = seatingData.map((seat, index) => [ 
        `Seat ${index + 1}`, 
        `R${seat.row_num} - C${seat.col_num}`, 
        seat.roll_no, 
        seat.name, 
        seat.class_name 
      ]);

      autoTable(doc, {
        startY: 44, 
        head: [['Seat No', 'Coordinate', 'Student Roll No', 'Student Name', 'Department']], 
        body: tableData, 
        theme: 'grid',
        headStyles: { fillColor: [0, 255, 204], textColor: [10, 10, 10], fontStyle: 'bold' }, 
        styles: { fontSize: 10, cellPadding: 4 },
      });

      doc.save(`Hall_${hallNo}_${examDate}.pdf`);
    } catch (error) { alert("Error generating PDF."); }
  };

  return (
    <div className="min-h-screen bg-base text-gray-200 relative font-mono">
      <nav className="bg-panel border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-black uppercase tracking-widest text-white">Exam<span className="text-accent">Management</span></h1>
        <button onClick={handleLogout} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-alert border border-alert rounded-sm hover:bg-alert hover:text-black transition-all">Logout</button>
      </nav>

      <div className="max-w-7xl mx-auto mt-10 p-6">
        
        {message.text && (
          <div className={`mb-6 p-4 text-sm font-mono border rounded-sm ${message.type === 'success' ? 'bg-teal-900/20 text-accent border-accent' : 'bg-red-900/20 text-alert border-alert'}`}>
            [ SYSTEM ] : {message.text}
          </div>
        )}

        <div className="flex space-x-4 mb-8 border-b border-gray-800 pb-2">
          <button onClick={() => setActiveTab('allocate')} className={`px-4 py-2 font-mono text-sm uppercase tracking-widest transition-all ${activeTab === 'allocate' ? 'text-accent border-b-2 border-accent' : 'text-gray-500 hover:text-gray-300'}`}>Create Allocation</button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 font-mono text-sm uppercase tracking-widest transition-all ${activeTab === 'history' ? 'text-accent border-b-2 border-accent' : 'text-gray-500 hover:text-gray-300'}`}>View History & Export</button>
        </div>

        {activeTab === 'allocate' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <div className="lg:col-span-3 bg-panel p-6 rounded-sm border border-gray-800 shadow-xl h-fit">
              <h2 className="text-accent font-bold tracking-widest uppercase border-b border-gray-800 pb-2 mb-4">Exam Details</h2>
              <form id="allocationForm" onSubmit={handleCreateAllocation} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Exam Date</label>
                  <input type="date" required value={allocationForm.exam_date} onChange={(e) => setAllocationForm({...allocationForm, exam_date: e.target.value})} className="w-full px-4 py-3 bg-base border border-gray-700 rounded-sm focus:border-accent font-mono text-gray-400 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Timing</label>
                  <select value={allocationForm.timing} onChange={(e) => setAllocationForm({...allocationForm, timing: e.target.value})} className="w-full px-4 py-3 bg-base border border-gray-700 rounded-sm focus:border-accent font-mono text-gray-200">
                    <option value="F.N (9:30 - 12:30)">F.N (9:30 - 12:30)</option>
                    <option value="A.N (1:30 - 4:30)">A.N (1:30 - 4:30)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Subject</label>
                  <input type="text" required value={allocationForm.subject} onChange={(e) => setAllocationForm({...allocationForm, subject: e.target.value})} className="w-full px-4 py-3 bg-base border border-gray-700 rounded-sm focus:border-accent font-mono" placeholder="e.g. Data Structures" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Seating Style</label>
                  <select value={allocationForm.seating_style} onChange={(e) => setAllocationForm({...allocationForm, seating_style: e.target.value})} className="w-full px-4 py-3 bg-base border border-gray-700 rounded-sm focus:border-accent font-mono text-gray-200">
                    <option value="Normal">Normal</option>
                    <option value="Zig-Zag">Zig-Zag</option>
                  </select>
                </div>
              </form>
            </div>

            <div className="lg:col-span-6 bg-panel p-6 rounded-sm border border-gray-800 shadow-xl space-y-6">
              <div>
                <h2 className="text-accent font-bold tracking-widest uppercase border-b border-gray-800 pb-2 mb-4">Select Classes</h2>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                  <input type="text" placeholder="Search Class..." value={classSearch} onChange={e => setClassSearch(e.target.value)} className="w-full bg-base border border-gray-700 py-2 pl-10 pr-4 text-white focus:border-accent outline-none text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredClasses.map(dept => (
                    <label key={dept} className={`flex items-center justify-between p-3 border rounded-sm cursor-pointer transition-colors ${selectedClasses.includes(dept) ? 'border-accent bg-teal-900/20' : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-500'}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={selectedClasses.includes(dept)} onChange={() => toggleClass(dept)} className="accent-accent w-4 h-4 cursor-pointer" />
                        <span className={`font-bold ${selectedClasses.includes(dept) ? 'text-accent' : 'text-gray-300'}`}>{dept}</span>
                      </div>
                      <span className="bg-gray-800 px-2 py-1 rounded-sm text-gray-300 text-[10px] font-bold tracking-wider">{classStats[dept]} Students</span>
                    </label>
                  ))}
                  {filteredClasses.length === 0 && <p className="text-gray-500 text-xs italic col-span-2">No available students found for this slot.</p>}
                </div>
              </div>
              
              <div>
                <h2 className="text-accent font-bold tracking-widest uppercase border-b border-gray-800 pb-2 mb-4">Available Halls</h2>
                {allocationForm.exam_date ? (
                  <>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                      <input type="text" placeholder="Search Hall..." value={hallSearch} onChange={e => setHallSearch(e.target.value)} className="w-full bg-base border border-gray-700 py-2 pl-10 pr-4 text-white focus:border-accent outline-none text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                       {filteredHalls.map(hall => {
                          const capacity = hall.total_rows * hall.total_columns;
                          return (
                            <label key={hall.hall_no} className={`flex items-center justify-between p-3 border rounded-sm cursor-pointer transition-colors ${selectedHalls.includes(hall.hall_no) ? 'border-accent bg-teal-900/20' : 'border-gray-700 bg-[#1a1a1a] hover:border-gray-500'}`}>
                              <div className="flex items-center gap-3">
                                <input type="checkbox" checked={selectedHalls.includes(hall.hall_no)} onChange={() => toggleHall(hall.hall_no)} className="accent-accent w-4 h-4 cursor-pointer" />
                                <span className={`font-bold ${selectedHalls.includes(hall.hall_no) ? 'text-accent' : 'text-gray-300'}`}>Hall {hall.hall_no}</span>
                              </div>
                              <span className="bg-gray-800 px-2 py-1 rounded-sm text-gray-300 text-[10px] font-bold tracking-wider">{capacity} Seats</span>
                            </label>
                          );
                       })}
                       {filteredHalls.length === 0 && <p className="text-red-500 text-xs font-bold col-span-2 border border-red-900 bg-red-900/10 p-2 text-center">All halls booked for this time slot!</p>}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-xs italic border border-gray-800 bg-base p-4 text-center">Please select an Exam Date to load available halls.</p>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 bg-panel p-6 rounded-sm border border-gray-800 shadow-xl flex flex-col h-fit">
              <h2 className="text-white font-bold tracking-widest uppercase border-b border-gray-800 pb-2 mb-4">Allocation Status</h2>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <span className="text-gray-400 text-sm">Total Students</span><span className="text-lg font-bold text-white">{totalSelectedStudents}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <span className="text-gray-400 text-sm">Selected Capacity</span><span className="text-lg font-bold text-white">{totalSelectedCapacity}</span>
                </div>
              </div>

              <div className={`p-4 mb-auto border rounded-sm font-bold text-xs leading-relaxed ${totalSelectedStudents === 0 ? 'border-gray-700 text-gray-500 bg-transparent' : isCapacityEnough ? 'border-accent text-accent bg-teal-900/20' : 'border-alert text-alert bg-red-900/20'}`}>
                {totalSelectedStudents === 0 ? 'Waiting for selection...' : isCapacityEnough ? '✓ Capacity is sufficient. Ready to generate.' : '⚠ ERROR: Add more halls! Capacity is lower than student count.'}
              </div>

              <button type="submit" form="allocationForm" disabled={loading || !isCapacityEnough || totalSelectedStudents === 0 || !allocationForm.exam_date || !allocationForm.subject} className={`w-full py-4 mt-6 font-bold uppercase tracking-widest rounded-sm transition-all ${loading || !isCapacityEnough || totalSelectedStudents === 0 || !allocationForm.exam_date || !allocationForm.subject ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-accent text-black hover:bg-teal-400'}`}>
                {loading ? 'Processing...' : 'Generate Seating'}
              </button>
            </div>
          </div>
        ) : (
          
          <div className="bg-panel p-6 rounded-sm border border-gray-800 shadow-xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">Allocation History</h2>
              <div className="flex items-center space-x-3">
                {isDeleteMode ? (
                  <>
                    <button onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className="px-4 py-2 bg-alert text-black font-bold text-xs uppercase tracking-widest rounded-sm hover:bg-red-500 transition-all disabled:opacity-50">Confirm Delete ({selectedIds.length})</button>
                    <button onClick={() => {setIsDeleteMode(false); setSelectedIds([]);}} className="p-2 text-gray-400 hover:text-white transition-all"><X size={20}/></button>
                  </>
                ) : (
                  <button onClick={() => setIsDeleteMode(true)} className="p-2 text-gray-400 hover:text-alert transition-all" title="Delete Records"><Trash2 size={20} /></button>
                )}
              </div>
            </div>
            
            {history.length === 0 ? (
              <p className="text-gray-500 font-mono text-sm">No allocations found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                      {isDeleteMode && <th className="py-3 px-4 w-10"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === history.length} className="cursor-pointer" /></th>}
                      <th className="py-3 px-4 font-bold">Hall No</th>
                      <th className="py-3 px-4 font-bold">Date & Session</th>
                      <th className="py-3 px-4 font-bold">Subject</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-sm">
                    {history.map((alloc) => (
                      <tr key={alloc.allocation_id} className={`border-b border-gray-800 hover:bg-base transition-colors ${selectedIds.includes(alloc.allocation_id) ? 'bg-base' : ''}`}>
                        {isDeleteMode && <td className="py-3 px-4"><input type="checkbox" checked={selectedIds.includes(alloc.allocation_id)} onChange={(e) => handleSelectOne(e, alloc.allocation_id)} className="cursor-pointer" /></td>}
                        <td className="py-3 px-4 text-accent font-bold">Hall {alloc.hall_no}</td>
                        <td className="py-3 px-4">
                          <span className="block text-white">{alloc.exam_date}</span>
                          <span className="block text-xs text-gray-500 mt-1">{alloc.timing || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{alloc.subject}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <button onClick={() => handleViewMatrix(alloc.allocation_id, alloc.hall_no, alloc.exam_date, alloc.timing, alloc.subject)} className="px-3 py-2 text-accent border border-accent/30 rounded-sm hover:bg-accent hover:text-black transition-all flex items-center gap-2" title="View Matrix"><Eye size={16} /><span className="text-[10px] font-bold uppercase tracking-wider">View</span></button>
                            <button onClick={() => generatePDF(alloc.allocation_id, alloc.hall_no, alloc.exam_date, alloc.timing, alloc.subject)} className="px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-sm hover:bg-gray-700 transition-all flex items-center gap-2" title="Download PDF"><FileText size={16} /><span className="text-[10px] font-bold uppercase tracking-wider">PDF</span></button>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-panel border border-accent rounded-sm w-full max-w-4xl max-h-[85vh] flex flex-col shadow-[0_0_40px_rgba(0,255,204,0.15)]">
            <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-base">
              <div>
                <h3 className="text-lg font-black text-accent uppercase tracking-widest">Hall {viewDetails.hallNo} Arrangement</h3>
                <p className="text-xs font-mono text-gray-400 mt-1">Date: {viewDetails.date} | Session: {viewDetails.timing} | Sub: {viewDetails.subject}</p>
                {/* MODAL LA CAPACITY TEXT ADD PANNIYACHU */}
                <p className="text-xs font-bold text-accent mt-2 tracking-widest">
                  Occupancy: {viewData.length} / {halls.find(h => h.hall_no === viewDetails.hallNo)?.total_rows * halls.find(h => h.hall_no === viewDetails.hallNo)?.total_columns} Seats Filled
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-alert transition-colors text-2xl font-bold px-2"><X size={28} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow">
              {viewData.length === 0 ? <p className="text-center text-gray-500 font-mono py-10">No seating data found.</p> : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                      {/* TABLE LAA SEAT NO ADD PANNIYACHU */}
                      <th className="py-3 px-3 font-bold w-16">Seat No</th>
                      <th className="py-3 px-3 font-bold">Coordinate</th>
                      <th className="py-3 px-3 font-bold">Roll No</th>
                      <th className="py-3 px-3 font-bold">Name</th>
                      <th className="py-3 px-3 font-bold">Department</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-sm">
                    {viewData.map((seat, index) => (
                      <tr key={index} className="border-b border-gray-800 hover:bg-base transition-colors">
                        {/* SEAT NO VALUE ITHU THAAN */}
                        <td className="py-3 px-3 text-white font-bold text-center bg-gray-900/50">{index + 1}</td>
                        <td className="py-3 px-3 text-accent font-bold">R{seat.row_num} - C{seat.col_num}</td>
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
              <button onClick={() => generatePDF(viewDetails.allocationId, viewDetails.hallNo, viewDetails.date, viewDetails.timing, viewDetails.subject)} className="px-6 py-3 bg-gray-800 text-white font-black text-xs uppercase tracking-widest rounded-sm hover:bg-gray-700 transition-all">Generate PDF</button>
              <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 bg-alert text-black font-black text-xs uppercase tracking-widest rounded-sm hover:bg-red-500 transition-all">Close Viewer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
