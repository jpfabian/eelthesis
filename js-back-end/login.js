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

    let rows = [];
    try {
      // Newer schema (supports deactivate)
      const [r] = await conn.execute(
        `
        SELECT user_id, fname, lname, email, password, role,
               verification_status, rejected_reason,
               is_active, deactivated_reason
        FROM users
        WHERE email = ?
        `,
        [email]
      );
      rows = r;
    } catch (e) {
      // Backward compatible if columns don't exist yet
      if (String(e?.code || "") !== "ER_BAD_FIELD_ERROR") throw e;
      const [r] = await conn.execute(
        `
        SELECT user_id, fname, lname, email, password, role,
               verification_status, rejected_reason
        FROM users
        WHERE email = ?
        `,
        [email]
      );
      rows = r;
    }

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

    // If account verification is enabled, block non-approved accounts (except admins)
    const status = user.verification_status; // may be undefined if column doesn't exist
    if (user.role !== "admin" && typeof status === "string") {
      if (status === "pending") {
        return res.status(403).json({
          success: false,
          error: "Your account is pending admin verification."
        });
      }
      if (status === "rejected") {
        return res.status(403).json({
          success: false,
          error: user.rejected_reason
            ? `Your account was rejected: ${user.rejected_reason}`
            : "Your account was rejected by admin."
        });
      }
    }

    // If deactivation is enabled, block deactivated accounts (except admins)
    if (user.role !== "admin" && typeof user.is_active !== "undefined") {
      const active = Number(user.is_active) === 1;
      if (!active) {
        return res.status(403).json({
          success: false,
          error: user.deactivated_reason
            ? `Your account was deactivated: ${user.deactivated_reason}`
            : "Your account was deactivated by admin.",
        });
      }
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
