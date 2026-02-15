let currentUser = null;

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
    if (!window.location.pathname.includes('reading-lessons.html')) return;

    try {
        currentUser = await initializePage();

        // Grid/List view toggle for main content
        initQuizViewToggle('eel_reading_view');

        // Show main app
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        const lessonsGrid = document.getElementById('lessons-grid');
        if (lessonsGrid) lessonsGrid.classList.remove('hidden');
        const createdGrid = document.getElementById('created-lessons-grid');
        const urlParams = new URLSearchParams(window.location.search);
        const openQuizId = urlParams.get('open_quiz_id');
        if (createdGrid) {
            if (openQuizId) {
                createdGrid.classList.remove('hidden');
            } else {
                createdGrid.classList.add('hidden');
            }
        }

        await loadQuizzes(currentUser);
        if (createdGrid && openQuizId) {
            await loadQuizzesTeacher();
            if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
            const qid = parseInt(openQuizId, 10);
            if (!isNaN(qid)) {
                window.history.replaceState({}, document.title, window.location.pathname);
                setTimeout(function () { startLesson(qid, true); }, 300);
            }
        }

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

function createNewLesson() {
    const modal = document.getElementById('create-lesson-modal');
    const container = document.getElementById('questions-container');

    // Clear inputs
    document.getElementById('lesson-title').value = '';
    document.getElementById('lesson-passage').value = '';
    document.getElementById('lesson-difficulty').value = 'beginner'; // default
    container.innerHTML = ''; // clear old questions
    addQuestion(); // initialize with one empty question

    // Set save button to create mode
    const saveButton = document.getElementById('save-lesson-btn');
    saveButton.onclick = saveLesson;

    // Show modal
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('create-lesson-modal').classList.add('hidden');
}

const difficultySelect = document.getElementById("lesson-difficulty");
const questionsContainer = document.getElementById("questions-container");
const addQuestionBtn = document.getElementById("add-question-btn");
const passageInput = document.getElementById("lesson-passage");

difficultySelect.addEventListener("change", function () {
    const level = this.value;
    questionsContainer.innerHTML = "";
    addQuestionBtn.classList.add("hidden");

    if (level === "beginner") {
        // Multiple Choice
        addQuestionBtn.classList.remove("hidden");
        addQuestion();
    } 
    else if (level === "intermediate") {
        questionsContainer.innerHTML = `
            <div class="question-item p-4 border border-border rounded-lg space-y-2">
                <label class="form-label">Answer Key</label>
                <div id="answer-keys" class="space-y-2"></div>
            </div>
        `;
        generateAnswerKeys(); // initialize blank inputs
        passageInput.addEventListener("input", generateAnswerKeys);
    } 

    else if (level === "advanced") {
        questionsContainer.innerHTML = `
            <div class="question-item p-4 border border-border rounded-lg space-y-2">
                <label class="form-label">Essay Question</label>
                <input type="text" class="form-input question-text" placeholder="Enter essay question">
            </div>
        `;
    } 
});

function updatePassagePlaceholder() {
    const difficulty = document.getElementById("lesson-difficulty").value;
    const passage = document.getElementById("lesson-passage");

    switch (difficulty) {
        case "beginner":
            passage.placeholder = "🟢 Beginner Level:\nEnter a short reading passage followed by 3–5 multiple-choice questions.\n\nExample:\n'Communication is important because it allows people to share ideas and understand each other.'\n\n💡 You’ll create multiple-choice questions below.";
            break;

        case "intermediate":
            passage.placeholder = "🟡 Intermediate Level:\nEnter a passage with blanks for fill-in-the-blank questions.\nUse underscores (___) to mark where answers go.\n\nExample:\n'Effective communication requires ___ and ___.'\n\n💡 Answer keys will be generated automatically for each blank.";
            break;

        case "advanced":
            passage.placeholder = "🔴 Advanced Level:\nEnter a detailed reading passage that will be followed by essay-type questions.\n\nExample:\n'Read the passage carefully and explain how technology affects communication in modern society.'\n\n💡 Students will answer in paragraph form.";
            break;

        default:
            passage.placeholder = "Enter the reading passage here...";
            break;
    }
}

// 🧠 Initialize correct placeholder on load
document.addEventListener("DOMContentLoaded", updatePassagePlaceholder);

// ✅ Generate answer keys for Intermediate (simpler + flexible)
function generateAnswerKeys() {
    const text = passageInput.value;

    const matches = text.match(/_{3,}/g) || [];
    const blankCount = matches.length;

    const answerKeysDiv = document.getElementById("answer-keys");
    if (!answerKeysDiv) return; // in case not in intermediate mode

    answerKeysDiv.innerHTML = "";

    if (blankCount === 0) {
        answerKeysDiv.innerHTML = "<p class='text-sm text-gray-500 italic'>No blanks detected in the passage.</p>";
        return;
    }

    // Generate answer fields for each blank
    for (let i = 1; i <= blankCount; i++) {
        const inputWrapper = document.createElement("div");
        inputWrapper.className = "mb-3";

        const label = document.createElement("label");
        label.textContent = `Answer for Blank ${i}:`;
        label.className = "block text-sm font-medium text-gray-700 mb-1";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-input w-full p-2 border border-gray-300 rounded-md";
        input.placeholder = `Type correct answer for blank ${i}`;

        inputWrapper.appendChild(label);
        inputWrapper.appendChild(input);
        answerKeysDiv.appendChild(inputWrapper);
    }
}


// Multiple Choice Question (Beginner)
function addQuestion() {
    const questionItem = document.createElement("div");
    questionItem.className = "question-item p-4 border border-border rounded-lg space-y-2";
    questionItem.innerHTML = `
        <input type="text" class="form-input question-text" placeholder="Enter question">
        <div class="grid grid-cols-2 gap-2">
            <input type="text" class="form-input option" placeholder="Option A">
            <input type="text" class="form-input option" placeholder="Option B">
            <input type="text" class="form-input option" placeholder="Option C">
            <input type="text" class="form-input option" placeholder="Option D">
        </div>
        <select class="form-input correct-answer">
            <option value="0">Option A</option>
            <option value="1">Option B</option>
            <option value="2">Option C</option>
            <option value="3">Option D</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="removeQuestion(this)">
            <i data-lucide="trash" class="size-3 mr-1"></i>
            Remove
        </button>
    `;
    questionsContainer.appendChild(questionItem);
}

function removeQuestion(btn) {
    btn.parentElement.remove();
}

function getSelectedSubjectId() {
    const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
    return selectedClass?.subject_id || 1; // default to 1 if not found
}

async function saveLesson() {
    const user = getCurrentUser();
    if (!user || user.role !== 'teacher') {
        showNotification('You are not authorized', 'error');
        return;
    }

    const title = document.getElementById('lesson-title').value;
    const difficulty = document.getElementById('lesson-difficulty').value;
    const passage = document.getElementById('lesson-passage').value;

    if (!title || !passage) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }

    const questions = Array.from(document.querySelectorAll('.question-item')).map(item => {
        const questionText = item.querySelector('.question-text')?.value || '';
        let question_type = 'mcq'; // default

        const optionsElements = item.querySelectorAll('.option');
        const options = Array.from(optionsElements).map(input => input.value);
        const correctAnswer = parseInt(item.querySelector('.correct-answer')?.value);

        if (difficulty === 'beginner') question_type = 'mcq';
        else if (difficulty === 'intermediate') question_type = 'fill_blank';
        else if (difficulty === 'advanced') question_type = 'essay';

        let questionData = { question_text: questionText, question_type };

        if (question_type === 'mcq') {
            questionData.options = options.map((text, i) => ({
                option_text: text,
                is_correct: i === correctAnswer
            }));
        } else if (question_type === 'fill_blank') {
            const blanks = Array.from(item.querySelectorAll('#answer-keys input')).map((input, index) => ({
                blank_number: index + 1,
                answer_text: input.value
            }));
            questionData.blanks = blanks;
        }
        // essay: no extra fields

        return questionData;
    });

    if (questions.length === 0) {
        showNotification('Please add at least one question', 'warning');
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/teacher/reading-quizzes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title, 
                difficulty, 
                passage, 
                subject_id: getSelectedSubjectId(), 
                user_id: user.user_id, // ✅ include user_id here
                questions 
            })
        });

        const data = await res.json();
        if (res.ok) {
            showNotification(data.message, 'success');
            closeModal();
            document.getElementById('lesson-title').value = '';
            document.getElementById('lesson-passage').value = '';
            document.getElementById('questions-container').innerHTML = '';
            addQuestion();
            loadQuizzes(); 
        } else {
            showNotification(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Failed to save quiz', 'error');
    }
}

function deleteLesson(lessonId) {
    if (confirm('Are you sure you want to delete this lesson?')) {
        showNotification('Lesson deleted successfully', 'success');
    }
}

function startLesson(lessonId, isTeacherQuiz = false) {
    const user = getCurrentUser();
    if (!user) return;

    if (user.role === 'teacher') {
        // Teacher opens schedule modal
        openScheduleModal(lessonId);
    } else {
        // Student starts quiz (built-in or teacher-created)
        openQuizModal(lessonId, isTeacherQuiz);
    }
}

let currentQuestionIndex = 0;
let quizData = null;
let attemptId = null;
let studentAnswers = {}; 
let readonly = false;
let countdownInterval = null;
let remainingTimePerQuiz = {}; // store remaining time per quiz
let currentQuizIsTeacher = false;

