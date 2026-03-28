const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendPasswordResetCode } = require("./mailer");

const router = express.Router();
const { nowPhilippineDatetime, formatPhilippineDatetime } = require("./utils/datetime");

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input || "")).digest("hex");
}

function randomSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
    error: "Use POST /api/auth/reset-password with JSON body: { email, token (6-digit code), new_password }",
  });
});

router.get("/api/auth/verify-reset-code", (req, res) => {
  res.status(405).json({
    success: false,
    error: "Use POST /api/auth/verify-reset-code with JSON body: { email, code }",
  });
});

// Verify the 6-digit code before allowing password change
router.post("/api/auth/verify-reset-code", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  const code = String(req.body?.code || "").trim();

  if (!email || !code) {
    console.warn("⚠️ Verify reset code failed: Email or code missing in request body.");
    return res.status(400).json({ success: false, error: "Email and code are required" });
  }
  if (!/^\d{6}$/.test(code)) {
    console.warn(`⚠️ Verify reset code failed: Invalid code format received: "${code}"`);
    return res.status(400).json({ success: false, error: "Code must be 6 digits" });
  }

  let conn;
  try {
    const pool = req.pool;
    conn = await pool.getConnection();

    // Use case-insensitive search for user
    const [users] = await conn.execute("SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [email]);
    const userId = users?.[0]?.user_id ? Number(users[0].user_id) : null;
    
    if (!userId) {
      console.warn(`⚠️ Verify reset code failed: No user found with email "${email}"`);
      return res.status(400).json({ success: false, error: "Invalid or expired code" });
    }

    const tokenHash = sha256Hex(code);
    
    // Most robust verification: let MySQL handle the time comparison using NOW()
    // We check for the LATEST token that matches user and hash, is not used, and NOT EXPIRED.
    const [rows] = await conn.execute(
      `SELECT reset_id, expires_at, used_at, NOW() as db_now
       FROM password_reset_tokens
       WHERE user_id = ?
         AND token_hash = ?
       ORDER BY reset_id DESC
       LIMIT 1`,
      [userId, tokenHash]
    );

    if (!rows.length) {
      console.warn(`⚠️ Verify reset code failed: No matching token record for user ${userId} and code ${code} (hash: ${tokenHash.substring(0, 10)}...)`);
      return res.status(400).json({ success: false, error: "Invalid or expired code" });
    }

    const token = rows[0];
    const dbNowStr = token.db_now ? String(token.db_now) : "unknown";
    
    if (token.used_at) {
      console.warn(`⚠️ Verify reset code failed: Token ${token.reset_id} was already used at ${token.used_at}.`);
      return res.status(400).json({ success: false, error: "This code has already been used." });
    }

    // Double check expiration using JS as well, but DB check is primary
    const expiresAtDate = new Date(String(token.expires_at).replace(" ", "T"));
    const dbNowDate = new Date(dbNowStr.replace(" ", "T"));

    if (expiresAtDate <= dbNowDate) {
      console.warn(`⚠️ Verify reset code failed: Token ${token.reset_id} expired. Expires: ${token.expires_at}, DB Now: ${dbNowStr}`);
      return res.status(400).json({ success: false, error: "This code has expired. Please request a new one." });
    }

    console.log(`✅ Reset code verified successfully for user ${userId} (${email})`);
    return res.json({ success: true, message: "Code verified" });
  } catch (err) {
    console.error("❌ Verify reset code error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

// Request a password reset: sends 6-digit code via email
router.post("/api/auth/forgot-password", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  if (!email) return res.status(400).json({ success: false, error: "Email is required" });

  const token = randomSixDigitCode();

  let conn;
  try {
    const pool = req.pool;
    conn = await pool.getConnection();

    // Check user existence (but do not reveal it in response)
    const [rows] = await conn.execute("SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [email]);
    const userId = rows?.[0]?.user_id ? Number(rows[0].user_id) : null;

    if (!userId) {
      // Security: Always return success message even if email doesn't exist
      // But we can log it for admin awareness
      console.warn(`⚠️ Forgot password requested for non-existent email: ${email}`);
      return res.json({
        success: true,
        message: "A verification code was sent to your email.",
      });
    }

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
          KEY idx_password_reset_token_hash (token_hash),
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
      // Increased to 60 minutes for better reliability in system deployment
      const expiresAt = formatPhilippineDatetime(addMinutes(new Date(), 60));
      await conn.execute(
        "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
        [userId, tokenHash, expiresAt, nowPhilippineDatetime()]
      );

      const emailResult = await sendPasswordResetCode({ to: email, code: token });
      if (emailResult.skipped) {
        return res.status(500).json({
          success: false,
          error: "Email is not configured. Contact your administrator.",
        });
      }

    return res.json({
      success: true,
      message: "A verification code was sent to your email.",
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
  if (newPassword.length < 8 || newPassword.length > 30) {
    return res.status(400).json({ success: false, error: "Password must be 8–30 characters" });
  }
  if (!/[A-Z]/.test(newPassword)) {
    return res.status(400).json({ success: false, error: "Password must include at least one capital letter" });
  }
  if (!/[0-9]/.test(newPassword)) {
    return res.status(400).json({ success: false, error: "Password must include at least one number" });
  }
  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    return res.status(400).json({ success: false, error: "Password must include at least one special character" });
  }

  let conn;
  try {
    const pool = req.pool;
    conn = await pool.getConnection();

    const [users] = await conn.execute("SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [email]);
    const userId = users?.[0]?.user_id ? Number(users[0].user_id) : null;
    if (!userId) {
      console.warn(`⚠️ Password reset failed: User with email "${email}" not found.`);
      return res.status(400).json({ success: false, error: "Invalid or expired token" });
    }

    const tokenHash = sha256Hex(token);
    
    const [rows] = await conn.execute(
      `SELECT reset_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE user_id = ?
         AND token_hash = ?
       ORDER BY reset_id DESC
       LIMIT 1`,
      [userId, tokenHash]
    );

    if (!rows.length) {
      console.warn(`⚠️ Password reset failed: Token hash not found for user ${userId}.`);
      return res.status(400).json({ success: false, error: "Invalid or expired token" });
    }

    const resetToken = rows[0];
    if (resetToken.used_at) {
      return res.status(400).json({ success: false, error: "This token has already been used." });
    }

    // Convert strings to Date objects for reliable comparison
    const expiresAtDate = new Date(resetToken.expires_at.replace(" ", "T") + "+08:00");
    const nowPhilippineDate = new Date(nowPhilippineDatetime().replace(" ", "T") + "+08:00");

    if (expiresAtDate <= nowPhilippineDate) {
      return res.status(400).json({ success: false, error: "This token has expired. Please request a new one." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const now = nowPhilippineDatetime();
    await conn.execute("UPDATE users SET password = ?, updated_at = ? WHERE user_id = ?", [hashed, now, userId]);
    await conn.execute("UPDATE password_reset_tokens SET used_at = ? WHERE reset_id = ?", [now, resetToken.reset_id]);

    return res.json({ success: true, message: "Password updated" });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;

