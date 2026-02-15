function showLoading() {
  document.getElementById("loading-screen")?.classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loading-screen")?.classList.add("hidden");
}

function getAdminToken() {
  try { return localStorage.getItem("eel_admin_token"); } catch { return null; }
}

function setAdminToken(token) {
  try { localStorage.setItem("eel_admin_token", token); } catch (_) {}
}

function clearAdminToken() {
  try { localStorage.removeItem("eel_admin_token"); } catch (_) {}
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  });
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;

  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";

  if (icon) {
    icon.setAttribute("data-lucide", isHidden ? "eye" : "eye-off");
    try {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    } catch (_) {}
  }
}

async function readJsonOrThrow(res) {
  const contentType = String(res.headers.get("content-type") || "");
  const text = await res.text();

  // If backend returns Express HTML error page / index.html, show a clearer message.
  if (!contentType.includes("application/json")) {
    const preview = text.slice(0, 80).replace(/\s+/g, " ").trim();
    throw new Error(
      `Admin API did not return JSON (HTTP ${res.status}). ` +
      `Received: ${preview || "empty response"}. ` +
      `Make sure the Node backend is running/restarted on port 3000.`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from server (HTTP ${res.status}).`);
  }
}

async function adminLogin(username, password) {
  const res = await fetch("http://localhost:3000/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await readJsonOrThrow(res);
  if (!data.success) throw new Error(data.error || "Login failed");
  setAdminToken(data.token);
  // Also store as eel_user so theme/navigation code can read role if needed
  try {
    localStorage.setItem("eel_token", "admin_token");
    localStorage.setItem("eel_user", JSON.stringify({ user_id: 0, fname: "Admin", lname: "", role: "admin" }));
  } catch (_) {}
  return data;
}

async function fetchPendingUsers() {
  const token = getAdminToken();
  const res = await fetch("http://localhost:3000/api/admin/pending-users", {
    headers: { "x-admin-token": token || "" },
  });
  const data = await readJsonOrThrow(res);
  if (!data.success) throw new Error(data.error || "Failed to load users");
  return data;
}

async function fetchAdminUsers(status) {
  const token = getAdminToken();
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`http://localhost:3000/api/admin/users${qs}`, {
    headers: { "x-admin-token": token || "" },
  });
  const data = await readJsonOrThrow(res);
  if (!data.success) throw new Error(data.error || "Failed to load users");
  return data;
}

async function approveUser(userId) {
  const token = getAdminToken();
  const res = await fetch(`http://localhost:3000/api/admin/users/${userId}/approve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-token": token || "" },
    body: JSON.stringify({}),
  });
  const data = await readJsonOrThrow(res);
  if (!data.success) throw new Error(data.error || "Approve failed");
  return data;
}

async function rejectUser(userId, reason) {
  const token = getAdminToken();
  const res = await fetch(`http://localhost:3000/api/admin/users/${userId}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-token": token || "" },
    body: JSON.stringify({ reason }),
  });
  const data = await readJsonOrThrow(res);
  if (!data.success) throw new Error(data.error || "Reject failed");
  return data;
}

async function deactivateUser(userId, reason) {
  const token = getAdminToken();
  const res = await fetch(`http://localhost:3000/api/admin/users/${userId}/deactivate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-token": token || "" },
    body: JSON.stringify({ reason }),
  });
  const data = await readJsonOrThrow(res);
  if (!data.success) throw new Error(data.error || "Deactivate failed");
  return data;
}

async function activateUser(userId) {
  const token = getAdminToken();
  const res = await fetch(`http://localhost:3000/api/admin/users/${userId}/activate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-token": token || "" },
    body: JSON.stringify({}),
  });
  const data = await readJsonOrThrow(res);
  if (!data.success) throw new Error(data.error || "Activate failed");
  return data;
}

async function initAdminLoginPage() {
  const form = document.getElementById("admin-login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("admin-username")?.value?.trim();
    const password = document.getElementById("admin-password")?.value ?? "";
    try {
      showLoading();
      await adminLogin(username, password);
      hideLoading();
      window.location.href = "admin-dashboard.html";
    } catch (err) {
      hideLoading();
      Swal.fire({
        icon: "error",
        title: "Admin login failed",
        text: err?.message || "Invalid credentials",
      });
    }
  });
}

function applyAdminFilters(users) {
  const q = String(document.getElementById("admin-search")?.value || "").trim().toLowerCase();
  return (users || []).filter((u) => {
    const name = `${u.fname || ""} ${u.lname || ""}`.trim().toLowerCase();
    const email = String(u.email || "").toLowerCase();
    const qOk = q ? (name.includes(q) || email.includes(q)) : true;
    return qOk;
  });
}

