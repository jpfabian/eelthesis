const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const pool = require("./db"); // ✅ Import your pool

// SIGNUP route
router.post("/api/auth/register", async (req, res) => {
  const { fname, lname, email, password, role } = req.body;

  if (!fname || !lname || !email || !password || !role)
    return res.status(400).json({ success: false, error: "All required fields must be provided" });

  let conn;
  try {
    conn = await pool.getConnection();

    // Check if email exists
    const [existing] = await conn.execute("SELECT user_id FROM users WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(400).json({ success: false, error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await conn.execute(
      "INSERT INTO users (fname, lname, email, password, role) VALUES (?, ?, ?, ?, ?)",
      [fname, lname, email, hashedPassword, role]
    );

    res.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: result.insertId,
        fname,
        lname,
        email,
        role,
      },
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
