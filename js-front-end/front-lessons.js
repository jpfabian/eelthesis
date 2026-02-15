// Lessons page UI (accordions + search) — theme-friendly

let __eelLessonsSubject = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Capture class_id if present
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get("class_id");
    if (classId) {
      localStorage.setItem("eel_selected_class_id", classId);
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }

    const user = await initializePage();

    // Back to classes
    const backBtn = document.getElementById("back-class-btn");
    if (backBtn) backBtn.addEventListener("click", () => (window.location.href = "classes.html"));

    // Render curriculum
    await loadCurriculum();

    // Search topics
    const searchInput = document.getElementById("lesson-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => applySearchFilter(searchInput.value));
    }

    // Grid/List view toggle for AI-generated quizzes
    initLessonsQuizViewToggle();

    // Role-based UI (keep behavior consistent)
    const tabQuizzes = document.getElementById("lessons-tab-quizzes");
    const quizSubtitle = document.getElementById("lessons-ai-quiz-subtitle");
    if (user.role === "student") {
      document.querySelectorAll(".teacher-only").forEach((el) => (el.style.display = "none"));
      document.querySelectorAll(".student-only").forEach((btn) => btn.classList.remove("hidden"));
      if (tabQuizzes) tabQuizzes.classList.remove("hidden");
      if (quizSubtitle) quizSubtitle.textContent = "Quizzes from your teacher. Take them and view the leaderboard.";
      loadLessonsAIQuizzesForStudent();
    } else {
      document.querySelectorAll(".student-only").forEach((el) => (el.style.display = "none"));
      if (tabQuizzes) tabQuizzes.classList.remove("hidden");
      if (quizSubtitle) quizSubtitle.textContent = "Quizzes you created. Set schedule and view leaderboard here.";
      loadLessonsAIGeneratedList();
    }

    hideLoading();
  } catch (err) {
    console.error("Error initializing lessons page:", err);
    try {
      hideLoading();
    } catch {}
    window.location.href = "login.html";
  }
});

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeSubjectName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function pickSubject(data) {
  if (!Array.isArray(data) || data.length === 0) return null;

  const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class") || "null");
  const wantedSubjectId = selectedClass?.subject_id ? Number(selectedClass.subject_id) : null;
  const wantedName = selectedClass?.subject ? normalizeSubjectName(selectedClass.subject) : "";

  // 1) Prefer stable ID match (prevents "wrong subject" content)
  if (wantedSubjectId && Number.isFinite(wantedSubjectId)) {
    const byId = data.find((s) => Number(s.subject_id) === wantedSubjectId);
    if (byId) return byId;
  }

  // 2) Fallback to normalized exact-name match (avoid loose "includes" collisions)
  if (wantedName) {
    const exact = data.find((s) => {
      const n = normalizeSubjectName(s.subject_name);
      return n === wantedName;
    });
    if (exact) return exact;
  }

  // Fallback: first subject
  return data[0];
}

