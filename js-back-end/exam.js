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

router.post("/api/generate-exam", async (req, res) => {
  const { subject, selectedTopics, questionTypes } = req.body;

  try {
    const client = requireGroq(res);
    if (!client) return;

    const topicsList = selectedTopics.join(", ");

    // Build a clear text for each question type with counts
    const questionTypeDetails = questionTypes
      .map(q => `${q.type.replace("-", " ").toUpperCase()} – ${q.count} questions`)
      .join("\n");

    // Helper to get count easily by type
    const getCount = type => {
      const q = questionTypes.find(qt => qt.type === type);
      return q ? q.count : 0;
    };

    // Dynamically generate sections
    const sections = [];

    if (getCount("multiple-choice") > 0) {
      sections.push(`
I. MULTIPLE CHOICE
      Choose the letter of the correct answer. Write the chosen letter on the space provided before each number.
${Array.from({ length: getCount("multiple-choice") }, (_, i) => `      ${i + 1}. ...`).join("\n")}
      `);
    }

    if (getCount("true-false") > 0) {
      sections.push(`
II. TRUE OR FALSE
      Write TRUE if the statement is correct and FALSE if it is not.
${Array.from({ length: getCount("true-false") }, (_, i) => `      ${i + 1}. ...`).join("\n")}
      `);
    }

    if (getCount("identification") > 0) {
      sections.push(`
III. IDENTIFICATION
      Identify what is being described in each item.
${Array.from({ length: getCount("identification") }, (_, i) => `      ${i + 1}. ...`).join("\n")}
      `);
    }

    if (getCount("essay") > 0) {
      sections.push(`
IV. ESSAY
      Answer the following question/s comprehensively.
${Array.from({ length: getCount("essay") }, (_, i) => `      ${i + 1}. ...`).join("\n")}
      `);
    }

    // Answer key: only list sections we actually requested
    const sectionLetters = [];
    if (getCount("multiple-choice") > 0) sectionLetters.push("I");
    if (getCount("true-false") > 0) sectionLetters.push("II");
    if (getCount("identification") > 0) sectionLetters.push("III");
    if (getCount("essay") > 0) sectionLetters.push("IV");
    const answerKeySections = sectionLetters.length ? sectionLetters.join(", ") : "—";

    // Build final prompt
    const prompt = `
You are a professional teacher creating a formal printed exam for Senior High School students.

🧠 Your task: Generate a complete exam that exactly follows the layout and formatting below. 
The layout, indentation, and spacing must be EXACTLY as shown — do not add or remove any lines.

CRITICAL: Include ONLY the sections that appear in the layout below. Do NOT add any section that is not in the layout. For example: if the layout does NOT contain "IV. ESSAY", you must NOT include an Essay section. If it does NOT contain "III. IDENTIFICATION", do NOT include Identification. Only generate the sections that are explicitly listed in the layout.

Do NOT include any explanations or notes outside the exam itself.
Do NOT include any exam title, subject name, school info, or date at the top of the exam.
Do NOT include any subject not related in english.

All questions must be based on the following topic(s):
${topicsList}

Include the following question types and quantities (only these):
${questionTypeDetails}

Each question must:
- Strictly match the given topic(s)
- Be grammatically correct and clearly written
- Follow the numbering and indentation pattern
- For Essay-type items only: contain at least 2–3 sub-questions

For IDENTIFICATION: Do NOT use letter options (a, b, c, d). Each item is short-answer only.

Generate ONLY the sections that appear in the layout below. Do not add Essay, Identification, True or False, or Multiple Choice if that section is not in the layout.

${sections.join("\n")}

🗝️ ANSWER KEY
      Provide the correct answers per section (${answerKeySections}) only.

Follow this format strictly. Do not add any explanations or instructions outside the exam.
`;

    // Call Groq
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are an expert senior high school teacher formatting exams in clean, centered academic layout with clear sections and an answer key."
        },
        { role: "user", content: prompt }
      ]
    });

    let examText = response.choices[0]?.message?.content || "No exam generated.";

    // Strip any section that was NOT in the selected Question Types (checkboxes)
    // Remove from bottom to top (IV → III → II → I) so positions stay correct
    const sectionBoundary = "(?=\\n\\s*[IVX]+\\s*\\.|\\n[\\s\\S]*?ANSWER KEY|$)";
    if (getCount("essay") === 0) {
      examText = examText.replace(new RegExp("\\n\\s*IV\\.\\s*ESSAY[\\s\\S]*?" + sectionBoundary, "gi"), "");
    }
    if (getCount("identification") === 0) {
      examText = examText.replace(new RegExp("\\n\\s*III\\.\\s*IDENTIFICATION[\\s\\S]*?" + sectionBoundary, "gi"), "");
    }
    if (getCount("true-false") === 0) {
      examText = examText.replace(new RegExp("\\n\\s*II\\.\\s*TRUE[\\s\\S]*?" + sectionBoundary, "gi"), "");
    }
    if (getCount("multiple-choice") === 0) {
      examText = examText.replace(new RegExp("\\n\\s*I\\.\\s*MULTIPLE[\\s\\S]*?" + sectionBoundary, "gi"), "");
    }

    res.json({ success: true, exam: examText });

  } catch (err) {
    console.error("Groq exam generation error:", err);
    res.status(500).json({ success: false, message: "Failed to generate exam." });
  }
});

