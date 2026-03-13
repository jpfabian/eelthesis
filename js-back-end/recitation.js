const express = require("express");
const router = express.Router();
require("dotenv").config();
const Groq = require("groq-sdk");

function toNameCase(input) {
  if (input == null || typeof input !== "string") return input;
  return String(input)
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

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

let recitationScoresTableEnsured = false;
async function ensureRecitationScoresTable(pool) {
  if (recitationScoresTableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recitation_scores (
      recitation_score_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      session_key VARCHAR(80) NOT NULL,
      class_id INT UNSIGNED NOT NULL,
      topic_id INT UNSIGNED NULL,
      teacher_id INT UNSIGNED NULL,
      student_id INT UNSIGNED NOT NULL,
      question_index INT UNSIGNED NOT NULL,
      question_type ENUM('multiple-choice','true-false','identification') NOT NULL,
      question_text TEXT NULL,
      student_answer TEXT NULL,
      correct_answer VARCHAR(255) NULL,
      is_correct TINYINT(1) NOT NULL DEFAULT 0,
      points_earned TINYINT UNSIGNED NOT NULL DEFAULT 0,
      points_possible TINYINT UNSIGNED NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (recitation_score_id),
      UNIQUE KEY uq_recitation_scores_session_student_q (session_key, student_id, question_index),
      KEY idx_recitation_scores_class (class_id),
      KEY idx_recitation_scores_topic (topic_id),
      KEY idx_recitation_scores_student (student_id),
      CONSTRAINT fk_recitation_scores_class
        FOREIGN KEY (class_id) REFERENCES classes(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_recitation_scores_topic
        FOREIGN KEY (topic_id) REFERENCES topics(topic_id)
        ON DELETE SET NULL,
      CONSTRAINT fk_recitation_scores_teacher
        FOREIGN KEY (teacher_id) REFERENCES users(user_id)
        ON DELETE SET NULL,
      CONSTRAINT fk_recitation_scores_student
        FOREIGN KEY (student_id) REFERENCES users(user_id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  recitationScoresTableEnsured = true;
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
      name: toNameCase(`${s.student_fname} ${s.student_lname}`),
      answered: false
    }));
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST /api/recitation/scores — save one scored recitation item (1 point per correct answer)
router.post('/api/recitation/scores', async (req, res) => {
  const pool = req.pool;
  const body = req.body || {};
  const sessionKey = String(body.session_key || '').trim();
  const classId = Number(body.class_id);
  const topicIdRaw = body.topic_id != null && body.topic_id !== '' ? Number(body.topic_id) : null;
  const teacherIdRaw = body.teacher_id != null && body.teacher_id !== '' ? Number(body.teacher_id) : null;
  const studentId = Number(body.student_id);
  // Keep one row per student+session by forcing a stable index.
  // Existing unique key: (session_key, student_id, question_index)
  const questionIndex = 0;
  const questionType = String(body.question_type || '').trim();
  const questionText = body.question_text != null ? String(body.question_text) : null;
  const studentAnswer = body.student_answer != null ? String(body.student_answer) : null;
  const correctAnswer = body.correct_answer != null ? String(body.correct_answer) : null;
  const isCorrect = body.is_correct === true || Number(body.is_correct) === 1;
  const pointsEarned = isCorrect ? 1 : 0;
  const pointsPossible = 1;

  if (!sessionKey || !Number.isFinite(classId) || !Number.isFinite(studentId) || !questionType) {
    return res.status(400).json({ success: false, message: 'session_key, class_id, student_id, and question_type are required.' });
  }
  if (!['multiple-choice', 'true-false', 'identification'].includes(questionType)) {
    return res.status(400).json({ success: false, message: 'Invalid question_type.' });
  }

  const topicId = Number.isFinite(topicIdRaw) ? topicIdRaw : null;
  const teacherId = Number.isFinite(teacherIdRaw) ? teacherIdRaw : null;

  try {
    await ensureRecitationScoresTable(pool);
    await pool.query(
      `INSERT INTO recitation_scores
         (session_key, class_id, topic_id, teacher_id, student_id, question_index, question_type, question_text, student_answer, correct_answer, is_correct, points_earned, points_possible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         topic_id = VALUES(topic_id),
         teacher_id = VALUES(teacher_id),
         question_type = VALUES(question_type),
         question_text = VALUES(question_text),
         student_answer = VALUES(student_answer),
         correct_answer = VALUES(correct_answer),
         is_correct = VALUES(is_correct),
         points_earned = COALESCE(points_earned, 0) + VALUES(points_earned),
         points_possible = COALESCE(points_possible, 0) + VALUES(points_possible)`,
      [
        sessionKey,
        classId,
        topicId,
        teacherId,
        studentId,
        questionIndex,
        questionType,
        questionText,
        studentAnswer,
        correctAnswer,
        isCorrect ? 1 : 0,
        pointsEarned,
        pointsPossible
      ]
    );

    return res.json({ success: true, points_earned: pointsEarned, points_possible: pointsPossible });
  } catch (err) {
    console.error('Save recitation score error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save recitation score.' });
  }
});

// POST /api/generate-recitation-questions — AI-generated questions via GROQ (handler also exported for server.js)
async function handleGenerateRecitationQuestions(req, res) {
  const pool = req.pool;
  const body = req.body || {};
  const topic_id = (body.topic_id != null && body.topic_id !== '') ? String(body.topic_id).trim() : '';
  const allowedTypes = ['multiple-choice', 'true-false', 'identification'];
  const requestedTypesRaw = Array.isArray(body.question_types) && body.question_types.length > 0
    ? body.question_types.map((t) => String(t || '').trim().toLowerCase()).filter((t) => allowedTypes.includes(t))
    : ['multiple-choice'];
  const question_types = requestedTypesRaw.length > 0 ? [...new Set(requestedTypesRaw)] : ['multiple-choice'];
  const rawCounts = body.question_counts && typeof body.question_counts === 'object' ? body.question_counts : {};
  const question_counts = {};
  for (const type of question_types) {
    const val = parseInt(rawCounts[type], 10);
    question_counts[type] = Math.max(0, Math.min(30, Number.isFinite(val) ? val : 0));
  }
  let requestedTotal = Object.values(question_counts).reduce((sum, n) => sum + Number(n || 0), 0);
  if (requestedTotal <= 0) {
    const fallbackCount = Math.max(1, Math.min(80, parseInt(body.question_count, 10) || 10));
    question_counts[question_types[0]] = fallbackCount;
    requestedTotal = fallbackCount;
  }
  const question_count = Math.max(1, Math.min(80, requestedTotal));

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
      'true-false': 'true or false with options ["True","False"] and correctAnswer set to "True" or "False"',
      'identification': 'identification with a one-word answer only'
    };

    const parseAiQuestions = (raw) => {
      const text = String(raw || '').trim();
      if (!text) throw new Error('No response from AI.');

      let cleaned = text.replace(/^\uFEFF/, '');
      const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();
      const start = cleaned.indexOf('[');
      if (start === -1) {
        console.error('Recitation: no [ found. Snippet:', text.slice(0, 400));
        throw new Error('AI returned invalid JSON. Try again.');
      }
      const end = findMatchingBracket(cleaned, start);
      if (end === -1) {
        console.error('Recitation: no matching ]. Snippet:', cleaned.slice(0, 400));
        throw new Error('AI returned invalid JSON. Try again.');
      }
      cleaned = cleaned.slice(start, end + 1);
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

      try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) throw new Error('AI did not return an array.');
        return parsed;
      } catch (parseErr) {
        const fallback = parseQuestionsFallback(cleaned);
        if (fallback && fallback.length > 0) return fallback;
        console.error('Recitation JSON parse error:', parseErr.message);
        console.error('Cleaned snippet:', cleaned.slice(0, 800));
        throw new Error('AI returned invalid JSON. Try again.');
      }
    };

    const normalizeRequestedType = (rawType) => {
      const t = String(rawType || '').trim().toLowerCase();
      if (question_types.includes(t)) return t;
      if ((t === 'multiple choice' || t === 'mcq') && question_types.includes('multiple-choice')) return 'multiple-choice';
      if ((t === 'true false' || t === 'true/false' || t === 'tf') && question_types.includes('true-false')) return 'true-false';
      if ((t === 'identification' || t === 'short-answer' || t === 'short answer') && question_types.includes('identification')) return 'identification';
      return question_types[0];
    };
    const oneWordPattern = /\b(one word|single word|in one word|give one word|answer in one word|identify(?:\s+the)?\s+word)\b/i;
    const sanitizeQuestionTextByType = (rawQuestion, type) => {
      let qText = String(rawQuestion || '').trim();
      if (!qText) {
        return type === 'true-false'
          ? 'Determine whether the statement is true or false.'
          : type === 'multiple-choice'
            ? 'Choose the best answer.'
            : 'Provide the answer.';
      }

      if (type !== 'identification' && oneWordPattern.test(qText)) {
        // Hard guard: prevent identification-style prompts when type is not identification.
        qText = qText
          .replace(/^\s*give one word(?:\s+that|\s+for|\s+to)?\s*/i, 'Choose the best answer for ')
          .replace(/\bin one word\b/ig, '')
          .replace(/\bone word\b/ig, 'best answer')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if (!qText || oneWordPattern.test(qText)) {
          qText = type === 'true-false'
            ? 'Determine whether the statement is true or false.'
            : 'Choose the best answer.';
        }
      }
      return qText;
    };

    const normalizeQuestion = (q, i, forcedType) => {
      const type = forcedType || normalizeRequestedType(q.type);
      let options = null;
      if (type === 'true-false') {
        options = ['True', 'False'];
      } else if (type !== 'identification') {
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
      }
      const rawCorrectAnswer = String(q.correctAnswer != null ? q.correctAnswer : q.answer != null ? q.answer : '').trim();
      const normalizedCorrectAnswer = type === 'identification'
        ? (rawCorrectAnswer.split(/\s+/)[0] || '')
        : type === 'true-false'
          ? (String(rawCorrectAnswer).toLowerCase() === 'false' ? 'False' : 'True')
        : rawCorrectAnswer;

      // Hard guard: MCQ must always be rendered as choices, never text input.
      if (type === 'multiple-choice') {
        const seen = new Set();
        let mcqOptions = (Array.isArray(options) ? options : [])
          .map((x) => String(x || '').trim())
          .filter((x) => x && !seen.has(x) && seen.add(x));

        const mcqCorrect = String(normalizedCorrectAnswer || '').trim();
        if (mcqCorrect && !mcqOptions.some((o) => o.toLowerCase() === mcqCorrect.toLowerCase())) {
          mcqOptions.unshift(mcqCorrect);
        }
        if (mcqOptions.length === 0) {
          const seed = mcqCorrect || 'Correct answer';
          mcqOptions = [seed, 'Option B', 'Option C', 'Option D'];
        }
        while (mcqOptions.length < 4) {
          mcqOptions.push(`Option ${String.fromCharCode(65 + mcqOptions.length)}`);
        }
        mcqOptions = mcqOptions.slice(0, 4);
        options = mcqOptions;
      }

      return {
        id: 'q' + (i + 1),
        type,
        question: sanitizeQuestionTextByType(q.question, type),
        options,
        correctAnswer: normalizedCorrectAnswer
      };
    };

    const fallbackByType = (type, idx) => {
      if (type === 'true-false') {
        return {
          id: `q-fallback-${idx + 1}`,
          type,
          question: `True or False: This statement is about ${topicTitle}.`,
          options: ['True', 'False'],
          correctAnswer: 'True'
        };
      }
      if (type === 'multiple-choice') {
        return {
          id: `q-fallback-${idx + 1}`,
          type,
          question: `Choose the best answer about ${topicTitle}.`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option A'
        };
      }
      return {
        id: `q-fallback-${idx + 1}`,
        type: 'identification',
        question: `Give one word related to ${topicTitle}.`,
        options: null,
        correctAnswer: 'term'
      };
    };

    const generateQuestionsChunk = async (type, count) => {
      const systemPrompt = `You are a recitation question generator for high school English. Reply with ONLY a single valid JSON array. Do not use markdown, code blocks, or any text outside the array. Generate ONLY ${type} questions.`;
      const userPrompt = `Topic: "${topicTitle}". Generate exactly ${count} ${typeDescriptions[type]}. Return a JSON array only. Each item must have "type", "question", "options", and "correctAnswer". For multiple-choice, options must contain exactly 4 strings and correctAnswer must match one option exactly. For true-false, options must be ["True","False"]. For identification, options must be null and correctAnswer must be exactly one word.`;

      let lastErr = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const completion = await client.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: attempt === 0 ? 0.4 : 0.2,
            max_tokens: 2200
          });

          const raw = completion.choices?.[0]?.message?.content || '';
          const parsed = parseAiQuestions(raw);
          const normalized = parsed
            .slice(0, count)
            .map((item, idx) => normalizeQuestion(item, idx, type));

          while (normalized.length < count) {
            normalized.push(fallbackByType(type, normalized.length));
          }
          return normalized.slice(0, count);
        } catch (err) {
          lastErr = err;
        }
      }

      console.error(`Recitation chunk generation failed for ${type}:`, lastErr?.message || lastErr);
      return Array.from({ length: count }, (_, idx) => fallbackByType(type, idx));
    };

    const finalQuestions = [];
    for (const type of question_types) {
      const need = Number(question_counts[type] || 0);
      if (need <= 0) continue;
      const chunkSize = 8;
      for (let start = 0; start < need; start += chunkSize) {
        const batchCount = Math.min(chunkSize, need - start);
        const batch = await generateQuestionsChunk(type, batchCount);
        finalQuestions.push(...batch);
      }
    }
    finalQuestions.forEach((q, i) => { q.id = 'q' + (i + 1); });

    res.json({ success: true, questions: finalQuestions });
  } catch (err) {
    console.error('Error in /api/generate-recitation-questions:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
}

router.post('/api/generate-recitation-questions', handleGenerateRecitationQuestions);

module.exports = router;
module.exports.handleGenerateRecitationQuestions = handleGenerateRecitationQuestions;