async function loadCurriculum() {
  const subjectNameEl = document.getElementById("subject-name");
  const container = document.getElementById("lessons-container");
  const emptyEl = document.getElementById("lessons-empty");

  if (!container || !subjectNameEl) return;

  container.innerHTML = "";
  if (emptyEl) emptyEl.classList.add("hidden");

  try {
    const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class") || "null");
    const subjectId = selectedClass?.subject_id ? Number(selectedClass.subject_id) : null;
    const expectedName = selectedClass?.subject ? normalizeSubjectName(selectedClass.subject) : "";

    // Prefer server-side filtering by subject_id (guarantees correct subject PPT/PDF)
    const url = Number.isFinite(subjectId)
      ? `http://localhost:3000/curriculum?subject_id=${encodeURIComponent(subjectId)}`
      : "http://localhost:3000/curriculum";

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load curriculum: ${res.status}`);
    const data = await res.json();

    // If filtered by subject_id, API may return [] or [subject]. Normalize.
    let subject = Array.isArray(data) && data.length === 1 && Number.isFinite(subjectId)
      ? data[0]
      : pickSubject(data);

    // If we asked for a subject_id but got the wrong subject_name (common when subject_id was hardcoded),
    // correct by resolving subject_id from the backend by exact normalized subject name.
    const gotName = subject?.subject_name ? normalizeSubjectName(subject.subject_name) : "";
    const hasMismatch = expectedName && gotName && expectedName !== gotName;

    if (!subject || (Array.isArray(data) && data.length === 0) || hasMismatch) {
      const resAll = await fetch("http://localhost:3000/curriculum");
      if (resAll.ok) {
        const all = await resAll.json();
        const byName = expectedName
          ? all.find((s) => normalizeSubjectName(s.subject_name) === expectedName)
          : null;

        if (byName) {
          subject = byName;
          if (selectedClass) {
            selectedClass.subject_id = Number(byName.subject_id);
            localStorage.setItem("eel_selected_class", JSON.stringify(selectedClass));
          }
        }
      }
    }

    // If we only had subject name before, persist the resolved subject_id for next time.
    if (selectedClass && subject?.subject_id) {
      selectedClass.subject_id = Number(subject.subject_id);
      localStorage.setItem("eel_selected_class", JSON.stringify(selectedClass));
    }

    __eelLessonsSubject = subject;

    if (!subject) {
      subjectNameEl.textContent = "No lessons available";
      return;
    }

    subjectNameEl.textContent = subject.subject_name || "Subject";

    const lessons = Array.isArray(subject.lessons) ? subject.lessons : [];
    if (lessons.length === 0) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }

    lessons.forEach((lesson, idx) => {
      container.appendChild(renderLessonSection(lesson, idx === 0));
    });

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }

    // Ensure a fresh search applies after reload
    const searchInput = document.getElementById("lesson-search");
    if (searchInput && searchInput.value) {
      applySearchFilter(searchInput.value);
    }
  } catch (e) {
    console.error("Error loading curriculum:", e);
    subjectNameEl.textContent = "Failed to load lessons";
  }
}

function renderLessonSection(lesson, isOpenByDefault) {
  const section = document.createElement("section");
  section.className = `lesson-section ${isOpenByDefault ? "open" : ""}`;

  const title = escapeHtml(lesson?.lesson_title ?? "Lesson");
  const topics = Array.isArray(lesson?.topics) ? lesson.topics : [];

  section.innerHTML = `
    <button type="button" class="lesson-section__toggle" aria-expanded="${isOpenByDefault ? "true" : "false"}">
      <div class="lesson-section__toggle-left">
        <div class="lesson-section__badge">
          <i data-lucide="library" class="size-4"></i>
        </div>
        <div class="lesson-section__title">${title}</div>
      </div>
      <div class="lesson-section__right">
        <span class="lesson-section__count">${topics.length} topic${topics.length === 1 ? "" : "s"}</span>
        <i data-lucide="chevron-down" class="size-5 lesson-section__chev"></i>
      </div>
    </button>
    <div class="lesson-section__body">
      <div class="topic-list"></div>
    </div>
  `;

  const toggleBtn = section.querySelector(".lesson-section__toggle");
  const body = section.querySelector(".lesson-section__body");
  const list = section.querySelector(".topic-list");

  topics.forEach((topic) => {
    list.appendChild(renderTopicRow(topic));
  });

  toggleBtn.addEventListener("click", () => {
    const willOpen = !section.classList.contains("open");
    section.classList.toggle("open", willOpen);
    toggleBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    // let CSS handle height; body is shown/hidden
    if (body) body.style.display = willOpen ? "block" : "none";
  });

  // Ensure initial state (for browsers that don’t apply CSS quickly)
  if (body) body.style.display = isOpenByDefault ? "block" : "none";

  return section;
}

// API/base URL for lesson PDFs — must match backend (same as curriculum fetch)
const LESSON_API_BASE = "http://localhost:3000";
function getPdfBaseUrl() {
  return LESSON_API_BASE;
}

function getPdfUrl(pdfPath) {
  const p = String(pdfPath ?? "").trim();
  if (!p) return null;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const base = getPdfBaseUrl().replace(/\/$/, "");
  const pathPart = p.replace(/^\/uploads\/?/, "");
  if (!pathPart) return null;
  return base + "/api/lesson-pdf?path=" + encodeURIComponent(pathPart);
}

function renderTopicRow(topic) {
  const row = document.createElement("div");
  row.className = "topic-row";

  const title = escapeHtml(topic?.topic_title ?? "Topic");
  const pdfPath = String(topic?.pdf_path ?? "");
  const pdfUrl = getPdfUrl(pdfPath);
  const hasPdf = !!pdfUrl;

  // For search filtering
  row.dataset.topicTitle = String(topic?.topic_title ?? "").toLowerCase();
  row.dataset.lessonPdf = pdfPath;

  const linkOrPlaceholder = hasPdf
    ? `<button type="button" class="btn btn-outline topic-row__btn" data-action="view-pdf">
        <i data-lucide="file-text" class="size-4"></i>
        View PDF
       </button>`
    : `<span class="topic-row__no-pdf text-muted-foreground text-sm">No PDF</span>`;

  row.innerHTML = `
    <div class="topic-row__left">
      <div class="topic-row__icon">
        <i data-lucide="book-open" class="size-4"></i>
      </div>
      <div class="topic-row__title">${title}</div>
    </div>
    <div class="topic-row__right">
      ${linkOrPlaceholder}
    </div>
  `;

  if (hasPdf) {
    row.addEventListener("click", () => viewLesson(pdfUrl, topic?.topic_title ?? "Lesson"));
    const btn = row.querySelector('[data-action="view-pdf"]');
    if (btn) btn.addEventListener("click", (e) => { e.stopPropagation(); viewLesson(pdfUrl, topic?.topic_title ?? "Lesson"); });
  }

  return row;
}

function viewLesson(pdfPath, topicTitle) {
  const titleEl = document.getElementById("lesson-title");
  const embed = document.getElementById("lesson-pdf");
  const modal = document.getElementById("lesson-modal");

  if (titleEl) titleEl.textContent = topicTitle;
  if (embed) embed.src = pdfPath;
  if (modal) modal.classList.remove("hidden");
}

function closeLesson() {
  const modal = document.getElementById("lesson-modal");
  const embed = document.getElementById("lesson-pdf");
  if (modal) modal.classList.add("hidden");
  if (embed) embed.src = "";
}

function applySearchFilter(raw) {
  const q = String(raw || "").trim().toLowerCase();
  const emptyEl = document.getElementById("lessons-empty");

  let totalVisibleTopics = 0;

  document.querySelectorAll(".lesson-section").forEach((section) => {
    let visibleInSection = 0;

    section.querySelectorAll(".topic-row").forEach((row) => {
      const hay = row.dataset.topicTitle || "";
      const match = !q || hay.includes(q);
      row.style.display = match ? "" : "none";
      if (match) {
        visibleInSection += 1;
        totalVisibleTopics += 1;
      }
    });

    // Hide entire lesson section when nothing matches inside
    section.style.display = visibleInSection > 0 ? "" : "none";
  });

  if (emptyEl) {
    emptyEl.classList.toggle("hidden", totalVisibleTopics > 0);
  }
}

/** Grid/List view toggle for AI-generated quizzes section (persists in localStorage). */
function initLessonsQuizViewToggle() {
  const section = document.getElementById("lessons-ai-quiz-section");
  const btnGrid = document.getElementById("lessons-ai-quiz-view-grid");
  const btnList = document.getElementById("lessons-ai-quiz-view-list");
  if (!section || !btnGrid || !btnList) return;
  const storageKey = "eel_lessons_ai_quiz_view";
  const apply = (view) => {
    const v = view === "list" ? "list" : "grid";
    section.setAttribute("data-view", v);
    try {
      localStorage.setItem(storageKey, v);
    } catch (_) {}
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      setTimeout(() => window.lucide.createIcons(), 0);
    }
  };
  const saved = (() => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  })();
  apply(saved === "list" ? "list" : "grid");
  btnGrid.addEventListener("click", () => apply("grid"));
  btnList.addEventListener("click", () => apply("list"));
}

function switchLessonsView(view) {
  const pptContainer = document.getElementById("lessons-ppt-container");
  const quizzesContainer = document.getElementById("lessons-quizzes-container");
  const tabPpt = document.getElementById("lessons-tab-ppt");
  const tabQuizzes = document.getElementById("lessons-tab-quizzes");
  if (!pptContainer || !quizzesContainer) return;  if (view === "ppt") {
    pptContainer.classList.remove("hidden");
    quizzesContainer.classList.add("hidden");
    if (tabPpt) {
      tabPpt.classList.add("btn-primary");
      tabPpt.classList.remove("btn-outline");
      tabPpt.setAttribute("aria-selected", "true");
    }
    if (tabQuizzes) {
      tabQuizzes.classList.remove("btn-primary");
      tabQuizzes.classList.add("btn-outline");
      tabQuizzes.setAttribute("aria-selected", "false");
    }
  } else {
    pptContainer.classList.add("hidden");
    quizzesContainer.classList.remove("hidden");
    if (tabPpt) {
      tabPpt.classList.remove("btn-primary");
      tabPpt.classList.add("btn-outline");
      tabPpt.setAttribute("aria-selected", "false");
    }
    if (tabQuizzes) {
      tabQuizzes.classList.add("btn-primary");
      tabQuizzes.classList.remove("btn-outline");
      tabQuizzes.setAttribute("aria-selected", "true");
    }
  }
  if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
}

// ========== AI Quiz list (Lessons page) — schedule, lock, leaderboard ==========
let _lessonScheduleQuizId = null;
let _lessonLeaderboardQuizId = null;

function formatLessonQuizDate(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString.replace(" ", "T"));
    return d.toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" });
  } catch {
    return String(dateString);
  }
}

function getPHDateTimeLocalLesson() {
  const now = new Date();
  const ph = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const y = ph.getUTCFullYear();
  const m = String(ph.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ph.getUTCDate()).padStart(2, "0");
  const hr = String(ph.getUTCHours()).padStart(2, "0");
  const min = String(ph.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hr}:${min}`;
}

function toDateTimeLocalPHLesson(apiDate) {
  if (!apiDate) return "";
  const s = String(apiDate).trim();
  if (s.includes("T") && s.length >= 16) return s.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) return s.replace(/\s+/, "T").slice(0, 16);
  const d = new Date(apiDate);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hr = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hr}:${min}`;
}

function toMySQLDateTimeLocalLesson(input) {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();
  if (!s || s.indexOf("Z") >= 0 || s.indexOf("+") >= 0) return null;
  let match = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/);
  if (match) {
    const sec = match[6] != null ? match[6] : "00";
    return match[1] + "-" + match[2] + "-" + match[3] + " " + match[4] + ":" + match[5] + ":" + sec;
  }
  match = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const sec = match[6] != null ? match[6] : "00";
    return match[1] + "-" + match[2] + "-" + match[3] + " " + match[4] + ":" + match[5] + ":" + sec;
  }
  return null;
}

function openScheduleModalLesson(quizId, scheduleDataAttr) {
  _lessonScheduleQuizId = quizId;
  let existing = null;
  if (scheduleDataAttr) try { existing = typeof scheduleDataAttr === "string" ? JSON.parse(scheduleDataAttr) : scheduleDataAttr; } catch (e) {}
  const modal = document.getElementById("lesson-schedule-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  const formattedNow = getPHDateTimeLocalLesson();
  const unlockEl = document.getElementById("lesson-modal-unlock-time");
  const lockEl = document.getElementById("lesson-modal-lock-time");
  const limitEl = document.getElementById("lesson-modal-time-limit");
  if (unlockEl) {
    unlockEl.value = (existing && existing.unlock_time) ? toDateTimeLocalPHLesson(existing.unlock_time) : formattedNow;
    unlockEl.min = formattedNow;
  }
  if (lockEl) {
    lockEl.value = (existing && existing.lock_time) ? toDateTimeLocalPHLesson(existing.lock_time) : "";
    lockEl.min = formattedNow;
  }
  if (limitEl) limitEl.value = (existing && existing.time_limit != null) ? String(existing.time_limit) : "";
  if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
}

function closeScheduleModalLesson() {
  _lessonScheduleQuizId = null;
  const modal = document.getElementById("lesson-schedule-modal");
  if (modal) modal.classList.add("hidden");
}

function openLeaderboardModalLesson(quizId) {
  _lessonLeaderboardQuizId = quizId;
  const modal = document.getElementById("lesson-leaderboard-modal");
  if (modal) modal.classList.remove("hidden");
  loadLeaderboardLesson(quizId);
  if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
}

function closeLeaderboardModalLesson() {
  const modal = document.getElementById("lesson-leaderboard-modal");
  if (modal) modal.classList.add("hidden");
}

const PODIUM_GRADIENTS = [
  "linear-gradient(135deg, #fbbf24, #f59e0b)",
  "linear-gradient(135deg, #9ca3af, #6b7280)",
  "linear-gradient(135deg, #fb923c, #ea580c)",
];

async function loadLeaderboardLesson(quizId) {
  if (quizId != null) _lessonLeaderboardQuizId = quizId;
  const qid = _lessonLeaderboardQuizId;
  if (!qid) return;
  const modal = document.getElementById("lesson-leaderboard-modal");
  const tbody = document.getElementById("lesson-leaderboard-body");
  const nameEl = document.getElementById("lesson-quiz-name");
  if (!tbody) return;

  try {
    const res = await fetch(`http://localhost:3000/api/reading-quiz-leaderboard?quiz_id=${qid}&teacher_quiz=1`);
    const data = await res.json();
    if (nameEl) nameEl.textContent = data.quizTitle || "Quiz";

    const leaderboard = Array.isArray(data.leaderboard) ? data.leaderboard : [];
    const podiums = modal ? [
      modal.querySelector(".second-place"),
      modal.querySelector(".first-place"),
      modal.querySelector(".third-place"),
    ].filter(Boolean) : [];

    podiums.forEach((podium) => {
      const avatar = podium?.querySelector(".podium-avatar");
      const nameEl = podium?.querySelector(".podium-name");
      const scoreEl = podium?.querySelector(".podium-score span");
      const rankEl = podium?.querySelector(".podium-rank");
      if (avatar) avatar.textContent = "";
      if (avatar) avatar.removeAttribute("style");
      if (nameEl) nameEl.textContent = "—";
      if (scoreEl) scoreEl.textContent = "-";
      if (rankEl) rankEl.textContent = "";
    });

    leaderboard.slice(0, 3).forEach((entry, index) => {
      const podium = podiums[index];
      if (!podium) return;
      const initials = (entry.student_name || "").trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
      const avatar = podium.querySelector(".podium-avatar");
      const podiumName = podium.querySelector(".podium-name");
      const scoreEl = podium.querySelector(".podium-score span");
      const rankEl = podium.querySelector(".podium-rank");
      if (avatar) {
        avatar.textContent = initials || "?";
        avatar.style.background = PODIUM_GRADIENTS[index] || PODIUM_GRADIENTS[0];
      }
      if (podiumName) podiumName.textContent = entry.student_name || "—";
      if (scoreEl) scoreEl.textContent = `${entry.score}/${entry.total_points || "?"}`;
      if (rankEl) rankEl.textContent = `#${index + 1}`;
    });

    tbody.innerHTML = "";
    if (leaderboard.length > 0) {
      leaderboard.forEach((entry, index) => {
        const initials = (entry.student_name || "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
        const rankBadge = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1;
        const rowClass = index < 3 ? "top-three" : "";
        const gradient = index < 3 ? PODIUM_GRADIENTS[index] : "linear-gradient(135deg, var(--primary), var(--secondary))";
        const row = `<tr class="leaderboard-table-row ${rowClass}">
          <td><span class="rank-badge">${rankBadge}</span></td>
          <td>
            <div class="student-info">
              <div class="student-avatar" style="background:${gradient}">${escapeHtml(initials)}</div>
              <span>${escapeHtml(entry.student_name)}</span>
            </div>
          </td>
          <td><span class="score-badge">${entry.score}/${entry.total_points}</span></td>
          <td><span class="time-badge">${entry.time_taken || "-"}</span></td>
          <td><span class="status-badge completed">✓ ${entry.status || "Completed"}</span></td>
        </tr>`;
        tbody.insertAdjacentHTML("beforeend", row);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted-foreground);">No attempts yet.</td></tr>';
    }
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Failed to load leaderboard.</td></tr>';
  }
}

