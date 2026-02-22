const express = require("express");
const router = express.Router();
require("dotenv").config();
const Groq = require("groq-sdk");

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

/** Ensure first letter is uppercase when saving to DB (e.g. AI quiz, titles). */
function capitalizeFirst(s) {
  if (s == null || typeof s !== "string") return s;
  const t = String(s).trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const { nowPhilippineDatetime } = require("./utils/datetime");

// ================= CREATE TEACHER READING QUIZ =================
router.post("/api/teacher/reading-quizzes", async (req, res) => {
    const pool = req.pool;
    const { title, difficulty, passage, questions, subject_id, user_id } = req.body; // user_id from frontend
    const effectiveDifficulty = difficulty || "beginner";

    if (!user_id) {
        return res.status(400).json({ success: false, message: "user_id is required" });
    }

    const safeTitle = capitalizeFirst(title);
    const safePassage = capitalizeFirst(passage);

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Insert quiz (difficulty defaults to beginner for AI-generated quizzes)
        const [quizResult] = await conn.query(
            "INSERT INTO teacher_reading_quizzes (subject_id, user_id, title, difficulty, passage) VALUES (?, ?, ?, ?, ?)",
            [subject_id, user_id, safeTitle, effectiveDifficulty, safePassage]
        );
        const quizId = quizResult.insertId;

        // Insert questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            if (effectiveDifficulty === "beginner" && q.question_type === "mcq") {
                // Beginner MCQ
                const [qResult] = await conn.query(
                    "INSERT INTO teacher_reading_beginner_questions (quiz_id, question_text) VALUES (?, ?)",
                    [quizId, capitalizeFirst(q.question_text)]
                );
                const questionId = qResult.insertId;

                // Insert options
                for (let j = 0; j < q.options.length; j++) {
                    const opt = q.options[j];
                    await conn.query(
                        "INSERT INTO teacher_reading_mcq_options (question_id, option_text, is_correct, position) VALUES (?, ?, ?, ?)",
                        [questionId, capitalizeFirst(opt.option_text), opt.is_correct ? 1 : 0, j + 1]
                    );
                }
            } 
            else if (effectiveDifficulty === "intermediate" && q.question_type === "fill_blank") {
                // Intermediate Fill-in-the-blank
                const [qResult] = await conn.query(
                    "INSERT INTO teacher_reading_intermediate_questions (quiz_id, question_text) VALUES (?, ?)",
                    [quizId, capitalizeFirst(q.question_text)]
                );
                const questionId = qResult.insertId;

                // Insert blanks
                for (let b = 0; b < q.blanks.length; b++) {
                    const blank = q.blanks[b];
                    await conn.query(
                        "INSERT INTO teacher_reading_fill_blanks (question_id, blank_number, answer_text, points) VALUES (?, ?, ?, ?)",
                        [questionId, blank.blank_number, capitalizeFirst(blank.answer_text), blank.points || 1.0]
                    );
                }
            } 
            else if (effectiveDifficulty === "advanced" && q.question_type === "essay") {
                // Advanced Essay
                await conn.query(
                    "INSERT INTO teacher_reading_advanced_questions (quiz_id, question_text, points) VALUES (?, ?, ?)",
                    [quizId, capitalizeFirst(q.question_text), q.points || 1.0]
                );
            }
        }

        await conn.commit();
        res.json({ success: true, message: "Teacher reading quiz created successfully", quizId });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("❌ Create teacher reading quiz error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    } finally {
        if (conn) conn.release();
    }
});


