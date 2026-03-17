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

/** Mask email for display in admin dashboard (e.g. "j***@gmail.com"). */
function maskEmailForDisplay(email) {
  const s = String(email ?? "").trim();
  if (!s) return "—";
  const at = s.indexOf("@");
  if (at <= 0) return "***";
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  const first = local.charAt(0);
  return first ? `${first}***@${domain}` : `***@${domain}`;
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
  const res = await fetch((window.API_BASE || "") + "/api/admin/login", {
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
    localStorage.removeItem("eel_avatar_url");
  } catch (_) {}
  return data;
}

async function fetchPendingUsers() {
  const token = getAdminToken();
  const res = await fetch((window.API_BASE || "") + "/api/admin/pending-users", {
    headers: { "x-admin-token": token || "" },
  });
  const data = await readJsonOrThrow(res);
  if (!data.success) throw new Error(data.error || "Failed to load users");
  return data;
}

async function fetchAdminUsers(status) {
  const token = getAdminToken();
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`${window.API_BASE || ""}/api/admin/users${qs}`, {
    headers: { "x-admin-token": token || "" },
  });
  const data = await readJsonOrThrow(res);
  if (!data.success) throw new Error(data.error || "Failed to load users");
  return data;
}

async function approveUser(userId) {
  const token = getAdminToken();
  const res = await fetch(`${window.API_BASE || ""}/api/admin/users/${userId}/approve`, {
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
  const res = await fetch(`${window.API_BASE || ""}/api/admin/users/${userId}/reject`, {
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
  const res = await fetch(`${window.API_BASE || ""}/api/admin/users/${userId}/deactivate`, {
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
  const res = await fetch(`${window.API_BASE || ""}/api/admin/users/${userId}/activate`, {
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

function updateNewAccountsBanner(pendingCount) {
  const banner = document.getElementById("admin-new-accounts-banner");
  const textEl = document.getElementById("admin-new-accounts-text");
  if (!banner || !textEl) return;
  if (pendingCount > 0) {
    textEl.textContent =
      pendingCount === 1
        ? "You have 1 new account awaiting verification."
        : `You have ${pendingCount} new accounts awaiting verification.`;
    banner.classList.remove("hidden");
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  } else {
    banner.classList.add("hidden");
  }
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

function buildAdminUserRow(u, isStudent) {
  const name = `${u.fname || ""} ${u.lname || ""}`.trim() || `User #${u.user_id}`;
  const created = formatDateTime(u.created_at);
  const status = String(u.verification_status || "").toLowerCase();
  const statusLabel = status || "pending";
  const statusText = statusLabel === "rejected" ? "declined" : statusLabel;
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

  const sectionStrandCells = isStudent
    ? `<td class="admin-dashboard-section-cell text-muted-foreground">${escapeHtml(u.section ?? "—")}</td><td class="admin-dashboard-strand-cell text-muted-foreground">${escapeHtml(u.strand ?? "—")}</td>`
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
      <td class="text-muted-foreground">${escapeHtml(maskEmailForDisplay(u.email))}</td>
      ${sectionStrandCells}
      <td class="admin-dashboard-status-cell">
        <span class="admin-dashboard-status-pill px-2 py-1 text-xs rounded capitalize ${statusColor}" title="${escapeHtml(u.rejected_reason || "")}">${escapeHtml(statusText)}</span>
        ${activeBadge ? `<span class="admin-dashboard-status-badge">${activeBadge}</span>` : ""}
      </td>
      <td class="text-muted-foreground">${escapeHtml(created)}</td>
      <td style="text-align:right;">
        <div class="admin-actions">
          ${showApprove ? `<button class="btn btn-primary btn-sm" onclick="window.__adminApprove(${u.user_id})"><i data-lucide="check" class="size-4"></i> Approve</button>` : `<span class="text-xs text-muted-foreground" style="padding:0.4rem 0.6rem; border:1px solid var(--border); border-radius:9999px;">Approved</span>`}
          ${showReject ? `<button class="btn btn-outline btn-sm" onclick="window.__adminReject(${u.user_id})"><i data-lucide="x" class="size-4"></i> Decline</button>` : ""}
          ${showDeactivate ? `<button class="btn btn-destructive btn-sm" onclick="window.__adminDeactivate(${u.user_id})"><i data-lucide="ban" class="size-4"></i> Deactivate</button>` : ""}
          ${showActivate ? `<button class="btn btn-primary btn-sm" onclick="window.__adminActivate(${u.user_id})"><i data-lucide="power" class="size-4"></i> Activate</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function renderAdminTableSection(bodyEl, list, pager, pageInfoId, prevId, nextId, isStudent) {
  if (!bodyEl) return;
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / adminPagerPageSize));
  pager.page = clamp(pager.page, 1, totalPages);
  const start = (pager.page - 1) * adminPagerPageSize;
  const pageItems = list.slice(start, start + adminPagerPageSize);
  const colspan = isStudent ? 7 : 5;

  const pageInfo = document.getElementById(pageInfoId);
  if (pageInfo) pageInfo.textContent = total ? `Page ${pager.page} of ${totalPages}` : "—";

  const prevBtn = document.getElementById(prevId);
  const nextBtn = document.getElementById(nextId);
  if (prevBtn) prevBtn.disabled = pager.page <= 1;
  if (nextBtn) nextBtn.disabled = pager.page >= totalPages;

  if (!list.length) {
    bodyEl.innerHTML = `<tr><td colspan="${colspan}" class="admin-dashboard-empty">No users in this group.</td></tr>`;
    return;
  }

  bodyEl.innerHTML = pageItems.map((u) => buildAdminUserRow(u, isStudent)).join("");
}

function renderAdminUsers(users) {
  const teachersBody = document.getElementById("admin-teachers-body");
  const studentsBody = document.getElementById("admin-students-body");
  if (!teachersBody && !studentsBody) return;

  const filtered = applyAdminFilters(users || []);
  const teachers = filtered.filter((u) => String(u.role || "").toLowerCase() === "teacher");
  const students = filtered.filter((u) => String(u.role || "").toLowerCase() === "student");

  const teachersCountEl = document.getElementById("admin-teachers-count");
  const studentsCountEl = document.getElementById("admin-students-count");
  if (teachersCountEl) teachersCountEl.textContent = teachers.length ? `(${teachers.length})` : "(0)";
  if (studentsCountEl) studentsCountEl.textContent = students.length ? `(${students.length})` : "(0)";

  const status = String(document.getElementById("admin-status-filter")?.value || "all");
  const emptyMsg = !users?.length ? `No users found (${status}).` : "No users match your search.";

  if (teachersBody) {
    if (!filtered.length && !users?.length) teachersBody.innerHTML = `<tr><td colspan="5" class="admin-dashboard-empty">${escapeHtml(emptyMsg)}</td></tr>`;
    else renderAdminTableSection(teachersBody, teachers, adminTeachersPager, "admin-teachers-page-info", "admin-teachers-prev", "admin-teachers-next", false);
  }
  if (studentsBody) {
    if (!filtered.length && !users?.length) studentsBody.innerHTML = `<tr><td colspan="7" class="admin-dashboard-empty">${escapeHtml(emptyMsg)}</td></tr>`;
    else renderAdminTableSection(studentsBody, students, adminStudentsPager, "admin-students-page-info", "admin-students-prev", "admin-students-next", true);
  }

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function isAdminPageWithSidebar() {
  const path = window.location.pathname || "";
  return path.includes("admin-dashboard.html") || path.includes("account-verification.html");
}

function isAdminDashboardStatsPage() {
  return !!document.getElementById("admin-stat-teachers");
}

function isAccountVerificationPage() {
  return !!document.getElementById("admin-teachers-body");
}

async function loadAdminDashboardStats() {
  const token = getAdminToken();
  const res = await fetch((window.API_BASE || "") + "/api/admin/dashboard-stats", {
    headers: { "x-admin-token": token || "" },
  });
  const data = await readJsonOrThrow(res);
  if (!data.success) throw new Error(data.error || "Failed to load stats");
  return data.stats || {};
}

function renderAdminDashboardStats(stats) {
  const ids = ["admin-stat-teachers", "admin-stat-students", "admin-stat-classes", "admin-stat-pending", "admin-stat-approved", "admin-stat-rejected"];
  const keys = ["teachers", "students", "classes", "verification.pending", "verification.approved", "verification.rejected"];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    let val = stats;
    keys[i].split(".").forEach((k) => {
      val = val != null && typeof val === "object" ? val[k] : undefined;
    });
    el.textContent = val != null && Number.isFinite(Number(val)) ? String(val) : "—";
  });
  const v = stats?.verification || {};
  const pending = Number(v.pending || 0);
  const approved = Number(v.approved || 0);
  const rejected = Number(v.rejected || 0);
  const total = pending + approved + rejected;
  let pPct = 0, aPct = 0, rPct = 0;
  if (total > 0) {
    pPct = Math.round((pending / total) * 100);
    aPct = Math.round((approved / total) * 100);
    rPct = 100 - pPct - aPct;
    if (rPct < 0) rPct = 0;
  }
  ["admin-progress-pending", "admin-progress-approved", "admin-progress-rejected"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.width = [pPct, aPct, rPct][i] + "%";
  });
}

function updateAdminNotificationBadge(pendingCount) {
  const badge = document.getElementById("adminNotificationBadge");
  const listEl = document.getElementById("adminNotificationList");
  const btn = document.getElementById("adminNotificationBtn");
  if (btn) btn.setAttribute("aria-label", pendingCount > 0 ? `Open notifications (${pendingCount} pending)` : "Open notifications");
  if (badge) {
    if (pendingCount > 0) {
      badge.textContent = pendingCount > 99 ? "99+" : String(pendingCount);
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
  if (listEl) {
    if (pendingCount > 0) {
      listEl.innerHTML = `
        <a href="account-verification.html" class="mobile-nav-notification-item mobile-nav-notification-item--unread" style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;text-decoration:none;color:inherit;border-bottom:1px solid var(--border);">
          <span class="mobile-nav-notification-avatar" style="background:linear-gradient(135deg,var(--primary),var(--secondary));color:white;width:2.5rem;height:2.5rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.875rem;">!</span>
          <span class="mobile-nav-notification-content" style="flex:1;">
            <span class="mobile-nav-notification-item-title" style="display:block;font-weight:500;">${pendingCount === 1 ? "1 account" : pendingCount + " accounts"} pending verification</span>
            <span class="mobile-nav-notification-item-meta" style="font-size:0.75rem;color:var(--muted-foreground);">Click to review</span>
          </span>
        </a>
      `;
    } else {
      listEl.innerHTML = "<p class=\"mobile-nav-notification-empty\">No notifications.</p>";
    }
  }
}

function initAdminNotification() {
  const btn = document.getElementById("adminNotificationBtn");
  const panel = document.getElementById("adminNotificationPanel");
  if (!btn || !panel) return;
  async function refreshNotificationCount() {
    try {
      const stats = await loadAdminDashboardStats();
      const pending = Number(stats?.verification?.pending || 0);
      updateAdminNotificationBadge(pending);
    } catch (_) {
      updateAdminNotificationBadge(0);
    }
  }
  refreshNotificationCount();
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !panel.classList.contains("hidden");
    panel.classList.toggle("hidden", isOpen);
    btn.setAttribute("aria-expanded", !isOpen);
  });
  document.addEventListener("click", (e) => {
    if (panel.classList.contains("hidden")) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    panel.classList.add("hidden");
    btn.setAttribute("aria-expanded", "false");
  });
}

function initAdminSidebarToggle() {
  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("mobileNavMenuBtn");
  if (!sidebar || !menuBtn) return;
  let overlay = document.getElementById("mobile-sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "mobile-sidebar-overlay";
    overlay.className = "mobile-sidebar-overlay hidden";
    document.body.appendChild(overlay);
  }
  const STORAGE_KEY = "eel-sidebar-open";
  const isDesktop = window.matchMedia && window.matchMedia("(min-width: 769px)").matches;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    if (stored === "true") { sidebar.classList.add("open"); overlay.classList.remove("hidden"); }
    else { sidebar.classList.remove("open"); overlay.classList.add("hidden"); }
  } else {
    if (isDesktop) { sidebar.classList.add("open"); overlay.classList.remove("hidden"); sessionStorage.setItem(STORAGE_KEY, "true"); }
    else { sidebar.classList.remove("open"); overlay.classList.add("hidden"); sessionStorage.setItem(STORAGE_KEY, "false"); }
  }
  function updateBurgerIcon(isOpen) {
    menuBtn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    menuBtn.innerHTML = isOpen ? "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M18 6L6 18M6 6l12 12\"/></svg>" : "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 6h16M4 12h16M4 18h16\"/></svg>";
  }
  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.add("hidden");
    updateBurgerIcon(false);
    sessionStorage.setItem(STORAGE_KEY, "false");
  }
  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.remove("hidden");
    updateBurgerIcon(true);
    sessionStorage.setItem(STORAGE_KEY, "true");
  }
  updateBurgerIcon(sidebar.classList.contains("open"));
  menuBtn.addEventListener("click", () => (sidebar.classList.contains("open") ? closeSidebar() : openSidebar()));
  overlay.addEventListener("click", closeSidebar);
  sidebar.addEventListener("click", (e) => {
    if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches()) {
      const link = e.target.closest("a[href]");
      const href = (link && link.getAttribute("href")) || "";
      if (href && href.trim() !== "" && href !== "#" && !href.startsWith("javascript:")) closeSidebar();
    }
  });
}

async function initAdminDashboardStatsPage() {
  if (!isAdminDashboardStatsPage()) return;
  const token = getAdminToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  document.getElementById("loading-screen")?.classList.add("hidden");
  document.getElementById("main-app")?.classList.remove("hidden");
  initAdminSidebarToggle();
  initAdminNotification();
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    const result = await Swal.fire({ icon: "question", title: "Log out?", text: "Are you sure?", showCancelButton: true, confirmButtonText: "Yes", cancelButtonText: "No", confirmButtonColor: "#8b5cf6" });
    if (!result.isConfirmed) return;
    clearAdminToken();
    try { localStorage.removeItem("eel_token"); localStorage.removeItem("eel_user"); localStorage.removeItem("eel_avatar_url"); } catch (_) {}
    window.location.replace("login.html");
  });
  try {
    const stats = await loadAdminDashboardStats();
    renderAdminDashboardStats(stats);
  } catch (err) {
    console.error("Admin dashboard stats:", err);
  }
  if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
}

async function initAdminDashboardPage() {
  const hasVerification = document.getElementById("admin-teachers-body");
  if (!hasVerification) return;

  const token = getAdminToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("loading-screen")?.classList.add("hidden");
  document.getElementById("main-app")?.classList.remove("hidden");
  initAdminSidebarToggle();
  initAdminNotification();

  const refresh = async () => {
    try {
      const status = String(document.getElementById("admin-status-filter")?.value || "all");
      const data = await fetchAdminUsers(status);
      if (!data.enabled) {
        // Also render an inline message (not just a popup)
        const teachersBody = document.getElementById("admin-teachers-body");
        const studentsBody = document.getElementById("admin-students-body");
        const msgRow = `<tr><td colspan="5" class="text-muted-foreground">Account verification is not enabled in your database yet. Run <strong>js-back-end/migrate-account-verification.sql</strong> then refresh.</td></tr>`;
        const msgRowStudents = `<tr><td colspan="7" class="text-muted-foreground">Account verification is not enabled in your database yet. Run <strong>js-back-end/migrate-account-verification.sql</strong> then refresh.</td></tr>`;
        if (teachersBody) teachersBody.innerHTML = msgRow;
        if (studentsBody) studentsBody.innerHTML = msgRowStudents;
        Swal.fire({
          icon: "warning",
          title: "Migration required",
          text: "Run `js-back-end/migrate-account-verification.sql` in your database, then refresh.",
        });
        window.__adminUsers = [];
        updateNewAccountsBanner(0);
        updateAdminNotificationBadge(0);
        // Important: don't overwrite the message with "No pending users"
        return;
      }
      window.__adminUsers = data.users || [];
      adminTeachersPager.page = 1;
      adminStudentsPager.page = 1;
      renderAdminUsers(window.__adminUsers);
      const pendingCount = data.pending_count ?? 0;
      updateNewAccountsBanner(pendingCount);
      updateAdminNotificationBadge(pendingCount);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err?.message || "Failed to load users" });
      updateNewAccountsBanner(0);
      updateAdminNotificationBadge(0);
    }
  };

  document.getElementById("admin-view-pending-btn")?.addEventListener("click", () => {
    const filter = document.getElementById("admin-status-filter");
    if (filter) {
      filter.value = "pending";
      refresh();
    }
  });
  function wireLogout(btn) {
    if (!btn || btn._adminLogoutWired) return;
    btn._adminLogoutWired = true;
    btn.addEventListener("click", async () => {
      const result = await Swal.fire({ icon: "question", title: "Log out?", text: "Are you sure?", showCancelButton: true, confirmButtonText: "Yes", cancelButtonText: "No", confirmButtonColor: "#8b5cf6" });
      if (!result.isConfirmed) return;
      clearAdminToken();
      try { localStorage.removeItem("eel_token"); localStorage.removeItem("eel_user"); localStorage.removeItem("eel_avatar_url"); } catch (_) {}
      window.location.replace("login.html");
    });
  }
  wireLogout(document.getElementById("logout-btn"));
  wireLogout(document.getElementById("admin-logout-btn"));

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
      title: "Decline account?",
      text: name,
      input: "text",
      inputLabel: "Reason (optional)",
      inputPlaceholder: "e.g. Duplicate account / invalid details",
      showCancelButton: true,
      confirmButtonText: "Decline",
      confirmButtonColor: "#ef4444",
    });
    if (!result.isConfirmed) return;
    try {
      await rejectUser(id, result.value || "");
      await refresh();
      Swal.fire({ icon: "success", title: "Declined", text: `${name} was declined.` });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed", text: err?.message || "Decline failed" });
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
  initAdminDashboardStatsPage();
  initAdminDashboardPage();
});

