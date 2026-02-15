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
    message: "AI service is not configured. Set GROQ_API_KEY in your .env file."
  });
  return null;
}

// Find the index of the matching ']' for '[' at startIdx, skipping brackets inside double-quoted strings
function findMatchingBracket(str, startIdx) {
  let depth = 0;
  let inString = false;
  let escape = false;
  const quote = '"';
  for (let i = startIdx; i < str.length; i++) {
    const c = str[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === quote) { inString = !inString; continue; }
    if (!inString) {
      if (c === '[') depth++;
      else if (c === ']') { depth--; if (depth === 0) return i; }
    }
  }
  return -1;
}

// Fallback: try to parse individual objects and build array (handles trailing commas, minor glitches)
function parseQuestionsFallback(str) {
  const out = [];
  let i = 0;
  while (i < str.length) {
    const start = str.indexOf('{', i);
    if (start === -1) break;
    const end = findMatchingBrace(str, start);
    if (end === -1) break;
    const chunk = str.slice(start, end + 1).replace(/,(\s*[}\]])/g, '$1');
    try {
      const obj = JSON.parse(chunk);
      if (obj && (obj.question != null || obj.type != null)) out.push(obj);
    } catch (_) {}
    i = end + 1;
  }
  return out.length > 0 ? out : null;
}
function findMatchingBrace(str, startIdx) {
  let depth = 0;
  let inString = false;
  let escape = false;
  const quote = '"';
  for (let i = startIdx; i < str.length; i++) {
    const c = str[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === quote) { inString = !inString; continue; }
    if (!inString) {
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return i; }
    }
  }
  return -1;
}

// GET /api/recitation/class/:classId/students — accepted students only (for recitation picker).
// Student progress page uses GET /api/class/:classId/students from classes.js (pending + accepted, full fields).
router.get('/api/recitation/class/:classId/students', async (req, res) => {
  const classId = req.params.classId;
  const pool = req.pool;
  if (!pool) return res.status(500).json({ error: 'Database not available' });
  try {
    const [rows] = await pool.query(
      `SELECT student_id, student_fname, student_lname
       FROM student_classes
       WHERE class_id = ? AND status = 'accepted'
       ORDER BY student_fname, student_lname`,
      [classId]
    );
    const students = rows.map(s => ({
      id: s.student_id,
      name: `${s.student_fname} ${s.student_lname}`,
      answered: false
    }));
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST /api/generate-recitation-questions — AI-generated questions via GROQ (handler also exported for server.js)
async function handleGenerateRecitationQuestions(req, res) {
  const pool = req.pool;
  const body = req.body || {};
  const topic_id = (body.topic_id != null && body.topic_id !== '') ? String(body.topic_id).trim() : '';
  const question_types = Array.isArray(body.question_types) && body.question_types.length > 0
    ? body.question_types
    : ['multiple-choice'];
  const question_count = Math.max(1, Math.min(30, parseInt(body.question_count, 10) || 10));

  if (!topic_id) {
    return res.status(400).json({ success: false, message: 'Please select a topic.' });
  }

  try {
    const client = requireGroq(res);
    if (!client) return;

    const [topicRows] = await pool.query('SELECT topic_title FROM topics WHERE topic_id = ?', [topic_id]);
    if (!topicRows || topicRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Topic not found.' });
    }
    const topicTitle = topicRows[0].topic_title;

    const typeDescriptions = {
      'multiple-choice': 'multiple choice with 4 options (A, B, C, D) and one correct answer',
      'true-false': 'true or false: statement with options ["True","False"] and correctAnswer "True" or "False"',
      'identification': 'identification: short answer question, options null, correctAnswer the expected word or phrase'
    };
    const typeList = question_types.map(t => typeDescriptions[t] || t).join('; ');

    const systemPrompt = `You are a recitation question generator for high school English. Reply with ONLY a single valid JSON array. Do not use markdown, code blocks, or any text outside the array. Each element must be an object with: "type" (one of: multiple-choice, true-false, identification), "question" (string), "options" (for multiple-choice: array of exactly 4 strings, each string is the full choice text that will be shown to the user, e.g. "The correct answer here"; for true-false: ["True","False"]; for identification: null), "correctAnswer" (string; for multiple-choice must match one of the option strings exactly). Use double quotes for all JSON keys and strings. No trailing commas.`;

    const userPrompt = `Topic: "${topicTitle}". Generate exactly ${question_count} recitation questions. Distribute across these types: ${typeList}. For multiple-choice, "options" must be an array of exactly 4 strings (the full text of each choice). Example: [{"type":"multiple-choice","question":"What is the past tense of go?","options":["goed","went","gone","going"],"correctAnswer":"went"},{"type":"true-false","question":"Water is H2O.","options":["True","False"],"correctAnswer":"True"},{"type":"identification","question":"Name the verb.","options":null,"correctAnswer":"run"}]`;

    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 4096
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    if (!raw.trim()) {
      return res.status(500).json({ success: false, message: 'No response from AI.' });
    }

    // Extract JSON array: strip markdown and find balanced [...] (skip brackets inside strings)
    let cleaned = raw.trim().replace(/^\uFEFF/, '');
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();
    const start = cleaned.indexOf('[');
    if (start === -1) {
      console.error('Recitation: no [ found. Snippet:', raw.slice(0, 400));
      return res.status(500).json({ success: false, message: 'AI returned invalid JSON. Try again.' });
    }
    const end = findMatchingBracket(cleaned, start);
    if (end === -1) {
      console.error('Recitation: no matching ]. Snippet:', cleaned.slice(0, 400));
      return res.status(500).json({ success: false, message: 'AI returned invalid JSON. Try again.' });
    }
    cleaned = cleaned.slice(start, end + 1);
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch (parseErr) {
      const fallback = parseQuestionsFallback(cleaned);
      if (fallback && fallback.length > 0) {
        questions = fallback;
      } else {
        console.error('Recitation JSON parse error:', parseErr.message);
        console.error('Cleaned snippet:', cleaned.slice(0, 800));
        return res.status(500).json({ success: false, message: 'AI returned invalid JSON. Try again.' });
      }
    }

    if (!Array.isArray(questions)) {
      return res.status(500).json({ success: false, message: 'AI did not return an array. Try again.' });
    }

    const normalized = questions.slice(0, question_count).map((q, i) => {
      const type = (q.type && question_types.includes(q.type)) ? q.type : question_types[0];
      let options = null;
      if (Array.isArray(q.options) && q.options.length > 0) {
        options = q.options.map(opt => {
          if (opt == null) return '';
          if (typeof opt === 'string') return String(opt).trim();
          if (typeof opt === 'object' && (opt.text != null || opt.value != null || opt.label != null)) return String(opt.text ?? opt.value ?? opt.label ?? '').trim();
          return String(opt).trim();
        }).filter(Boolean);
        if (options.length === 0) options = null;
      } else if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
        options = Object.values(q.options).map(v => (v != null ? String(v).trim() : '')).filter(Boolean);
        if (options.length === 0) options = null;
      }
      return {
        id: 'q' + (i + 1),
        type,
        question: String(q.question || ''),
        options,
        correctAnswer: String(q.correctAnswer != null ? q.correctAnswer : q.answer != null ? q.answer : '')
      };
    });

    res.json({ success: true, questions: normalized });
  } catch (err) {
    console.error('Error in /api/generate-recitation-questions:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
}

router.post('/api/generate-recitation-questions', handleGenerateRecitationQuestions);

module.exports = router;
module.exports.handleGenerateRecitationQuestions = handleGenerateRecitationQuestions;