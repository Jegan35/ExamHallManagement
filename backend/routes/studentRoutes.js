const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Namma auth middleware iruntha atha use pannanum. Illana direct ah idhai podunga
router.get('/my-allocations', studentController.getMyAllocations);

module.exports = router;