function refreshLeaderboardLesson() {
  loadLeaderboardLesson(_lessonLeaderboardQuizId);
}

document.addEventListener("DOMContentLoaded", function () {
  const saveScheduleBtn = document.getElementById("lesson-save-schedule-btn");
  if (saveScheduleBtn) {
    saveScheduleBtn.addEventListener("click", async function () {
      const quizId = _lessonScheduleQuizId;
      if (!quizId) return;
      const unlockVal = document.getElementById("lesson-modal-unlock-time")?.value?.trim();
      const lockVal = document.getElementById("lesson-modal-lock-time")?.value?.trim();
      const limitVal = document.getElementById("lesson-modal-time-limit")?.value?.trim();
      const unlockStr = toMySQLDateTimeLocalLesson(unlockVal);
      const lockStr = toMySQLDateTimeLocalLesson(lockVal);
      if (!unlockStr || !lockStr) {
        if (typeof showNotification === "function") showNotification("Please set both unlock and lock date & time.", "warning");
        return;
      }
      const timeLimit = limitVal ? parseInt(limitVal, 10) : null;
      try {
        const res = await fetch(`http://localhost:3000/api/teacher/reading-quizzes/${quizId}/schedule`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unlock_time: unlockStr, lock_time: lockStr, time_limit: timeLimit }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          if (typeof showNotification === "function") showNotification("Schedule saved.", "success");
          closeScheduleModalLesson();
          loadLessonsAIGeneratedList();
        } else {
          if (typeof showNotification === "function") showNotification(data.message || "Failed to save schedule.", "error");
        }
      } catch (err) {
        if (typeof showNotification === "function") showNotification("Failed to save schedule.", "error");
      }
    });
  }
});

