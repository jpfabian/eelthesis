document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('class_id') || localStorage.getItem("eel_selected_class_id");

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

  let examGenerating = false;
  generateBtn.addEventListener("click", async () => {
    if (examGenerating) return;
    examGenerating = true;
    const methodInput = document.querySelector('input[name="method"]:checked');
    if (!methodInput) {
      if (typeof Swal !== "undefined") {
        Swal.fire({ icon: "warning", title: "No method selected", text: "Please select a generation method (Topic or Text).", confirmButtonColor: "#3085d6" });
      } else alert("Please select a generation method (Topic or Text).");
      examGenerating = false;
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
      examGenerating = false;
      return;
    }
    if (method === "text" && !text) {
      if (typeof Swal !== "undefined") {
        Swal.fire({ icon: "warning", title: "No content", text: "Please enter text content to generate the exam.", confirmButtonColor: "#3085d6" });
      } else alert("Please enter text content.");
      examGenerating = false;
      return;
    }
    if (questionTypes.length === 0) {
      if (typeof Swal !== "undefined") {
        Swal.fire({ icon: "warning", title: "No question type selected", text: "Please select at least one question type and quantity.", confirmButtonColor: "#3085d6" });
      } else alert("Please select at least one question type.");
      examGenerating = false;
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

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Server error generating exam:", res.status, errorText);
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      if (data.exam) {
        // ✅ Clean up extra blank lines before question numbers if they persist
        const cleanedExam = data.exam.replace(/(\n)\s*\n+(\s*____\s*\d+\.)/g, "$1$2");
        
        // ❌ Removed auto-save here
        // ✅ Show preview first (edit/save manually)
        showExamPreview(cleanedExam, subject, selectedTopics, questionTypes, examTitle);
        showNotification("✅ Exam successfully generated! You can edit and save it now.");
      } else {
        showNotification("⚠️ Failed to generate exam.");
      }
    } catch (err) {
      console.error("❌ Error generating exam:", err);
      if (err.message.includes("504")) {
        showNotification("⚠️ The server timed out. Please try again with fewer questions or simpler topics.", "error");
      } else {
        showNotification("Error generating exam.");
      }
    } finally {
      examGenerating = false;
      generateBtn.disabled = false;
      generateBtn.innerHTML = `<i data-lucide="brain" class="size-4 mr-2"></i> Generate Exam with AI`;
      lucide.createIcons({ icons: lucide.icons });
    }
  });
}

