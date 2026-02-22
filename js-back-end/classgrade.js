const express = require("express");
const router = express.Router();

function avg(nums) {
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return sum / nums.length;
}

// ================= GET QUIZ COUNTS (public, no login) =================
// GET /api/quiz-counts — total reading and pronunciation quizzes for landing/for-students.
router.get("/api/quiz-counts", async (req, res) => {
  const pool = req.pool;
  try {
    const [[r]] = await pool.query("SELECT COUNT(*) AS c FROM reading_quizzes");
    const [[p]] = await pool.query("SELECT COUNT(*) AS c FROM pronunciation_quizzes");
    res.json({
      success: true,
      reading_total: Number(r?.c || 0),
      pronunciation_total: Number(p?.c || 0),
    });
  } catch (err) {
    console.error("quiz-counts error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ================= GET MY PROGRESS (student's own progress) =================
// GET /api/my-progress?student_id=:id&class_id=:classId (class_id optional)
// Returns the logged-in student's reading/pronunciation scores and completion stats.
router.get("/api/my-progress", async (req, res) => {
  const studentId = req.query.student_id ? Number(req.query.student_id) : null;
  const classId = req.query.class_id ? Number(req.query.class_id) : null;
  const pool = req.pool;

  if (!studentId || !Number.isFinite(studentId)) {
    return res.status(400).json({ success: false, error: "student_id required" });
  }

  try {
    let subjectId = null;
    if (classId) {
      const [[c]] = await pool.query("SELECT subject FROM classes WHERE id = ?", [classId]);
      if (c && c.subject) {
        const subjectMapping = {
          "Reading and Writing Skills": 1,
          "Oral Communication in Context": 2,
          "Creative Writing": 3,
          "Creative Non-Fiction": 4,
          "English for Academic and Professional Purposes": 5,
        };
        const normalized = String(c.subject).toLowerCase();
        subjectId =
          normalized.includes("oral") ? 2 :
          normalized.includes("reading") ? 1 :
          normalized.includes("creative writing") ? 3 :
          normalized.includes("creative non") ? 4 :
          normalized.includes("academic") ? 5 :
          subjectMapping[c.subject] || null;
        if (subjectId != null) subjectId = Number(subjectId);
      }
    }

    // Reading completed attempts (as percentage). When classId set, only attempts for that class.
    const [reading] = await pool.query(
      `
      SELECT a.attempt_id, a.quiz_id, q.title AS quiz_name, q.subject_id,
             ROUND((a.score / NULLIF(a.total_points, 0)) * 100, 1) AS score, a.end_time
      FROM reading_quiz_attempts a
      JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
      WHERE a.student_id = ? AND a.status = 'completed'
        AND (? IS NULL OR q.subject_id = ?)
        AND (? IS NULL OR a.class_id = ?)
      ORDER BY a.end_time DESC
      `,
      [studentId, subjectId, subjectId, classId, classId]
    );

    // Pronunciation completed attempts. When classId set, only attempts for that class.
    const [pronunciation] = await pool.query(
      `
      SELECT a.attempt_id, a.quiz_id, q.title AS quiz_name, q.subject_id,
             ROUND(a.score, 1) AS score, a.end_time
      FROM pronunciation_quiz_attempts a
      JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
      WHERE a.student_id = ? AND a.status = 'completed'
        AND (? IS NULL OR q.subject_id = ?)
        AND (? IS NULL OR a.class_id = ?)
      ORDER BY a.end_time DESC
      `,
      [studentId, subjectId, subjectId, classId, classId]
    );

    const readingList = (reading || []).map((r) => ({
      type: "reading",
      quiz_name: r.quiz_name,
      score: Number(r.score),
      end_time: r.end_time,
    }));
    const pronList = (pronunciation || []).map((p) => ({
      type: "pronunciation",
      quiz_name: p.quiz_name,
      score: Number(p.score),
      end_time: p.end_time,
    }));
    const quizzes = [...readingList, ...pronList].sort(
      (a, b) => new Date(b.end_time || 0) - new Date(a.end_time || 0)
    );

    const rScores = readingList.map((x) => x.score).filter(Number.isFinite);
    const pScores = pronList.map((x) => x.score).filter(Number.isFinite);
    const allScores = [...rScores, ...pScores];
    const reading_avg = avg(rScores) == null ? null : Math.round(avg(rScores) * 10) / 10;
    const pronunciation_avg = avg(pScores) == null ? null : Math.round(avg(pScores) * 10) / 10;
    const overall_avg = avg(allScores) == null ? null : Math.round(avg(allScores) * 10) / 10;

    // Total available quizzes (for completion rate) in this subject
    const [[rTotal]] = await pool.query(
      `SELECT COUNT(*) AS c FROM reading_quizzes WHERE (? IS NULL OR subject_id = ?)`,
      [subjectId, subjectId]
    );
    const [[pTotal]] = await pool.query(
      `SELECT COUNT(*) AS c FROM pronunciation_quizzes WHERE (? IS NULL OR subject_id = ?)`,
      [subjectId, subjectId]
    );
    const total_quizzes = Number(rTotal?.c || 0) + Number(pTotal?.c || 0);
    const completed_count = quizzes.length;
    const completion_rate =
      total_quizzes > 0 ? Math.round((completed_count / total_quizzes) * 1000) / 10 : 0;

    const reading_completed_count = readingList.length;
    const pronunciation_completed_count = pronList.length;
    const reading_total = Number(rTotal?.c || 0);
    const pronunciation_total = Number(pTotal?.c || 0);

    res.json({
      success: true,
      reading_avg,
      pronunciation_avg,
      overall_avg,
      quizzes,
      total_quizzes,
      completed_count,
      completion_rate,
      reading_completed_count,
      pronunciation_completed_count,
      reading_total,
      pronunciation_total,
    });
  } catch (error) {
    console.error("❌ My progress error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ================= GET AVERAGE SCORES PER CLASS =================
// Used by `student-progress.html`.
//
// Returns per-student:
// - quizzes: [{ quiz_name, score }]   // score is percentage (0-100)
// - reading_avg, pronunciation_avg, overall_avg
// - total (alias of overall_avg, kept for existing UI)
router.get("/api/class/:classId/average-scores", async (req, res) => {
  const { classId } = req.params;
  const pool = req.pool;

  try {
    // 1) Get accepted students for this class
    const [students] = await pool.query(
      `
      SELECT sc.student_id, u.fname AS student_fname, u.lname AS student_lname
      FROM student_classes sc
      JOIN users u ON u.user_id = sc.student_id
      WHERE sc.class_id = ? AND sc.status = 'accepted'
      ORDER BY u.lname, u.fname
      `,
      [classId]
    );

    if (!students.length) return res.json([]);

    const studentIds = students.map((s) => s.student_id);

    // 2) Reading quiz scores (convert points -> %) — only attempts for this class
    const [reading] = await pool.query(
      `
      SELECT a.student_id, q.title AS quiz_name,
             ROUND((a.score / NULLIF(a.total_points, 0)) * 100, 1) AS score
      FROM reading_quiz_attempts a
      JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
      WHERE a.status = 'completed' AND a.student_id IN (?) AND a.class_id = ?
      ORDER BY a.end_time DESC
      `,
      [studentIds, classId]
    );

    // 3) Pronunciation quiz scores (already stored as 0-100) — only attempts for this class
    const [pronunciation] = await pool.query(
      `
      SELECT a.student_id, q.title AS quiz_name,
             ROUND(a.score, 1) AS score
      FROM pronunciation_quiz_attempts a
      JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
      WHERE a.status = 'completed' AND a.student_id IN (?) AND a.class_id = ?
      ORDER BY a.end_time DESC
      `,
      [studentIds, classId]
    );

    // 4) Group into UI-friendly shape
    const readingByStudent = new Map();
    for (const r of reading) {
      if (!readingByStudent.has(r.student_id)) readingByStudent.set(r.student_id, []);
      if (r.quiz_name && r.score != null) readingByStudent.get(r.student_id).push(r);
    }

    const pronByStudent = new Map();
    for (const r of pronunciation) {
      if (!pronByStudent.has(r.student_id)) pronByStudent.set(r.student_id, []);
      if (r.quiz_name && r.score != null) pronByStudent.get(r.student_id).push(r);
    }

    const result = students.map((s) => {
      const rScores = (readingByStudent.get(s.student_id) || []).map((x) => Number(x.score)).filter(Number.isFinite);
      const pScores = (pronByStudent.get(s.student_id) || []).map((x) => Number(x.score)).filter(Number.isFinite);
      const allScores = [...rScores, ...pScores];

      const reading_avg = avg(rScores);
      const pronunciation_avg = avg(pScores);
      const overall_avg = avg(allScores);

      return {
        student_id: s.student_id,
        student_fname: s.student_fname,
        student_lname: s.student_lname,
        quizzes: [
          ...(readingByStudent.get(s.student_id) || []),
          ...(pronByStudent.get(s.student_id) || []),
        ],
        reading_avg: reading_avg == null ? null : Math.round(reading_avg * 10) / 10,
        pronunciation_avg: pronunciation_avg == null ? null : Math.round(pronunciation_avg * 10) / 10,
        overall_avg: overall_avg == null ? null : Math.round(overall_avg * 10) / 10,
        total: overall_avg == null ? 0 : Math.round(overall_avg * 10) / 10, // kept for existing UI table footer
      };
    });

    res.json(result);
  } catch (error) {
    console.error("❌ Average scores error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ================= GET COMPLETION RATE PER CLASS =================
// Completion Rate = (unique completed student-quiz pairs) / (students * total quizzes) * 100
// Filters by subject_id if provided.
router.get("/api/class/:classId/completion-rate", async (req, res) => {
  const classId = Number(req.params.classId);
  const subjectIdRaw = req.query.subject_id != null ? Number(req.query.subject_id) : null;
  const subjectId = Number.isFinite(subjectIdRaw) && subjectIdRaw > 0 ? subjectIdRaw : null;
  const pool = req.pool;

  try {
    // Accepted students for class
    const [students] = await pool.query(
      `
      SELECT sc.student_id
      FROM student_classes sc
      WHERE sc.class_id = ? AND sc.status = 'accepted'
      `,
      [classId]
    );
    const studentIds = students.map(s => s.student_id);
    const totalStudents = studentIds.length;

    if (!totalStudents) {
      return res.json({
        success: true,
        class_id: classId,
        subject_id: subjectId,
        total_students: 0,
        total_quizzes: 0,
        total_possible: 0,
        completed_pairs: 0,
        engaged_students: 0,
        completion_rate: 0,
      });
    }

    // Total quizzes available for this subject (reading + pronunciation)
    const [[rq]] = await pool.query(
      `SELECT COUNT(*) AS c FROM reading_quizzes WHERE (? IS NULL OR subject_id = ?)`,
      [subjectId, subjectId]
    );
    const [[pq]] = await pool.query(
      `SELECT COUNT(*) AS c FROM pronunciation_quizzes WHERE (? IS NULL OR subject_id = ?)`,
      [subjectId, subjectId]
    );
    const totalReading = Number(rq?.c || 0);
    const totalPron = Number(pq?.c || 0);
    const totalQuizzes = totalReading + totalPron;
    const totalPossible = totalQuizzes * totalStudents;

    // Unique completed pairs (student_id + quiz_id) per track, scoped to this class
    const [[readingDone]] = await pool.query(
      `
      SELECT COUNT(DISTINCT CONCAT(a.student_id,'-',a.quiz_id)) AS c
      FROM reading_quiz_attempts a
      JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
      WHERE a.status = 'completed'
        AND a.student_id IN (?)
        AND (? IS NULL OR q.subject_id = ?)
        AND a.class_id = ?
      `,
      [studentIds, subjectId, subjectId, classId]
    );
    const [[pronDone]] = await pool.query(
      `
      SELECT COUNT(DISTINCT CONCAT(a.student_id,'-',a.quiz_id)) AS c
      FROM pronunciation_quiz_attempts a
      JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
      WHERE a.status = 'completed'
        AND a.student_id IN (?)
        AND (? IS NULL OR q.subject_id = ?)
        AND a.class_id = ?
      `,
      [studentIds, subjectId, subjectId, classId]
    );
    const completedPairs = Number(readingDone?.c || 0) + Number(pronDone?.c || 0);

    const [[engaged]] = await pool.query(
      `
      SELECT COUNT(DISTINCT x.student_id) AS c
      FROM (
        SELECT a.student_id
        FROM reading_quiz_attempts a
        JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
        WHERE a.status = 'completed' AND a.student_id IN (?) AND (? IS NULL OR q.subject_id = ?) AND a.class_id = ?
        UNION ALL
        SELECT a.student_id
        FROM pronunciation_quiz_attempts a
        JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
        WHERE a.status = 'completed' AND a.student_id IN (?) AND (? IS NULL OR q.subject_id = ?) AND a.class_id = ?
      ) x
      `,
      [studentIds, subjectId, subjectId, classId, studentIds, subjectId, subjectId, classId]
    );
    const engagedStudents = Number(engaged?.c || 0);

    const completionRate = totalPossible > 0 ? Math.round((completedPairs / totalPossible) * 1000) / 10 : 0;

    res.json({
      success: true,
      class_id: classId,
      subject_id: subjectId,
      total_students: totalStudents,
      total_quizzes: totalQuizzes,
      reading_quizzes: totalReading,
      pronunciation_quizzes: totalPron,
      total_possible: totalPossible,
      completed_pairs: completedPairs,
      engaged_students: engagedStudents,
      completion_rate: completionRate,
    });
  } catch (error) {
    console.error("❌ Completion rate error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

module.exports = router;