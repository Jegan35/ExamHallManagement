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

// 2. Get Students by Class
const getStudentsByClass = async (req, res) => {
    const { class_name } = req.params;
    try {
        const [students] = await db.query('SELECT * FROM students WHERE class_name = ?', [class_name]);
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Create or Replace Allocation (Normal & Zig-Zag)
const createAllocation = async (req, res) => {
    const { hall_no, exam_date, timing, subject, seating_style, class_a, class_b } = req.body;

    if (seating_style === 'Zig-Zag' && class_a === class_b) {
        return res.status(400).json({ message: "Class A and Class B must be different for a Zig-Zag arrangement." });
    }

    try {
        // Auto-replace existing allocation for the same hall, date, and timing
        const [existing] = await db.query(
            "SELECT allocation_id FROM allocations WHERE hall_no = ? AND exam_date = ? AND timing = ?",
            [hall_no, exam_date, timing]
        );

        if (existing.length > 0) {
            const oldId = existing[0].allocation_id;
            await db.query("DELETE FROM seating_arrangement WHERE allocation_id = ?", [oldId]);
            await db.query("DELETE FROM allocations WHERE allocation_id = ?", [oldId]);
        }

        const [hallData] = await db.query("SELECT total_rows, total_columns FROM halls WHERE hall_no = ?", [hall_no]);
        if (hallData.length === 0) return res.status(404).json({ message: "Hall not found." });
        const { total_rows, total_columns } = hallData[0];

        const [studentsA] = await db.query("SELECT student_id FROM students WHERE class_name = ?", [class_a]);
        let studentsB = [];
        
        if (seating_style === 'Zig-Zag') {
            const [bResult] = await db.query("SELECT student_id FROM students WHERE class_name = ?", [class_b]);
            studentsB = bResult;
        }

        if (studentsA.length === 0 && (seating_style === 'Normal' || studentsB.length === 0)) {
            return res.status(400).json({ message: "Selected class has no registered students." });
        }

        const [allocResult] = await db.query(
            "INSERT INTO allocations (hall_no, exam_date, timing, subject) VALUES (?, ?, ?, ?)",
            [hall_no, exam_date, timing, subject]
        );
        const allocationId = allocResult.insertId;

        let aIndex = 0, bIndex = 0;
        const seatingArrangement = [];

        for (let r = 1; r <= total_rows; r++) {
            for (let c = 1; c <= total_columns; c++) {
                let studentId = null;

                if (seating_style === 'Normal') {
                    if (aIndex < studentsA.length) {
                        studentId = studentsA[aIndex].student_id;
                        aIndex++;
                    }
                } else {
                    // Zig-Zag: Odd Columns Class A, Even Columns Class B
                    if (c % 2 !== 0) { 
                        if (aIndex < studentsA.length) {
                            studentId = studentsA[aIndex].student_id;
                            aIndex++;
                        }
                    } else { 
                        if (bIndex < studentsB.length) {
                            studentId = studentsB[bIndex].student_id;
                            bIndex++;
                        }
                    }
                }

                if (studentId) {
                    seatingArrangement.push([allocationId, studentId, r, c]);
                }
            }
        }

        if (seatingArrangement.length > 0) {
            await db.query(
                "INSERT INTO seating_arrangement (allocation_id, student_id, row_num, col_num) VALUES ?",
                [seatingArrangement]
            );
        }

        res.status(201).json({ message: `${seating_style} Allocation Generated Successfully!` });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ message: 'Error creating allocation', error: error.message });
    }
};

// 4. Get All Allocations for History
const getAllocations = async (req, res) => {
    try {
        const [allocations] = await db.query("SELECT * FROM allocations ORDER BY exam_date DESC");
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

// EXPORT ALL FUNCTIONS (This fixes the crash!)
module.exports = {
    getHalls,
    getStudentsByClass,
    createAllocation,
    getAllocations,
    getAllocationDetails,
    deleteAllocations
};