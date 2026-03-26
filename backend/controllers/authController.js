const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// A secret key for generating tokens (In production, put this in a .env file)
const JWT_SECRET = 'examhall_super_secret_key_2026';

// 1. One-Time Setup: Create the first Admin user
exports.setupAdmin = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE role = 'admin'");
        if (rows.length > 0) {
            return res.status(400).json({ message: 'Admin already exists.' });
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.query(
            "INSERT INTO users (user_id, password_hash, role) VALUES (?, ?, ?)", 
            ['admin01', hashedPassword, 'admin']
        );

        res.status(201).json({ message: 'Default admin created! User ID: admin01 | Password: admin123' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Login Logic for all roles (Admin, Staff, Student)
exports.login = async (req, res) => {
    const { user_id, password } = req.body;

    try {
        const [users] = await db.query("SELECT * FROM users WHERE user_id = ?", [user_id]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        let isMatch = false;

        // MAGIC FIX: Role-ai vechu password eppadi check panrathu nu pirikirom
        if (user.role === 'admin') {
            // Admin-ku mattum encrypted password check pandrom
            isMatch = await bcrypt.compare(password, user.password_hash);
        } else {
            // Staff matrum Student-ku plain text password check pandrom
            isMatch = (password === user.password_hash);
        }
        
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate a token valid for 8 hours
        const token = jwt.sign(
            { id: user.id, role: user.role, user_id: user.user_id }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );

        res.json({ 
            message: 'Login successful', 
            token, 
            role: user.role, 
            user_id: user.user_id 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

};