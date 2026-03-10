const db = require('../config/db');
const jwt = require('jsonwebtoken'); // Token-ai open panna ithu thevai

const getMyAllocations = async (req, res) => {
    try {
        // 1. Frontend anuppuna Token-ai eduthu open panrom (Bulletproof Token Decode)
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "No token provided!" });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Namma login-la use panna same secret key vechu open panrom
        const decoded = jwt.verify(token, 'examhall_super_secret_key_2026'); 
        const user_id = decoded.user_id; // Ex: 'ES22CS01'

        // 2. Student Profile Details edukkurom
        const [studentObj] = await db.query('SELECT student_id, user_id, name, class_name FROM students WHERE user_id = ?', [user_id]);
        
        if (studentObj.length === 0) {
            return res.status(404).json({ message: "Student profile not found" });
        }
        
        const student = studentObj[0];

        // 3. Student-kaha allocate aana Exam details edukkurom
        const query = `
            SELECT 
                DATE_FORMAT(a.exam_date, '%Y-%m-%d') as exam_date, 
                a.timing, 
                a.subject, 
                a.hall_no, 
                sa.row_num, 
                sa.col_num,
                h.total_columns
            FROM seating_arrangement sa
            JOIN allocations a ON sa.allocation_id = a.allocation_id
            JOIN halls h ON a.hall_no = h.hall_no
            WHERE sa.student_id = ?
            ORDER BY a.exam_date ASC
        `;
        const [allocations] = await db.query(query, [student.student_id]);

        // 4. Seat Number Calculate panrom: ((Row - 1) * Total_Columns) + Column
        const formattedAllocations = allocations.map(alloc => ({
            ...alloc,
            seat_no: ((alloc.row_num - 1) * alloc.total_columns) + alloc.col_num
        }));

        res.json({ profile: student, allocations: formattedAllocations });

    } catch (error) {
        console.error("Student Fetch Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getMyAllocations };