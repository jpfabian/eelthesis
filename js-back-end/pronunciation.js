const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(process.cwd(), 'uploads', 'pronunciation');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// ================= CREATE PRONUNCIATION QUIZ =================
router.post("/api/pronunciation-quizzes", async (req, res) => {
  const pool = req.pool;
  try {
    const { title, difficulty, passage, questions, subject_id} = req.body;
    const validSubjectId = subject_id || 1;

    if (!title || !difficulty || !questions || questions.length === 0) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Insert quiz record
    const [quizResult] = await pool.execute(
      "INSERT INTO pronunciation_quizzes (subject_id, title, difficulty, passage) VALUES (?, ?, ?, ?)",
      [validSubjectId, title, difficulty, passage]
    );
    const quizId = quizResult.insertId;

    // Insert questions depending on difficulty
    if (difficulty === "beginner") {
      for (const q of questions) {
        await pool.execute(
          `INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation) VALUES (?, ?, ?)`,
          [quizId, q.word, q.stressed_form]
        );
      }
    } else if (difficulty === "intermediate") {
      for (const q of questions) {
        await pool.execute(
          `INSERT INTO pronunciation_intermediate_questions (quiz_id, word, stressed_syllable) VALUES (?, ?, ?)`,
          [quizId, q.word, q.stressed_form]
        );
      }
    } else if (difficulty === "advanced") {
      for (const q of questions) {
        await pool.execute(
          `INSERT INTO pronunciation_advanced_questions (quiz_id, sentence, reduced_form, full_sentence) VALUES (?, ?, ?, ?)`,
          [quizId, q.sentence, q.reduced_form, q.full_sentence]
        );
      }
    }

    res.json({ message: "Pronunciation quiz created successfully", quizId });
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

    query += " ORDER BY created_at DESC";

    // ✅ Fetch quizzes from DB
    const [quizzes] = await pool.query(query, params);

    if (studentId) {
      // ✅ Fetch student attempts if provided
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
      // ✅ Default lock status when no studentId
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

// ================= UPDATE QUIZ SCHEDULE / UNLOCK QUIZ =================
router.patch("/api/pronunciation-quizzes/:id/schedule", async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  const { unlock_time, lock_time, time_limit, retake_option, allowed_students } = req.body;

  try {
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
router.get("/api/pronunciation-attempts", async (req, res) => {
  const pool = req.pool;
  const { student_id } = req.query;

  if (!student_id) {
    return res.status(400).json({ success: false, message: "Missing student_id" });
  }

  try {
    const [attempts] = await pool.query(
      `
      SELECT 
        pa.attempt_id,
        pa.quiz_id,
        pa.start_time,
        pa.end_time,
        pa.score,
        pa.total_points,
        pa.status,
        pq.title,
        pq.difficulty,
        pq.lock_time,
        pq.unlock_time
      FROM pronunciation_quiz_attempts pa
      JOIN pronunciation_quizzes pq ON pa.quiz_id = pq.quiz_id
      WHERE pa.student_id = ?
      ORDER BY pa.start_time DESC
      `,
      [student_id]
    );

    res.json({ success: true, attempts });
  } catch (err) {
    console.error("❌ Error fetching pronunciation attempts:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ================= AUDIO SUBMISSION ENDPOINT =================
// ==================== Handle Pronunciation Quiz Submission ====================
router.post('/api/pronunciation-submit', upload.any(), async (req, res) => {
  const pool = req.pool;

  try {
    const { student_id, quiz_id } = req.body;
    const files = req.files;

    console.log("Received pronunciation submission:");
    console.log("Student ID:", student_id);
    console.log("Quiz ID:", quiz_id);
    console.log("Uploaded files:", files.length);

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "No audio files uploaded" });
    }

    // ✅ Create quiz attempt
    const [attemptResult] = await pool.query(
      `INSERT INTO pronunciation_quiz_attempts (student_id, quiz_id, status) 
       VALUES (?, ?, 'submitted')`,
      [student_id, quiz_id]
    );

    const attempt_id = attemptResult.insertId;

    // ✅ Insert each audio answer
    for (let i = 0; i < files.length; i++) {
      const question_id = req.body[`question_id_${i}`];
      const transcript = req.body[`answer_${i}`] || '';
      const file = files.find(f => f.fieldname === `audio_${i}`);
      const filePath = `/uploads/pronunciation/${file.filename}`;

      await pool.query(
        `INSERT INTO pronunciation_quiz_answers 
          (attempt_id, question_id, difficulty, student_audio, transcript) 
         VALUES (?, ?, 'beginner', ?, ?)`,
        [attempt_id, question_id, filePath, transcript]
      );
    }

    console.log(`✅ Pronunciation attempt ${attempt_id} saved successfully.`);
    res.json({ success: true, message: "Pronunciation quiz submitted successfully." });

  } catch (err) {
    console.error("❌ Pronunciation submission error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

module.exports = router;


