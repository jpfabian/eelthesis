// Polyfill showNotification for take-pronunciation.html (does not load navigation.js)
if (typeof showNotification !== 'function') {
    window.showNotification = function (message, type = 'info') {
        document.querySelectorAll('.notification').forEach((n) => n.remove());
        const n = document.createElement('div');
        n.className = 'notification notification-' + (type || 'info') + ' fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg max-w-sm';
        if (type === 'success') n.classList.add('bg-primary', 'text-primary-foreground', 'border-primary');
        else if (type === 'error') n.classList.add('bg-destructive', 'text-destructive-foreground', 'border-destructive');
        else if (type === 'warning') n.classList.add('bg-secondary', 'text-secondary-foreground', 'border-secondary');
        else n.classList.add('bg-card', 'text-card-foreground', 'border-border');
        n.textContent = message;
        document.body.appendChild(n);
        setTimeout(function () { if (n.parentElement) n.remove(); }, 5000);
    };
}

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

function initQuizViewToggle(storageKey) {
    const page = document.querySelector('.quiz-page');
    if (!page) return;

    const btnGrid = document.getElementById('quiz-view-grid');
    const btnList = document.getElementById('quiz-view-list');

    const apply = (view) => {
        const v = (view === 'list') ? 'list' : 'grid';
        page.dataset.view = v;
        try { localStorage.setItem(storageKey, v); } catch (_) {}
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            setTimeout(() => window.lucide.createIcons(), 0);
        }
    };

    const saved = (() => {
        try { return localStorage.getItem(storageKey); } catch { return null; }
    })();
    apply(saved || 'grid');

    btnGrid?.addEventListener('click', () => apply('grid'));
    btnList?.addEventListener('click', () => apply('list'));
}

function getSelectedSubjectId() {
    const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class") || "null");
    if (!selectedClass) return 1;
    if (selectedClass.subject_id != null && Number.isFinite(Number(selectedClass.subject_id))) {
        return Number(selectedClass.subject_id);
    }
    return resolveSubjectIdFromName(selectedClass.subject) ?? 1;
}

/** Resolve subject_id from class subject name (classes table has subject VARCHAR, not subject_id). */
function resolveSubjectIdFromName(subjectName) {
    if (!subjectName || typeof subjectName !== "string") return null;
    const mapping = {
        "Reading and Writing Skills": 1,
        "Oral Communication in Context": 2,
        "Creative Writing": 3,
        "Creative Non-Fiction": 4,
        "English for Academic and Professional Purposes": 5,
    };
    const normalized = String(subjectName).toLowerCase();
    if (normalized.includes("oral")) return 2;
    if (normalized.includes("reading")) return 1;
    if (normalized.includes("creative writing")) return 3;
    if (normalized.includes("creative non")) return 4;
    if (normalized.includes("academic")) return 5;
    return mapping[subjectName] ?? null;
}

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
});

