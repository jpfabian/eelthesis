const express = require("express");
const router = express.Router();
require("dotenv").config();
const { nowPhilippineDatetime } = require("./utils/datetime");
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

function capitalizeFirst(s) {
  if (s == null || typeof s !== "string") return s;
  const t = String(s).trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

router.post("/api/generate-exam", async (req, res) => {
  const { subject, selectedTopics, questionTypes, tos_levels } = req.body;

  try {
    const client = requireGroq(res);
    if (!client) return;

    const topicsList = selectedTopics.join(", ");

    // Build a clear text for each question type with counts
    const questionTypeDetails = questionTypes
      .map(q => `${q.type.replace("-", " ").toUpperCase()} – ${q.count} questions`)
      .join("\n");

    const tosLevels = Array.isArray(tos_levels) ? tos_levels.map((v) => String(v || "").trim().toLowerCase()).filter(Boolean) : [];
    const tosLabelMap = {
      remembering: "Remembering",
      understanding: "Understanding",
      applying: "Applying",
      analyzing: "Analyzing",
      evaluating: "Evaluating",
      creating: "Creating"
    };
    const tosLabels = tosLevels.map((v) => tosLabelMap[v]).filter(Boolean);
    const tosInstruction = tosLabels.length > 0
      ? `
TOS requirement (Bloom's cognitive levels):
- Include ONLY these cognitive levels: ${tosLabels.join(", ")}.
- Distribute items as evenly as possible across the selected levels.
- Vary item difficulty according to the selected levels.
`
      : "";

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

CRITICAL: Generate EVERY question in the layout. If the layout shows 50 numbered items in a section, you must output all 50 full questions (and 50 answers in the answer key). Do not stop early, do not write "..." or "items 25–50 similar", and do not abbreviate. Each number must have a complete question.

Do NOT include any explanations or notes outside the exam itself.
Do NOT include any exam title, subject name, school info, or date at the top of the exam.
Do NOT include any subject not related in english.

All questions must be based on the following topic(s):
${topicsList}

Include the following question types and quantities (only these):
${questionTypeDetails}

${tosInstruction}

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

    // Total questions so we request enough output tokens (50 questions ≈ 4k+ tokens; allow plenty for full exam + answer key)
    const totalQuestions = (getCount("multiple-choice") || 0) + (getCount("true-false") || 0) +
      (getCount("identification") || 0) + (getCount("essay") || 0);
    const maxTokens = Math.min(32768, Math.max(4096, totalQuestions * 150));

    // Call Groq (set max_tokens high enough so 50+ questions are not truncated)
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: maxTokens,
      messages: [
        {
          role: "system",
          content: "You are an expert senior high school teacher formatting exams in clean, centered academic layout with clear sections and an answer key. Always generate the FULL number of questions requested in each section; do not stop early or summarize."
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

  const safeTitle = capitalizeFirst(title);

  try {
    const [result] = await pool.query(
      `INSERT INTO exams (class_id, created_by, title, content, question_count, types, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [class_id, created_by, safeTitle, content, question_count, JSON.stringify(types), nowPhilippineDatetime()]
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

    // ✅ Step 5: Combine lessons + topics (include quarter for display grouping)
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
  const createdBy = Number(req.body?.created_by || req.query?.created_by || 0);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[exam]] = await connection.query(
      "SELECT * FROM exams WHERE id = ?",
      [id]
    );
    if (!exam) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    // Archive exam before delete (ignore if table doesn't exist yet)
    const snapshot = JSON.stringify(exam);
    const archivedBy = createdBy || exam.created_by;
    try {
      await connection.query(
        "INSERT INTO archive_exams (original_exam_id, archived_by, snapshot) VALUES (?, ?, ?)",
        [id, archivedBy, snapshot]
      );
    } catch (archErr) {
      if (archErr.errno !== 1146) console.warn("Archive exam (table may not exist):", archErr?.message);
    }

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

// ✅ Get archived exams (exam archive)
router.get("/api/archive-exams", async (req, res) => {
  const pool = req.pool;
  const teacherId = Number(req.query.teacher_id || req.query.user_id || 0) || null;

  try {
    let query = `
      SELECT
        ae.archive_id,
        ae.original_exam_id,
        ae.archived_by,
        ae.archived_at,
        ae.snapshot
      FROM archive_exams ae
    `;
    const params = [];

    if (teacherId) {
      query += " WHERE ae.archived_by = ?";
      params.push(teacherId);
    }

    query += " ORDER BY ae.archived_at DESC";

    const [rows] = await pool.query(query, params);

    const exams = rows.map((row) => {
      let snapshot = {};
      try {
        const raw = row.snapshot;
        if (raw == null) {
          snapshot = {};
        } else if (typeof raw === "object" && !Buffer.isBuffer(raw)) {
          snapshot = raw;
        } else {
          const str = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
          snapshot = str ? JSON.parse(str) : {};
        }
      } catch {
        snapshot = {};
      }

      const questionCountFromSnapshot =
        Number(snapshot.question_count || 0) ||
        (Array.isArray(snapshot.questions) ? snapshot.questions.length : null);

      return {
        archive_id: row.archive_id,
        original_exam_id: row.original_exam_id,
        archived_by: row.archived_by,
        archived_at: row.archived_at,
        exam_id: snapshot.id || snapshot.exam_id || row.original_exam_id,
        title: snapshot.title || "Untitled exam",
        class_id: snapshot.class_id || null,
        class_name: snapshot.class_name || null,
        section: snapshot.section || snapshot.class_section || null,
        subject_name: snapshot.subject || snapshot.subject_name || null,
        question_count: questionCountFromSnapshot,
        types: snapshot.types || null
      };
    });

    res.json({ success: true, exams });
  } catch (err) {
    // If archive_exams table does not exist yet, just return an empty list
    if (err && (err.errno === 1146 || err.code === "ER_NO_SUCH_TABLE")) {
      return res.json({ success: true, exams: [] });
    }
    console.error("Failed to fetch archived exams:", err);
    res.status(500).json({ success: false, message: "Failed to fetch archived exams" });
  }
});

// ✅ Restore an exam from archive_exams back into exams
router.post("/api/archive-exams/:archiveId/restore", async (req, res) => {
  const pool = req.pool;
  const { archiveId } = req.params;
  const teacherId = Number(req.body?.teacher_id || req.query?.teacher_id || 0) || null;

  try {
    const [rows] = await pool.query(
      "SELECT snapshot, archived_by FROM archive_exams WHERE archive_id = ?",
      [archiveId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Archived exam not found" });
    }

    const row = rows[0];
    let snapshot = {};
    try {
      const raw = row.snapshot;
      if (raw == null) {
        snapshot = {};
      } else if (typeof raw === "object" && !Buffer.isBuffer(raw)) {
        snapshot = raw;
      } else {
        const str = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
        snapshot = str ? JSON.parse(str) : {};
      }
    } catch {
      snapshot = {};
    }

    const classId = snapshot.class_id || null;
    const title = (snapshot.title || "Restored Exam").toString().trim();
    const content = (snapshot.content || "").toString();
    const createdBy = snapshot.created_by || teacherId || row.archived_by || null;

    const questionCount =
      Number(snapshot.question_count || 0) ||
      (Array.isArray(snapshot.questions) ? snapshot.questions.length : 0);

    const typesValue =
      typeof snapshot.types === "string"
        ? snapshot.types
        : snapshot.types != null
        ? JSON.stringify(snapshot.types)
        : null;

    if (!classId || !createdBy || !title || !content) {
      return res.status(400).json({
        success: false,
        message: "Cannot restore exam. Missing class, creator, title, or content in archive snapshot."
      });
    }

    const createdAt = snapshot.created_at || nowPhilippineDatetime();

    const [result] = await pool.query(
      `INSERT INTO exams (class_id, created_by, title, content, question_count, types, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [classId, createdBy, title, content, questionCount || 0, typesValue, createdAt]
    );

    // Optionally remove the row from archive_exams so it no longer appears in the archive list
    await pool.query("DELETE FROM archive_exams WHERE archive_id = ?", [archiveId]);

    return res.json({
      success: true,
      message: "Exam restored from archive successfully.",
      exam_id: result.insertId
    });
  } catch (err) {
    console.error("Failed to restore archived exam:", err);
    res.status(500).json({ success: false, message: "Failed to restore archived exam" });
  }
});

module.exports = router;
