const express = require("express");
const router = express.Router();
require("dotenv").config();
let Groq = null;
try {
  Groq = require("groq-sdk");
} catch (_) {}
const groq = (() => {
  const key = String(process.env.GROQ_API_KEY || "").trim();
  if (key && Groq) return new Groq({ apiKey: key });
  return null;
})();

function hasScenarioExampleContent(html) {
  const text = String(html || "").toLowerCase();
  return /example|scenario|real-life|real life|situation/.test(text);
}

// GET curriculum with subjects → lessons → topics
router.get("/curriculum", async (req, res) => {
  try {
    const pool = req.pool; // use pool from middleware
    const subjectId = req.query.subject_id ? Number(req.query.subject_id) : null;

    const whereClause = Number.isFinite(subjectId) ? "WHERE s.subject_id = ?" : "";
    const params = Number.isFinite(subjectId) ? [subjectId] : [];

    const [rows] = await pool.query(`
      SELECT 
        s.subject_id, s.subject_name, 
        l.lesson_id, l.lesson_title, l.quarter_number, l.quarter_title,
        t.topic_id, t.topic_title, t.pdf_path
      FROM subjects s
      LEFT JOIN lessons l ON s.subject_id = l.subject_id
      LEFT JOIN topics t ON l.lesson_id = t.lesson_id
      ${whereClause}
      ORDER BY s.subject_id, COALESCE(l.quarter_number, 0), l.lesson_id, t.topic_id
    `, params);

    const subjects = [];
    const subjectMap = {};

    rows.forEach(r => {
      if (!subjectMap[r.subject_id]) {
        subjectMap[r.subject_id] = { 
          subject_id: r.subject_id, 
          subject_name: r.subject_name, 
          lessons: [] 
        };
        subjects.push(subjectMap[r.subject_id]);
      }

      const subject = subjectMap[r.subject_id];
      let lesson = subject.lessons.find(l => l.lesson_id === r.lesson_id);

      if (!lesson && r.lesson_id) {
        lesson = { 
          lesson_id: r.lesson_id, 
          lesson_title: r.lesson_title, 
          quarter_number: r.quarter_number ?? null, 
          quarter_title: r.quarter_title ?? null, 
          topics: [] 
        };
        subject.lessons.push(lesson);
      }

      if (lesson && r.topic_id) {
        lesson.topics.push({
          topic_id: r.topic_id,
          topic_title: r.topic_title,
          pdf_path: r.pdf_path
        });
      }
    });

    res.json(subjects);
  } catch (err) {
    console.error("❌ Curriculum error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/generate-topic-content — AI-generated topic presentation (cached per topic)
// Returns stored content if available so teacher and students see the same presentation.
// Pass regenerate: true to force new generation (e.g. teacher wants to refresh).
router.post("/api/generate-topic-content", async (req, res) => {
  const { topic_id, topic_title, lesson_title, subject_name, regenerate } = req.body || {};

  const topicId = topic_id != null ? Number(topic_id) : null;
  const tTitle = String(topic_title ?? "").trim();
  const lTitle = String(lesson_title ?? "").trim();
  const sName = String(subject_name ?? "").trim();
  const forceRegenerate = !!regenerate;

  if (!tTitle) {
    return res.status(400).json({ success: false, error: "topic_title is required" });
  }

  const pool = req.pool;

  try {
    if (Number.isFinite(topicId) && !forceRegenerate) {
      const [rows] = await pool.query(
        "SELECT topic_content FROM topics WHERE topic_id = ? LIMIT 1",
        [topicId]
      );
      const cached = rows?.[0]?.topic_content;
      if (cached && String(cached).trim().length > 0) {
        if (hasScenarioExampleContent(cached)) {
          return res.json({ success: true, content: cached, cached: true });
        }
      }
    }
  } catch (err) {
    console.warn("Topic content cache lookup:", err?.message);
  }

  if (!groq) {
    return res.status(503).json({
      success: false,
      error: "AI service is not configured. Set GROQ_API_KEY in your environment.",
    });
  }

  const context = [sName, lTitle].filter(Boolean).join(" — ");
  const prompt = `You are an expert senior high school teacher. Create a clear, educational presentation content.

IMPORTANT: Generate in this order — (1) Lesson first, (2) Topic second.

Lesson: ${lTitle || "This lesson"}
Subject: ${sName || "English"}
Topic (within the lesson): ${tTitle}

Structure your output as follows:

1. LESSON OVERVIEW (first)
   - Use <h2> for the lesson title/overview section
   - Briefly introduce what the lesson covers and its importance
   - 2-4 sentences or bullet points

2. TOPIC CONTENT (second)
   - Use <h2> for the topic: "${tTitle}"
   - Use <h3> for subheadings within the topic
   - Use <p> for paragraphs
   - Use <ul><li> for bullet points where appropriate
   - Use <strong> for emphasis
   - Include key definitions, examples, and takeaways for this specific topic

3. EXAMPLE SCENARIO (required)
   - Add a separate <h3> titled "Example Scenario" immediately after the main topic explanation
   - Write 1 short realistic classroom, school, or everyday-life scenario showing how the topic is used
   - Follow it with 2-3 sentences explaining why the example fits the topic

4. QUICK EXAMPLES (required)
   - Add another <h3> titled "Quick Examples" directly after Example Scenario
   - Include a short <ul> with 2-4 simple examples related to the topic

5. KEY TAKEAWAYS (required)
   - After the examples sections, add a final <h3> titled "Key Takeaways"
   - Provide a short <ul> (2-4 bullets) summarizing the most important points students should remember

Format rules:
- Keep it concise but informative (roughly 350-650 words total)
- Output ONLY valid HTML, no markdown, no code blocks, no explanation
- Do not include <html>, <head>, or <body> tags
- NEVER use asterisks (** or *) anywhere — use <strong> or <em> for emphasis only`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You output clean HTML for educational content. No markdown, no code fences, no asterisks (** or *). Use <strong> and <em> for emphasis." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1500,
    });

    let content = completion.choices?.[0]?.message?.content?.trim() || "";
    // Strip any asterisks (** or *) that the model may have output
    content = content.replace(/\*\*/g, "").replace(/\*/g, "");
    // Remove generic example lead‑ins we don't want to show verbatim
    const bannedExamplePhrases = [
      /the following passage is an example of academic writing:?/gi,
      /the following passage is an example:?/gi,
      /the following text is an example:?/gi
    ];
    bannedExamplePhrases.forEach((re) => {
      content = content.replace(re, "");
    });
    if (content && !hasScenarioExampleContent(content)) {
      content += `
<h3>Example Scenario</h3>
<p>Imagine a student encountering <strong>${tTitle}</strong> during a classroom discussion or real-life communication task. This scenario helps connect the lesson idea to a practical situation so learners can understand when and why the topic matters.</p>
<h3>Quick Examples</h3>
<ul>
  <li>A simple classroom-based use of <strong>${tTitle}</strong></li>
  <li>An everyday communication situation connected to the topic</li>
</ul>`.trim();
    }
    if (!content) {
      return res.status(500).json({ success: false, error: "No content generated" });
    }

    if (Number.isFinite(topicId)) {
      try {
        await pool.query("UPDATE topics SET topic_content = ? WHERE topic_id = ?", [content, topicId]);
      } catch (err) {
        console.warn("Could not cache topic content (run migration?):", err?.message);
      }
    }

    res.json({ success: true, content, cached: false });
  } catch (err) {
    console.error("❌ Generate topic content error:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to generate content" });
  }
});

module.exports = router;
