const express = require('express');
const router = express.Router();
const { 
    addStaff, addStudent, addHall, 
    getStaff, getStudents, getHalls,
    deleteStaff, deleteStudents, deleteHalls 
} = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken, isAdmin);

// Add Routes
router.post('/add-staff', addStaff);
router.post('/add-student', addStudent);
router.post('/add-hall', addHall);

// View Routes
router.get('/staff', getStaff);
router.get('/students', getStudents);
router.get('/halls', getHalls);

// Delete Routes
router.post('/delete-staff', deleteStaff);
router.post('/delete-students', deleteStudents);
router.post('/delete-halls', deleteHalls);

module.exports = router;