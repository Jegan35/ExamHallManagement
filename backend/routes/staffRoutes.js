const express = require('express');
const router = express.Router();

// Import all 6 functions perfectly
const { 
    getHalls, 
    getStudentsByClass, 
    createAllocation, 
    getAllocations, 
    getAllocationDetails, 
    deleteAllocations 
} = require('../controllers/staffController');

const { verifyToken } = require('../middleware/authMiddleware');

// Protect all routes
router.use(verifyToken);

// Routes
router.get('/halls', getHalls);
router.get('/students/:class_name', getStudentsByClass);
router.post('/allocate', createAllocation);
router.get('/allocations', getAllocations);
router.get('/allocations/:id', getAllocationDetails);
router.post('/allocations/delete', deleteAllocations);

module.exports = router;