const express = require('express');
const cors = require('cors');
const db = require('./config/db'); 

const app = express();

app.use(cors());           
app.use(express.json());   

// Route Imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const staffRoutes = require('./routes/staffRoutes'); // <-- NEW

// Route Declarations
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);                  // <-- NEW

app.get('/api/status', (req, res) => {
    res.json({ message: 'Backend is running and ready!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});