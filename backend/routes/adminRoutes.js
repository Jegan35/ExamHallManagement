const express = require('express');
const router = express.Router();
const { 
    addStaff, addStudent, addHall, 
    getStaff, getStudents, getHalls,
    updateStudent, updateStaff, updateHall,
    deleteStaff, deleteStudents, deleteHalls,
    bulkAddStudents, bulkAddStaff // NEW: Bulk Insert Functions
} = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken, isAdmin);

// Single Add
router.post('/add-staff', addStaff);
router.post('/add-student', addStudent);
router.post('/add-hall', addHall);

// Bulk Add (The Magic Fix)
router.post('/bulk-students', bulkAddStudents);
router.post('/bulk-staff', bulkAddStaff);

// Fetch
router.get('/staff', getStaff);
router.get('/students', getStudents);
router.get('/halls', getHalls);

// Update
router.put('/update-student/:id', updateStudent);
router.put('/update-staff/:id', updateStaff);
router.put('/update-hall/:id', updateHall);



// Delete
router.post('/delete-staff', deleteStaff);
router.post('/delete-students', deleteStudents);
router.post('/delete-halls', deleteHalls);

module.exports = router;