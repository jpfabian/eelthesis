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

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer config using S3 storage
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    key: (req, file, cb) => {
      const filename = `pronunciation/${Date.now()}-${file.originalname}`;
      cb(null, filename);
    },
  }),
});


// ================= CREATE PRONUNCIATION QUIZ =================
router.post("/api/pronunciation-quizzes", async (req, res) => {
  const pool = req.pool;
  try {
    const { title, difficulty, passage, questions, subject_id, user_id } = req.body;
    const validSubjectId = subject_id != null ? subject_id : 1;

    if (!title || !difficulty || !questions || questions.length === 0 || !user_id) {
      return res.status(400).json({ message: "All fields including user_id are required" });
    }

    // Insert quiz record into teacher_pronunciation_quizzes
    const [quizResult] = await pool.execute(
      `INSERT INTO teacher_pronunciation_quizzes 
        (subject_id, user_id, title, difficulty, passage) 
       VALUES (?, ?, ?, ?, ?)`,
      [validSubjectId, user_id, title, difficulty, passage]
    );
    const quizId = quizResult.insertId;

    // Insert questions depending on difficulty
    if (difficulty === "beginner") {
      for (const q of questions) {
        await pool.execute(
          `INSERT INTO teacher_pronunciation_beginner_questions 
            (quiz_id, word, correct_pronunciation) 
           VALUES (?, ?, ?)`,
          [quizId, q.word, q.stressed_form]
        );
      }
    } else if (difficulty === "intermediate") {
      for (const q of questions) {
        await pool.execute(
          `INSERT INTO teacher_pronunciation_intermediate_questions 
            (quiz_id, word, stressed_syllable) 
           VALUES (?, ?, ?)`,
          [quizId, q.word, q.stressed_form]
        );
      }
    } else if (difficulty === "advanced") {
      for (const q of questions) {
        await pool.execute(
          `INSERT INTO teacher_pronunciation_advanced_questions 
            (quiz_id, sentence, reduced_form, full_sentence) 
           VALUES (?, ?, ?, ?)`,
          [quizId, q.sentence, q.reduced_form, q.full_sentence]
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
        pa.status,
        pq.title,
        pq.difficulty,
        pq.lock_time,
        pq.unlock_time,
        ROUND(AVG(ans.pronunciation_score), 2) AS average_accuracy  -- ✅ average score from answers
      FROM pronunciation_quiz_attempts pa
      JOIN pronunciation_quizzes pq 
        ON pa.quiz_id = pq.quiz_id
      LEFT JOIN pronunciation_quiz_answers ans 
        ON pa.attempt_id = ans.attempt_id
      WHERE pa.student_id = ?
      GROUP BY pa.attempt_id
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

// ==================== Handle Pronunciation Quiz Submission ====================
router.post("/api/pronunciation-submit", upload.any(), async (req, res) => {
  const pool = req.pool;

  try {
    const { student_id, quiz_id } = req.body;
    const files = req.files;

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

    // 2️⃣ Create a new quiz attempt
    const [attemptResult] = await pool.query(
      `INSERT INTO pronunciation_quiz_attempts 
         (student_id, quiz_id, start_time, end_time, status)
       VALUES (?, ?, NOW(), NOW(), 'completed')`,
      [student_id, quiz_id]
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
         SET score = ?, pronunciation_score = ?, total_points = ?, end_time = NOW(), status = 'completed'
       WHERE attempt_id = ?`,
      [avgAccuracy, avgAccuracy, 100, attempt_id]
    );

    res.json({
      success: true,
      message: "Pronunciation quiz submitted successfully.",
      accuracy: avgAccuracy,
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

router.post("/api/generate-pronunciation-quiz", async (req, res) => {
  const pool = req.pool;
  const { topic_id, difficulty, num_questions, additional_context } = req.body;

  if (!topic_id || !difficulty || !num_questions) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
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

    const completion = await groq.chat.completions.create({
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
        // Insert the main quiz
        const [result] = await pool.query(
            "INSERT INTO ai_quiz_pronunciation (teacher_id, subject_id, difficulty, passage) VALUES (?, ?, ?, ?)",
            [teacher_id, subject_id, difficulty, passage]
        );

        const quizId = result.insertId;

        // Insert all questions in parallel
        await Promise.all(
            questions.map(q =>
                pool.query(
                    "INSERT INTO ai_quiz_pronunciation_questions (quiz_id, word, answer) VALUES (?, ?, ?)",
                    [quizId, q.word, q.answer]
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



