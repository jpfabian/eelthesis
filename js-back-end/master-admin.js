const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { nowPhilippineDatetime } = require("./utils/datetime");

const MASTER_ADMIN_TOKEN = "eel_master_admin_token_v1";

function requireMasterAdmin(req, res, next) {
  const token = req.header("x-master-admin-token") || "";
  if (token !== MASTER_ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}

function toNameCase(input) {
  if (input == null || typeof input !== "string") return input;
  return String(input)
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function validateAdminPassword(pwd) {
  const s = String(pwd || "");
  if (s.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(s)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(s)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(s)) return "Password must contain at least one special character.";
  return null;
}

// Sign up another admin (master_admin only)
router.post("/api/master-admin/admins", requireMasterAdmin, async (req, res) => {
  const { fname, lname, email, password } = req.body || {};
  if (!fname || !lname || !email || !password) {
    return res.status(400).json({ success: false, error: "fname, lname, email, and password are required." });
  }
  const pwdError = validateAdminPassword(password);
  if (pwdError) {
    return res.status(400).json({ success: false, error: pwdError });
  }
  const pool = req.pool;
  try {
    const [existing] = await pool.execute("SELECT user_id FROM users WHERE email = ?", [String(email).trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: "Email already registered." });
    }
    const hashedPassword = await bcrypt.hash(String(password), 10);
    const safeFname = toNameCase(fname);
    const safeLname = toNameCase(lname);
    const safeEmail = String(email).trim().toLowerCase();
    await pool.execute(
      `INSERT INTO users (fname, lname, email, password, role, verification_status) VALUES (?, ?, ?, ?, 'admin', 'approved')`,
      [safeFname, safeLname, safeEmail, hashedPassword]
    );
    res.json({ success: true, message: "Admin account created." });
  } catch (err) {
    console.error("Master admin create admin:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// List tracks (for dropdowns, signup)
router.get("/api/master-admin/tracks", requireMasterAdmin, async (req, res) => {
  const pool = req.pool;
  try {
    const [rows] = await pool.query("SELECT track_id, track_name FROM tracks ORDER BY track_name");
    res.json({ success: true, tracks: rows });
  } catch (err) {
    console.error("Master admin list tracks:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Add a new track
router.post("/api/master-admin/tracks", requireMasterAdmin, async (req, res) => {
  const { track_name } = req.body || {};
  const name = String(track_name || "").trim();
  if (!name) {
    return res.status(400).json({ success: false, error: "track_name is required." });
  }
  const pool = req.pool;
  try {
    const [result] = await pool.execute("INSERT INTO tracks (track_name) VALUES (?)", [name]);
    res.json({ success: true, track_id: result.insertId, message: "Track added." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, error: "Track name already exists." });
    }
    console.error("Master admin add track:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Delete track
router.delete("/api/master-admin/tracks/:id", requireMasterAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: "Invalid track id" });
  const pool = req.pool;
  try {
    const [result] = await pool.execute("DELETE FROM tracks WHERE track_id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: "Track not found" });
    res.json({ success: true, message: "Track deleted." });
  } catch (err) {
    console.error("Master admin delete track:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// List subjects (for dropdowns)
router.get("/api/master-admin/subjects", requireMasterAdmin, async (req, res) => {
  const pool = req.pool;
  try {
    const [rows] = await pool.query("SELECT subject_id, subject_name FROM subjects ORDER BY subject_name");
    res.json({ success: true, subjects: rows });
  } catch (err) {
    console.error("Master admin list subjects:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Add a new subject
router.post("/api/master-admin/subjects", requireMasterAdmin, async (req, res) => {
  const { subject_name } = req.body || {};
  const name = String(subject_name || "").trim();
  if (!name) {
    return res.status(400).json({ success: false, error: "subject_name is required." });
  }
  const pool = req.pool;
  try {
    const [result] = await pool.execute("INSERT INTO subjects (subject_name) VALUES (?)", [name]);
    res.json({ success: true, subject_id: result.insertId, message: "Subject added." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, error: "Subject name already exists." });
    }
    console.error("Master admin add subject:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Add a lesson (module) to a subject
router.post("/api/master-admin/lessons", requireMasterAdmin, async (req, res) => {
  const { subject_id, lesson_title, quarter_number, quarter_title } = req.body || {};
  const subjectId = subject_id != null ? Number(subject_id) : null;
  const title = String(lesson_title || "").trim();
  if (!Number.isFinite(subjectId) || !title) {
    return res.status(400).json({ success: false, error: "subject_id and lesson_title are required." });
  }
  const pool = req.pool;
  try {
    const qNum = quarter_number != null ? Number(quarter_number) : null;
    const qTitle = quarter_title != null ? String(quarter_title).trim() : null;
    const [result] = await pool.execute(
      "INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (?, ?, ?, ?)",
      [subjectId, title, qNum, qTitle]
    );
    res.json({ success: true, lesson_id: result.insertId, message: "Lesson added." });
  } catch (err) {
    console.error("Master admin add lesson:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Add a topic to a lesson (PPT/PDF: store path in pdf_path)
router.post("/api/master-admin/topics", requireMasterAdmin, async (req, res) => {
  const { lesson_id, topic_title, pdf_path } = req.body || {};
  const lessonId = lesson_id != null ? Number(lesson_id) : null;
  const title = String(topic_title || "").trim();
  if (!Number.isFinite(lessonId) || !title) {
    return res.status(400).json({ success: false, error: "lesson_id and topic_title are required." });
  }
  const pool = req.pool;
  try {
    const pathVal = pdf_path != null ? String(pdf_path).trim() : null;
    const [result] = await pool.execute(
      "INSERT INTO topics (lesson_id, topic_title, pdf_path) VALUES (?, ?, ?)",
      [lessonId, title, pathVal || null]
    );
    res.json({ success: true, topic_id: result.insertId, message: "Topic (module) added." });
  } catch (err) {
    console.error("Master admin add topic:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// List lessons for a subject (for dropdown when adding topics)
router.get("/api/master-admin/lessons", requireMasterAdmin, async (req, res) => {
  const subjectId = req.query.subject_id != null ? Number(req.query.subject_id) : null;
  if (!Number.isFinite(subjectId)) {
    return res.status(400).json({ success: false, error: "subject_id query is required." });
  }
  const pool = req.pool;
  try {
    const [rows] = await pool.query(
      "SELECT lesson_id, lesson_title, quarter_number, quarter_title FROM lessons WHERE subject_id = ? ORDER BY quarter_number, lesson_id",
      [subjectId]
    );
    res.json({ success: true, lessons: rows });
  } catch (err) {
    console.error("Master admin list lessons:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// List all lessons with subject name (for table)
router.get("/api/master-admin/lessons/all", requireMasterAdmin, async (req, res) => {
  const pool = req.pool;
  try {
    const [rows] = await pool.query(
      `SELECT l.lesson_id, l.subject_id, l.lesson_title, l.quarter_number, l.quarter_title, s.subject_name
       FROM lessons l
       LEFT JOIN subjects s ON s.subject_id = l.subject_id
       ORDER BY s.subject_name, l.quarter_number, l.lesson_id`
    );
    res.json({ success: true, lessons: rows });
  } catch (err) {
    console.error("Master admin list all lessons:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Get curriculum for a subject: lessons with their topics (for browse view)
router.get("/api/master-admin/curriculum/:subjectId", requireMasterAdmin, async (req, res) => {
  const subjectId = Number(req.params.subjectId);
  if (!Number.isFinite(subjectId)) {
    return res.status(400).json({ success: false, error: "Invalid subject id" });
  }
  const pool = req.pool;
  try {
    const [[subjectRow]] = await pool.query(
      "SELECT subject_id, subject_name FROM subjects WHERE subject_id = ?",
      [subjectId]
    );
    if (!subjectRow) {
      return res.status(404).json({ success: false, error: "Subject not found" });
    }
    const [lessons] = await pool.query(
      `SELECT lesson_id, lesson_title, quarter_number, quarter_title
       FROM lessons WHERE subject_id = ? ORDER BY quarter_number, lesson_id`,
      [subjectId]
    );
    const [topics] = await pool.query(
      `SELECT t.topic_id, t.lesson_id, t.topic_title, t.pdf_path
       FROM topics t
       INNER JOIN lessons l ON l.lesson_id = t.lesson_id AND l.subject_id = ?
       ORDER BY t.lesson_id, t.topic_id`,
      [subjectId]
    );
    const topicsByLesson = {};
    (topics || []).forEach((t) => {
      const lid = t.lesson_id;
      if (!topicsByLesson[lid]) topicsByLesson[lid] = [];
      topicsByLesson[lid].push(t);
    });
    const lessonsWithTopics = (lessons || []).map((l) => ({
      ...l,
      topics: topicsByLesson[l.lesson_id] || [],
    }));
    res.json({
      success: true,
      subject: subjectRow,
      lessons: lessonsWithTopics,
    });
  } catch (err) {
    console.error("Master admin curriculum browse:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// List all topics with lesson and subject (for table)
router.get("/api/master-admin/topics/all", requireMasterAdmin, async (req, res) => {
  const pool = req.pool;
  try {
    const [rows] = await pool.query(
      `SELECT t.topic_id, t.lesson_id, t.topic_title, t.pdf_path, l.lesson_title, l.subject_id, s.subject_name
       FROM topics t
       LEFT JOIN lessons l ON l.lesson_id = t.lesson_id
       LEFT JOIN subjects s ON s.subject_id = l.subject_id
       ORDER BY s.subject_name, l.lesson_id, t.topic_id`
    );
    res.json({ success: true, topics: rows });
  } catch (err) {
    console.error("Master admin list all topics:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Delete subject (cascades to lessons and topics in DB)
router.delete("/api/master-admin/subjects/:id", requireMasterAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: "Invalid subject id" });
  const pool = req.pool;
  try {
    const [result] = await pool.execute("DELETE FROM subjects WHERE subject_id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: "Subject not found" });
    res.json({ success: true, message: "Subject deleted." });
  } catch (err) {
    console.error("Master admin delete subject:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Delete lesson (cascades to topics in DB)
router.delete("/api/master-admin/lessons/:id", requireMasterAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: "Invalid lesson id" });
  const pool = req.pool;
  try {
    const [result] = await pool.execute("DELETE FROM lessons WHERE lesson_id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: "Lesson not found" });
    res.json({ success: true, message: "Lesson deleted." });
  } catch (err) {
    console.error("Master admin delete lesson:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Delete topic
router.delete("/api/master-admin/topics/:id", requireMasterAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: "Invalid topic id" });
  const pool = req.pool;
  try {
    const [result] = await pool.execute("DELETE FROM topics WHERE topic_id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: "Topic not found" });
    res.json({ success: true, message: "Topic deleted." });
  } catch (err) {
    console.error("Master admin delete topic:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Dashboard stats for master admin overview
router.get("/api/master-admin/dashboard-stats", requireMasterAdmin, async (req, res) => {
  const pool = req.pool;
  try {
    const [
      [adminsRows],
      [teachersRows],
      [studentsRows],
      [classesRows],
      [subjectsRows],
      [lessonsRows],
      [topicsRows],
      [verificationRows],
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND is_active = 1"),
      pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'teacher'"),
      pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'student'"),
      pool.query("SELECT COUNT(*) AS c FROM classes"),
      pool.query("SELECT COUNT(*) AS c FROM subjects"),
      pool.query("SELECT COUNT(*) AS c FROM lessons"),
      pool.query("SELECT COUNT(*) AS c FROM topics"),
      pool.query(
        `SELECT verification_status, COUNT(*) AS c FROM users WHERE role IN ('teacher','student') GROUP BY verification_status`
      ),
    ]);

    const verification = { pending: 0, approved: 0, rejected: 0 };
    (verificationRows || []).forEach((r) => {
      const status = String(r.verification_status || "").toLowerCase();
      if (status in verification) verification[status] = Number(r.c || 0);
    });

    res.json({
      success: true,
      stats: {
        admins: Number(adminsRows?.[0]?.c || 0),
        teachers: Number(teachersRows?.[0]?.c || 0),
        students: Number(studentsRows?.[0]?.c || 0),
        classes: Number(classesRows?.[0]?.c || 0),
        subjects: Number(subjectsRows?.[0]?.c || 0),
        lessons: Number(lessonsRows?.[0]?.c || 0),
        topics: Number(topicsRows?.[0]?.c || 0),
        verification,
      },
    });
  } catch (err) {
    console.error("Master admin dashboard stats:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// List admin accounts (role = 'admin' only; excludes master_admin)
router.get("/api/master-admin/admins", requireMasterAdmin, async (req, res) => {
  const pool = req.pool;
  try {
    const [rows] = await pool.query(
      `SELECT user_id, fname, lname, email, is_active, deactivated_at, deactivated_by, created_at
       FROM users WHERE role = 'admin' ORDER BY created_at DESC`
    );
    const admins = rows.map((r) => ({
      user_id: r.user_id,
      fname: r.fname,
      lname: r.lname,
      email: r.email,
      is_active: Number(r.is_active) === 1,
      deactivated_at: r.deactivated_at || null,
      deactivated_by: r.deactivated_by || null,
      created_at: r.created_at || null,
    }));
    res.json({ success: true, admins });
  } catch (err) {
    console.error("Master admin list admins:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Deactivate an admin account (only role = 'admin')
router.patch("/api/master-admin/admins/:id/deactivate", requireMasterAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const reason = String(req.body?.reason || "").trim().slice(0, 255);
  if (!userId) return res.status(400).json({ success: false, error: "Invalid user id" });
  const pool = req.pool;
  try {
    const [rows] = await pool.query("SELECT user_id, role FROM users WHERE user_id = ? LIMIT 1", [userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: "User not found" });
    if (rows[0].role !== "admin") return res.status(403).json({ success: false, error: "Only admin accounts can be deactivated here." });
    await pool.execute(
      `UPDATE users SET is_active = 0, deactivated_at = ?, deactivated_by = 'master_admin', deactivated_reason = ? WHERE user_id = ?`,
      [nowPhilippineDatetime(), reason || null, userId]
    );
    res.json({ success: true, message: "Admin account deactivated." });
  } catch (err) {
    console.error("Master admin deactivate admin:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Activate (reactivate) an admin account
router.patch("/api/master-admin/admins/:id/activate", requireMasterAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ success: false, error: "Invalid user id" });
  const pool = req.pool;
  try {
    const [rows] = await pool.query("SELECT user_id, role FROM users WHERE user_id = ? LIMIT 1", [userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: "User not found" });
    if (rows[0].role !== "admin") return res.status(403).json({ success: false, error: "Only admin accounts can be activated here." });
    await pool.execute(
      `UPDATE users SET is_active = 1, deactivated_at = NULL, deactivated_by = NULL, deactivated_reason = NULL WHERE user_id = ?`,
      [userId]
    );
    res.json({ success: true, message: "Admin account activated." });
  } catch (err) {
    console.error("Master admin activate admin:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
