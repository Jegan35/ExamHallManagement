const db = require('../config/db');


// --- ADD DATA (Single) ---
const addStaff = async (req, res) => {
    const { user_id, name, password } = req.body;
    try {
        // 1. FIRST master 'users' table-la account create panni password_hash-la text-ai anuppurom
        await db.query('INSERT INTO users (user_id, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)', [user_id, password, 'staff']);
        
        // 2. SECOND 'staff' table-la add panrom
        const query = 'INSERT INTO staff (user_id, name, password) VALUES (?, ?, ?)';
        await db.query(query, [user_id, name, password]);
        
        res.status(201).json({ message: `Staff ${name || user_id} added successfully!` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: `Staff ${user_id} already exists.` });
        res.status(500).json({ message: 'Error adding staff', error: error.message });
    }
};
const addStudent = async (req, res) => {
    const { user_id, name, class_name, password } = req.body;
    try {
        await db.query('INSERT INTO users (user_id, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)', [user_id, password, 'student']);
        
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
// --- FETCH DATA ---
const getStaff = async (req, res) => {
    try {
        // password-aiyum serthu select panrom
        const [staff] = await db.query('SELECT user_id, name, password FROM staff ORDER BY user_id ASC');
        res.json(staff);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const getStudents = async (req, res) => {
    try {
        // password-aiyum serthu select panrom
        const [students] = await db.query('SELECT user_id, name, class_name, password FROM students ORDER BY class_name, user_id ASC');
        res.json(students);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const getHalls = async (req, res) => {
    try {
        const [halls] = await db.query('SELECT * FROM halls ORDER BY hall_no ASC');
        res.json(halls);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// --- EDIT DATA ---
const updateStudent = async (req, res) => {
    const { id } = req.params;
    const { name, class_name, password } = req.body;
    try {
        if (password) {
            await db.query('UPDATE students SET name=?, class_name=?, password=? WHERE user_id=?', [name, class_name, password, id]);
            await db.query('UPDATE users SET password_hash=? WHERE user_id=?', [password, id]); 
        } else {
            await db.query('UPDATE students SET name=?, class_name=? WHERE user_id=?', [name, class_name, id]);
        }
        res.json({ message: "Student updated successfully!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const updateStaff = async (req, res) => {
    const { id } = req.params;
    const { name, password } = req.body;
    try {
        if (password) {
            await db.query('UPDATE staff SET name=?, password=? WHERE user_id=?', [name, password, id]);
            await db.query('UPDATE users SET password_hash=? WHERE user_id=?', [password, id]); 
        } else {
            await db.query('UPDATE staff SET name=? WHERE user_id=?', [name, id]);
        }
        res.json({ message: "Staff updated successfully!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const updateHall = async (req, res) => {
    const { id } = req.params;
    const { total_rows, total_columns } = req.body;
    try {
        await db.query('UPDATE halls SET total_rows=?, total_columns=? WHERE hall_no=?', [total_rows, total_columns, id]);
        res.json({ message: "Hall updated successfully!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- DELETE DATA ---
const deleteStaff = async (req, res) => {
    const { ids } = req.body;
    try {
        await db.query('DELETE FROM staff WHERE user_id IN (?)', [ids]);
        await db.query('DELETE FROM users WHERE user_id IN (?)', [ids]); 
        res.json({ message: "Staff deleted successfully." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const deleteStudents = async (req, res) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ message: "No records selected." });

    try {
        await db.query(`
            DELETE sa FROM seating_arrangement sa
            JOIN students s ON sa.student_id = s.student_id
            WHERE s.user_id IN (?)
        `, [ids]);
        await db.query('DELETE FROM students WHERE user_id IN (?)', [ids]);
        await db.query('DELETE FROM users WHERE user_id IN (?)', [ids]);

        res.json({ message: "Students and their allocations deleted successfully." });
    } catch (error) { 
        console.error("Delete Error:", error);
        res.status(500).json({ error: error.message }); 
    }
};

const deleteHalls = async (req, res) => {
    const { ids } = req.body;
    try {
        await db.query('DELETE FROM halls WHERE hall_no IN (?)', [ids]);
        res.json({ message: "Halls deleted successfully." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// --- BULK UPLOAD EXCEL (STUDENTS) ---
const bulkAddStudents = async (req, res) => {
    const { data } = req.body;
    if (!data || data.length === 0) return res.status(400).json({ message: "No data provided" });
    try {
        // Excel-la irukkura exact password-ai password_hash-ku anupurom
        const usersData = data.map(s => [s.user_id, s.password, 'student']);
        await db.query(`
            INSERT INTO users (user_id, password_hash, role) VALUES ? 
            ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)
        `, [usersData]);

        const studentsData = data.map(s => [s.user_id, s.name, s.class_name, s.password]);
        const query = `
            INSERT INTO students (user_id, name, class_name, password) 
            VALUES ? 
            ON DUPLICATE KEY UPDATE 
            name=VALUES(name), class_name=VALUES(class_name), password=VALUES(password)
        `;
        const [result] = await db.query(query, [studentsData]);
        
        res.status(201).json({ message: `Success! DB processed ${result.affectedRows} student records.` });
    } catch (error) {
        console.error("DB BULK ERROR:", error);
        res.status(500).json({ message: 'Database Error', error: error.message });
    }
};

// --- BULK UPLOAD EXCEL (STAFF) ---
// --- BULK ADD STAFF ---
const bulkAddStaff = async (req, res) => {
    const { data } = req.body;
    if (!data || data.length === 0) return res.status(400).json({ message: "No data provided" });
    try {
        // 1. FIRST master 'users' table update
        const usersData = data.map(s => [s.user_id, s.password, 'staff']);
        await db.query(`
            INSERT INTO users (user_id, password_hash, role) VALUES ? 
            ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)
        `, [usersData]);

        // 2. SECOND 'staff' table update
        const staffData = data.map(s => [s.user_id, s.name, s.password]);
        const query = `
            INSERT INTO staff (user_id, name, password) 
            VALUES ? 
            ON DUPLICATE KEY UPDATE 
            name=VALUES(name), password=VALUES(password)
        `;
        const [result] = await db.query(query, [staffData]);
        res.status(201).json({ message: `Success! DB processed ${result.affectedRows} staff records.` });
    } catch (error) {
        console.error("DB BULK ERROR:", error);
        res.status(500).json({ message: 'Database Error', error: error.message });
    }
};
module.exports = {
    addStaff, addStudent, addHall,
    getStaff, getStudents, getHalls,
    updateStudent, updateStaff, updateHall,
    deleteStaff, deleteStudents, deleteHalls,
    bulkAddStudents, bulkAddStaff
};