// ================= GET ALL QUIZZES =================
router.get("/api/reading-quizzes", async (req, res) => {
  const pool = req.pool;
  const studentId = req.query.student_id;
  const subjectId = req.query.subject_id; // 👈 added filter

  try {
    let query = "SELECT * FROM reading_quizzes";
    const params = [];

    // 👇 If subject_id is provided, add WHERE clause
    if (subjectId) {
      query += " WHERE subject_id = ?";
      params.push(subjectId);
    }

    // Prefer track order if present
    query += " ORDER BY quiz_number ASC, created_at ASC";

    const [quizzes] = await pool.query(query, params);

    // New flow: subject-based progression locking (1..20)
    // Only applied when both student_id and subject_id are provided.
    if (studentId && subjectId) {
      const [[progress]] = await pool.query(
        `SELECT unlocked_quiz_number
         FROM reading_student_progress
         WHERE student_id = ? AND subject_id = ?`,
        [studentId, subjectId]
      );

      const unlockedQuizNumber = Math.max(1, Number(progress?.unlocked_quiz_number || 1));

      // Ensure a progress row exists (idempotent)
      await pool.query(
        `INSERT INTO reading_student_progress (student_id, subject_id, unlocked_quiz_number)
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
      // Back-compat: keep schedule-based lock logic when subject_id isn't provided
      const [attempts] = await pool.query(
        "SELECT * FROM reading_quiz_attempts WHERE student_id = ?",
        [studentId]
      );

      quizzes.forEach(quiz => {
        const attempt = attempts.find(a => a.quiz_id === quiz.quiz_id);
        const now = new Date();

        if (attempt) {
          const endTime = attempt.end_time ? new Date(attempt.end_time) : null;
          quiz.is_locked = endTime && now > endTime;
        } else {
          const unlock = quiz.unlock_time ? new Date(quiz.unlock_time) : null;
          const lock = quiz.lock_time ? new Date(quiz.lock_time) : null;
          quiz.is_locked = !(unlock && now >= unlock && (!lock || now <= lock));
        }
      });
    }

    res.json(quizzes);
  } catch (err) {
    console.error("❌ Get quizzes error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ================= TEACHER READING QUIZZES =================
// GET ?user_id=X → teacher's own quizzes (teacher view)
// GET ?subject_id=X → all teacher quizzes for that subject (student "Created by teacher" view)
router.get("/api/teacher/reading-quizzes", async (req, res) => {
  const pool = req.pool;
  const userId = req.query.user_id;
  const subjectId = req.query.subject_id;

  try {
    let query, params;
    if (userId) {
      query = "SELECT * FROM teacher_reading_quizzes WHERE user_id = ?";
      params = [userId];
      if (subjectId) {
        query += " AND subject_id = ?";
        params.push(subjectId);
      }
    } else if (subjectId) {
      query = "SELECT * FROM teacher_reading_quizzes WHERE subject_id = ?";
      params = [subjectId];
    } else {
      return res.status(400).json({ error: "Provide user_id (teacher) or subject_id (student view)" });
    }

    const [quizzes] = await pool.query(query, params);

    // Optionally, you can include question counts per difficulty
    for (const quiz of quizzes) {
      let questionTable;
      if (quiz.difficulty === 'beginner') questionTable = 'teacher_reading_beginner_questions';
      else if (quiz.difficulty === 'intermediate') questionTable = 'teacher_reading_intermediate_questions';
      else questionTable = 'teacher_reading_advanced_questions';

      const [questions] = await pool.query(
        `SELECT COUNT(*) AS question_count FROM ${questionTable} WHERE quiz_id = ?`,
        [quiz.quiz_id]
      );

      quiz.question_count = questions[0].question_count;
    }

    res.json(quizzes);
  } catch (err) {
    console.error("❌ Get teacher quizzes error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ================= LIST QUIZ IDs WHERE STUDENT HAS COMPLETED ATTEMPT (must be before /:id) =================
router.get("/api/teacher/reading-quizzes/completed-by-student", async (req, res) => {
  const pool = req.pool;
  const studentId = req.query.student_id ? Number(req.query.student_id) : null;
  if (!studentId) return res.status(400).json({ success: false, error: "student_id required" });
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT quiz_id FROM teacher_reading_quiz_attempts
       WHERE student_id = ? AND status = 'completed'`,
      [studentId]
    );
    res.json({ success: true, quiz_ids: rows.map((r) => r.quiz_id) });
  } catch (err) {
    console.error("❌ Completed-by-student error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ================= GET REVIEW DATA (must be before /:id) =================
router.get("/api/teacher/reading-quizzes/:quizId/review", async (req, res) => {
  const pool = req.pool;
  const quizId = Number(req.params.quizId);
  const studentId = req.query.student_id ? Number(req.query.student_id) : null;
  if (!quizId || !studentId) return res.status(400).json({ success: false, error: "quiz_id and student_id required" });
  try {
    const [[quiz]] = await pool.query(
      "SELECT quiz_id, title, passage, difficulty, lock_time FROM teacher_reading_quizzes WHERE quiz_id = ?",
      [quizId]
    );
    if (!quiz) return res.status(404).json({ success: false, error: "Quiz not found" });

    const asTeacher = String(req.query.as_teacher || "").toLowerCase() === "1" || req.query.as_teacher === "true";
    if (!asTeacher) {
      const now = new Date();
      const lockTime = quiz.lock_time ? new Date(quiz.lock_time) : null;
      if (lockTime && now <= lockTime) {
        return res.status(403).json({ success: false, error: "Review is available after the quiz schedule has ended." });
      }
    }

    const [[attempt]] = await pool.query(
      `SELECT attempt_id, score, total_points, start_time, end_time
       FROM teacher_reading_quiz_attempts
       WHERE quiz_id = ? AND student_id = ? AND status = 'completed'
       ORDER BY attempt_id DESC LIMIT 1`,
      [quizId, studentId]
    );
    if (!attempt) return res.status(404).json({ success: false, error: "No completed attempt found" });

    const questionTable = quiz.difficulty === "beginner"
      ? "teacher_reading_beginner_questions"
      : quiz.difficulty === "intermediate"
        ? "teacher_reading_intermediate_questions"
        : "teacher_reading_advanced_questions";

    const [answerRows] = await pool.query(
      `SELECT a.answer_id, a.question_id, a.student_answer, a.is_correct, a.points_earned
       FROM teacher_reading_quiz_answers a
       WHERE a.attempt_id = ?
       ORDER BY a.answer_id ASC`,
      [attempt.attempt_id]
    );

    const [questionRows] = await pool.query(
      `SELECT question_id, question_text FROM ${questionTable} WHERE quiz_id = ? ORDER BY question_id ASC`,
      [quizId]
    );
    const answers = [];
    for (let i = 0; i < questionRows.length; i++) {
      const q = questionRows[i];
      const ans = answerRows.find((a) => Number(a.question_id) === Number(q.question_id));
      let options = [];
      let correctAnswerText = null;
      if (quiz.difficulty === "beginner") {
        const [opts] = await pool.query(
          "SELECT option_id, option_text, is_correct FROM teacher_reading_mcq_options WHERE question_id = ? ORDER BY position ASC",
          [q.question_id]
        );
        options = opts.map((o) => ({ option_id: o.option_id, option_text: o.option_text, is_correct: !!o.is_correct }));
        const correctOpt = opts.find((o) => o.is_correct);
        if (correctOpt) correctAnswerText = correctOpt.option_text;
      }
      answers.push({
        answer_id: ans ? ans.answer_id : null,
        question_id: q.question_id,
        question_text: q.question_text,
        question_type: "mcq",
        options,
        student_answer: ans ? ans.student_answer : null,
        is_correct: ans ? !!ans.is_correct : null,
        points_earned: ans ? ans.points_earned : null,
        correct_answer_text: correctAnswerText
      });
    }

    res.json({
      success: true,
      quiz: { quiz_id: quiz.quiz_id, title: quiz.title, passage: quiz.passage || "" },
      attempt: {
        attempt_id: attempt.attempt_id,
        score: attempt.score,
        total_points: attempt.total_points,
        end_time: attempt.end_time
      },
      answers
    });
  } catch (err) {
    console.error("❌ Review endpoint error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ================= TEACHER: OVERRIDE GRADING FOR TEACHER QUIZ ATTEMPT (AI quiz) =================
router.patch("/api/teacher/reading-quiz-attempts/:attemptId/override", async (req, res) => {
  const pool = req.pool;
  const attemptId = Number(req.params.attemptId);
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];

  if (!attemptId) return res.status(400).json({ success: false, error: "Invalid attemptId" });

  try {
    for (const a of answers) {
      if (!a || a.answer_id == null) continue;
      const isCorrect = a.is_correct == null ? null : (a.is_correct ? 1 : 0);
      const pointsEarned = isCorrect != null ? (isCorrect ? 1 : 0) : null;
      await pool.query(
        `UPDATE teacher_reading_quiz_answers
         SET is_correct = COALESCE(?, is_correct), points_earned = COALESCE(?, points_earned)
         WHERE answer_id = ? AND attempt_id = ?`,
        [isCorrect, pointsEarned, a.answer_id, attemptId]
      );
    }

    const [[totals]] = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(points_earned, 0)), 0) AS totalScore
       FROM teacher_reading_quiz_answers WHERE attempt_id = ?`,
      [attemptId]
    );
    const newScore = Number(totals?.totalScore ?? 0);
    await pool.query(
      `UPDATE teacher_reading_quiz_attempts SET score = ? WHERE attempt_id = ?`,
      [newScore, attemptId]
    );

    res.json({ success: true, score: newScore });
  } catch (err) {
    console.error("❌ Teacher quiz override error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ================= GET SINGLE TEACHER QUIZ (for students to take) =================
router.get("/api/teacher/reading-quizzes/:id", async (req, res) => {
  const pool = req.pool;
  const quizId = req.params.id;
  try {
    const [[quiz]] = await pool.query("SELECT * FROM teacher_reading_quizzes WHERE quiz_id = ?", [quizId]);
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    let questionTable;
    if (quiz.difficulty === "beginner") questionTable = "teacher_reading_beginner_questions";
    else if (quiz.difficulty === "intermediate") questionTable = "teacher_reading_intermediate_questions";
    else if (quiz.difficulty === "advanced") questionTable = "teacher_reading_advanced_questions";
    else questionTable = "teacher_reading_beginner_questions";

    const [rows] = await pool.query(`SELECT * FROM ${questionTable} WHERE quiz_id = ? ORDER BY question_id ASC`, [quizId]);
    const questions = [];

    for (const q of rows) {
      const question = { question_id: q.question_id, question_text: q.question_text || "", question_type: "mcq", options: [], blanks: [] };
      if (quiz.difficulty === "beginner") {
        const [opts] = await pool.query(
          "SELECT option_id, option_text, is_correct FROM teacher_reading_mcq_options WHERE question_id = ? ORDER BY position ASC",
          [q.question_id]
        );
        question.options = opts.map((o) => ({ option_id: o.option_id, option_text: o.option_text, is_correct: !!o.is_correct }));
      } else if (quiz.difficulty === "intermediate") {
        question.question_type = "fill_blank";
        const [blanks] = await pool.query(
          "SELECT blank_id, blank_number, answer_text FROM teacher_reading_fill_blanks WHERE question_id = ? ORDER BY blank_number ASC",
          [q.question_id]
        );
        question.blanks = blanks.map((b) => ({ blank_id: b.blank_id, blank_number: b.blank_number, answer_text: b.answer_text, correct_answer: b.answer_text }));
      } else if (quiz.difficulty === "advanced") {
        question.question_type = "essay";
        question.points = q.points;
      }
      questions.push(question);
    }

    res.json({
      quiz_id: quiz.quiz_id,
      title: quiz.title,
      passage: quiz.passage || "",
      difficulty: quiz.difficulty,
      unlock_time: quiz.unlock_time,
      lock_time: quiz.lock_time,
      time_limit: quiz.time_limit,
      questions
    });
  } catch (err) {
    console.error("❌ Get single teacher quiz error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ================= TEACHER QUIZ SCHEDULE (unlock/lock date & time) =================
router.patch("/api/teacher/reading-quizzes/:id/schedule", async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  let { unlock_time, lock_time, time_limit } = req.body;

  const toMySqlDateTime = (value) => {
    if (!value) return null;
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) return s.length >= 19 ? s.slice(0, 19) : s.slice(0, 16) + ":00";
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace("T", " ");
    if (typeof value === "string" && value.includes("T") && value.length === 16) return value.replace("T", " ") + ":00";
    return value;
  };

  try {
    unlock_time = toMySqlDateTime(unlock_time);
    lock_time = toMySqlDateTime(lock_time);
    if (time_limit != null) time_limit = parseInt(time_limit, 10) || null;

    await pool.query(
      `UPDATE teacher_reading_quizzes
       SET unlock_time = ?, lock_time = ?, time_limit = ?
       WHERE quiz_id = ?`,
      [unlock_time, lock_time, time_limit, id]
    );

    res.json({ success: true, message: "Unlock & lock schedule saved" });
  } catch (err) {
    console.error("❌ Teacher schedule update error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ================= START TEACHER / AI QUIZ ATTEMPT =================
router.post("/api/teacher/reading-quiz-attempts", async (req, res) => {
  const pool = req.pool;
  const { student_id, quiz_id } = req.body;
  if (!student_id || !quiz_id) {
    return res.status(400).json({ success: false, error: "student_id and quiz_id are required" });
  }
  try {
    const [[quiz]] = await pool.query(
      "SELECT quiz_id, unlock_time, lock_time, time_limit FROM teacher_reading_quizzes WHERE quiz_id = ?",
      [quiz_id]
    );
    if (!quiz) return res.status(404).json({ success: false, error: "Quiz not found" });
    const now = new Date();
    const unlockTime = quiz.unlock_time ? new Date(quiz.unlock_time) : null;
    const lockTime = quiz.lock_time ? new Date(quiz.lock_time) : null;
    if (unlockTime && now < unlockTime) return res.status(403).json({ success: false, error: "Quiz is not yet open." });
    if (lockTime && now > lockTime) return res.status(403).json({ success: false, error: "Quiz has closed." });

    const [[existing]] = await pool.query(
      `SELECT attempt_id FROM teacher_reading_quiz_attempts
       WHERE student_id = ? AND quiz_id = ? AND status = 'completed'
       LIMIT 1`,
      [student_id, quiz_id]
    );
    if (existing) {
      return res.status(403).json({ success: false, error: "You have already taken this quiz." });
    }

    const startTime = nowPhilippineDatetime();
    const [result] = await pool.query(
      `INSERT INTO teacher_reading_quiz_attempts (student_id, quiz_id, start_time, status)
       VALUES (?, ?, ?, 'in_progress')`,
      [student_id, quiz_id, startTime]
    );
    res.status(201).json({
      success: true,
      attempt_id: result.insertId,
      start_time: startTime,
      time_limit: quiz.time_limit || null
    });
  } catch (err) {
    console.error("❌ Start teacher quiz attempt error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ================= SUBMIT TEACHER / AI QUIZ ATTEMPT =================
router.patch("/api/teacher/reading-quiz-attempts/:id/submit", async (req, res) => {
  const pool = req.pool;
  const attemptId = Number(req.params.id);
  const { answers } = req.body || {};
  if (!attemptId || !Array.isArray(answers)) {
    return res.status(400).json({ success: false, error: "attempt id and answers array required" });
  }
  try {
    const [[attempt]] = await pool.query(
      `SELECT a.attempt_id, a.quiz_id, a.student_id, a.start_time, a.status
       FROM teacher_reading_quiz_attempts a
       WHERE a.attempt_id = ?`,
      [attemptId]
    );
    if (!attempt) return res.status(404).json({ success: false, error: "Attempt not found" });
    if (attempt.status === "completed") {
      return res.json({ success: true, already_completed: true, score: attempt.score, total_points: attempt.total_points });
    }

    const [[quiz]] = await pool.query(
      "SELECT difficulty FROM teacher_reading_quizzes WHERE quiz_id = ?",
      [attempt.quiz_id]
    );
    if (!quiz) return res.status(404).json({ success: false, error: "Quiz not found" });

    const questionTable = quiz.difficulty === "beginner"
      ? "teacher_reading_beginner_questions"
      : quiz.difficulty === "intermediate"
        ? "teacher_reading_intermediate_questions"
        : "teacher_reading_advanced_questions";

    let totalScore = 0;
    let totalPoints = 0;
    const endTime = nowPhilippineDatetime();

    for (const a of answers) {
      const questionId = a.question_id;
      let studentAnswer = a.student_answer;
      if (studentAnswer !== undefined && studentAnswer !== null && typeof studentAnswer === "object" && !Array.isArray(studentAnswer)) {
        studentAnswer = JSON.stringify(studentAnswer);
      }
      const studentAnswerText = studentAnswer != null ? String(studentAnswer).trim() : "";

      let isCorrect = 0;
      let pointsEarned = 0;
      const pointsPerQuestion = 1;

      if (quiz.difficulty === "beginner") {
        const [opts] = await pool.query(
          "SELECT option_id, option_text, is_correct FROM teacher_reading_mcq_options WHERE question_id = ? ORDER BY position ASC",
          [questionId]
        );
        const correctOpt = opts.find((o) => o.is_correct);
        const isIdentification = opts.length === 2 && opts.some((o) => String(o.option_text || "").trim() === "(Other)");
        if (isIdentification) {
          const correctText = (correctOpt && correctOpt.option_text) ? String(correctOpt.option_text).trim().toLowerCase() : "";
          const given = studentAnswerText.toLowerCase();
          isCorrect = correctText && given === correctText ? 1 : 0;
        } else {
          const selectedOptId = parseInt(studentAnswerText, 10);
          const selected = opts.find((o) => Number(o.option_id) === selectedOptId);
          isCorrect = selected && selected.is_correct ? 1 : 0;
        }
        pointsEarned = isCorrect ? pointsPerQuestion : 0;
      } else {
        pointsEarned = 0;
      }

      totalPoints += pointsPerQuestion;
      totalScore += pointsEarned;

      await pool.query(
        `INSERT INTO teacher_reading_quiz_answers (attempt_id, question_id, question_type, student_answer, is_correct, points_earned)
         VALUES (?, ?, 'mcq', ?, ?, ?)`,
        [attemptId, questionId, studentAnswerText, isCorrect, pointsEarned]
      );
    }

    await pool.query(
      `UPDATE teacher_reading_quiz_attempts
       SET end_time = ?, status = 'completed', score = ?, total_points = ?
       WHERE attempt_id = ?`,
      [endTime, totalScore, totalPoints, attemptId]
    );

    res.json({
      success: true,
      score: totalScore,
      total_points: totalPoints,
      end_time: endTime
    });
  } catch (err) {
    console.error("❌ Submit teacher quiz attempt error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ================= SCHEDULE / UNLOCK QUIZ =================
router.patch("/api/reading-quizzes/:id/schedule", async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  let { unlock_time, lock_time, time_limit, retake_option, allowed_students } = req.body;

  try {
    // Accept either:
    // - "YYYY-MM-DDTHH:mm" (datetime-local)
    // - ISO string like "2026-02-06T12:34:56.000Z"
    // Normalize to MySQL DATETIME "YYYY-MM-DD HH:mm:ss"
    const toMySqlDateTime = (value) => {
      if (!value) return null;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 19).replace("T", " ");
      }
      // Fallback for raw datetime-local strings
      if (typeof value === "string" && value.includes("T") && value.length === 16) {
        return value.replace("T", " ") + ":00";
      }
      return value;
    };

    unlock_time = toMySqlDateTime(unlock_time);
    lock_time = toMySqlDateTime(lock_time);

    await pool.query(
      `UPDATE reading_quizzes
       SET unlock_time = ?, lock_time = ?, status = 'active', is_locked = 0,
           retake_option = ?, allowed_students = ?, time_limit = ?
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

    res.json({ success: true, message: "Quiz unlocked and scheduled" });
  } catch (err) {
    console.error("❌ Schedule update error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ================= LOCK QUIZ IMMEDIATELY =================
router.put("/api/lock-quiz/:id", async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;

  try {
    const now = nowPhilippineDatetime();
    await pool.query(
      `UPDATE reading_quizzes
       SET status = 'locked', is_locked = 0,
           lock_time = ?, unlock_time = IFNULL(unlock_time, ?)
       WHERE quiz_id = ?`,
      [now, now, id]
    );

    res.json({ success: true, message: "Quiz locked successfully" });
  } catch (err) {
    console.error("❌ Lock quiz error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ================= GET SINGLE QUIZ =================
router.get("/api/reading-quizzes/:id", async (req, res) => {
  const pool = req.pool;
  const quizId = req.params.id;

  try {
    const [[quiz]] = await pool.query("SELECT * FROM reading_quizzes WHERE quiz_id = ?", [quizId]);
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const [questions] = await pool.query(
      "SELECT * FROM reading_questions WHERE quiz_id = ? ORDER BY position ASC",
      [quizId]
    );

    for (const q of questions) {
      if (q.question_type === "mcq") {
        const [options] = await pool.query(
          "SELECT option_id, option_text, is_correct FROM reading_mcq_options WHERE question_id = ? ORDER BY position ASC",
          [q.question_id]
        );
        q.options = options;
      } else if (q.question_type === "fill_blank") {
        const [blanks] = await pool.query(
          "SELECT blank_id, blank_number, answer_text FROM reading_fill_blanks WHERE question_id = ? ORDER BY blank_number ASC",
          [q.question_id]
        );
        q.blanks = blanks;
      } else {
        q.options = [];
        q.blanks = [];
      }
    }

    quiz.questions = questions;
    res.json(quiz);
  } catch (err) {
    console.error("❌ Get quiz error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ================= GET QUIZ ATTEMPTS (with optional filters) =================
router.get("/api/reading-quiz-attempts", async (req, res) => {
  const pool = req.pool;
  const { student_id, quiz_id } = req.query;

  try {
    let query = "SELECT * FROM reading_quiz_attempts";
    const params = [];

    // ✅ Handle filters properly
    if (student_id && quiz_id) {
      query += " WHERE student_id = ? AND quiz_id = ?";
      params.push(student_id, quiz_id);
    } else if (student_id) {
      query += " WHERE student_id = ?";
      params.push(student_id);
    } else if (quiz_id) {
      query += " WHERE quiz_id = ?";
      params.push(quiz_id);
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Failed to fetch attempts:", err);
    res.status(500).json({ error: "Failed to fetch attempts" });
  }
});


// ================= START STUDENT ATTEMPT =================
router.post("/api/reading-quiz-attempts", async (req, res) => {
  const pool = req.pool;
  const { student_id, quiz_id } = req.body;

  try {
    // Get quiz meta (used for time_limit + retakes)
    const [[quiz]] = await pool.query(
      "SELECT time_limit, retake_option FROM reading_quizzes WHERE quiz_id = ?",
      [quiz_id]
    );
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    // If there's an in-progress attempt, reuse it (prevent duplicates)
    const [[inProgress]] = await pool.query(
      `SELECT * FROM reading_quiz_attempts
       WHERE student_id = ? AND quiz_id = ? AND status = 'in_progress'
       ORDER BY attempt_id DESC
       LIMIT 1`,
      [student_id, quiz_id]
    );

    if (inProgress) {
      return res.json({
        attempt_id: inProgress.attempt_id,
        start_time: inProgress.start_time,
        end_time: inProgress.end_time,
        status: 'in_progress',
        readonly: false
      });
    }

    // If a completed attempt exists, allow retake unless retake_option === 'none'
    const [[latestCompleted]] = await pool.query(
      `SELECT * FROM reading_quiz_attempts
       WHERE student_id = ? AND quiz_id = ? AND status = 'completed'
       ORDER BY attempt_id DESC
       LIMIT 1`,
      [student_id, quiz_id]
    );

    if (latestCompleted && (quiz.retake_option === 'none')) {
      return res.json({
        attempt_id: latestCompleted.attempt_id,
        start_time: latestCompleted.start_time,
        end_time: latestCompleted.end_time,
        status: 'completed',
        readonly: true
      });
    }

    // Create a new attempt (first try or retake)
    const startTime = new Date();
    const endTime = quiz.time_limit
      ? new Date(startTime.getTime() + quiz.time_limit * 60000)
      : null;

    const [result] = await pool.query(
      `INSERT INTO reading_quiz_attempts (student_id, quiz_id, start_time, end_time, status)
       VALUES (?, ?, ?, ?, 'in_progress')`,
      [student_id, quiz_id, startTime, endTime]
    );

    res.json({ attempt_id: result.insertId, start_time: startTime, end_time: endTime });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start quiz attempt" });
  }
});

router.post("/api/reading-quiz-answers", async (req, res) => {
  const pool = req.pool;
  const { attempt_id, answers } = req.body;

  try {
    for (const ans of answers) {
      // Check if answer already exists
      const [existing] = await pool.query(
        `SELECT * FROM reading_quiz_answers 
         WHERE attempt_id = ? AND question_id = ?`,
        [attempt_id, ans.question_id]
      );

      if (existing.length > 0) {
        // Update existing answer
        await pool.query(
          `UPDATE reading_quiz_answers
           SET student_answer = ?
           WHERE answer_id = ?`,
          [ans.student_answer || null, existing[0].answer_id]
        );

        if (ans.question_type === "fill_blank" && ans.blanks?.length) {
          for (const blank of ans.blanks) {
            const [existingBlank] = await pool.query(
              `SELECT * FROM reading_quiz_blanks 
               WHERE answer_id = ? AND blank_id = ?`,
              [existing[0].answer_id, blank.blank_id]
            );

            if (existingBlank.length > 0) {
              await pool.query(
                `UPDATE reading_quiz_blanks
                 SET student_text = ?
                 WHERE student_blank_id = ?`,
                [blank.student_text, existingBlank[0].student_blank_id]
              );
            } else {
              await pool.query(
                `INSERT INTO reading_quiz_blanks (answer_id, blank_id, student_text)
                 VALUES (?, ?, ?)`,
                [existing[0].answer_id, blank.blank_id, blank.student_text]
              );
            }
          }
        }
      } else {
        // Insert new answer
        const [resAnswer] = await pool.query(
          `INSERT INTO reading_quiz_answers (attempt_id, question_id, question_type, student_answer) VALUES (?, ?, ?, ?)`,
          [attempt_id, ans.question_id, ans.question_type, ans.student_answer || null]
        );

        if (ans.question_type === 'fill_blank' && ans.blanks?.length) {
          for (const blank of ans.blanks) {
            await pool.query(
              `INSERT INTO reading_quiz_blanks (answer_id, blank_id, student_text) VALUES (?, ?, ?)`,
              [resAnswer.insertId, blank.blank_id, blank.student_text]
            );
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save answers" });
  }
});

// ================= SUBMIT STUDENT ATTEMPT =================
router.patch("/api/reading-quiz-attempts/:id/submit", async (req, res) => {
  const pool = req.pool;
  const attemptId = req.params.id;

  try {
    // 1️⃣ Get quiz attempt and quiz info
    const [[attempt]] = await pool.query(`
      SELECT a.start_time, q.time_limit
      FROM reading_quiz_attempts a
      JOIN reading_quizzes q ON a.quiz_id = q.quiz_id
      WHERE a.attempt_id = ?
    `, [attemptId]);

    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    const now = new Date();
    const startTime = new Date(attempt.start_time);
    const timeLimitSeconds = Number(attempt.time_limit || 5) * 60;
    const maxEndTime = new Date(startTime.getTime() + timeLimitSeconds * 1000);
    const endTime = now > maxEndTime ? maxEndTime : now;
    const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);

    // 2️⃣ Fetch answers
    const [answers] = await pool.query(`
      SELECT a.answer_id, a.question_id, a.question_type, a.student_answer
      FROM reading_quiz_answers a
      WHERE a.attempt_id = ?
    `, [attemptId]);

    let totalScore = 0;
    let totalPoints = 0;

    for (const ans of answers) {
      // 🟩 MCQ grading
      if (ans.question_type === "mcq") {
        const [correctOption] = await pool.query(`
          SELECT option_id, q.points AS question_points
          FROM reading_mcq_options o
          JOIN reading_questions q ON o.question_id = q.question_id
          WHERE o.question_id = ? AND o.is_correct = 1
        `, [ans.question_id]);

        const questionPoints = Number(correctOption[0]?.question_points || 1);
        const isCorrect = Number(ans.student_answer) === Number(correctOption[0]?.option_id) ? 1 : 0;
        const pointsEarned = isCorrect ? questionPoints : 0;

        await pool.query(`
          UPDATE reading_quiz_answers
          SET is_correct = ?, points_earned = ?
          WHERE answer_id = ?
        `, [isCorrect, pointsEarned, ans.answer_id]);

        totalScore += pointsEarned;
        totalPoints += questionPoints;
      }

      // 🟦 Fill-in-the-blank grading
      else if (ans.question_type === "fill_blank") {
        const [blanks] = await pool.query(`
          SELECT student_blank_id, blank_id, student_text 
          FROM reading_quiz_blanks 
          WHERE answer_id = ?
        `, [ans.answer_id]);

        let questionScore = 0;
        let questionTotalPoints = 0;

        for (const b of blanks) {
          const [correctBlank] = await pool.query(`
            SELECT answer_text, points FROM reading_fill_blanks WHERE blank_id = ?
          `, [b.blank_id]);

          const blankPoints = Number(correctBlank[0]?.points || 1);
          questionTotalPoints += blankPoints;

          const isCorrect = (b.student_text?.trim().toLowerCase() === correctBlank[0]?.answer_text.trim().toLowerCase()) ? 1 : 0;
          const pointsEarned = isCorrect ? blankPoints : 0;
          questionScore += pointsEarned;

          await pool.query(`
            UPDATE reading_quiz_blanks
            SET is_correct = ?, points_earned = ?
            WHERE student_blank_id = ?
          `, [isCorrect, pointsEarned, b.student_blank_id]);
        }

        totalScore += questionScore;
        totalPoints += questionTotalPoints;
      }

      // 🟥 Essay grading — GROQ AI INTEGRATION
      else if (ans.question_type === "essay" && ans.student_answer) {
        const [q] = await pool.query(`
          SELECT points FROM reading_questions WHERE question_id = ?
        `, [ans.question_id]);
        const questionPoints = Number(q[0]?.points || 10);
        totalPoints += questionPoints;

        // 🔹 Send essay to Groq
        const aiResult = await gradeEssayWithGroq(ans.student_answer);

        // 🔹 Convert AI’s 0–100 score to your question’s point value
        const essayScore = aiResult.score
          ? (aiResult.score / 100) * questionPoints
          : 0;

        // 🔹 Update DB
        await pool.query(`
          UPDATE reading_quiz_answers
          SET ai_score = ?, ai_feedback = ?, points_earned = ?
          WHERE answer_id = ?
        `, [aiResult.score ?? null, aiResult.feedback ?? null, essayScore, ans.answer_id]);

        totalScore += essayScore;
      }
    }

    // 3️⃣ Update attempt summary
    await pool.query(`
      UPDATE reading_quiz_attempts
      SET score = ?, total_points = ?, status = 'completed', end_time = ?
      WHERE attempt_id = ?
    `, [totalScore, totalPoints, endTime, attemptId]);

    // 4️⃣ Unlock next quiz in the subject track if passed
    let unlockedNext = false;
    let unlocked_quiz_number = null;
    const percentScore = totalPoints > 0 ? (Number(totalScore) / Number(totalPoints)) * 100 : 0;

    try {
      const [[meta]] = await pool.query(
        `SELECT a.student_id, q.subject_id, q.quiz_number, q.passing_score
         FROM reading_quiz_attempts a
         JOIN reading_quizzes q ON a.quiz_id = q.quiz_id
         WHERE a.attempt_id = ?`,
        [attemptId]
      );

      if (meta?.student_id && meta?.subject_id) {
        const quizNumber = Number(meta.quiz_number || 1);
        const passing = Number(meta.passing_score ?? 70);

        // If passing_score <= 0, unlock next on completion (no minimum score).
        if (passing <= 0 || percentScore >= passing) {
          const next = Math.max(2, quizNumber + 1);
          await pool.query(
            `INSERT INTO reading_student_progress (student_id, subject_id, unlocked_quiz_number)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
               unlocked_quiz_number = GREATEST(unlocked_quiz_number, VALUES(unlocked_quiz_number))`,
            [meta.student_id, meta.subject_id, next]
          );

          const [[p]] = await pool.query(
            `SELECT unlocked_quiz_number
             FROM reading_student_progress
             WHERE student_id = ? AND subject_id = ?`,
            [meta.student_id, meta.subject_id]
          );

          unlocked_quiz_number = Number(p?.unlocked_quiz_number || next);
          unlockedNext = true;
        }
      }
    } catch (e) {
      console.warn("⚠️ Unlock progression skipped:", e?.message || e);
    }

    res.json({ success: true, totalScore, totalPoints, percentScore, timeTakenSeconds, unlockedNext, unlocked_quiz_number });

  } catch (err) {
    console.error("❌ Error submitting quiz:", err);
    res.status(500).json({ error: "Failed to grade quiz" });
  }
});

// 🧠 Essay Grader Function using Groq API
async function gradeEssayWithGroq(studentAnswer) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a strict but fair essay grader.
              Grade the student's essay from 0 to 100 based on relevance, grammar, and completeness.
              Respond ONLY in JSON like: {"score": 85, "feedback": "Good structure but weak conclusion."}`
          },
          { role: "user", content: `Student's essay: """${studentAnswer}"""` }
        ],
        temperature: 0.2,
        max_tokens: 250
      })
    });

    // ⚡ Show the HTTP status and headers
    console.log("📡 Groq status:", response.status);
    console.log("📬 Groq headers:", Object.fromEntries(response.headers.entries()));

    // ⚡ Read and log the entire JSON response
    const data = await response.json();
    console.log("📩 Full Groq response:", JSON.stringify(data, null, 2));

    // Extract AI output
    const text = data?.choices?.[0]?.message?.content?.trim() || "";
    console.log("🧠 Raw AI output:", text);

    // Parse JSON-like output from AI
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        console.error("❌ Failed to parse JSON:", match[0]);
        return { score: 0, feedback: "Invalid JSON from AI" };
      }
    }

    return { score: 0, feedback: "AI did not return JSON" };
  } catch (err) {
    console.error("Groq essay grading failed:", err);
    return { score: 0, feedback: "Error connecting to AI" };
  }
}

// ✅ FIXED: Include correct answers for fill-in-the-blank questions
router.get("/api/reading-quiz-attempts/:attemptId/answers", async (req, res) => {
    const pool = req.pool;
    const { attemptId } = req.params;

    try {
        // 1️⃣ Fetch all answers for this attempt
        const [answers] = await pool.query(`
            SELECT answer_id, question_id, question_type, student_answer,
                   is_correct, points_earned, ai_score, ai_feedback
            FROM reading_quiz_answers
            WHERE attempt_id = ?
        `, [attemptId]);

        // 2️⃣ For fill-in-the-blank questions, fetch both student blanks and correct answers
        for (const ans of answers) {
            if (ans.question_type === 'fill_blank') {
                // Get student's blanks
                const [blanks] = await pool.query(`
                    SELECT b.student_blank_id, b.blank_id, b.student_text, b.is_correct, b.points_earned,
                           f.answer_text AS correct_answer, f.points AS max_points
                    FROM reading_quiz_blanks b
                    JOIN reading_fill_blanks f ON b.blank_id = f.blank_id
                    WHERE b.answer_id = ?
                `, [ans.answer_id]);

                ans.blanks = blanks;
            }

            // Optionally: if you want to include correct options for MCQs
            if (ans.question_type === 'mcq') {
                const [correct] = await pool.query(`
                    SELECT option_text 
                    FROM reading_mcq_options 
                    WHERE question_id = ? AND is_correct = 1
                `, [ans.question_id]);
                ans.correct_answer = correct[0]?.option_text || null;
            }
        }

        res.json(answers);
    } catch (err) {
        console.error("❌ Failed to fetch attempt answers:", err);
        res.status(500).json({ error: "Failed to fetch attempt answers" });
    }
});

// ================= TEACHER: LIST ATTEMPTS FOR A QUIZ (OPTIONAL CLASS FILTER) =================
router.get("/api/teacher/reading-attempts", async (req, res) => {
  const pool = req.pool;
  const quizId = req.query.quiz_id ? Number(req.query.quiz_id) : null;
  const classId = req.query.class_id ? Number(req.query.class_id) : null;

  if (!quizId) return res.status(400).json({ success: false, error: "quiz_id is required" });

  try {
    // If class_id is provided, restrict to students who joined that class
    // (include pending/accepted/rejected — teacher still needs to review submissions).
    // If class_id is null, return all attempts for the quiz (no class filter, no duplicates).
    const params = [classId || null, quizId, classId || null];
    const [rows] = await pool.query(
      `
      SELECT 
        a.attempt_id,
        a.student_id,
        CONCAT(u.fname, ' ', u.lname) AS student_name,
        a.score,
        a.total_points,
        a.status,
        a.start_time,
        a.end_time,
        sc.status AS class_status
      FROM reading_quiz_attempts a
      JOIN users u ON a.student_id = u.user_id
      LEFT JOIN student_classes sc
        ON sc.student_id = a.student_id
        AND sc.class_id = ?
      WHERE a.quiz_id = ?
        AND (? IS NULL OR sc.class_id IS NOT NULL)
      ORDER BY a.end_time DESC, a.attempt_id DESC
      `,
      params
    );

    res.json({ success: true, attempts: rows });
  } catch (err) {
    console.error("❌ Teacher reading attempts error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// ================= TEACHER: OVERRIDE GRADING FOR AN ATTEMPT =================
router.patch("/api/teacher/reading-attempts/:attemptId/override", async (req, res) => {
  const pool = req.pool;
  const attemptId = Number(req.params.attemptId);
  const teacherId = req.body.teacher_id ? Number(req.body.teacher_id) : null;
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  const blanks = Array.isArray(req.body.blanks) ? req.body.blanks : [];

  if (!attemptId) return res.status(400).json({ success: false, error: "Invalid attemptId" });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Update question-level answers (MCQ/essay)
    for (const a of answers) {
      if (!a || !a.answer_id) continue;
      const isCorrect = a.is_correct == null ? null : (a.is_correct ? 1 : 0);
      // Points are auto-calculated. Teacher only flips correct/wrong.
      // If is_correct is provided and the question is MCQ, award full question points when correct, else 0.
      let pointsEarned = null;
      if (isCorrect != null) {
        const [[meta]] = await conn.query(
          `
          SELECT a.question_type, q.points
          FROM reading_quiz_answers a
          JOIN reading_questions q ON q.question_id = a.question_id
          WHERE a.answer_id = ? AND a.attempt_id = ?
          `,
          [a.answer_id, attemptId]
        );
        if (meta?.question_type === "mcq") {
          const questionPoints = Number(meta?.points || 1);
          pointsEarned = isCorrect ? questionPoints : 0;
        }
      }

      await conn.query(
        `UPDATE reading_quiz_answers
         SET is_correct = COALESCE(?, is_correct),
             points_earned = COALESCE(?, points_earned),
             teacher_override = 1,
             teacher_id = ?,
             teacher_updated_at = ?
         WHERE answer_id = ? AND attempt_id = ?`,
        [isCorrect, pointsEarned, teacherId, nowPhilippineDatetime(), a.answer_id, attemptId]
      );
    }

    // Update blank-level grading (for fill blanks)
    for (const b of blanks) {
      if (!b || !b.student_blank_id) continue;
      const isCorrect = b.is_correct == null ? null : (b.is_correct ? 1 : 0);
      // Points are auto-calculated per blank. If is_correct is provided, award full blank points when correct, else 0.
      let pointsEarned = null;
      if (isCorrect != null) {
        const [[bp]] = await conn.query(
          `
          SELECT f.points
          FROM reading_quiz_blanks b
          JOIN reading_fill_blanks f ON f.blank_id = b.blank_id
          WHERE b.student_blank_id = ?
          `,
          [b.student_blank_id]
        );
        const blankPoints = Number(bp?.points || 1);
        pointsEarned = isCorrect ? blankPoints : 0;
      }

      await conn.query(
        `UPDATE reading_quiz_blanks
         SET is_correct = COALESCE(?, is_correct),
             points_earned = COALESCE(?, points_earned),
             teacher_override = 1,
             teacher_id = ?,
             teacher_updated_at = ?
         WHERE student_blank_id = ?`,
        [isCorrect, pointsEarned, teacherId, nowPhilippineDatetime(), b.student_blank_id]
      );
    }

    // Recompute totals after override
    const [[totals]] = await conn.query(
      `
      SELECT
        (
          (SELECT COALESCE(SUM(COALESCE(a.points_earned, 0)), 0)
           FROM reading_quiz_answers a
           WHERE a.attempt_id = ? AND a.question_type IN ('mcq','essay'))
          +
          (SELECT COALESCE(SUM(COALESCE(b.points_earned, 0)), 0)
           FROM reading_quiz_blanks b
           JOIN reading_quiz_answers a2 ON a2.answer_id = b.answer_id
           WHERE a2.attempt_id = ?)
        ) AS totalScore,
        (
          (SELECT COALESCE(SUM(COALESCE(q.points, 0)), 0)
           FROM reading_quiz_answers a
           JOIN reading_questions q ON q.question_id = a.question_id
           WHERE a.attempt_id = ? AND a.question_type IN ('mcq','essay'))
          +
          (SELECT COALESCE(SUM(COALESCE(f.points, 0)), 0)
           FROM reading_quiz_blanks b
           JOIN reading_fill_blanks f ON f.blank_id = b.blank_id
           JOIN reading_quiz_answers a2 ON a2.answer_id = b.answer_id
           WHERE a2.attempt_id = ?)
        ) AS totalPoints
      `,
      [attemptId, attemptId, attemptId, attemptId]
    );

    await conn.query(
      `UPDATE reading_quiz_attempts
       SET score = ?, total_points = ?
       WHERE attempt_id = ?`,
      [Number(totals?.totalScore || 0), Number(totals?.totalPoints || 0), attemptId]
    );

    // Unlock next quiz if override makes the student pass (or passing_score <= 0)
    let unlockedNext = false;
    let unlocked_quiz_number = null;
    const percentScore = Number(totals?.totalPoints || 0) > 0
      ? (Number(totals?.totalScore || 0) / Number(totals?.totalPoints || 0)) * 100
      : 0;

    const [[meta]] = await conn.query(
      `SELECT a.student_id, q.subject_id, q.quiz_number, q.passing_score
       FROM reading_quiz_attempts a
       JOIN reading_quizzes q ON q.quiz_id = a.quiz_id
       WHERE a.attempt_id = ?`,
      [attemptId]
    );

    if (meta?.student_id && meta?.subject_id) {
      const quizNumber = Number(meta.quiz_number || 1);
      const passing = Number(meta.passing_score ?? 70);
      if (passing <= 0 || percentScore >= passing) {
        const next = Math.max(2, quizNumber + 1);
        await conn.query(
          `INSERT INTO reading_student_progress (student_id, subject_id, unlocked_quiz_number)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             unlocked_quiz_number = GREATEST(unlocked_quiz_number, VALUES(unlocked_quiz_number))`,
          [meta.student_id, meta.subject_id, next]
        );
        const [[p]] = await conn.query(
          `SELECT unlocked_quiz_number
           FROM reading_student_progress
           WHERE student_id = ? AND subject_id = ?`,
          [meta.student_id, meta.subject_id]
        );
        unlocked_quiz_number = Number(p?.unlocked_quiz_number || next);
        unlockedNext = true;
      }
    }

    await conn.commit();

    res.json({
      success: true,
      totalScore: Number(totals?.totalScore || 0),
      totalPoints: Number(totals?.totalPoints || 0),
      percentScore,
      unlockedNext,
      unlocked_quiz_number
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("❌ Teacher override error:", err);
    res.status(500).json({ success: false, error: "Failed to save override" });
  } finally {
    if (conn) conn.release();
  }
});

// ============================
// 🏆 Leaderboard Endpoint
// ============================
router.get("/api/reading-quiz-leaderboard", async (req, res) => {
  const pool = req.pool;
  const quizId = req.query.quiz_id ? Number(req.query.quiz_id) : null;
  const isTeacherQuiz = String(req.query.teacher_quiz || "").toLowerCase() === "1" || req.query.teacher_quiz === "true";

  if (!quizId) return res.status(400).json({ success: false, error: "quiz_id is required" });

  try {
    let quizTitle = "Quiz";
    let rows = [];

    if (isTeacherQuiz) {
      const [quizRows] = await pool.query(
        "SELECT title FROM teacher_reading_quizzes WHERE quiz_id = ?",
        [quizId]
      );
      quizTitle = quizRows[0]?.title || "Quiz";
      const sql = `
        SELECT
          a.attempt_id,
          a.student_id,
          u.user_id,
          CONCAT(u.fname, ' ', u.lname) AS student_name,
          a.quiz_id,
          a.score,
          a.total_points,
          a.status,
          a.start_time,
          a.end_time,
          TIMESTAMPDIFF(SECOND, a.start_time, a.end_time) AS time_taken_seconds
        FROM teacher_reading_quiz_attempts a
        JOIN users u ON a.student_id = u.user_id
        WHERE a.status = 'completed' AND a.quiz_id = ?
        ORDER BY a.score DESC, TIMESTAMPDIFF(SECOND, a.start_time, a.end_time) ASC, a.end_time ASC
        LIMIT 20
      `;
      const [r] = await pool.query(sql, [quizId]);
      rows = r;
    } else {
      const [quizRows] = await pool.query(
        "SELECT title FROM reading_quizzes WHERE quiz_id = ?",
        [quizId]
      );
      quizTitle = quizRows[0]?.title || "Quiz";

      const sql = `
        SELECT 
          u.user_id,
          CONCAT(u.fname, ' ', u.lname) AS student_name,
          a.quiz_id,
          a.score,
          a.total_points,
          a.status,
          a.start_time,
          a.end_time,
          TIMESTAMPDIFF(SECOND, a.start_time, a.end_time) AS time_taken_seconds
        FROM reading_quiz_attempts a
        JOIN users u ON a.student_id = u.user_id
        WHERE a.status = 'completed' AND a.quiz_id = ?
        ORDER BY a.score DESC, TIMESTAMPDIFF(SECOND, a.start_time, a.end_time) ASC, a.end_time ASC
        LIMIT 20
      `;
      const [r] = await pool.query(sql, [quizId]);
      rows = r;
    }

    const formatted = rows.map(r => {
      let seconds = Math.max(0, r.time_taken_seconds);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;

      return {
        ...r,
        score: Math.round(r.score),
        total_points: Math.round(r.total_points),
        time_taken_seconds: seconds,
        time_taken: `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`
      };
    });

    res.json({ success: true, leaderboard: formatted, quizTitle });

  } catch (err) {
    console.error("❌ Leaderboard error:", err);
    res.status(500).json({ success: false, error: err.message });
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

const TOS_LEVEL_DESCRIPTIONS = {
  remembering: "Remembering (recall facts, terms, list, define, identify)",
  understanding: "Understanding (explain, summarize, interpret, classify)",
  applying: "Applying (use in new situation, implement, execute)",
  analyzing: "Analyzing (break down, compare, contrast, infer)",
  evaluating: "Evaluating (justify, critique, judge, argue)",
  creating: "Creating (design, produce, construct, formulate)"
};

function buildQuizPromptFromCounts(topicTitle, questionCounts, difficulty, additionalContext, tos_levels) {
  const counts = questionCounts && typeof questionCounts === "object" ? questionCounts : {};
  const mc = Math.max(0, parseInt(counts["multiple-choice"], 10) || 0);
  const tf = Math.max(0, parseInt(counts["true-false"], 10) || 0);
  const id = Math.max(0, parseInt(counts["identification"], 10) || 0);
  const parts = [];
  if (mc > 0) {
    parts.push(`${mc} multiple-choice question(s). For each: write the question, then exactly 4 lines: A) ... B) ... C) ... D) ... then a new line: "Correct answer: A)" or B) or C) or D).`);
  }
  if (tf > 0) {
    parts.push(`${tf} true-or-false question(s). For each: write the statement (one line), then on the next line write exactly either "Correct answer: True)" or "Correct answer: False)" (nothing else on that line).`);
  }
  if (id > 0) {
    parts.push(`${id} identification (short-answer) question(s). For each: write the question (e.g. "What is the capital of France?"), then on the next line write "Correct answer: " followed by the exact answer. The correct answer must be only one word or two words (e.g. "Correct answer: Paris" or "Correct answer: New York"). No long phrases.`);
  }
  const total = mc + tf + id;
  if (total === 0 || parts.length === 0) {
    return buildQuizPrompt(topicTitle, ["multiple-choice"], difficulty, 5, additionalContext);
  }
  let instruction = `Generate a quiz about "${topicTitle}" with EXACTLY these numbers of questions (no more, no less):\n\n`;
  instruction += parts.map((p, i) => `${i + 1}. ${p}`).join("\n\n");
  instruction += `\n\nCRITICAL: The total number of questions must be exactly ${total}. Output exactly ${mc} multiple-choice, exactly ${tf} true-or-false, and exactly ${id} identification. Do not add extra questions or mix formats. Use the exact formats above so answers can be parsed.\n\nIMPORTANT format: Start the first question with exactly "Question 1:" (or "1.") on its own line. Then "Question 2:", "Question 3:", etc. for each following question. You may add a short intro/passage before "Question 1:" but every question must begin with "Question N:" or "N." so they can be parsed.`;
  if (tos_levels && Array.isArray(tos_levels) && tos_levels.length > 0) {
    const labels = tos_levels
      .filter((level) => TOS_LEVEL_DESCRIPTIONS[level])
      .map((level) => TOS_LEVEL_DESCRIPTIONS[level]);
    if (labels.length > 0) {
      instruction += `\n\nTABLE OF SPECIFICATION (cognitive levels): Distribute the ${total} questions evenly across these Bloom's taxonomy levels: ${labels.join("; ")}. Label each question in the output with its level in parentheses, e.g. "Question 1: (Remembering) ...".`;
    }
  }
  if (additionalContext) {
    instruction += `\n\nAdditional context: ${additionalContext}`;
  }
  return instruction;
}

function buildQuizPrompt(topicTitle, quizTypes, difficulty, numQuestions, additionalContext) {
  const types = Array.isArray(quizTypes) && quizTypes.length > 0 ? quizTypes : ["multiple-choice"];
  const total = Math.max(1, parseInt(numQuestions, 10) || 5);
  const perType = Math.max(1, Math.floor(total / types.length));
  const remainder = total - perType * types.length;

  const parts = [];
  let idx = 0;
  for (const t of types) {
    const n = perType + (idx < remainder ? 1 : 0);
    if (n <= 0) continue;
    idx++;
    if (t === "multiple-choice") {
      parts.push(`${n} multiple-choice question(s). For each: write the question, then exactly 4 lines: A) ... B) ... C) ... D) ... then a new line: "Correct answer: A)" or B) or C) or D).`);
    } else if (t === "true-false") {
      parts.push(`${n} true-or-false question(s). For each: write the statement (one line), then on the next line write exactly either "Correct answer: True)" or "Correct answer: False)" (nothing else on that line).`);
    } else if (t === "identification") {
      parts.push(`${n} identification (short-answer) question(s). For each: write the question (e.g. "What is the capital of France?"), then on the next line write "Correct answer: " followed by the exact answer. The correct answer must be only one word or two words (e.g. "Correct answer: Paris" or "Correct answer: New York"). No long phrases.`);
    }
  }

  let instruction = `Generate a total of ${total} quiz questions about "${topicTitle}". Include the following (use the exact formats so answers can be parsed):\n\n`;
  instruction += parts.map((p, i) => `${i + 1}. ${p}`).join("\n\n");
  instruction += `\n\nIMPORTANT format: Start the first question with exactly "Question 1:" (or "1.") on its own line. Then "Question 2:", "Question 3:", etc. for each following question. You may add a short intro/passage before "Question 1:" but every question must begin with "Question N:" or "N." so they can be parsed.`;

  if (additionalContext) {
    instruction += `\n\nAdditional context: ${additionalContext}`;
  }

  return instruction;
}

// 🚀 POST /api/generate-quiz
router.post("/api/generate-quiz", async (req, res) => {
  const pool = req.pool;
  const body = req.body || {};
  const topic_id = body.topic_id != null ? String(body.topic_id).trim() : "";
  const quiz_type = body.quiz_type;
  const quiz_types = body.quiz_types;
  const question_counts = body.question_counts;
  const difficulty = body.difficulty;
  const num_questions = body.num_questions;
  const additional_context = body.additional_context;
  const difficultyForPrompt = difficulty || "beginner";

  if (!topic_id) {
    return res.status(400).json({ success: false, message: "Please select a topic in Step 1." });
  }

  try {
    const client = requireGroq(res);
    if (!client) return;

    const [topicRows] = await pool.query("SELECT topic_title FROM topics WHERE topic_id = ?", [topic_id]);
    if (topicRows.length === 0) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    const topicTitle = topicRows[0].topic_title;

    const tos_levels = body.tos_levels;
    let instruction;
    if (question_counts && typeof question_counts === "object" && (question_counts["multiple-choice"] > 0 || question_counts["true-false"] > 0 || question_counts["identification"] > 0)) {
      instruction = buildQuizPromptFromCounts(topicTitle, question_counts, difficultyForPrompt, additional_context, tos_levels);
    } else {
      const types = Array.isArray(quiz_types) && quiz_types.length > 0 ? quiz_types : (quiz_type ? [quiz_type] : ["multiple-choice"]);
      const numQuestions = Math.max(1, parseInt(num_questions, 10) || 5);
      instruction = buildQuizPrompt(topicTitle, types, difficultyForPrompt, numQuestions, additional_context);
    }

    // ✅ Call Groq API (replace max_output_tokens with max_tokens)
    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are an educational quiz generator that outputs clean and clear text." },
        { role: "user", content: instruction }
      ],
    });

    const quizContent = completion.choices?.[0]?.message?.content || "";

    if (!quizContent) {
      return res.status(500).json({ success: false, message: "No quiz content returned" });
    }

    res.json({ success: true, quiz: quizContent });
  } catch (err) {
    console.error("Error in /api/generate-quiz:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;