document.addEventListener('DOMContentLoaded', async function() {
    if (!window.location.pathname.includes('pronunciation-lessons.html')) return;

    try {
        currentUser = await initializePage();

        // Grid/List view toggle for main content
        initQuizViewToggle('eel_pronunciation_view');

        // Show main app
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        // Only Built-in quizzes
        await loadPronunciationQuizzes(currentUser);

        // Back button
        document.getElementById("back-class-btn")?.addEventListener("click", () => {
            window.location.href = "classes.html";
        });

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
        // Student: show terms modal, then Proceed opens quiz in new tab
        openPronunciationQuizTermsModal(lessonId, false, '');
    }
}

let _pendingPronunciationQuiz = null;

function openPronunciationQuizTermsModal(quizId, isReview = false, quizTitle = '') {
    _pendingPronunciationQuiz = { quizId, isReview };
    const modal = document.getElementById('pronunciation-quiz-terms-modal');
    const nameEl = document.getElementById('pronunciation-quiz-terms-quiz-name');
    if (modal) modal.classList.remove('hidden');
    if (nameEl) nameEl.textContent = quizTitle || 'Quiz';
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons({ icons: lucide.icons });
}

function closePronunciationQuizTermsModal() {
    _pendingPronunciationQuiz = null;
    const modal = document.getElementById('pronunciation-quiz-terms-modal');
    if (modal) modal.classList.add('hidden');
}

function proceedToPronunciationQuizPage() {
    if (!_pendingPronunciationQuiz) return;
    const { quizId, isReview } = _pendingPronunciationQuiz;
    let url = `take-pronunciation.html?quiz_id=${encodeURIComponent(quizId)}&return=pronunciation-lessons.html`;
    if (isReview) url += '&review=1';
    window.open(url, '_blank');
    closePronunciationQuizTermsModal();
}

function updatePassagePlaceholder() {
    const difficultyEl = document.getElementById("lesson-difficulty");
    const passageField = document.getElementById("lesson-passage");
    if (!difficultyEl || !passageField) return;
    const difficulty = difficultyEl.value;

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
    if (!difficultySelect) return;

    // Set initial placeholder
    updatePassagePlaceholder();

    // Update when user changes difficulty
    difficultySelect.addEventListener("change", () => {
        updatePassagePlaceholder();

        // Optional: clear questions-container when switching levels
        const container = document.getElementById('questions-container');
        if (container) container.innerHTML = "";
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

    // ✅ get subject_id from localStorage (eel_selected_class)
    const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
    const subject_id = selectedClass?.subject_id || 1; // default to 1 if not set

    if (!title || !passage || !subject_id) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }

    const questions = Array.from(document.querySelectorAll('.question-item')).map(item => {
        if (difficulty === 'beginner' || difficulty === 'intermediate') {
            return {
                word: item.querySelector('.word')?.value || '',
                stressed_form: item.querySelector('.stressed')?.value || ''
            };
        } else if (difficulty === 'advanced') {
            return {
                sentence: item.querySelector('.sentence')?.value || '',
                reduced_form: item.querySelector('.reduced')?.value || '',
                full_sentence: item.querySelector('.full-sentence')?.value || ''
            };
        }
    }).filter(q => q); // remove undefined/null

    if (questions.length === 0) {
        showNotification('Please add at least one question', 'warning');
        return;
    }

    try {

            // ✅ Get current teacher ID
        const currentUser = JSON.parse(localStorage.getItem("eel_user") || "{}");
        const currentTeacherId = currentUser.user_id;
        const res = await fetch((window.API_BASE || "") + "/api/pronunciation-quizzes", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, difficulty, passage, questions, subject_id, user_id: currentTeacherId }) // ✅ send correct subject_id
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

let currentLessonId = null;

// Convert input to ISO string with +08:00
function toPHISOString(input) {
    if (!input) return null;
    return new Date(input + "+08:00").toISOString();
}

// Set min datetime in PH timezone for inputs
function getPHDateTimeLocal() {
    const now = new Date();
    const offset = 8 * 60 + now.getTimezoneOffset(); // +08:00 in minutes
    return new Date(now.getTime() + offset * 60000).toISOString().slice(0,16);
}

function openScheduleModal(quizId) {
    currentLessonId = quizId;
    const modal = document.getElementById('schedule-modal');
    modal.classList.remove('hidden');

    // Clear inputs
    document.getElementById('modal-unlock-time').value = '';
    document.getElementById('modal-lock-time').value = '';
    document.getElementById('modal-time-limit').value = '';
    document.getElementById('retake-option').value = 'all';
    document.getElementById('specific-students').selectedIndex = -1;
    document.getElementById('specific-students-container').classList.add('hidden');

    // Set min datetime
    const minDate = getPHDateTimeLocal();
    document.getElementById('modal-unlock-time').min = minDate;
    document.getElementById('modal-lock-time').min = minDate;

    // Store quizId in modal dataset for reference
    modal.dataset.quizId = quizId;
}

function closeScheduleModal() {
    const modal = document.getElementById('schedule-modal');
    modal.classList.add('hidden');
    currentLessonId = null;

    // Clear inputs
    document.getElementById('modal-unlock-time').value = '';
    document.getElementById('modal-lock-time').value = '';
    document.getElementById('modal-time-limit').value = '';
    document.getElementById('retake-option').value = 'all';
    document.getElementById('specific-students').selectedIndex = -1;
    document.getElementById('specific-students-container').classList.add('hidden');
}

// Show/hide specific students
const retakeOptionEl = document.getElementById('retake-option');
if (retakeOptionEl) {
    retakeOptionEl.addEventListener('change', (e) => {
        const container = document.getElementById('specific-students-container');
        if (container) container.classList.toggle('hidden', e.target.value !== 'specific');
    });
}

// Single save handler
const saveScheduleBtn = document.getElementById('save-schedule-btn');
if (saveScheduleBtn) {
    saveScheduleBtn.addEventListener('click', async () => {
    const modal = document.getElementById('schedule-modal');
    const quizId = modal.dataset.quizId;
    if (!quizId) return;

    let unlockTime = document.getElementById('modal-unlock-time').value;
    let lockTime   = document.getElementById('modal-lock-time').value;
    const timeLimit = document.getElementById('modal-time-limit').value || null;

    if (!unlockTime || !lockTime) {
        showNotification("Please select both unlock and lock times", "warning");
        return;
    }

    const retakeOption = document.getElementById('retake-option').value;
    let allowedStudents = [];
    if (retakeOption === 'specific') {
        allowedStudents = Array.from(document.getElementById('specific-students').selectedOptions)
            .map(opt => opt.value);
    }

    // Convert to PH timezone before sending
    unlockTime = toPHISOString(unlockTime);
    lockTime   = toPHISOString(lockTime);

    try {
        const res = await fetch(`${window.API_BASE || ""}/api/pronunciation-quizzes/${quizId}/schedule`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                unlock_time: unlockTime,
                lock_time: lockTime,
                status: 'scheduled',
                retake_option: retakeOption,
                allowed_students: allowedStudents,
                time_limit: timeLimit
            })
        });

        const data = await res.json();
        showNotification(data.success ? "Quiz schedule saved!" : "Failed to save schedule: " + data.message,
                        data.success ? "success" : "error");

        if (data.success) {
            closeScheduleModal();
            loadPronunciationQuizzes(getCurrentUser());
        }
    } catch (err) {
        console.error(err);
        showNotification("An error occurred while saving schedule.", "error");
    }
    });
}

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
        const res = await fetch(`${window.API_BASE || ""}/api/lock-pronunciation-quiz/${quizId}`, {
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
        const role = String(user?.role || '').toLowerCase();
        const isTeacher = role === "teacher";

        const myName = `${user?.fname || ''} ${user?.lname || ''}`.trim() || String(user?.email || '').trim() || 'Student';
        const myInitials = getInitials(myName);

        // ✅ Get selected class and resolve subject_id (class has subject name, not subject_id)
        const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class") || "null");
        let subjectId = selectedClass?.subject_id != null ? Number(selectedClass.subject_id) : null;
        if (subjectId == null || !Number.isFinite(subjectId)) {
            subjectId = resolveSubjectIdFromName(selectedClass?.subject) ?? 1;
        }

        // ✅ Fetch pronunciation quizzes
        const res = await fetch(
            `${window.API_BASE || ""}/api/pronunciation-quizzes?subject_id=${subjectId}` +
            (!isTeacher ? `&student_id=${user.user_id}` : "")
        );
        const quizzes = await res.json();

        // ✅ Ensure consistent ordering before numbering
        const diffOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        quizzes.sort((a, b) => {
            const da = diffOrder[a.difficulty] ?? 99;
            const db = diffOrder[b.difficulty] ?? 99;
            if (da !== db) return da - db;
            const qa = Number(a.quiz_number || 0);
            const qb = Number(b.quiz_number || 0);
            if (qa !== qb) return qa - qb;
            return (a.quiz_id || 0) - (b.quiz_id || 0);
        });

        // ✅ Fetch student attempts (if user is not a teacher)
        let studentAttempts = [];
        if (!isTeacher) {
            try {
                const attemptRes = await fetch(`${window.API_BASE || ""}/api/pronunciation-attempts?student_id=${user.user_id}`);
                const attemptData = await attemptRes.json();
                studentAttempts = attemptData.success ? attemptData.attempts : [];
            } catch (attemptErr) {
                console.error("Error loading attempts:", attemptErr);
            }
        }

        const container = document.getElementById("lessons-grid");
        container.innerHTML = "";
        container.className = "space-y-6";

        // ✅ Numbering (consecutive)
        // If your DB uses quiz_number 1..30, we display that.
        // If your DB restarts quiz_number per difficulty (1..10 each),
        // we compute a consecutive number using offsets.
        const hasGlobalQuizNumber = quizzes.some(q => Number(q.quiz_number || 0) > 10);
        let beginnerCount = 0, intermediateCount = 0, advancedCount = 0;
        const displayNumberByQuizId = new Map();
        quizzes.forEach(q => {
            let n;
            if (hasGlobalQuizNumber && q.quiz_number != null) n = Number(q.quiz_number);
            else {
                if (q.difficulty === "beginner") n = (++beginnerCount);
                else if (q.difficulty === "intermediate") n = 10 + (++intermediateCount);
                else if (q.difficulty === "advanced") n = 20 + (++advancedCount);
                else n = (beginnerCount + intermediateCount + advancedCount + 1);
            }
            displayNumberByQuizId.set(Number(q.quiz_id), n);
        });

        // ✅ Unlock progression (prefer backend progress, fallback to attempts)
        let unlockedUpTo = 1;
        if (!isTeacher) {
            const backendUnlockedUpTo = Math.max(
                1,
                ...quizzes.map(q => Number(q?.unlocked_quiz_number || 1))
            );
            unlockedUpTo = backendUnlockedUpTo;

            if (Array.isArray(studentAttempts) && studentAttempts.length) {
                const completedNums = new Set(
                    studentAttempts
                        .filter(a => a.status === "completed")
                        .map(a => displayNumberByQuizId.get(Number(a.quiz_id)))
                        .filter(Boolean)
                );
                let inferred = 1;
                while (completedNums.has(inferred)) inferred++;
                unlockedUpTo = Math.max(unlockedUpTo, inferred);
            }
        }

        // ✅ Loop through quizzes
        quizzes.forEach(quiz => {
            const backendLocked = (Number(quiz.is_locked) === 1) || (quiz.is_locked === true);
            const displayNum = displayNumberByQuizId.get(Number(quiz.quiz_id)) || 1;
            const effectiveLocked = isTeacher
                ? backendLocked
                : (displayNum === 1 ? false : (displayNum > unlockedUpTo));

            let actionButtons = "";
            let isCompleted = false;

            // ✅ TEACHER VIEW
            if (isTeacher) {
                actionButtons = `
                    <button class="btn btn-primary flex-1" onclick="event.stopPropagation(); openTeacherPronunciationReviewModal(${quiz.quiz_id})">
                        <i data-lucide="check-square" class="size-3 mr-1"></i>Review Answers
                    </button>
                    <button class="btn btn-outline flex-1" onclick="openLeaderboardModal(${quiz.quiz_id})">
                        <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>Leaderboard
                    </button>
                `;
            } 
            // ✅ STUDENT VIEW
            else {
                const studentAttempt = studentAttempts.find(a => a.quiz_id === quiz.quiz_id);

                let btnText = "Start Quiz";
                let btnIcon = "play";
                let btnDisabled = effectiveLocked;
                const isReview = !!studentAttempt && studentAttempt.status === "completed";
                const quizTitle = (quiz.title || "").replace(/"/g, "&quot;");
                let openAction = `openPronunciationQuizTermsModal(${quiz.quiz_id}, ${isReview}, this.getAttribute('data-quiz-title'))`;

                if (studentAttempt) {
                    if (studentAttempt.status === "completed") {
                        btnText = "Review Quiz";
                        btnIcon = "eye";
                        btnDisabled = false;
                    } else if (studentAttempt.status === "in_progress") {
                        btnText = "Continue Quiz";
                        btnIcon = "play";
                        btnDisabled = false;
                    }
                }

                actionButtons = `
                    <button 
                        class="btn btn-primary flex-1 ${btnDisabled ? "opacity-50 cursor-not-allowed" : ""}" 
                        ${btnDisabled ? "disabled" : ""}
                        data-quiz-title="${quizTitle}"
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

            // ✅ Determine numbering (consecutive)
            const quizNumber = displayNum;

            const teacherSubmissionsSlot = isTeacher ? `
                <div class="quiz-card-seen" data-quiz-submissions>
                    <div class="quiz-card-seen__avatars" aria-label="Students who completed this quiz"></div>
                </div>
            ` : "";

            const completedBadge = (!isTeacher && isCompleted) ? `
                <span class="mini-avatar mini-avatar--sm" title="Completed by you" aria-label="Completed by you">${escapeHtml(myInitials)}</span>
            ` : "";

            const scheduleStatusLabel = isTeacher
                ? (effectiveLocked ? "Locked" : "Open to students")
                : (effectiveLocked ? "Locked (finish previous quiz to unlock)" : "Unlocked");

            // ✅ Card — same structure as reading-lessons (created-quiz-card__inner)
            const quizCard = document.createElement("div");
            quizCard.className = "card created-quiz-card group";
            quizCard.dataset.quizId = String(quiz.quiz_id);
            quizCard.innerHTML = `
                <div class="created-quiz-card__inner">
                    <div class="created-quiz-card__header" role="button" tabindex="0" aria-expanded="false" aria-label="Expand quiz details">
                        <div class="created-quiz-card__icon" aria-hidden="true">
                            <i data-lucide="mic" class="created-quiz-card__icon-svg"></i>
                        </div>
                        <div class="created-quiz-card__title-wrap">
                            <h3 class="created-quiz-card__title">${escapeHtml(quizNumber + ". " + quiz.title)}</h3>
                            ${completedBadge}
                        </div>
                        <i data-lucide="chevron-down" class="created-quiz-card__chevron" aria-hidden="true"></i>
                    </div>
                    <div class="created-quiz-card__details hidden">
                        <p class="created-quiz-card__passage">${escapeHtml(quiz.passage ? quiz.passage.substring(0, 140).trim() + (quiz.passage.length > 140 ? "…" : "") : "No description available.")}</p>
                        <div class="created-quiz-card__schedule">
                            <span class="created-quiz-card__schedule-text">${scheduleStatusLabel}</span>
                        </div>
                        ${teacherSubmissionsSlot}
                        <div class="quiz-actions created-quiz-card__actions">${actionButtons}</div>
                    </div>
                </div>
            `;

            const header = quizCard.querySelector(".created-quiz-card__header");
            const details = quizCard.querySelector(".created-quiz-card__details");
            const toggle = () => {
                const wasHidden = details.classList.contains("hidden");
                details.classList.toggle("hidden");
                header.setAttribute("aria-expanded", wasHidden);
                quizCard.classList.toggle("created-quiz-card--open", wasHidden);
                if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
            };
            header.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
            header.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
            quizCard.querySelectorAll(".quiz-actions .btn").forEach(btn => btn.addEventListener("click", (e) => e.stopPropagation()));

            container.appendChild(quizCard);
        });

        if (quizzes.length === 0) {
            const emptyEl = document.createElement("p");
            emptyEl.className = "text-center text-muted-foreground py-8";
            emptyEl.textContent = "No pronunciation quizzes available for this subject yet.";
            container.appendChild(emptyEl);
        }

        lucide.createIcons({ icons: lucide.icons });

    } catch (err) {
        console.error("Error loading pronunciation quizzes:", err);
        const container = document.getElementById("lessons-grid");
        container.innerHTML = '<p class="text-center text-red-500">Failed to load quizzes.</p>';
    }
}

async function loadPronunciationQuizzesTeacher(user) {
    try {
        if (!user || user.role !== "teacher") return;

        // ✅ Fetch teacher's quizzes
        const res = await fetch(`${window.API_BASE || ""}/api/teacher/pronunciation-quizzes?user_id=${user.user_id}`);
        const quizzes = await res.json();
        const diffOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        quizzes.sort((a, b) => {
            const da = diffOrder[a.difficulty] ?? 99;
            const db = diffOrder[b.difficulty] ?? 99;
            if (da !== db) return da - db;
            const ta = new Date(a.created_at || 0).getTime();
            const tb = new Date(b.created_at || 0).getTime();
            if (ta !== tb) return ta - tb;
            return (a.quiz_id || 0) - (b.quiz_id || 0);
        });

        const container = document.getElementById("created-lessons-grid");
        container.innerHTML = "";
        container.className = "space-y-6";

        // ✅ Consecutive numbering across all difficulties
        let seq = 1;

        quizzes.forEach(quiz => {
            const now = new Date();
            const unlockTime = quiz.unlock_time ? new Date(quiz.unlock_time.replace(" ", "T")) : null;
            const lockTime = quiz.lock_time ? new Date(quiz.lock_time.replace(" ", "T")) : null;

            const backendLocked = Number(quiz.is_locked) === 1;
            const notYetUnlocked = unlockTime && now < unlockTime;
            const alreadyClosed = lockTime && now > lockTime;
            const isLocked = backendLocked || notYetUnlocked || alreadyClosed;

            // ✅ Teacher action buttons
            const actionButtons = `
                <button class="btn btn-outline flex-1" onclick="openLeaderboardModal(${quiz.quiz_id})">
                    <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>Leaderboard
                </button>
                <button 
                    class="btn btn-primary flex-1"
                    onclick="${isLocked ? `openScheduleModal(${quiz.quiz_id})` : `lockPronunciationQuiz(${quiz.quiz_id})`}">
                    <i data-lucide="${isLocked ? "send" : "ban"}" class="size-3 mr-1"></i>
                    ${isLocked ? "Publish" : "Unpublish"}
                </button>
            `;

            // ✅ Determine numbering (consecutive)
            const quizNumber = seq++;

            // ✅ Quiz card — same structure as reading (created-quiz-card__inner)
            const quizCard = document.createElement("div");
            quizCard.className = "card created-quiz-card group";
            quizCard.dataset.quizId = String(quiz.quiz_id);
            quizCard.innerHTML = `
                <div class="created-quiz-card__inner">
                    <div class="created-quiz-card__header" role="button" tabindex="0" aria-expanded="false" aria-label="Expand quiz details">
                        <div class="created-quiz-card__icon" aria-hidden="true">
                            <i data-lucide="mic" class="created-quiz-card__icon-svg"></i>
                        </div>
                        <div class="created-quiz-card__title-wrap">
                            <h3 class="created-quiz-card__title">${escapeHtml(quizNumber + ". " + quiz.title)}</h3>
                        </div>
                        <i data-lucide="chevron-down" class="created-quiz-card__chevron" aria-hidden="true"></i>
                    </div>
                    <div class="created-quiz-card__details hidden">
                        <p class="created-quiz-card__passage">${escapeHtml(quiz.passage ? quiz.passage.substring(0, 140).trim() + (quiz.passage.length > 140 ? "…" : "") : "No description available.")}</p>
                        <div class="created-quiz-card__schedule">
                            <i data-lucide="calendar-clock" class="created-quiz-card__schedule-icon" aria-hidden="true"></i>
                            <span class="created-quiz-card__schedule-text">Start: ${quiz.unlock_time ? formatDateTime(quiz.unlock_time) : "Not set"} · Deadline: ${quiz.lock_time ? formatDateTime(quiz.lock_time) : "Not set"}</span>
                        </div>
                        <div class="quiz-actions created-quiz-card__actions">${actionButtons}</div>
                    </div>
                </div>
            `;

            const header = quizCard.querySelector(".created-quiz-card__header");
            const details = quizCard.querySelector(".created-quiz-card__details");
            const toggle = () => {
                const wasHidden = details.classList.contains("hidden");
                details.classList.toggle("hidden");
                header.setAttribute("aria-expanded", wasHidden);
                quizCard.classList.toggle("created-quiz-card--open", wasHidden);
                if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
            };
            header.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
            header.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
            quizCard.querySelectorAll(".quiz-actions .btn").forEach(btn => btn.addEventListener("click", (e) => e.stopPropagation()));

            container.appendChild(quizCard);
        });

        lucide.createIcons({ icons: lucide.icons });

    } catch (err) {
        console.error("Error loading teacher quizzes:", err);
        const container = document.getElementById("created-lessons-grid");
        container.innerHTML = '<p class="text-center text-red-500">Failed to load your quizzes.</p>';
    }
}


// ============================================
// TAKE QUIZ MODAL
// ============================================
async function openPronunciationModal(quizId) {
    try {
        const res = await fetch(`${window.API_BASE || ""}/api/pronunciation-quizzes/${quizId}`);
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

function escapeAttr(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function speakPronunciationWord(text, slowMo) {
    if (!text || typeof text !== 'string') return;
    const t = text.trim();
    if (!t) return;
    if (!window.speechSynthesis) {
        if (typeof showNotification === 'function') showNotification('Audio playback is not supported in this browser.', 'warning');
        return;
    }
    const utterance = new SpeechSynthesisUtterance(t);
    utterance.lang = 'en-US';
    utterance.rate = slowMo ? 0.5 : 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function loadPronunciationQuestion(index) {
    const quiz = pronunciationQuizData;
    if (!quiz || !quiz.questions || !quiz.questions[index]) return;

    const q = quiz.questions[index];
    document.getElementById('pronunciation-question-num').textContent = `Question ${index+1} of ${quiz.questions.length}`;

    const pronunciationText = q.answer || q.correct_pronunciation || q.stressed_syllable || '';
    const wordToSpeak = q.word || q.sentence || '';
    const sentenceToSpeak = q.sentence || '';
    const speakerSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    const speakerSvgSmall = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    const slowmoSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg><span class="pronunciation-slowmo-label">Slow</span>';
    const slowmoSvgSmall = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg><span class="pronunciation-slowmo-label">Slow</span>';
    let contentHtml = '';
    if (quiz.difficulty === 'beginner' || quiz.difficulty === 'intermediate') {
        const ipa = pronunciationText ? (pronunciationText.startsWith('/') ? pronunciationText : '/' + pronunciationText + '/') : '';
        contentHtml = `
            <div class="pronunciation-prompt-card">
                <span class="pronunciation-prompt-label">Word to Pronounce</span>
                <div class="pronunciation-word-block">
                    <div class="pronunciation-word-row">
                        <span class="word-large">${q.word || q.sentence || '(No content)'}</span>
                        ${wordToSpeak ? `<button type="button" class="pronunciation-speaker-btn" data-speak="${escapeAttr(wordToSpeak)}" data-slowmo="0" aria-label="Listen to pronunciation">${speakerSvg}</button><button type="button" class="pronunciation-speaker-btn pronunciation-speaker-btn-slowmo" data-speak="${escapeAttr(wordToSpeak)}" data-slowmo="1" aria-label="Listen at slow speed">${slowmoSvg}</button>` : ''}
                    </div>
                    ${ipa ? `<span class="pronunciation-ipa">${ipa}</span>` : ''}
                </div>
            </div>
        `;
    } else {
        contentHtml = `
            <div class="pronunciation-prompt-card">
                <span class="pronunciation-prompt-label">Sentence to Say</span>
                <div class="sentence-display">
                    <p class="sentence-text">${q.sentence || '(No sentence)'}${sentenceToSpeak ? ` <button type="button" class="pronunciation-speaker-btn pronunciation-speaker-btn-inline" data-speak="${escapeAttr(sentenceToSpeak)}" data-slowmo="0" aria-label="Listen to pronunciation">${speakerSvgSmall}</button><button type="button" class="pronunciation-speaker-btn pronunciation-speaker-btn-inline pronunciation-speaker-btn-slowmo" data-speak="${escapeAttr(sentenceToSpeak)}" data-slowmo="1" aria-label="Listen at slow speed">${slowmoSvgSmall}</button>` : ''}</p>
                    ${q.reduced_form ? `<p class="reduced-form"><strong>Reduced form:</strong> <span class="highlight">${q.reduced_form}</span></p>` : ''}
                </div>
            </div>
        `;
    }

    document.getElementById('pronunciation-content').innerHTML = contentHtml;

    document.querySelectorAll('#pronunciation-content .pronunciation-speaker-btn').forEach((btn) => {
        const text = btn.getAttribute('data-speak') || '';
        const slowMo = btn.getAttribute('data-slowmo') === '1';
        if (text) btn.addEventListener('click', () => speakPronunciationWord(text, slowMo));
    });

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

function canUseMicrophone() {
    if (typeof window === 'undefined') return false;
    if (!window.isSecureContext) return false;
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') return false;
    return true;
}

async function toggleRecording() {
    const recordBtn = document.getElementById('record-btn');
    const idle = document.getElementById('recording-idle');
    const active = document.getElementById('recording-active');
    const complete = document.getElementById('recording-complete');
    const recordedControls = document.getElementById('recorded-controls');

    if (!canUseMicrophone()) {
        showNotification(
            'Voice recording requires HTTPS. Use https:// instead of http:// (see DEPLOYMENT-EC2.md for setup).',
            'error'
        );
        return;
    }

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
                document.getElementById('recording-feedback')?.classList.add('hidden');
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

                const q = pronunciationQuizData.questions[pronunciationCurrentIndex];
                pronunciationAnswers[pronunciationCurrentIndex] = { 
                    blob, 
                    transcript: recognitionTranscript || '', 
                    questionId: q.question_id
                };

                recognitionTranscript = '';

                // Show recording complete feedback (real score comes from backend on submit)
                const feedbackEl = document.getElementById('recording-feedback');
                if (feedbackEl) {
                    feedbackEl.classList.remove('hidden');
                    const charImg = feedbackEl.querySelector('#recording-feedback-character') || feedbackEl.querySelector('.recording-feedback-character');
                    if (charImg) {
                        charImg.src = 'image/eel-character-celebrate.png';
                        charImg.alt = 'EEL character';
                    }
                    const scoreEl = feedbackEl.querySelector('.recording-score');
                    const msgEl = feedbackEl.querySelector('.recording-feedback-msg');
                    if (scoreEl) {
                        scoreEl.textContent = '';
                        scoreEl.style.display = 'none';
                    }
                    if (msgEl) msgEl.textContent = 'Recording saved! Submit to see your pronunciation score.';
                }
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
            let msg = "Unable to access microphone.";
            if (err.name === 'NotAllowedError') {
                msg = "Microphone access denied. Please allow microphone permission in your browser.";
            } else if (err.name === 'NotFoundError') {
                msg = "No microphone found. Please connect a microphone and try again.";
            } else if (err.name === 'SecurityError' || !window.isSecureContext) {
                msg = "Voice recording requires HTTPS. Use https:// instead of http://.";
            } else if (err.message) {
                msg = err.message;
            }
            showNotification(msg, "error");
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

        const res = await fetch((window.API_BASE || "") + "/api/pronunciation-check", {
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
        const res = await fetch((window.API_BASE || "") + "/api/pronunciation-check", {
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
    document.getElementById('recording-feedback')?.classList.add('hidden');

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
  const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class") || "null");
  const classId = selectedClass?.id ?? selectedClass?.class_id ?? localStorage.getItem("eel_selected_class_id");
  if (classId) formData.append('class_id', classId);

  try {
    const res = await fetch((window.API_BASE || "") + "/api/pronunciation-submit", {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      // ✅ Close quiz modal
      closeTakePronunciationModal();
      showQuizResult(data.accuracy);

      if (data.unlockedNext) {
        showNotification?.("Great job! Next quiz unlocked.", "success");
      }

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

  const totalAccuracy = Math.max(0, Math.min(parseFloat(accuracyValue) || 0, 100));
  scoreElem.textContent = `${Math.round(totalAccuracy)}%`;

  if (totalAccuracy >= 90) {
    feedbackElem.textContent = "🌟 Excellent pronunciation! Keep it up!";
    feedbackIcon.textContent = "🌟";
  } else if (totalAccuracy >= 85) {
    feedbackElem.textContent = "👏 Great job! A little more practice and you'll be perfect!";
    feedbackIcon.textContent = "👏";
  } else if (totalAccuracy >= 70) {
    feedbackElem.textContent = "💪 Good effort! Keep practicing — you're improving!";
    feedbackIcon.textContent = "💪";
  } else if (totalAccuracy >= 50) {
    feedbackElem.textContent = "📢 Keep practicing! Focus on clear pronunciation and try again.";
    feedbackIcon.textContent = "📢";
  } else {
    feedbackElem.textContent = "🎯 Don't give up! Listen to the word again and practice speaking it clearly.";
    feedbackIcon.textContent = "🎯";
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
    const res = await fetch(`${window.API_BASE || ""}/api/pronunciation-review?student_id=${studentId}&quiz_id=${quizId}`);
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

function refreshLeaderboard() {
    if (_pronunciationLeaderboardQuizId != null) {
        openLeaderboardModal(_pronunciationLeaderboardQuizId, _pronunciationLeaderboardClassId);
    }
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

let _pronunciationLeaderboardQuizId = null;
let _pronunciationLeaderboardClassId = null;

async function openLeaderboardModal(quizId, classId) {
    _pronunciationLeaderboardQuizId = quizId;
    _pronunciationLeaderboardClassId = classId || null;
    const modal = document.getElementById("leaderboard-modal");
    const body = document.getElementById("leaderboard-body");
    const quizName = document.getElementById("quiz-name");

    try {
        const res = await fetch(`${window.API_BASE || ""}/api/leaderboard?quiz_id=${quizId}${classId ? `&class_id=${classId}` : ''}`);
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


        // Table: from 4th onwards only (top 3 are on the podium)
        const tableEntries = leaderboard.filter(e => e.rank > 3);
        if (leaderboard.length === 0) {
            body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--muted-foreground);">No attempts yet.</td></tr>`;
        } else if (tableEntries.length === 0) {
            body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--muted-foreground);">Top 3 shown above. No other rankings.</td></tr>`;
        } else {
            tableEntries.forEach(entry => {
                const row = document.createElement("tr");
                row.className = "leaderboard-table-row";

                const duration = formatDuration(entry.start_time, entry.end_time);

                row.innerHTML = `
                    <td><span class="rank-badge">${entry.rank}</span></td>
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
        }

        modal.classList.remove("hidden");
        if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
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
    return date.toLocaleDateString('en-PH', { // 'en-PH' para sa English, Philippine format
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Manila'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
    });
}

async function loadLessonsAndTopics() {
  try {
    const classId = localStorage.getItem("eel_selected_class_id");
    if (!classId) return console.error("No class_id found in localStorage");

    const topicSelect = document.getElementById('ai-topic');
    if (!topicSelect) return console.error("Element with id 'ai-topic' not found in DOM");

    topicSelect.innerHTML = '<option>Loading...</option>';

    const res = await fetch(`${window.API_BASE || ""}/api/lessons-with-topics?class_id=${classId}`);
    const raw = await res.json();
    const data = Array.isArray(raw) ? raw : (raw.lessons || []);

    if (!Array.isArray(data) || data.length === 0) {
      if (data.length === 0) topicSelect.innerHTML = '<option>No topics found</option>';
      else { console.error("Invalid data format:", raw); topicSelect.innerHTML = '<option>Error loading topics</option>'; }
      return;
    }

    // ✅ Build optgroups for lessons
    topicSelect.innerHTML = '<option value="">Select a topic</option>';
    data.forEach(lesson => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = lesson.lesson_title;

      lesson.topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic.topic_id;
        option.textContent = topic.topic_title;
        optgroup.appendChild(option);
      });

      topicSelect.appendChild(optgroup);
    });
  } catch (err) {
    console.error('Error loading lessons and topics:', err);
    const topicSelect = document.getElementById('ai-topic');
    if (topicSelect) topicSelect.innerHTML = '<option>Error loading topics</option>';
  }
}

async function generatePronunciationQuiz() {
  const topicId = document.getElementById('ai-topic').value;
  const difficulty = document.getElementById('ai-difficulty').value;
  const numQuestions = parseInt(document.getElementById('ai-num-questions').value, 10) || 5;
  const additionalContext = document.getElementById('ai-context').value;

  if (!topicId) {
    if (typeof showNotification === "function") showNotification("Please select a topic first.", "warning");
    else alert("Please select a topic first.");
    return;
  }

  const btn = document.getElementById('ai-generate-btn');
  const generatedSection = document.getElementById("ai-generated-section");
  const container = document.getElementById("ai-questions-container");
  if (!btn || !generatedSection || !container) return;

  btn.disabled = true;
  btn.innerHTML = "<span>⏳ Generating...</span>";

  try {
    const res = await fetch((window.API_BASE || "") + "/api/generate-pronunciation-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic_id: topicId, difficulty, num_questions: numQuestions, additional_context: additionalContext })
    });

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      console.error("Parse error:", parseErr);
      if (typeof showNotification === "function") showNotification("Server returned invalid response. Try again.", "error");
      else alert("Server returned invalid response. Try again.");
      return;
    }

    if (!res.ok) {
      const msg = data.message || "Request failed (" + res.status + "). Try again.";
      if (typeof showNotification === "function") showNotification(msg, "error");
      else alert(msg);
      return;
    }
    if (!data.success) {
      const msg = data.message || "Generation failed.";
      if (typeof showNotification === "function") showNotification(msg, "error");
      else alert(msg);
      return;
    }

    generatedSection.classList.remove("hidden");

    const rawQuiz = data.quiz != null ? String(data.quiz).trim() : "";
    container.innerHTML = "";

    if (!rawQuiz) {
      const passageEl = document.getElementById("ai-generated-passage");
      if (passageEl) passageEl.value = "";
      container.innerHTML = "<p class=\"text-muted-foreground text-sm\">No content was returned. Try again or add more instructions.</p>";
      document.getElementById("ai-save-btn").disabled = true;
      return;
    }

    const passageEl = document.getElementById("ai-generated-passage");
    if (passageEl) passageEl.value = rawQuiz;

    const lines = rawQuiz.split("\n").map(l => l.trim()).filter(l => l);
    if (lines.length === 0) {
      container.innerHTML = "<p class=\"text-muted-foreground text-sm\">No lines were parsed. Try Regenerate or add instructions.</p>";
    } else {
      lines.forEach((line, i) => {
        const colonIdx = line.indexOf(":");
        const word = colonIdx >= 0 ? line.slice(0, colonIdx).trim() : line.trim();
        const answer = colonIdx >= 0 ? line.slice(colonIdx + 1).trim() : "";
        const div = document.createElement("div");
        div.className = "question-item ai-question-item";
        div.innerHTML = `
          <div class="ai-question-item__header">
            <h4 class="ai-question-item__title">Word ${i + 1}</h4>
            <button type="button" class="ai-question-remove-btn" onclick="this.closest('.question-item').remove()">Remove</button>
          </div>
          <input type="text" class="form-input ai-question-input" placeholder="Word" value="${escapeHtml(word)}">
          <input type="text" class="form-input" placeholder="Correct Pronunciation" value="${escapeHtml(answer)}">
        `;
        container.appendChild(div);
      });
    }

    const saveBtn = document.getElementById("ai-save-btn");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.style.opacity = 1;
    }
  } catch (err) {
    console.error("Error generating quiz:", err);
    const msg = err.message || "Network or server error. Please try again.";
    if (typeof showNotification === "function") showNotification(msg, "error");
    else alert(msg);
    generatedSection.classList.remove("hidden");
    container.innerHTML = "<p class=\"text-muted-foreground text-sm\">Generation failed. Check your connection and try again.</p>";
  } finally {
    btn.disabled = false;
    btn.innerHTML = "<i data-lucide=\"sparkles\" class=\"size-5\"></i><span>Generate quiz with AI</span>";
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }
}


async function saveAIPronunciationQuiz() {
    const titleEl = document.getElementById("ai-topic"); // using topic as title
    const subjectIdEl = document.getElementById("ai-topic"); // same select for subject_id?
    const difficultyEl = document.getElementById("ai-difficulty");
    const passageEl = document.getElementById("ai-generated-passage");

    if (!titleEl || !subjectIdEl || !difficultyEl || !passageEl) {
        console.error("One or more required fields are missing in the HTML.");
        return;
    }

    const title = titleEl.value; // could also get selected text: titleEl.selectedOptions[0].text
    const subject_id = subjectIdEl.value; // assuming your backend expects a subject ID
    const difficulty = difficultyEl.value;
    const passage = passageEl.value;

    const questionItems = document.querySelectorAll(".question-item");
    const questions = Array.from(questionItems).map(q => ({
        word: q.querySelector('input[placeholder="Word"]').value,
        answer: q.querySelector('input[placeholder="Correct Pronunciation"]').value
    }));

    const teacher_id = window.currentUserId;  

    const res = await fetch((window.API_BASE || "") + "/api/save-pronunciation-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, teacher_id, subject_id, difficulty, passage, questions })
    });

    const data = await res.json();
    if (data.success) alert("Quiz saved! ID: " + data.quiz_id);
    else alert("Error saving quiz: " + data.message);
}


// Open AI Quiz Generator Modal
function openAIModal() {
    const modal = document.getElementById('ai-quiz-generator-modal');
    if (!modal) return console.error('AI Quiz Generator modal not found!');

    modal.classList.remove('hidden');
    modal.style.opacity = 0;

    let op = 0;
    const fadeIn = setInterval(() => {
        if (op >= 1) {
            clearInterval(fadeIn);
            if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
        }
        modal.style.opacity = op;
        op += 0.1;
    }, 30);

    loadLessonsAndTopics();
}


// Close AI Quiz Generator Modal
function closeAIModal() {
    const modal = document.getElementById('ai-quiz-generator-modal');
    if (!modal) return;

    modal.classList.add('hidden'); // Hide the modal
}

// ============================================================
// TEACHER: Review + override pronunciation scoring
// ============================================================
function escapeHtml(str) {
    return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getInitials(name) {
    const parts = String(name ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const initials = parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join("");
    return initials || "S";
}

let teacherPronReviewState = {
    quizId: null,
    attemptId: null,
    quiz: null,
    attempts: []
};

function closeTeacherPronunciationReviewModal() {
    const modal = document.getElementById('teacher-pronunciation-review-modal');
    modal?.classList.add('hidden');
    teacherPronReviewState = { quizId: null, attemptId: null, quiz: null, attempts: [] };

    const list = document.getElementById('teacher-pron-attempts-list');
    const detail = document.getElementById('teacher-pron-attempt-detail');
    const title = document.getElementById('teacher-pron-review-quiz-title');
    const saveBtn = document.getElementById('teacher-pron-review-save-btn');
    if (list) list.innerHTML = '';
    if (detail) detail.innerHTML = `<div class="lesson-teacher-review-empty"><i data-lucide="user-check" class="lesson-teacher-review-empty-icon" aria-hidden="true"></i><p class="lesson-teacher-review-empty-text">Select a submission from the list to view answers.</p></div>`;
    if (title) title.textContent = 'Quiz';
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    if (saveBtn) saveBtn.classList.add('hidden');
}

async function openTeacherPronunciationReviewModal(quizId) {
    const user = getCurrentUser();
    const role = String(user?.role || '').toLowerCase();
    if (!user || role !== 'teacher') return;

    const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
    const classId = selectedClass?.id;

    teacherPronReviewState.quizId = quizId;

    const modal = document.getElementById('teacher-pronunciation-review-modal');
    modal?.classList.remove('hidden');

    const titleEl = document.getElementById('teacher-pron-review-quiz-title');
    if (titleEl) titleEl.textContent = 'Loading...';

    try {
        const quizRes = await fetch(`${window.API_BASE || ""}/api/pronunciation-quizzes/${quizId}`);
        teacherPronReviewState.quiz = await quizRes.json();
        if (titleEl) titleEl.textContent = teacherPronReviewState.quiz?.title || `Quiz #${quizId}`;

        const attemptsRes = await fetch(
            `${window.API_BASE || ""}/api/teacher/pronunciation-attempts?quiz_id=${quizId}` +
            (classId ? `&class_id=${classId}` : '')
        );
        const attemptsData = await attemptsRes.json();
        teacherPronReviewState.attempts = attemptsData?.attempts || [];
        renderTeacherPronAttemptsList();

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    } catch (e) {
        console.error(e);
        showNotification?.("Failed to load attempts.", "error");
    }
}

function renderTeacherPronAttemptsList() {
    const list = document.getElementById('teacher-pron-attempts-list');
    if (!list) return;

    const attempts = teacherPronReviewState.attempts || [];
    if (!attempts.length) {
        list.innerHTML = `<div class="lesson-teacher-review-list-empty">No submissions yet.</div>`;
        return;
    }

    list.innerHTML = attempts.map(a => {
        const name = a.student_name || `Student #${a.student_id}`;
        const initials = getInitials(name);
        const score = a.score != null ? `${a.score}` : '-';
        const isActive = Number(teacherPronReviewState.attemptId) === Number(a.attempt_id);
        const cheated = !!(a.cheating_voided || (a.cheating_violations && a.cheating_violations > 0));
        const cheatTitle = a.cheating_voided
            ? 'Left fullscreen or switched tabs multiple times. Score set to 0.'
            : `Left fullscreen or switched tabs (${a.cheating_violations || 0} time(s)).`;
        const cheatBadge = cheated ? `<span class="text-xs px-1 py-0.5 rounded bg-destructive/20 text-destructive shrink-0" title="${escapeHtml(cheatTitle)}">⚠</span>` : '';
        return `
            <button
              type="button"
              class="btn btn-outline w-full justify-between teacher-attempt-item ${isActive ? 'is-active' : ''}"
              onclick="loadTeacherPronAttempt(${a.attempt_id})"
              style="display:flex; align-items:center; gap:.5rem;"
            >
              <span class="student-chip" style="min-width:0;">
                <span class="mini-avatar" aria-hidden="true">${escapeHtml(initials)}</span>
                <span style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${escapeHtml(name)}
                </span>
              </span>
              <span class="teacher-attempt-meta">
                <span class="text-xs teacher-attempt-score shrink-0">${escapeHtml(score)}</span>${cheatBadge}
              </span>
            </button>
        `;
    }).join('');
}

async function loadTeacherPronAttempt(attemptId) {
    const saveBtn = document.getElementById('teacher-pron-review-save-btn');
    if (saveBtn) saveBtn.classList.add('hidden');

    teacherPronReviewState.attemptId = attemptId;
    const detail = document.getElementById('teacher-pron-attempt-detail');
    if (detail) detail.innerHTML = `<div class="lesson-teacher-review-empty"><i data-lucide="loader" class="lesson-teacher-review-empty-icon" aria-hidden="true"></i><p class="lesson-teacher-review-empty-text">Loading answers...</p></div>`;
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();

    try {
        const res = await fetch(`${window.API_BASE || ""}/api/teacher/pronunciation-attempts/${attemptId}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed");

        const answers = data.answers || [];
        const attempt = data.attempt || {};
        const cheated = !!(attempt.cheating_voided || (attempt.cheating_violations && attempt.cheating_violations > 0));
        const cheatBanner = cheated
            ? `<div class="p-3 mb-4 rounded-lg flex items-start gap-2 ${attempt.cheating_voided ? 'bg-destructive/20 text-destructive' : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'}">
                <span class="text-lg shrink-0" aria-hidden="true">⚠️</span>
                <div>
                <strong>${attempt.cheating_voided ? 'Quiz voided (0 score)' : 'Warning'}:</strong>` +
                (attempt.cheating_voided
                    ? ' Student left fullscreen or switched tabs multiple times. Score set to 0.'
                    : ` Student left fullscreen or switched tabs (${attempt.cheating_violations || 0} time(s)).`) +
                '</div></div>'
            : '';
        detail.innerHTML = (cheatBanner || '') + answers.map(a => {
            const current = (a.teacher_score != null) ? a.teacher_score : a.pronunciation_score;
            return `
              <div class="card teacher-pron-answer-row" style="margin:0;" data-answer-id="${a.answer_id}">
                <div class="card-header">
                  <div class="card-title">${escapeHtml(a.question_text || 'Item')}</div>
                  <div class="card-description">Target: ${escapeHtml(a.correct_pronunciation || '-')}</div>
                </div>
                <div class="card-content space-y-2">
                  <div class="grid md:grid-cols-2 gap-3">
                    <div>
                      <div class="text-xs text-muted-foreground">Transcript (student)</div>
                      <div class="p-3 rounded-lg border border-border bg-background" style="white-space:pre-wrap;">${escapeHtml(a.transcript || '')}</div>
                    </div>
                    <div class="space-y-2">
                      <div class="text-xs text-muted-foreground">Audio</div>
                      <audio controls src="${escapeHtml(a.student_audio || '')}" style="width:100%;"></audio>
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs text-muted-foreground">Score</span>
                        <input class="form-input teacher-pron-score" type="number" step="0.1" min="0" max="100" value="${current ?? 0}" style="width:110px;" />
                      </div>
                      <div>
                        <div class="text-xs text-muted-foreground">Teacher note (optional)</div>
                        <input class="form-input teacher-pron-notes" type="text" value="${escapeHtml(a.teacher_notes || '')}" placeholder="e.g. ok but case/small letter..." />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
        }).join('') || `<div class="text-muted-foreground">No answers found.</div>`;

        if (saveBtn) saveBtn.classList.remove('hidden');

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    } catch (e) {
        console.error(e);
        showNotification?.("Failed to load answers.", "error");
    }
}

async function saveTeacherPronunciationOverrides() {
    const user = getCurrentUser();
    if (!user || user.role !== 'teacher') return;

    const attemptId = teacherPronReviewState.attemptId;
    if (!attemptId) return;

    const answers = [];
    document.querySelectorAll('#teacher-pron-attempt-detail .teacher-pron-answer-row').forEach(row => {
        const answerId = Number(row.getAttribute('data-answer-id'));
        const scoreInput = row.querySelector('.teacher-pron-score');
        const notesInput = row.querySelector('.teacher-pron-notes');
        answers.push({
            answer_id: answerId,
            teacher_score: scoreInput ? Number(scoreInput.value) : null,
            teacher_notes: notesInput ? String(notesInput.value || '') : ''
        });
    });

    try {
        const res = await fetch(`${window.API_BASE || ""}/api/teacher/pronunciation-attempts/${attemptId}/override`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacher_id: user.user_id, answers })
        });
        const data = await res.json();
        if (!data.success) {
            showNotification?.("Failed to save adjustments.", "error");
            return;
        }

        showNotification?.("Adjustments saved.", "success");
        await openTeacherPronunciationReviewModal(teacherPronReviewState.quizId);
        await loadTeacherPronAttempt(attemptId);
    } catch (e) {
        console.error(e);
        showNotification?.("Failed to save adjustments.", "error");
    }
}

    