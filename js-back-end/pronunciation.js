const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const path = require("path");
const fetch = require("node-fetch");
require("dotenv").config();
const Groq = require("groq-sdk");
const { nowPhilippineDatetime } = require("./utils/datetime");

let groq = null;
try {
  const key = String(process.env.GROQ_API_KEY || "").trim();
  if (key) groq = new Groq({ apiKey: key });
} catch (e) {
  groq = null;
}

function requireGroq(res) {
  if (groq) return groq;
  res.status(500).json({
    success: false,
    message: "AI service is not configured. Set GROQ_API_KEY in your environment."
  });
  return null;
}

/** Ensure first letter is uppercase when saving to DB. */
function capitalizeFirst(s) {
  if (s == null || typeof s !== "string") return s;
  const t = String(s).trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Multer storage (S3 if configured, otherwise local disk)
const hasS3 =
  String(process.env.AWS_BUCKET_NAME || "").trim() &&
  String(process.env.AWS_ACCESS_KEY_ID || "").trim() &&
  String(process.env.AWS_SECRET_ACCESS_KEY || "").trim() &&
  String(process.env.AWS_REGION || "").trim();

let upload;
if (hasS3) {
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  upload = multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_BUCKET_NAME,
      key: (req, file, cb) => {
        const filename = `pronunciation/${Date.now()}-${file.originalname}`;
        cb(null, filename);
      },
    }),
  });
} else {
  const uploadDir = path.join(__dirname, "uploads", "pronunciation");
  try {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  } catch (_) {}

  upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadDir),
      filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    }),
  });
}


