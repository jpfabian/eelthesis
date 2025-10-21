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
      // Lesson dropdown header
      const lessonHeader = document.createElement('div');
      lessonHeader.textContent = lesson.lesson_title;
      lessonHeader.style.fontWeight = 'bold';
      lessonHeader.style.cursor = 'pointer';
      lessonHeader.style.padding = '0.5rem';
      lessonHeader.style.borderBottom = '1px solid #ccc';
      lessonHeader.style.backgroundColor = '#e0e7ff';
      lessonHeader.classList.add('lesson-header');

      // Topics container (hidden initially)
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

      // Toggle topics on header click
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
  return Array.from(checkboxes).map(cb => cb.value);
}


document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('class_id');

  if (classId) {
    localStorage.setItem("eel_selected_class_id", classId);
    const newUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }

  // ✅ Always call after handling class_id
  loadLessonsAndTopics();
});


// Call it on page load
document.addEventListener('DOMContentLoaded', loadLessonsAndTopics);


// Toggle input fields based on generation method
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

// Enable/disable number inputs based on checkbox state
const questionTypeCheckboxes = document.querySelectorAll('input[name="questionTypes"]');

questionTypeCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
    const type = e.target.value;
    const countInput = document.getElementById(`count-${type}`);
    
    if (e.target.checked) {
        countInput.disabled = false;
        countInput.value = '';
    } else {
        countInput.disabled = true;
        countInput.value = '';
    }
    });
});

function setupExamGenerator() {
  const methodRadios = document.querySelectorAll('input[name="method"]');
  const topicInputDiv = document.getElementById('topic-input');
  const textInputDiv = document.getElementById('text-input');
  const generateBtn = document.querySelector('.btn-primary');

  // Toggle between topic or text input
    methodRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'topic' && radio.checked) {
            topicInputDiv.classList.remove('hidden');
            textInputDiv.classList.add('hidden');
            } else if (radio.value === 'text' && radio.checked) {
            textInputDiv.classList.remove('hidden');
            topicInputDiv.classList.add('hidden');
            }
        });
    });


  // Handle Generate Exam
  generateBtn.addEventListener('click', async () => {
    const method = document.querySelector('input[name="method"]:checked').value;
    const topicDropdown = document.getElementById('topicDropdown');
    const selectedTopicId = topicDropdown.value;
    const selectedTopicTitle = topicDropdown.options[topicDropdown.selectedIndex]?.text || '';
    const text = textInputDiv.querySelector('textarea').value.trim();
    const numberOfQuestions = document.querySelector('select').value;

    const questionTypes = Array.from(
      document.querySelectorAll('input[name="questionTypes"]:checked')
    ).map(cb => cb.value);

    if ((method === 'topic' && !topic) || (method === 'text' && !text)) {
      alert('Please enter a topic or text.');
      return;
    }

    if (questionTypes.length === 0) {
      alert('Please select at least one question type.');
      return;
    }

    generateBtn.disabled = true;
    generateBtn.innerHTML = `<i data-lucide="loader" class="size-4 mr-2 animate-spin"></i> Generating...`;

    // Get subject from localStorage or global variable
    let selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
    let subject = selectedClass ? selectedClass.subject : "Unknown Subject";

    // Normalize subject name (capitalize like your sidebar)
    subject = subject
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    const bodyData = {
      subject,
      topic: selectedTopicTitle || 'Exam from Provided Text',
      topic_id: selectedTopicId,
      content: method === 'topic' ? selectedTopicTitle : text,
      numberOfQuestions,
      questionTypes,
    };

    try {
        const res = await fetch('/api/generate-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
        });

        const data = await res.json();
        if (data.exam) {
            // ✅ Save to backend
            await fetch('/api/save-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject,
                title: topic || 'AI Generated Exam',
                content: data.exam,
                question_count: numberOfQuestions,
                types: questionTypes.join(', '),
            }),
            });

            // ✅ Show preview after saving
            showExamPreview(data.exam);
            showNotification('✅ Exam successfully generated and saved!');
        } else {
            showNotification('Failed to generate exam.');
        }
    } catch (err) {
      console.error(err);
      showNotification('Error generating exam.');
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `<i data-lucide="brain" class="size-4 mr-2"></i> Generate Exam with AI`;
      lucide.createIcons();
    }
  });
}

function showExamPreview(examText) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50';

  modal.innerHTML = `
    <div class="bg-white w-3/4 h-3/4 rounded-xl shadow-xl p-6 overflow-auto">
      <h2 class="text-xl font-semibold mb-4">Generated Exam Preview</h2>
      <pre class="whitespace-pre-wrap text-sm border p-4 rounded-lg bg-gray-50">${examText}</pre>
      <div class="mt-4 flex justify-end gap-3">
        <button id="closeModal" class="btn btn-outline border px-4 py-2 rounded-lg">Close</button>
        <button id="downloadExam" class="btn btn-primary bg-indigo-600 text-white px-4 py-2 rounded-lg">Download as .txt</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('closeModal').addEventListener('click', () => modal.remove());
  document.getElementById('downloadExam').addEventListener('click', () => {
    const blob = new Blob([examText], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Generated_Exam.txt';
    link.click();
  });
}


async function loadExams() {
  const res = await fetch('/api/exams');
  const exams = await res.json();

  const container = document.querySelector('.card-content .grid');
  container.innerHTML = ''; // clear

  exams.forEach(exam => {
    const div = document.createElement('div');
    div.className = "p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors";
    div.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="px-2 py-1 text-xs rounded bg-primary/10 text-primary">${exam.subject}</span>
        <i data-lucide="brain" class="size-4 text-primary"></i>
      </div>
      <h4 class="font-medium mb-1">${exam.title}</h4>
      <p class="text-xs text-muted-foreground mb-3">${exam.question_count} questions • ${exam.types}</p>
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm flex-1" onclick="editExam(${exam.id})">
          <i data-lucide="edit" class="size-3 mr-1"></i>Edit
        </button>
        <button class="btn btn-primary btn-sm flex-1" onclick="downloadExam('${exam.id}')">
          <i data-lucide="download" class="size-3 mr-1"></i>Export
        </button>
      </div>
    `;
    container.appendChild(div);
  });

  lucide.createIcons();
}

async function editExam(id) {
  const res = await fetch(`/api/exams/${id}`);
  const exam = await res.json();

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white w-3/4 h-3/4 rounded-xl shadow-xl p-6 overflow-auto">
      <h2 class="text-xl font-semibold mb-4">Edit Exam</h2>
      <textarea id="examEditContent" class="w-full h-[70%] border rounded p-3 text-sm">${exam.content}</textarea>
      <div class="mt-4 flex justify-end gap-3">
        <button class="btn btn-outline" onclick="this.closest('.fixed').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveExam(${id})">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveExam(id) {
  const newContent = document.getElementById('examEditContent').value;
  await fetch(`/api/exams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: newContent }),
  });
  alert('✅ Exam updated successfully!');
  document.querySelector('.fixed').remove();
  loadRecentExams();
}

async function exportExam(id) {
  const res = await fetch(`/api/exams/${id}`);
  const exam = await res.json();

  const blob = new Blob([exam.content], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${exam.title}.txt`;
  link.click();
}
