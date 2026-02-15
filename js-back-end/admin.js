const express = require("express");
const router = express.Router();

const { sendAccountStatusEmail, isEmailEnabled } = require("./mailer");

const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
const ADMIN_TOKEN = "eel_admin_token_v1";

router.get("/api/admin/health", (req, res) => {
  res.json({ success: true, service: "admin", version: 1 });
});

// Admin-only: check if SMTP env vars are loaded (no secrets)
router.get("/api/admin/email-health", requireAdmin, (req, res) => {
  const u = String(process.env.EEL_SMTP_USER || "").trim();
  const p = String(process.env.EEL_SMTP_PASS || "").trim();
  const f = String(process.env.EEL_SMTP_FROM || "").trim();
  res.json({
    success: true,
    enabled: isEmailEnabled(),
    has_user: Boolean(u),
    has_pass: Boolean(p),
    has_from: Boolean(f),
    user_domain: u.includes("@") ? u.split("@")[1] : null,
    pass_length: p ? p.length : 0,
  });
});

function requireAdmin(req, res, next) {
  const token = req.header("x-admin-token") || "";
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}

async function hasColumn(conn, columnName) {
  try {
    const [rows] = await conn.execute(
      `SELECT COUNT(*) AS c
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = ?`,
      [columnName]
    );
    return Number(rows?.[0]?.c || 0) > 0;
  } catch (_) {
    return false;
  }
}

router.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password are required" });
  }
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({
      success: true,
      token: ADMIN_TOKEN,
      user: { username: ADMIN_USER, role: "admin" }
    });
  }
  return res.status(400).json({ success: false, error: "Invalid admin credentials" });
});