function handleLockTeacherQuizLesson(quizId, _btn) {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      title: "Lock quiz?",
      text: "Students will no longer be able to take this quiz.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#6366f1",
    }).then((result) => {
      if (result.isConfirmed) doLockTeacherQuizLesson(quizId);
    });
  } else if (confirm("Lock this quiz? Students will no longer be able to take it.")) {
    doLockTeacherQuizLesson(quizId);
  }
}

async function doLockTeacherQuizLesson(quizId) {
  const now = new Date();
  const ph = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const y = ph.getUTCFullYear();
  const m = String(ph.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ph.getUTCDate()).padStart(2, "0");
  const hr = String(ph.getUTCHours()).padStart(2, "0");
  const min = String(ph.getUTCMinutes()).padStart(2, "0");
  const sec = String(ph.getUTCSeconds()).padStart(2, "0");
  const lockTime = `${y}-${m}-${d} ${hr}:${min}:${sec}`;
  try {
    const getRes = await fetch(`http://localhost:3000/api/teacher/reading-quizzes/${quizId}`);
    const quiz = await getRes.json().catch(() => ({}));
    const unlockTime = quiz.unlock_time || null;
    const timeLimit = quiz.time_limit != null ? quiz.time_limit : null;
    const res = await fetch(`http://localhost:3000/api/teacher/reading-quizzes/${quizId}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unlock_time: unlockTime, lock_time: lockTime, time_limit: timeLimit }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      if (typeof showNotification === "function") showNotification("Quiz locked.", "success");
      loadLessonsAIGeneratedList();
    } else {
      if (typeof showNotification === "function") showNotification(data.message || "Failed to lock.", "error");
    }
  } catch (err) {
    if (typeof showNotification === "function") showNotification("Failed to lock quiz.", "error");
  }
}

async function loadLessonsAIGeneratedList() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || user.role !== "teacher") return;
  const container = document.getElementById("lessons-ai-quiz-list");
  if (!container) return;
  try {
    const res = await fetch(`http://localhost:3000/api/teacher/reading-quizzes?user_id=${user.user_id}`);
    if (!res.ok) throw new Error("Failed to fetch");
    const quizzes = await res.json();
    const now = new Date();
    quizzes.sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return ta - tb;
    });
    container.innerHTML = "";
    if (quizzes.length === 0) {
      container.innerHTML = `
        <div class="lessons-ai-quiz-list__empty">
          <span class="lessons-ai-quiz-list__empty-icon" aria-hidden="true"><i data-lucide="sparkles" class="size-10"></i></span>
          <p class="lessons-ai-quiz-list__empty-title">No quizzes yet</p>
          <p class="lessons-ai-quiz-list__empty-text">Click "AI Generate Quiz" above to create your first quiz.</p>
        </div>`;
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    } else {
      quizzes.forEach((quiz) => {
        const start = quiz.unlock_time ? new Date(quiz.unlock_time.replace(" ", "T")) : null;
        const end = quiz.lock_time ? new Date(quiz.lock_time.replace(" ", "T")) : null;
        const hasSchedule = !!(start && end);
        const isCurrentlyLocked = hasSchedule && end && now > end;
        const statusLabel = !hasSchedule ? "Not scheduled" : isCurrentlyLocked ? "Locked" : "Open";
        const statusClass = !hasSchedule ? "created-quiz-status--none" : isCurrentlyLocked ? "created-quiz-status--closed" : "created-quiz-status--open";
        const scheduleLabel = hasSchedule
          ? `Opens ${formatLessonQuizDate(quiz.unlock_time)} · Due ${formatLessonQuizDate(quiz.lock_time)}`
          : "Not scheduled";
        const scheduleData = hasSchedule
          ? JSON.stringify({ unlock_time: quiz.unlock_time || null, lock_time: quiz.lock_time || null, time_limit: quiz.time_limit ?? null }).replace(/'/g, "&#39;")
          : "{}";
        const actionButtons =
          hasSchedule && !isCurrentlyLocked
            ? `
                <button type="button" class="btn btn-outline flex-1" onclick="event.stopPropagation(); openLeaderboardModalLesson(${quiz.quiz_id})">
                  <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>Leaderboard
                </button>
                <button type="button" class="btn btn-outline flex-1" onclick="event.stopPropagation(); handleLockTeacherQuizLesson(${quiz.quiz_id}, this)">
                  <i data-lucide="lock" class="size-3 mr-1"></i>Lock
                </button>
                <button type="button" class="btn btn-primary flex-1" data-schedule='${scheduleData}' onclick="event.stopPropagation(); openScheduleModalLesson(${quiz.quiz_id}, this.getAttribute('data-schedule'))">
                  <i data-lucide="calendar-clock" class="size-3 mr-1"></i>Edit schedule
                </button>`
            : `
                <button type="button" class="btn btn-outline flex-1" onclick="event.stopPropagation(); openLeaderboardModalLesson(${quiz.quiz_id})">
                  <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>Leaderboard
                </button>
                <button type="button" class="btn btn-primary flex-1" data-schedule='${scheduleData}' onclick="event.stopPropagation(); openScheduleModalLesson(${quiz.quiz_id}, this.getAttribute('data-schedule'))">
                  <i data-lucide="unlock" class="size-3 mr-1"></i>Unlock
                </button>`;
        const card = document.createElement("div");
        card.className = "card created-quiz-card lessons-ai-quiz-item group";
        card.innerHTML = `
          <div class="created-quiz-card__inner">
            <div class="created-quiz-card__header" role="button" tabindex="0" aria-expanded="false" aria-label="Expand quiz details">
              <div class="created-quiz-card__icon" aria-hidden="true">
                <i data-lucide="book-open" class="created-quiz-card__icon-svg"></i>
              </div>
              <div class="created-quiz-card__title-wrap">
                <h3 class="created-quiz-card__title">${escapeHtml(quiz.title)}</h3>
                <span class="lessons-ai-quiz-status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>
              </div>
              <i data-lucide="chevron-down" class="created-quiz-card__chevron" aria-hidden="true"></i>
            </div>
            <div class="created-quiz-card__details hidden">
              <p class="created-quiz-card__passage">${escapeHtml(quiz.passage ? quiz.passage.substring(0, 140).trim() + (quiz.passage.length > 140 ? "…" : "") : "No description.")}</p>
              <div class="created-quiz-card__schedule">
                <i data-lucide="calendar-clock" class="created-quiz-card__schedule-icon" aria-hidden="true"></i>
                <span class="created-quiz-card__schedule-text">${escapeHtml(scheduleLabel)}</span>
              </div>
              <div class="quiz-actions created-quiz-card__actions">${actionButtons}</div>
            </div>
          </div>`;
        const header = card.querySelector(".created-quiz-card__header");
        const details = card.querySelector(".created-quiz-card__details");
        const toggle = () => {
          const isOpen = !details.classList.contains("hidden");
          details.classList.toggle("hidden", isOpen);
          header.setAttribute("aria-expanded", !isOpen);
          card.classList.toggle("created-quiz-card--open", !isOpen);
          if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
        };
        header.addEventListener("click", (e) => {
          e.stopPropagation();
          toggle();
        });
        header.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        });
        card.querySelectorAll(".quiz-actions .btn").forEach((btn) => btn.addEventListener("click", (e) => e.stopPropagation()));
        container.appendChild(card);
      });
    }
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  } catch (err) {
    console.error("loadLessonsAIGeneratedList:", err);
    container.innerHTML = `
      <div class="lessons-ai-quiz-list__empty">
        <span class="lessons-ai-quiz-list__empty-icon" aria-hidden="true"><i data-lucide="alert-circle" class="size-10"></i></span>
        <p class="lessons-ai-quiz-list__empty-title">Something went wrong</p>
        <p class="lessons-ai-quiz-list__empty-text">We couldn’t load your quizzes. Please try again later.</p>
      </div>`;
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }
}

