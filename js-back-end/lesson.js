const express = require("express");
const router = express.Router();

// GET curriculum with subjects → lessons → topics
router.get("/curriculum", async (req, res) => {
  try {
    const pool = req.pool; // use pool from middleware
    const subjectId = req.query.subject_id ? Number(req.query.subject_id) : null;

    const whereClause = Number.isFinite(subjectId) ? "WHERE s.subject_id = ?" : "";
    const params = Number.isFinite(subjectId) ? [subjectId] : [];

    const [rows] = await pool.query(`
      SELECT 
        s.subject_id, s.subject_name, 
        l.lesson_id, l.lesson_title,
        t.topic_id, t.topic_title, t.pdf_path
      FROM subjects s
      LEFT JOIN lessons l ON s.subject_id = l.subject_id
      LEFT JOIN topics t ON l.lesson_id = t.lesson_id
      ${whereClause}
      ORDER BY s.subject_id, l.lesson_id, t.topic_id
    `, params);

    const subjects = [];
    const subjectMap = {};

    rows.forEach(r => {
      if (!subjectMap[r.subject_id]) {
        subjectMap[r.subject_id] = { 
          subject_id: r.subject_id, 
          subject_name: r.subject_name, 
          lessons: [] 
        };
        subjects.push(subjectMap[r.subject_id]);
      }

      const subject = subjectMap[r.subject_id];
      let lesson = subject.lessons.find(l => l.lesson_id === r.lesson_id);

      if (!lesson && r.lesson_id) {
        lesson = { 
          lesson_id: r.lesson_id, 
          lesson_title: r.lesson_title, 
          topics: [] 
        };
        subject.lessons.push(lesson);
      }

      if (lesson && r.topic_id) {
        lesson.topics.push({
          topic_id: r.topic_id,
          topic_title: r.topic_title,
          pdf_path: r.pdf_path
        });
      }
    });

    res.json(subjects);
  } catch (err) {
    console.error("❌ Curriculum error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
