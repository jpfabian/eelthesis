const express = require("express");
const router = express.Router();
const pool = require("./db"); // ✅ Import your pool
const { nowPhilippineDatetime } = require("./utils/datetime");

function toNameCase(input) {
  if (input == null || typeof input !== "string") return input;
  return String(input)
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Function to generate class code
function generateClassCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// List tracks (for signup dropdown)
router.get("/api/tracks", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT track_id, track_name FROM tracks ORDER BY track_name");
    res.json({ success: true, tracks: rows });
  } catch (err) {
    console.error("❌ Tracks API error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// List subjects (for Create Class dropdown) — uses curriculum subjects table
router.get("/api/subjects", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT subject_id, subject_name FROM subjects ORDER BY subject_name");
    res.json({ success: true, subjects: rows });
  } catch (err) {
    console.error("❌ Subjects API error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Create Class API
router.post("/api/classes", async (req, res) => {
  try {
    const { name, section, subject, teacher_id } = req.body;
    if (!name || !section || !subject || !teacher_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const class_code = generateClassCode();

    const [result] = await pool.query(
      "INSERT INTO classes (class_code, name, section, subject, teacher_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [class_code, name, section, subject, teacher_id, nowPhilippineDatetime()]
    );

    res.json({ success: true, class_id: result.insertId, class_code });
  } catch (err) {
    console.error("❌ Classes API error:", err);
    res.status(500).json({ error: "Database error" });
  }
});


router.get("/api/classes/:teacherId", async (req, res) => {
  const { teacherId } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM classes WHERE teacher_id = ?",
      [teacherId]
    );
    res.json(rows); // returns an array of classes
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete class (teacher-owned) — archive first, then delete
async function handleDeleteClass(req, res) {
  const { classId } = req.params;
  const teacherId = Number(req.body?.teacher_id || req.query?.teacher_id || 0);
  if (!classId || !teacherId) {
    return res.status(400).json({ success: false, message: "Missing class or teacher" });
  }
  try {
    const [rows] = await pool.query(
      "SELECT * FROM classes WHERE id = ? AND teacher_id = ? LIMIT 1",
      [classId, teacherId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Class not found or access denied" });
    }
    const cls = rows[0];
    const snapshot = JSON.stringify(cls);

    // Insert into archive (ignore if table doesn't exist yet)
    try {
      await pool.query(
        "INSERT INTO archive_classrooms (original_class_id, archived_by, snapshot) VALUES (?, ?, ?)",
        [classId, teacherId, snapshot]
      );
    } catch (archErr) {
      if (archErr.errno !== 1146) console.warn("Archive classroom (table may not exist):", archErr?.message);
    }

    await pool.query("DELETE FROM classes WHERE id = ? AND teacher_id = ?", [classId, teacherId]);
    res.json({ success: true, message: "Class archived successfully" });
  } catch (err) {
    console.error("❌ Delete class error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

router.delete("/api/classes/:classId", handleDeleteClass);
// Backward-compatible alias in case DELETE route is blocked/unsupported.
router.post("/api/classes/:classId/delete", handleDeleteClass);


// Join class 
router.post("/api/join-class", async (req, res) => {
  const { student_id, class_code } = req.body;

  try {
    // 1. Find the class by code
    const [classes] = await pool.query(
      "SELECT id FROM classes WHERE class_code = ?",
      [class_code]
    );

    if (classes.length === 0) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const classId = classes[0].id;

    // 2. Get the student's first and last name
    const [users] = await pool.query(
      "SELECT fname, lname FROM users WHERE user_id = ?",
      [student_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const { fname, lname } = users[0];
    const student_fname = toNameCase(fname);
    const student_lname = toNameCase(lname);

    // 3. Insert both names into student_classes (capitalized)
    await pool.query(
      `INSERT INTO student_classes (student_id, student_fname, student_lname, class_id, status, joined_at)
      VALUES (?, ?, ?, ?, 'pending', ?)`,
      [student_id, student_fname, student_lname, classId, nowPhilippineDatetime()]
    );

    res.json({ success: true, message: "Please wait for your teacher's approval!" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, message: "Already joined this class" });
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update student status (accept/reject)
router.put("/api/students/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await pool.query(
      "UPDATE student_classes SET status = ? WHERE id = ?",
      [status, id]
    );
    res.json({ success: true, message: `Student ${status} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get classes for a student
router.get("/api/student-classes/:studentId", async (req, res) => {
  const { studentId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.section, c.subject, c.class_code 
       FROM student_classes sc
       JOIN classes c ON sc.class_id = c.id
       WHERE sc.student_id = ? AND sc.status = 'accepted'`, // ← filter only accepted
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get pending students for a specific class
router.get("/api/class/:classId/pending-students", async (req, res) => {
  const { classId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT sc.id, sc.student_id, sc.student_fname, sc.student_lname, sc.status
       FROM student_classes sc
       WHERE sc.class_id = ? AND sc.status = 'pending'`,
      [classId]
    );
    res.json((rows || []).map((r) => ({
      ...r,
      student_fname: toNameCase(r.student_fname),
      student_lname: toNameCase(r.student_lname),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Get all students (pending + accepted) in a class
router.get("/api/class/:classId/students", async (req, res) => {
  const { classId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT 
          sc.id,
          sc.student_id,
          sc.student_fname,
          sc.student_lname,
          sc.status,
          sc.joined_at,
          u.email,
          u.avatar_url
       FROM student_classes sc
       JOIN users u ON sc.student_id = u.user_id
       WHERE sc.class_id = ?`,
      [classId]
    );

    res.json((rows || []).map((r) => ({
      ...r,
      student_fname: toNameCase(r.student_fname),
      student_lname: toNameCase(r.student_lname),
      avatar_url: r.avatar_url || null,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;