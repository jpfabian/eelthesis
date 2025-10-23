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

async function loadLessonsAndTopics() {
  try {
    const classId = localStorage.getItem("eel_selected_class_id");
    if (!classId) return console.error("No class_id found in localStorage");

    const res = await fetch(`http://localhost:3000/api/lessons-with-topics?class_id=${classId}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Invalid data format:", data);
      return;
    }

    const container = document.getElementById('topicDropdownContainer');
    container.innerHTML = '';

    data.forEach(lesson => {
      // Lesson header
      const lessonHeader = document.createElement('div');
      lessonHeader.textContent = lesson.lesson_title;
      lessonHeader.style.fontWeight = 'bold';
      lessonHeader.style.cursor = 'pointer';
      lessonHeader.style.padding = '0.5rem';
      lessonHeader.style.borderBottom = '1px solid #ccc';
      lessonHeader.style.backgroundColor = '#e0e7ff';
      lessonHeader.classList.add('lesson-header');

      // Topics container
      const topicsDiv = document.createElement('div');
      topicsDiv.style.display = 'none';
      topicsDiv.style.padding = '0.5rem 1rem';
      topicsDiv.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';

      lesson.topics.forEach(topic => {
        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.marginBottom = '0.25rem';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = topic.topic_id;
        checkbox.name = 'topics';
        checkbox.style.marginRight = '0.5rem';

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(topic.topic_title));
        topicsDiv.appendChild(label);
      });

      // Toggle topics
      lessonHeader.addEventListener('click', () => {
        topicsDiv.style.display = topicsDiv.style.display === 'none' ? 'block' : 'none';
      });

      container.appendChild(lessonHeader);
      container.appendChild(topicsDiv);
    });
  } catch (err) {
    console.error('Error loading lessons and topics:', err);
  }
}

function getSelectedTopics() {
  const checkboxes = document.querySelectorAll('input[name="topics"]:checked');
  return Array.from(checkboxes).map(cb => cb.nextSibling.textContent.trim());
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
      alert("Please select a generation method (Topic or Text).");
      return;
    }

    const method = methodInput.value;
    const selectedTopics = getSelectedTopics();
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
      alert("Please select at least one topic.");
      return;
    }
    if (method === "text" && !text) {
      alert("Please enter text content.");
      return;
    }
    if (questionTypes.length === 0) {
      alert("Please select at least one question type.");
      return;
    }

    // 🧭 Disable button + show spinner
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<i data-lucide="loader" class="size-4 mr-2 animate-spin"></i> Generating...`;

    // 📘 Get subject
    const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
    let subject = selectedClass ? selectedClass.subject : "Unknown Subject";
    subject = subject.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

    // ✅ Prepare data for backend
    const bodyData = {
      subject,
      selectedTopics,
      content: method === "topic" ? selectedTopics.join(", ") : text,
      questionTypes,
    };

    try {
      const res = await fetch("http://localhost:3000/api/generate-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (data.exam) {
        // ❌ Removed auto-save here
        // ✅ Show preview first (edit/save manually)
        showExamPreview(data.exam, subject, selectedTopics, questionTypes);
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
      lucide.createIcons();
    }
  });
}

// ✅ Show generated exam with Edit/Save logic
function showExamPreview(examText, subject, selectedTopics, questionTypes) {
  const container = document.getElementById("generatedExamContainer");
  const content = document.getElementById("generatedExamContent");
  const editBtn = document.getElementById("editExamBtn");
  const saveBtn = document.getElementById("saveExamBtn");

  if (!container || !content) {
    console.error("❌ Exam preview container not found!");
    return;
  }

  // ✅ Create formatted header and footer (fixed design)
  const headerHTML = `
    <div style="text-align:center; line-height:1.4; margin-bottom:1rem;">
      <!-- 🏫 School Logo -->
      <img src="../image/norzagaray-logo.png" 
          alt="School Logo" 
          style="width:90px; height:90px; object-fit:contain; margin-bottom:-0.5rem;">

      <strong>Republic of the Philippines</strong><br>
      Department of Education<br>
      Region III – Central Luzon<br>
      Schools Division of Bulacan<br>
      <strong>NORZAGARAY NATIONAL HIGH SCHOOL</strong><br>
      A. Villarama St., Poblacion, Norzagaray, Bulacan<br>
      
      <!-- Gulit / Horizontal Line -->
      <hr style="width:100%; margin:-2.5rem auto; border-top:2px solid black;">

      <!-- 🧾 Subject and Exam Title -->
      <strong>${subject} – Examination</strong>

      <div style="width: 100%; margin-bottom:-4rem; font-size:14px;">
        Name: ______________________________________________________________________________________________________________________    Date: _______________________________ Score: ________<br>
        Grade Level / Section: _____________________________________________________________________________________________________    Teacher: ____________________________________________
      </div>
    </div>

  `;

  const footerHTML = `
    <div style="margin-top:2rem; text-align:center; font-size:13px; color:#666;">
      — End of Examination —
    </div>
  `;

  // ✅ Combine header + AI-generated content + footer
  const finalHTML = `
    ${headerHTML}
    <div id="exam-body" style="white-space:pre-wrap; text-align:justify; font-size:15px; line-height:1.6; padding-right: 4rem; padding-left: 4rem;">
      ${examText}
      ${footerHTML}
    </div>

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

  // 💾 Save button logic
  saveBtn.onclick = async () => {
    const updatedContent = content.textContent.trim();

    try {
      const res = await fetch("http://localhost:3000/api/save-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          title: selectedTopics.join(", ") || "AI Generated Exam",
          content: updatedContent,
          question_count: questionTypes.reduce((sum, q) => sum + q.count, 0),
          types: questionTypes.map(q => `${q.type} (${q.count})`).join(", "),
        }),
      });

      if (res.ok) {
        showNotification("💾 Exam saved successfully!");
        loadExams();

        // ✅ Disable edit mode
        content.contentEditable = "false";
        editBtn.textContent = "✏️ Edit";
        saveBtn.disabled = true;
        saveBtn.classList.add("opacity-50", "cursor-not-allowed");

        // ✅ Optional fade-out animation
        container.style.transition = "opacity 0.5s ease";
        container.style.opacity = "0";

        setTimeout(() => {
          // ✅ Fully hide and reset after fade-out
          container.classList.add("hidden");
          container.style.opacity = "1";
          content.textContent = ""; // clear exam text
        }, 500);
      } else {
        showNotification("⚠️ Failed to save exam.");
      }
    } catch (err) {
      console.error("❌ Error saving exam:", err);
      showNotification("Error saving exam.");
    }
  };
}

// ✅ Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadLessonsAndTopics();
  setupExamGenerator();
  loadExams();
});

async function loadExams() {
  try {
    const res = await fetch("http://localhost:3000/api/get-exams");
    const data = await res.json();
    const exams = data.exams;

    const examListContainer = document.getElementById("exam-list");
    examListContainer.innerHTML = ""; // Clear previous content

    // Grid styling for container
    examListContainer.style.display = "grid";
    examListContainer.style.gridTemplateColumns = "repeat(auto-fit, minmax(280px, 1fr))";
    examListContainer.style.gap = "1.5rem";

    exams.forEach(exam => {
      const examCard = document.createElement("div");
      examCard.dataset.id = exam.id; 
      examCard.style.background = "rgba(99, 102, 241, 0.05)";
      examCard.style.borderRadius = "12px";
      examCard.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
      examCard.style.padding = "1.5rem";
      examCard.style.display = "flex";
      examCard.style.flexDirection = "column";
      examCard.style.justifyContent = "space-between";
      examCard.style.transition = "transform 0.2s, box-shadow 0.2s";
      examCard.onmouseover = () => {
        examCard.style.transform = "translateY(-4px)";
        examCard.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
      };
      examCard.onmouseout = () => {
        examCard.style.transform = "translateY(0)";
        examCard.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
      };

      examCard.innerHTML = `
        <div>
          <div style="height:4px; width:50px; background:#4f46e5; border-radius:2px; margin-bottom:0.5rem;"></div>
          <h4 style="font-weight:700; font-size:1.1rem; margin-bottom:0.5rem; color:#111827;">${exam.subject}</h4>
          <p style="font-size:0.9rem; color:#4b5563; margin-bottom:0.25rem;">${exam.title}</p>
          <p style="font-size:0.75rem; color:#9ca3af;">Questions: <strong>${exam.question_count}</strong> | Created: <strong>${new Date(exam.created_at).toLocaleDateString()}</strong></p>
        </div>

        <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="export-btn" style="flex:1; padding:0.5rem 1rem; background:#3b82f6; color:white; border:none; border-radius:6px; cursor:pointer; transition:0.2s;">Export Excel</button>
          <button class="cache-btn" style="flex:1; padding:0.5rem 1rem; background:#10b981; color:white; border:none; border-radius:6px; cursor:pointer; transition:0.2s;">Move to Cache</button>
        </div>
      `;

      examListContainer.appendChild(examCard);
    });

    // Event delegation for buttons
    examListContainer.addEventListener("click", (e) => {
      const card = e.target.closest("div[data-id]");
      if (!card) return;
      const examId = card.dataset.id;

      if (e.target.classList.contains("export-btn")) {
        exportExamExcel(examId);
      } else if (e.target.classList.contains("cache-btn")) {
        moveExamToCache(examId);
      }
    });

  } catch (err) {
    console.error("Failed to load exams:", err);
  }
}

// ✅ Export Excel function (no modules, fully browser compatible)
async function exportExamExcel(id) {
  const res = await fetch(`http://localhost:3000/api/get-exam-content/${id}`);
  const data = await res.json();
  if (!data.success) return alert("Failed to fetch exam content.");

  const rows = data.content.split("\n").map(line => [line]); // each line in a row
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Exam");
  XLSX.writeFile(wb, `exam-${id}.xlsx`);
}

// ✅ Move exam to cache and show proper message
function moveExamToCache(id) {
  fetch(`http://localhost:3000/api/move-exam-to-cache/${id}`, { method: "POST" })
    .then(async res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success) {
        showNotification(data.message || "Exam moved to cache successfully!","success");
        loadExams(); // Refresh list
      } else {
        showNotification(data.message || "Failed to move exam.");
      }
    })
    .catch(err => {
      console.error("Error moving exam:", err);
      showNotification("Something went wrong while moving the exam.");
    });
}

// Button handlers
document.getElementById("exam-list").addEventListener("click", e => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains("export-btn")) {
    exportExam(id);
  } else if (e.target.classList.contains("edit-btn")) {
    editExam(id);
  } else if (e.target.classList.contains("cache-btn")) {
    moveExamToCache(id);
  }
});