/** Load AI-generated quizzes for students (by subject): list to take quiz and view leaderboard. */
async function loadLessonsAIQuizzesForStudent() {
  const container = document.getElementById("lessons-ai-quiz-list");
  if (!container) return;
  const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class") || "{}");
  const subjectId = selectedClass?.subject_id ? Number(selectedClass.subject_id) : null;
  if (!subjectId) {
    container.innerHTML = `
      <div class="lessons-ai-quiz-list__empty">
        <span class="lessons-ai-quiz-list__empty-icon" aria-hidden="true"><i data-lucide="folder-open" class="size-10"></i></span>
        <p class="lessons-ai-quiz-list__empty-title">Select a class</p>
        <p class="lessons-ai-quiz-list__empty-text">Choose a class from the sidebar to see quizzes from your teacher.</p>
      </div>`;
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    return;
  }
  try {
    const res = await fetch(`http://localhost:3000/api/teacher/reading-quizzes?subject_id=${subjectId}`);
    if (!res.ok) throw new Error("Failed to fetch quizzes");
    const quizzes = await res.json();
    const now = new Date();
    quizzes.sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return ta - tb;
    });
    container.innerHTML = "";
    if (quizzes.length === 0) {
      container.innerHTML = `
        <div class="lessons-ai-quiz-list__empty">
          <span class="lessons-ai-quiz-list__empty-icon" aria-hidden="true"><i data-lucide="inbox" class="size-10"></i></span>
          <p class="lessons-ai-quiz-list__empty-title">No quizzes yet</p>
          <p class="lessons-ai-quiz-list__empty-text">Your teacher hasn’t added quizzes for this subject yet. Check back later.</p>
        </div>`;
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
      return;
    }
    quizzes.forEach((quiz) => {
      const start = quiz.unlock_time ? new Date(quiz.unlock_time.replace(" ", "T")) : null;
      const end = quiz.lock_time ? new Date(quiz.lock_time.replace(" ", "T")) : null;
      const hasSchedule = !!(start && end);
      const isCurrentlyLocked = hasSchedule && end && now > end;
      const notYetOpen = hasSchedule && start && now < start;
      const scheduleNotSet = !hasSchedule;
      const effectiveLocked = scheduleNotSet || isCurrentlyLocked || notYetOpen;
      const statusLabel = scheduleNotSet ? "Not scheduled" : notYetOpen ? "Not yet open" : isCurrentlyLocked ? "Locked" : "Open";
      const statusClass = scheduleNotSet ? "created-quiz-status--none" : notYetOpen ? "created-quiz-status--pending" : isCurrentlyLocked ? "created-quiz-status--closed" : "created-quiz-status--open";
      let scheduleLabel = hasSchedule
        ? `Opens ${formatLessonQuizDate(quiz.unlock_time)} · Due ${formatLessonQuizDate(quiz.lock_time)}`
        : "Not scheduled";
      let takeLabel = "Take quiz";
      if (effectiveLocked) {
        if (scheduleNotSet) takeLabel = "Not scheduled";
        else if (notYetOpen) takeLabel = "Not yet open";
        else takeLabel = "Locked";
      }
      const card = document.createElement("div");
      card.className = "card created-quiz-card lessons-ai-quiz-item group";
      card.innerHTML = `
        <div class="created-quiz-card__inner">
          <div class="created-quiz-card__header" role="button" tabindex="0" aria-expanded="false" aria-label="Expand quiz details">
            <div class="created-quiz-card__icon" aria-hidden="true">
              <i data-lucide="book-open" class="created-quiz-card__icon-svg"></i>
            </div>
            <div class="created-quiz-card__title-wrap">
              <h3 class="created-quiz-card__title">${escapeHtml(quiz.title)}</h3>
              <span class="lessons-ai-quiz-status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>
            </div>
            <i data-lucide="chevron-down" class="created-quiz-card__chevron" aria-hidden="true"></i>
          </div>
          <div class="created-quiz-card__details hidden">
            <p class="created-quiz-card__passage">${escapeHtml(quiz.passage ? quiz.passage.substring(0, 140).trim() + (quiz.passage.length > 140 ? "…" : "") : "No description.")}</p>
            <div class="created-quiz-card__schedule">
              <i data-lucide="calendar-clock" class="created-quiz-card__schedule-icon" aria-hidden="true"></i>
              <span class="created-quiz-card__schedule-text">${escapeHtml(scheduleLabel)}</span>
            </div>
            <div class="quiz-actions created-quiz-card__actions">
              <button type="button" class="btn btn-primary flex-1" ${effectiveLocked ? "disabled" : ""} onclick="event.stopPropagation(); window.location.href='reading-lessons.html?open_quiz_id=${quiz.quiz_id}';">
                <i data-lucide="${effectiveLocked ? "lock" : "play"}" class="size-3 mr-1"></i>${takeLabel}
              </button>
              <button type="button" class="btn btn-outline flex-1" onclick="event.stopPropagation(); openLeaderboardModalLesson(${quiz.quiz_id})">
                <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>Leaderboard
              </button>
            </div>
          </div>
        </div>`;
      const header = card.querySelector(".created-quiz-card__header");
      const details = card.querySelector(".created-quiz-card__details");
      const toggle = () => {
        const isOpen = !details.classList.contains("hidden");
        details.classList.toggle("hidden", isOpen);
        header.setAttribute("aria-expanded", !isOpen);
        card.classList.toggle("created-quiz-card--open", !isOpen);
        if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
      };
      header.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
      header.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
      card.querySelectorAll(".quiz-actions .btn").forEach((btn) => btn.addEventListener("click", (e) => e.stopPropagation()));
      container.appendChild(card);
    });
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  } catch (err) {
    console.error("loadLessonsAIQuizzesForStudent:", err);
    container.innerHTML = `
      <div class="lessons-ai-quiz-list__empty">
        <span class="lessons-ai-quiz-list__empty-icon" aria-hidden="true"><i data-lucide="alert-circle" class="size-10"></i></span>
        <p class="lessons-ai-quiz-list__empty-title">Something went wrong</p>
        <p class="lessons-ai-quiz-list__empty-text">We couldn’t load quizzes. Please try again later.</p>
      </div>`;
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }
}

