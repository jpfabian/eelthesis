// login.js
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

function toNameCase(input) {
  if (input == null || typeof input !== "string") return input;
  return String(input)
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

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
        SELECT user_id, fname, lname, email, password, role, avatar_url,
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

    // If account verification is enabled, block non-approved accounts (except admins and master_admin)
    const status = user.verification_status; // may be undefined if column doesn't exist
    const isAdminRole = user.role === "admin" || user.role === "master_admin";
    if (!isAdminRole && typeof status === "string") {
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
            ? `Your account was declined: ${user.rejected_reason}`
            : "Your account was declined by admin."
        });
      }
    }

    // If deactivation is enabled, block deactivated accounts (except admins and master_admin)
    if (!isAdminRole && typeof user.is_active !== "undefined") {
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

    const payload = {
      success: true,
      message: "Login successful",
      user: {
        user_id: user.user_id,
        fname: toNameCase(user.fname),
        lname: toNameCase(user.lname),
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url || null,
      },
    };
    if (user.role === "admin") {
      payload.adminToken = "eel_admin_token_v1";
    }
    if (user.role === "master_admin") {
      payload.adminToken = "eel_admin_token_v1";
      payload.masterAdminToken = "eel_master_admin_token_v1";
    }
    res.json(payload);
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