async function openQuizModal(lessonId, isTeacherQuiz = false) {
    const modal = document.getElementById('take-quiz-modal');
    if (!modal) return console.error('Quiz modal not found!');

    currentQuizIsTeacher = !!isTeacherQuiz;

    try {
        // 1️⃣ Fetch the quiz (built-in or teacher-created)
        const quizUrl = isTeacherQuiz
            ? `http://localhost:3000/api/teacher/reading-quizzes/${lessonId}`
            : `http://localhost:3000/api/reading-quizzes/${lessonId}`;
        const resQuiz = await fetch(quizUrl);
        if (!resQuiz.ok) {
            showNotification("Failed to load quiz.", "error");
            return;
        }
        const quiz = await resQuiz.json();

        const now = new Date();
        const unlockTime = quiz.unlock_time ? new Date(quiz.unlock_time.replace(' ', 'T')) : null;
        const lockTime = quiz.lock_time ? new Date(quiz.lock_time.replace(' ', 'T')) : null;

        if (isTeacherQuiz) {
            if (!unlockTime || !lockTime) {
                showNotification("This quiz is not yet scheduled by your teacher.", "warning");
                return;
            }
            if (now < unlockTime) {
                showNotification("This quiz is not yet open.", "warning");
                return;
            }
            if (now > lockTime) {
                showNotification("This quiz has closed.", "warning");
                return;
            }
        } else {
            if ((unlockTime && now < unlockTime) || (lockTime && now > lockTime)) {
                showNotification("This quiz is not yet available or has already closed.", "warning");
                return;
            }
        }

        modal.classList.remove('hidden');
        document.getElementById('quiz-title').textContent = quiz.title;
        document.getElementById('quiz-passage').textContent = quiz.passage || "(No passage provided)";

        quizData = quiz;
        studentAnswers = {};
        const user = JSON.parse(localStorage.getItem('eel_user'));
        attemptId = null;
        readonly = false;

        if (!isTeacherQuiz) {
            // 2️⃣ Check for previous attempts (built-in quizzes only)
            const attemptRes = await fetch(`http://localhost:3000/api/reading-quiz-attempts?quiz_id=${lessonId}&student_id=${user.user_id}`);
            const attempts = await attemptRes.json();
            const existingAttempt = attempts.find(a => Number(a.quiz_id) === Number(lessonId));

            if (existingAttempt) {
                attemptId = existingAttempt.attempt_id;
                studentAnswers = existingAttempt.answers || {};
                readonly = existingAttempt.status === 'completed';
            } else {
                const newAttemptRes = await fetch("http://localhost:3000/api/reading-quiz-attempts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ student_id: user.user_id, quiz_id: lessonId })
                });
                const newAttempt = await newAttemptRes.json();
                attemptId = newAttempt.attempt_id;
                studentAnswers = {};
                readonly = false;
            }
        }

        // 3️⃣ Countdown timer
        const countdownEl = document.getElementById('quiz-countdown');
        if (quiz.time_limit && !readonly) {
            // use saved remaining time if exists, otherwise full time
            let timeRemaining = remainingTimePerQuiz[lessonId] ?? quiz.time_limit * 60;

            clearInterval(countdownInterval);
            countdownInterval = setInterval(() => {
                const minutes = Math.floor(timeRemaining / 60);
                const seconds = timeRemaining % 60;
                countdownEl.textContent = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;

                if (timeRemaining <= 0) {
                    clearInterval(countdownInterval);
                    countdownEl.textContent = "00:00";
                    submitQuiz(); // auto-submit
                }

                timeRemaining--;
                remainingTimePerQuiz[lessonId] = timeRemaining; // save remaining time
            }, 1000);
        } else {
            countdownEl.textContent = ""; // hide countdown if no timer or readonly
        }

        // 4️⃣ Fetch student's answers if readonly (built-in only)
        if (readonly && attemptId) {
            const resAnswers = await fetch(`http://localhost:3000/api/reading-quiz-attempts/${attemptId}/answers`);
            const attemptAnswers = await resAnswers.json();

            quiz.questions.forEach(q => {
                const ans = attemptAnswers.find(a => a.question_id === q.question_id);
                if (!ans) return;

                studentAnswers[q.question_id] = ans.student_answer;

                if (q.question_type === 'mcq') {
                    q.options.forEach(opt => {
                        opt.is_correct = !!opt.is_correct;
                        if (Number(ans.student_answer) === Number(opt.option_id)) {
                            opt.selected = true;
                        }
                    });
                } else if (q.question_type === 'fill_blank' && ans.blanks?.length) {
                    q.blanks.forEach(blank => {
                        const bAns = ans.blanks.find(b => b.blank_id === blank.blank_id);
                        if (bAns) {
                            if (!studentAnswers[q.question_id]) studentAnswers[q.question_id] = {};
                            studentAnswers[q.question_id][blank.blank_id] = bAns.student_text;
                            blank.correct_answer = blank.correct_answer || bAns.correct_answer;
                        }
                    });
                }
            });
        }

        // 5️⃣ Load quiz questions
        loadQuizQuestions(quiz.questions || [], quiz.difficulty, readonly);

    } catch (err) {
        console.error(err);
        showNotification("Failed to load quiz.", "error");
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('quiz-progress');
    if (!quizData || !quizData.questions?.length) return;

    const totalQuestions = quizData.questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

    progressBar.style.width = `${progress}%`;
}


// 2️⃣ Close modal
function closeQuizModal() {
    const modal = document.getElementById('take-quiz-modal');
    modal.classList.add('hidden');
    document.getElementById('quiz-questions').innerHTML = '';
    document.getElementById('quiz-nav').classList.add('hidden');
    quizData = null;
    studentAnswers = {};  // ← reset
    currentQuestionIndex = 0;
    currentQuizIsTeacher = false;
    clearInterval(countdownInterval);
}

// ==================== Load quiz questions ====================
function loadQuizQuestions(questions, difficulty, readonly = false) {
    const nav = document.getElementById('quiz-nav');

    if (!questions || !questions.length) {
        document.getElementById('quiz-questions').innerHTML = '<p>No questions available for this quiz.</p>';
        nav.classList.add('hidden');
        return;
    }

    if (readonly) {
        // Show all questions at once
        nav.classList.add('hidden');
        const container = document.getElementById('quiz-questions');
        container.innerHTML = '';
        questions.forEach((q, i) => container.appendChild(renderQuestion(q, i, readonly)));
    } else {
        // Show one question at a time
        nav.classList.remove('hidden');
        currentQuestionIndex = 0; // start from first question
        showSingleQuestion(questions[currentQuestionIndex], readonly);
    }
}

// Fixed renderQuestion function
function renderQuestion(q, index, readonly = false) {
    const div = document.createElement('div');
    div.classList.add('question-item');

    // Question header
    const header = document.createElement('h4');
    header.textContent = `Question ${index + 1} of ${quizData.questions.length}`;
    header.style.fontWeight = '600';
    header.style.marginBottom = '0.5rem';
    header.style.fontSize = '1.125rem';
    div.appendChild(header);

    // Question text
    const p = document.createElement('p');
    p.textContent = q.question_text;
    p.style.marginBottom = '1rem';
    p.classList.add('quiz-question-text');
    div.appendChild(p);

    const studentAnswer = studentAnswers[q.question_id];

    // ==================== MCQ ====================
    if (q.question_type === 'mcq' && q.options?.length) {
        q.options.forEach(opt => {
            const label = document.createElement('label');
            label.classList.add('quiz-option');

            if (readonly) {
                if (opt.is_correct) label.classList.add('quiz-option--correct');
                else if (Number(studentAnswer) === opt.option_id && !opt.is_correct) {
                    label.classList.add('quiz-option--wrong');
                }
            }

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `question_${q.question_id}`;
            input.value = opt.option_id;
            input.disabled = readonly; // ✅ Only disable if readonly
            
            if (readonly && Number(studentAnswer) === opt.option_id) {
                input.checked = true;
            }

            const span = document.createElement('span');
            span.textContent = opt.option_text;

            label.appendChild(input);
            label.appendChild(span);

            if (readonly && !opt.is_correct && Number(studentAnswer) === opt.option_id) {
                const correctText = document.createElement('span');
                correctText.textContent = ` ✓ Correct: ${q.options.find(o => o.is_correct).option_text}`;
                correctText.classList.add('quiz-option-correct-text');
                label.appendChild(correctText);
            }

            div.appendChild(label);
        });
    }

    // ==================== Fill-in-the-blank ====================
    else if (q.question_type === 'fill_blank' && q.blanks?.length) {
        // ✅ Get all real answers from DB
        const realAnswers = q.blanks
            .map(b => (b.correct_answer || b.answer_text || '').trim())
            .filter(Boolean);

        // 🎲 Random filler words
        const randomDistractors = [
            "understanding", "tone", "message", "feedback", "interpretation",
            "receiver", "barrier", "context", "emotion", "transmission",
            "clarity", "listening", "expression", "meaning", "perception"
        ];

        // 🧩 Combine (all real answers must be included)
        const combined = [...new Set([...realAnswers, ...randomDistractors])];

        // 🔀 Shuffle & limit to 10 (always keep real answers)
        const alwaysInclude = [...realAnswers];
        const shuffledExtras = combined
            .filter(w => !realAnswers.includes(w))
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.max(0, 10 - realAnswers.length));

        const finalWords = [...alwaysInclude, ...shuffledExtras]
            .sort(() => Math.random() - 0.5);

        // 📝 Render blanks
        q.blanks.forEach(blank => {
            const blankDiv = document.createElement('div');
            blankDiv.style.marginBottom = '1rem';

            const label = document.createElement('label');
            label.textContent = `Blank ${blank.blank_number}:`;
            label.classList.add('form-label');
            blankDiv.appendChild(label);

            const input = document.createElement('input');
            input.type = 'text';
            input.name = `blank_${blank.blank_id}`;
            input.value = studentAnswer?.[blank.blank_id] || '';
            input.disabled = readonly;
            input.classList.add('form-input');
            input.style.width = '100%';
            input.style.padding = '0.75rem';
            input.style.border = '1px solid var(--border)';
            input.style.borderRadius = '0.5rem';
            blankDiv.appendChild(input);

            // ✅ Answer checking (readonly)
            if (readonly) {
                const correctAnswer = (blank.correct_answer || '').trim().toLowerCase();
                const value = (studentAnswer?.[blank.blank_id] || '').trim().toLowerCase();

                if (value === correctAnswer) {
                    input.style.backgroundColor = '#d1fae5';
                    input.style.borderColor = '#10b981';
                } else {
                    input.style.backgroundColor = '#fee2e2';
                    input.style.borderColor = '#ef4444';

                    const correctP = document.createElement('p');
                    correctP.textContent = `✓ Correct answer: ${blank.correct_answer}`;
                    correctP.style.marginTop = '0.25rem';
                    correctP.style.fontSize = '0.875rem';
                    correctP.style.color = '#047857';
                    blankDiv.appendChild(correctP);
                }
            }

            div.appendChild(blankDiv);
        });

        // 🎨 Stylish Word Bank
        const wordBank = document.createElement('div');
        wordBank.className = "mt-4 p-4 border border-border rounded-lg bg-secondary/10 shadow-sm";
        wordBank.innerHTML = `
            <strong class="block mb-3 text-primary text-lg">🧠 Word Bank:</strong>
            <div class="grid grid-cols-5 sm:grid-cols-3 md:grid-cols-5 gap-2">
                ${finalWords.map(w => `
                    <div class="px-3 py-2 text-sm font-medium text-center bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 transition">
                        ${w}
                    </div>
                `).join('')}
            </div>
        `;
        div.appendChild(wordBank);
    }

    // ==================== Essay ====================
    else if (q.question_type === 'essay') {
        const textarea = document.createElement('textarea');
        textarea.name = `essay_${q.question_id}`;
        textarea.rows = 6;
        textarea.value = studentAnswer || '';
        textarea.disabled = readonly; // ✅ Only disable if readonly
        textarea.classList.add('form-textarea');
        textarea.style.width = '100%';
        textarea.style.padding = '0.75rem';
        textarea.style.border = '1px solid var(--border)';
        textarea.style.borderRadius = '0.5rem';
        textarea.style.minHeight = '150px';
        div.appendChild(textarea);
    }

    return div;
}

// Fixed showSingleQuestion function
function showSingleQuestion(question, readonly = false) {
    const container = document.getElementById('quiz-questions');
    const nextButton = document.getElementById('next-btn');
    const submitButton = document.getElementById('submit-btn');
    const prevButton = document.getElementById('prev-btn');

    container.innerHTML = '';
    container.appendChild(renderQuestion(question, currentQuestionIndex, readonly));

    // ✅ Get all inputs and attach event listeners (ONLY if not readonly)
    if (!readonly) {
        container.querySelectorAll('input, textarea').forEach(el => {
            el.disabled = false; // ✅ Make sure inputs are enabled
            
            el.addEventListener('input', e => {
                if (question.question_type === 'fill_blank') {
                    if (!studentAnswers[question.question_id]) {
                        studentAnswers[question.question_id] = {};
                    }
                    const blankId = e.target.name.replace('blank_', '');
                    studentAnswers[question.question_id][blankId] = e.target.value;
                } else if (question.question_type === 'essay') {
                    studentAnswers[question.question_id] = e.target.value;
                }
            });

            // For radio buttons (MCQ)
            el.addEventListener('change', e => {
                if (question.question_type === 'mcq') {
                    studentAnswers[question.question_id] = e.target.value;
                }
            });
        });
    }

    // ✅ Restore previous answers
    const studentAnswer = studentAnswers[question.question_id];
    if (studentAnswer) {
        if (question.question_type === 'mcq') {
            const radio = container.querySelector(`input[name="question_${question.question_id}"][value="${studentAnswer}"]`);
            if (radio) radio.checked = true;
        } else if (question.question_type === 'fill_blank') {
            question.blanks?.forEach(b => {
                const input = container.querySelector(`input[name="blank_${b.blank_id}"]`);
                if (input && studentAnswer[b.blank_id] !== undefined) {
                    input.value = studentAnswer[b.blank_id];
                }
            });
        } else if (question.question_type === 'essay') {
            const textarea = container.querySelector(`textarea[name="essay_${question.question_id}"]`);
            if (textarea) textarea.value = studentAnswer;
        }
    }

    // ✅ Navigation buttons
    const totalQuestions = quizData?.questions?.length || 0;
    
    // Previous button
    if (prevButton) {
        prevButton.disabled = currentQuestionIndex === 0;
        prevButton.style.opacity = currentQuestionIndex === 0 ? '0.5' : '1';
        prevButton.style.cursor = currentQuestionIndex === 0 ? 'not-allowed' : 'pointer';
    }

    if (readonly) {
        // In readonly/review mode, hide all navigation
        submitButton?.classList.add('hidden');
        nextButton?.classList.add('hidden');
        prevButton?.classList.add('hidden');
    } else {
        // In quiz mode, show appropriate buttons
        prevButton?.classList.remove('hidden');
        
        if (currentQuestionIndex >= totalQuestions - 1) {
            // Last question: show Submit, hide Next
            submitButton?.classList.remove('hidden');
            nextButton?.classList.add('hidden');
        } else {
            // Not last question: show Next, hide Submit
            submitButton?.classList.add('hidden');
            nextButton?.classList.remove('hidden');
        }
    }

    updateProgressBar();
}

