require("dotenv").config();

let nodemailer = null;
try {
  // Optional dependency (but we install it)
  nodemailer = require("nodemailer");
} catch (_) {
  nodemailer = null;
}

function isEmailEnabled() {
  const user = String(process.env.EEL_SMTP_USER || "").trim();
  const pass = String(process.env.EEL_SMTP_PASS || "").trim();
  return Boolean(nodemailer && user && pass);
}

let warnedMissingConfig = false;

function getTransporter() {
  if (!isEmailEnabled()) return null;

  const user = String(process.env.EEL_SMTP_USER || "").trim();
  const pass = String(process.env.EEL_SMTP_PASS || "").trim();

  // Gmail SMTP (recommended: App Password)
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildAccountStatusEmail({ name, status, reason }) {
  const safeName = escapeHtml(name || "User");
  const safeReason = reason ? escapeHtml(reason) : "";
  const safeStatus = String(status || "").toLowerCase();

  const title =
    safeStatus === "pending" ? "Account Pending Verification" :
    safeStatus === "approved" ? "Account Approved" :
    safeStatus === "rejected" ? "Account Rejected" :
    safeStatus === "deactivated" ? "Account Deactivated" :
    safeStatus === "activated" ? "Account Reactivated" :
    "Account Update";

  const message =
    safeStatus === "pending" ? "Your account was created successfully and is now pending admin verification." :
    safeStatus === "approved" ? "Good news! Your account has been approved. You can now log in." :
    safeStatus === "rejected" ? "Your account was rejected by the admin." :
    safeStatus === "deactivated" ? "Your account was deactivated by the admin. You will not be able to log in." :
    safeStatus === "activated" ? "Your account has been reactivated. You can log in again." :
    "Your account status was updated.";

  const reasonBlock = safeReason
    ? `<div style="margin-top:12px; padding:12px; border:1px solid #e5e7eb; border-radius:10px; background:#f9fafb;">
         <div style="font-weight:700; margin-bottom:6px;">Reason</div>
         <div>${safeReason}</div>
       </div>`
    : "";

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a;">
      <div style="max-width:640px; margin:0 auto; padding:20px;">
        <div style="padding:18px 18px; border-radius:14px; border:1px solid #e5e7eb; background:#ffffff;">
          <div style="font-size:18px; font-weight:900; margin-bottom:8px;">${escapeHtml(title)}</div>
          <div style="color:#334155; margin-bottom:14px;">Hi ${safeName},</div>
          <div style="color:#334155; line-height:1.55;">${escapeHtml(message)}</div>
          ${reasonBlock}
          <div style="margin-top:16px; color:#64748b; font-size:12px;">
            If you believe this is a mistake, please contact your teacher/admin.
          </div>
        </div>
        <div style="margin-top:12px; text-align:center; color:#94a3b8; font-size:12px;">
          EEL (English Enhancement Learning)
        </div>
      </div>
    </div>
  `;

  return { subject: `EEL - ${title}`, html };
}

async function sendAccountStatusEmail({ to, name, status, reason }) {
  if (!isEmailEnabled()) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn(
        "⚠️ Email notifications are disabled. Set EEL_SMTP_USER and EEL_SMTP_PASS in js-back-end/.env (Gmail App Password), then restart the backend."
      );
    }
    return { skipped: true, reason: "Email not configured" };
  }

  const transporter = getTransporter();
  if (!transporter) return { skipped: true, reason: "No transporter" };

  const from = String(process.env.EEL_SMTP_FROM || process.env.EEL_SMTP_USER || "").trim();
  const { subject, html } = buildAccountStatusEmail({ name, status, reason });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  return { success: true };
}

module.exports = {
  isEmailEnabled,
  sendAccountStatusEmail,
};