// ========== AI Quiz Generator (Lessons page) ==========
function getSelectedSubjectIdLesson() {
  const c = JSON.parse(localStorage.getItem("eel_selected_class") || "{}");
  return c && Number.isFinite(c.subject_id) ? Number(c.subject_id) : null;
}

var AI_QUIZ_TYPE_IDS = ["multiple-choice", "true-false", "identification"];
var AI_QUIZ_QTY_IDS = { "multiple-choice": "ai-qty-multiple-choice", "true-false": "ai-qty-true-false", "identification": "ai-qty-identification" };

function getTOSSelectedLevelsLesson() {
  var nodes = document.querySelectorAll("input.ai-tos-cb:checked");
  return Array.prototype.slice.call(nodes).map(function (el) { return el.value; });
}

function getAIQuizQuestionCountsLesson() {
  const counts = {};
  AI_QUIZ_TYPE_IDS.forEach(function (type) {
    const id = AI_QUIZ_QTY_IDS[type];
    const el = document.getElementById(id);
    const n = el ? Math.max(0, Math.min(20, parseInt(el.value, 10) || 0)) : 0;
    counts[type] = n;
  });
  return counts;
}

function getSelectedAIQuizTypesLesson() {
  const counts = getAIQuizQuestionCountsLesson();
  return AI_QUIZ_TYPE_IDS.filter(function (t) { return counts[t] > 0; });
}

function initAIModalQuizTypeQuantities() {
  if (window._aiQuizTypeQuantitiesInit) return;
  window._aiQuizTypeQuantitiesInit = true;
  AI_QUIZ_TYPE_IDS.forEach(function (type) {
    const qtyId = AI_QUIZ_QTY_IDS[type];
    const cb = document.querySelector(".ai-quiz-type-cb[value=\"" + type + "\"]");
    const input = document.getElementById(qtyId);
    if (!cb || !input) return;
    cb.addEventListener("change", function () {
      if (cb.checked) input.value = Math.max(1, parseInt(input.value, 10) || 0);
      else input.value = "0";
    });
    input.addEventListener("input", function () {
      var n = parseInt(input.value, 10) || 0;
      cb.checked = n > 0;
    });
  });
}

function openAIModalLesson() {
  initAIModalQuizTypeQuantities();
  const modal = document.getElementById("ai-quiz-generator-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.style.opacity = 0;
  loadLessonsAndTopicsForAI();
  let op = 0;
  const fadeIn = setInterval(() => {
    if (op >= 1) {
      clearInterval(fadeIn);
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    }
    modal.style.opacity = op;
    op += 0.1;
  }, 30);
}

function closeAIModalLesson() {
  const modal = document.getElementById("ai-quiz-generator-modal");
  if (!modal) return;
  const passageArea = document.getElementById("ai-generated-passage");
  const container = document.getElementById("ai-questions-container");
  const generatedSection = document.getElementById("ai-generated-section");
  const saveBtn = document.getElementById("ai-save-btn");
  if (passageArea) passageArea.value = "";
  if (container) container.innerHTML = "";
  if (generatedSection) generatedSection.classList.add("hidden");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.style.opacity = 1;
  }
  modal.classList.add("hidden");
}

async function loadLessonsAndTopicsForAI() {
  try {
    const classId = localStorage.getItem("eel_selected_class_id") || (() => {
      const c = JSON.parse(localStorage.getItem("eel_selected_class") || "{}");
      return c?.class_id ?? "";
    })();
    if (!classId) {
      const topicSelect = document.getElementById("ai-topic");
      if (topicSelect) topicSelect.innerHTML = "<option value=''>Select a class first</option>";
      return;
    }
    const topicSelect = document.getElementById("ai-topic");
    if (!topicSelect) return;
    topicSelect.innerHTML = "<option>Loading...</option>";
    const res = await fetch(`http://localhost:3000/api/lessons-with-topics?class_id=${classId}`);
    const data = await res.json();
    if (!Array.isArray(data)) {
      topicSelect.innerHTML = "<option>Error loading topics</option>";
      return;
    }
    if (data.length === 0) {
      topicSelect.innerHTML = "<option>No topics found</option>";
      return;
    }
    topicSelect.innerHTML = "<option value=''>Select a topic</option>";
    data.forEach((lesson) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = lesson.lesson_title;
      (lesson.topics || []).forEach((topic) => {
        const option = document.createElement("option");
        option.value = topic.topic_id;
        option.textContent = topic.topic_title;
        optgroup.appendChild(option);
      });
      topicSelect.appendChild(optgroup);
    });
  } catch (err) {
    console.error("loadLessonsAndTopicsForAI:", err);
    const topicSelect = document.getElementById("ai-topic");
    if (topicSelect) topicSelect.innerHTML = "<option>Error loading topics</option>";
  }
}