// Make sure saveCurrentAnswer works for all types
function saveCurrentAnswer() {
    const question = quizData.questions[currentQuestionIndex];
    if (!question) return;

    if (question.question_type === 'mcq') {
        const selected = document.querySelector(`input[name="question_${question.question_id}"]:checked`);
        if (selected) studentAnswers[question.question_id] = selected.value;
    } else if (question.question_type === 'fill_blank') {
        const blanksObj = {};
        question.blanks?.forEach(b => {
            const input = document.querySelector(`input[name="blank_${b.blank_id}"]`);
            if (input) {
                blanksObj[b.blank_id] = input.value || '';
            }
        });
        studentAnswers[question.question_id] = blanksObj;
    } else if (question.question_type === 'essay') {
        const textarea = document.querySelector(`textarea[name="essay_${question.question_id}"]`);
        if (textarea) {
            studentAnswers[question.question_id] = textarea.value || '';
        }
    }
}

// ==================== Navigation ====================
function nextQuestion() {
    if (currentQuestionIndex < quizData.questions.length - 1) {
        currentQuestionIndex++;
        showSingleQuestion(quizData.questions[currentQuestionIndex]);
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showSingleQuestion(quizData.questions[currentQuestionIndex]);
    }
}

// 1️⃣ Record start time when quiz opens
let quizStartTime = new Date(); // store this globally when quiz starts

async function submitQuiz() {
    if (!quizData) return;
    if (currentQuizIsTeacher) {
        saveCurrentAnswer();
        showNotification("Quiz completed. Results for teacher-created quizzes are not saved yet.", "info");
        closeQuizModal();
        return;
    }
    if (!attemptId) return;

    saveCurrentAnswer();

    // 2️⃣ Compute time taken just before submitting
    const quizEndTime = new Date();
    const timeTakenSeconds = Math.floor((quizEndTime - quizStartTime) / 1000);

    const answers = quizData.questions.map(q => {
        if (q.question_type === 'mcq') {
            return { 
                question_id: q.question_id, 
                question_type: 'mcq', 
                student_answer: Number(studentAnswers[q.question_id]) || null
            };
        } else if (q.question_type === 'fill_blank') {
            const blanks = q.blanks.map(b => ({
                blank_id: b.blank_id,
                student_text: (studentAnswers[q.question_id]?.[b.blank_id] || '').trim()
            }));
            return { question_id: q.question_id, question_type: 'fill_blank', blanks };
        } else if (q.question_type === 'essay') {
            return { 
                question_id: q.question_id, 
                question_type: 'essay', 
                student_answer: (studentAnswers[q.question_id] || '').trim()
            };
        }
    });

    try {
        // 🧩 Save answers AND time taken
        const saveRes = await fetch(`http://localhost:3000/api/reading-quiz-answers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attempt_id: attemptId, answers, timeTakenSeconds })
        });

        const saveData = await saveRes.json();
        if (!saveData.success) return showNotification("Failed to save answers.", "error");

        // 🧾 Submit attempt
        const submitRes = await fetch(`http://localhost:3000/api/reading-quiz-attempts/${attemptId}/submit`, { 
            method: "PATCH" 
        });
        const submitData = await submitRes.json();

        if (submitData.success) {
            closeQuizModal();

            const totalScore = submitData.totalScore ?? submitData.result?.totalScore ?? 0;
            const totalPoints = submitData.totalPoints ?? submitData.result?.totalPoints ?? 0;
            const correct = submitData.correct ?? submitData.result?.correct ?? 0;
            const wrong = submitData.wrong ?? submitData.result?.wrong ?? 0;
            const timeTaken = timeTakenSeconds; // use frontend-measured time

            showResultModal(totalScore, totalPoints, correct, wrong, timeTaken);

            if (submitData.unlockedNext) {
                showNotification?.("Great job! Next quiz unlocked.", "success");
            }
            // Always refresh quiz list after submit so unlocks reflect immediately
            // (even if backend didn't return unlockedNext for any reason)
            loadQuizzes(user);

            // Update quiz button to “Review Quiz”
            if (quizData && quizData.quiz_id) {
                const btn = document.getElementById(`quiz-btn-${quizData.quiz_id}`);
                if (btn) {
                    btn.innerHTML = `<i data-lucide="eye" class="size-3 mr-1"></i>Review Quiz`;
                    btn.disabled = false;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                    lucide.createIcons({ icons: lucide.icons });
                }
            }
        } else {
            showNotification("Quiz submitted, but grading failed.", "warning");
        }
    } catch (err) {
        console.error(err);
        showNotification("An error occurred while submitting the quiz.", "error");
    }
}

//for teacher schedule modal
let currentLessonId = null;

/** Format API date (ISO or MySQL) as YYYY-MM-DDTHH:mm for datetime-local input. */
function toDateTimeLocalPH(apiDate) {
    if (!apiDate) return '';
    const s = String(apiDate).trim();
    if (s.includes('T') && s.length >= 16) return s.slice(0, 16);
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) return s.replace(/\s+/, 'T').slice(0, 16);
    const d = new Date(apiDate);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hr = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${hr}:${min}`;
}

/** Returns current time in Philippines (UTC+8) as YYYY-MM-DDTHH:mm for datetime-local inputs. */
function getPHDateTimeLocal() {
    const now = new Date();
    const ph = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const y = ph.getUTCFullYear();
    const m = String(ph.getUTCMonth() + 1).padStart(2, '0');
    const d = String(ph.getUTCDate()).padStart(2, '0');
    const hr = String(ph.getUTCHours()).padStart(2, '0');
    const min = String(ph.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hr}:${min}`;
}

// Convert input to ISO string. Treats YYYY-MM-DDTHH:mm or MySQL date as PH time (+08:00). Returns null if invalid.
function toPHISOString(input) {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim();
    if (!s) return null;
    const normalized = s.includes('T') ? s : s.replace(/\s+/, 'T');
    const toParse = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(normalized) && !/[Z+-]/.test(normalized)
        ? normalized + '+08:00'
        : normalized;
    const d = new Date(toParse);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

/** Convert datetime-local value to MySQL DATETIME "YYYY-MM-DD HH:mm:ss" as-is (no timezone). Do not use for ISO strings with Z. */
function toMySQLDateTimeLocal(input) {
    if (!input || typeof input !== 'string') return null;
    var s = input.trim();
    if (!s || s.indexOf('Z') >= 0 || s.indexOf('+') >= 0) return null;
    var match = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/);
    if (match) {
        var sec = match[6] != null ? match[6] : '00';
        return match[1] + '-' + match[2] + '-' + match[3] + ' ' + match[4] + ':' + match[5] + ':' + sec;
    }
    match = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
        var sec = match[6] != null ? match[6] : '00';
        return match[1] + '-' + match[2] + '-' + match[3] + ' ' + match[4] + ':' + match[5] + ':' + sec;
    }
    return null;
}

let currentScheduleIsTeacherQuiz = false;

function openScheduleModalWithData(lessonId, scheduleJson) {
    let existing = null;
    if (scheduleJson) try { existing = JSON.parse(scheduleJson); } catch (e) {}
    openScheduleModal(lessonId, true, existing);
}

function openScheduleModal(lessonId, isTeacherQuiz, existingSchedule) {
    currentLessonId = lessonId;
    currentScheduleIsTeacherQuiz = !!isTeacherQuiz;
    const modal = document.getElementById('schedule-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const formattedNow = getPHDateTimeLocal();
    const unlockEl = document.getElementById('modal-unlock-time');
    const lockEl = document.getElementById('modal-lock-time');
    const limitEl = document.getElementById('modal-time-limit');
    if (unlockEl) {
        unlockEl.value = (existingSchedule && existingSchedule.unlock_time) ? toDateTimeLocalPH(existingSchedule.unlock_time) : formattedNow;
        unlockEl.min = formattedNow;
    }
    if (lockEl) {
        lockEl.value = (existingSchedule && existingSchedule.lock_time) ? toDateTimeLocalPH(existingSchedule.lock_time) : '';
        lockEl.min = formattedNow;
    }
    if (limitEl) limitEl.value = (existingSchedule && existingSchedule.time_limit != null) ? String(existingSchedule.time_limit) : '';
    document.getElementById('retake-option').value = 'all';
    document.getElementById('specific-students-container').classList.add('hidden');

    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
}

function closeScheduleModal() {
    const modal = document.getElementById('schedule-modal');
    if (modal) modal.classList.add('hidden');
    currentLessonId = null;
    currentScheduleIsTeacherQuiz = false;

    const u = document.getElementById('modal-unlock-time');
    const l = document.getElementById('modal-lock-time');
    const t = document.getElementById('modal-time-limit');
    const r = document.getElementById('retake-option');
    const s = document.getElementById('specific-students');
    const c = document.getElementById('specific-students-container');
    if (u) u.value = '';
    if (l) l.value = '';
    if (t) t.value = '';
    if (r) r.value = 'all';
    if (s) s.selectedIndex = -1;
    if (c) c.classList.add('hidden');
}

document.getElementById('save-schedule-btn').addEventListener('click', async () => {
    if (!currentLessonId) return;

    const unlockTime = document.getElementById('modal-unlock-time').value;
    const lockTime   = document.getElementById('modal-lock-time').value;
    const timeLimitEl = document.getElementById('modal-time-limit');
    const timeLimit  = timeLimitEl && timeLimitEl.value.trim() ? parseInt(timeLimitEl.value, 10) : NaN;
    const retakeOption = document.getElementById('retake-option')?.value || 'all';

    if (!unlockTime || !lockTime) {
        showNotification("Please select both unlock and lock times", "warning");
        return;
    }

    const unlockTimeValue = new Date(unlockTime + "+08:00");
    const lockTimeValue   = new Date(lockTime + "+08:00");
    const nowPH = new Date(new Date().getTime() + (8 * 60 + new Date().getTimezoneOffset()) * 60000);

    if (unlockTimeValue <= nowPH || lockTimeValue <= nowPH) {
        showNotification("Unlock and lock times cannot be in the past", "warning");
        return;
    }

    // Time limit required for course quizzes; optional for teacher-created
    if (!currentScheduleIsTeacherQuiz && (isNaN(timeLimit) || timeLimit <= 0)) {
        showNotification("Please set a valid time limit in minutes", "warning");
        return;
    }

    let allowedStudents = [];
    if (retakeOption === 'specific') {
        const sel = document.getElementById('specific-students');
        if (sel) allowedStudents = Array.from(sel.selectedOptions).map(opt => opt.value);
    }

    const url = currentScheduleIsTeacherQuiz
        ? `http://localhost:3000/api/teacher/reading-quizzes/${currentLessonId}/schedule`
        : `http://localhost:3000/api/reading-quizzes/${currentLessonId}/schedule`;

    var unlockStr = toMySQLDateTimeLocal(unlockTime);
    var lockStr = toMySQLDateTimeLocal(lockTime);
    if (!unlockStr || !lockStr) {
        showNotification("Invalid date/time. Please use the date and time picker.", "warning");
        return;
    }
    const body = currentScheduleIsTeacherQuiz
        ? {
            unlock_time: unlockStr,
            lock_time: lockStr,
            time_limit: (timeLimit > 0 ? timeLimit : null)
        }
        : {
            unlock_time: unlockStr,
            lock_time: lockStr,
            status: 'scheduled',
            retake_option: retakeOption,
            allowed_students: allowedStudents,
            time_limit: timeLimit
        };

    try {
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const text = await res.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (_) {}
        if (data.success) {
            showNotification("✅ Unlock & lock schedule saved!", "success");
            closeScheduleModal();
            var isTeacherQuiz = currentScheduleIsTeacherQuiz;
            setTimeout(async function () {
                try {
                    await loadQuizzes();
                } catch (e) { console.error('Reload quizzes:', e); }
                if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
            }, 150);
        } else {
            showNotification("❌ " + (data.message || "Failed to save schedule"), "error");
        }
    } catch (err) {
        console.error(err);
        showNotification("⚠️ An error occurred while saving schedule.", "error");
    }
});

const retakeSelect = document.getElementById('retake-option');
const specificContainer = document.getElementById('specific-students-container');

retakeSelect.addEventListener('change', () => {
    if (retakeSelect.value === 'specific') {
        specificContainer.classList.remove('hidden');
    } else {
        specificContainer.classList.add('hidden');
    }
});

function importText() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.doc,.docx,.pdf';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            showNotification(`Importing text from ${file.name}...`, 'info');
            // Here you would implement file processing
        }
    };
    input.click();
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSelectedAIQuizTypes() {
  const checked = Array.from(document.querySelectorAll('input.ai-quiz-type-cb:checked')).map(el => el.value);
  return checked.length > 0 ? checked : ['multiple-choice'];
}