// ✅ SAVE EXAM — only when the user clicks Save
router.post("/api/save-exam", async (req, res) => {
  const pool = req.pool;
  const { class_id, title, content, question_count, types, created_by } = req.body;

  if (!created_by || !class_id) {
    return res.status(400).json({ success: false, error: "Teacher ID and Class ID are required" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO exams (class_id, created_by, title, content, question_count, types, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [class_id, created_by, title, content, question_count, JSON.stringify(types)]
    );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to save exam" });
  }
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

// ✅ Get all exams
router.get("/api/get-exams", async (req, res) => {
  const pool = req.pool;
  const { class_id } = req.query; // optional filter

  try {
    let query = `
      SELECT e.id, e.title, e.question_count, e.created_at,
             e.class_id, c.name AS class_name, c.section AS class_section, c.subject AS subject_name
      FROM exams e
      JOIN classes c ON e.class_id = c.id
    `;

    const params = [];
    if (class_id) {
      query += " WHERE e.class_id = ?";
      params.push(class_id);
    }

    query += " ORDER BY e.created_at DESC";

    const [rows] = await pool.query(query, params);
    res.json({ success: true, exams: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch exams" });
  }
});


// ✅ Get exam content by ID
router.get("/api/get-exam-content/:id", async (req, res) => {
  const { id } = req.params;
  const pool = req.pool;
  try {
    const [rows] = await pool.query("SELECT content FROM exams WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Exam not found" });
    res.json({ success: true, content: rows[0].content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch exam content" });
  }
});

router.post("/api/move-exam-to-cache/:id", async (req, res) => {
  const { id } = req.params;
  const pool = req.pool;

  // small debug log so you can see the route is hit
  console.log("POST /api/move-exam-to-cache/:id called with id =", id);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [insertResult] = await connection.query(`
      INSERT INTO cached_exams (subject, title, content, question_count, types, created_at)
      SELECT c.subject, e.title, e.content, e.question_count, e.types, e.created_at
      FROM exams e
      JOIN classes c ON e.class_id = c.id
      WHERE e.id = ?
    `, [id]);

    if (insertResult.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    const [deleteResult] = await connection.query(`DELETE FROM exams WHERE id = ?`, [id]);

    await connection.commit();
    connection.release();

    res.json({
      success: true,
      message: `Exam moved to cache successfully`,
      deleted: deleteResult.affectedRows
    });

  } catch (err) {
    console.error("Move to cache failed:", err);
    await connection.rollback();
    connection.release();
    res.status(500).json({ success: false, message: "Failed to move exam to cache" });
  }
});

module.exports = router;
