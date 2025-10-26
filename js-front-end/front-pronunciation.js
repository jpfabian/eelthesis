let currentUser = null;
let pronunciationQuizData = null;
let pronunciationCurrentIndex = 0;
let pronunciationTimer = null;
let pronunciationRemainingSeconds = 0;
let pronunciationAnswers = {};
let recognitionTranscript = '';
let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let recognition = null;
let isRecording = false;
let pronunciationReviewMode = false;


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
    if (!window.location.pathname.includes('pronunciation-lessons.html')) return;

    try {
        currentUser = await initializePage();

        const teacherControls = document.getElementById('teacher-controls');
        const tabCreated = document.getElementById('tab-created');
        const tabCourse = document.getElementById('tab-course');

        // Set tab text based on role
        tabCreated.textContent = currentUser.role === 'teacher' ? 'Created by me' : 'Created by teacher';
        
        // Show main app
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        // Default tab: always show Built-in lessons
        showCourseTab();

        // Back button
        document.getElementById("back-class-btn")?.addEventListener("click", () => {
            window.location.href = "classes.html";
        });

        // Tab click handlers
        tabCourse?.addEventListener('click', () => showCourseTab());
        tabCreated?.addEventListener('click', () => showCreatedTab());

        async function showCourseTab() {
            document.getElementById('lessons-grid').classList.remove('hidden');
            document.getElementById('created-lessons-grid').classList.add('hidden');
            teacherControls?.classList.add('hidden');

            tabCourse.classList.add('btn-primary');
            tabCourse.classList.remove('btn-outline');
            tabCreated.classList.remove('btn-primary');
            tabCreated.classList.add('btn-outline');

            await loadPronunciationQuizzes(currentUser);
        }

        async function showCreatedTab() {
            document.getElementById('created-lessons-grid').classList.remove('hidden');
            document.getElementById('lessons-grid').classList.add('hidden');

            if (currentUser.role === 'teacher') {
                teacherControls?.classList.remove('hidden');
            } else {
                teacherControls?.classList.add('hidden');
            }

            tabCreated.classList.add('btn-primary');
            tabCreated.classList.remove('btn-outline');
            tabCourse.classList.remove('btn-primary');
            tabCourse.classList.add('btn-outline');
        }

    } catch (error) {
        console.error('Error initializing page:', error);
        alert('Please log in first');
        window.location.href = 'login.html';
    }
});

function createPronunciationQuiz() {
    const modal = document.getElementById('create-pronunciation-modal');
    const container = document.getElementById('questions-container');
    const difficultySelect = document.getElementById('lesson-difficulty');

    // Clear inputs
    document.getElementById('lesson-title').value = '';
    document.getElementById('lesson-passage').value = '';
    container.innerHTML = ''; 

    // Default difficulty
    difficultySelect.value = 'beginner';

    // Dynamically add first question based on select value
    setupQuestionsByDifficulty(difficultySelect.value);

    // Add listener to update questions when difficulty changes
    difficultySelect.addEventListener('change', () => {
        setupQuestionsByDifficulty(difficultySelect.value);
    });

    // Set save button
    document.getElementById('save-lesson-btn').onclick = savePronunciationQuiz;

    // Show modal
    modal.classList.remove('hidden');
}

function startLesson(lessonId) {
    const user = getCurrentUser();
    if (!user) return;

    if (user.role === 'teacher') {
        // Teacher opens schedule modal
        openScheduleModal(lessonId);
    } else {
        // Student starts quiz
        openQuizModal(lessonId);
    }
}

function updatePassagePlaceholder() {
    const difficulty = document.getElementById("lesson-difficulty").value;
    const passageField = document.getElementById("lesson-passage");

    if (difficulty === "beginner") {
        passageField.placeholder = 
            "🟢 Consonant Cluster Practice\n\n" +
            "👉 Example instruction:\n" +
            "Pronounce the given words focusing on blending consonant clusters smoothly.\n\n" +
            "💬 Example Questions:\n" +
            "Word: 'street'\n" +
            "Student Says / Correct Pronunciation: 'stree-t'";
    } 
    else if (difficulty === "intermediate") {
        passageField.placeholder = 
            "🟡 Word Stress Practice\n\n" +
            "👉 Example instruction:\n" +
            "Identify and emphasize the correct stressed syllable in each word.\n\n" +
            "💬 Example Questions:\n" +
            "Word: 'photograph'\n" +
            "Stressed Syllable / Student Says: 'PHO-to-graph'";
    } 
    else if (difficulty === "advanced") {
        passageField.placeholder = 
            "🔴 Reduced / Linked Form Practice\n\n" +
            "👉 Example instruction:\n" +
            "Practice connected speech and reduced forms in sentences.\n\n" +
            "💬 Example Questions:\n" +
            "Sentence with Blank: 'I ___ go to the store.'\n" +
            "Reduced / Linked Form: 'wanna'\n" +
            "Student Says: 'I wanna go to the store.'";
    }
}

// 🧠 Initialize and update placeholder when difficulty changes
document.addEventListener("DOMContentLoaded", () => {
    const difficultySelect = document.getElementById("lesson-difficulty");

    // Set initial placeholder
    updatePassagePlaceholder();

    // Update when user changes difficulty
    difficultySelect.addEventListener("change", () => {
        updatePassagePlaceholder();

        // Optional: clear questions-container when switching levels
        const container = document.getElementById('questions-container');
        container.innerHTML = "";
    });
});



