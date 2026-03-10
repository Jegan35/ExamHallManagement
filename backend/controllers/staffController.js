const db = require('../config/db');

// 1. Get Available Halls
const getHalls = async (req, res) => {
    try {
        const [halls] = await db.query('SELECT * FROM halls ORDER BY hall_no ASC');
        res.json(halls);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Get Available Students for Capacity (Real-time Filtering - FIXED DATE MATCH)
const getStudents = async (req, res) => {
    const { date, time } = req.query;
    try {
        let query = 'SELECT student_id, user_id, name, class_name FROM students';
        let params = [];

        if (date && time) {
            query += ` WHERE student_id NOT IN (
                SELECT sa.student_id 
                FROM seating_arrangement sa
                JOIN allocations a ON sa.allocation_id = a.allocation_id
                WHERE DATE_FORMAT(a.exam_date, '%Y-%m-%d') = ? AND a.timing = ?
            )`;
            params.push(date, time);
        }
        
        query += ' ORDER BY class_name, user_id ASC';

        const [students] = await db.query(query, params);
        res.json(students);
    } catch (error) { 
        console.error("Student Fetch Error:", error);
        res.status(500).json({ error: error.message }); 
    }
};

// 3. MULTI-HALL ZIG-ZAG ALGORITHM (THE PERFECT EQUAL CHECKERBOARD)
const createAllocation = async (req, res) => {
    const { exam_date, timing, subject, seating_style, classes, halls } = req.body;

    if (!classes || classes.length === 0 || !halls || halls.length === 0) {
        return res.status(400).json({ message: "Please select at least one class and one hall." });
    }

    try {
        const [students] = await db.query("SELECT * FROM students WHERE class_name IN (?) ORDER BY user_id ASC", [classes]);
        if (students.length === 0) return res.status(400).json({ message: "No registered students found for selected classes." });

        const [hallData] = await db.query("SELECT * FROM halls WHERE hall_no IN (?) ORDER BY hall_no ASC", [halls]);
        if (hallData.length === 0) return res.status(404).json({ message: "Selected halls not found." });

        const [existing] = await db.query(
            "SELECT allocation_id FROM allocations WHERE hall_no IN (?) AND exam_date = ? AND timing = ?",
            [halls, exam_date, timing]
        );
        if (existing.length > 0) {
            const oldIds = existing.map(e => e.allocation_id);
            await db.query("DELETE FROM seating_arrangement WHERE allocation_id IN (?)", [oldIds]);
            await db.query("DELETE FROM allocations WHERE allocation_id IN (?)", [oldIds]);
        }

        let classA = [], classB = [];
        if (seating_style === 'Zig-Zag' && classes.length >= 2) {
            classA = students.filter(s => s.class_name === classes[0]);
            classB = students.filter(s => s.class_name === classes[1]);
        } else {
            classA = [...students]; 
        }

        let aIndex = 0, bIndex = 0;
        let totalAssigned = 0;
        
        // State variable to track the last assigned class type
        let lastAssigned = 'B'; 

        for (let h of hallData) {
            const [allocResult] = await db.query(
                "INSERT INTO allocations (hall_no, exam_date, timing, subject) VALUES (?, ?, ?, ?)",
                [h.hall_no, exam_date, timing, subject]
            );
            const allocationId = allocResult.insertId;
            const seatingArrangement = [];

            for (let r = 1; r <= h.total_rows; r++) {
                for (let c = 1; c <= h.total_columns; c++) {
                    let studentId = null;

                    if (seating_style === 'Normal' || classes.length < 2) {
                        // Normal fill: First finish Class A, then Class B
                        if (aIndex < classA.length) {
                            studentId = classA[aIndex].student_id;
                            aIndex++;
                        } else if (bIndex < classB.length) {
                            studentId = classB[bIndex].student_id;
                            bIndex++;
                        }
                    } else {
                        // PERFECT ZIG-ZAG (1:1 Ratio Alternator)
                        let turn = null;

                        // Rendu class-layum students iruntha, alternate pannanum
                        if (aIndex < classA.length && bIndex < classB.length) {
                            turn = (lastAssigned === 'B') ? 'A' : 'B';
                        } 
                        // Oruvelai oru class gaali aagiduchu na, irukkura class-ai full aakka use pannanum
                        else if (aIndex < classA.length) {
                            turn = 'A';
                        } 
                        else if (bIndex < classB.length) {
                            turn = 'B';
                        }

                        if (turn === 'A') {
                            studentId = classA[aIndex].student_id;
                            aIndex++;
                            lastAssigned = 'A';
                        } else if (turn === 'B') {
                            studentId = classB[bIndex].student_id;
                            bIndex++;
                            lastAssigned = 'B';
                        }
                    }

                    if (studentId) {
                        seatingArrangement.push([allocationId, studentId, r, c]);
                        totalAssigned++;
                    }
                }
            }

            if (seatingArrangement.length > 0) {
                await db.query(
                    "INSERT INTO seating_arrangement (allocation_id, student_id, row_num, col_num) VALUES ?",
                    [seatingArrangement]
                );
            }
        }

        res.status(201).json({ message: `${seating_style} Allocation Generated Successfully for ${totalAssigned} students!` });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ message: 'Error creating allocation', error: error.message });
    }
};

// 4. Get All Allocations for History
const getAllocations = async (req, res) => {
    try {
        const [allocations] = await db.query(`
            SELECT allocation_id, hall_no, DATE_FORMAT(exam_date, '%Y-%m-%d') as exam_date, timing, subject 
            FROM allocations 
            ORDER BY exam_date DESC
        `);
        res.json(allocations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Get Specific Details for PDF/View
const getAllocationDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT sa.row_num, sa.col_num, s.user_id as roll_no, s.name, s.class_name
            FROM seating_arrangement sa
            JOIN students s ON sa.student_id = s.student_id
            WHERE sa.allocation_id = ?
            ORDER BY sa.row_num, sa.col_num
        `;
        const [seats] = await db.query(query, [id]);
        res.json(seats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. Delete Selected Allocations
const deleteAllocations = async (req, res) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ message: "No records selected." });

    try {
        await db.query("DELETE FROM seating_arrangement WHERE allocation_id IN (?)", [ids]);
        await db.query("DELETE FROM allocations WHERE allocation_id IN (?)", [ids]);
        res.json({ message: "Selected allocations deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error deleting records", error: error.message });
    }
};

module.exports = {
    getHalls,
    getStudents,
    createAllocation,
    getAllocations,
    getAllocationDetails,
    deleteAllocations
};