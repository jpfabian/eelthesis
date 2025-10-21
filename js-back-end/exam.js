const express = require("express");
const router = express.Router();
require("dotenv").config();
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/api/generate-exam", async (req, res) => {
  const { subject, topic, content, numberOfQuestions, questionTypes } = req.body;

  try {
    const prompt = `
    Create a formal exam for the subject ${subject}.
    Topic: ${topic}
    Content: ${content}

    Include ${numberOfQuestions} questions.
    Question types: ${questionTypes.join(", ")}.

    Format the exam like this:
    ======================================================
    ${subject} - Exam
    Topic: ${topic}

    ${questionTypes.includes("multiple-choice") ? "I. Multiple Choice\n1. ...\n2. ..." : ""}
    ${questionTypes.includes("true-false") ? "\nII. True or False\n1. ...\n2. ..." : ""}
    ${questionTypes.includes("Identification") ? "\nIII. Identification\n1. ...\n2. ..." : ""}
    ${questionTypes.includes("essay") ? "\nIV. Essay\n1. ..." : ""}
    ======================================================
    `;

    // Generate exam text using Groq API
    const response = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: "You are an expert teacher who formats exams cleanly." },
        { role: "user", content: prompt },
      ],
    });

    const examText = response.choices[0]?.message?.content || "No exam generated.";

    // Save to MySQL database
    const conn = await req.pool.getConnection();
    await conn.query(
      "INSERT INTO exams (subject, title, content, question_count, types) VALUES (?, ?, ?, ?, ?)",
      [subject, topic, examText, numberOfQuestions, questionTypes.join(", ")]
    );
    conn.release();

    // Send response back to frontend
    res.json({ success: true, exam: examText });

  } catch (err) {
    console.error("Groq exam generation error:", err);
    res.status(500).json({ success: false, message: "Failed to generate exam." });
  }
});


//save exam
router.post("/api/save-exam", async (req, res) => {
  const pool = req.pool;
  const { subject, title, content, question_count, types } = req.body;

  try {
    const [result] = await pool.query(
      "INSERT INTO exams (subject, title, content, question_count, types, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [subject, title, content, question_count, types]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to save exam" });
  }
});

//exam
router.get("/api/exams", async (req, res) => {
  const pool = req.pool;
  try {
    const [rows] = await pool.query("SELECT * FROM exams ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});

router.get("/api/exams/:id", async (req, res) => {
  const pool = req.pool;
  const [rows] = await pool.query("SELECT * FROM exams WHERE id = ?", [req.params.id]);
  res.json(rows[0]);
});

router.put("/api/exams/:id", async (req, res) => {
  const pool = req.pool;
  const { content } = req.body;
  await pool.query("UPDATE exams SET content = ? WHERE id = ?", [content, req.params.id]);
  res.json({ success: true });
});

router.get('/api/lessons-with-topics', async (req, res) => {
  const pool = req.pool;
  const classId = req.query.class_id;

  try {
    // ✅ Step 1: Get the subject name of the selected class
    const [classRows] = await pool.query('SELECT subject FROM classes WHERE id = ?', [classId]);
    if (classRows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const subjectName = classRows[0].subject.trim();

    // ✅ Step 2: Map subject name to subject_id
    const subjectMapping = {
      "Reading and Writing Skills": 1,
      "Oral Communication in Context": 2,
      "Creative Writing": 3,
      "Creative Non-Fiction": 4,
      "English for Academic and Professional Purposes": 5,
    };

    // Handle lowercase or short names (like "oral communication")
    const normalized = subjectName.toLowerCase();
    let subjectId =
      normalized.includes("oral") ? 2 :
      normalized.includes("reading") ? 1 :
      normalized.includes("creative writing") ? 3 :
      normalized.includes("creative non") ? 4 :
      normalized.includes("academic") ? 5 :
      subjectMapping[subjectName];

    if (!subjectId) {
      return res.status(404).json({ error: `No subject_id found for "${subjectName}"` });
    }

    // ✅ Step 3: Fetch lessons for that subject_id
    const [lessons] = await pool.query('SELECT * FROM lessons WHERE subject_id = ?', [subjectId]);

    // ✅ Step 4: Fetch all topics
    const [topics] = await pool.query('SELECT * FROM topics');

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

module.exports = router;