const adminPagerPageSize = 15;

const adminTeachersPager = { page: 1 };
const adminStudentsPager = { page: 1 };

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function buildAdminUserRow(u) {
  const name = `${u.fname || ""} ${u.lname || ""}`.trim() || `User #${u.user_id}`;
  const created = formatDateTime(u.created_at);
  const status = String(u.verification_status || "").toLowerCase();
  const statusLabel = status || "pending";
  const isActive = Number(u.is_active ?? 1) === 1;
  const statusColor =
    statusLabel === "approved" ? "bg-secondary/10 text-secondary" :
    statusLabel === "rejected" ? "bg-destructive/10 text-destructive" :
    "bg-primary/10 text-primary";

  const showApprove = statusLabel === "pending" || statusLabel === "rejected";
  const showReject = statusLabel === "pending";
  const showDeactivate = statusLabel === "approved" && isActive;
  const showActivate = statusLabel === "approved" && !isActive;

  const activeBadge = (statusLabel === "approved" && !isActive)
    ? `<span class="px-2 py-1 text-xs rounded bg-destructive/10 text-destructive capitalize" title="${escapeHtml(u.deactivated_reason || "")}">deactivated</span>`
    : (statusLabel === "approved" && isActive)
      ? `<span class="px-2 py-1 text-xs rounded bg-primary/10 text-primary capitalize">active</span>`
      : "";

  return `
    <tr class="leaderboard-table-row">
      <td>
        <div class="student-info">
          <div class="student-avatar" style="background: linear-gradient(135deg, var(--primary), var(--secondary));">
            ${escapeHtml(name.split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()).join("") || "U")}
          </div>
          <span>${escapeHtml(name)}</span>
        </div>
      </td>
      <td class="text-muted-foreground">${escapeHtml(u.email || "")}</td>
      <td class="space-y-1">
        <span class="px-2 py-1 text-xs rounded capitalize ${statusColor}" title="${escapeHtml(u.rejected_reason || "")}">${escapeHtml(statusLabel)}</span>
        ${activeBadge ? `<span style="display:inline-block; margin-left:.35rem;">${activeBadge}</span>` : ""}
      </td>
      <td class="text-muted-foreground">${escapeHtml(created)}</td>
      <td style="text-align:right;">
        <div class="admin-actions">
          ${showApprove ? `<button class="btn btn-primary btn-sm" onclick="window.__adminApprove(${u.user_id})"><i data-lucide="check" class="size-4"></i> Approve</button>` : `<span class="text-xs text-muted-foreground" style="padding:0.4rem 0.6rem; border:1px solid var(--border); border-radius:9999px;">Approved</span>`}
          ${showReject ? `<button class="btn btn-outline btn-sm" onclick="window.__adminReject(${u.user_id})"><i data-lucide="x" class="size-4"></i> Reject</button>` : ""}
          ${showDeactivate ? `<button class="btn btn-destructive btn-sm" onclick="window.__adminDeactivate(${u.user_id})"><i data-lucide="ban" class="size-4"></i> Deactivate</button>` : ""}
          ${showActivate ? `<button class="btn btn-primary btn-sm" onclick="window.__adminActivate(${u.user_id})"><i data-lucide="power" class="size-4"></i> Activate</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function renderAdminTableSection(bodyEl, list, pager, pageInfoId, prevId, nextId) {
  if (!bodyEl) return;
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / adminPagerPageSize));
  pager.page = clamp(pager.page, 1, totalPages);
  const start = (pager.page - 1) * adminPagerPageSize;
  const pageItems = list.slice(start, start + adminPagerPageSize);

  const pageInfo = document.getElementById(pageInfoId);
  if (pageInfo) pageInfo.textContent = total ? `Page ${pager.page} of ${totalPages}` : "—";

  const prevBtn = document.getElementById(prevId);
  const nextBtn = document.getElementById(nextId);
  if (prevBtn) prevBtn.disabled = pager.page <= 1;
  if (nextBtn) nextBtn.disabled = pager.page >= totalPages;

  if (!list.length) {
    bodyEl.innerHTML = `<tr><td colspan="5" class="admin-dashboard-empty">No users in this group.</td></tr>`;
    return;
  }

  bodyEl.innerHTML = pageItems.map(buildAdminUserRow).join("");
}

