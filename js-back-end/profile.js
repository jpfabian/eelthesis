// profile.js - Current user profile, avatar, and change password
const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { nowPhilippineDatetime } = require("./utils/datetime");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
require("dotenv").config();

// Avatar upload: S3 if configured, else local disk
const hasAvatarS3 =
  String(process.env.AWS_AVATAR_BUCKET_NAME || process.env.AWS_BUCKET_NAME || "").trim() &&
  String(process.env.AWS_ACCESS_KEY_ID || "").trim() &&
  String(process.env.AWS_SECRET_ACCESS_KEY || "").trim() &&
  String(process.env.AWS_REGION || "").trim();

let avatarUpload;
if (hasAvatarS3) {
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const avatarBucket = process.env.AWS_AVATAR_BUCKET_NAME || process.env.AWS_BUCKET_NAME || "eel-avatar";
  avatarUpload = multer({
    storage: multerS3({
      s3,
      bucket: avatarBucket,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const userId = req.body?.user_id || "unknown";
        const ext = path.extname(file.originalname || "") || ".jpg";
        const safeExt = /^\.(jpe?g|png|gif|webp)$/i.test(ext) ? ext : ".jpg";
        cb(null, `avatars/${userId}-${Date.now()}${safeExt}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
      cb(new Error("Only image files are allowed"));
    },
  });
} else {
  const uploadDir = path.join(__dirname, "uploads", "avatars");
  try {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  } catch (_) {}
  avatarUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadDir),
      filename: (req, file, cb) => {
        const userId = req.body?.user_id || "unknown";
        const ext = path.extname(file.originalname || "") || ".jpg";
        cb(null, `${userId}-${Date.now()}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
      cb(new Error("Only image files are allowed"));
    },
  });
}

function toNameCase(input) {
  if (input == null || typeof input !== "string") return input;
  return String(input)
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// GET current user profile (by user_id from query; no session auth)
router.get("/api/users/me", async (req, res) => {
  const userId = req.query.user_id ? Number(req.query.user_id) : null;
  if (!userId || !Number.isFinite(userId)) {
    return res.status(400).json({ success: false, error: "user_id required" });
  }
  const pool = req.pool;
  try {
    const [rows] = await pool.execute(
      "SELECT user_id, fname, lname, email, role, avatar_url FROM users WHERE user_id = ?",
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
        fname: toNameCase(u.fname),
        lname: toNameCase(u.lname),
        email: u.email,
        role: u.role,
        avatar_url: u.avatar_url || null,
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
    const safeFname = toNameCase(String(fname).trim());
    const safeLname = toNameCase(String(lname).trim());
    const [r] = await pool.execute(
      "UPDATE users SET fname = ?, lname = ?, email = ? WHERE user_id = ?",
      [safeFname, safeLname, String(email).trim(), userId]
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

// POST upload avatar (multipart: avatar file, user_id field)
router.post("/api/users/avatar", (req, res, next) => {
  avatarUpload.single("avatar")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, error: "Image too large (max 5MB)" });
      }
      return res.status(400).json({ success: false, error: err.message || "Invalid file" });
    }
    next();
  });
}, async (req, res) => {
  const userId = Number(req.body?.user_id);
  if (!userId || !Number.isFinite(userId)) {
    return res.status(400).json({ success: false, error: "user_id required" });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No image file provided" });
  }
  const pool = req.pool;
  let avatarUrl;
  if (req.file.location) {
    avatarUrl = req.file.location; // S3 URL
  } else {
    const filename = path.basename(req.file.filename || req.file.path);
    avatarUrl = `/uploads/avatars/${filename}`;
  }
  try {
    const [r] = await pool.execute(
      "UPDATE users SET avatar_url = ?, updated_at = ? WHERE user_id = ?",
      [avatarUrl, nowPhilippineDatetime(), userId]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ success: true, avatar_url: avatarUrl, message: "Avatar updated" });
  } catch (err) {
    console.error("❌ Avatar upload error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE remove avatar
router.delete("/api/users/avatar", async (req, res) => {
  const userId = Number(req.body?.user_id ?? req.query?.user_id);
  if (!userId || !Number.isFinite(userId)) {
    return res.status(400).json({ success: false, error: "user_id required" });
  }
  const pool = req.pool;
  try {
    await pool.execute(
      "UPDATE users SET avatar_url = NULL, updated_at = ? WHERE user_id = ?",
      [nowPhilippineDatetime(), userId]
    );
    res.json({ success: true, message: "Avatar removed" });
  } catch (err) {
    console.error("❌ Avatar remove error:", err);
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
    await pool.execute("UPDATE users SET password = ?, updated_at = ? WHERE user_id = ?", [
      hashed,
      nowPhilippineDatetime(),
      userId,
    ]);
    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    console.error("❌ Change password error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