// List users awaiting verification (legacy)
router.get("/api/admin/pending-users", requireAdmin, async (req, res) => {
  const pool = req.pool;
  let conn;
  try {
    conn = await pool.getConnection();
    const enabled = await hasColumn(conn, "verification_status");
    if (!enabled) {
      return res.json({ success: true, enabled: false, users: [] });
    }

    const [rows] = await conn.execute(
      `
      SELECT user_id, fname, lname, email, role, verification_status, created_at, rejected_reason
      FROM users
      WHERE role IN ('student','teacher')
        AND verification_status = 'pending'
      ORDER BY created_at ASC, user_id ASC
      `
    );

    res.json({ success: true, enabled: true, users: rows });
  } catch (err) {
    console.error("❌ Admin pending-users error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

// List users by verification status (pending/approved/rejected/all)
router.get("/api/admin/users", requireAdmin, async (req, res) => {
  const pool = req.pool;
  const status = String(req.query?.status || "all").trim().toLowerCase();

  let conn;
  try {
    conn = await pool.getConnection();

    const enabled = await hasColumn(conn, "verification_status");
    if (!enabled) {
      return res.json({ success: true, enabled: false, users: [], status: "pending" });
    }

    const allowed = new Set(["pending", "approved", "rejected", "all"]);
    const effective = allowed.has(status) ? status : "pending";

    let where = "";
    const params = [];
    if (effective !== "all") {
      where = "AND verification_status = ?";
      params.push(effective);
    }

    // Try selecting with verification + deactivation columns first.
    let rows = [];
    let deactivationEnabled = true;
    try {
      const [r] = await conn.execute(
        `
        SELECT user_id, fname, lname, email, role,
               verification_status, created_at, rejected_reason,
               is_active, deactivated_at, deactivated_by, deactivated_reason
        FROM users
        WHERE role IN ('student','teacher')
        ${where}
        ORDER BY created_at DESC, user_id DESC
        `,
        params
      );
      rows = r;
    } catch (e1) {
      if (String(e1?.code || "") !== "ER_BAD_FIELD_ERROR") throw e1;
      // Deactivation columns missing -> fallback
      deactivationEnabled = false;
      const [r] = await conn.execute(
        `
        SELECT user_id, fname, lname, email, role,
               verification_status, created_at, rejected_reason,
               1 AS is_active, NULL AS deactivated_at, NULL AS deactivated_by, NULL AS deactivated_reason
        FROM users
        WHERE role IN ('student','teacher')
        ${where}
        ORDER BY created_at DESC, user_id DESC
        `,
        params
      );
      rows = r;
    }

    res.json({ success: true, enabled: true, deactivation_enabled: deactivationEnabled, users: rows, status: effective });
  } catch (err) {
    console.error("❌ Admin users list error:", err);
    res.status(500).json({
      success: false,
      error: "Server error",
      code: err?.code || null,
      message: err?.message || null,
    });
  } finally {
    if (conn) conn.release();
  }
});

// Approve a user
router.patch("/api/admin/users/:id/approve", requireAdmin, async (req, res) => {
  const pool = req.pool;
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ success: false, error: "Invalid user id" });

  let conn;
  try {
    conn = await pool.getConnection();

    const hasActive = await hasColumn(conn, "is_active");
    const hasDeactivatedAt = await hasColumn(conn, "deactivated_at");
    const hasDeactivatedBy = await hasColumn(conn, "deactivated_by");
    const hasDeactivatedReason = await hasColumn(conn, "deactivated_reason");

    const activeSet = [];
    if (hasActive) activeSet.push("is_active = 1");
    if (hasDeactivatedAt) activeSet.push("deactivated_at = NULL");
    if (hasDeactivatedBy) activeSet.push("deactivated_by = NULL");
    if (hasDeactivatedReason) activeSet.push("deactivated_reason = NULL");
    const activeSql = activeSet.length ? `, ${activeSet.join(", ")}` : "";

    const [result] = await conn.execute(
      `
      UPDATE users
      SET verification_status = 'approved',
          verified_at = NOW(),
          verified_by = 'admin',
          rejected_at = NULL,
          rejected_reason = NULL
          ${activeSql}
      WHERE user_id = ?
      `,
      [userId]
    );

    // notify user (best-effort)
    try {
      const [[u]] = await conn.execute("SELECT email, fname, lname FROM users WHERE user_id = ? LIMIT 1", [userId]);
      if (u?.email) {
        sendAccountStatusEmail({
          to: u.email,
          name: `${u.fname || ""} ${u.lname || ""}`.trim(),
          status: "approved",
        }).catch((e) => console.warn("Email send (approved) failed:", e?.message || e));
      }
    } catch (_) {}

    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error("❌ Admin approve error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

// Reject a user (only meaningful for pending)
router.patch("/api/admin/users/:id/reject", requireAdmin, async (req, res) => {
  const pool = req.pool;
  const userId = Number(req.params.id);
  const reason = String(req.body?.reason || "").trim().slice(0, 255);
  if (!userId) return res.status(400).json({ success: false, error: "Invalid user id" });

  let conn;
  try {
    conn = await pool.getConnection();
    const [result] = await conn.execute(
      `
      UPDATE users
      SET verification_status = 'rejected',
          verified_at = NULL,
          verified_by = NULL,
          rejected_at = NOW(),
          rejected_reason = ?
      WHERE user_id = ?
      `,
      [reason || null, userId]
    );

    // notify user (best-effort)
    try {
      const [[u]] = await conn.execute("SELECT email, fname, lname FROM users WHERE user_id = ? LIMIT 1", [userId]);
      if (u?.email) {
        sendAccountStatusEmail({
          to: u.email,
          name: `${u.fname || ""} ${u.lname || ""}`.trim(),
          status: "rejected",
          reason: reason || "",
        }).catch((e) => console.warn("Email send (rejected) failed:", e?.message || e));
      }
    } catch (_) {}

    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error("❌ Admin reject error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

// Deactivate an approved user (blocks login via is_active)
router.patch("/api/admin/users/:id/deactivate", requireAdmin, async (req, res) => {
  const pool = req.pool;
  const userId = Number(req.params.id);
  const reason = String(req.body?.reason || "").trim().slice(0, 255);
  if (!userId) return res.status(400).json({ success: false, error: "Invalid user id" });

  let conn;
  try {
    conn = await pool.getConnection();
    const hasActive = await hasColumn(conn, "is_active");
    if (!hasActive) {
      return res.status(400).json({
        success: false,
        error: "Deactivation not enabled. Run `js-back-end/migrate-user-deactivation.sql` in your database.",
      });
    }

    const hasDeactivatedAt = await hasColumn(conn, "deactivated_at");
    const hasDeactivatedBy = await hasColumn(conn, "deactivated_by");
    const hasDeactivatedReason = await hasColumn(conn, "deactivated_reason");

    const sets = ["is_active = 0"];
    const params = [];
    if (hasDeactivatedAt) sets.push("deactivated_at = NOW()");
    if (hasDeactivatedBy) sets.push("deactivated_by = 'admin'");
    if (hasDeactivatedReason) {
      sets.push("deactivated_reason = ?");
      params.push(reason || null);
    }
    params.push(userId);

    const [result] = await conn.execute(
      `UPDATE users SET ${sets.join(", ")} WHERE user_id = ?`,
      params
    );

    // notify user (best-effort)
    try {
      const [[u]] = await conn.execute("SELECT email, fname, lname FROM users WHERE user_id = ? LIMIT 1", [userId]);
      if (u?.email) {
        sendAccountStatusEmail({
          to: u.email,
          name: `${u.fname || ""} ${u.lname || ""}`.trim(),
          status: "deactivated",
          reason: reason || "",
        }).catch((e) => console.warn("Email send (deactivated) failed:", e?.message || e));
      }
    } catch (_) {}

    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error("❌ Admin deactivate error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

// Activate (reactivate) a user
router.patch("/api/admin/users/:id/activate", requireAdmin, async (req, res) => {
  const pool = req.pool;
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ success: false, error: "Invalid user id" });

  let conn;
  try {
    conn = await pool.getConnection();
    const hasActive = await hasColumn(conn, "is_active");
    if (!hasActive) {
      return res.status(400).json({
        success: false,
        error: "Deactivation not enabled. Run `js-back-end/migrate-user-deactivation.sql` in your database.",
      });
    }

    const hasDeactivatedAt = await hasColumn(conn, "deactivated_at");
    const hasDeactivatedBy = await hasColumn(conn, "deactivated_by");
    const hasDeactivatedReason = await hasColumn(conn, "deactivated_reason");

    const sets = ["is_active = 1"];
    if (hasDeactivatedAt) sets.push("deactivated_at = NULL");
    if (hasDeactivatedBy) sets.push("deactivated_by = NULL");
    if (hasDeactivatedReason) sets.push("deactivated_reason = NULL");

    const [result] = await conn.execute(
      `UPDATE users SET ${sets.join(", ")} WHERE user_id = ?`,
      [userId]
    );

    // notify user (best-effort)
    try {
      const [[u]] = await conn.execute("SELECT email, fname, lname FROM users WHERE user_id = ? LIMIT 1", [userId]);
      if (u?.email) {
        sendAccountStatusEmail({
          to: u.email,
          name: `${u.fname || ""} ${u.lname || ""}`.trim(),
          status: "activated",
        }).catch((e) => console.warn("Email send (activated) failed:", e?.message || e));
      }
    } catch (_) {}

    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error("❌ Admin activate error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;

