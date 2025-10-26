const express = require("express");
const router = express.Router();
require("dotenv").config();
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ================= CREATE TEACHER READING QUIZ =================
router.post("/api/teacher/reading-quizzes", async (req, res) => {
    const pool = req.pool;
    const { title, difficulty, passage, questions, subject_id, user_id } = req.body; // user_id from frontend

    if (!user_id) {
        return res.status(400).json({ success: false, message: "user_id is required" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Insert quiz
        const [quizResult] = await conn.query(
            "INSERT INTO teacher_reading_quizzes (subject_id, user_id, title, difficulty, passage) VALUES (?, ?, ?, ?, ?)",
            [subject_id, user_id, title, difficulty, passage]
        );
        const quizId = quizResult.insertId;

        // Insert questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            if (difficulty === "beginner" && q.question_type === "mcq") {
                // Beginner MCQ
                const [qResult] = await conn.query(
                    "INSERT INTO teacher_reading_beginner_questions (quiz_id, question_text) VALUES (?, ?)",
                    [quizId, q.question_text]
                );
                const questionId = qResult.insertId;

                // Insert options
                for (let j = 0; j < q.options.length; j++) {
                    const opt = q.options[j];
                    await conn.query(
                        "INSERT INTO teacher_reading_mcq_options (question_id, option_text, is_correct, position) VALUES (?, ?, ?, ?)",
                        [questionId, opt.option_text, opt.is_correct ? 1 : 0, j + 1]
                    );
                }
            } 
            else if (difficulty === "intermediate" && q.question_type === "fill_blank") {
                // Intermediate Fill-in-the-blank
                const [qResult] = await conn.query(
                    "INSERT INTO teacher_reading_intermediate_questions (quiz_id, question_text) VALUES (?, ?)",
                    [quizId, q.question_text]
                );
                const questionId = qResult.insertId;

                // Insert blanks
                for (let b = 0; b < q.blanks.length; b++) {
                    const blank = q.blanks[b];
                    await conn.query(
                        "INSERT INTO teacher_reading_fill_blanks (question_id, blank_number, answer_text, points) VALUES (?, ?, ?, ?)",
                        [questionId, blank.blank_number, blank.answer_text, blank.points || 1.0]
                    );
                }
            } 
            else if (difficulty === "advanced" && q.question_type === "essay") {
                // Advanced Essay
                await conn.query(
                    "INSERT INTO teacher_reading_advanced_questions (quiz_id, question_text, points) VALUES (?, ?, ?)",
                    [quizId, q.question_text, q.points || 1.0]
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

    const [quizzes] = await pool.query(query, params);

    if (studentId) {
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
router.get("/api/teacher/reading-quizzes", async (req, res) => {
  const pool = req.pool;
  const userId = req.query.user_id;        // Teacher's user_id
  const subjectId = req.query.subject_id;  // Optional filter by subject

  try {
    if (!userId) {
      return res.status(400).json({ error: "Teacher user_id is required" });
    }

    let query = "SELECT * FROM teacher_reading_quizzes WHERE user_id = ?";
    const params = [userId];

    if (subjectId) {
      query += " AND subject_id = ?";
      params.push(subjectId);
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


// ================= SCHEDULE / UNLOCK QUIZ =================
router.patch("/api/reading-quizzes/:id/schedule", async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  let { unlock_time, lock_time, time_limit, retake_option, allowed_students } = req.body;

  try {
    // Convert "YYYY-MM-DDTHH:mm" to "YYYY-MM-DD HH:mm:00" for MySQL
    const formatForMySQL = dt => dt.replace('T', ' ') + ':00';
    unlock_time = formatForMySQL(unlock_time);
    lock_time = formatForMySQL(lock_time);

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
    const now = new Date();
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
    // Check if there's already an attempt (in-progress or completed)
    const [existingAttempts] = await pool.query(
      `SELECT * FROM reading_quiz_attempts 
      WHERE student_id = ? AND quiz_id = ?`,
      [student_id, quiz_id]
    );

    if (existingAttempts.length > 0) {
        const attempt = existingAttempts[0];

        if (attempt.status === 'completed') {
            // Already completed → return readonly attempt
            return res.json({
                attempt_id: attempt.attempt_id,
                start_time: attempt.start_time,
                end_time: attempt.end_time,
                status: 'completed',
                readonly: true
            });
        } else {
            // In-progress → return that attempt
            return res.json({
                attempt_id: attempt.attempt_id,
                start_time: attempt.start_time,
                end_time: attempt.end_time,
                status: 'in_progress',
                readonly: false
            });
        }
    }

    // If no existing attempt, create new
    const [[quiz]] = await pool.query(
      "SELECT time_limit FROM reading_quizzes WHERE quiz_id = ?",
      [quiz_id]
    );
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

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

    res.json({ success: true, totalScore, totalPoints, timeTakenSeconds });

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
            SELECT answer_id, question_id, question_type, student_answer
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

// ============================
// 🏆 Leaderboard Endpoint
// ============================
router.get("/api/reading-quiz-leaderboard", async (req, res) => {
  const pool = req.pool;
  const quizId = req.query.quiz_id ? Number(req.query.quiz_id) : null;

  if (!quizId) return res.status(400).json({ success: false, error: "quiz_id is required" });

  try {
    // Get quiz title
    const [quizRows] = await pool.query(
      "SELECT title FROM reading_quizzes WHERE quiz_id = ?",
      [quizId]
    );
    const quizTitle = quizRows[0]?.title || "Quiz";

    // Get leaderboard
    let sql = `
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
    const [rows] = await pool.query(sql, [quizId]);

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

    // ✅ Step 3: Fetch lessons for that subject
    const [lessons] = await pool.query(
      'SELECT lesson_id, lesson_title FROM lessons WHERE subject_id = ? ORDER BY lesson_id',
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

    // ✅ Step 5: Combine lessons + topics
    const data = lessons.map(lesson => ({
      lesson_id: lesson.lesson_id,
      lesson_title: lesson.lesson_title,
      topics: topics.filter(t => t.lesson_id === lesson.lesson_id)
    }));

    res.json(data);
  } catch (err) {
    console.error('Error fetching lessons and topics:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

function buildQuizPrompt(topicTitle, quizType, difficulty, numQuestions, additionalContext) {
  let instruction = "";

  if (quizType === "multiple-choice" || difficulty === "beginner") {
    instruction = `Generate ${numQuestions} multiple-choice questions about "${topicTitle}". Each question should have 4 options and indicate the correct answer.`;
  } else if (quizType === "fill-in-the-blank" || difficulty === "intermediate") {
    instruction = `Generate ${numQuestions} fill-in-the-blank questions about "${topicTitle}". Specify the correct answer for each blank.`;
  } else if (quizType === "essay" || difficulty === "advanced") {
    instruction = `Generate ${numQuestions} essay-type questions about "${topicTitle}".`;
  }

  if (additionalContext) {
    instruction += `\nAdditional context: ${additionalContext}`;
  }

  return instruction;
}

// 🚀 POST /api/generate-quiz
router.post("/api/generate-quiz", async (req, res) => {
  const pool = req.pool;
  const { topic_id, quiz_type, difficulty, num_questions, additional_context } = req.body;

  if (!topic_id || !difficulty || !num_questions) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    // ✅ Get topic title
    const [topicRows] = await pool.query("SELECT topic_title FROM topics WHERE topic_id = ?", [topic_id]);
    if (topicRows.length === 0) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    const topicTitle = topicRows[0].topic_title;

    // ✅ Build the AI prompt
    const instruction = buildQuizPrompt(topicTitle, quiz_type, difficulty, num_questions, additional_context);

    // ✅ Call Groq API (replace max_output_tokens with max_tokens)
    const completion = await groq.chat.completions.create({
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