async function generateAIQuiz() {
  const topicEl = document.getElementById('ai-topic');
  const topicId = topicEl ? String(topicEl.value || "").trim() : "";
  const numQuestionsInput = document.getElementById('ai-num-questions');
  const numQuestions = numQuestionsInput ? Math.max(1, Math.min(20, parseInt(numQuestionsInput.value, 10) || 5)) : 5;
  const contextEl = document.getElementById('ai-context');
  const additionalContext = contextEl ? (contextEl.value || "").trim() : "";
  const quizTypes = getSelectedAIQuizTypes();

  if (!topicId) {
    showNotification("Please select a topic first.", "warning");
    return;
  }
  if (quizTypes.length === 0) {
    showNotification("Please check at least one quiz type.", "warning");
    return;
  }

  const btn = document.getElementById('ai-generate-btn');
  const generatedSection = document.getElementById("ai-generated-section");
  const container = document.getElementById("ai-questions-container");
  if (!btn || !generatedSection || !container) return;

  btn.disabled = true;
  btn.innerHTML = "<span>⏳ Generating...</span>";

  const payload = {
    topic_id: topicId,
    quiz_types: quizTypes,
    num_questions: numQuestions,
    additional_context: additionalContext
  };

  try {
    const res = await fetch("http://localhost:3000/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      console.error("Parse error:", parseErr);
      showNotification("Server returned invalid response. Try again.", "error");
      return;
    }

    if (!res.ok) {
      showNotification(data.message || "Request failed (" + res.status + "). Try again.", "error");
      return;
    }
    if (!data.success) {
      showNotification(data.message || "Generation failed.", "error");
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

    // Find where first question starts (many patterns so AI format doesn't matter)
    const patterns = [
      /\n\s*Question\s*1\s*[:.)]\s*/i,
      /\n\s*1\s*[.)]\s+/,
      /^Question\s*1\s*[:.)]\s*/i,
      /^1\s*[.)]\s+/m,
      /\n\s*Q\s*1\s*[.:)]\s*/i,
      /\n\s*\(\s*1\s*\)\s+/,
      /\n\s*#\s*1\s*[.)]\s+/,
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
      // Split by "Question N" / "N." / "Q N" at line start
      questionBlocks = questionsText.split(/\n\s*Question\s*\d+\s*[:.)]\s*|\n\s*(?=\d+\s*[.)]\s+)|\n\s*Q\s*\d+\s*[.:)]\s*/i).filter(Boolean);
      if (questionBlocks.length <= 1 && /Question\s*2|^2\s*[.)]\s+/im.test(questionsText)) {
        questionBlocks = questionsText.split(/\s*Question\s*\d+\s*[:.)]\s*|\n(?=\s*\d+\s*[.)]\s+)/i).filter(Boolean);
      }
    }

    if (questionBlocks.length <= 0) {
      const byQuestion = rawQuiz.split(/(?=Question\s*\d+\s*[:.)])|(?=\n\s*\d+\s*[.)]\s+)/i);
      if (byQuestion.length > 1) {
        passagePart = byQuestion[0].trim();
        questionBlocks = byQuestion.slice(1).map(s => s.replace(/^(?:Question\s*\d+\s*[:.)]\s*|\d+\s*[.)]\s*)/i, "").trim()).filter(Boolean);
      }
    }

    // Fallback: split by double newline; paragraphs with "Correct answer" or "A)" = question blocks; leading ones without = passage
    if (questionBlocks.length <= 0 && /correct\s+answer\s*[:)]|^[A-D]\)\s/mi.test(rawQuiz)) {
      const paragraphs = rawQuiz.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      const blocks = [];
      let passageChunks = [];
      for (const p of paragraphs) {
        const looksLikeQuestion = /correct\s+answer\s*[:)]|^[A-D]\)\s|^\d+\s*[.)]\s+/im.test(p);
        if (looksLikeQuestion) {
          blocks.push(p);
        } else if (blocks.length === 0) {
          passageChunks.push(p);
        }
      }
      if (blocks.length > 0) {
        passagePart = passageChunks.join("\n\n").trim();
        questionBlocks = blocks;
      }
    }

    // Last resort: treat whole response as one question if it has options or correct answer
    if (questionBlocks.length <= 0 && (/^[A-D]\)\s|Correct\s+answer\s*[:)]/im.test(rawQuiz))) {
      passagePart = "";
      questionBlocks = [rawQuiz];
    }

    passageArea.value = passagePart;
    container.innerHTML = "";

    if (questionBlocks.length === 0) {
      container.innerHTML = "<p class=\"text-muted-foreground text-sm\">No questions were parsed from the response. You can edit the passage above and try Regenerate, or add clearer instructions.</p>";
    } else {
      // Parse each block into a structured item with questionType
      const typeOrder = { "multiple-choice": 0, "true-false": 1, "identification": 2 };
      const parsed = questionBlocks.map((block) => {
        const lines = block.trim().split("\n").map(l => l.trim()).filter(l => l);
        const questionLines = [];
        for (const line of lines) {
          if (/^[A-D]\)\s/.test(line) || /correct\s+answer\s*[:)]/i.test(line)) break;
          questionLines.push(line);
        }
        let questionText = questionLines.join(" ")
          .replace(/^Question\s*\d+\s*[:.)]\s*/i, "")
          .replace(/^\d+\s*[.)]\s*/, "")
          .trim();
        const choices = {};
        lines.forEach(line => {
          const match = line.match(/^([A-D])\)\s*(.*)/);
          if (match) choices[match[1]] = match[2];
        });
        const correctMatch = lines.find(l => /correct\s+answer/i.test(l));
        let correctAnswerText = "";
        if (correctMatch) {
          const extracted = correctMatch.replace(/^.*correct\s+answer\s*[:)]\s*/i, "").trim().replace(/[.)]\s*$/, "").trim();
          correctAnswerText = extracted;
        }
        const correctLetter = correctMatch ? (correctMatch.match(/([A-D])\)/) || correctMatch.match(/[:\s]([A-D])[\s.]*$/i) || correctMatch.match(/\b([A-D])\b/))?.[1]?.toUpperCase() : "";
        const isTrueFalse = /^\s*(true|false)\s*$/i.test(correctAnswerText);
        const isIdentification = correctAnswerText && !/^[A-D]\s*$/i.test(correctAnswerText) && !isTrueFalse;
        const hasFourOptions = choices["A"] || choices["B"] || choices["C"] || choices["D"];
        let questionType = "multiple-choice";
        if (isIdentification && !hasFourOptions) questionType = "identification";
        else if (isTrueFalse && (!hasFourOptions || (Object.keys(choices).length <= 2))) questionType = "true-false";
        else if (hasFourOptions) questionType = "multiple-choice";
        else if (isIdentification) questionType = "identification";
        else if (isTrueFalse) questionType = "true-false";
        return { questionType, questionText, choices, correctAnswerText, correctLetter, typeOrder: typeOrder[questionType] ?? 99 };
      });

      // Sort: 1st Multiple choice, 2nd True or False, 3rd Identification
      parsed.sort((a, b) => a.typeOrder - b.typeOrder);

      let globalIndex = 0;
      let lastSection = null;
      const sectionTitles = { "multiple-choice": "Multiple choice", "true-false": "True or False", "identification": "Identification" };

      parsed.forEach((item) => {
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
            </div>
          `;
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
            </div>
          `;
        } else {
          const correctOption = correctLetter || (choices["A"] ? "A" : "");
          div.innerHTML = `
            <div class="ai-question-item__header">
                <h4 class="ai-question-item__title">Question ${i + 1} <span class="ai-question-type-badge">Multiple choice</span></h4>
                <button type="button" class="ai-question-remove-btn" onclick="this.closest('.question-item').remove()">Remove</button>
            </div>
            <input type="text" class="form-input ai-question-input" placeholder="Enter question" value="${escapeHtml(questionText)}">
            <div class="space-y-2 ai-question-options">
            ${["A","B","C","D"].map(letter => `
                <div class="ai-question-option-row">
                    <input type="radio" name="correct-${i}" ${correctOption === letter ? "checked" : ""} class="ai-question-radio">
                    <input type="text" class="form-input" placeholder="Option ${letter}" value="${escapeHtml(choices[letter] || "")}">
                </div>
            `).join("")}
            </div>
          `;
        }
        container.appendChild(div);
      });
    }

    document.getElementById("ai-save-btn").disabled = false;
    document.getElementById("ai-save-btn").style.opacity = 1;
  } catch (err) {
    console.error("Error generating quiz:", err);
    showNotification(err.message || "Network or server error. Please try again.", "error");
    generatedSection.classList.remove("hidden");
    container.innerHTML = "<p class=\"text-muted-foreground text-sm\">Generation failed. Check your connection and try again.</p>";
  } finally {
    btn.disabled = false;
    btn.innerHTML = "<i data-lucide=\"sparkles\" class=\"size-5\"></i><span>Generate quiz with AI</span>";
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }
}

function openAIModal(subjectId) {
    const modal = document.getElementById('ai-quiz-generator-modal');
    if (!modal) return console.error('AI Quiz Generator modal not found!');

    modal.classList.remove('hidden');
    modal.style.opacity = 0;
    
    // Load topics for this subject
    loadLessonsAndTopics();

    // Fade-in animation
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

// Save AI-generated quiz (collects from modal and POSTs to teacher/reading-quizzes)
async function saveAIQuiz() {
  const user = getCurrentUser();
  if (!user || user.role !== "teacher") {
    showNotification("You are not authorized to save quizzes.", "error");
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
    showNotification("Add at least one question or generate a quiz first.", "warning");
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
        { option_text: "False", is_correct: !!(secondRow?.querySelector(".ai-question-radio")?.checked) }
      ];
    } else if (questionType === "identification") {
      const identInput = item.querySelector(".ai-identification-input");
      const correctText = identInput ? identInput.value.trim() : "";
      options = [
        { option_text: correctText || "(Answer)", is_correct: true },
        { option_text: "(Other)", is_correct: false }
      ];
    }

    questions.push({
      question_text: questionText || "Question",
      question_type: "mcq",
      options: options.length ? options : [{ option_text: "", is_correct: true }]
    });
  });

  try {
    const res = await fetch("http://localhost:3000/api/teacher/reading-quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        difficulty: "beginner",
        passage: passage || "(No passage)",
        subject_id: getSelectedSubjectId(),
        user_id: user.user_id,
        questions
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showNotification(data.message || "Quiz saved successfully.", "success");
      closeAIModal();
      setTimeout(function () { reloadCreatedLessonsGrid(); }, 150);
    } else {
      showNotification(data.message || "Failed to save quiz.", "error");
    }
  } catch (err) {
    console.error("saveAIQuiz error:", err);
    showNotification("Failed to save quiz. Check your connection.", "error");
  }
}

