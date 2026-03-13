document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('class_id');

    if (classId) {
        // Store class ID in localStorage
        localStorage.setItem("eel_selected_class_id", classId);

        // Remove class_id from URL without reloading the page
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    } 
    console.log("Class ID:", classId);
});

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const user = await initializePage();
        
        if (user.role !== 'teacher') {
            window.location.href = 'quiz-take.html';
            return;
        }

        // ✅ Get class ID from localStorage
        const classId = localStorage.getItem("eel_selected_class_id");
        if (!classId) {
            console.error("❌ No class_id found in localStorage.");
            return;
        }

        setupExamGenerator(classId); // pass it to your function
        hideLoading();
        // ✅ Always call after handling class_id
        loadLessonsAndTopics();

        // Back to Classes
        const backBtn = document.getElementById('back-class-btn');
        if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'classes.html');

    } catch (error) {
        console.error('Error initializing page:', error);
        window.location.href = '/';
    }
});

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadLessonsAndTopics() {
  try {
    const classId = localStorage.getItem("eel_selected_class_id");
    if (!classId) return console.error("No class_id found in localStorage");

    const res = await fetch(`${window.API_BASE || ""}/api/lessons-with-topics?class_id=${classId}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Invalid data format:", data);
      return;
    }

    const container = document.getElementById('topicDropdownContainer');
    container.innerHTML = '';

    // Group lessons by quarter (same separation as lessons.html)
    const quarterGroups = [];
    const noQuarter = [];
    data.forEach((lesson) => {
      const qNum = lesson.quarter_number != null ? Number(lesson.quarter_number) : null;
      const qTitle = lesson.quarter_title ? String(lesson.quarter_title).trim() : "";
      if (qNum != null && qNum >= 1 && qNum <= 4) {
        let group = quarterGroups.find((g) => g.quarter_number === qNum);
        if (!group) {
          group = { quarter_number: qNum, quarter_title: qTitle || `Quarter ${qNum}`, lessons: [] };
          quarterGroups.push(group);
        }
        group.lessons.push(lesson);
      } else {
        noQuarter.push(lesson);
      }
    });
    quarterGroups.sort((a, b) => a.quarter_number - b.quarter_number);

    function appendLessonAndTopics(lesson, parentEl) {
      const target = parentEl || container;
      const lessonHeader = document.createElement('div');
      lessonHeader.textContent = lesson.lesson_title;
      lessonHeader.classList.add('exam-topic-lesson-header');

      const topicsDiv = document.createElement('div');
      topicsDiv.style.display = 'none';
      topicsDiv.classList.add('exam-topic-topics');

      (lesson.topics || []).forEach(topic => {
        const label = document.createElement('label');
        label.classList.add('exam-topic-option');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = topic.topic_id;
        checkbox.name = 'topics';
        checkbox.classList.add('exam-topic-checkbox');
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(topic.topic_title));
        topicsDiv.appendChild(label);
      });

      lessonHeader.addEventListener('click', () => {
        topicsDiv.style.display = topicsDiv.style.display === 'none' ? 'block' : 'none';
      });

      target.appendChild(lessonHeader);
      target.appendChild(topicsDiv);
    }

    function syncQuarterCheckbox(quarterBlock) {
      const quarterCheckbox = quarterBlock.querySelector('.exam-quarter-checkbox');
      const topicCheckboxes = quarterBlock.querySelectorAll('input[name="topics"]');
      if (!quarterCheckbox || topicCheckboxes.length === 0) return;
      const checkedCount = Array.from(topicCheckboxes).filter(cb => cb.checked).length;
      quarterCheckbox.checked = checkedCount === topicCheckboxes.length;
      quarterCheckbox.indeterminate = checkedCount > 0 && checkedCount < topicCheckboxes.length;
    }

    quarterGroups.forEach((group) => {
      const quarterBlock = document.createElement('div');
      quarterBlock.className = 'exam-quarter-block';

      const quarterHeading = document.createElement('div');
      quarterHeading.className = 'lesson-quarter-heading lesson-quarter-heading--with-checkbox';
      quarterHeading.innerHTML = `
        <label class="lesson-quarter-heading__checkbox-wrap">
          <input type="checkbox" class="exam-quarter-checkbox" aria-label="Select all topics in Quarter ${group.quarter_number}">
        </label>
        <span class="lesson-quarter-heading__badge">Quarter ${group.quarter_number}</span>
        <span class="lesson-quarter-heading__title">${escapeHtml(group.quarter_title)}</span>
      `;
      quarterBlock.appendChild(quarterHeading);

      const quarterCb = quarterHeading.querySelector('.exam-quarter-checkbox');
      quarterCb.addEventListener('change', () => {
        const topicCheckboxes = quarterBlock.querySelectorAll('input[name="topics"]');
        topicCheckboxes.forEach(cb => { cb.checked = quarterCb.checked; });
        quarterCb.indeterminate = false;
      });

      group.lessons.forEach(lesson => appendLessonAndTopics(lesson, quarterBlock));

      quarterBlock.querySelectorAll('input[name="topics"]').forEach(topicCb => {
        topicCb.addEventListener('change', () => syncQuarterCheckbox(quarterBlock));
      });

      container.appendChild(quarterBlock);
    });
    noQuarter.forEach(lesson => appendLessonAndTopics(lesson));
  } catch (err) {
    console.error('Error loading lessons and topics:', err);
  }
}

function getSelectedTopics() {
  const checkboxes = document.querySelectorAll('input[name="topics"]:checked');
  return Array.from(checkboxes).map(cb => cb.nextSibling.textContent.trim());
}

function getTOSSelectedLevelsExam() {
  const nodes = document.querySelectorAll('input[name="exam-tos-level"].ai-tos-cb:checked');
  return Array.from(nodes).map((el) => String(el.value || "").trim()).filter(Boolean);
}

// Toggle Topic/Text input
const methodRadios = document.querySelectorAll('input[name="method"]');
const topicInput = document.getElementById('topic-input');
const textInput = document.getElementById('text-input');

methodRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'topic') {
      topicInput.classList.remove('hidden');
      textInput.classList.add('hidden');
    } else {
      topicInput.classList.add('hidden');
      textInput.classList.remove('hidden');
    }
  });
});

// Enable/disable count inputs based on checkbox
const questionTypeCheckboxes = document.querySelectorAll('input[name="questionTypes"]');

questionTypeCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('change', (e) => {
    const type = e.target.value;
    const countInput = document.getElementById(`count-${type}`);
    if (countInput) {
      countInput.disabled = !e.target.checked;
      if (!e.target.checked) countInput.value = '';
    }
  });
});

function setupExamGenerator() {
  const generateBtn = document.getElementById("generateExamBtn");
  const textInputDiv = document.getElementById("text-input");

  if (!generateBtn) {
    console.error("⚠️ Generate Exam button not found!");
    return;
  }

  generateBtn.addEventListener("click", async () => {
    const methodInput = document.querySelector('input[name="method"]:checked');
    if (!methodInput) {
      if (typeof Swal !== "undefined") {
        Swal.fire({ icon: "warning", title: "No method selected", text: "Please select a generation method (Topic or Text).", confirmButtonColor: "#3085d6" });
      } else alert("Please select a generation method (Topic or Text).");
      return;
    }

    const method = methodInput.value;
    const selectedTopics = getSelectedTopics();
    const tosLevels = getTOSSelectedLevelsExam();
    const textArea = textInputDiv?.querySelector("textarea");
    const text = textArea ? textArea.value.trim() : "";

    // ✅ Collect selected question types + counts
    const questionTypes = Array.from(
      document.querySelectorAll('input[name="questionTypes"]:checked')
    ).map(cb => {
      const type = cb.value;
      const countInput = document.getElementById(`count-${type}`);
      const count = countInput ? parseInt(countInput.value) || 0 : 0;
      return { type, count };
    });

    // ✅ Validation
    if (method === "topic" && selectedTopics.length === 0) {
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "warning",
          title: "No topic selected",
          text: "Please select at least one topic to generate the exam.",
          confirmButtonColor: "#3085d6"
        });
      } else {
        alert("Please select at least one topic.");
      }
      return;
    }
    if (method === "text" && !text) {
      if (typeof Swal !== "undefined") {
        Swal.fire({ icon: "warning", title: "No content", text: "Please enter text content to generate the exam.", confirmButtonColor: "#3085d6" });
      } else alert("Please enter text content.");
      return;
    }
    if (questionTypes.length === 0) {
      if (typeof Swal !== "undefined") {
        Swal.fire({ icon: "warning", title: "No question type selected", text: "Please select at least one question type and quantity.", confirmButtonColor: "#3085d6" });
      } else alert("Please select at least one question type.");
      return;
    }

    // 🧭 Disable button + show spinner
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<i data-lucide="loader" class="size-4 mr-2 animate-spin"></i> Generating...`;

    // 📘 Get subject
    const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
    let subject = selectedClass ? selectedClass.subject : "Unknown Subject";
    subject = subject.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

    const examTitleInput = document.getElementById("exam-title-input");
    const examTitle = examTitleInput ? examTitleInput.value.trim() : "";

    // ✅ Prepare data for backend
    const bodyData = {
      subject,
      selectedTopics,
      content: method === "topic" ? selectedTopics.join(", ") : text,
      questionTypes,
    };
    if (tosLevels.length > 0) bodyData.tos_levels = tosLevels;
    if (examTitle) bodyData.title = examTitle;

    try {
      const res = await fetch((window.API_BASE || "") + "/api/generate-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (data.exam) {
        // ❌ Removed auto-save here
        // ✅ Show preview first (edit/save manually)
        showExamPreview(data.exam, subject, selectedTopics, questionTypes, examTitle);
        showNotification("✅ Exam successfully generated! You can edit and save it now.");
      } else {
        showNotification("⚠️ Failed to generate exam.");
      }
    } catch (err) {
      console.error("❌ Error generating exam:", err);
      showNotification("Error generating exam.");
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `<i data-lucide="brain" class="size-4 mr-2"></i> Generate Exam with AI`;
      lucide.createIcons({ icons: lucide.icons });
    }
  });
}

