const express = require("express");
const router = express.Router();
require("dotenv").config();
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// GET /api/class/:classId/students
router.get('/api/class/:classId/students', async (req, res) => {
    const classId = req.params.classId;
    try {
        const query = `
            SELECT student_id, student_fname, student_lname
            FROM class_students
            WHERE class_id = ? AND status = 'accepted'
            ORDER BY student_fname, student_lname
        `;
        const [rows] = await db.execute(query, [classId]);
        
        const students = rows.map(s => ({
            id: s.student_id,
            name: `${s.student_fname} ${s.student_lname}`,
            answered: false
        }));

        res.json({ students });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

module.exports = router;