function setupQuestionsByDifficulty(level) {
    const container = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');

    // Clear previous questions and hide Add button
    container.innerHTML = '';
    addQuestionBtn.classList.add('hidden');

    // Add first question depending on difficulty
    if (level === 'beginner') {
        addConsonantClusterQuestion();
        addQuestionBtn.onclick = addConsonantClusterQuestion;
        addQuestionBtn.classList.remove('hidden');
    } else if (level === 'intermediate') {
        addWordStressQuestion();
        addQuestionBtn.onclick = addWordStressQuestion;
        addQuestionBtn.classList.remove('hidden');
    } else if (level === 'advanced') {
        addPronunciationQuestion();
        addQuestionBtn.onclick = addPronunciationQuestion;
        addQuestionBtn.classList.remove('hidden');
    }
}

// Example stubs for adding questions (replace with your actual logic)
function addConsonantClusterQuestion() {
    const container = document.getElementById('questions-container');
    const q = document.createElement('div');
    q.innerHTML = `<input type="text" class="form-input mb-2" placeholder="Enter consonant cluster...">`;
    container.appendChild(q);
}

function addWordStressQuestion() {
    const container = document.getElementById('questions-container');
    const q = document.createElement('div');
    q.innerHTML = `<input type="text" class="form-input mb-2" placeholder="Enter word for stress practice...">`;
    container.appendChild(q);
}

function addPronunciationQuestion() {
    const container = document.getElementById('questions-container');
    const q = document.createElement('div');
    q.innerHTML = `<input type="text" class="form-input mb-2" placeholder="Enter word for pronunciation...">`;
    container.appendChild(q);
}


function closePronunciationModal() {
    document.getElementById('create-pronunciation-modal').classList.add('hidden');
}
// beginner 
function addConsonantClusterQuestion() {
    const container = document.getElementById('questions-container');
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item p-4 border border-border rounded-lg space-y-2 bg-white';
    questionItem.innerHTML = `
        <div class="space-y-2">
            <label class="form-label">Word</label>
            <input type="text" class="form-input word" placeholder="Enter word (e.g., Test)">
        </div>
        <div class="space-y-2">
            <label class="form-label">Student Says / Correct Pronunciation</label>
            <input type="text" class="form-input stressed" placeholder="Enter full pronunciation (e.g., test)">
        </div>
        <button class="btn btn-outline btn-sm mt-2" onclick="removePronunciationQuestion(this)">
            <i data-lucide="trash" class="size-3 mr-1"></i>
            Remove
        </button>
    `;
    container.appendChild(questionItem);
    lucide.createIcons({ icons: lucide.icons });
}

// New function for Intermediate – Word Stress
function addWordStressQuestion() {
    const container = document.getElementById('questions-container');
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item p-4 border border-border rounded-lg space-y-2 bg-white';
    questionItem.innerHTML = `
        <div class="space-y-2">
            <label class="form-label">Word</label>
            <input type="text" class="form-input word" placeholder="Enter word (e.g., Comfortable)">
        </div>
        <div class="space-y-2">
            <label class="form-label">Stressed Syllable / Student Says</label>
            <input type="text" class="form-input stressed" placeholder="Enter stressed form (e.g., COM-fort-able)">
        </div>
        <button class="btn btn-outline btn-sm mt-2" onclick="removePronunciationQuestion(this)">
            <i data-lucide="trash" class="size-3 mr-1"></i>
            Remove
        </button>
    `;
    container.appendChild(questionItem);
    lucide.createIcons({ icons: lucide.icons });
}

// Reuse for removing any question
function removePronunciationQuestion(btn) {
    btn.parentElement.remove();
}
//advance level
function addPronunciationQuestion() {
    const container = document.getElementById('questions-container');
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item p-4 border border-border rounded-lg space-y-2 bg-white';
    questionItem.innerHTML = `
        <div class="space-y-2">
            <label class="form-label">Sentence with Blank</label>
            <input type="text" class="form-input sentence" placeholder="Enter sentence with blank (e.g., I ___ go to the store.)">
        </div>
        <div class="space-y-2">
            <label class="form-label">Reduced / Linked Form</label>
            <input type="text" class="form-input reduced" placeholder="Enter reduced/linked form (e.g., wanna)">
        </div>
        <div class="space-y-2">
            <label class="form-label">Student Says</label>
            <input type="text" class="form-input full-sentence" placeholder="Full sentence student should say">
        </div>
        <button class="btn btn-outline btn-sm mt-2" onclick="removePronunciationQuestion(this)">
            <i data-lucide="trash" class="size-3 mr-1"></i>
            Remove
        </button>
    `;
    container.appendChild(questionItem);
    lucide.createIcons({ icons: lucide.icons });
}

function recordAudio(button) {
    showNotification('Recording functionality to be implemented', 'info');
}

async function savePronunciationQuiz() {
    const title = document.getElementById('lesson-title').value;
    const difficulty = document.getElementById('lesson-difficulty').value;
    const passage = document.getElementById('lesson-passage').value;

    if (!title || !passage) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }

    const questions = Array.from(document.querySelectorAll('.question-item')).map(item => {
        if (difficulty === 'beginner') {
            return {
                word: item.querySelector('.word')?.value || '',
                stressed_form: item.querySelector('.stressed')?.value || ''  // correct_pronunciation in DB
            };
        } else if (difficulty === 'intermediate') {
            return {
                word: item.querySelector('.word')?.value || '',
                stressed_form: item.querySelector('.stressed')?.value || ''  // stressed_syllable in DB
            };
        } else if (difficulty === 'advanced') {
            return {
                sentence: item.querySelector('.sentence')?.value || '',
                reduced_form: item.querySelector('.reduced')?.value || '',
                full_sentence: item.querySelector('.full-sentence')?.value || ''
            };
        }
    });


    if (questions.length === 0) {
        showNotification('Please add at least one question', 'warning');
        return;
    }

    try {
        const res = await fetch('/api/pronunciation-quizzes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, difficulty, passage, questions })
        });

        const data = await res.json();
        if (res.ok) {
            showNotification(data.message, 'success');
            closePronunciationModal();
            document.getElementById('lesson-title').value = '';
            document.getElementById('lesson-passage').value = '';
            document.getElementById('questions-container').innerHTML = '';
            loadPronunciationQuizzes();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Failed to save quiz', 'error');
    }
}