// Close AI Quiz Generator Modal
function closeAIModal() {
  const modal = document.getElementById('ai-quiz-generator-modal');
  if (!modal) return;

  // Clear generated content
  const passageArea = document.getElementById('ai-generated-passage');
  const container = document.getElementById('ai-questions-container');
  const generatedSection = document.getElementById('ai-generated-section');
  const saveBtn = document.getElementById('ai-save-btn');

  if (passageArea) passageArea.value = '';
  if (container) container.innerHTML = '';
  if (generatedSection) generatedSection.classList.add('hidden');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.style.opacity = 1;
  }

  modal.classList.add('hidden');
}

// Initialize with one question when modal opens
document.addEventListener('DOMContentLoaded', function() {
    addQuestion();
});

async function loadLessonsAndTopics() {
  try {
    const classId = localStorage.getItem("eel_selected_class_id");
    if (!classId) return console.error("No class_id found in localStorage");

    const topicSelect = document.getElementById('ai-topic');
    if (!topicSelect) return console.error("Element with id 'ai-topic' not found in DOM");

    topicSelect.innerHTML = '<option>Loading...</option>';

    const res = await fetch(`http://localhost:3000/api/lessons-with-topics?class_id=${classId}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Invalid data format:", data);
      topicSelect.innerHTML = '<option>Error loading topics</option>';
      return;
    }

    if (data.length === 0) {
      topicSelect.innerHTML = '<option>No topics found</option>';
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

async function loadQuizzes(user = getCurrentUser()) {
    try {
        if (!user) return;

        const role = String(user.role || '').toLowerCase();
        const isTeacher = role === 'teacher';

        const myName = `${user.fname || ''} ${user.lname || ''}`.trim() || String(user.email || '').trim() || 'Student';
        const myInitials = getInitials(myName);

        // ✅ Get selected class and subject_id
        const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
        const subjectId = selectedClass?.subject_id;

        if (!subjectId) {
            console.warn("⚠️ No subject_id found in selected class.");
            return;
        }

        // ✅ Fetch quizzes for the selected subject
        const res = await fetch(
            `http://localhost:3000/api/reading-quizzes?subject_id=${subjectId}` +
            (!isTeacher ? `&student_id=${user.user_id}` : '')
        );
        if (!res.ok) throw new Error("Failed to fetch quizzes");
        const quizzes = await res.json();

        // ✅ Fetch student attempts if user is student
        let studentAttempts = [];
        if (!isTeacher) {
            const attemptsRes = await fetch(`http://localhost:3000/api/reading-quiz-attempts?student_id=${user.user_id}`);
            studentAttempts = await attemptsRes.json();
        }

        // ✅ Stable ordering + consecutive display numbering
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

        const hasGlobalQuizNumber = quizzes.some(q => Number(q.quiz_number || 0) > 10);
        let bCount = 0, iCount = 0, aCount = 0;
        const displayNumberByQuizId = new Map();
        quizzes.forEach(q => {
            let n;
            if (hasGlobalQuizNumber && q.quiz_number != null) n = Number(q.quiz_number);
            else {
                if (q.difficulty === 'beginner') n = (++bCount);
                else if (q.difficulty === 'intermediate') n = 10 + (++iCount);
                else if (q.difficulty === 'advanced') n = 20 + (++aCount);
                else n = (bCount + iCount + aCount + 1);
            }
            displayNumberByQuizId.set(Number(q.quiz_id), n);
        });

        // ✅ Unlock progression (prefer backend progress, fallback to attempts)
        let unlockedUpTo = 1;
        if (!isTeacher) {
            // Backend exposes the per-student unlocked quiz number on each quiz row
            const backendUnlockedUpTo = Math.max(
                1,
                ...quizzes.map(q => Number(q?.unlocked_quiz_number || 1))
            );
            unlockedUpTo = backendUnlockedUpTo;

            // Fallback: infer consecutive completion from attempts (works even if progress table isn't updated)
            if (Array.isArray(studentAttempts) && studentAttempts.length) {
                const completedNums = new Set(
                    studentAttempts
                        .filter(a => a.status === 'completed')
                        .map(a => displayNumberByQuizId.get(Number(a.quiz_id)))
                        .filter(Boolean)
                );
                let inferred = 1;
                while (completedNums.has(inferred)) inferred++;
                unlockedUpTo = Math.max(unlockedUpTo, inferred);
            }
        }

        const lessonsContainer = document.getElementById('lessons-grid');
        lessonsContainer.innerHTML = ''; // clear previous content

        // ✅ Create difficulty containers
        const beginnerContainer = document.createElement('div');
        const intermediateContainer = document.createElement('div');
        const advancedContainer = document.createElement('div');

        beginnerContainer.innerHTML = `<h2 class="card-title text-center px-2 py-1 text-lg rounded-lg bg-secondary/10 text-secondary">Beginner</h2>`;
        intermediateContainer.innerHTML = `<h2 class="card-title text-center px-2 py-1 text-lg rounded-lg bg-secondary/10 text-secondary">Intermediate</h2>`;
        advancedContainer.innerHTML = `<h2 class="card-title text-center px-2 py-1 text-lg rounded-lg bg-secondary/10 text-secondary">Advanced</h2>`;

        // ✅ Fallback counter (only used if quiz_number is missing)
        let seqFallback = 1;

        quizzes.forEach(quiz => {
            const backendLocked = (Number(quiz.is_locked) === 1) || (quiz.is_locked === true);
            const displayNum = displayNumberByQuizId.get(Number(quiz.quiz_id)) || 1;
            const effectiveLocked = isTeacher
                ? backendLocked
                : (displayNum === 1 ? false : (displayNum > unlockedUpTo));

            const card = document.createElement('div');
            card.className = 'card created-quiz-card group';
            card.dataset.quizId = String(quiz.quiz_id);

            let actionButtons = '';

            if (isTeacher) {
                actionButtons = `
                    <button class="btn btn-primary flex-1" onclick="event.stopPropagation(); openTeacherReadingReviewModal(${quiz.quiz_id})">
                        <i data-lucide="check-square" class="size-3 mr-1"></i>Review Answers
                    </button>
                    <button class="btn btn-outline flex-1" onclick="event.stopPropagation(); openLeaderboardModal(${quiz.quiz_id})">
                        <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>Leaderboard
                    </button>
                `;
            } else {
                const attemptsForQuiz = studentAttempts
                    .filter(a => a.quiz_id === quiz.quiz_id)
                    .sort((a, b) => (b.attempt_id || 0) - (a.attempt_id || 0));
                const attempt = attemptsForQuiz.find(a => a.status === 'in_progress') || attemptsForQuiz[0] || null;
                let btnText = 'Start Quiz', btnIcon = 'play', btnDisabled = effectiveLocked;
                const isCompleted = !!attempt && attempt.status === 'completed';

                if (attempt) {
                    if (attempt.status === 'completed') {
                        btnText = 'Review Quiz'; btnIcon = 'eye'; btnDisabled = false;
                    } else if (attempt.status === 'in_progress') {
                        btnText = 'Continue Quiz'; btnIcon = 'play'; btnDisabled = false;
                    }
                }

                actionButtons = `
                    <button class="btn btn-primary flex-1 ${btnDisabled ? 'opacity-50 cursor-not-allowed' : ''}" 
                            ${btnDisabled ? 'disabled' : ''} 
                            onclick="event.stopPropagation(); ${btnDisabled ? '' : `openQuizModal(${quiz.quiz_id})`}">
                        <i data-lucide="${btnIcon}" class="size-3 mr-1"></i>
                        ${btnText}
                    </button>
                    <button class="btn btn-outline flex-1" onclick="event.stopPropagation(); openLeaderboardModal(${quiz.quiz_id})">
                        <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>
                        Leaderboard
                    </button>
                `;
            }

            const quizNumber = displayNumberByQuizId.get(Number(quiz.quiz_id)) || (seqFallback++);

            const teacherSubmissionsSlot = isTeacher ? `
              <div class="quiz-card-seen" data-quiz-submissions>
                <div class="quiz-card-seen__avatars" aria-label="Students who completed this quiz"></div>
              </div>
            ` : '';

            const completedBadge = (!isTeacher && typeof isCompleted !== 'undefined' && isCompleted) ? `
                <span class="mini-avatar mini-avatar--sm" title="Completed by you" aria-label="Completed by you">${escapeHtml(myInitials)}</span>
            ` : '';

            const scheduleStatusLabel = isTeacher
                ? (effectiveLocked ? 'Locked' : 'Open to students')
                : (effectiveLocked ? 'Locked (finish previous quiz to unlock)' : 'Unlocked');

            card.innerHTML = `
                <div class="created-quiz-card__inner">
                    <div class="created-quiz-card__header" role="button" tabindex="0" aria-expanded="false" aria-label="Expand quiz details">
                        <div class="created-quiz-card__icon" aria-hidden="true">
                            <i data-lucide="book-open" class="created-quiz-card__icon-svg"></i>
                        </div>
                        <div class="created-quiz-card__title-wrap">
                            <h3 class="created-quiz-card__title">${escapeHtml(quizNumber + '. ' + quiz.title)}</h3>
                            ${completedBadge}
                        </div>
                        <i data-lucide="chevron-down" class="created-quiz-card__chevron" aria-hidden="true"></i>
                    </div>
                    <div class="created-quiz-card__details hidden">
                        <p class="created-quiz-card__passage">${escapeHtml(quiz.passage ? quiz.passage.substring(0, 140).trim() + (quiz.passage.length > 140 ? '…' : '') : 'No description available.')}</p>
                        <div class="created-quiz-card__schedule">
                            <span class="created-quiz-card__schedule-text">${scheduleStatusLabel}</span>
                        </div>
                        ${teacherSubmissionsSlot}
                        <div class="quiz-actions created-quiz-card__actions">${actionButtons}</div>
                    </div>
                </div>
            `;

            const header = card.querySelector('.created-quiz-card__header');
            const details = card.querySelector('.created-quiz-card__details');
            const toggle = () => {
                const wasHidden = details.classList.contains('hidden');
                details.classList.toggle('hidden');
                header.setAttribute('aria-expanded', wasHidden);
                card.classList.toggle('created-quiz-card--open', wasHidden);
                if (wasHidden) try { ensureTeacherQuizSubmissions(card); } catch (e) { /* ignore */ }
                if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
            };
            header.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
            header.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
            card.querySelectorAll('.quiz-actions .btn').forEach(btn => btn.addEventListener('click', (e) => e.stopPropagation()));

            // ✅ Append to the correct container
            if (quiz.difficulty === 'beginner') beginnerContainer.appendChild(card);
            else if (quiz.difficulty === 'intermediate') intermediateContainer.appendChild(card);
            else advancedContainer.appendChild(card);
        });

        // ✅ Append all difficulty sections to lessons-grid
        lessonsContainer.appendChild(beginnerContainer);
        lessonsContainer.appendChild(intermediateContainer);
        lessonsContainer.appendChild(advancedContainer);

        lucide.createIcons({ icons: lucide.icons });

    } catch (err) {
        console.error('Error loading quizzes:', err);
    }
}

/** Reload created-lessons-grid (no-op on reading page; AI quizzes are on lessons.html). */
async function reloadCreatedLessonsGrid() {
    const createdGrid = document.getElementById('created-lessons-grid');
    if (!createdGrid) return;
    try {
        await loadQuizzesTeacher();
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    } catch (e) {
        console.error('reloadCreatedLessonsGrid:', e);
    }
}

