const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
require("dotenv").config();
const { nowPhilippineDatetime } = require("./utils/datetime");

let Groq = null;
try {
  Groq = require("groq-sdk");
} catch (_) {}

const groq = (() => {
  const key = String(process.env.GROQ_API_KEY || "").trim();
  if (key && Groq) return new Groq({ apiKey: key });
  return null;
})();

function requireGroq(res) {
  if (groq) return groq;
  const keyExists = !!process.env.GROQ_API_KEY;
  const sdkExists = !!Groq;
  res.status(500).json({
    success: false,
    message: "AI service is not configured correctly.",
    details: { keyExists, sdkExists }
  });
  return null;
}

const MASTER_ADMIN_TOKEN = "eel_master_admin_token_v1";

function requireMasterAdmin(req, res, next) {
  const token = req.header("x-master-admin-token") || "";
  if (token !== MASTER_ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}

// New debug route
router.get("/debug", (req, res) => res.json({ success: true, message: "Master admin router is loaded" }));

// List all Reading Quizzes
router.get("/reading-quizzes/all", requireMasterAdmin, async (req, res) => {
  const pool = req.pool;
  try {
    const [rows] = await pool.query(
      "SELECT quiz_id, quiz_number, title, difficulty, passing_score, status, created_at FROM reading_quizzes ORDER BY created_at DESC"
    );
    res.json({ success: true, quizzes: rows });
  } catch (err) {
    console.error("Master admin list all reading quizzes:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// List all Pronunciation Quizzes
router.get("/pronunciation-quizzes/all", requireMasterAdmin, async (req, res) => {
  const pool = req.pool;
  try {
    const [rows] = await pool.query(
      "SELECT quiz_id, quiz_number, title, difficulty, status, created_at FROM pronunciation_quizzes ORDER BY created_at DESC"
    );
    res.json({ success: true, quizzes: rows });
  } catch (err) {
    console.error("Master admin list all pronunciation quizzes:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

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
router.post("/admins", requireMasterAdmin, async (req, res) => {
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
router.get("/tracks", requireMasterAdmin, async (req, res) => {
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
router.post("/tracks", requireMasterAdmin, async (req, res) => {
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
router.delete("/tracks/:id", requireMasterAdmin, async (req, res) => {
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
router.get("/subjects", requireMasterAdmin, async (req, res) => {
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
router.post("/subjects", requireMasterAdmin, async (req, res) => {
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
router.post("/lessons", requireMasterAdmin, async (req, res) => {
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
router.post("/topics", requireMasterAdmin, async (req, res) => {
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
router.get("/lessons", requireMasterAdmin, async (req, res) => {
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

// Add Built-in Reading Quiz
router.post("/reading-quizzes", requireMasterAdmin, async (req, res) => {
  const pool = req.pool;
  const { title, difficulty, passage, passing_score, questions } = req.body || {};
  if (!title || !passage || !questions || !questions.length) {
    return res.status(400).json({ success: false, error: "title, passage, and questions are required." });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Get next quiz_number
    const [[numRow]] = await conn.query("SELECT MAX(quiz_number) as lastNum FROM reading_quizzes");
    const nextNum = (numRow?.lastNum || 0) + 1;

    // Insert Quiz
    const [qResult] = await conn.query(
      "INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, passing_score, status, is_locked) VALUES (?, ?, ?, ?, ?, 'active', 0)",
      [nextNum, title, difficulty || 'beginner', passage, passing_score || 70]
    );
    const quizId = qResult.insertId;

    // Insert Questions
    for (const q of questions) {
      const [questionRes] = await conn.query(
        "INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES (?, ?, ?, ?, ?)",
        [quizId, q.question_type, q.question_text, q.points || 1, q.position]
      );
      const questionId = questionRes.insertId;

      if (q.question_type === 'mcq' && q.options) {
        for (const opt of q.options) {
          await conn.query(
            "INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES (?, ?, ?, ?)",
            [questionId, opt.option_text, opt.is_correct, opt.position]
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true, message: "Reading quiz added successfully.", quiz_id: quizId });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Master admin add reading quiz:", err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

// Add Built-in Pronunciation Quiz
router.post("/pronunciation-quizzes", requireMasterAdmin, async (req, res) => {
  const pool = req.pool;
  const { title, difficulty, questions } = req.body || {};
  if (!title || !questions || !questions.length) {
    return res.status(400).json({ success: false, error: "title and questions are required." });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Get next quiz_number
    const [[numRow]] = await conn.query("SELECT MAX(quiz_number) as lastNum FROM pronunciation_quizzes");
    const nextNum = (numRow?.lastNum || 0) + 1;

    // Insert Quiz
    const [qResult] = await conn.query(
      "INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, status, is_locked) VALUES (?, ?, ?, 'active', 0)",
      [nextNum, title, difficulty || 'beginner']
    );
    const quizId = qResult.insertId;

    // Insert Questions based on difficulty
    const diff = String(difficulty).toLowerCase();
    let table = "";
    let columns = "";
    let placeholders = "";

    if (diff === 'beginner') {
      table = "pronunciation_beginner_questions";
      columns = "(quiz_id, word, correct_pronunciation, position)";
      placeholders = "(?, ?, ?, ?)";
    } else if (diff === 'intermediate') {
      table = "pronunciation_intermediate_questions";
      columns = "(quiz_id, word, stressed_syllable, position)";
      placeholders = "(?, ?, ?, ?)";
    } else {
      table = "pronunciation_advanced_questions";
      columns = "(quiz_id, sentence, reduced_form, full_sentence, position)";
      placeholders = "(?, ?, ?, ?, ?)";
    }

    for (const q of questions) {
      const vals = [quizId];
      if (diff === 'beginner') {
        vals.push(q.word, q.correct_pronunciation, q.position);
      } else if (diff === 'intermediate') {
        vals.push(q.word, q.stressed_syllable, q.position);
      } else {
        vals.push(q.sentence, q.reduced_form, q.full_sentence, q.position);
      }
      await conn.query(`INSERT INTO ${table} ${columns} VALUES ${placeholders}`, vals);
    }

    await conn.commit();
    res.json({ success: true, message: "Pronunciation quiz added successfully.", quiz_id: quizId });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Master admin add pronunciation quiz:", err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

// List all lessons with subject name (for table)
router.get("/lessons/all", requireMasterAdmin, async (req, res) => {
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
router.get("/curriculum/:subjectId", requireMasterAdmin, async (req, res) => {
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
router.get("/topics/all", requireMasterAdmin, async (req, res) => {
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
router.delete("/subjects/:id", requireMasterAdmin, async (req, res) => {
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
router.delete("/lessons/:id", requireMasterAdmin, async (req, res) => {
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
router.delete("/topics/:id", requireMasterAdmin, async (req, res) => {
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
router.get("/dashboard-stats", requireMasterAdmin, async (req, res) => {
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
router.get("/admins", requireMasterAdmin, async (req, res) => {
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
router.patch("/admins/:id/deactivate", requireMasterAdmin, async (req, res) => {
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
router.patch("/admins/:id/activate", requireMasterAdmin, async (req, res) => {
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

// AI: Check Status
router.get("/ai-status", requireMasterAdmin, (req, res) => {
  const key = String(process.env.GROQ_API_KEY || "").trim();
  res.json({
    success: true,
    sdkLoaded: !!Groq,
    keyConfigured: !!key,
    keyLength: key.length,
    nodeEnv: process.env.NODE_ENV || "not set"
  });
});

// AI: Generate Reading Quiz
router.post("/generate-reading-quiz", requireMasterAdmin, async (req, res) => {
  console.log("AI: Reading Quiz Generation requested...");
  const g = requireGroq(res);
  if (!g) {
    console.error("AI: Groq service not initialized.");
    return;
  }

  const { topic } = req.body || {};
  if (!topic) {
    console.warn("AI: Topic missing in request.");
    return res.status(400).json({ success: false, error: "topic is required." });
  }

  try {
    console.log(`AI: Generating reading quiz for topic: ${topic}`);
    const completion = await g.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are an expert English teacher. Generate a reading comprehension quiz based on the given topic.
            The response MUST be a valid JSON object with the following structure:
            {
              "title": "Short catchy title",
              "passage": "A 200-300 word interesting story or educational passage",
              "questions": [
                {
                  "question_text": "...",
                  "question_type": "mcq",
                  "points": 1,
                  "options": [
                    {"option_text": "...", "is_correct": 1},
                    {"option_text": "...", "is_correct": 0},
                    {"option_text": "...", "is_correct": 0},
                    {"option_text": "...", "is_correct": 0}
                  ]
                },
                ... (total 5 mcq questions)
                {
                  "question_text": "Summarize the main idea or theme of the passage in your own words.",
                  "question_type": "essay",
                  "points": 5
                }
              ]
            }
            Ensure the JSON is strictly valid. No markdown, no preamble, just the JSON.`
        },
        { role: "user", content: `Topic: ${topic}` }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error("AI: Empty response from Groq.");
      throw new Error("Empty response from AI service.");
    }

    const data = JSON.parse(content);
    console.log("AI: Reading quiz generated successfully.");
    res.json({ success: true, quiz: data });
  } catch (err) {
    console.error("AI: Generate Reading Quiz error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "AI generation failed. Please try again later." 
    });
  }
});

// AI: Generate Pronunciation Quiz
router.post("/generate-pronunciation-quiz", requireMasterAdmin, async (req, res) => {
  console.log("AI: Pronunciation Quiz Generation requested...");
  const g = requireGroq(res);
  if (!g) {
    console.error("AI: Groq service not initialized.");
    return;
  }

  const { topic, difficulty } = req.body || {};
  if (!topic || !difficulty) {
    console.warn("AI: Topic or difficulty missing in request.");
    return res.status(400).json({ success: false, error: "topic and difficulty are required." });
  }

  try {
    console.log(`AI: Generating pronunciation quiz for topic: ${topic}, difficulty: ${difficulty}`);
    let systemPrompt = "";
    if (difficulty === 'beginner') {
      systemPrompt = `Generate a Consonant Cluster (Beginner) pronunciation quiz.
        Provide 5 words focusing on consonant clusters related to the topic.
        JSON structure:
        {
          "title": "...",
          "questions": [
            {"word": "...", "correct_pronunciation": "Phonetic script or notes"}
          ]
        }`;
    } else if (difficulty === 'intermediate') {
      systemPrompt = `Generate a Word Stress (Intermediate) pronunciation quiz.
        Provide 5 words focusing on word stress related to the topic.
        JSON structure:
        {
          "title": "...",
          "questions": [
            {"word": "...", "stressed_syllable": "e.g., 2nd syllable"}
          ]
        }`;
    } else {
      systemPrompt = `Generate a Linking & Connected Speech (Advanced) pronunciation quiz.
        Provide 5 sentences focusing on linking sounds related to the topic.
        JSON structure:
        {
          "title": "...",
          "questions": [
            {"sentence": "...", "reduced_form": "..."}
          ]
        }`;
    }

    const completion = await g.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `${systemPrompt}\nReturn ONLY JSON. No markdown.`
        },
        { role: "user", content: `Topic: ${topic}` }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error("AI: Empty response from Groq.");
      throw new Error("Empty response from AI service.");
    }

    const data = JSON.parse(content);
    console.log("AI: Pronunciation quiz generated successfully.");
    res.json({ success: true, quiz: data });
  } catch (err) {
    console.error("AI: Generate Pronunciation Quiz error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "AI generation failed. Please try again later." 
    });
  }
});

module.exports = router;
