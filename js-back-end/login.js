// login.js
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

// LOGIN route
router.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, error: "Email and password are required" });
  }

  const pool = req.pool; // ✅ Use pool passed from server.js

  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.execute(
      `
      SELECT user_id, fname, lname, email, password, role
      FROM users
      WHERE email = ?
      `,
      [email]
    );

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid email or password" });
    }

    const user = rows[0];

    // Compare password hash
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid email or password" });
    }

    res.json({
      success: true,
      message: "Login successful",
      user: {
        user_id: user.user_id,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
