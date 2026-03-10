const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Oruvelai env use panna ithu thevai
const db = require('./config/db'); 

const app = express();

// 1. MIDDLEWARES
app.use(cors());
app.use(express.json());

// 2. IMPORT ROUTES (Ithu eppavum mela thaan irukkanum!)
const authRoutes = require('./routes/authRoutes'); // Unga login route file name edhuvo atha podunga
const adminRoutes = require('./routes/adminRoutes');
const staffRoutes = require('./routes/staffRoutes');
const studentRoutes = require('./routes/studentRoutes');

// 3. USE ROUTES (Import pannathukku apparam thaan use pannanum)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/student', studentRoutes);

// 4. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});