function renderAdminUsers(users) {
  const teachersBody = document.getElementById("admin-teachers-body");
  const studentsBody = document.getElementById("admin-students-body");
  if (!teachersBody && !studentsBody) return;

  const filtered = applyAdminFilters(users || []);
  const teachers = filtered.filter((u) => String(u.role || "").toLowerCase() === "teacher");
  const students = filtered.filter((u) => String(u.role || "").toLowerCase() === "student");

  const countEl = document.getElementById("admin-count");
  if (countEl) countEl.textContent = users?.length ? `${teachers.length} teachers, ${students.length} students` : "";

  const teachersCountEl = document.getElementById("admin-teachers-count");
  const studentsCountEl = document.getElementById("admin-students-count");
  if (teachersCountEl) teachersCountEl.textContent = teachers.length ? `(${teachers.length})` : "(0)";
  if (studentsCountEl) studentsCountEl.textContent = students.length ? `(${students.length})` : "(0)";

  const status = String(document.getElementById("admin-status-filter")?.value || "all");
  const emptyMsg = !users?.length ? `No users found (${status}).` : "No users match your search.";

  if (teachersBody) {
    if (!filtered.length && !users?.length) teachersBody.innerHTML = `<tr><td colspan="5" class="admin-dashboard-empty">${escapeHtml(emptyMsg)}</td></tr>`;
    else renderAdminTableSection(teachersBody, teachers, adminTeachersPager, "admin-teachers-page-info", "admin-teachers-prev", "admin-teachers-next");
  }
  if (studentsBody) {
    if (!filtered.length && !users?.length) studentsBody.innerHTML = `<tr><td colspan="5" class="admin-dashboard-empty">${escapeHtml(emptyMsg)}</td></tr>`;
    else renderAdminTableSection(studentsBody, students, adminStudentsPager, "admin-students-page-info", "admin-students-prev", "admin-students-next");
  }

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

async function initAdminDashboardPage() {
  const hasDashboard = document.getElementById("admin-teachers-body") || document.getElementById("admin-refresh-btn");
  if (!hasDashboard) return;

  const token = getAdminToken();
  if (!token) {
    window.location.href = "admin-login.html";
    return;
  }

  const refresh = async () => {
    try {
      const status = String(document.getElementById("admin-status-filter")?.value || "all");
      const data = await fetchAdminUsers(status);
      if (!data.enabled) {
        // Also render an inline message (not just a popup)
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-muted-foreground">
              Account verification is not enabled in your database yet.
              Run <strong>js-back-end/migrate-account-verification.sql</strong> then refresh.
            </td>
          </tr>
        `;
        Swal.fire({
          icon: "warning",
          title: "Migration required",
          text: "Run `js-back-end/migrate-account-verification.sql` in your database, then refresh.",
        });
        window.__adminUsers = [];
        // Important: don't overwrite the message with "No pending users"
        return;
      }
      window.__adminUsers = data.users || [];
      adminTeachersPager.page = 1;
      adminStudentsPager.page = 1;
      renderAdminUsers(window.__adminUsers);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err?.message || "Failed to load users" });
    }
  };

  document.getElementById("admin-refresh-btn")?.addEventListener("click", refresh);
  document.getElementById("admin-logout-btn")?.addEventListener("click", () => {
    clearAdminToken();
    try { localStorage.removeItem("eel_token"); localStorage.removeItem("eel_user"); } catch (_) {}
    window.location.href = "admin-login.html";
  });

  document.getElementById("admin-search")?.addEventListener("input", () => {
    adminTeachersPager.page = 1;
    adminStudentsPager.page = 1;
    renderAdminUsers(window.__adminUsers || []);
  });
  document.getElementById("admin-status-filter")?.addEventListener("change", refresh);

  function setAdminView(view) {
    const teachersSection = document.getElementById("admin-teachers-section");
    const studentsSection = document.getElementById("admin-students-section");
    const teacherBtn = document.getElementById("admin-view-teacher");
    const studentBtn = document.getElementById("admin-view-student");
    if (view === "teacher") {
      if (teachersSection) teachersSection.classList.remove("admin-dashboard-section-hidden");
      if (studentsSection) studentsSection.classList.add("admin-dashboard-section-hidden");
      if (teacherBtn) { teacherBtn.classList.add("active"); teacherBtn.setAttribute("aria-pressed", "true"); }
      if (studentBtn) { studentBtn.classList.remove("active"); studentBtn.setAttribute("aria-pressed", "false"); }
    } else {
      if (teachersSection) teachersSection.classList.add("admin-dashboard-section-hidden");
      if (studentsSection) studentsSection.classList.remove("admin-dashboard-section-hidden");
      if (teacherBtn) { teacherBtn.classList.remove("active"); teacherBtn.setAttribute("aria-pressed", "false"); }
      if (studentBtn) { studentBtn.classList.add("active"); studentBtn.setAttribute("aria-pressed", "true"); }
    }
  }

  document.getElementById("admin-view-teacher")?.addEventListener("click", () => setAdminView("teacher"));
  document.getElementById("admin-view-student")?.addEventListener("click", () => setAdminView("student"));

  document.getElementById("admin-teachers-prev")?.addEventListener("click", () => {
    adminTeachersPager.page = Math.max(1, adminTeachersPager.page - 1);
    renderAdminUsers(window.__adminUsers || []);
  });
  document.getElementById("admin-teachers-next")?.addEventListener("click", () => {
    adminTeachersPager.page = adminTeachersPager.page + 1;
    renderAdminUsers(window.__adminUsers || []);
  });
  document.getElementById("admin-students-prev")?.addEventListener("click", () => {
    adminStudentsPager.page = Math.max(1, adminStudentsPager.page - 1);
    renderAdminUsers(window.__adminUsers || []);
  });
  document.getElementById("admin-students-next")?.addEventListener("click", () => {
    adminStudentsPager.page = adminStudentsPager.page + 1;
    renderAdminUsers(window.__adminUsers || []);
  });

  window.__adminApprove = async (id) => {
    const u = (window.__adminUsers || []).find(x => Number(x.user_id) === Number(id));
    const name = `${u?.fname || ""} ${u?.lname || ""}`.trim() || `User #${id}`;
    const ok = await Swal.fire({
      icon: "question",
      title: "Approve account?",
      text: name,
      showCancelButton: true,
      confirmButtonText: "Approve",
      confirmButtonColor: "#10b981",
    });
    if (!ok.isConfirmed) return;
    try {
      await approveUser(id);
      await refresh();
      Swal.fire({ icon: "success", title: "Approved", text: `${name} can now log in.` });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed", text: err?.message || "Approve failed" });
    }
  };

  window.__adminReject = async (id) => {
    const u = (window.__adminUsers || []).find(x => Number(x.user_id) === Number(id));
    const name = `${u?.fname || ""} ${u?.lname || ""}`.trim() || `User #${id}`;
    const result = await Swal.fire({
      icon: "warning",
      title: "Reject account?",
      text: name,
      input: "text",
      inputLabel: "Reason (optional)",
      inputPlaceholder: "e.g. Duplicate account / invalid details",
      showCancelButton: true,
      confirmButtonText: "Reject",
      confirmButtonColor: "#ef4444",
    });
    if (!result.isConfirmed) return;
    try {
      await rejectUser(id, result.value || "");
      await refresh();
      Swal.fire({ icon: "success", title: "Rejected", text: `${name} was rejected.` });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed", text: err?.message || "Reject failed" });
    }
  };

  window.__adminDeactivate = async (id) => {
    const u = (window.__adminUsers || []).find(x => Number(x.user_id) === Number(id));
    const name = `${u?.fname || ""} ${u?.lname || ""}`.trim() || `User #${id}`;
    const result = await Swal.fire({
      icon: "warning",
      title: "Deactivate account?",
      text: name,
      input: "text",
      inputLabel: "Reason (optional)",
      inputPlaceholder: "e.g. Inactive / policy violation / duplicate",
      showCancelButton: true,
      confirmButtonText: "Deactivate",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await deactivateUser(id, result.value || "");
      await refresh();
      Swal.fire({ icon: "success", title: "Deactivated", text: `${name} can no longer log in.` });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed", text: err?.message || "Deactivate failed" });
    }
  };

  window.__adminActivate = async (id) => {
    const u = (window.__adminUsers || []).find(x => Number(x.user_id) === Number(id));
    const name = `${u?.fname || ""} ${u?.lname || ""}`.trim() || `User #${id}`;
    const ok = await Swal.fire({
      icon: "question",
      title: "Activate account?",
      text: name,
      showCancelButton: true,
      confirmButtonText: "Activate",
      confirmButtonColor: "#10b981",
    });
    if (!ok.isConfirmed) return;
    try {
      await activateUser(id);
      await refresh();
      Swal.fire({ icon: "success", title: "Activated", text: `${name} can now log in.` });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed", text: err?.message || "Activate failed" });
    }
  };

  await refresh();
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  } catch (_) {}
  initAdminLoginPage();
  initAdminDashboardPage();
});