async function generateAIQuizLesson() {
  const topicEl = document.getElementById("ai-topic");
  const topicId = topicEl ? String(topicEl.value || "").trim() : "";
  const questionCounts = getAIQuizQuestionCountsLesson();
  const quizTypes = getSelectedAIQuizTypesLesson();
  const totalQuestions = (questionCounts["multiple-choice"] || 0) + (questionCounts["true-false"] || 0) + (questionCounts["identification"] || 0);
  const contextEl = document.getElementById("ai-context");
  const additionalContext = contextEl ? (contextEl.value || "").trim() : "";
  if (!topicId) {
    if (typeof showNotification === "function") showNotification("Please select a topic first.", "warning");
    return;
  }
  if (quizTypes.length === 0 || totalQuestions < 1) {
    if (typeof showNotification === "function") showNotification("Set at least one question type with quantity greater than 0.", "warning");
    return;
  }
  var tosLevels = getTOSSelectedLevelsLesson();
  const btn = document.getElementById("ai-generate-btn");
  const generatedSection = document.getElementById("ai-generated-section");
  const container = document.getElementById("ai-questions-container");
  if (!btn || !generatedSection || !container) return;
  btn.disabled = true;
  btn.innerHTML = "<span>⏳ Generating...</span>";
  const payload = { topic_id: topicId, question_counts: questionCounts, additional_context: additionalContext };
  if (tosLevels.length > 0) payload.tos_levels = tosLevels;
  try {
    const res = await fetch("http://localhost:3000/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      if (typeof showNotification === "function") showNotification("Server returned invalid response. Try again.", "error");
      return;
    }
    if (!res.ok) {
      if (typeof showNotification === "function") showNotification(data.message || "Request failed. Try again.", "error");
      return;
    }
    if (!data.success) {
      if (typeof showNotification === "function") showNotification(data.message || "Generation failed.", "error");
      return;
    }
    const rawQuiz = (data.quiz != null ? String(data.quiz) : "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    generatedSection.classList.remove("hidden");
    if (!rawQuiz) {
      document.getElementById("ai-generated-passage").value = "";
      container.innerHTML = "<p class=\"text-muted-foreground text-sm\">No content was returned. Try again or add more instructions.</p>";
      document.getElementById("ai-save-btn").disabled = true;
      return;
    }
    const passageArea = document.getElementById("ai-generated-passage");
    let passagePart = "";
    let questionBlocks = [];
    const patterns = [
      /\n\s*Question\s*1\s*[:.)]\s*/i, /\n\s*1\s*[.)]\s+/, /^Question\s*1\s*[:.)]\s*/i, /^1\s*[.)]\s+/m,
      /\n\s*Q\s*1\s*[.:)]\s*/i, /\n\s*\(\s*1\s*\)\s+/, /\n\s*#\s*1\s*[.)]\s+/,
    ];
    let firstQuestionIndex = -1;
    let questionsText = rawQuiz;
    for (const re of patterns) {
      const m = rawQuiz.match(re);
      if (m) {
        firstQuestionIndex = rawQuiz.indexOf(m[0]);
        if (firstQuestionIndex >= 0) {
          passagePart = firstQuestionIndex > 0 ? rawQuiz.slice(0, firstQuestionIndex).trim() : "";
          questionsText = rawQuiz.slice(firstQuestionIndex).trim();
          break;
        }
      }
    }
    if (firstQuestionIndex >= 0) {
      questionBlocks = questionsText.split(/\n\s*Question\s*\d+\s*[:.)]\s*|\n\s*(?=\d+\s*[.)]\s+)|\n\s*Q\s*\d+\s*[.:)]\s*/i).filter(Boolean);
      if (questionBlocks.length <= 1 && /Question\s*2|^2\s*[.)]\s+/im.test(questionsText)) {
        questionBlocks = questionsText.split(/\s*Question\s*\d+\s*[:.)]\s*|\n(?=\s*\d+\s*[.)]\s+)/i).filter(Boolean);
      }
    }
    if (questionBlocks.length <= 0) {
      const byQuestion = rawQuiz.split(/(?=Question\s*\d+\s*[:.)])|(?=\n\s*\d+\s*[.)]\s+)/i);
      if (byQuestion.length > 1) {
        passagePart = byQuestion[0].trim();
        questionBlocks = byQuestion.slice(1).map((s) => s.replace(/^(?:Question\s*\d+\s*[:.)]\s*|\d+\s*[.)]\s*)/i, "").trim()).filter(Boolean);
      }
    }
    if (questionBlocks.length <= 0 && /correct\s+answer\s*[:)]|^[A-D]\)\s/mi.test(rawQuiz)) {
      const paragraphs = rawQuiz.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      const blocks = [];
      let passageChunks = [];
      for (const p of paragraphs) {
        const looksLikeQuestion = /correct\s+answer\s*[:)]|^[A-D]\)\s|^\d+\s*[.)]\s+/im.test(p);
        if (looksLikeQuestion) blocks.push(p);
        else if (blocks.length === 0) passageChunks.push(p);
      }
      if (blocks.length > 0) {
        passagePart = passageChunks.join("\n\n").trim();
        questionBlocks = blocks;
      }
    }
    if (questionBlocks.length <= 0 && (/^[A-D]\)\s|Correct\s+answer\s*[:)]/im.test(rawQuiz))) {
      passagePart = "";
      questionBlocks = [rawQuiz];
    }
    passageArea.value = passagePart;
    container.innerHTML = "";
    if (questionBlocks.length === 0) {
      container.innerHTML = "<p class=\"text-muted-foreground text-sm\">No questions were parsed. Edit the passage above and try Regenerate.</p>";
    } else {
      const typeOrder = { "multiple-choice": 0, "true-false": 1, "identification": 2 };
      const parsed = questionBlocks.map((block) => {
        const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
        const questionLines = [];
        for (const line of lines) {
          if (/^[A-D]\)\s/.test(line) || /correct\s+answer\s*[:)]/i.test(line)) break;
          questionLines.push(line);
        }
        let questionText = questionLines.join(" ").replace(/^Question\s*\d+\s*[:.)]\s*/i, "").replace(/^\d+\s*[.)]\s*/, "").trim();
        const choices = {};
        lines.forEach((line) => {
          const match = line.match(/^([A-D])\)\s*(.*)/);
          if (match) choices[match[1]] = match[2];
        });
        const correctMatch = lines.find((l) => /correct\s+answer/i.test(l));
        let correctAnswerText = correctMatch ? correctMatch.replace(/^.*correct\s+answer\s*[:)]\s*/i, "").trim().replace(/[.)]\s*$/, "").trim() : "";
        const correctLetter = correctMatch ? (correctMatch.match(/([A-D])\)/) || correctMatch.match(/[:\s]([A-D])[\s.]*$/i) || correctMatch.match(/\b([A-D])\b/))?.[1]?.toUpperCase() : "";
        const isTrueFalse = /^\s*(true|false)\s*$/i.test(correctAnswerText);
        const isIdentification = correctAnswerText && !/^[A-D]\s*$/i.test(correctAnswerText) && !isTrueFalse;
        const hasFourOptions = choices["A"] || choices["B"] || choices["C"] || choices["D"];
        let questionType = "multiple-choice";
        if (isIdentification && !hasFourOptions) questionType = "identification";
        else if (isTrueFalse && (!hasFourOptions || Object.keys(choices).length <= 2)) questionType = "true-false";
        else if (hasFourOptions) questionType = "multiple-choice";
        else if (isIdentification) questionType = "identification";
        else if (isTrueFalse) questionType = "true-false";
        return { questionType, questionText, choices, correctAnswerText, correctLetter, typeOrder: typeOrder[questionType] ?? 99 };
      });
      parsed.sort((a, b) => a.typeOrder - b.typeOrder);
      var wantMc = Math.max(0, questionCounts["multiple-choice"] || 0);
      var wantTf = Math.max(0, questionCounts["true-false"] || 0);
      var wantId = Math.max(0, questionCounts["identification"] || 0);
      var byType = { "multiple-choice": [], "true-false": [], "identification": [] };
      parsed.forEach(function (q) {
        if (byType[q.questionType]) byType[q.questionType].push(q);
      });
      var mcSlice = (byType["multiple-choice"] || []).slice(0, wantMc);
      var tfSlice = (byType["true-false"] || []).slice(0, wantTf);
      var idSlice = (byType["identification"] || []).slice(0, wantId);
      var fitted = mcSlice.concat(tfSlice, idSlice);
      if (mcSlice.length < wantMc || tfSlice.length < wantTf || idSlice.length < wantId) {
        if (typeof showNotification === "function") showNotification("Generated quiz has fewer questions than requested for some types. You can Regenerate or edit and save.", "warning");
      }
      let globalIndex = 0;
      let lastSection = null;
      const sectionTitles = { "multiple-choice": "Multiple choice", "true-false": "True or False", "identification": "Identification" };
      fitted.forEach((item) => {
        const i = globalIndex++;
        const { questionType, questionText, choices, correctAnswerText, correctLetter } = item;
        if (lastSection !== questionType) {
          lastSection = questionType;
          const sectionHeader = document.createElement("div");
          sectionHeader.className = "ai-quiz-section-header";
          sectionHeader.innerHTML = `<h4 class="ai-quiz-section-title">${sectionTitles[questionType] || questionType}</h4>`;
          container.appendChild(sectionHeader);
        }
        const div = document.createElement("div");
        div.className = "question-item ai-question-item";
        div.dataset.questionType = questionType;
        if (questionType === "identification") {
          div.innerHTML = `
            <div class="ai-question-item__header">
              <h4 class="ai-question-item__title">Question ${i + 1} <span class="ai-question-type-badge">Identification</span></h4>
              <button type="button" class="ai-question-remove-btn" onclick="this.closest('.question-item').remove()">Remove</button>
            </div>
            <input type="text" class="form-input ai-question-input" placeholder="Enter question" value="${escapeHtml(questionText)}">
            <div class="ai-identification-answer">
              <label class="form-label">Correct answer</label>
              <input type="text" class="form-input ai-identification-input" placeholder="One or two words" value="${escapeHtml(correctAnswerText)}">
            </div>`;
        } else if (questionType === "true-false") {
          const correctTF = /^\s*true\s*$/i.test(correctAnswerText) ? "True" : "False";
          div.innerHTML = `
            <div class="ai-question-item__header">
              <h4 class="ai-question-item__title">Question ${i + 1} <span class="ai-question-type-badge">True or False</span></h4>
              <button type="button" class="ai-question-remove-btn" onclick="this.closest('.question-item').remove()">Remove</button>
            </div>
            <input type="text" class="form-input ai-question-input" placeholder="Enter statement" value="${escapeHtml(questionText)}">
            <div class="space-y-2 ai-question-options">
              <div class="ai-question-option-row">
                <input type="radio" name="correct-${i}" ${correctTF === "True" ? "checked" : ""} class="ai-question-radio">
                <input type="text" class="form-input" readonly placeholder="Option" value="True">
              </div>
              <div class="ai-question-option-row">
                <input type="radio" name="correct-${i}" ${correctTF === "False" ? "checked" : ""} class="ai-question-radio">
                <input type="text" class="form-input" readonly placeholder="Option" value="False">
              </div>
            </div>`;
        } else {
          const correctOption = correctLetter || (choices["A"] ? "A" : "");
          div.innerHTML = `
            <div class="ai-question-item__header">
              <h4 class="ai-question-item__title">Question ${i + 1} <span class="ai-question-type-badge">Multiple choice</span></h4>
              <button type="button" class="ai-question-remove-btn" onclick="this.closest('.question-item').remove()">Remove</button>
            </div>
            <input type="text" class="form-input ai-question-input" placeholder="Enter question" value="${escapeHtml(questionText)}">
            <div class="space-y-2 ai-question-options">
              ${["A", "B", "C", "D"].map(
                (letter) => `
                <div class="ai-question-option-row">
                  <input type="radio" name="correct-${i}" ${correctOption === letter ? "checked" : ""} class="ai-question-radio">
                  <input type="text" class="form-input" placeholder="Option ${letter}" value="${escapeHtml(choices[letter] || "")}">
                </div>`
              ).join("")}
            </div>`;
        }
        container.appendChild(div);
      });
    }
    document.getElementById("ai-save-btn").disabled = false;
    document.getElementById("ai-save-btn").style.opacity = 1;
  } catch (err) {
    console.error("generateAIQuizLesson:", err);
    if (typeof showNotification === "function") showNotification(err.message || "Network or server error. Please try again.", "error");
    if (generatedSection) generatedSection.classList.remove("hidden");
    if (container) container.innerHTML = "<p class=\"text-muted-foreground text-sm\">Generation failed. Check your connection and try again.</p>";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "<i data-lucide=\"sparkles\" class=\"size-5\"></i><span>Generate quiz with AI</span>";
    }
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }
}