function openScheduleModal(quizId) {
    const modal = document.getElementById('schedule-modal');
    const saveBtn = document.getElementById('save-schedule-btn');

    // 🧹 Clear all input fields before showing the modal
    document.getElementById('modal-unlock-time').value = '';
    document.getElementById('modal-lock-time').value = '';
    document.getElementById('modal-time-limit').value = '';
    document.getElementById('retake-option').value = 'none';

    // Also hide specific-student container when modal reopens
    document.getElementById('specific-students-container').classList.add('hidden');

    // 🟢 Show modal
    modal.classList.remove('hidden');

    saveBtn.onclick = async () => {
        const unlockTime = document.getElementById('modal-unlock-time').value;
        const lockTime = document.getElementById('modal-lock-time').value;
        const timeLimit = document.getElementById('modal-time-limit').value;
        const retakeOption = document.getElementById('retake-option').value;

        try {
            const res = await fetch(`/api/pronunciation-quizzes/${quizId}/schedule`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    unlock_time: unlockTime,
                    lock_time: lockTime,
                    time_limit: timeLimit,
                    retake_option: retakeOption
                })
            });

            const data = await res.json();
            if (data.success) {
                showNotification("✅ Pronunciation quiz schedule saved!", "success");

                // ✅ Hide modal after success
                modal.classList.add('hidden');

                // ✅ Reload quizzes to reflect the new schedule
                await loadPronunciationQuizzes(getCurrentUser());
            } else {
                showNotification("❌ Failed to save schedule.", "error");
            }
        } catch (err) {
            console.error("Failed to save schedule:", err);
            showNotification("⚠️ Error saving schedule.", "error");
        }
    };
}

function closeScheduleModal() {
    const modal = document.getElementById('schedule-modal');
    modal.classList.add('hidden');
    currentLessonId = null;

    // Clear all modal inputs
    document.getElementById('modal-unlock-time').value = '';
    document.getElementById('modal-lock-time').value = '';
    document.getElementById('retake-option').value = 'all'; // default option
    document.getElementById('specific-students').selectedIndex = -1; // clear selection
    document.getElementById('specific-students-container').classList.add('hidden');
}

document.getElementById('retake-option').addEventListener('change', (e) => {
    const container = document.getElementById('specific-students-container');
    container.classList.toggle('hidden', e.target.value !== 'specific');
});

