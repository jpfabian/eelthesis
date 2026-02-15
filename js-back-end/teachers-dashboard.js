const express = require("express");
const router = express.Router();

/**
 * GET /api/teachers-dashboard-stats
 * Returns real stats for the For Teachers landing page: Analytics (improvement rate),
 * Quizzes generated this month, and Student Progress by skill (Reading, Writing, Speaking, Listening).
 * Optional query: teacher_id — if provided, stats are scoped to that teacher's classes/exams.
 */
async function getTeachersDashboardStats(req, res) {
  const pool = req.pool;
  const teacherId = req.query.teacher_id ? Number(req.query.teacher_id) : null;

  try {
    // ——— 1) Analytics: average improvement/score rate (0–100) ———
    // Reading: average of (score/total_points)*100 for completed attempts
    // Pronunciation: average of score (already 0–100) for completed/submitted attempts
    let readingWhere = "a.status = 'completed'";
    let pronWhere = "a.status IN ('completed', 'submitted')";
    const readingParams = [];
    const pronParams = [];

    if (teacherId != null && Number.isFinite(teacherId)) {
      // Restrict to students in this teacher's classes
      readingWhere +=
        " AND a.student_id IN (SELECT sc.student_id FROM student_classes sc JOIN classes c ON c.id = sc.class_id WHERE c.teacher_id = ? AND sc.status = 'accepted')";
      pronWhere +=
        " AND a.student_id IN (SELECT sc.student_id FROM student_classes sc JOIN classes c ON c.id = sc.class_id WHERE c.teacher_id = ? AND sc.status = 'accepted')";
      readingParams.push(teacherId);
      pronParams.push(teacherId);
    }

    const [readingAvg] = await pool.query(
      `SELECT AVG((a.score / NULLIF(a.total_points, 0)) * 100) AS avg_pct, COUNT(*) AS cnt
       FROM reading_quiz_attempts a WHERE ${readingWhere}`,
      readingParams
    );
    const [pronAvg] = await pool.query(
      `SELECT AVG(a.score) AS avg_pct, COUNT(*) AS cnt
       FROM pronunciation_quiz_attempts a WHERE ${pronWhere}`,
      pronParams
    );

    const r = readingAvg[0];
    const p = pronAvg[0];
    const rCnt = Number(r?.cnt || 0);
    const pCnt = Number(p?.cnt || 0);
    const rAvg = r?.avg_pct != null ? Number(r.avg_pct) : null;
    const pAvg = p?.avg_pct != null ? Number(p.avg_pct) : null;

    let improvementRate = null;
    if (rCnt + pCnt > 0) {
      if (rCnt && pCnt) {
        improvementRate = (rAvg * rCnt + pAvg * pCnt) / (rCnt + pCnt);
      } else if (rCnt) {
        improvementRate = rAvg;
      } else {
        improvementRate = pAvg;
      }
      improvementRate = Math.round(improvementRate * 10) / 10;
    }

    // ——— 2) Quizzes generated this month (per teacher: reading, pronunciation, AI) ———
    const monthWhere =
      "YEAR(created_at) = YEAR(CURRENT_DATE()) AND MONTH(created_at) = MONTH(CURRENT_DATE())";

    const [trq] = await pool.query(
      `SELECT COUNT(*) AS c FROM teacher_reading_quizzes
       WHERE ${monthWhere} ${teacherId != null && Number.isFinite(teacherId) ? "AND user_id = ?" : ""}`,
      teacherId != null && Number.isFinite(teacherId) ? [teacherId] : []
    );
    const [tpq] = await pool.query(
      `SELECT COUNT(*) AS c FROM teacher_pronunciation_quizzes
       WHERE ${monthWhere} ${teacherId != null && Number.isFinite(teacherId) ? "AND user_id = ?" : ""}`,
      teacherId != null && Number.isFinite(teacherId) ? [teacherId] : []
    );
    const [aiq] = await pool.query(
      `SELECT COUNT(*) AS c FROM ai_quiz_pronunciation
       WHERE ${monthWhere} ${teacherId != null && Number.isFinite(teacherId) ? "AND teacher_id = ?" : ""}`,
      teacherId != null && Number.isFinite(teacherId) ? [teacherId] : []
    );

    const quizzesGeneratedThisMonth =
      Number(trq[0]?.c || 0) + Number(tpq[0]?.c || 0) + Number(aiq[0]?.c || 0);

    // ——— 3) Student progress: actual Reading practice & Pronunciation practice (overall averages) ———
    const teacherFilter =
      teacherId != null && Number.isFinite(teacherId)
        ? "AND a.student_id IN (SELECT sc.student_id FROM student_classes sc JOIN classes c ON c.id = sc.class_id WHERE c.teacher_id = ? AND sc.status = 'accepted')"
        : "";
    const subParams = teacherId != null && Number.isFinite(teacherId) ? [teacherId] : [];

    const [[readingRow]] = await pool.query(
      `SELECT AVG((a.score / NULLIF(a.total_points, 0)) * 100) AS reading_avg
       FROM reading_quiz_attempts a
       WHERE a.status = 'completed' ${teacherFilter}`,
      subParams
    );
    const [[pronRow]] = await pool.query(
      `SELECT AVG(a.score) AS pron_avg
       FROM pronunciation_quiz_attempts a
       WHERE a.status IN ('completed', 'submitted') ${teacherFilter}`,
      subParams
    );

    const readingPctRaw = readingRow?.reading_avg != null ? Number(readingRow.reading_avg) : null;
    const pronPctRaw = pronRow?.pron_avg != null ? Number(pronRow.pron_avg) : null;
    const readingPct = readingPctRaw != null ? Math.round(readingPctRaw * 10) / 10 : 0;
    const pronPct = pronPctRaw != null ? Math.round(pronPctRaw * 10) / 10 : 0;

    const skills = [
      { skill: "Reading practice", pct: readingPct },
      { skill: "Pronunciation practice", pct: pronPct },
    ];

    // Ensure numbers for UI (no null)
    const studentProgress = skills.map((s) => ({
      skill: s.skill,
      pct: s.pct != null && !Number.isNaN(s.pct) ? s.pct : 0,
    }));

    res.json({
      success: true,
      analytics: { improvementRate },
      quizzes: { generatedThisMonth: quizzesGeneratedThisMonth },
      studentProgress,
    });
  } catch (err) {
    console.error("teachers-dashboard-stats error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
}

router.get("/api/teachers-dashboard-stats", getTeachersDashboardStats);

module.exports = router;
module.exports.getTeachersDashboardStats = getTeachersDashboardStats;