// ✅ Show generated exam with Edit/Save logic
function showExamPreview(examText, subject, selectedTopics, questionTypes, examTitle) {
  const container = document.getElementById("generatedExamContainer");
  const content = document.getElementById("generatedExamContent");
  const editBtn = document.getElementById("editExamBtn");
  const saveBtn = document.getElementById("saveExamBtn");

  if (!container || !content) {
    console.error("❌ Exam preview container not found!");
    return;
  }

  const displayTitle = (examTitle && examTitle.trim()) ? examTitle.trim() : `${subject} – Examination`;

  // ✅ Professional exam document – paper-style, export-ready layout
  const headerHTML = `
    <header class="exam-doc-header">
      <div class="exam-doc-logo">
        <img src="../image/school-logo.png" alt="School Logo" class="exam-doc-logo-img">
      </div>
      <p class="exam-doc-agency">Republic of the Philippines<br>Department of Education<br>Region III – Central Luzon<br>Schools Division of Bulacan</p>
      <p class="exam-doc-school">NORZAGARAY NATIONAL HIGH SCHOOL</p>
      <p class="exam-doc-address">A. Villarama St., Poblacion, Norzagaray, Bulacan</p>
      <hr class="exam-doc-rule">
      <h1 class="exam-doc-title">${displayTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h1>
      <div class="exam-doc-meta">
        <div class="exam-doc-meta-row">
          <span class="exam-doc-meta-label">Name:</span>
          <span class="exam-doc-meta-line"></span>
          <span class="exam-doc-meta-label">Date:</span>
          <span class="exam-doc-meta-line exam-doc-meta-short"></span>
          <span class="exam-doc-meta-label">Score:</span>
          <span class="exam-doc-meta-line exam-doc-meta-score"></span>
        </div>
        <div class="exam-doc-meta-row">
          <span class="exam-doc-meta-label">Grade Level / Section:</span>
          <span class="exam-doc-meta-line"></span>
          <span class="exam-doc-meta-label">Teacher:</span>
          <span class="exam-doc-meta-line exam-doc-meta-short"></span>
        </div>
      </div>
    </header>
  `;

  const footerHTML = `
    <footer class="exam-doc-footer">
      <hr class="exam-doc-rule exam-doc-rule-footer">
      <p class="exam-doc-footer-text">— End of Examination —</p>
    </footer>
  `;

  const finalHTML = `
    <article class="exam-document">
      ${headerHTML}
      <div id="exam-body" class="exam-doc-body">${examText}</div>
      ${footerHTML}
    </article>
  `;

  // ✅ Use innerHTML (not textContent) to preserve formatting
  container.classList.remove("hidden");
  content.innerHTML = finalHTML;
  container.scrollIntoView({ behavior: "smooth" });

  // Default state
  content.contentEditable = "false";
  saveBtn.disabled = true;
  saveBtn.classList.add("opacity-50", "cursor-not-allowed");

  // ✏️ Edit button logic
  editBtn.onclick = () => {
    const examBody = document.getElementById("exam-body");
    if (content.isContentEditable) {
      examBody.contentEditable = "false";
      editBtn.textContent = "✏️ Edit";
      saveBtn.disabled = true;
      saveBtn.classList.add("opacity-50", "cursor-not-allowed");
      showNotification("✏️ Edit mode disabled.");
    } else {
      examBody.contentEditable = "true";
      examBody.focus();
      editBtn.textContent = "❌ Cancel Edit";
      saveBtn.disabled = false;
      saveBtn.classList.remove("opacity-50", "cursor-not-allowed");
      showNotification("📝 Edit mode enabled — you can now modify the exam.");
    }
  };

  saveBtn.onclick = async () => {
    const updatedContent = content.textContent.trim();

    // ✅ Get current teacher ID
    const currentUser = JSON.parse(localStorage.getItem("eel_user") || "{}");
    const currentTeacherId = currentUser.user_id;

    if (!currentTeacherId) {
      showNotification("⚠️ User not logged in. Cannot save exam.", "error");
      return;
    }

    // ✅ Use same source of truth as loadExams so we save to the current class (not a stale one)
    const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class") || "{}");
    const classId = localStorage.getItem("eel_selected_class_id") || selectedClass?.id;
    if (!classId) {
      showNotification("⚠️ Please select a class/section before saving.", "error");
      return;
    }

    try {
      const examTitleEl = document.getElementById("exam-title-input");
      const saveTitle = (examTitleEl && examTitleEl.value.trim()) || selectedTopics.join(", ") || "AI Generated Exam";

      const res = await fetch((window.API_BASE || "") + "/api/save-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: classId,
          title: saveTitle,
          content: updatedContent,
          question_count: questionTypes.reduce((sum, q) => sum + q.count, 0),
          types: questionTypes.map(q => `${q.type} (${q.count})`).join(", "),
          created_by: currentTeacherId
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showNotification("💾 Exam saved successfully!");
        loadExams();

        // Disable edit mode
        content.contentEditable = "false";
        editBtn.textContent = "✏️ Edit";
        saveBtn.disabled = true;
        saveBtn.classList.add("opacity-50", "cursor-not-allowed");

        container.style.transition = "opacity 0.5s ease";
        container.style.opacity = "0";

        setTimeout(() => {
          container.classList.add("hidden");
          container.style.opacity = "1";
          content.textContent = "";
        }, 500);
      } else {
        showNotification(result.error || "⚠️ Failed to save exam.", "error");
      }
    } catch (err) {
      console.error("❌ Error saving exam:", err);
      showNotification("Error saving exam.", "error");
    }
  };
}