// ✅ Helper to generate unified professional exam HTML (used for both preview and export)
function generateProfessionalExamHTML(examText, subject, displayTitle, options = {}) {
  const isPDF = options.isPDF || false;
  const isWord = options.isWord || false;
  const returnParts = options.returnParts || false;
  const esc = (s) => String(s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  // Clean up any AI-generated headers or footers that might duplicate our layout
  let cleanedText = stripDuplicateHeaderFromExamContent(examText);
  cleanedText = stripDuplicateFooterFromExamContent(cleanedText);

  // For PDF, we use the two-column formatter. For preview, we use it too to match design.
  const bodyContent = formatExamContentForPDF(cleanedText, { isWord });

  // Base URL for images in Word/PDF
  const base = new URL("./", window.location.href).href;
  const logoUrl = new URL("image/exam-logo.png", base).href;
  const depedLogoUrl = new URL("image/deped-logo.png", base).href;
  const schoolLogoUrl = new URL("image/school-logo.png", base).href;

  // Separate School Header (for Word Header) from Exam Title/Meta
  const schoolHeaderHTML = isWord ? `
    <div style="text-align:center;">
      <table border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%; border-collapse:collapse;">
        <tr>
          <td align="center">
            <img src="${logoUrl}" width="80" height="80" style="width:80px;height:80px;">
          </td>
        </tr>
      </table>
      <div style="margin-top:8px;line-height:1.1;">
        <p style="font-family:'Old English Text MT', 'Cloister Black', serif; font-size:10pt !important; margin:0;">Republic of the Philippines</p>
        <p style="font-family:'Old English Text MT', 'Cloister Black', serif; font-size:10pt !important; font-weight:700; margin:0;">Department of Education</p>
        <p style="font-size:10pt !important; text-transform:uppercase; margin:0; letter-spacing:0.05em; font-weight:500; color:#333;">Region III – Central Luzon</p>
        <p style="font-size:10pt !important; text-transform:uppercase; margin:0; letter-spacing:0.05em; font-weight:500; color:#333;">Schools Division of Bulacan</p>
      </div>
      <p style="font-size:10pt !important;font-weight:800;margin:4px 0 0 0;color:#111;text-transform:uppercase;">NORZAGARAY NATIONAL HIGH SCHOOL</p>
      <p style="font-size:10pt !important;margin:0 0 8px 0;color:#555;">A. Villarama St., Poblacion, Norzagaray, Bulacan</p>
      <div style="border-top:1.5pt solid #333; margin:8px 0;"></div>
    </div>
  ` : `
    <div class="exam-doc-school-header" style="text-align:center;">
      <div class="exam-doc-logo" style="display:flex;justify-content:center;margin-bottom:8px;">
        <img src="image/exam-logo.png" alt="School Logo" style="width:80px;height:80px;object-fit:contain;">
      </div>
      <div class="exam-doc-agency-wrap" style="margin-bottom:4px;line-height:1.1;">
        <p class="exam-doc-agency-republic" style="font-family:'Old English Text MT', 'Cloister Black', serif; font-size:10pt !important; margin:0;">Republic of the Philippines</p>
        <p class="exam-doc-agency-deped" style="font-family:'Old English Text MT', 'Cloister Black', serif; font-size:10pt !important; font-weight:700; margin:0;">Department of Education</p>
        <p class="exam-doc-agency-region" style="font-size:10pt !important; text-transform:uppercase; margin:0; letter-spacing:0.05em; font-weight:500; color:#333;">Region III – Central Luzon</p>
        <p class="exam-doc-agency-division" style="font-size:10pt !important; text-transform:uppercase; margin:0; letter-spacing:0.05em; font-weight:500; color:#333;">Schools Division of Bulacan</p>
      </div>
      <p class="exam-doc-school" style="font-size:10pt !important;font-weight:800;margin:4px 0 0 0;color:#111;text-transform:uppercase;">NORZAGARAY NATIONAL HIGH SCHOOL</p>
      <p class="exam-doc-address" style="font-size:10pt !important;margin:0 0 8px 0;color:#555;">A. Villarama St., Poblacion, Norzagaray, Bulacan</p>
      <hr class="exam-doc-rule" style="width:100%;margin:8px 0;border:none;border-top:1.5px solid #333;">
    </div>
  `;

  const examMetaHTML = isWord ? `
    <div style="margin:8px 0 16px 0;line-height:1.2;text-align:center;">
      <h2 style="font-size:10pt !important; font-weight:800; margin:0; letter-spacing:0.05em; text-transform:uppercase;">${subject.toUpperCase()}</h2>
      <h1 style="font-size:10pt !important; font-weight:700; margin:4px 0 0 0; letter-spacing:0.02em; text-transform:uppercase;">${displayTitle.toUpperCase()}</h1>
    </div>
    <table border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%; border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;">
      <tr style="height:25pt; mso-height-rule:exactly;">
        <td width="10%" valign="bottom" style="font-weight:700; font-size:10pt !important; padding:0; line-height:1;">Name:</td>
        <td width="35%" valign="bottom" style="border-bottom:1.0pt solid black; padding:0; line-height:1;">&nbsp;</td>
        <td width="10%" valign="bottom" style="font-weight:700; font-size:10pt !important; padding:0 0 0 15pt; line-height:1;">Date:</td>
        <td width="20%" valign="bottom" style="border-bottom:1.0pt solid black; padding:0; line-height:1;">&nbsp;</td>
        <td width="10%" valign="bottom" style="font-weight:700; font-size:10pt !important; padding:0 0 0 15pt; line-height:1;">Score:</td>
        <td width="15%" valign="bottom" style="border-bottom:1.0pt solid black; padding:0; line-height:1;">&nbsp;</td>
      </tr>
      <tr style="height:25pt; mso-height-rule:exactly;">
        <td width="15%" valign="bottom" style="font-weight:700; font-size:10pt !important; padding:0; line-height:1;">Grade & Sec:</td>
        <td width="30%" valign="bottom" style="border-bottom:1.0pt solid black; padding:0; line-height:1;">&nbsp;</td>
        <td width="12%" valign="bottom" style="font-weight:700; font-size:10pt !important; padding:0 0 0 15pt; line-height:1;">Teacher:</td>
        <td colspan="3" valign="bottom" style="border-bottom:1.0pt solid black; padding:0; line-height:1;">&nbsp;</td>
      </tr>
    </table>
  ` : `
    <div class="exam-doc-title-wrap" style="margin:8px 0 16px 0;line-height:1.2;text-align:center;">
      <h2 class="exam-doc-subject" style="font-size:10pt !important; font-weight:800; margin:0; letter-spacing:0.05em; text-transform:uppercase;">${subject.toUpperCase()}</h2>
      <h1 class="exam-doc-title" style="font-size:10pt !important; font-weight:700; margin:4px 0 0 0; letter-spacing:0.02em; text-transform:uppercase;">${displayTitle.toUpperCase()}</h1>
    </div>
    <div class="exam-doc-meta" style="font-size:10pt !important;margin-bottom:20px;text-align:left;color:#333;">
      <div class="exam-doc-meta-row" style="display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        <span class="exam-doc-meta-label" style="font-weight:700;font-size:10pt !important;">Name:</span>
        <span class="exam-doc-meta-line" style="flex:1;min-width:150px;border-bottom:1px solid #333;"></span>
        <span class="exam-doc-meta-label" style="font-weight:700;font-size:10pt !important;margin-left:15px;">Date:</span>
        <span class="exam-doc-meta-line" style="width:100px;border-bottom:1px solid #333;"></span>
        <span class="exam-doc-meta-label" style="font-weight:700;font-size:10pt !important;margin-left:15px;">Score:</span>
        <span class="exam-doc-meta-line" style="width:50px;border-bottom:1px solid #333;"></span>
      </div>
      <div class="exam-doc-meta-row" style="display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;">
        <span class="exam-doc-meta-label" style="font-weight:700;font-size:10pt !important;">Grade & Sec:</span>
        <span class="exam-doc-meta-line" style="flex:1;min-width:150px;border-bottom:1px solid #333;"></span>
        <span class="exam-doc-meta-label" style="font-weight:700;font-size:10pt !important;margin-left:15px;">Teacher:</span>
        <span class="exam-doc-meta-line" style="flex:1;min-width:150px;border-bottom:1px solid #333;"></span>
      </div>
    </div>
  `;

  const footerHTML = isWord ? `
    <div style="margin-top:20px;">
      <div style="border-top:1pt solid #333; border-bottom:1pt solid #333; height:3px; margin-bottom:12px;"></div>
      <table border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%; border-collapse:collapse;">
        <tr>
          <td width="120">
            <img src="${depedLogoUrl}" width="40" height="40" style="margin-right:8px;">
            <img src="${schoolLogoUrl}" width="40" height="40">
          </td>
          <td align="right" style="font-size:9pt !important; color:#555; line-height:1.3;">
            <p style="margin:0;"><strong>Address:</strong> A. Villarama St., Poblacion, Norzagaray, Bulacan</p>
            <p style="margin:2px 0 0 0;"><strong>Contact No.:</strong> (044) 913-1110 | <strong>E-mail:</strong> 300760@deped.gov.ph</p>
          </td>
        </tr>
      </table>
    </div>
  ` : `
    <footer class="exam-doc-footer" style="margin-top:40px;padding-top:16px;">
      <div class="exam-doc-rule-double" style="width:100%;height:3px;border-top:1px solid #333;border-bottom:1px solid #333;margin-bottom:16px;"></div>
      <div class="exam-doc-footer-content" style="display:flex;align-items:center;justify-content:space-between;gap:20px;">
        <div class="exam-doc-footer-logos" style="display:flex;align-items:center;gap:12px;">
          <img src="image/deped-logo.png" alt="DepEd Logo" class="exam-doc-footer-logo" style="width:45px;height:45px;object-fit:contain;">
          <img src="image/school-logo.png" alt="School Logo" class="exam-doc-footer-logo" style="width:45px;height:45px;object-fit:contain;">
        </div>
        <div class="exam-doc-footer-info" style="text-align:right;font-size:10pt !important;color:#555;line-height:1.4;">
          <p class="exam-doc-footer-info-line" style="margin:0;font-size:10pt !important;"><strong>Address:</strong> A. Villarama St., Poblacion, Norzagaray, Bulacan</p>
          <p class="exam-doc-footer-info-line" style="margin:2px 0 0 0;font-size:10pt !important;"><strong>Contact No.:</strong> (044) 913-1110 | <strong>E-mail:</strong> 300760@deped.gov.ph / nnhs.bulacan@gmail.com</p>
        </div>
      </div>
    </footer>
  `;

  const bodyHTML = `
    <div id="exam-body" class="exam-pdf-body" style="font-size:10pt !important;line-height:1.5;color:#1a1a1a;">
      ${bodyContent}
    </div>
  `;

  const bodyStyles = `
    .exam-pdf-section-title{font-weight:700;margin:12px 0 4px 0;font-size:10pt !important;}
    .exam-pdf-direction{text-align:center;margin:0 0 12px 0;font-size:10pt !important;}
    .exam-pdf-item{margin-bottom:10px;page-break-inside:avoid;}
    .exam-pdf-question{margin-bottom:4px;text-align:left;font-size:10pt !important;}
    .exam-pdf-options-row{display:flex;justify-content:space-between;gap:24px;margin-bottom:2px;padding-left:20px;font-size:10pt !important;}
    .exam-pdf-opt{flex:1;min-width:0;font-size:10pt !important;}
    .exam-pdf-block{white-space:pre-wrap;margin-bottom:8px;font-size:10pt !important;}
  `;

  if (returnParts) {
    return {
      header: schoolHeaderHTML,
      meta: examMetaHTML,
      body: bodyHTML,
      footer: footerHTML,
      styles: bodyStyles
    };
  }

  return `
    <article class="exam-document" style="background:#fff;color:#1a1a1a;font-size:10pt !important;${isPDF ? '' : 'padding:20px 40px;'}">
      <style>${bodyStyles}</style>
      ${schoolHeaderHTML}
      ${examMetaHTML}
      ${bodyHTML}
      ${footerHTML}
    </article>
  `;
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

  // ✅ Use unified helper for identical preview/export design
  const finalHTML = generateProfessionalExamHTML(examText, subject, displayTitle, { isPDF: false });

  // ✅ Use innerHTML (not textContent) to preserve formatting
  container.classList.remove("hidden");
  content.innerHTML = finalHTML;
  container.scrollIntoView({ behavior: "smooth" });

  // Default state (Save is enabled by default)
  content.contentEditable = "false";
  saveBtn.disabled = false;
  saveBtn.classList.remove("opacity-50", "cursor-not-allowed");

  // ✏️ Edit button logic
  editBtn.onclick = () => {
    const examBody = document.getElementById("exam-body");
    if (!examBody) return;

    if (examBody.contentEditable === "true") {
      examBody.contentEditable = "false";
      editBtn.innerHTML = `<i data-lucide="edit-3" class="size-5"></i> <span>Edit Exam</span>`;
      editBtn.classList.remove("btn-exam-cancel");
      lucide.createIcons({ icons: lucide.icons });
      showNotification("✏️ Edit mode disabled.");
    } else {
      examBody.contentEditable = "true";
      examBody.focus();
      editBtn.innerHTML = `<i data-lucide="x" class="size-5"></i> <span>Cancel Edit</span>`;
      editBtn.classList.add("btn-exam-cancel");
      lucide.createIcons({ icons: lucide.icons });
      showNotification("📝 Edit mode enabled — you can now modify the exam.");
    }
  };

  let examSaving = false;
  saveBtn.onclick = async () => {
    if (examSaving) return;
    examSaving = true;
    
    // ✨ Engaging loading state
    saveBtn.disabled = true;
    const originalContent = saveBtn.innerHTML;
    saveBtn.innerHTML = `<i data-lucide="loader-2" class="size-5 animate-spin-custom"></i> <span>Saving...</span>`;
    lucide.createIcons({ icons: lucide.icons });

    const updatedContent = content.textContent.trim();

    // ✅ Get current teacher ID
    const currentUser = JSON.parse(localStorage.getItem("eel_user") || "{}");
    const currentTeacherId = currentUser.user_id;

    if (!currentTeacherId) {
      showNotification("⚠️ User not logged in. Cannot save exam.", "error");
      examSaving = false;
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalContent;
      lucide.createIcons({ icons: lucide.icons });
      return;
    }

    // ✅ Use same source of truth as loadExams so we save to the current class (not a stale one)
    const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class") || "{}");
    const classId = localStorage.getItem("eel_selected_class_id") || selectedClass?.id;
    if (!classId) {
      showNotification("⚠️ Please select a class/section before saving.", "error");
      examSaving = false;
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalContent;
      lucide.createIcons({ icons: lucide.icons });
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
        examSaving = false;
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalContent;
        lucide.createIcons({ icons: lucide.icons });
      }
    } catch (err) {
      console.error("❌ Error saving exam:", err);
      showNotification("Error saving exam.", "error");
      examSaving = false;
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalContent;
      lucide.createIcons({ icons: lucide.icons });
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
          <button type="button" class="exam-list-export-btn" title="Export to Word">
            <i data-lucide="file-digit" class="size-4"></i>
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

        if (e.target.closest(".exam-list-export-btn")) {
          exportExamWord(examId);
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

// Strip duplicate school header / meta from exam content (AI sometimes includes it despite instructions)
function stripDuplicateHeaderFromExamContent(content) {
  if (!content || typeof content !== "string") return content;
  const s = content.trim();
  const lines = s.split(/\r?\n/);
  // Pattern to find the start of the actual exam content (sections or questions)
  const sectionPattern = /^\s*(?:[IVX]+\.|Part|PART)\s*(?:[IVX]+\.|[A-Z\s]+|Multiple|True|Identification|Essay)/i;
  const questionNumPattern = /^\s*\d+\.\s+/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (sectionPattern.test(line) || questionNumPattern.test(line)) {
      return lines.slice(i).join("\n").trim() || s;
    }
  }
  return s;
}

// Strip duplicate school footer / contact info from end of exam content
function stripDuplicateFooterFromExamContent(content) {
  if (!content || typeof content !== "string") return content;
  
  // More aggressive multi-line pattern to match school meta at the end
  const footerPattern = /(?:\r?\n\s*)*(?:Address:.*?|Contact No\..*?|E-mail:.*?|NORZAGARAY NATIONAL HIGH SCHOOL.*?|Department of Education.*?|Republic of the Philippines.*?)+$/is;
  
  return content.replace(footerPattern, "").trim();
}

// Format exam content for PDF: two-column options layout for multiple choice (like printed exam papers)
function formatExamContentForPDF(content, options = {}) {
  const isWord = options.isWord || false;
  if (!content || typeof content !== "string") return "";
  const esc = (s) => String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const s = content.trim();

  // 1. Split by section headers (I., II., III., IV.) or ANSWER KEY
  // We make it more flexible: allows optional newlines, handles common section formats
  const sectionRegex = /(\s*(?:[IVX]+\.\s+[A-Z][A-Z\s]+|ANSWER\s+KEY)\s*)/gi;
  const parts = s.split(sectionRegex);
  let out = "";
  let lastWasMultipleChoice = false;
  let lastWasAnswerKey = false;
  let insideAnswerKey = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.trim()) continue;

    const isHeader = /^\s*(?:[IVX]+\.\s+[A-Z]|ANSWER\s+KEY)/i.test(part);
    if (isHeader) {
      if (/ANSWER\s+KEY/i.test(part)) {
        insideAnswerKey = true;
        lastWasAnswerKey = true;
        lastWasMultipleChoice = false; // 🚫 Don't treat Answer Key as a normal MC section
      } else {
        lastWasMultipleChoice = /MULTIPLE\s*CHOICE/i.test(part);
        lastWasAnswerKey = false;
      }
      const titleMargin = (insideAnswerKey || lastWasAnswerKey) ? "4px 0 2px 0" : "12px 0 4px 0";
      out += `<div class="exam-pdf-section-title" style="font-weight:700;margin:${titleMargin};font-size:10pt !important;">${esc(part.trim())}</div>`;
      continue;
    }

    // 🎯 Use specialized formatting for the Answer Key section
    if (insideAnswerKey || lastWasAnswerKey) {
      // Find all numbered items (e.g., "1. (c) ..."). Removed \b to handle bunched text.
      const itemRegex = /(?:[_\-\s]*)?(\d+)[\.\)]\s*([\s\S]+?)(?=\s*(?:[_\-\s]*)?\d+[\.\)]\s*|$)/g;
      const matches = Array.from(part.matchAll(itemRegex));
      
      if (matches.length > 0) {
        if (isWord) {
          out += `<table border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%; border-collapse:collapse; font-size:10pt !important; margin:2px 0;">`;
          for (let j = 0; j < matches.length; j += 2) {
            const num1 = matches[j][1];
            const ans1 = matches[j][2].trim().replace(/[\s\-\_]+$/, "");
            out += `<tr style="mso-height-rule:exactly;">
              <td width="50%" style="padding:0; vertical-align:top; line-height:1.2;">${num1}. ${esc(ans1)}</td>`;
            if (matches[j + 1]) {
              const num2 = matches[j + 1][1];
              const ans2 = matches[j + 1][2].trim().replace(/[\s\-\_]+$/, "");
              out += `<td width="50%" style="padding:0; vertical-align:top; line-height:1.2;">${num2}. ${esc(ans2)}</td>`;
            } else {
              out += `<td width="50%"></td>`;
            }
            out += `</tr>`;
          }
          out += `</table>`;
        } else {
          out += `<div class="exam-pdf-answer-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px;">`;
          for (const m of matches) {
            const num = m[1];
            const ans = m[2].trim().replace(/[\s\-\_]+$/, "");
            out += `<div class="exam-pdf-answer-item" style="font-size: 10pt !important; line-height: 1.2; page-break-inside: avoid;">${num}. ${esc(ans)}</div>`;
          }
          out += `</div>`;
        }
      } else {
        // Fallback for non-numbered content in Answer Key
        out += `<div class="exam-pdf-block" style="white-space:pre-wrap;margin-bottom:8px;font-size:10pt !important;">${esc(part).replace(/\n/g, "<br>")}</div>`;
      }
      // Keep insideAnswerKey true until the end of the loop to ensure sub-headers don't break it
      continue;
    }

    if (lastWasMultipleChoice) {
      out += `<p class="exam-pdf-direction" style="text-align:left;margin:0 0 12px 0;font-size:10pt !important;"><strong>Directions:</strong> Choose the best answer to the following questions. Write the letter of your answer on the space before the number.</p>`;
      lastWasMultipleChoice = false;
      
      // 2. Split questions more robustly. Handle questions even if they don't have a newline before them. Removed \b to handle bunched text.
      const qBlocks = part.split(/(?=\d+[\.\)]\s+)/);
      
      for (const block of qBlocks) {
        const trimmed = block.trim();
        if (!trimmed || !/^\d+[\.\)]\s+/.test(trimmed)) continue;

        const numMatch = trimmed.match(/^(\d+)[\.\)]\s+([\s\S]+)$/);
        if (!numMatch) continue;
        const num = numMatch[1];
        const rest = numMatch[2];

        // 3. Extract options more robustly. Handle formats: (A), A), A.
        const opts = [];
        const optPat = /(?:\(?\s*([a-d])\s*[\)\.])\s*([\s\S]+?)(?=\s*(?:\(?\s*[a-d]\s*[\)\.])|$)/gi;
        
        let firstOptIndex = -1;
        let om;
        const tempRest = rest;
        while ((om = optPat.exec(tempRest)) !== null) {
          if (firstOptIndex === -1) firstOptIndex = om.index;
          opts.push({ letter: om[1].toLowerCase(), text: om[2].trim() });
        }

        const questionText = firstOptIndex !== -1 ? rest.slice(0, firstOptIndex).trim() : rest.trim();
        
        // ✨ Normal exam question: add answer line prefix
        out += `<div class="exam-pdf-item" style="margin-bottom:10px;">
          <div class="exam-pdf-question" style="margin-bottom:4px;text-align:left;font-size:10pt !important;">____ ${num}. ${esc(questionText).replace(/\n/g, " ")}</div>`;
        
        if (opts.length > 0) {
          if (isWord) {
            // Use table for Word layout
            out += `<table border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%; border-collapse:collapse; font-size:10pt !important; margin-bottom:2px;">`;
            for (let j = 0; j < opts.length; j += 2) {
              out += `<tr>
                <td width="50%" style="padding-left:20px;">(${opts[j].letter}) ${esc(opts[j].text)}</td>`;
              if (opts[j + 1]) {
                out += `<td width="50%">(${opts[j + 1].letter}) ${esc(opts[j + 1].text)}</td>`;
              } else {
                out += `<td width="50%"></td>`;
              }
              out += `</tr>`;
            }
            out += `</table>`;
          } else {
            // Display options in a grid (2 columns) for PDF/Preview
            for (let j = 0; j < opts.length; j += 2) {
              out += `<div class="exam-pdf-options-row" style="display:flex;justify-content:space-between;gap:24px;margin-bottom:2px;padding-left:20px;font-size:10pt !important;">
                <span class="exam-pdf-opt" style="flex:1;min-width:0;font-size:10pt !important;">(${opts[j].letter}) ${esc(opts[j].text)}</span>`;
              if (opts[j + 1]) {
                out += `<span class="exam-pdf-opt" style="flex:1;min-width:0;font-size:10pt !important;">(${opts[j + 1].letter}) ${esc(opts[j + 1].text)}</span>`;
              } else {
                out += `<span class="exam-pdf-opt" style="flex:1;min-width:0;font-size:10pt !important;"></span>`;
              }
              out += `</div>`;
            }
          }
        }
        out += `</div>`;
      }
    } else {
      out += `<div class="exam-pdf-block" style="white-space:pre-wrap;margin-bottom:8px;font-size:10pt !important;">${esc(part).replace(/\n/g, "<br>")}</div>`;
    }
  }

  return out || `<div class="exam-pdf-block" style="white-space:pre-wrap;margin-bottom:12px;font-size:10pt !important;">${esc(s).replace(/\n/g, "<br>")}</div>`;
}

