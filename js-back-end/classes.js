const express = require("express");
const router = express.Router();
const pool = require("./db"); // ✅ Import your pool

// Function to generate class code
function generateClassCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create Class API
router.post("/api/classes", async (req, res) => {
  try {
    const { name, section, subject, teacher_id } = req.body;
    if (!name || !section || !subject || !teacher_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const class_code = generateClassCode();

    const [result] = await pool.query(
      "INSERT INTO classes (class_code, name, section, subject, teacher_id) VALUES (?, ?, ?, ?, ?)",
      [class_code, name, section, subject, teacher_id]
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

    const { fname: student_fname, lname: student_lname } = users[0];

    // 3. Insert both names into student_classes
    await pool.query(
      `INSERT INTO student_classes (student_id, student_fname, student_lname, class_id, status)
      VALUES (?, ?, ?, ?, 'pending')`,
      [student_id, student_fname, student_lname, classId]
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
    res.json(rows);
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
          u.email
       FROM student_classes sc
       JOIN users u ON sc.student_id = u.user_id
       WHERE sc.class_id = ?`,
      [classId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;