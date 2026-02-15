// profile.js - Current user profile and change password
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

// GET current user profile (by user_id from query; no session auth)
router.get("/api/users/me", async (req, res) => {
  const userId = req.query.user_id ? Number(req.query.user_id) : null;
  if (!userId || !Number.isFinite(userId)) {
    return res.status(400).json({ success: false, error: "user_id required" });
  }
  const pool = req.pool;
  try {
    const [rows] = await pool.execute(
      "SELECT user_id, fname, lname, email, role FROM users WHERE user_id = ?",
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const u = rows[0];
    res.json({
      success: true,
      user: {
        user_id: u.user_id,
        fname: u.fname,
        lname: u.lname,
        email: u.email,
        role: u.role,
      },
    });
  } catch (err) {
    console.error("❌ GET profile error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// PATCH update profile (fname, lname, email)
router.patch("/api/users/me", async (req, res) => {
  const userId = Number(req.body?.user_id);
  const { fname, lname, email } = req.body || {};
  if (!userId || !Number.isFinite(userId)) {
    return res.status(400).json({ success: false, error: "user_id required" });
  }
  if (!fname || !lname || !email) {
    return res
      .status(400)
      .json({ success: false, error: "fname, lname, and email are required" });
  }
  const pool = req.pool;
  try {
    const [r] = await pool.execute(
      "UPDATE users SET fname = ?, lname = ?, email = ? WHERE user_id = ?",
      [String(fname).trim(), String(lname).trim(), String(email).trim(), userId]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, error: "Email already in use" });
    }
    console.error("❌ PATCH profile error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST change password (current_password, new_password, user_id)
router.post("/api/auth/change-password", async (req, res) => {
  const userId = Number(req.body?.user_id);
  const currentPassword = String(req.body?.current_password || "");
  const newPassword = String(req.body?.new_password || "");
  if (!userId || !Number.isFinite(userId)) {
    return res.status(400).json({ success: false, error: "user_id required" });
  }
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ success: false, error: "current_password and new_password required" });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ success: false, error: "New password must be at least 8 characters" });
  }
  const pool = req.pool;
  try {
    const [rows] = await pool.execute(
      "SELECT password FROM users WHERE user_id = ?",
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) {
      return res.status(400).json({ success: false, error: "Current password is incorrect" });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.execute("UPDATE users SET password = ?, updated_at = NOW() WHERE user_id = ?", [
      hashed,
      userId,
    ]);
    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    console.error("❌ Change password error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