const EXAM_LIST_VIEW_KEY = "eel_exam_list_view";

function setupExamListViewToggle() {
  const container = document.getElementById("exam-list");
  const btnList = document.querySelector(".exam-list-view-btn[data-view='list']");
  const btnGrid = document.querySelector(".exam-list-view-btn[data-view='grid']");
  if (!container || !btnList || !btnGrid) return;

  const saved = (localStorage.getItem(EXAM_LIST_VIEW_KEY) || "list").toLowerCase();
  const isList = saved !== "grid";

  function setView(listView) {
    container.classList.remove("exam-list-view-list", "exam-list-view-grid");
    container.classList.add(listView ? "exam-list-view-list" : "exam-list-view-grid");
    btnList.classList.toggle("active", listView);
    btnList.setAttribute("aria-pressed", listView ? "true" : "false");
    btnGrid.classList.toggle("active", !listView);
    btnGrid.setAttribute("aria-pressed", !listView ? "true" : "false");
    localStorage.setItem(EXAM_LIST_VIEW_KEY, listView ? "list" : "grid");
  }

  setView(isList);

  btnList.addEventListener("click", () => setView(true));
  btnGrid.addEventListener("click", () => setView(false));
}

// ✅ Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadLessonsAndTopics();
  setupExamGenerator();
  loadExams();
  setupExamListViewToggle();
});