// ================= CREATE PRONUNCIATION QUIZ =================
router.post("/api/pronunciation-quizzes", async (req, res) => {
  const pool = req.pool;
  try {
    const { title, difficulty, passage, questions, subject_id, user_id } = req.body;
    const validSubjectId = subject_id != null ? subject_id : 1;

    if (!title || !difficulty || !questions || questions.length === 0 || !user_id) {
      return res.status(400).json({ message: "All fields including user_id are required" });
    }

    const safeTitle = capitalizeFirst(title);
    const safePassage = passage != null ? capitalizeFirst(passage) : passage;

    // Insert quiz record into teacher_pronunciation_quizzes
    const [quizResult] = await pool.execute(
      `INSERT INTO teacher_pronunciation_quizzes 
        (subject_id, user_id, title, difficulty, passage) 
       VALUES (?, ?, ?, ?, ?)`,
      [validSubjectId, user_id, safeTitle, difficulty, safePassage]
    );
    const quizId = quizResult.insertId;

    // Insert questions depending on difficulty
    if (difficulty === "beginner") {
      for (const q of questions) {
        await pool.execute(
          `INSERT INTO teacher_pronunciation_beginner_questions 
            (quiz_id, word, correct_pronunciation) 
           VALUES (?, ?, ?)`,
          [quizId, capitalizeFirst(q.word), q.stressed_form]
        );
      }
    } else if (difficulty === "intermediate") {
      for (const q of questions) {
        await pool.execute(
          `INSERT INTO teacher_pronunciation_intermediate_questions 
            (quiz_id, word, stressed_syllable) 
           VALUES (?, ?, ?)`,
          [quizId, capitalizeFirst(q.word), q.stressed_form]
        );
      }
    } else if (difficulty === "advanced") {
      for (const q of questions) {
        await pool.execute(
          `INSERT INTO teacher_pronunciation_advanced_questions 
            (quiz_id, sentence, reduced_form, full_sentence) 
           VALUES (?, ?, ?, ?)`,
          [quizId, capitalizeFirst(q.sentence), q.reduced_form, capitalizeFirst(q.full_sentence)]
        );
      }
    }

    res.json({ message: "Teacher pronunciation quiz created successfully", quizId });
  } catch (err) {
    console.error("Error creating quiz:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= GET ALL PRONUNCIATION QUIZZES =================
router.get("/api/pronunciation-quizzes", async (req, res) => {
  const pool = req.pool;
  const studentId = req.query.student_id; // optional
  const subjectId = req.query.subject_id;

  try {
    let query = "SELECT * FROM pronunciation_quizzes";
    const params = [];

    // ✅ Add WHERE clause if subjectId exists
    if (subjectId) {
      query += " WHERE subject_id = ?";
      params.push(subjectId);
    }

    // Prefer track order if present
    query += " ORDER BY quiz_number ASC, created_at ASC";

    // ✅ Fetch quizzes from DB
    const [quizzes] = await pool.query(query, params);

    // New flow: subject-based progression locking (1..20)
    if (studentId && subjectId) {
      const [[progress]] = await pool.query(
        `SELECT unlocked_quiz_number
         FROM pronunciation_student_progress
         WHERE student_id = ? AND subject_id = ?`,
        [studentId, subjectId]
      );

      const unlockedQuizNumber = Math.max(1, Number(progress?.unlocked_quiz_number || 1));

      await pool.query(
        `INSERT INTO pronunciation_student_progress (student_id, subject_id, unlocked_quiz_number)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE unlocked_quiz_number = unlocked_quiz_number`,
        [studentId, subjectId]
      );

      quizzes.forEach(q => {
        const qn = Number(q.quiz_number || 1);
        const isFirst = qn === 1;
        // Quiz #1 is always available; others depend on status + progression
        q.is_locked = (!isFirst && (q.status !== "active")) || (!isFirst && (qn > unlockedQuizNumber));
        q.unlocked_quiz_number = unlockedQuizNumber;
      });
    } else if (studentId) {
      // Back-compat schedule/status based locking
      const [attempts] = await pool.query(
        "SELECT * FROM pronunciation_quiz_attempts WHERE student_id = ?",
        [studentId]
      );

      const now = new Date();
      quizzes.forEach(quiz => {
        const attempt = attempts.find(a => a.quiz_id === quiz.quiz_id);

        if (attempt) {
          const endTime = attempt.end_time ? new Date(attempt.end_time) : null;
          quiz.is_locked = endTime && now > endTime;
        } else {
          quiz.is_locked = quiz.status !== 'active';
        }
      });
    } else {
      quizzes.forEach(q => q.is_locked = q.status !== 'active');
    }

    res.json(quizzes);
  } catch (err) {
    console.error("❌ Get pronunciation quizzes error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ================= GET SINGLE PRONUNCIATION QUIZ =================
router.get("/api/pronunciation-quizzes/:id", async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;

  try {
    const [quizRows] = await pool.query(
      "SELECT * FROM pronunciation_quizzes WHERE quiz_id = ?",
      [id]
    );

    if (quizRows.length === 0)
      return res.status(404).json({ success: false, message: "Quiz not found" });

    const quiz = quizRows[0];

    // fetch questions based on difficulty
    let questionQuery = "";
    switch (quiz.difficulty) {
      case "beginner":
        questionQuery = `
          SELECT question_id, word, correct_pronunciation AS answer, position
          FROM pronunciation_beginner_questions
          WHERE quiz_id = ?
          ORDER BY position ASC
        `;
        break;
      case "intermediate":
        questionQuery = `
          SELECT question_id, word, stressed_syllable AS answer, position
          FROM pronunciation_intermediate_questions
          WHERE quiz_id = ?
          ORDER BY position ASC
        `;
        break;
      case "advanced":
        questionQuery = `
          SELECT question_id, sentence, reduced_form AS answer, full_sentence, position
          FROM pronunciation_advanced_questions
          WHERE quiz_id = ?
          ORDER BY position ASC
        `;
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid difficulty" });
    }

    const [questions] = await pool.query(questionQuery, [id]);
    quiz.questions = questions || [];

    // mark locked based on status
    quiz.is_locked = quiz.status !== "active";

    res.json(quiz);
  } catch (err) {
    console.error("❌ Get single quiz error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ================= GET TEACHER'S PRONUNCIATION QUIZZES =================
router.get("/api/teacher/pronunciation-quizzes", async (req, res) => {
  const pool = req.pool;
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({ success: false, message: "user_id is required" });
  }

  try {
    const [quizzes] = await pool.query(
      `SELECT q.*, s.subject_name AS subject_name
      FROM teacher_pronunciation_quizzes q
      JOIN subjects s ON q.subject_id = s.subject_id
      WHERE q.user_id = ?
      ORDER BY q.created_at DESC`,
      [userId]
    );

    quizzes.forEach(q => q.is_locked = false); // default

    res.json(quizzes);
  } catch (err) {
    console.error("❌ Get teacher quizzes error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ================= UPDATE QUIZ SCHEDULE / UNLOCK QUIZ =================
router.patch("/api/pronunciation-quizzes/:id/schedule", async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  let { unlock_time, lock_time, time_limit, retake_option, allowed_students } = req.body;

  try {
    // Accept either datetime-local or ISO; store as MySQL DATETIME.
    const toMySqlDateTime = (value) => {
      if (!value) return null;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 19).replace("T", " ");
      }
      if (typeof value === "string" && value.includes("T") && value.length === 16) {
        return value.replace("T", " ") + ":00";
      }
      return value;
    };

    unlock_time = toMySqlDateTime(unlock_time);
    lock_time = toMySqlDateTime(lock_time);

    // Use status as the main reference: 'active' = unlocked, 'locked' = locked
    await pool.query(
      `UPDATE pronunciation_quizzes
        SET unlock_time = ?, 
            lock_time = ?, 
            status = 'active', 
            retake_option = ?, 
            allowed_students = ?, 
            time_limit = ?
        WHERE quiz_id = ?`,
      [
        unlock_time,
        lock_time,
        retake_option || "all",
        allowed_students ? JSON.stringify(allowed_students) : null,
        time_limit,
        id
      ]
    );

    res.json({ success: true, message: "Quiz unlocked and scheduled", status: 'active' });
  } catch (err) {
    console.error("❌ Schedule update error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ================= LOCK QUIZ IMMEDIATELY =================
router.put("/api/lock-pronunciation-quiz/:id", async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;

  try {
    await pool.query(
      `UPDATE pronunciation_quizzes
        SET status = 'closed'
        WHERE quiz_id = ?`,
      [id]
    );

    res.json({ success: true, message: "Quiz locked successfully", status: 'locked' });
  } catch (err) {
    console.error("❌ Lock quiz error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ================= GET STUDENT PRONUNCIATION ATTEMPTS =================
// When class_id is provided, only attempts for that class are returned (no cross-class data).
router.get("/api/pronunciation-attempts", async (req, res) => {
  const pool = req.pool;
  const { student_id, class_id } = req.query;

  if (!student_id) {
    return res.status(400).json({ success: false, message: "Missing student_id" });
  }

  try {
    const classIdParam = class_id != null && class_id !== "" ? Number(class_id) : null;
    const conditions = ["pa.student_id = ?"];
    const params = [student_id];
    if (classIdParam != null && Number.isFinite(classIdParam)) {
      conditions.push("pa.class_id = ?");
      params.push(classIdParam);
    }
    const [attempts] = await pool.query(
      `
      SELECT 
        pa.attempt_id,
        pa.quiz_id,
        pa.start_time,
        pa.end_time,
        pa.status,
        pq.title,
        pq.difficulty,
        pq.lock_time,
        pq.unlock_time,
        ROUND(AVG(ans.pronunciation_score), 2) AS average_accuracy
      FROM pronunciation_quiz_attempts pa
      JOIN pronunciation_quizzes pq 
        ON pa.quiz_id = pq.quiz_id
      LEFT JOIN pronunciation_quiz_answers ans 
        ON pa.attempt_id = ans.attempt_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY pa.attempt_id
      ORDER BY pa.start_time DESC
      `,
      params
    );

    res.json({ success: true, attempts });
  } catch (err) {
    console.error("❌ Error fetching pronunciation attempts:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ==================== Handle Pronunciation Quiz Submission ====================
router.post("/api/pronunciation-submit", upload.any(), async (req, res) => {
  const pool = req.pool;

  try {
    const { student_id, quiz_id, class_id } = req.body;
    const files = req.files;
    const classIdParam = class_id != null && class_id !== "" ? Number(class_id) : null;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "No audio files uploaded" });
    }

    // 1️⃣ Fetch quiz difficulty
    const [quizRows] = await pool.query(
      "SELECT difficulty FROM pronunciation_quizzes WHERE quiz_id = ?",
      [quiz_id]
    );
    if (!quizRows.length) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }
    const quizDifficulty = quizRows[0].difficulty;

    // 2️⃣ Create a new quiz attempt (scoped to class when provided)
    const attemptNow = nowPhilippineDatetime();
    const [attemptResult] = await pool.query(
      `INSERT INTO pronunciation_quiz_attempts 
         (student_id, quiz_id, class_id, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, 'completed')`,
      [student_id, quiz_id, classIdParam, attemptNow, attemptNow]
    );
    const attempt_id = attemptResult.insertId;

    let totalAccuracy = 0;
    let answerCount = 0;

    // 3️⃣ Save each answer
    for (let i = 0; i < files.length; i++) {
      const question_id = req.body[`question_id_${i}`];
      const transcript = req.body[`answer_${i}`] || '';
      const file = files.find(f => f.fieldname === `audio_${i}`);
      if (!file) continue;

      const fileUrl = file.location || `/uploads/${file.filename}`;
      let difficulty = req.body[`difficulty_${i}`];

      // Use quiz difficulty if missing or invalid
      if (!difficulty || !['beginner','intermediate','advanced'].includes(difficulty)) {
        difficulty = quizDifficulty;
      }

      // Simulate fake pronunciation accuracy (70–100%)
      const fakeAccuracy = Math.floor(70 + Math.random() * 30);
      totalAccuracy += fakeAccuracy;
      answerCount++;

      await pool.query(
        `INSERT INTO pronunciation_quiz_answers
          (attempt_id, question_id, difficulty, student_audio, transcript, pronunciation_score)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [attempt_id, question_id, difficulty, fileUrl, transcript, fakeAccuracy]
      );
    }

    // 4️⃣ Compute overall accuracy
    const avgAccuracy = (totalAccuracy / answerCount).toFixed(2);

    await pool.query(
      `UPDATE pronunciation_quiz_attempts
         SET score = ?, pronunciation_score = ?, total_points = ?, end_time = ?, status = 'completed'
       WHERE attempt_id = ?`,
      [avgAccuracy, avgAccuracy, 100, nowPhilippineDatetime(), attempt_id]
    );

    // 5️⃣ Unlock next quiz in the subject track if passed
    let unlockedNext = false;
    let unlocked_quiz_number = null;

    try {
      const [[meta]] = await pool.query(
        `SELECT q.subject_id, q.quiz_number, q.passing_score
         FROM pronunciation_quizzes q
         WHERE q.quiz_id = ?`,
        [quiz_id]
      );

      if (meta?.subject_id) {
        const quizNumber = Number(meta.quiz_number || 1);
        const passing = Number(meta.passing_score ?? 70);
        const percent = Number(avgAccuracy);

        // If passing_score <= 0, unlock next on completion (no minimum accuracy).
        if (passing <= 0 || percent >= passing) {
          const next = Math.max(2, quizNumber + 1);
          await pool.query(
            `INSERT INTO pronunciation_student_progress (student_id, subject_id, unlocked_quiz_number)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
               unlocked_quiz_number = GREATEST(unlocked_quiz_number, VALUES(unlocked_quiz_number))`,
            [student_id, meta.subject_id, next]
          );

          const [[p]] = await pool.query(
            `SELECT unlocked_quiz_number
             FROM pronunciation_student_progress
             WHERE student_id = ? AND subject_id = ?`,
            [student_id, meta.subject_id]
          );
          unlocked_quiz_number = Number(p?.unlocked_quiz_number || next);
          unlockedNext = true;
        }
      }
    } catch (e) {
      console.warn("⚠️ Pronunciation unlock progression skipped:", e?.message || e);
    }

    res.json({
      success: true,
      message: "Pronunciation quiz submitted successfully.",
      accuracy: avgAccuracy,
      unlockedNext,
      unlocked_quiz_number
    });

  } catch (err) {
    console.error("❌ Pronunciation submission error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// backend: GET /api/pronunciation-review
router.get("/api/pronunciation-review", async (req, res) => {
  const pool = req.pool;
  try {
    const { student_id, quiz_id } = req.query;

    // fetch quiz
    const [quizRows] = await pool.query(
      "SELECT * FROM pronunciation_quizzes WHERE quiz_id = ?",
      [quiz_id]
    );
    const quiz = quizRows[0] || null;

    // fetch answers and include correct pronunciation fields
    const [answers] = await pool.query(
      `
      SELECT a.*,
             CASE
               WHEN a.difficulty = 'beginner' THEN b.word
               WHEN a.difficulty = 'intermediate' THEN i.word
               WHEN a.difficulty = 'advanced' THEN adv.sentence
               ELSE ''
             END AS question_text,
             CASE
               WHEN a.difficulty = 'beginner' THEN b.correct_pronunciation
               WHEN a.difficulty = 'intermediate' THEN i.stressed_syllable
               WHEN a.difficulty = 'advanced' THEN adv.reduced_form
               ELSE ''
             END AS correct_pronunciation
      FROM pronunciation_quiz_answers a
      JOIN pronunciation_quiz_attempts t ON a.attempt_id = t.attempt_id
      LEFT JOIN pronunciation_beginner_questions b ON a.question_id = b.question_id
      LEFT JOIN pronunciation_intermediate_questions i ON a.question_id = i.question_id
      LEFT JOIN pronunciation_advanced_questions adv ON a.question_id = adv.question_id
      WHERE t.student_id = ? AND t.quiz_id = ? AND t.status IN ('submitted','completed')
      ORDER BY a.evaluated_at ASC
      `,
      [student_id, quiz_id]
    );

    res.json({ success: true, quiz, answers });
  } catch (err) {
    console.error("❌ Pronunciation review fetch error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// ================= TEACHER: LIST ATTEMPTS FOR A QUIZ (OPTIONAL CLASS FILTER) =================
router.get("/api/teacher/pronunciation-attempts", async (req, res) => {
  const pool = req.pool;
  const quizId = req.query.quiz_id ? Number(req.query.quiz_id) : null;
  const classId = req.query.class_id ? Number(req.query.class_id) : null;

  if (!quizId) return res.status(400).json({ success: false, error: "quiz_id is required" });

  try {
    // When class_id is provided, only show attempts for that class (no cross-class data).
    const classCondition = (classId != null && Number.isFinite(classId)) ? " AND a.class_id = ?" : "";
    const params = [classId || null, quizId, ...(classCondition ? [classId] : [])];
    const [rows] = await pool.query(
      `
      SELECT 
        a.attempt_id,
        a.student_id,
        CONCAT(u.fname, ' ', u.lname) AS student_name,
        a.score,
        a.pronunciation_score,
        a.status,
        a.start_time,
        a.end_time,
        sc.status AS class_status
      FROM pronunciation_quiz_attempts a
      JOIN users u ON a.student_id = u.user_id
      LEFT JOIN student_classes sc
        ON sc.student_id = a.student_id
        AND sc.class_id = ?
      WHERE a.quiz_id = ? ${classCondition}
      ORDER BY a.end_time DESC, a.attempt_id DESC
      `,
      params
    );

    res.json({ success: true, attempts: rows });
  } catch (err) {
    console.error("❌ Teacher pronunciation attempts error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ================= TEACHER: GET ANSWERS FOR A PRONUNCIATION ATTEMPT =================
router.get("/api/teacher/pronunciation-attempts/:attemptId", async (req, res) => {
  const pool = req.pool;
  const attemptId = Number(req.params.attemptId);

  if (!attemptId) return res.status(400).json({ success: false, error: "Invalid attemptId" });

  try {
    const [[attempt]] = await pool.query(
      `SELECT a.*, q.title, q.difficulty AS quiz_difficulty, q.subject_id, q.quiz_id
       FROM pronunciation_quiz_attempts a
       JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
       WHERE a.attempt_id = ?`,
      [attemptId]
    );
    if (!attempt) return res.status(404).json({ success: false, error: "Attempt not found" });

    const [answers] = await pool.query(
      `
      SELECT a.*,
             CASE
               WHEN a.difficulty = 'beginner' THEN b.word
               WHEN a.difficulty = 'intermediate' THEN i.word
               WHEN a.difficulty = 'advanced' THEN adv.sentence
               ELSE ''
             END AS question_text,
             CASE
               WHEN a.difficulty = 'beginner' THEN b.correct_pronunciation
               WHEN a.difficulty = 'intermediate' THEN i.stressed_syllable
               WHEN a.difficulty = 'advanced' THEN adv.reduced_form
               ELSE ''
             END AS correct_pronunciation
      FROM pronunciation_quiz_answers a
      LEFT JOIN pronunciation_beginner_questions b ON a.question_id = b.question_id
      LEFT JOIN pronunciation_intermediate_questions i ON a.question_id = i.question_id
      LEFT JOIN pronunciation_advanced_questions adv ON a.question_id = adv.question_id
      WHERE a.attempt_id = ?
      ORDER BY a.evaluated_at ASC
      `,
      [attemptId]
    );

    res.json({ success: true, attempt, answers });
  } catch (err) {
    console.error("❌ Teacher pronunciation attempt fetch error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ================= TEACHER: OVERRIDE PRONUNCIATION SCORES =================
router.patch("/api/teacher/pronunciation-attempts/:attemptId/override", async (req, res) => {
  const pool = req.pool;
  const attemptId = Number(req.params.attemptId);
  const teacherId = req.body.teacher_id ? Number(req.body.teacher_id) : null;
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];

  if (!attemptId) return res.status(400).json({ success: false, error: "Invalid attemptId" });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    for (const a of answers) {
      if (!a || !a.answer_id) continue;
      const teacherScore = a.teacher_score == null ? null : Number(a.teacher_score);
      const teacherNotes = typeof a.teacher_notes === "string" ? a.teacher_notes : null;

      await conn.query(
        `UPDATE pronunciation_quiz_answers
         SET teacher_score = ?,
             teacher_notes = COALESCE(?, teacher_notes),
             teacher_id = ?,
             teacher_updated_at = ?
         WHERE answer_id = ? AND attempt_id = ?`,
        [teacherScore, teacherNotes, teacherId, nowPhilippineDatetime(), a.answer_id, attemptId]
      );
    }

    // Recompute attempt score as average of teacher_score (fallback to pronunciation_score)
    const [[avg]] = await conn.query(
      `SELECT ROUND(AVG(COALESCE(teacher_score, pronunciation_score)), 2) AS avgScore
       FROM pronunciation_quiz_answers
       WHERE attempt_id = ?`,
      [attemptId]
    );

    const avgScore = Number(avg?.avgScore || 0);

    await conn.query(
      `UPDATE pronunciation_quiz_attempts
       SET score = ?, pronunciation_score = ?
       WHERE attempt_id = ?`,
      [avgScore, avgScore, attemptId]
    );

    // Unlock next quiz if override makes the student pass (or passing_score <= 0)
    let unlockedNext = false;
    let unlocked_quiz_number = null;

    const [[meta]] = await conn.query(
      `SELECT a.student_id, q.subject_id, q.quiz_number, q.passing_score
       FROM pronunciation_quiz_attempts a
       JOIN pronunciation_quizzes q ON q.quiz_id = a.quiz_id
       WHERE a.attempt_id = ?`,
      [attemptId]
    );

    if (meta?.student_id && meta?.subject_id) {
      const quizNumber = Number(meta.quiz_number || 1);
      const passing = Number(meta.passing_score ?? 70);
      if (passing <= 0 || avgScore >= passing) {
        const next = Math.max(2, quizNumber + 1);
        await conn.query(
          `INSERT INTO pronunciation_student_progress (student_id, subject_id, unlocked_quiz_number)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             unlocked_quiz_number = GREATEST(unlocked_quiz_number, VALUES(unlocked_quiz_number))`,
          [meta.student_id, meta.subject_id, next]
        );
        const [[p]] = await conn.query(
          `SELECT unlocked_quiz_number
           FROM pronunciation_student_progress
           WHERE student_id = ? AND subject_id = ?`,
          [meta.student_id, meta.subject_id]
        );
        unlocked_quiz_number = Number(p?.unlocked_quiz_number || next);
        unlockedNext = true;
      }
    }

    await conn.commit();
    res.json({ success: true, accuracy: avgScore, unlockedNext, unlocked_quiz_number });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Teacher pronunciation override error:", err);
    res.status(500).json({ success: false, error: "Failed to save override" });
  } finally {
    if (conn) conn.release();
  }
});

router.get("/api/leaderboard", async (req, res) => {
  const pool = req.pool;
  const { quiz_id, class_id } = req.query;

  if (!quiz_id) {
    return res.status(400).json({ success: false, message: "Missing quiz_id" });
  }

  try {
    const params = [quiz_id, class_id || null, class_id || null];

    const sql = `
      SELECT a.attempt_id, a.student_id, a.score, a.status, a.start_time, a.end_time,
             u.fname, u.lname
      FROM pronunciation_quiz_attempts a
      JOIN users u ON a.student_id = u.user_id
      LEFT JOIN student_classes sc 
             ON sc.student_id = a.student_id 
             AND sc.status = 'accepted'
      WHERE a.quiz_id = ?
        AND (? IS NULL OR sc.class_id = ?)
      ORDER BY a.score DESC, a.end_time ASC
    `;

    const [rows] = await pool.query(sql, params);

    // Tie-aware ranking
    let lastScore = null;
    let rank = 0;
    let skip = 0;
    const leaderboard = rows.map((r, i) => {
      if (r.score !== lastScore) {
        rank = rank + 1 + skip;
        skip = 0;
        lastScore = r.score;
      } else {
        skip++;
      }
      return {
        rank,
        student_id: r.student_id,
        name: `${r.fname} ${r.lname}`,
        score: r.score,
        status: r.status,
        start_time: r.start_time,
        end_time: r.end_time
      };
    });

    res.json({ success: true, leaderboard });

  } catch (err) {
    console.error("❌ Leaderboard fetch error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

router.get('/api/lessons-with-topics', async (req, res) => {
  const pool = req.pool;
  const classId = req.query.class_id;

  if (!classId) {
    return res.status(400).json({ error: 'Missing class_id' });
  }

  try {
    // ✅ Step 1: Get the subject name from the class
    const [classRows] = await pool.query('SELECT subject FROM classes WHERE id = ?', [classId]);
    if (classRows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const subjectName = classRows[0].subject?.trim() || '';

    // ✅ Step 2: Match the subject name to the corresponding subject_id
    const subjectMapping = {
      "Reading and Writing Skills": 1,
      "Oral Communication in Context": 2,
      "Creative Writing": 3,
      "Creative Non-Fiction": 4,
      "English for Academic and Professional Purposes": 5,
    };

    // Normalize for flexible matches
    const normalized = subjectName.toLowerCase();
    const subjectId =
      normalized.includes("oral") ? 2 :
      normalized.includes("reading") ? 1 :
      normalized.includes("creative writing") ? 3 :
      normalized.includes("creative non") ? 4 :
      normalized.includes("academic") ? 5 :
      subjectMapping[subjectName];

    if (!subjectId) {
      return res.status(404).json({ error: `No subject_id found for "${subjectName}"` });
    }

    // ✅ Step 3: Fetch lessons for that subject (include quarter for display grouping)
    const [lessons] = await pool.query(
      'SELECT lesson_id, lesson_title, quarter_number, quarter_title FROM lessons WHERE subject_id = ? ORDER BY lesson_id',
      [subjectId]
    );

    if (lessons.length === 0) {
      return res.json([]);
    }

    // ✅ Step 4: Fetch topics for those lessons
    const [topics] = await pool.query(
      'SELECT topic_id, topic_title, lesson_id FROM topics WHERE lesson_id IN (?)',
      [lessons.map(l => l.lesson_id)]
    );

    // ✅ Step 5: Combine lessons + topics (include quarter_number, quarter_title for exam generator / lessons UI)
    const data = lessons.map(lesson => ({
      lesson_id: lesson.lesson_id,
      lesson_title: lesson.lesson_title,
      quarter_number: lesson.quarter_number != null ? lesson.quarter_number : null,
      quarter_title: lesson.quarter_title ? String(lesson.quarter_title).trim() : null,
      topics: topics.filter(t => t.lesson_id === lesson.lesson_id)
    }));

    res.json(data);
  } catch (err) {
    console.error('Error fetching lessons and topics:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post("/api/generate-pronunciation-quiz", async (req, res) => {
  const pool = req.pool;
  const { topic_id, difficulty, num_questions, additional_context } = req.body;

  if (!topic_id || !difficulty || !num_questions) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const client = requireGroq(res);
    if (!client) return;

    const [topicRows] = await pool.query("SELECT topic_title FROM topics WHERE topic_id = ?", [topic_id]);
    if (!topicRows.length) return res.status(404).json({ success: false, message: "Topic not found" });

    const topicTitle = topicRows[0].topic_title;

    // Build prompt based on difficulty
    let instruction = "";
    if (difficulty === "beginner") {
      instruction = `Generate ${num_questions} beginner-level consonant cluster pronunciation words for high school students.
Output plain text: one line per word in format "word: correct pronunciation (IPA)".
No extra text.`;
    } else if (difficulty === "intermediate") {
      instruction = `Generate ${num_questions} intermediate-level word stress pronunciation words for high school students.
Output plain text: one line per word in format "word: stressed syllables like ex-AM-ple".
No extra text.`;
    } else if (difficulty === "advanced") {
      instruction = `Generate ${num_questions} advanced reduced/linked form pronunciation examples for high school students.
Output plain text: one line per sentence in format "sentence with blank: reduced/linked pronunciation".
No extra text.`;
    }

    if (additional_context) instruction += `\nAdditional context: ${additional_context}`;

    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are an educational quiz generator that outputs clean plain text for pronunciation quizzes." },
        { role: "user", content: instruction }
      ],
    });

    const quizContent = completion.choices?.[0]?.message?.content || "";
    if (!quizContent) return res.status(500).json({ success: false, message: "No quiz content returned" });

    res.json({ success: true, quiz: quizContent });

  } catch (err) {
    console.error("Error generating pronunciation quiz:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/api/save-pronunciation-quiz", async (req, res) => {
    const pool = req.pool;
    const { teacher_id, subject_id, difficulty, passage, questions } = req.body;

    if (!teacher_id || !subject_id || !difficulty || !questions?.length) {
        return res.status(400).json({ success: false, message: "Missing required fields or no questions provided" });
    }

    try {
        const safePassage = passage != null ? capitalizeFirst(passage) : passage;

        // Insert the main quiz
        const [result] = await pool.query(
            "INSERT INTO ai_quiz_pronunciation (teacher_id, subject_id, difficulty, passage) VALUES (?, ?, ?, ?)",
            [teacher_id, subject_id, difficulty, safePassage]
        );

        const quizId = result.insertId;

        // Insert all questions in parallel
        await Promise.all(
            questions.map(q =>
                pool.query(
                    "INSERT INTO ai_quiz_pronunciation_questions (quiz_id, word, answer) VALUES (?, ?, ?)",
                    [quizId, capitalizeFirst(q.word), capitalizeFirst(q.answer)]
                )
            )
        );

        res.json({ success: true, quiz_id: quizId });
    } catch (err) {
        console.error("Error saving AI quiz:", err);
        res.status(500).json({ success: false, message: "Server error while saving quiz." });
    }
});


module.exports = router;