async function saveAIQuizLesson() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || user.role !== "teacher") {
    if (typeof showNotification === "function") showNotification("You are not authorized to save quizzes.", "error");
    return;
  }
  const topicSelect = document.getElementById("ai-topic");
  const title = topicSelect?.selectedOptions?.[0]?.text?.trim() || "AI Generated Quiz";
  const passageEl = document.getElementById("ai-generated-passage");
  const passage = passageEl ? passageEl.value.trim() : "";
  const container = document.getElementById("ai-questions-container");
  if (!container) return;
  const questionItems = container.querySelectorAll(".ai-question-item");
  if (questionItems.length === 0) {
    if (typeof showNotification === "function") showNotification("Add at least one question or generate a quiz first.", "warning");
    return;
  }
  const questions = [];
  questionItems.forEach((item) => {
    const questionText = (item.querySelector(".ai-question-input")?.value || "").trim();
    const questionType = item.dataset.questionType || "multiple-choice";
    let options = [];
    if (questionType === "multiple-choice") {
      const rows = item.querySelectorAll(".ai-question-option-row");
      const checkedRadio = item.querySelector(".ai-question-radio:checked");
      rows.forEach((row, idx) => {
        const input = row.querySelector('input.form-input[type="text"]');
        const optText = input ? input.value.trim() : "";
        const isCorrect = row.querySelector(".ai-question-radio") === checkedRadio;
        options.push({ option_text: optText || `Option ${idx + 1}`, is_correct: isCorrect });
      });
    } else if (questionType === "true-false") {
      const rows = item.querySelectorAll(".ai-question-option-row");
      const firstRow = rows[0];
      const secondRow = rows[1];
      const trueChecked = firstRow?.querySelector(".ai-question-radio")?.checked;
      options = [
        { option_text: "True", is_correct: !!trueChecked },
        { option_text: "False", is_correct: !!(secondRow?.querySelector(".ai-question-radio")?.checked) },
      ];
    } else if (questionType === "identification") {
      const identInput = item.querySelector(".ai-identification-input");
      const correctText = identInput ? identInput.value.trim() : "";
      options = [
        { option_text: correctText || "(Answer)", is_correct: true },
        { option_text: "(Other)", is_correct: false },
      ];
    }
    questions.push({
      question_text: questionText || "Question",
      question_type: "mcq",
      options: options.length ? options : [{ option_text: "", is_correct: true }],
    });
  });
  const subjectId = getSelectedSubjectIdLesson();
  if (!subjectId) {
    if (typeof showNotification === "function") showNotification("Select a class with a subject first.", "warning");
    return;
  }
  try {
    const res = await fetch("http://localhost:3000/api/teacher/reading-quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        difficulty: "beginner",
        passage: passage || "(No passage)",
        subject_id: subjectId,
        user_id: user.user_id,
        questions,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (typeof showNotification === "function") showNotification(data.message || "Quiz saved.", "success");
      closeAIModalLesson();
      loadLessonsAIGeneratedList();
      switchLessonsView("quizzes");
    } else {
      if (typeof showNotification === "function") showNotification(data.message || "Failed to save quiz.", "error");
    }
  } catch (err) {
    console.error("saveAIQuizLesson:", err);
    if (typeof showNotification === "function") showNotification("Failed to save quiz. Check your connection.", "error");
  }
}