async function loadExams() {
  try {
    const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class") || "{}");
    const classId = localStorage.getItem("eel_selected_class_id") || selectedClass?.id;
    if (!classId) {
      const examListContainer = document.getElementById("exam-list");
      if (examListContainer) examListContainer.innerHTML = '<p class="empty-state">Select a class to view exams.</p>';
      return;
    }

    const res = await fetch(`${window.API_BASE || ""}/api/get-exams?class_id=${classId}`);
    const data = await res.json();
    const exams = data.exams;

    const examListContainer = document.getElementById("exam-list");
    examListContainer.innerHTML = "";

    if (!exams || exams.length === 0) {
      examListContainer.innerHTML = '<p class="empty-state">No exams yet. Generate an exam above and save it to see it here.</p>';
      return;
    }

    exams.forEach(exam => {
      const examCard = document.createElement("div");
      examCard.dataset.id = exam.id;
      examCard.className = "exam-list-card";

      examCard.innerHTML = `
        <div class="exam-list-card-top">
          <div class="exam-list-card-header-row">
            <span class="exam-list-card-badge">${capitalizeWords(exam.subject_name)}</span>
            <div class="exam-list-card-menu-wrap">
              <button type="button" class="exam-list-card-menu-btn" aria-label="More options">
                <i data-lucide="more-vertical" class="size-4"></i>
              </button>
              <div class="exam-list-card-dropdown hidden">
                <button type="button" class="exam-list-card-archive-option">
                  <i data-lucide="archive" class="size-4"></i>
                  Archive
                </button>
              </div>
            </div>
          </div>
          <h4 class="exam-list-card-title">${(exam.title || 'Untitled Exam').replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h4>
          <p class="exam-list-card-meta">
            <span>Class: <strong>${exam.class_name} – ${exam.class_section}</strong></span>
            <span>Questions: <strong>${exam.question_count}</strong></span>
            <span>Created: <strong>${new Date(exam.created_at).toLocaleDateString()}</strong></span>
          </p>
        </div>
        <div class="exam-list-card-actions">
          <button type="button" class="export-btn exam-list-export-btn" title="Export to Excel">
            <i data-lucide="download" class="size-4"></i>
            Export
          </button>
        </div>
      `;

      examListContainer.appendChild(examCard);
    });

    lucide.createIcons({ icons: lucide.icons });

    // Single delegation (no duplicate listeners)
    if (!examListContainer._examDelegationBound) {
      examListContainer._examDelegationBound = true;

      // Handle clicks on export, menu, archive option
      examListContainer.addEventListener("click", (e) => {
        const card = e.target.closest(".exam-list-card");
        if (!card) return;
        const examId = card.dataset.id;

        const menuBtn = e.target.closest(".exam-list-card-menu-btn");
        if (menuBtn) {
          e.preventDefault();
          const wrap = card.querySelector(".exam-list-card-menu-wrap");
          const dropdown = wrap && wrap.querySelector(".exam-list-card-dropdown");
          const isOpen = dropdown && !dropdown.classList.contains("hidden");
          document.querySelectorAll(".exam-list-card-dropdown").forEach(d => d.classList.add("hidden"));
          if (dropdown && !isOpen) dropdown.classList.remove("hidden");
          return;
        }

        const archiveBtn = e.target.closest(".exam-list-card-archive-option");
        if (archiveBtn) {
          e.preventDefault();
          document.querySelectorAll(".exam-list-card-dropdown").forEach(d => d.classList.add("hidden"));
          confirmArchiveExam(examId);
          return;
        }

        if (e.target.closest(".export-btn")) {
          exportExamExcel(examId);
        }
      });

      // Close dropdown when clicking outside any menu
      if (!document._examListMenuOutsideBound) {
        document._examListMenuOutsideBound = true;
        document.addEventListener("click", (e) => {
          if (!e.target.closest(".exam-list-card-menu-wrap")) {
            document.querySelectorAll(".exam-list-card-dropdown").forEach(d => d.classList.add("hidden"));
          }
        });
      }
    }
  } catch (err) {
    console.error("Failed to load exams:", err);
  }
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

// ✅ Export Excel function (no modules, fully browser compatible)
async function exportExamExcel(id) {
  const res = await fetch(`${window.API_BASE || ""}/api/get-exam-content/${id}`);
  const data = await res.json();
  if (!data.success) return alert("Failed to fetch exam content.");

  const rows = data.content.split("\n").map(line => [line]); // each line in a row
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Exam");
  XLSX.writeFile(wb, `exam-${id}.xlsx`);
}

// ✅ Confirm archive with SweetAlert, then move exam to cache
function confirmArchiveExam(id) {
  if (typeof Swal === "undefined" || !Swal.fire) {
    if (window.confirm("Archive this exam? It will be moved to the archive and removed from the exam list.")) {
      moveExamToCache(id);
    }
    return;
  }
  Swal.fire({
    title: "Archive exam?",
    text: "This exam will be moved to the archive and removed from the exam list. You can view it later in Quiz & Exam Archive.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Archive",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280"
  }).then((result) => {
    if (result.isConfirmed) moveExamToCache(id);
  });
}

// ✅ Move exam to cache (archive) and refresh list
function moveExamToCache(id) {
  const user = JSON.parse(localStorage.getItem("eel_user") || "{}");
  const createdBy = user.user_id || 0;

  fetch(`${window.API_BASE || ""}/api/move-exam-to-cache/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ created_by: createdBy })
  })
    .then(async res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success) {
        showNotification(data.message || "Exam archived successfully.", "success");
        loadExams();
      } else {
        showNotification(data.message || "Failed to archive exam.");
      }
    })
    .catch(err => {
      console.error("Error archiving exam:", err);
      showNotification("Something went wrong while archiving the exam.");
    });
}