async function loadQuizzesTeacher() {
    const user = getCurrentUser();
    if (!user) return;

    const container = document.getElementById('created-lessons-grid');
    if (!container) return;

    const isTeacher = String(user.role || '').toLowerCase() === 'teacher';
    const selectedClass = JSON.parse(localStorage.getItem('eel_selected_class') || '{}');
    const subjectId = selectedClass?.subject_id;

    try {
        const now = new Date();
        let url;
        if (isTeacher) {
            url = `http://localhost:3000/api/teacher/reading-quizzes?user_id=${user.user_id}`;
            if (subjectId) url += `&subject_id=${subjectId}`;
        } else {
            if (!subjectId) {
                container.innerHTML = '<p class="text-center text-muted-foreground py-4">Select a class to see quizzes created by your teacher.</p>';
                return;
            }
            url = `http://localhost:3000/api/teacher/reading-quizzes?subject_id=${subjectId}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch quizzes');

        const quizzes = await res.json();
        quizzes.sort((a, b) => {
            const ta = new Date(a.created_at || 0).getTime();
            const tb = new Date(b.created_at || 0).getTime();
            if (ta !== tb) return ta - tb;
            return (a.quiz_id || 0) - (b.quiz_id || 0);
        });

        container.innerHTML = '';
        container.className = 'created-lessons-grid';

        const gridList = document.createElement('div');
        gridList.className = 'created-lessons-grid__list';

        quizzes.forEach(quiz => {
            const start = quiz.unlock_time ? new Date(quiz.unlock_time) : null;
            const end = quiz.lock_time ? new Date(quiz.lock_time) : null;
            const hasSchedule = !!(start && end);
            const isCurrentlyLocked = hasSchedule && end && now > end;
            const notYetOpen = hasSchedule && start && now < start;
            // Student: lock if no schedule set or outside schedule window
            const scheduleNotSet = !hasSchedule;

            const card = document.createElement('div');
            card.className = 'card created-quiz-card group';

            var actionButtons;
            if (isTeacher) {
                const scheduleData = hasSchedule
                    ? JSON.stringify({ unlock_time: quiz.unlock_time || null, lock_time: quiz.lock_time || null, time_limit: quiz.time_limit ?? null }).replace(/'/g, '&#39;')
                    : '';
                actionButtons = hasSchedule && !isCurrentlyLocked
                    ? `
                <button class="btn btn-outline flex-1" onclick="event.stopPropagation(); openLeaderboardModal(${quiz.quiz_id}, true)">
                    <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>Leaderboard
                </button>
                <button class="btn btn-outline flex-1" onclick="event.stopPropagation(); handleLockTeacherQuiz(${quiz.quiz_id}, this)" data-unlock-time="${(quiz.unlock_time || '').replace(/"/g, '&quot;')}" data-time-limit="${quiz.time_limit != null ? quiz.time_limit : ''}">
                    <i data-lucide="lock" class="size-3 mr-1"></i>Lock
                </button>
                <button class="btn btn-primary flex-1" data-schedule='${scheduleData}' onclick="event.stopPropagation(); openScheduleModalWithData(${quiz.quiz_id}, this.getAttribute('data-schedule'))">
                    <i data-lucide="calendar-clock" class="size-3 mr-1"></i>Edit schedule
                </button>
            `
                    : `
                <button class="btn btn-outline flex-1" onclick="event.stopPropagation(); openLeaderboardModal(${quiz.quiz_id}, true)">
                    <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>Leaderboard
                </button>
                <button id="lock-btn-${quiz.quiz_id}" class="btn btn-primary flex-1" data-schedule='${scheduleData}' onclick="event.stopPropagation(); (this.getAttribute('data-schedule') ? openScheduleModalWithData(${quiz.quiz_id}, this.getAttribute('data-schedule')) : openScheduleModal(${quiz.quiz_id}, true))">
                    <i data-lucide="unlock" class="size-3 mr-1"></i>Unlock
                </button>
            `;
            } else {
                // Lock when schedule not set, or not yet open, or past deadline
                const effectiveLocked = scheduleNotSet || isCurrentlyLocked || notYetOpen;
                let btnLabel = 'Start Quiz';
                if (effectiveLocked) {
                    if (scheduleNotSet) btnLabel = 'Not scheduled';
                    else if (notYetOpen) btnLabel = 'Not yet open';
                    else btnLabel = 'Locked';
                }
                const btnIcon = effectiveLocked ? 'lock' : 'play';
                actionButtons = `
                <button type="button" id="quiz-btn-${quiz.quiz_id}" class="btn btn-primary flex-1" ${effectiveLocked ? 'disabled' : ''} onclick="event.stopPropagation(); startLesson(${quiz.quiz_id}, true)">
                    <i data-lucide="${btnIcon}" class="size-3 mr-1"></i>${btnLabel}
                </button>
                <button class="btn btn-outline flex-1" onclick="event.stopPropagation(); openLeaderboardModal(${quiz.quiz_id}, true)">
                    <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>Leaderboard
                </button>
            `;
            }

            const scheduleLabel = hasSchedule
                ? (quiz.unlock_time && quiz.lock_time ? `Opens ${formatDateTime(quiz.unlock_time)} · Due ${formatDateTime(quiz.lock_time)}` : 'Scheduled')
                : 'Not scheduled';
            const statusClass = scheduleNotSet ? 'created-quiz-status--none' : (notYetOpen ? 'created-quiz-status--pending' : (isCurrentlyLocked ? 'created-quiz-status--closed' : 'created-quiz-status--open'));

            card.innerHTML = `
                <div class="created-quiz-card__inner">
                    <div class="created-quiz-card__header" role="button" tabindex="0" aria-expanded="false" aria-label="Expand quiz details">
                        <div class="created-quiz-card__icon" aria-hidden="true">
                            <i data-lucide="book-open" class="created-quiz-card__icon-svg"></i>
                        </div>
                        <div class="created-quiz-card__title-wrap">
                            <h3 class="created-quiz-card__title">${escapeHtml(quiz.title)}</h3>
                        </div>
                        <i data-lucide="chevron-down" class="created-quiz-card__chevron" aria-hidden="true"></i>
                    </div>
                    <div class="created-quiz-card__details hidden">
                        <p class="created-quiz-card__passage">${escapeHtml(quiz.passage ? quiz.passage.substring(0, 140).trim() + (quiz.passage.length > 140 ? '…' : '') : 'No description.')}</p>
                        <div class="created-quiz-card__schedule">
                            <i data-lucide="calendar-clock" class="created-quiz-card__schedule-icon" aria-hidden="true"></i>
                            <span class="created-quiz-card__schedule-text ${statusClass}">${scheduleLabel}</span>
                        </div>
                        <div class="quiz-actions created-quiz-card__actions">${actionButtons}</div>
                    </div>
                </div>
            `;

            const header = card.querySelector('.created-quiz-card__header');
            const details = card.querySelector('.created-quiz-card__details');
            const toggle = () => {
                const isOpen = !details.classList.contains('hidden');
                details.classList.toggle('hidden', isOpen);
                header.setAttribute('aria-expanded', !isOpen);
                card.classList.toggle('created-quiz-card--open', !isOpen);
                if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
            };
            header.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
            header.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
            card.querySelectorAll('.quiz-actions .btn').forEach(btn => btn.addEventListener('click', (e) => e.stopPropagation()));

            gridList.appendChild(card);
        });

        if (quizzes.length > 0) {
            container.appendChild(gridList);
        } else {
            container.innerHTML = '<p class="created-lessons-grid__empty">' + (isTeacher ? 'No quizzes created yet.' : 'No quizzes from your teacher for this subject yet.') + '</p>';
        }

        lucide.createIcons({ icons: lucide.icons });

    } catch (err) {
        console.error('Error loading teacher quizzes:', err);
        const container = document.getElementById('created-lessons-grid');
        container.innerHTML = '<p class="text-center text-red-500">Failed to load your quizzes.</p>';
    }
}

function handleLockUnlock(quizId, isLocked) {
    openScheduleModal(quizId, true);
}

async function handleLockTeacherQuiz(quizId, lockButton) {
    if (typeof Swal === 'undefined') {
        if (confirm('Lock this quiz? Students will no longer be able to take it.')) doLockTeacherQuiz(quizId, lockButton);
        return;
    }
    const result = await Swal.fire({
        title: 'Lock quiz?',
        text: 'Students will no longer be able to take this quiz. You can change the schedule again with "Edit schedule".',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, lock it'
    });
    if (result.isConfirmed) doLockTeacherQuiz(quizId, lockButton);
}

async function doLockTeacherQuiz(quizId, lockButton) {
    const unlockTimeRaw = lockButton && lockButton.getAttribute('data-unlock-time');
    const timeLimit = lockButton && lockButton.getAttribute('data-time-limit');
    const now = getPHDateTimeLocal();
    const lockTimeISO = toPHISOString(now);
    if (!lockTimeISO) {
        showNotification('Invalid date. Please try again.', 'error');
        return;
    }
    const unlockForParse = (unlockTimeRaw || '').replace(/&quot;/g, '"').trim();
    let unlockTimeISO = unlockForParse ? toPHISOString(unlockForParse) : null;
    if (!unlockTimeISO) unlockTimeISO = lockTimeISO;
    const timeLimitNum = (timeLimit !== '' && timeLimit != null) ? parseInt(timeLimit, 10) : null;
    try {
        const res = await fetch(`http://localhost:3000/api/teacher/reading-quizzes/${quizId}/schedule`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                unlock_time: unlockTimeISO,
                lock_time: lockTimeISO,
                time_limit: timeLimitNum
            })
        });
        const text = await res.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (_) {}
        if (res.ok && data.success) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'success', title: 'Locked', text: 'Quiz is now locked.', confirmButtonColor: '#6366f1' });
            } else {
                showNotification('Quiz locked.', 'success');
            }
            if (typeof loadQuizzesTeacher === 'function') loadQuizzesTeacher();
        } else {
            showNotification(data.message || (res.status === 404 ? 'Lock not available. Try again.' : 'Failed to lock quiz.'), 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Failed to lock quiz.', 'error');
    }
}

let currentLeaderboardIsTeacher = false;

function openLeaderboardModal(quizId, isTeacherQuiz = false) {
    currentQuizId = quizId;
    currentLeaderboardIsTeacher = !!isTeacherQuiz;
    document.getElementById("leaderboard-modal").classList.remove("hidden");
    loadLeaderboard(quizId, isTeacherQuiz).then(function () {
        if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    });
}

function closeLeaderboardModal() {
    document.getElementById('leaderboard-modal').classList.add('hidden');
    document.getElementById('quiz-result-modal').classList.add('hidden');
}

let currentQuizId = null;

