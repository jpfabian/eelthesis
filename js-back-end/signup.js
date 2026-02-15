const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
// Use req.pool from server.js (single source of truth)
const { sendAccountStatusEmail } = require("./mailer");

// SIGNUP route
router.post("/api/auth/register", async (req, res) => {
  const { fname, lname, email, password, role, section, strand } = req.body;

  if (!fname || !lname || !email || !password || !role)
    return res.status(400).json({ success: false, error: "All required fields must be provided" });

  function toNameCase(input) {
    const s = String(input || "").trim();
    if (!s) return "";
    return s
      .replace(/\s+/g, " ")
      .toLowerCase()
      .split(" ")
      .map(word =>
        word
          .split("-")
          .map(part => {
            if (!part) return part;
            const bits = part.split("'");
            const cased = bits.map(b => (b ? b.charAt(0).toUpperCase() + b.slice(1) : b));
            return cased.join("'");
          })
          .join("-")
      )
      .join(" ");
  }

  const safeRole = String(role || "").trim().toLowerCase();
  const safeFname = toNameCase(fname);
  const safeLname = toNameCase(lname);
  const safeEmail = String(email || "").trim();
  const safeSection = section == null ? null : String(section).trim();
  const safeStrand = strand == null ? null : String(strand).trim();

  if (!safeFname || !safeLname || !safeEmail || !safeRole) {
    return res.status(400).json({ success: false, error: "All required fields must be provided" });
  }

  if (safeRole === "student") {
    if (!safeSection) return res.status(400).json({ success: false, error: "Section is required for students" });
    if (!safeStrand) return res.status(400).json({ success: false, error: "Strand is required for students" });
  }

  let conn;
  try {
    const pool = req.pool;
    conn = await pool.getConnection();

    // Check if email exists
    const [existing] = await conn.execute("SELECT user_id FROM users WHERE email = ?", [safeEmail]);
    if (existing.length > 0)
      return res.status(400).json({ success: false, error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    // If verification columns exist, new accounts start as 'pending'
    const [cols] = await conn.execute(
      `SELECT COUNT(*) AS c
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'verification_status'`
    );
    const hasVerification = Number(cols?.[0]?.c || 0) > 0;

    const [colSection] = await conn.execute(
      `SELECT COUNT(*) AS c
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'section'`
    );
    const hasSection = Number(colSection?.[0]?.c || 0) > 0;

    const [colStrand] = await conn.execute(
      `SELECT COUNT(*) AS c
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'strand'`
    );
    const hasStrand = Number(colStrand?.[0]?.c || 0) > 0;

    const colsInsert = ["fname", "lname", "email", "password", "role"];
    const vals = [safeFname, safeLname, safeEmail, hashedPassword, safeRole];

    if (hasSection) {
      colsInsert.push("section");
      vals.push(safeSection);
    }
    if (hasStrand) {
      colsInsert.push("strand");
      vals.push(safeStrand);
    }

    if (hasVerification) {
      colsInsert.push("verification_status");
    }

    const placeholders = colsInsert.map(() => "?").join(", ");
    const sql = `INSERT INTO users (${colsInsert.join(", ")}) VALUES (${placeholders})`;
    const params = hasVerification ? [...vals, "pending"] : vals;
    const [result] = await conn.execute(sql, params);

    res.json({
      success: true,
      message: hasVerification
        ? "Account created. Awaiting admin verification."
        : "Account created successfully",
      user: {
        id: result.insertId,
        fname: safeFname,
        lname: safeLname,
        email: safeEmail,
        role: safeRole,
        section: hasSection ? safeSection : undefined,
        strand: hasStrand ? safeStrand : undefined,
      },
    });

    // Fire-and-forget notification (do not block signup)
    if (hasVerification) {
      sendAccountStatusEmail({
        to: safeEmail,
        name: `${safeFname} ${safeLname}`.trim(),
        status: "pending",
      }).catch((e) => console.warn("Email send (pending) failed:", e?.message || e));
    }
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
