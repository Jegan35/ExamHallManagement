const express = require('express');
const router = express.Router();

// IDHU THAAN MISSING! (Controller-ai correct-ah import panrom)
const staffController = require('../controllers/staffController');

// --- STAFF ROUTES ---


// 1. Get Halls & Students (For Capacity Check & Dropdowns)
router.get('/halls', staffController.getHalls);
router.get('/students', staffController.getStudents);

// 2. Allocation Matrix Generation (The Zig-Zag Engine)
router.post('/allocate', staffController.createAllocation);

// 3. History & PDF Export
router.get('/allocations', staffController.getAllocations);
router.get('/allocations/:id', staffController.getAllocationDetails);

// 4. Delete Allocations
router.post('/allocations/delete', staffController.deleteAllocations);

module.exports = router;