async function loadLeaderboard(quizId = null, isTeacherQuiz = null) {
    try {
        if (quizId !== null) currentQuizId = quizId;
        if (isTeacherQuiz !== null) currentLeaderboardIsTeacher = !!isTeacherQuiz;

        let url = "http://localhost:3000/api/reading-quiz-leaderboard";
        if (currentQuizId) url += `?quiz_id=${currentQuizId}`;
        if (currentLeaderboardIsTeacher) url += "&teacher_quiz=1";

        const res = await fetch(url);
        const data = await res.json();

        const tbody = document.getElementById("leaderboard-body");
        tbody.innerHTML = "";

        // Set quiz name in modal (id quiz-name)
        const quizNameEl = document.getElementById("quiz-name");
        if (quizNameEl) quizNameEl.textContent = data.quizTitle || "Quiz";

        // Podium cards
        const podiums = [
            document.querySelector(".podium-card.first-place"),
            document.querySelector(".podium-card.second-place"),
            document.querySelector(".podium-card.third-place")
        ];
        const gradients = ["#fbbf24,#f59e0b", "#9ca3af,#6b7280", "#fb923c,#ea580c"];

        const scoreSpan = (p) => p && p.querySelector && p.querySelector(".podium-score span");
        podiums.forEach((podium, idx) => {
            if (!podium) return;
            podium.querySelector(".podium-avatar").textContent = "";
            podium.querySelector(".podium-name").textContent = "—";
            const sp = scoreSpan(podium);
            if (sp) sp.textContent = "-";
            podium.querySelector(".podium-avatar").style.background = `linear-gradient(135deg, ${gradients[idx]})`;
        });

        if (Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
            data.leaderboard.forEach((entry, index) => {
                const initials = entry.student_name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();

                if (index < 3 && podiums[index]) {
                    podiums[index].querySelector(".podium-avatar").textContent = initials;
                    podiums[index].querySelector(".podium-name").textContent = entry.student_name;
                    const sp = scoreSpan(podiums[index]);
                    if (sp) sp.textContent = entry.total_points ? `${entry.score}/${entry.total_points}` : `${entry.score} pts`;
                }

                // Table rows
                const rankBadge = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1;
                const rowClass = index < 3 ? "top-three" : "";
                const avatarGradient = gradients[index % gradients.length];

                const row = `
                    <tr class="leaderboard-table-row ${rowClass}">
                        <td><span class="rank-badge ${index < 3 ? 'rank-' + (index+1) : ''}">${rankBadge}</span></td>
                        <td>
                            <div class="student-info">
                                <div class="student-avatar" style="background: linear-gradient(135deg, ${avatarGradient});">${initials}</div>
                                <span>${entry.student_name}</span>
                            </div>
                        </td>
                        <td><span class="score-badge">${entry.score}/${entry.total_points}</span></td>
                        <td><span class="time-badge">${entry.time_taken || "-"}</span></td>
                        <td><span class="status-badge completed">✓ ${entry.status}</span></td>
                    </tr>
                `;
                tbody.insertAdjacentHTML("beforeend", row);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--muted-foreground);">No students have taken this quiz yet.</td></tr>`;
        }
        if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    } catch (err) {
        console.error("❌ Load leaderboard error:", err);
        document.getElementById("leaderboard-body").innerHTML = `
            <tr><td colspan="5" style="text-align:center; color:var(--destructive);">Failed to load leaderboard.</td></tr>`;
    }
}

function refreshLeaderboard() {
    loadLeaderboard(currentQuizId, currentLeaderboardIsTeacher);
}


function showResultModal(score, totalPoints) {
    const modal = document.getElementById("quiz-result-modal");
    const scoreEl = document.getElementById("student-score");
    const feedbackEl = document.getElementById("feedback-message");
    const feedbackIcon = document.getElementById("feedback-icon");
    const resultIcon = document.getElementById("result-icon");
    const progressRing = document.getElementById("result-progress-ring-fill");

    // 🧮 Calculate percentage only for internal logic (not shown)
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    // 🎯 Display score & stats
    scoreEl.textContent = `${score}/${totalPoints}`;

    // 🌈 Determine feedback and colors
    let feedback = "Keep trying!";
    let color = "#ef4444"; // red
    let icon = "💪";
    let resultEmoji = "🎯";

    const ratio = totalPoints > 0 ? score / totalPoints : 0;

    if (ratio >= 0.9) {
        feedback = "Outstanding! You're a quiz master! 🌟";
        color = "#10b981";
        icon = "🏆";
        resultEmoji = "🚀";
    } else if (ratio >= 0.75) {
        feedback = "Great job! Keep it up! 💪";
        color = "#3b82f6";
        icon = "⭐";
        resultEmoji = "🎉";
    } else if (ratio >= 0.5) {
        feedback = "Good effort! You’re improving! 👍";
        color = "#f59e0b";
        icon = "✨";
        resultEmoji = "🎯";
    } else {
        feedback = "Keep practicing! You’ll get there! 💡";
        color = "#ef4444";
        icon = "💔";
        resultEmoji = "💪";
    }


    feedbackEl.textContent = feedback;
    feedbackIcon.textContent = icon;
    resultIcon.textContent = resultEmoji;

    // 🎨 Animate progress circle (based on score ratio)
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    progressRing.style.strokeDasharray = `${circumference}`;
    progressRing.style.strokeDashoffset = `${circumference}`;
    progressRing.style.stroke = color;

    setTimeout(() => {
        const offset = circumference - (percentage / 100) * circumference;
        progressRing.style.transition = "stroke-dashoffset 1.2s ease, stroke 0.5s ease";
        progressRing.style.strokeDashoffset = offset;
    }, 200);

    // 🎬 Show modal
    modal.classList.remove("hidden");
    modal.style.opacity = "1";
    modal.style.display = "flex";
}

// 🕒 Helper: Convert time to readable format
function formatTimeTaken(timeTaken) {
    if (!timeTaken) return "0s";
    const parts = timeTaken.split(":").map(Number);
    if (parts.length === 3) {
        const [h, m, s] = parts;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }
    return timeTaken.replace("-", "");
}

function closeResultModal() {
    const modal = document.getElementById("quiz-result-modal");
    modal.classList.add("hidden");
}

// Toggle card details
function toggleQuizCard(card) {
    const details = card.querySelector('.card-details');
    if (!details) return;

    const willOpen = details.classList.contains('hidden');
    const allCards = card.parentElement.querySelectorAll('.card');
    allCards.forEach(c => {
        const cDetails = c.querySelector('.card-details');
        if (!cDetails) return;
        if (c === card) {
            cDetails.classList.toggle('hidden');
        } else {
            cDetails.classList.add('hidden');
        }
    });

    // Lazy-load teacher submissions avatars when opening
    if (willOpen) {
        try { ensureTeacherQuizSubmissions(card); } catch (e) { /* ignore */ }
    }
}

const __teacherQuizSubmissionsCache = new Map(); // quizId -> { html, loadedAt }

async function ensureTeacherQuizSubmissions(card) {
    const user = getCurrentUser();
    const role = String(user?.role || '').toLowerCase();
    if (role !== 'teacher') return;

    const quizId = Number(card?.dataset?.quizId || 0);
    if (!quizId) return;

    const host = card.querySelector('[data-quiz-submissions]');
    if (!host) return;

    const avatarsHost = host.querySelector('.quiz-card-seen__avatars');
    if (!avatarsHost) return;

    const cached = __teacherQuizSubmissionsCache.get(quizId);
    if (cached?.html) {
        avatarsHost.innerHTML = cached.html;
        return;
    }

    // Loading placeholder: a single "…" bubble
    avatarsHost.innerHTML = `
      <span class="mini-avatar mini-avatar--sm" style="opacity:.75;" aria-label="Loading">…</span>
    `;

    const selectedClass = (() => {
        try { return JSON.parse(localStorage.getItem("eel_selected_class")); } catch { return null; }
    })();
    const classId = Number(selectedClass?.id || localStorage.getItem("eel_selected_class_id") || 0) || null;

    const attemptsRes = await fetch(
        `http://localhost:3000/api/teacher/reading-attempts?quiz_id=${quizId}` +
        (classId ? `&class_id=${classId}` : '')
    );
    const attemptsData = await attemptsRes.json();
    const attempts = Array.isArray(attemptsData?.attempts) ? attemptsData.attempts : [];

    // Unique students, completed only (latest first)
    const seen = new Set();
    const students = [];
    for (const a of attempts) {
        if (String(a?.status || '').toLowerCase() !== 'completed') continue;
        const sid = Number(a.student_id || 0);
        if (!sid || seen.has(sid)) continue;
        seen.add(sid);
        students.push({
            student_id: sid,
            student_name: a.student_name || `Student #${sid}`
        });
        if (students.length >= 6) break;
    }

    const totalCompleted = attempts.filter(a => String(a?.status || '').toLowerCase() === 'completed').length;

    let html = '';
    if (totalCompleted) {
        const avatars = students.map(s => {
            const initials = getInitials(s.student_name);
            return `
              <span class="mini-avatar mini-avatar--sm" title="${escapeHtml(s.student_name)}" aria-label="${escapeHtml(s.student_name)}">
                ${escapeHtml(initials)}
              </span>
            `;
        }).join('');

        const extra = Math.max(0, totalCompleted - students.length);
        const extraBubble = extra
            ? `<span class="mini-avatar mini-avatar--sm" title="+${extra} more" aria-label="+${extra} more">+${extra}</span>`
            : '';

        html = `${avatars}${extraBubble}`;
    }

    __teacherQuizSubmissionsCache.set(quizId, { html, loadedAt: Date.now() });
    avatarsHost.innerHTML = html;
}

// Utility functions
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

// ============================================================
// TEACHER: Review + override grading (near-miss spelling/case)
// ============================================================
let teacherReadingReviewState = {
    quizId: null,
    attemptId: null,
    quiz: null,
    attempts: [],
    search: ''
};

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

function closeTeacherReadingReviewModal() {
    const modal = document.getElementById('teacher-reading-review-modal');
    modal?.classList.add('hidden');
    teacherReadingReviewState = { quizId: null, attemptId: null, quiz: null, attempts: [] };

    const list = document.getElementById('teacher-reading-attempts-list');
    const detail = document.getElementById('teacher-reading-attempt-detail');
    const title = document.getElementById('teacher-reading-review-quiz-title');
    const saveBtn = document.getElementById('teacher-reading-review-save-btn');
    if (list) list.innerHTML = '';
    if (detail) detail.innerHTML = `<div class="text-muted-foreground">Select an attempt to view answers.</div>`;
    if (title) title.textContent = 'Quiz';
    if (saveBtn) saveBtn.classList.add('hidden');
}

async function openTeacherReadingReviewModal(quizId) {
    const user = getCurrentUser();
    const role = String(user?.role || '').toLowerCase();
    if (!user || role !== 'teacher') return;

    const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
    const classId = selectedClass?.id;

    teacherReadingReviewState.quizId = quizId;

    const modal = document.getElementById('teacher-reading-review-modal');
    modal?.classList.remove('hidden');

    const titleEl = document.getElementById('teacher-reading-review-quiz-title');
    if (titleEl) titleEl.textContent = 'Loading...';

    try {
        // Fetch quiz structure (question text/options) for richer review UI
        const quizRes = await fetch(`http://localhost:3000/api/reading-quizzes/${quizId}`);
        teacherReadingReviewState.quiz = await quizRes.json();
        if (titleEl) titleEl.textContent = teacherReadingReviewState.quiz?.title || `Quiz #${quizId}`;

        // Fetch attempts for this quiz (filtered by class)
        const attemptsRes = await fetch(
            `http://localhost:3000/api/teacher/reading-attempts?quiz_id=${quizId}` +
            (classId ? `&class_id=${classId}` : '')
        );
        const attemptsData = await attemptsRes.json();
        teacherReadingReviewState.attempts = attemptsData?.attempts || [];

        // Wire up search/filter UI once
        const searchInput = document.getElementById('teacher-reading-attempt-search');
        if (searchInput && !searchInput.__eelBound) {
            searchInput.__eelBound = true;
            searchInput.addEventListener('input', () => {
                teacherReadingReviewState.search = String(searchInput.value || '');
                renderTeacherReadingAttemptsList();
            });
        }
        if (searchInput) {
            searchInput.value = teacherReadingReviewState.search || '';
        }

        renderTeacherReadingAttemptsList();
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    } catch (e) {
        console.error(e);
        showNotification?.("Failed to load attempts.", "error");
    }
}

function renderTeacherReadingAttemptsList() {
    const list = document.getElementById('teacher-reading-attempts-list');
    if (!list) return;

    const attemptsAll = teacherReadingReviewState.attempts || [];
    const q = String(teacherReadingReviewState.search || '').trim().toLowerCase();
    const attempts = q
        ? attemptsAll.filter(a => String(a.student_name || '').toLowerCase().includes(q))
        : attemptsAll;

    const countEl = document.getElementById('teacher-reading-attempts-count');
    if (countEl) {
        countEl.textContent = attemptsAll.length
            ? `${attempts.length}/${attemptsAll.length}`
            : '';
    }

    if (!attempts.length) {
        list.innerHTML = `<div class="text-muted-foreground text-sm">No submissions yet.</div>`;
        return;
    }

    list.innerHTML = attempts.map(a => {
        const name = a.student_name || `Student #${a.student_id}`;
        const initials = getInitials(name);
        const score = (a.score != null && a.total_points != null)
            ? `${Math.round(a.score)}/${Math.round(a.total_points)}`
            : '-';
        const isActive = Number(teacherReadingReviewState.attemptId) === Number(a.attempt_id);
        const time = a.end_time ? formatDateTime(a.end_time) : (a.start_time ? formatDateTime(a.start_time) : '');
        return `
            <button
              type="button"
              class="btn btn-outline w-full justify-between teacher-attempt-item ${isActive ? 'is-active' : ''}"
              onclick="loadTeacherReadingAttempt(${a.attempt_id})"
              style="display:flex; align-items:center; gap:.5rem;"
            >
              <span class="student-chip" style="min-width:0;">
                <span class="mini-avatar" aria-hidden="true">${escapeHtml(initials)}</span>
                <span style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${escapeHtml(name)}
                </span>
              </span>
              <span class="teacher-attempt-meta">
                <span class="text-xs text-muted-foreground">${escapeHtml(time)}</span>
                <span class="text-xs teacher-attempt-score">${score}</span>
              </span>
            </button>
        `;
    }).join('');
}

async function loadTeacherReadingAttempt(attemptId) {
    const saveBtn = document.getElementById('teacher-reading-review-save-btn');
    if (saveBtn) saveBtn.classList.add('hidden');

    teacherReadingReviewState.attemptId = attemptId;
    // reflect active selection immediately
    renderTeacherReadingAttemptsList();
    const detail = document.getElementById('teacher-reading-attempt-detail');
    if (detail) detail.innerHTML = `<div class="text-muted-foreground">Loading answers...</div>`;

    try {
        const res = await fetch(`http://localhost:3000/api/reading-quiz-attempts/${attemptId}/answers`);
        const answers = await res.json();

        renderTeacherReadingAttemptDetail(answers);
        if (saveBtn) saveBtn.classList.remove('hidden');

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    } catch (e) {
        console.error(e);
        showNotification?.("Failed to load answers.", "error");
    }
}

function renderTeacherReadingAttemptDetail(answers) {
    const quiz = teacherReadingReviewState.quiz;
    const detail = document.getElementById('teacher-reading-attempt-detail');
    if (!detail) return;

    const attempt = (teacherReadingReviewState.attempts || []).find(a => Number(a.attempt_id) === Number(teacherReadingReviewState.attemptId));
    const studentName = attempt?.student_name || (attempt?.student_id ? `Student #${attempt.student_id}` : 'Student');
    const studentInitials = getInitials(studentName);
    const score = (attempt?.score != null && attempt?.total_points != null)
        ? `${Math.round(attempt.score)}/${Math.round(attempt.total_points)}`
        : '-';
    const submitted = attempt?.end_time ? formatDateTime(attempt.end_time) : '';

    const byQuestionId = new Map((answers || []).map(a => [Number(a.question_id), a]));

    // Build a map optionId -> optionText for MCQ display
    const optionTextById = new Map();
    for (const q of (quiz?.questions || [])) {
        if (q.question_type === 'mcq' && Array.isArray(q.options)) {
            for (const opt of q.options) {
                optionTextById.set(Number(opt.option_id), opt.option_text);
            }
        }
    }

    const blocks = (quiz?.questions || []).map(q => {
        const ans = byQuestionId.get(Number(q.question_id));

        if (!ans) {
            return `
              <div class="card" style="margin:0;">
                <div class="card-header">
                  <div class="card-title">${escapeHtml(q.question_text || 'Question')}</div>
                  <div class="card-description">No answer saved.</div>
                </div>
              </div>
            `;
        }

        if (q.question_type === 'mcq') {
            const chosen = optionTextById.get(Number(ans.student_answer)) || '(no choice)';
            const normalizedChosen = String(chosen || '').trim().toLowerCase();
            const normalizedCorrect = String(ans.correct_answer || '').trim().toLowerCase();
            const inferredIsCorrect = (normalizedChosen && normalizedCorrect && normalizedChosen !== '(no choice)')
                ? (normalizedChosen === normalizedCorrect)
                : null;

            const effectiveIsCorrect = (ans.is_correct == null && inferredIsCorrect != null)
                ? (inferredIsCorrect ? 1 : 0)
                : ans.is_correct;

            const status = (effectiveIsCorrect == null)
                ? 'ungraded'
                : (Number(effectiveIsCorrect) ? 'correct' : 'wrong');
            const statusText = status === 'correct' ? 'Correct' : (status === 'wrong' ? 'Wrong' : 'Not graded');
            return `
              <div class="card teacher-answer-row" style="margin:0;" data-answer-id="${ans.answer_id}">
                <div class="card-header">
                  <div class="card-title">${escapeHtml(q.question_text || 'MCQ')}</div>
                  <div class="card-description">Correct: ${escapeHtml(ans.correct_answer || '-')}</div>
                </div>
                <div class="card-content space-y-2">
                  <div class="teacher-answer-line">
                    <strong>Student answer:</strong>
                    <span class="teacher-answer-text" data-status="${status}">${escapeHtml(chosen)}</span>
                    <span class="teacher-answer-chip teacher-answer-chip--${status}" aria-label="Answer status">${statusText}</span>
                  </div>
                  <div class="flex items-center gap-3 flex-wrap">
                    <label class="flex items-center gap-2">
                      <input type="checkbox" class="teacher-is-correct" ${ans.is_correct ? 'checked' : ''} />
                      <span>Mark correct</span>
                    </label>
                  </div>
                </div>
              </div>
            `;
        }

        if (q.question_type === 'essay') {
            return `
              <div class="card teacher-answer-row" style="margin:0;" data-answer-id="${ans.answer_id}">
                <div class="card-header">
                  <div class="card-title">${escapeHtml(q.question_text || 'Essay')}</div>
                  <div class="card-description">AI score: ${ans.ai_score ?? '-'} • Points earned: ${ans.points_earned ?? 0}</div>
                </div>
                <div class="card-content space-y-2">
                  <div class="p-3 rounded-lg border border-border bg-background" style="white-space:pre-wrap;">${escapeHtml(ans.student_answer || '')}</div>
                </div>
              </div>
            `;
        }

        if (q.question_type === 'fill_blank') {
            const blanks = Array.isArray(ans.blanks) ? ans.blanks : [];
            const rows = blanks.map(b => `
              <div class="p-3 rounded-lg border border-border bg-background teacher-blank-row"
                   data-student-blank-id="${b.student_blank_id}"
                   data-status="${(() => {
                      if (b.is_correct != null) return Number(b.is_correct) ? 'correct' : 'wrong';
                      const s = String(b.student_text || '').trim().toLowerCase();
                      const c = String(b.correct_answer || '').trim().toLowerCase();
                      if (!s || !c) return 'ungraded';
                      return (s === c) ? 'correct' : 'wrong';
                    })()}"
                   style="display:grid; grid-template-columns: 1fr 1fr auto; gap:.75rem; align-items:center;">
                <div>
                  <div class="text-xs text-muted-foreground">Student</div>
                  <div class="teacher-student-answer">${escapeHtml(b.student_text || '')}</div>
                </div>
                <div>
                  <div class="text-xs text-muted-foreground">Correct</div>
                  <div>${escapeHtml(b.correct_answer || '')}</div>
                </div>
                <div class="flex items-center gap-2 justify-end flex-wrap">
                  <label class="flex items-center gap-2">
                    <input type="checkbox" class="teacher-blank-is-correct" ${b.is_correct ? 'checked' : ''} />
                    <span class="text-xs">Correct</span>
                  </label>
                </div>
              </div>
            `).join('');

            return `
              <div class="card" style="margin:0;">
                <div class="card-header">
                  <div class="card-title">${escapeHtml(q.question_text || 'Fill in the blanks')}</div>
                  <div class="card-description">Mark correct for near-miss spelling/case if needed.</div>
                </div>
                <div class="card-content space-y-2">
                  ${rows || `<div class="text-muted-foreground">No blanks saved.</div>`}
                </div>
              </div>
            `;
        }

        return '';
    }).join('');

    detail.innerHTML = `
      <div class="teacher-review-summary">
        <div style="min-width:0;">
          <div class="text-xs text-muted-foreground">Student</div>
          <div class="student-chip" style="margin-top:.25rem; min-width:0;">
            <span class="mini-avatar" aria-hidden="true">${escapeHtml(studentInitials)}</span>
            <span class="font-semibold" style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${escapeHtml(studentName)}
            </span>
          </div>
        </div>
        <div class="teacher-review-summary__right">
          <div class="teacher-review-summary__chip">${escapeHtml(score)}</div>
          ${submitted ? `<div class="text-xs text-muted-foreground">${escapeHtml(submitted)}</div>` : ''}
        </div>
      </div>
      <div class="teacher-review-answers">
        ${blocks || `<div class="text-muted-foreground">No questions found for this quiz.</div>`}
      </div>
    `;

    // Live highlight updates when teacher toggles correctness
    detail.querySelectorAll('.teacher-answer-row').forEach(row => {
        const box = row.querySelector('.teacher-is-correct');
        const chip = row.querySelector('.teacher-answer-chip');
        const text = row.querySelector('.teacher-answer-text');
        if (!box || !chip || !text) return;
        box.addEventListener('change', () => {
            const status = box.checked ? 'correct' : 'wrong';
            text.dataset.status = status;
            chip.className = `teacher-answer-chip teacher-answer-chip--${status}`;
            chip.textContent = box.checked ? 'Correct' : 'Wrong';
            chip.setAttribute('aria-label', `Answer status: ${chip.textContent}`);
        });
    });

    detail.querySelectorAll('.teacher-blank-row').forEach(row => {
        const box = row.querySelector('.teacher-blank-is-correct');
        if (!box) return;
        box.addEventListener('change', () => {
            row.dataset.status = box.checked ? 'correct' : 'wrong';
        });
    });
}

async function saveTeacherReadingOverrides() {
    const user = getCurrentUser();
    const role = String(user?.role || '').toLowerCase();
    if (!user || role !== 'teacher') return;

    const attemptId = teacherReadingReviewState.attemptId;
    if (!attemptId) return;

    const answers = [];
    document.querySelectorAll('#teacher-reading-attempt-detail .teacher-answer-row').forEach(row => {
        const answerId = Number(row.getAttribute('data-answer-id'));
        const correctBox = row.querySelector('.teacher-is-correct');

        answers.push({
            answer_id: answerId,
            is_correct: correctBox ? Boolean(correctBox.checked) : null,
        });
    });

    const blanks = [];
    document.querySelectorAll('#teacher-reading-attempt-detail .teacher-blank-row').forEach(row => {
        const studentBlankId = Number(row.getAttribute('data-student-blank-id'));
        const correctBox = row.querySelector('.teacher-blank-is-correct');

        blanks.push({
            student_blank_id: studentBlankId,
            is_correct: correctBox ? Boolean(correctBox.checked) : null,
        });
    });

    try {
        const res = await fetch(`http://localhost:3000/api/teacher/reading-attempts/${attemptId}/override`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                teacher_id: user.user_id,
                answers,
                blanks
            })
        });
        const data = await res.json();
        if (!data.success) {
            showNotification?.("Failed to save adjustments.", "error");
            return;
        }

        showNotification?.("Adjustments saved.", "success");
        // Refresh attempt list scores
        await openTeacherReadingReviewModal(teacherReadingReviewState.quizId);
        await loadTeacherReadingAttempt(attemptId);
    } catch (e) {
        console.error(e);
        showNotification?.("Failed to save adjustments.", "error");
    }
}