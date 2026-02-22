const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const router = express.Router();
const { nowPhilippineDatetime, formatPhilippineDatetime } = require("./utils/datetime");

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input || "")).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(24).toString("hex"); // 48 chars
}

function addMinutes(date, minutes) {
  const d = new Date(date.getTime());
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

function toMySqlDateTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Helpful messages if someone opens endpoints in the browser (GET)
router.get("/api/auth/forgot-password", (req, res) => {
  res.status(405).json({
    success: false,
    error: "Use POST /api/auth/forgot-password with JSON body: { email }",
  });
});

router.get("/api/auth/reset-password", (req, res) => {
  res.status(405).json({
    success: false,
    error: "Use POST /api/auth/reset-password with JSON body: { email, token, new_password }",
  });
});

// Request a password reset token (demo: returns link on-screen)
router.post("/api/auth/forgot-password", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  if (!email) return res.status(400).json({ success: false, error: "Email is required" });

  const token = randomToken();
  const resetLink = `${req.protocol}://${req.get("host")}/reset-password.html?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  let conn;
  try {
    const pool = req.pool;
    conn = await pool.getConnection();

    // Check user existence (but do not reveal it in response)
    const [rows] = await conn.execute("SELECT user_id FROM users WHERE email = ? LIMIT 1", [email]);
    const userId = rows?.[0]?.user_id ? Number(rows[0].user_id) : null;

    if (userId) {
      // Ensure table exists (friendly error if migration not run)
      await conn.execute(
        `CREATE TABLE IF NOT EXISTS password_reset_tokens (
          reset_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id INT UNSIGNED NOT NULL,
          token_hash CHAR(64) NOT NULL,
          expires_at DATETIME NOT NULL,
          used_at DATETIME NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (reset_id),
          UNIQUE KEY uq_password_reset_token_hash (token_hash),
          KEY idx_password_reset_user (user_id),
          KEY idx_password_reset_expires (expires_at),
          CONSTRAINT fk_password_reset_user
            FOREIGN KEY (user_id) REFERENCES users(user_id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
      );

      // Invalidate previous unused tokens for this user
      await conn.execute("UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL", [nowPhilippineDatetime(), userId]);

      const tokenHash = sha256Hex(token);
      const expiresAt = formatPhilippineDatetime(addMinutes(new Date(), 15));
      await conn.execute(
        "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
        [userId, tokenHash, expiresAt, nowPhilippineDatetime()]
      );
    }

    // Always return success to avoid email enumeration.
    return res.json({
      success: true,
      message: "If your email exists, a reset link has been generated.",
      resetLink, // Demo: show link on-screen (production: email this)
    });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

// Use token to set a new password
router.post("/api/auth/reset-password", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  const token = String(req.body?.token || "").trim();
  const newPassword = String(req.body?.new_password || "");

  if (!email || !token || !newPassword) {
    return res.status(400).json({ success: false, error: "Email, token, and new_password are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
  }

  let conn;
  try {
    const pool = req.pool;
    conn = await pool.getConnection();

    const [users] = await conn.execute("SELECT user_id FROM users WHERE email = ? LIMIT 1", [email]);
    const userId = users?.[0]?.user_id ? Number(users[0].user_id) : null;
    if (!userId) {
      return res.status(400).json({ success: false, error: "Invalid or expired token" });
    }

    const tokenHash = sha256Hex(token);
    const now = nowPhilippineDatetime();
    const [rows] = await conn.execute(
      `SELECT reset_id
       FROM password_reset_tokens
       WHERE user_id = ?
         AND token_hash = ?
         AND used_at IS NULL
         AND expires_at > ?
       LIMIT 1`,
      [userId, tokenHash, now]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, error: "Invalid or expired token" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await conn.execute("UPDATE users SET password = ?, updated_at = ? WHERE user_id = ?", [hashed, now, userId]);
    await conn.execute("UPDATE password_reset_tokens SET used_at = ? WHERE reset_id = ?", [now, rows[0].reset_id]);

    return res.json({ success: true, message: "Password updated" });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;

