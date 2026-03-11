const express = require("express");
const router = express.Router();

function toNameCase(input) {
  if (input == null || typeof input !== "string") return input;
  return String(input)
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

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
    // Include built-in quizzes (subject_id IS NULL)
    let reading = [];
    let pronunciation = [];
    try {
      [reading] = await pool.query(
        `SELECT a.attempt_id, a.quiz_id, q.title AS quiz_name, q.subject_id, q.quiz_number,
         ROUND((a.score / NULLIF(a.total_points, 0)) * 100, 1) AS score,
         ROUND(a.score, 2) AS raw_score, ROUND(a.total_points, 2) AS total_points,
         a.end_time
         FROM reading_quiz_attempts a JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
         WHERE a.student_id = ? AND a.status = 'completed'
         AND (? IS NULL OR q.subject_id = ? OR q.subject_id IS NULL)
         AND (? IS NULL OR a.class_id = ? OR a.class_id IS NULL)
         ORDER BY a.end_time DESC`,
        [studentId, subjectId, subjectId, classId, classId]
      );
    } catch (e) {
      if (String(e?.code || "") === "ER_BAD_FIELD_ERROR" || String(e?.message || "").includes("class_id")) {
        [reading] = await pool.query(
          `SELECT a.attempt_id, a.quiz_id, q.title AS quiz_name, q.subject_id, q.quiz_number,
           ROUND((a.score / NULLIF(a.total_points, 0)) * 100, 1) AS score,
           ROUND(a.score, 2) AS raw_score, ROUND(a.total_points, 2) AS total_points,
           a.end_time
           FROM reading_quiz_attempts a JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
           WHERE a.student_id = ? AND a.status = 'completed'
           AND (? IS NULL OR q.subject_id = ? OR q.subject_id IS NULL)
           ORDER BY a.end_time DESC`,
          [studentId, subjectId, subjectId]
        );
      } else throw e;
    }

    // Pronunciation completed attempts (built-in + teacher-created). When classId set, only attempts for that class.
    try {
      [pronunciation] = await pool.query(
        `SELECT a.attempt_id, a.quiz_id,
         COALESCE(q.title, tq.title) AS quiz_name,
         COALESCE(q.subject_id, tq.subject_id) AS subject_id,
         COALESCE(q.quiz_number, tq.quiz_id) AS quiz_number,
         ROUND(COALESCE(a.score, a.pronunciation_score, 0), 1) AS score,
         ROUND(COALESCE(a.score, a.pronunciation_score, 0), 2) AS raw_score,
         ROUND(COALESCE(a.total_points, 100), 2) AS total_points,
         a.end_time
         FROM pronunciation_quiz_attempts a
         LEFT JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
         LEFT JOIN teacher_pronunciation_quizzes tq ON tq.quiz_id = a.quiz_id
         WHERE a.student_id = ? AND a.status IN ('completed', 'submitted')
         AND (q.quiz_id IS NOT NULL OR tq.quiz_id IS NOT NULL)
         AND (? IS NULL OR COALESCE(q.subject_id, tq.subject_id) = ? OR COALESCE(q.subject_id, tq.subject_id) IS NULL)
         AND (? IS NULL OR a.class_id = ? OR a.class_id IS NULL)
         ORDER BY a.end_time DESC`,
        [studentId, subjectId, subjectId, classId, classId]
      );
    } catch (e) {
      if (String(e?.code || "") === "ER_BAD_FIELD_ERROR" || String(e?.message || "").includes("class_id")) {
        [pronunciation] = await pool.query(
          `SELECT a.attempt_id, a.quiz_id,
           COALESCE(q.title, tq.title) AS quiz_name,
           COALESCE(q.subject_id, tq.subject_id) AS subject_id,
           COALESCE(q.quiz_number, tq.quiz_id) AS quiz_number,
           ROUND(COALESCE(a.score, a.pronunciation_score, 0), 1) AS score,
           ROUND(COALESCE(a.score, a.pronunciation_score, 0), 2) AS raw_score,
           ROUND(COALESCE(a.total_points, 100), 2) AS total_points,
           a.end_time
           FROM pronunciation_quiz_attempts a
           LEFT JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
           LEFT JOIN teacher_pronunciation_quizzes tq ON tq.quiz_id = a.quiz_id
           WHERE a.student_id = ? AND a.status IN ('completed', 'submitted')
           AND (q.quiz_id IS NOT NULL OR tq.quiz_id IS NOT NULL)
           AND (? IS NULL OR COALESCE(q.subject_id, tq.subject_id) = ?)
           ORDER BY a.end_time DESC`,
          [studentId, subjectId, subjectId]
        );
      } else throw e;
    }

    // AI-generated (teacher-created reading) quiz attempts
    let aiReading = [];
    try {
      [aiReading] = await pool.query(
        `SELECT a.attempt_id, a.quiz_id, q.title AS quiz_name, q.subject_id,
         ROUND((a.score / NULLIF(a.total_points, 0)) * 100, 1) AS score,
         ROUND(a.score, 2) AS raw_score, ROUND(a.total_points, 2) AS total_points,
         a.end_time
         FROM teacher_reading_quiz_attempts a
         JOIN teacher_reading_quizzes q ON q.quiz_id = a.quiz_id
         WHERE a.student_id = ? AND a.status = 'completed'
         AND (? IS NULL OR q.subject_id = ?)
         AND (? IS NULL OR a.class_id <=> ?)
         ORDER BY a.end_time DESC`,
        [studentId, subjectId, subjectId, classId, classId]
      );
    } catch (e) {
      if (String(e?.code || "") === "ER_BAD_FIELD_ERROR" || String(e?.message || "").includes("class_id")) {
        try {
          [aiReading] = await pool.query(
            `SELECT a.attempt_id, a.quiz_id, q.title AS quiz_name, q.subject_id,
             ROUND((a.score / NULLIF(a.total_points, 0)) * 100, 1) AS score,
             ROUND(a.score, 2) AS raw_score, ROUND(a.total_points, 2) AS total_points,
             a.end_time
             FROM teacher_reading_quiz_attempts a
             JOIN teacher_reading_quizzes q ON q.quiz_id = a.quiz_id
             WHERE a.student_id = ? AND a.status = 'completed'
             AND (? IS NULL OR q.subject_id = ?)
             ORDER BY a.end_time DESC`,
            [studentId, subjectId, subjectId]
          );
        } catch (_) {
          aiReading = [];
        }
      } else if (String(e?.code || "") !== "ER_NO_SUCH_TABLE") {
        console.warn("AI reading quiz attempts lookup:", e?.message);
      }
    }

    // Answer counts for display as correct/total (e.g. 3/9) instead of percentage
    const readingAttemptIds = (reading || []).map((r) => Number(r.attempt_id)).filter((v) => Number.isFinite(v) && v > 0);
    const readingAnswerCountByAttempt = new Map();
    if (readingAttemptIds.length > 0) {
      try {
        const [answerCounts] = await pool.query(
          `SELECT ra.attempt_id, SUM(CASE WHEN ra.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count, COUNT(*) AS total_count
           FROM reading_quiz_answers ra WHERE ra.attempt_id IN (?) GROUP BY ra.attempt_id`,
          [readingAttemptIds]
        );
        for (const row of answerCounts || []) {
          readingAnswerCountByAttempt.set(Number(row.attempt_id), {
            correct: Number(row.correct_count || 0),
            total: Number(row.total_count || 0),
          });
        }
      } catch (e) {
        if (String(e?.code || "") !== "ER_NO_SUCH_TABLE") console.warn("Reading answer counts:", e?.message);
      }
    }

    const aiAttemptIds = (aiReading || []).map((a) => Number(a.attempt_id)).filter((v) => Number.isFinite(v) && v > 0);
    const aiAnswerCountByAttempt = new Map();
    if (aiAttemptIds.length > 0) {
      try {
        const [answerCounts] = await pool.query(
          `SELECT ra.attempt_id, SUM(CASE WHEN ra.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count, COUNT(*) AS total_count
           FROM teacher_reading_quiz_answers ra WHERE ra.attempt_id IN (?) GROUP BY ra.attempt_id`,
          [aiAttemptIds]
        );
        for (const row of answerCounts || []) {
          aiAnswerCountByAttempt.set(Number(row.attempt_id), {
            correct: Number(row.correct_count || 0),
            total: Number(row.total_count || 0),
          });
        }
      } catch (e) {
        if (String(e?.code || "") !== "ER_NO_SUCH_TABLE") console.warn("AI answer counts:", e?.message);
      }
    }

    const readingList = (reading || []).map((r) => {
      const counts = readingAnswerCountByAttempt.get(Number(r.attempt_id));
      return {
        type: "reading",
        quiz_name: r.quiz_name,
        quiz_order: Number(r.quiz_number),
        score: Number(r.score),
        raw_score: Number(r.raw_score),
        total_points: Number(r.total_points),
        display_score: counts && counts.total > 0 ? counts.correct : Number(r.raw_score),
        display_total: counts && counts.total > 0 ? counts.total : Number(r.total_points),
        end_time: r.end_time,
      };
    });
    const pronList = (pronunciation || []).map((p) => {
      return {
        type: "pronunciation",
        quiz_name: p.quiz_name,
        quiz_order: Number(p.quiz_number),
        score: Number(p.score),
        raw_score: Number(p.raw_score),
        total_points: Number(p.total_points),
        display_score: Number(p.raw_score),
        display_total: Number(p.total_points) || 100,
        end_time: p.end_time,
      };
    });
    const aiList = (aiReading || []).map((a) => {
      const counts = aiAnswerCountByAttempt.get(Number(a.attempt_id));
      return {
        type: "ai",
        quiz_name: a.quiz_name,
        quiz_order: Number(a.quiz_id),
        score: Number(a.score),
        raw_score: Number(a.raw_score),
        total_points: Number(a.total_points),
        display_score: counts && counts.total > 0 ? counts.correct : Number(a.raw_score),
        display_total: counts && counts.total > 0 ? counts.total : Number(a.total_points),
        end_time: a.end_time,
      };
    });
    const quizzes = [...readingList, ...pronList, ...aiList].sort(
      (a, b) => new Date(b.end_time || 0) - new Date(a.end_time || 0)
    );

    const rScores = readingList.map((x) => x.score).filter(Number.isFinite);
    const pScores = pronList.map((x) => x.score).filter(Number.isFinite);
    const aiScores = aiList.map((x) => x.score).filter(Number.isFinite);
    const allScores = [...rScores, ...pScores, ...aiScores];
    const reading_avg = avg(rScores) == null ? null : Math.round(avg(rScores) * 10) / 10;
    const pronunciation_avg = avg(pScores) == null ? null : Math.round(avg(pScores) * 10) / 10;
    const ai_avg = avg(aiScores) == null ? null : Math.round(avg(aiScores) * 10) / 10;
    const overall_avg = avg(allScores) == null ? null : Math.round(avg(allScores) * 10) / 10;

    // Total available quizzes (for completion rate) in this subject
    const [[rTotal]] = await pool.query(
      `SELECT COUNT(*) AS c FROM reading_quizzes WHERE (? IS NULL OR subject_id = ? OR subject_id IS NULL)`,
      [subjectId, subjectId]
    );
    const [[pTotal]] = await pool.query(
      `SELECT COUNT(*) AS c FROM pronunciation_quizzes WHERE (? IS NULL OR subject_id = ? OR subject_id IS NULL)`,
      [subjectId, subjectId]
    );
    let aiTotal = 0;
    try {
      if (classId) {
        const [[aTotal]] = await pool.query(
          `SELECT COUNT(*) AS c FROM teacher_reading_quizzes WHERE class_id = ? AND (? IS NULL OR subject_id = ?)`,
          [classId, subjectId, subjectId]
        );
        aiTotal = Number(aTotal?.c || 0);
      }
    } catch (e) {
      if (String(e?.code || "") === "ER_BAD_FIELD_ERROR" || String(e?.message || "").includes("class_id")) {
        try {
          const [[aTotal]] = await pool.query(
            `SELECT COUNT(*) AS c FROM teacher_reading_quizzes WHERE (? IS NULL OR subject_id = ?)`,
            [subjectId, subjectId]
          );
          aiTotal = Number(aTotal?.c || 0);
        } catch (_) {}
      } else if (String(e?.code || "") !== "ER_NO_SUCH_TABLE") {
        console.warn("AI quiz count lookup:", e?.message);
      }
    }
    const total_quizzes = Number(rTotal?.c || 0) + Number(pTotal?.c || 0) + aiTotal;
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
      ai_avg,
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
// - quizzes: [{ quiz_name, score, raw_score, total_points, display_score, display_total }]
//   - score is percentage (0-100), kept for compatibility
//   - display_score/display_total are used for x/y table display
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

    // 2) Reading quiz scores (points + %) — only attempts for this class
    let reading = [];
    try {
      [reading] = await pool.query(
        `
        SELECT a.attempt_id, a.student_id, q.title AS quiz_name,
               q.quiz_id AS source_quiz_id,
               q.quiz_number AS source_quiz_number,
               ROUND(a.score, 2) AS raw_score,
               ROUND(a.total_points, 2) AS total_points,
               ROUND((a.score / NULLIF(a.total_points, 0)) * 100, 1) AS score
        FROM reading_quiz_attempts a
        JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
        WHERE a.status = 'completed' AND a.student_id IN (?) AND a.class_id = ?
        ORDER BY a.end_time DESC
        `,
        [studentIds, classId]
      );
    } catch (e) {
      if (String(e?.code || "") === "ER_BAD_FIELD_ERROR" || String(e?.message || "").includes("class_id")) {
        [reading] = await pool.query(
          `SELECT a.attempt_id, a.student_id, q.title AS quiz_name, q.quiz_id AS source_quiz_id, q.quiz_number AS source_quiz_number,
           ROUND(a.score, 2) AS raw_score, ROUND(a.total_points, 2) AS total_points,
           ROUND((a.score / NULLIF(a.total_points, 0)) * 100, 1) AS score
           FROM reading_quiz_attempts a JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
           WHERE a.status = 'completed' AND a.student_id IN (?) ORDER BY a.end_time DESC`,
          [studentIds]
        );
      } else throw e;
    }

    // 3) Pronunciation quiz scores (built-in + teacher-created) — only attempts for this class
    let pronunciation = [];
    try {
      [pronunciation] = await pool.query(
        `
        SELECT a.attempt_id, a.student_id,
               COALESCE(q.title, tq.title) AS quiz_name,
               COALESCE(q.quiz_id, tq.quiz_id) AS source_quiz_id,
               COALESCE(q.quiz_number, tq.quiz_id) AS source_quiz_number,
               ROUND(COALESCE(a.score, a.pronunciation_score, 0), 2) AS raw_score,
               ROUND(COALESCE(a.total_points, 100), 2) AS total_points,
               ROUND(COALESCE(a.score, a.pronunciation_score, 0), 1) AS score
        FROM pronunciation_quiz_attempts a
        LEFT JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
        LEFT JOIN teacher_pronunciation_quizzes tq ON tq.quiz_id = a.quiz_id
        WHERE a.status IN ('completed', 'submitted') AND a.student_id IN (?)
        AND (q.quiz_id IS NOT NULL OR tq.quiz_id IS NOT NULL)
        AND (a.class_id = ? OR a.class_id IS NULL)
        ORDER BY a.end_time DESC
        `,
        [studentIds, classId]
      );
    } catch (e) {
      if (String(e?.code || "") === "ER_BAD_FIELD_ERROR" || String(e?.message || "").includes("class_id")) {
        [pronunciation] = await pool.query(
          `SELECT a.attempt_id, a.student_id,
           COALESCE(q.title, tq.title) AS quiz_name,
           COALESCE(q.quiz_id, tq.quiz_id) AS source_quiz_id,
           COALESCE(q.quiz_number, tq.quiz_id) AS source_quiz_number,
           ROUND(COALESCE(a.score, a.pronunciation_score, 0), 2) AS raw_score,
           ROUND(COALESCE(a.total_points, 100), 2) AS total_points,
           ROUND(COALESCE(a.score, a.pronunciation_score, 0), 1) AS score
           FROM pronunciation_quiz_attempts a
           LEFT JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
           LEFT JOIN teacher_pronunciation_quizzes tq ON tq.quiz_id = a.quiz_id
           WHERE a.status IN ('completed', 'submitted') AND a.student_id IN (?)
           AND (q.quiz_id IS NOT NULL OR tq.quiz_id IS NOT NULL)
           ORDER BY a.end_time DESC`,
          [studentIds]
        );
      } else throw e;
    }

    // 3.2) AI-generated (teacher-created reading) quiz scores
    let aiGenerated = [];
    try {
      const [aiRows] = await pool.query(
        `
        SELECT a.attempt_id, a.student_id, q.title AS quiz_name,
               q.quiz_id AS source_quiz_id,
               ROUND(a.score, 2) AS raw_score,
               ROUND(a.total_points, 2) AS total_points,
               ROUND((a.score / NULLIF(a.total_points, 0)) * 100, 1) AS score
        FROM teacher_reading_quiz_attempts a
        JOIN teacher_reading_quizzes q ON q.quiz_id = a.quiz_id
        WHERE a.status = 'completed' AND a.student_id IN (?) AND (a.class_id <=> ?)
        ORDER BY a.end_time DESC
        `,
        [studentIds, classId]
      );
      aiGenerated = aiRows || [];
    } catch (e) {
      if (String(e?.code || "") === "ER_BAD_FIELD_ERROR" || String(e?.message || "").includes("class_id")) {
        try {
          const [aiRows] = await pool.query(
            `SELECT a.attempt_id, a.student_id, q.title AS quiz_name, q.quiz_id AS source_quiz_id,
             ROUND(a.score, 2) AS raw_score, ROUND(a.total_points, 2) AS total_points,
             ROUND((a.score / NULLIF(a.total_points, 0)) * 100, 1) AS score
             FROM teacher_reading_quiz_attempts a
             JOIN teacher_reading_quizzes q ON q.quiz_id = a.quiz_id
             WHERE a.status = 'completed' AND a.student_id IN (?)
             ORDER BY a.end_time DESC`,
            [studentIds]
          );
          aiGenerated = aiRows || [];
        } catch (_) {
          aiGenerated = [];
        }
      } else if (String(e?.code || "") !== "ER_NO_SUCH_TABLE") {
        throw e;
      }
    }

    // 3.1) Reading answers count per attempt (for real score display like 2/5)
    const readingAttemptIds = reading
      .map((r) => Number(r.attempt_id))
      .filter((v) => Number.isFinite(v) && v > 0);
    const readingAnswerCountByAttempt = new Map();
    if (readingAttemptIds.length > 0) {
      const [answerCounts] = await pool.query(
        `
        SELECT ra.attempt_id,
               SUM(CASE WHEN ra.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
               COUNT(*) AS total_count
        FROM reading_quiz_answers ra
        WHERE ra.attempt_id IN (?)
        GROUP BY ra.attempt_id
        `,
        [readingAttemptIds]
      );
      for (const row of answerCounts || []) {
        readingAnswerCountByAttempt.set(Number(row.attempt_id), {
          correct: Number(row.correct_count || 0),
          total: Number(row.total_count || 0),
        });
      }
    }

    // 3.3) Teacher-reading answers count per attempt (for real score display like 2/5)
    const aiAttemptIds = aiGenerated
      .map((r) => Number(r.attempt_id))
      .filter((v) => Number.isFinite(v) && v > 0);
    const aiAnswerCountByAttempt = new Map();
    if (aiAttemptIds.length > 0) {
      const [answerCounts] = await pool.query(
        `
        SELECT ra.attempt_id,
               SUM(CASE WHEN ra.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
               COUNT(*) AS total_count
        FROM teacher_reading_quiz_answers ra
        WHERE ra.attempt_id IN (?)
        GROUP BY ra.attempt_id
        `,
        [aiAttemptIds]
      );
      for (const row of answerCounts || []) {
        aiAnswerCountByAttempt.set(Number(row.attempt_id), {
          correct: Number(row.correct_count || 0),
          total: Number(row.total_count || 0),
        });
      }
    }

    // 4) Group into UI-friendly shape
    const readingByStudent = new Map();
    for (const r of reading) {
      if (!readingByStudent.has(r.student_id)) readingByStudent.set(r.student_id, []);
      if (r.quiz_name && r.score != null) {
        const counts = readingAnswerCountByAttempt.get(Number(r.attempt_id));
        readingByStudent.get(r.student_id).push({
          ...r,
          source_type: "reading",
          quiz_order: Number.isFinite(Number(r.source_quiz_number))
            ? Number(r.source_quiz_number)
            : Number(r.source_quiz_id),
          display_score: counts && counts.total > 0 ? counts.correct : Number(r.raw_score),
          display_total: counts && counts.total > 0 ? counts.total : Number(r.total_points),
        });
      }
    }

    const pronByStudent = new Map();
    for (const r of pronunciation) {
      if (!pronByStudent.has(r.student_id)) pronByStudent.set(r.student_id, []);
      if (r.quiz_name && r.score != null) {
        pronByStudent.get(r.student_id).push({
          ...r,
          source_type: "pronunciation",
          quiz_order: Number.isFinite(Number(r.source_quiz_number))
            ? Number(r.source_quiz_number)
            : Number(r.source_quiz_id),
          display_score: Number(r.raw_score),
          display_total: Number(r.total_points),
        });
      }
    }

    const aiByStudent = new Map();
    for (const r of aiGenerated) {
      if (!aiByStudent.has(r.student_id)) aiByStudent.set(r.student_id, []);
      if (r.quiz_name && r.score != null) {
        const counts = aiAnswerCountByAttempt.get(Number(r.attempt_id));
        aiByStudent.get(r.student_id).push({
          ...r,
          source_type: "ai",
          quiz_order: Number(r.source_quiz_id),
          display_score: counts && counts.total > 0 ? counts.correct : Number(r.raw_score),
          display_total: counts && counts.total > 0 ? counts.total : Number(r.total_points),
        });
      }
    }

    const result = students.map((s) => {
      const aiScores = (aiByStudent.get(s.student_id) || []).map((x) => Number(x.score)).filter(Number.isFinite);
      const rScores = (readingByStudent.get(s.student_id) || []).map((x) => Number(x.score)).filter(Number.isFinite);
      const pScores = (pronByStudent.get(s.student_id) || []).map((x) => Number(x.score)).filter(Number.isFinite);
      const allScores = [...aiScores, ...rScores, ...pScores];

      const ai_avg = avg(aiScores);
      const reading_avg = avg(rScores);
      const pronunciation_avg = avg(pScores);
      const overall_avg = avg(allScores);

      return {
        student_id: s.student_id,
        student_fname: toNameCase(s.student_fname),
        student_lname: toNameCase(s.student_lname),
        quizzes: [
          ...(aiByStudent.get(s.student_id) || []),
          ...(readingByStudent.get(s.student_id) || []),
          ...(pronByStudent.get(s.student_id) || []),
        ],
        ai_avg: ai_avg == null ? null : Math.round(ai_avg * 10) / 10,
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

    // Total quizzes available per track (AI + reading + pronunciation)
    // Include built-in reading quizzes (subject_id IS NULL) when filtering by subject
    const [[rq]] = await pool.query(
      `SELECT COUNT(*) AS c FROM reading_quizzes WHERE (? IS NULL OR subject_id = ? OR subject_id IS NULL)`,
      [subjectId, subjectId]
    );
    const [[pq]] = await pool.query(
      `SELECT COUNT(*) AS c FROM pronunciation_quizzes WHERE (? IS NULL OR subject_id = ? OR subject_id IS NULL)`,
      [subjectId, subjectId]
    );
    let totalAI = 0;
    try {
      const [[aq]] = await pool.query(
        `SELECT COUNT(*) AS c
         FROM teacher_reading_quizzes
         WHERE class_id = ? AND (? IS NULL OR subject_id = ?)`,
        [classId, subjectId, subjectId]
      );
      totalAI = Number(aq?.c || 0);
    } catch (e) {
      if (String(e?.code || "") !== "ER_NO_SUCH_TABLE" && String(e?.code || "") !== "ER_BAD_FIELD_ERROR") {
        throw e;
      }
      totalAI = 0;
    }
    const totalReading = Number(rq?.c || 0);
    const totalPron = Number(pq?.c || 0);
    const totalQuizzes = totalAI + totalReading + totalPron;
    const totalPossible = totalQuizzes * totalStudents;
    const readingPossible = totalReading * totalStudents;
    const pronPossible = totalPron * totalStudents;
    const aiPossible = totalAI * totalStudents;

    // Unique completed pairs (student_id + quiz_id) per track, scoped to this class
    let readingDone = { c: 0 };
    let pronDone = { c: 0 };
    const readingWhere = `a.status = 'completed' AND a.student_id IN (?) AND (? IS NULL OR q.subject_id = ? OR q.subject_id IS NULL) AND a.class_id = ?`;
    const readingParams = [studentIds, subjectId, subjectId, classId];
    try {
      [[readingDone]] = await pool.query(
        `SELECT COUNT(DISTINCT CONCAT(a.student_id,'-',a.quiz_id)) AS c FROM reading_quiz_attempts a
         JOIN reading_quizzes q ON q.quiz_id = a.quiz_id WHERE ${readingWhere}`,
        readingParams
      );
    } catch (e) {
      if (String(e?.code || "") === "ER_BAD_FIELD_ERROR" || String(e?.message || "").includes("class_id")) {
        [[readingDone]] = await pool.query(
          `SELECT COUNT(DISTINCT CONCAT(a.student_id,'-',a.quiz_id)) AS c FROM reading_quiz_attempts a
           JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
           WHERE a.status = 'completed' AND a.student_id IN (?) AND (? IS NULL OR q.subject_id = ? OR q.subject_id IS NULL)`,
          [studentIds, subjectId, subjectId]
        );
      } else throw e;
    }
    try {
      [[pronDone]] = await pool.query(
        `SELECT COUNT(DISTINCT CONCAT(a.student_id,'-',a.quiz_id)) AS c FROM pronunciation_quiz_attempts a
         LEFT JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
         LEFT JOIN teacher_pronunciation_quizzes tq ON tq.quiz_id = a.quiz_id
         WHERE a.status IN ('completed', 'submitted') AND a.student_id IN (?)
         AND (q.quiz_id IS NOT NULL OR tq.quiz_id IS NOT NULL)
         AND (? IS NULL OR COALESCE(q.subject_id, tq.subject_id) = ? OR COALESCE(q.subject_id, tq.subject_id) IS NULL)
         AND (a.class_id = ? OR a.class_id IS NULL)`,
        [studentIds, subjectId, subjectId, classId]
      );
    } catch (e) {
      if (String(e?.code || "") === "ER_BAD_FIELD_ERROR" || String(e?.message || "").includes("class_id")) {
        [[pronDone]] = await pool.query(
          `SELECT COUNT(DISTINCT CONCAT(a.student_id,'-',a.quiz_id)) AS c FROM pronunciation_quiz_attempts a
           LEFT JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
           LEFT JOIN teacher_pronunciation_quizzes tq ON tq.quiz_id = a.quiz_id
           WHERE a.status IN ('completed', 'submitted') AND a.student_id IN (?)
           AND (q.quiz_id IS NOT NULL OR tq.quiz_id IS NOT NULL)
           AND (? IS NULL OR COALESCE(q.subject_id, tq.subject_id) = ? OR COALESCE(q.subject_id, tq.subject_id) IS NULL)`,
          [studentIds, subjectId, subjectId]
        );
      } else throw e;
    }
    let aiDoneCount = 0;
    try {
      const [[aiDone]] = await pool.query(
        `
        SELECT COUNT(DISTINCT CONCAT(a.student_id,'-',a.quiz_id)) AS c
        FROM teacher_reading_quiz_attempts a
        JOIN teacher_reading_quizzes q ON q.quiz_id = a.quiz_id
        WHERE a.status = 'completed'
          AND a.student_id IN (?)
          AND (? IS NULL OR q.subject_id = ?)
          AND a.class_id = ?
        `,
        [studentIds, subjectId, subjectId, classId]
      );
      aiDoneCount = Number(aiDone?.c || 0);
    } catch (e) {
      if (String(e?.code || "") !== "ER_NO_SUCH_TABLE" && String(e?.code || "") !== "ER_BAD_FIELD_ERROR") {
        throw e;
      }
      aiDoneCount = 0;
    }
    const readingCompleted = Number(readingDone?.c || 0);
    const pronunciationCompleted = Number(pronDone?.c || 0);
    const completedPairs = readingCompleted + pronunciationCompleted + aiDoneCount;

    let readingEngRows = [];
    let pronEngRows = [];
    try {
      [readingEngRows] = await pool.query(
        `SELECT DISTINCT a.student_id FROM reading_quiz_attempts a JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
         WHERE a.status = 'completed' AND a.student_id IN (?) AND (? IS NULL OR q.subject_id = ? OR q.subject_id IS NULL) AND a.class_id = ?`,
        [studentIds, subjectId, subjectId, classId]
      );
    } catch (e) {
      if (String(e?.code || "") === "ER_BAD_FIELD_ERROR" || String(e?.message || "").includes("class_id")) {
        [readingEngRows] = await pool.query(
          `SELECT DISTINCT a.student_id FROM reading_quiz_attempts a JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
           WHERE a.status = 'completed' AND a.student_id IN (?) AND (? IS NULL OR q.subject_id = ? OR q.subject_id IS NULL)`,
          [studentIds, subjectId, subjectId]
        );
      } else throw e;
    }
    try {
      [pronEngRows] = await pool.query(
        `SELECT DISTINCT a.student_id FROM pronunciation_quiz_attempts a
         LEFT JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
         LEFT JOIN teacher_pronunciation_quizzes tq ON tq.quiz_id = a.quiz_id
         WHERE a.status IN ('completed', 'submitted') AND a.student_id IN (?)
         AND (q.quiz_id IS NOT NULL OR tq.quiz_id IS NOT NULL)
         AND (? IS NULL OR COALESCE(q.subject_id, tq.subject_id) = ? OR COALESCE(q.subject_id, tq.subject_id) IS NULL)
         AND (a.class_id = ? OR a.class_id IS NULL)`,
        [studentIds, subjectId, subjectId, classId]
      );
    } catch (e) {
      if (String(e?.code || "") === "ER_BAD_FIELD_ERROR" || String(e?.message || "").includes("class_id")) {
        [pronEngRows] = await pool.query(
          `SELECT DISTINCT a.student_id FROM pronunciation_quiz_attempts a
           LEFT JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
           LEFT JOIN teacher_pronunciation_quizzes tq ON tq.quiz_id = a.quiz_id
           WHERE a.status IN ('completed', 'submitted') AND a.student_id IN (?)
           AND (q.quiz_id IS NOT NULL OR tq.quiz_id IS NOT NULL)
           AND (? IS NULL OR COALESCE(q.subject_id, tq.subject_id) = ? OR COALESCE(q.subject_id, tq.subject_id) IS NULL)`,
          [studentIds, subjectId, subjectId]
        );
      } else throw e;
    }
    let aiEngRows = [];
    try {
      const [rows] = await pool.query(
        `
        SELECT DISTINCT a.student_id
        FROM teacher_reading_quiz_attempts a
        JOIN teacher_reading_quizzes q ON q.quiz_id = a.quiz_id
        WHERE a.status = 'completed'
          AND a.student_id IN (?)
          AND (? IS NULL OR q.subject_id = ?)
          AND a.class_id = ?
        `,
        [studentIds, subjectId, subjectId, classId]
      );
      aiEngRows = rows || [];
    } catch (e) {
      if (String(e?.code || "") !== "ER_NO_SUCH_TABLE" && String(e?.code || "") !== "ER_BAD_FIELD_ERROR") {
        throw e;
      }
      aiEngRows = [];
    }
    const readingEngagedSet = new Set((readingEngRows || []).map((r) => Number(r.student_id)));
    const pronEngagedSet = new Set((pronEngRows || []).map((r) => Number(r.student_id)));
    const aiEngagedSet = new Set((aiEngRows || []).map((r) => Number(r.student_id)));
    const engagedStudents = new Set([...readingEngagedSet, ...pronEngagedSet, ...aiEngagedSet]).size;
    const readingEngaged = readingEngagedSet.size;
    const pronunciationEngaged = pronEngagedSet.size;
    const aiEngaged = aiEngagedSet.size;

    const completionRate = totalPossible > 0 ? Math.round((completedPairs / totalPossible) * 1000) / 10 : 0;
    const aiRate = aiPossible > 0 ? Math.round((aiDoneCount / aiPossible) * 1000) / 10 : 0;
    const readingRate = readingPossible > 0 ? Math.round((readingCompleted / readingPossible) * 1000) / 10 : 0;
    const pronunciationRate = pronPossible > 0 ? Math.round((pronunciationCompleted / pronPossible) * 1000) / 10 : 0;

    res.json({
      success: true,
      class_id: classId,
      subject_id: subjectId,
      total_students: totalStudents,
      total_quizzes: totalQuizzes,
      ai_quizzes: totalAI,
      reading_quizzes: totalReading,
      pronunciation_quizzes: totalPron,
      total_possible: totalPossible,
      completed_pairs: completedPairs,
      engaged_students: engagedStudents,
      completion_rate: completionRate,
      completion_by_type: {
        ai: {
          total_quizzes: totalAI,
          total_possible: aiPossible,
          completed_pairs: aiDoneCount,
          engaged_students: aiEngaged,
          completion_rate: aiRate,
        },
        reading: {
          total_quizzes: totalReading,
          total_possible: readingPossible,
          completed_pairs: readingCompleted,
          engaged_students: readingEngaged,
          completion_rate: readingRate,
        },
        pronunciation: {
          total_quizzes: totalPron,
          total_possible: pronPossible,
          completed_pairs: pronunciationCompleted,
          engaged_students: pronunciationEngaged,
          completion_rate: pronunciationRate,
        },
      },
    });
  } catch (error) {
    console.error("❌ Completion rate error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

module.exports = router;