// ✅ Export exam as Word Document (.doc)
async function exportExamWord(id) {
  const res = await fetch(`${window.API_BASE || ""}/api/get-exam-content/${id}`);
  const data = await res.json();
  if (!data.success) {
    if (typeof showNotification === "function") showNotification("Failed to fetch exam content.", "error");
    else alert("Failed to fetch exam content.");
    return;
  }

  const displayTitle = (data.title && data.title.trim()) ? data.title.trim().toUpperCase() : "EXAMINATION";
  const displaySubject = (data.subject && data.subject.trim()) ? data.subject.trim().toUpperCase() : "";
  let rawContent = data.content || "";

  // ✅ Use unified helper for identical design
  const parts = generateProfessionalExamHTML(rawContent, displaySubject, displayTitle, { isPDF: true, isWord: true, returnParts: true });

  const fullDocHtml = `
    <html xmlns:v='urn:schemas-microsoft-com:vml' xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:m='http://schemas.microsoft.com/office/2004/12/omml' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${displayTitle}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 8.5in 11in;
          margin: 0.75in 0.5in 0.75in 0.5in;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: "Segoe UI", "Arial", sans-serif;
          font-size: 10pt;
        }
        table { border-collapse: collapse; }
        ${parts.styles}
      </style>
    </head>
    <body>
      <div class="Section1">
        ${parts.header}
        ${parts.meta}
        ${parts.body}
        ${parts.footer}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([fullDocHtml], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `exam-${displayTitle.replace(/[/\\?*:[\]]/g, "-").slice(0, 50)}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  if (typeof showNotification === "function") showNotification("Word document downloaded.", "success");
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