document.getElementById('save-schedule-btn').addEventListener('click', () => {
    const modal = document.getElementById('schedule-modal');
    const quizId = modal.dataset.quizId;
        if (!quizId) return;

        const unlock_time = document.getElementById('modal-unlock-time').value;
        const lock_time = document.getElementById('modal-lock-time').value;
        const time_limit = document.getElementById('modal-time-limit').value || null;
        
        if (!unlock_time || !lock_time) {
            showNotification("Please select both unlock and lock times", "warning");
            return;
        }

        const retake_option = document.getElementById('retake-option').value;
        let allowed_students = [];
        if (retake_option === 'specific') {
            allowed_students = Array.from(document.getElementById('specific-students').selectedOptions)
            .map(opt => opt.value);
        }

    fetch(`/api/pronunciation-quizzes/${quizId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        unlock_time,
        lock_time,
        status: 'scheduled',
        retake_option,
        allowed_students,
        time_limit
        })
    })
    .then(res => res.json())
    .then(data => {
        showNotification(data.success ? "Quiz schedule saved!" : "Failed to save schedule: " + data.message,
                        data.success ? "success" : "error");
        if (data.success) {
        closeScheduleModal();
        loadPronunciationQuizzes(currentUser);
        }
    })
    .catch(err => {
        console.error(err);
        showNotification("An error occurred while saving schedule.", "error");
    });
});

// Helper functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

async function lockPronunciationQuiz(quizId) {
    try {
        const res = await fetch(`/api/lock-pronunciation-quiz/${quizId}`, {
            method: "PUT",
        });
        const data = await res.json();
        if (data.success) {
            showNotification("🔒 Quiz locked successfully!", "success");
            await loadPronunciationQuizzes(getCurrentUser());
        } else {
            showNotification("❌ Failed to lock quiz.", "error");
        }
    } catch (err) {
        console.error("Error locking quiz:", err);
        showNotification("⚠️ Error locking quiz.", "error");
    }
}

// ✅ New safer function
function safeOpenPronunciationModal(quizId, isLocked) {
    if (isLocked) {
        showNotification("This quiz is locked by your teacher.", "warning");
        return;
    }
    openPronunciationModal(quizId);
}

// ============================================
// LOAD QUIZZES
// ============================================
async function loadPronunciationQuizzes(user) {
    try {
        // ✅ Get selected class (with subject_id)
        const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
        const subjectId = selectedClass?.subject_id;
        if (!subjectId) {
            console.warn("⚠️ No subject_id found in selected class.");
            return;
        }

        // ✅ Fetch pronunciation quizzes
        const res = await fetch(`/api/pronunciation-quizzes?subject_id=${subjectId}`);
        const quizzes = await res.json();

        // ✅ Fetch student attempts (if user is a student)
        let studentAttempts = [];
        if (user.role === "student") {
            try {
                const attemptRes = await fetch(`/api/pronunciation-attempts?student_id=${user.user_id}`);
                const attemptData = await attemptRes.json();
                studentAttempts = attemptData.success ? attemptData.attempts : [];
            } catch (attemptErr) {
                console.error("Error loading attempts:", attemptErr);
            }
        }

        const container = document.getElementById("lessons-grid");
        container.innerHTML = "";
        container.className = "space-y-6";

        // ✅ Difficulty sections
        const beginnerContainer = document.createElement("div");
        const intermediateContainer = document.createElement("div");
        const advancedContainer = document.createElement("div");

        beginnerContainer.innerHTML = `<h2 class="card-title text-center px-2 py-1 text-lg rounded-lg bg-secondary/10 text-secondary">Beginner</h2>`;
        intermediateContainer.innerHTML = `<h2 class="card-title text-center px-2 py-1 text-lg rounded-lg bg-secondary/10 text-secondary">Intermediate</h2>`;
        advancedContainer.innerHTML = `<h2 class="card-title text-center px-2 py-1 text-lg rounded-lg bg-secondary/10 text-secondary">Advanced</h2>`;

        // ✅ Counters for numbering per difficulty
        let beginnerCount = 1;
        let intermediateCount = 1;
        let advancedCount = 1;

        // ✅ Loop through quizzes
        quizzes.forEach(quiz => {
            const now = new Date();
            const unlockTime = quiz.unlock_time ? new Date(quiz.unlock_time.replace(" ", "T")) : null;
            const lockTime = quiz.lock_time ? new Date(quiz.lock_time.replace(" ", "T")) : null;

            const backendLocked = Number(quiz.is_locked) === 1;
            const notYetUnlocked = unlockTime && now < unlockTime;
            const alreadyClosed = lockTime && now > lockTime;
            const isLocked = backendLocked || notYetUnlocked || alreadyClosed;

            let actionButtons = "";

            // ✅ TEACHER VIEW
            if (user.role === "teacher") {
                actionButtons = `
                    <button class="btn btn-outline flex-1" onclick="openLeaderboardModal(${quiz.quiz_id})">
                        <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>Leaderboard
                    </button>
                    <button 
                        class="btn btn-primary flex-1"
                        onclick="${isLocked ? `openScheduleModal(${quiz.quiz_id})` : `lockPronunciationQuiz(${quiz.quiz_id})`}"
                    >
                        <i data-lucide="${isLocked ? "unlock" : "lock"}" class="size-3 mr-1"></i>
                        ${isLocked ? "Unlock" : "Lock"}
                    </button>
                `;
            } 
            // ✅ STUDENT VIEW
            else {
                const studentAttempt = studentAttempts.find(a => a.quiz_id === quiz.quiz_id);

                let btnText = "Start Quiz";
                let btnIcon = "play";
                let btnDisabled = isLocked;
                let openAction = `openPronunciationModal(${quiz.quiz_id})`;

                if (studentAttempt) {
                    if (studentAttempt.status === "completed") {
                        btnText = "Review Quiz";
                        btnIcon = "eye";
                        btnDisabled = false;
                        openAction = `openPronunciationReview(${quiz.quiz_id}, ${user.user_id})`;
                    } else if (studentAttempt.status === "in_progress") {
                        btnText = "Continue Quiz";
                        btnIcon = "play";
                        btnDisabled = false;
                        openAction = `openPronunciationModal(${quiz.quiz_id})`;
                    }
                }

                actionButtons = `
                    <button 
                        class="btn btn-primary flex-1 ${btnDisabled ? "opacity-50 cursor-not-allowed" : ""}" 
                        ${btnDisabled ? "disabled" : ""}
                        onclick="event.stopPropagation(); ${!btnDisabled ? openAction : ""}"
                    >
                        <i data-lucide="${btnIcon}" class="size-3 mr-1"></i>
                        ${btnText}
                    </button>
                    <button 
                        class="btn btn-outline flex-1"
                        onclick="event.stopPropagation(); openLeaderboardModal(${quiz.quiz_id})"
                    >
                        <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>
                        Leaderboard
                    </button>
                `;
            }

            // ✅ Determine numbering
            let quizNumber;
            if (quiz.difficulty === "beginner") quizNumber = beginnerCount++;
            else if (quiz.difficulty === "intermediate") quizNumber = intermediateCount++;
            else if (quiz.difficulty === "advanced") quizNumber = advancedCount++;

            // ✅ Card
            const quizCard = document.createElement("div");
            quizCard.className = "card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1";
            quizCard.innerHTML = `
                <div class="p-4 rounded-lg border border-border cursor-pointer">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="font-semibold text-lg text-primary">
                                ${quizNumber}. ${quiz.title}
                            </h3>
                            <p class="text-sm text-muted-foreground italic">
                                ${quiz.passage ? quiz.passage.substring(0, 100) + "..." : "No description available."}
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-1 text-xs rounded bg-secondary/10 text-secondary capitalize">
                                ${quiz.difficulty}
                            </span>
                            <i data-lucide="book-open" class="size-5 text-primary"></i>
                        </div>
                    </div>

                    <div class="hidden mt-4 border-t pt-3 quiz-details space-y-3">
                        <div class="flex flex-col text-xs text-muted-foreground gap-1">
                            <span>Start: ${quiz.unlock_time ? formatDateTime(quiz.unlock_time) : "Not set"}</span>
                            <span>Deadline: ${quiz.lock_time ? formatDateTime(quiz.lock_time) : "Not set"}</span>
                        </div>
                        <div class="flex gap-2">${actionButtons}</div>
                    </div>
                </div>
            `;

            // ✅ Toggle details
            quizCard.addEventListener("click", () => {
                const details = quizCard.querySelector(".quiz-details");
                const allCards = container.querySelectorAll(".quiz-details");
                allCards.forEach(d => { if (d !== details) d.classList.add("hidden"); });
                details.classList.toggle("hidden");
                lucide.createIcons({ icons: lucide.icons });
            });

            // ✅ Append to corresponding difficulty
            if (quiz.difficulty === "beginner") beginnerContainer.appendChild(quizCard);
            else if (quiz.difficulty === "intermediate") intermediateContainer.appendChild(quizCard);
            else if (quiz.difficulty === "advanced") advancedContainer.appendChild(quizCard);
        });

        // ✅ Add all sections
        container.appendChild(beginnerContainer);
        container.appendChild(intermediateContainer);
        container.appendChild(advancedContainer);

        lucide.createIcons({ icons: lucide.icons });

    } catch (err) {
        console.error("Error loading pronunciation quizzes:", err);
        const container = document.getElementById("lessons-grid");
        container.innerHTML = '<p class="text-center text-red-500">Failed to load quizzes.</p>';
    }
}

// ============================================
// TAKE QUIZ MODAL
// ============================================
async function openPronunciationModal(quizId) {
    try {
        const res = await fetch(`/api/pronunciation-quizzes/${quizId}`);
        if (!res.ok) return showNotification("Failed to fetch quiz", "error");
        const quiz = await res.json();

        const now = new Date();
        const unlockTime = quiz.unlock_time ? new Date(quiz.unlock_time.replace(' ', 'T')) : null;
        const lockTime = quiz.lock_time ? new Date(quiz.lock_time.replace(' ', 'T')) : null;
        if ((unlockTime && now < unlockTime) || (lockTime && now > lockTime) || Number(quiz.is_locked) === 1) {
            return showNotification("This quiz is not available.", "warning");
        }

        // Initialize quiz
        pronunciationQuizData = quiz;
        pronunciationCurrentIndex = 0;
        pronunciationAnswers = {};

        document.getElementById('pronunciation-quiz-title').textContent = quiz.title || "🎤 Pronunciation Practice";
        document.getElementById('pronunciation-passage').innerHTML = quiz.passage || "<strong>Instructions:</strong> Record your pronunciation.";

        if (typeof loadPronunciationQuestion === "function") {
    // only load question if elements exist
            const firstQ = document.getElementById("pronunciation-question-text");
            if (firstQ || document.getElementById("pronunciation-questions")) {
                loadPronunciationQuestion(0);
            } else {
                console.warn("⚠️ Skipped loading question: element not found.");
            }
        } else {
            console.error("❌ loadPronunciationQuestion function is missing!");
        }

        // Timer
        const countdownEl = document.getElementById('pronunciation-countdown');
        if (quiz.time_limit) {
            pronunciationRemainingSeconds = Number(quiz.time_limit) * 60;
            clearInterval(pronunciationTimer);
            pronunciationTimer = setInterval(() => {
                if (pronunciationRemainingSeconds <= 0) {
                    clearInterval(pronunciationTimer);
                    countdownEl.textContent = "00:00";
                    submitPronunciationQuiz();
                    return;
                }
                const min = Math.floor(pronunciationRemainingSeconds / 60);
                const sec = pronunciationRemainingSeconds % 60;
                countdownEl.textContent = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
                pronunciationRemainingSeconds--;
            }, 1000);
            document.getElementById('pronunciation-timer-container').style.display = 'block';
        } else {
            countdownEl.textContent = "";
            document.getElementById('pronunciation-timer-container').style.display = 'none';
        }

        document.getElementById('take-pronunciation-modal').classList.remove('hidden');
        resetRecordingUI();
        updatePronunciationProgress();
        lucide.createIcons({ icons: lucide.icons });
    } catch (err) {
        console.error(err);
        showNotification("Failed to open quiz.", "error");
    }
}

function closeTakePronunciationModal() {
    document.getElementById('take-pronunciation-modal').classList.add('hidden');
    document.getElementById("pronunciation-nav")?.classList.remove("hidden");
    pronunciationQuizData = null;
    pronunciationCurrentIndex = 0;
    pronunciationAnswers = {};
    clearInterval(pronunciationTimer);
    document.getElementById('pronunciation-progress').style.width = '0%';
    window.location.reload();
}

function loadPronunciationQuestion(index) {
    const quiz = pronunciationQuizData;
    if (!quiz || !quiz.questions || !quiz.questions[index]) return;

    const q = quiz.questions[index];
    document.getElementById('pronunciation-question-num').textContent = `Question ${index+1} of ${quiz.questions.length}`;
    document.getElementById('pronunciation-difficulty').textContent = quiz.difficulty 
        ? `${quiz.difficulty === 'beginner' ? '🟢' : quiz.difficulty === 'intermediate' ? '🟡' : '🔴'} ${quiz.difficulty}` 
        : '';

    let contentHtml = '';
    if (quiz.difficulty === 'beginner' || quiz.difficulty === 'intermediate') {
        contentHtml = `
            <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">🔤 Word to Pronounce:</h3>
            <div class="word-display">
                <span class="word-large">${q.word || q.sentence || '(No content)'}</span>
                <span class="pronunciation-guide">${q.correct_pronunciation || q.stressed_syllable || ''}</span>
            </div>
        `;
    } else {
        contentHtml = `
            <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">📝 Sentence to Say:</h3>
            <div class="sentence-display">
                <p class="sentence-text">${q.sentence || '(No sentence)'}</p>
                ${q.reduced_form ? `<p class="reduced-form"><strong>Reduced form:</strong> <span class="highlight">${q.reduced_form}</span></p>` : ''}
            </div>
        `;
    }

    document.getElementById('pronunciation-content').innerHTML = contentHtml;

    // Enable / disable navigation buttons
    document.getElementById('pronunciation-prev-btn').disabled = index === 0;
    const isLast = index === (quiz.questions.length - 1);
    document.getElementById('pronunciation-next-btn').classList.toggle('hidden', isLast);
    document.getElementById('pronunciation-submit-btn').classList.toggle('hidden', !isLast);
}

function updatePronunciationProgress() {
    if (!pronunciationQuizData) return;
    const percent = ((pronunciationCurrentIndex + 1) / pronunciationQuizData.questions.length) * 100;
    document.getElementById('pronunciation-progress').style.width = `${percent}%`;
}

// ---------------- Navigation ----------------
function pronunciationNextQuestion() {
    if (!pronunciationAnswers[pronunciationCurrentIndex]) {
        return showNotification("Please record your answer before moving on.", "warning");
    }
    if (pronunciationCurrentIndex < pronunciationQuizData.questions.length - 1) {
        pronunciationCurrentIndex++;
        loadPronunciationQuestion(pronunciationCurrentIndex);
        updatePronunciationProgress();
        resetRecordingUI();
    }
}

function pronunciationPrevQuestion() {
    if (pronunciationCurrentIndex > 0) {
        pronunciationCurrentIndex--;
        loadPronunciationQuestion(pronunciationCurrentIndex);
        updatePronunciationProgress();
        resetRecordingUI();
    }
}

// ============================================
// RECORDING FUNCTIONS
// ============================================

function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        return null;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    return rec;
}

async function toggleRecording() {
    const recordBtn = document.getElementById('record-btn');
    const idle = document.getElementById('recording-idle');
    const active = document.getElementById('recording-active');
    const complete = document.getElementById('recording-complete');
    const recordedControls = document.getElementById('recorded-controls');

    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recordedChunks = [];
            mediaRecorder = new MediaRecorder(mediaStream);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) recordedChunks.push(e.data);
            };

            mediaRecorder.onstart = () => {
                idle?.classList.add('hidden');
                active?.classList.remove('hidden');
                complete?.classList.add('hidden');
                recordedControls?.classList.add('hidden');
                recordBtn.querySelector('span').textContent = 'Stop Recording';
                showNotification("🎙️ Recording... speak now.", "info");

                if (!recognition) recognition = initVoiceRecognition();
                if (!recognition) return;

                recognitionTranscript = '';

                recognition.onresult = (event) => {
                    recognitionTranscript = event.results[0][0].transcript.trim();
                    showNotification(`✅ You said: "${recognitionTranscript}"`, "success");
                };

                recognition.onerror = (err) => {
                    console.error("Speech Recognition Error:", err);
                    if (err.error === 'no-speech') {
                        showNotification("⚠️ No speech detected. Try speaking clearly.", "warning");
                    }
                };

                recognition.onend = () => {
                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        // restart only if stopped unexpectedly
                        try { recognition.start(); } catch (err) {}
                    }
                };
            };

            mediaRecorder.onstop = () => {
                active?.classList.add('hidden');
                complete?.classList.remove('hidden');
                recordedControls?.classList.remove('hidden');
                recordBtn.querySelector('span').textContent = 'Start Recording';

                const blob = new Blob(recordedChunks, { type: recordedChunks[0]?.type || 'audio/webm' });

                // Save recording locally
                const q = pronunciationQuizData.questions[pronunciationCurrentIndex];
                pronunciationAnswers[pronunciationCurrentIndex] = { 
                    blob, 
                    transcript: recognitionTranscript || '', 
                    questionId: q.question_id 
                };

                recognitionTranscript = '';

                // DO NOT reset UI here!
                // User can now play or re-record
            };

            mediaRecorder.start();

            if (!recognition) recognition = initVoiceRecognition();
            if (!recognition) return;

            recognitionTranscript = '';
            recognition.start();

            recognition.onresult = (event) => {
                recognitionTranscript = event.results[0][0].transcript.trim();
                showNotification(`✅ You said: "${recognitionTranscript}"`, "success");
            };

            recognition.onerror = (err) => {
                console.error("Speech Recognition Error:", err);
                if (err.error === 'no-speech') {
                    showNotification("⚠️ No speech detected. Try speaking clearly.", "warning");
                }
            };
        } catch (err) {
            console.error("Error accessing microphone:", err);
            showNotification("Unable to access microphone", "error");
        }
    } else if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
        if (recognition) recognition.stop();
    }
}

function reRecord() {
    // Clear previous recording
    if (pronunciationAnswers[pronunciationCurrentIndex]) {
        delete pronunciationAnswers[pronunciationCurrentIndex];
    }
    resetRecordingUI();
}


async function handleRecordingComplete(blob) {
    const q = pronunciationQuizData.questions[pronunciationCurrentIndex];
    if (!q) return;

    // Save blob and transcript for this question
    const transcript = recognitionTranscript || '';
    pronunciationAnswers[pronunciationCurrentIndex] = { 
        blob, 
        transcript, 
        questionId: q.question_id 
    };

    recognitionTranscript = '';

    const expectedText = q.word || q.sentence;

    // Send recording to backend for pronunciation check
    try {
        const formData = new FormData();
        formData.append("audio", blob, "speech.webm");
        formData.append("expectedText", expectedText);

        const res = await fetch("/api/pronunciation-check", {
            method: "POST",
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            showNotification(`🎯 Accuracy: ${data.accuracy}%`, "success");
            console.log("Feedback:", data.feedback);
        }
    } catch (err) {
        console.error("Pronunciation check error:", err);
        showNotification("❌ Pronunciation check failed", "error");
    }
}

async function checkPronunciation(audioBlob, expectedText) {
    const formData = new FormData();
    formData.append("audio", audioBlob, "speech.webm");
    formData.append("expectedText", expectedText);

    try {
        const res = await fetch("/api/pronunciation-check", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        if (data.success) {
            showNotification(`🎯 Accuracy: ${data.accuracy}%`, "success");
            console.log("Feedback:", data.feedback);
        }
    } catch (err) {
        console.error("Pronunciation check error:", err);
    }
}

function playRecording() {
    const audio = document.getElementById('recorded-audio');
    const answer = pronunciationAnswers[pronunciationCurrentIndex];

    if (!answer || !answer.blob) {
        alert("No recording available to play!");
        return;
    }

    const audioURL = URL.createObjectURL(answer.blob);
    audio.src = audioURL;
    audio.classList.remove('hidden');

    audio.load();
    audio.play().catch(err => {
        console.warn("Playback prevented by browser:", err);
        alert("Please allow audio playback in your browser.");
    });
    audio.onended = () => URL.revokeObjectURL(audioURL);
}


function resetRecordingUI() {
    // Reset recording UI
    document.getElementById('recording-idle')?.classList.remove('hidden');
    document.getElementById('recording-active')?.classList.add('hidden');
    document.getElementById('recording-complete')?.classList.add('hidden');
    document.getElementById('recorded-controls')?.classList.add('hidden');

    const recordBtn = document.getElementById('record-btn');
    if (recordBtn) {
        const span = recordBtn.querySelector('span');
        if (span) span.textContent = 'Start Recording';
    }

    // Clear recorded chunks and stop media recorder
    recordedChunks = [];
    mediaRecorder = null;
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }

    // --- NEW: Stop and reset SpeechRecognition ---
    if (recognition) {
        try {
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
            recognition.stop();
        } catch (err) {
            console.warn("Recognition already stopped or error:", err);
        }
        recognition = null;
    }
    recognitionTranscript = '';

    // --- NEW: Clear any old audio from previous question ---
    const audio = document.getElementById('recorded-audio');
    if (audio) {
        audio.pause();
        audio.src = '';
        audio.classList.add('hidden');
    }

    lucide.createIcons({ icons: lucide.icons });
}

// ============================================
// SUBMIT QUIZ
// ============================================
async function submitPronunciationQuiz() {
  clearInterval(pronunciationTimer);

  const user = getCurrentUser();
  const formData = new FormData();

  for (let i = 0; i < pronunciationQuizData.questions.length; i++) {
    const answer = pronunciationAnswers[i];
    if (!answer) continue;

    formData.append(`audio_${i}`, answer.blob, `answer_q${answer.questionId}.webm`);
    formData.append(`question_id_${i}`, answer.questionId);
    formData.append(`answer_${i}`, answer.transcript || '');
    formData.append(`difficulty_${i}`, pronunciationQuizData.questions[i].difficulty);
  }

  formData.append('student_id', user.user_id);
  formData.append('quiz_id', pronunciationQuizData.quiz_id);

  try {
    const res = await fetch('/api/pronunciation-submit', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      // ✅ Close quiz modal
      closeTakePronunciationModal();
      showQuizResult(data.accuracy);

      // ✅ Reload quizzes dynamically (reflect Review/Continue buttons)
      await loadPronunciationQuizzes(user);

    } else {
      showNotification("❌ Failed to submit quiz.", "error");
    }
  } catch (err) {
    localStorage.setItem('quiz_error', err.message || JSON.stringify(err));
    showNotification("❌ Error submitting quiz.", "error");
  }
}

// Show the quiz result modal
function showQuizResult(accuracyValue) {
  const modal = document.getElementById("quiz-result-modal");
  const scoreElem = document.getElementById("student-score");
  const feedbackElem = document.getElementById("feedback-message");
  const feedbackIcon = document.getElementById("feedback-icon");
  const progressRing = document.getElementById("result-progress-ring-fill");

  // ✅ Clamp accuracy between 80 and 100
  let totalAccuracy = Math.max(80, Math.min(parseFloat(accuracyValue) || 0, 100));
  scoreElem.textContent = `${totalAccuracy}%`;

  // ✅ Feedback logic
  if (totalAccuracy >= 90) {
    feedbackElem.textContent = "🌟 Excellent pronunciation! Keep it up!";
    feedbackIcon.textContent = "🌟";
  } else if (totalAccuracy >= 85) {
    feedbackElem.textContent = "👏 Great job! A little more practice and you'll be perfect!";
    feedbackIcon.textContent = "👏";
  } else {
    feedbackElem.textContent = "💪 Keep practicing — you're improving!";
    feedbackIcon.textContent = "💪";
  }

  // ✅ Animate progress ring
  const radius = progressRing.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
  progressRing.style.strokeDashoffset = circumference;

  setTimeout(() => {
    const offset = circumference - (totalAccuracy / 100) * circumference;
    progressRing.style.strokeDashoffset = offset;
  }, 100);

  modal.classList.remove("hidden");
}

setTimeout(() => loadPronunciationQuestion(0), 100);

// Close result modal
function closeResultModal() {
  const modal = document.getElementById("quiz-result-modal");
  modal.classList.add("hidden");
}

async function openPronunciationReview(quizId, studentId) {
  const modal = document.getElementById("take-pronunciation-modal");
  const questionContainer = document.getElementById("pronunciation-questions");
  const quizTitle = document.getElementById("pronunciation-quiz-title");

  if (!modal || !questionContainer) {
    console.error("❌ Pronunciation modal or container missing!");
    return;
  }

  try {
    const res = await fetch(`/api/pronunciation-review?student_id=${studentId}&quiz_id=${quizId}`);
    const data = await res.json();

    if (!data.success || !data.answers || data.answers.length === 0) {
      showNotification("No recorded answers found for this quiz.", "warning");
      return;
    }

    const quiz = data.quiz;
    const answers = data.answers;

    quizTitle.textContent = quiz.title || "Pronunciation Review";
    questionContainer.innerHTML = "";

    answers.forEach((a, i) => {
      const correctText = a.question_text || "(No question text)";
      const qDiv = document.createElement("div");
      qDiv.className = "p-4 mb-3 border rounded-lg bg-muted/10 shadow-sm transition-all duration-200 hover:shadow-md";

      qDiv.innerHTML = `
        <h4 class="font-semibold text-primary mb-1">Question ${i + 1}</h4>
        <p class="text-sm italic mb-2">${correctText}</p>

        <div class="flex items-center gap-2 mb-3">
          <p class="text-sm font-medium text-gray-700">Expected Pronunciation:</p>
          <button 
            style="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1)); color: #ec4899; border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 0.5rem; cursor: pointer;"
            onclick="speakPronunciation('${correctText}')"
          >
            <span class="tts-icon">🔊</span>
            <span>Play</span>
          </button>
        </div>

        <audio controls src="${a.student_audio}" class="w-full mb-2"></audio>
        <p class="text-sm text-green-600 font-medium mt-1">Score: ${a.pronunciation_score}%</p>
      `;

      questionContainer.appendChild(qDiv);
    });

    // Hide recording, navigation, and submit buttons
    document.getElementById("start-pronunciation-btn")?.classList.add("hidden");
    document.getElementById("submit-pronunciation-btn")?.classList.add("hidden");
    document.getElementById("close-pronunciation-btn")?.classList.remove("hidden");
    document.getElementById("pronunciation-nav")?.classList.add("hidden");

    modal.classList.remove("hidden");

  } catch (err) {
    console.error("❌ Error loading pronunciation review:", err);
    showNotification("Error loading pronunciation review.", "error");
  }
}

// 🗣️ Text-to-speech (TTS) player
function speakPronunciation(text) {
  if (!window.speechSynthesis) {
    alert("Speech synthesis not supported in this browser.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1;

  // Optional: cancel ongoing speech before playing new one
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function closeLeaderboardModal() {
    const modal = document.getElementById("leaderboard-modal");
    modal.classList.add("hidden");
}

// Format duration in mm:ss
function formatDuration(startTime, endTime) {
    if (!startTime || !endTime) return "-";
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.round((diffMs % 60000) / 1000);
    if (minutes > 0) return `${minutes}:${seconds.toString().padStart(2,'0')} min`;
    return `${seconds}s`;
}

async function openLeaderboardModal(quizId, classId) {
    const modal = document.getElementById("leaderboard-modal");
    const body = document.getElementById("leaderboard-body");
    const quizName = document.getElementById("quiz-name");

    try {
        const res = await fetch(`/api/leaderboard?quiz_id=${quizId}${classId ? `&class_id=${classId}` : ''}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to load leaderboard");

        const leaderboard = data.leaderboard;

        quizName.textContent = `Quiz Leaderboard`;
        body.innerHTML = "";

        // Podium
        const podiums = [
            modal.querySelector(".first-place"),
            modal.querySelector(".second-place"),
            modal.querySelector(".third-place")
        ];

        // Clear podiums
        podiums.forEach(podium => {
            podium.querySelector(".podium-avatar").textContent = "";
            podium.querySelector(".podium-name").textContent = "—";
            podium.querySelector(".podium-score span").textContent = "-";
            podium.querySelector(".podium-rank").textContent = "";
        });

        // Clear table
        body.innerHTML = "";

        // Then fill in podiums from leaderboard
        leaderboard.slice(0,3).forEach((student, index) => {
            const podium = podiums[index];
            const initials = student.name.trim().split(/\s+/).map(n=>n[0]).join("");
            podium.querySelector(".podium-avatar").textContent = initials;
            podium.querySelector(".podium-name").textContent = student.name;
            podium.querySelector(".podium-score span").textContent = `${student.score}/100`;
            podium.querySelector(".podium-rank").textContent = `#${student.rank}`;
        });


        // Table
        leaderboard.forEach(entry => {
            const row = document.createElement("tr");
            row.className = "leaderboard-table-row";
            if (entry.rank <= 3) row.classList.add("top-three");

            const duration = formatDuration(entry.start_time, entry.end_time);

            row.innerHTML = `
                <td><span class="rank-badge">${entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank-1] : entry.rank}</span></td>
                <td>
                    <div class="student-info">
                        <div class="student-avatar" style="background: linear-gradient(135deg, #6366f1, #10b981);">
                            ${entry.name.split(" ").map(n=>n[0]).join("")}
                        </div>
                        <span>${entry.name}</span>
                    </div>
                </td>
                <td><span class="score-badge">${entry.score}/100</span></td>
                <td><span class="time-badge">${duration}</span></td>
                <td><span class="status-badge ${entry.status === "completed" ? "completed" : "in-progress"}">
                    ${entry.status === "completed" ? "✓ Completed" : "In Progress"}
                </span></td>
            `;
            body.appendChild(row);
        });

        modal.classList.remove("hidden");

    } catch (err) {
        console.error(err);
        showNotification("Failed to load leaderboard", "error");
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

async function generateWithAI() {
    try {
        openAIModal(); // Show modal first

        // TODO: Fetch AI-generated content using your API
        // Example:
        // const response = await fetch('/api/generate-quiz', { method: 'POST', body: JSON.stringify({...}) });
        // const data = await response.json();
        // renderGeneratedQuiz(data);
    } catch (err) {
        console.error('Error generating AI quiz:', err);
    }
}


// Open AI Quiz Generator Modal
function openAIModal() {
    const modal = document.getElementById('ai-quiz-generator-modal');
    if (!modal) return console.error('AI Quiz Generator modal not found!');
    
    modal.classList.remove('hidden');   // Show the modal
    modal.style.opacity = 0;
    
    // Optional: simple fade-in
    let op = 0;
    const fadeIn = setInterval(() => {
        if (op >= 1) clearInterval(fadeIn);
        modal.style.opacity = op;
        op += 0.1;
    }, 30);
}

// Close AI Quiz Generator Modal
function closeAIModal() {
    const modal = document.getElementById('ai-quiz-generator-modal');
    if (!modal) return;

    modal.classList.add('hidden'); // Hide the modal
}

    