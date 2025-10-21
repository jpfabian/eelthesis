// classgrade.js
const express = require("express");
const router = express.Router();

// ================= GET AVERAGE SCORES PER CLASS =================
router.get("/api/class/:classId/average-scores", async (req, res) => {
  const { classId } = req.params;
  const pool = req.pool;

  try {
    const [rows] = await pool.query(
      `
      SELECT 
          sc.student_id,
          sc.student_fname,
          sc.student_lname,
          ROUND(AVG(rq.score), 1) AS reading_avg,
          ROUND(AVG(pq.score), 1) AS pronunciation_avg,
          ROUND((AVG(rq.score) + AVG(pq.score)) / 2, 1) AS overall_avg
      FROM student_classes sc
      LEFT JOIN reading_results rq ON rq.student_id = sc.student_id
      LEFT JOIN pronunciation_results pq ON pq.student_id = sc.student_id
      WHERE sc.class_id = ?
      GROUP BY sc.student_id
      `,
      [classId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// ================= GET DETAILED CLASS RESULTS =================
router.get("/api/class/:classId/details", async (req, res) => {
  const { classId } = req.params;
  const pool = req.pool;

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        sc.student_id,
        s.student_fname,
        s.student_lname,
        r.quiz_id AS reading_quiz_id,
        rq.title AS reading_title,
        r.score AS reading_score,
        pr.quiz_id AS pron_quiz_id,
        pq.title AS pron_title,
        pr.score AS pron_score
      FROM student_classes sc
      JOIN students s ON s.student_id = sc.student_id
      LEFT JOIN reading_results r ON r.student_id = s.student_id
      LEFT JOIN reading_quizzes rq ON rq.quiz_id = r.quiz_id
      LEFT JOIN pronunciation_results pr ON pr.student_id = s.student_id
      LEFT JOIN pronunciation_quizzes pq ON pq.quiz_id = pr.quiz_id
      WHERE sc.class_id = ?
      ORDER BY s.student_lname
      `,
      [classId]
    );

    const grouped = {};
    rows.forEach((row) => {
      if (!grouped[row.student_id]) {
        grouped[row.student_id] = {
          student_fname: row.student_fname,
          student_lname: row.student_lname,
          quizzes: [],
          total: 0,
          reading_avg: 0,
          pronunciation_avg: 0,
        };
      }

      if (row.reading_quiz_id) {
        grouped[row.student_id].quizzes.push({
          quiz_name: row.reading_title,
          score: row.reading_score,
        });
        grouped[row.student_id].total += row.reading_score || 0;
        grouped[row.student_id].reading_avg += row.reading_score || 0;
      }

      if (row.pron_quiz_id) {
        grouped[row.student_id].quizzes.push({
          quiz_name: row.pron_title,
          score: row.pron_score,
        });
        grouped[row.student_id].total += row.pron_score || 0;
        grouped[row.student_id].pronunciation_avg += row.pron_score || 0;
      }
    });

    Object.values(grouped).forEach((s) => {
      const readingCount =
        s.quizzes.filter((q) => q.quiz_name?.includes("Reading")).length || 1;
      const pronCount =
        s.quizzes.filter((q) => q.quiz_name?.includes("Pronunciation")).length ||
        1;

      s.reading_avg = Math.round(s.reading_avg / readingCount);
      s.pronunciation_avg = Math.round(s.pronunciation_avg / pronCount);
      s.overall_avg = Math.round((s.reading_avg + s.pronunciation_avg) / 2);
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ================= GET STUDENT PERFORMANCE IN CLASS =================
router.get("/students-progress", async (req, res) => {
  const pool = req.pool;

  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id,
        s.name,
        s.grade_level,
        COALESCE(AVG(CASE WHEN q.type='reading' THEN q.score END),0) AS reading,
        COALESCE(AVG(CASE WHEN q.type='pronunciation' THEN q.score END),0) AS pronunciation,
        COALESCE(AVG(CASE WHEN q.type='spelling' THEN q.score END),0) AS spelling,
        COALESCE(AVG(CASE WHEN q.type='quiz' THEN q.score END),0) AS quiz,
        ROUND(AVG(q.score),1) AS overall,
        DATE_FORMAT(MAX(q.updated_at), '%b %e, %l:%i %p') AS last_active
      FROM students s
      LEFT JOIN quiz_results q ON s.id = q.student_id
      GROUP BY s.id
    `);

    const students = rows.map((r) => ({
      ...r,
      initials: r.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    }));

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;