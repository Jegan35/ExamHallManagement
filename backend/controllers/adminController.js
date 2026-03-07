const db = require('../config/db');

// --- ADD DATA ---
const addStaff = async (req, res) => {
    const { user_id, password } = req.body;
    try {
        const query = 'INSERT INTO staff (user_id, password) VALUES (?, ?)';
        await db.query(query, [user_id, password]);
        res.status(201).json({ message: `Staff ${user_id} added successfully!` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: `Staff ${user_id} already exists.` });
        res.status(500).json({ message: 'Error adding staff', error: error.message });
    }
};

const addStudent = async (req, res) => {
    const { user_id, name, class_name, password } = req.body;
    try {
        const query = 'INSERT INTO students (user_id, name, class_name, password) VALUES (?, ?, ?, ?)';
        await db.query(query, [user_id, name, class_name, password]);
        res.status(201).json({ message: `Student ${name} added successfully!` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: `Student ${user_id} already exists.` });
        res.status(500).json({ message: 'Error adding student', error: error.message });
    }
};

const addHall = async (req, res) => {
    const { hall_no, total_rows, total_columns } = req.body;
    try {
        const query = 'INSERT INTO halls (hall_no, total_rows, total_columns) VALUES (?, ?, ?)';
        await db.query(query, [hall_no, total_rows, total_columns]);
        res.status(201).json({ message: `Hall ${hall_no} added successfully!` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: `Hall ${hall_no} already exists.` });
        res.status(500).json({ message: 'Error adding hall', error: error.message });
    }
};

// --- FETCH DATA ---
const getStaff = async (req, res) => {
    try {
        const [staff] = await db.query('SELECT user_id FROM staff ORDER BY user_id ASC');
        res.json(staff);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const getStudents = async (req, res) => {
    try {
        const [students] = await db.query('SELECT user_id, name, class_name FROM students ORDER BY class_name, user_id ASC');
        res.json(students);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const getHalls = async (req, res) => {
    try {
        const [halls] = await db.query('SELECT * FROM halls ORDER BY hall_no ASC');
        res.json(halls);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// --- DELETE DATA ---
const deleteStaff = async (req, res) => {
    const { ids } = req.body;
    try {
        await db.query('DELETE FROM staff WHERE user_id IN (?)', [ids]);
        res.json({ message: "Staff deleted successfully." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const deleteStudents = async (req, res) => {
    const { ids } = req.body;
    try {
        await db.query('DELETE FROM students WHERE user_id IN (?)', [ids]);
        res.json({ message: "Students deleted successfully." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const deleteHalls = async (req, res) => {
    const { ids } = req.body;
    try {
        await db.query('DELETE FROM halls WHERE hall_no IN (?)', [ids]);
        res.json({ message: "Halls deleted successfully." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = {
    addStaff, addStudent, addHall,
    getStaff, getStudents, getHalls,
    deleteStaff, deleteStudents, deleteHalls
};