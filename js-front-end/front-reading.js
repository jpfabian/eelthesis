let currentUser = null;

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

        const teacherControls = document.getElementById('teacher-controls');
        const tabCreated = document.getElementById('tab-created');
        const tabCourse = document.getElementById('tab-course');

        // Set tab text based on role
        tabCreated.textContent = currentUser.role === 'teacher' ? 'Created by me' : 'Created by teacher';
        teacherControls?.classList.add('hidden'); // hide by default

        // Show main app
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        // Default tab: always Built-in lessons
        await showCourseTab();

        // Back button
        document.getElementById("back-class-btn")?.addEventListener("click", () => {
            window.location.href = "classes.html";
        });

        // Tab click handlers
        tabCourse?.addEventListener('click', () => showCourseTab());
        tabCreated?.addEventListener('click', () => showCreatedTab());

        async function showCourseTab() {
            // Show built-in lessons
            document.getElementById('created-lessons-grid').classList.remove('hidden');
            // Hide created lessons & teacher controls
            document.getElementById('lessons-grid').classList.add('hidden');
            teacherControls?.classList.add('hidden');

            tabCourse.classList.add('btn-primary');
            tabCourse.classList.remove('btn-outline');
            tabCreated.classList.remove('btn-primary');
            tabCreated.classList.add('btn-outline');

            // Load quizzes for Built-in
            await loadQuizzes(currentUser, 'teacher'); // built-in teacher quizzes
        }

        async function showCreatedTab() {
            // Show created lessons
            document.getElementById('created-lessons-grid').classList.add('hidden');
            // Hide built-in lessons
            document.getElementById('lessons-grid').classList.remove('hidden');

            if (currentUser.role === 'teacher') {
                teacherControls?.classList.remove('hidden'); // teacher can see create buttons
                await loadQuizzes(currentUser, 'me'); // teacher sees their own quizzes
            } else {
                teacherControls?.classList.add('hidden'); // student sees nothing
                document.getElementById('created-lessons-grid').innerHTML = ''; // student sees empty
            }

            tabCreated.classList.add('btn-primary');
            tabCreated.classList.remove('btn-outline');
            tabCourse.classList.remove('btn-primary');
            tabCourse.classList.add('btn-outline');
        }

    } catch (error) {
        console.error('Error initializing page:', error);
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
    const title = document.getElementById('lesson-title').value;
    const difficulty = document.getElementById('lesson-difficulty').value;
    const passage = document.getElementById('lesson-passage').value;

    if (!title || !passage) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }

    const questions = Array.from(document.querySelectorAll('.question-item')).map(item => {
    const questionText = item.querySelector('.question-text')?.value || '';
    let question_type = 'mcq'; // default to beginner MCQ

    const optionsElements = item.querySelectorAll('.option');
    const options = Array.from(optionsElements).map(input => input.value);
    const correctAnswer = parseInt(item.querySelector('.correct-answer')?.value);

    const difficulty = document.getElementById('lesson-difficulty').value;
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
        const res = await fetch('/api/reading-quizzes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title, 
                difficulty, 
                passage, 
                subject_id: getSelectedSubjectId(), // ✅ include subject_id
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

let currentQuestionIndex = 0;
let quizData = null;
let attemptId = null;
let studentAnswers = {}; 
let readonly = false;
let countdownInterval = null;
let remainingTimePerQuiz = {}; // store remaining time per quiz

async function openQuizModal(lessonId) {
    const modal = document.getElementById('take-quiz-modal');
    if (!modal) return console.error('Quiz modal not found!');

    try {
        // 1️⃣ Fetch the quiz
        const resQuiz = await fetch(`/api/reading-quizzes/${lessonId}`);
        const quiz = await resQuiz.json();

        const now = new Date();
        const unlockTime = quiz.unlock_time ? new Date(quiz.unlock_time.replace(' ', 'T')) : null;
        const lockTime = quiz.lock_time ? new Date(quiz.lock_time.replace(' ', 'T')) : null;

        if ((unlockTime && now < unlockTime) || (lockTime && now > lockTime)) {
            showNotification("This quiz is not yet available or has already closed.", "warning");
            return;
        }

        modal.classList.remove('hidden');
        document.getElementById('quiz-title').textContent = quiz.title;
        document.getElementById('quiz-passage').textContent = quiz.passage || "(No passage provided)";

        quizData = quiz;
        studentAnswers = {};
        const user = JSON.parse(localStorage.getItem('eel_user'));

        // 2️⃣ Check for previous attempts
        const attemptRes = await fetch(`/api/reading-quiz-attempts?quiz_id=${lessonId}&student_id=${user.user_id}`);
        const attempts = await attemptRes.json();
        const existingAttempt = attempts.find(a => Number(a.quiz_id) === Number(lessonId));

        if (existingAttempt) {
            attemptId = existingAttempt.attempt_id;
            studentAnswers = existingAttempt.answers || {};
            readonly = existingAttempt.status === 'completed';
        } else {
            // 🆕 Create new attempt for this quiz only
            const newAttemptRes = await fetch("/api/reading-quiz-attempts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ student_id: user.user_id, quiz_id: lessonId })
            });
            const newAttempt = await newAttemptRes.json();
            attemptId = newAttempt.attempt_id;
            studentAnswers = {};
            readonly = false;
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

        // 4️⃣ Fetch student's answers if readonly
        if (readonly) {
            const resAnswers = await fetch(`/api/reading-quiz-attempts/${attemptId}/answers`);
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
    p.style.color = '#374151';
    div.appendChild(p);

    const studentAnswer = studentAnswers[q.question_id];

    // ==================== MCQ ====================
    if (q.question_type === 'mcq' && q.options?.length) {
        q.options.forEach(opt => {
            const label = document.createElement('label');
            label.classList.add('quiz-option');

            if (readonly) {
                if (opt.is_correct) label.style.backgroundColor = '#d1fae5';
                else if (Number(studentAnswer) === opt.option_id && !opt.is_correct) {
                    label.style.backgroundColor = '#fee2e2';
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
                correctText.style.marginLeft = '0.5rem';
                correctText.style.fontSize = '0.875rem';
                correctText.style.color = '#047857';
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
    if (!quizData || !attemptId) return;

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
        const saveRes = await fetch(`/api/reading-quiz-answers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attempt_id: attemptId, answers, timeTakenSeconds })
        });

        const saveData = await saveRes.json();
        if (!saveData.success) return showNotification("Failed to save answers.", "error");

        // 🧾 Submit attempt
        const submitRes = await fetch(`/api/reading-quiz-attempts/${attemptId}/submit`, { 
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

function openScheduleModal(lessonId, quizData) {
    currentLessonId = lessonId;
    const modal = document.getElementById('schedule-modal');
    modal.classList.remove('hidden');

    // Populate unlock/lock times from DB
    document.getElementById('modal-unlock-time').value = dbTimeToLocal(quizData.unlock_time);
    document.getElementById('modal-lock-time').value = dbTimeToLocal(quizData.lock_time);

    // Prevent selecting past datetime
    const now = new Date();
    const formattedNow = now.toISOString().slice(0,16); // YYYY-MM-DDTHH:mm
    document.getElementById('modal-unlock-time').min = formattedNow;
    document.getElementById('modal-lock-time').min = formattedNow;

    // Populate other fields if needed
    document.getElementById('modal-time-limit').value = quizData.time_limit || '';
    document.getElementById('retake-option').value = quizData.retake_option || 'all';

    if (quizData.retake_option === 'specific') {
        const container = document.getElementById('specific-students-container');
        container.classList.remove('hidden');
        const select = document.getElementById('specific-students');
        const allowed = quizData.allowed_students || [];
        Array.from(select.options).forEach(opt => {
            opt.selected = allowed.includes(opt.value);
        });
    }
}

// Converts "YYYY-MM-DD HH:mm:ss" from DB to "YYYY-MM-DDTHH:mm" for datetime-local input
function dbTimeToLocal(datetimeStr) {
    if (!datetimeStr) return '';
    const [date, time] = datetimeStr.split(' ');
    const hhmm = time.slice(0,5); // get "HH:mm"
    return `${date}T${hhmm}`;
}

function closeScheduleModal() {
    const modal = document.getElementById('schedule-modal');
    modal.classList.add('hidden');
    currentLessonId = null;

    // Clear all modal inputs
    document.getElementById('modal-unlock-time').value = '';
    document.getElementById('modal-lock-time').value = '';
    document.getElementById('modal-time-limit').value = '';
    document.getElementById('retake-option').value = 'all'; // default option
    document.getElementById('specific-students').selectedIndex = -1; // clear selection
    document.getElementById('specific-students-container').classList.add('hidden');
}


document.getElementById('save-schedule-btn').addEventListener('click', () => {
    if (!currentLessonId) return;

    const unlockTime = document.getElementById('modal-unlock-time').value; // RAW string
    const lockTime = document.getElementById('modal-lock-time').value;     // RAW string
    const timeLimit = parseInt(document.getElementById('modal-time-limit').value, 10);

    // Check inputs
    if (!unlockTime || !lockTime) {
        showNotification("Please select both unlock and lock times", "warning");
        return;
    }

    if (isNaN(timeLimit) || timeLimit <= 0) {
        showNotification("Please set a valid time limit in minutes", "warning");
        return;
    }

    // Validate past datetime using string comparison
    const nowStr = new Date().toISOString().slice(0,16); // current local datetime
    if (unlockTime <= nowStr || lockTime <= nowStr) {
        showNotification("Unlock and lock times cannot be in the past", "warning");
        return;
    }

    const retakeOption = document.getElementById('retake-option').value;
    let allowedStudents = [];
    if (retakeOption === 'specific') {
        allowedStudents = Array.from(document.getElementById('specific-students').selectedOptions)
            .map(opt => opt.value);
    }

    // ✅ Send RAW input strings directly to backend
    fetch(`/api/reading-quizzes/${currentLessonId}/schedule`, {
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
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification("Quiz schedule saved!", "success");
            closeScheduleModal();

            const button = document.getElementById(`lock-btn-${currentLessonId}`);
            if (button) {
                button.innerHTML = `<i data-lucide="unlock" class="size-3 mr-1"></i>Unlocked`;
                button.disabled = false;
                button.classList.remove('opacity-50', 'cursor-not-allowed');
                lucide.createIcons({ icons: lucide.icons });
            }

            loadQuizzes();
        } else {
            showNotification("Failed to save schedule: " + data.message, "error");
        }
    })
    .catch(err => {
        console.error(err);
        showNotification("An error occurred while saving schedule.", "error");
    });
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

async function generateAIQuiz() {
  const topicId = document.getElementById('ai-topic').value;
  const difficulty = document.getElementById('ai-difficulty').value;
  const numQuestions = document.getElementById('ai-num-questions').value;
  const additionalContext = document.getElementById('ai-context').value;

  if (!topicId) {
    alert('Please select a topic first.');
    return;
  }

  const btn = document.getElementById('ai-generate-btn');
  btn.disabled = true;
  btn.innerHTML = "⏳ Generating...";

  try {
    const res = await fetch("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_id: topicId,
        difficulty,
        num_questions: numQuestions,
        additional_context: additionalContext
      })
    });

    const data = await res.json();
    console.log("AI Response:", data);

    if (!data.success) throw new Error(data.message || "Generation failed");

    // Show generated section
    document.getElementById("ai-generated-section").classList.remove("hidden");

    // Extract passage by taking everything before the first "Question"
    const passageMatch = data.quiz.match(/^(.*?)(?=Question\s*1[:.])/s);
    const passagePart = passageMatch ? passageMatch[1].trim() : "";
    document.getElementById("ai-generated-passage").value = passagePart;

    // Split questions by "Question X:"
    const questionParts = data.quiz.split(/Question\s*\d+[:.]/).slice(1); // slice(1) removes the passage part

    const container = document.getElementById("ai-questions-container");
    container.innerHTML = "";

    questionParts.forEach((q, i) => {
        // Split the AI response into lines
        const lines = q.trim().split("\n").map(l => l.trim()).filter(l => l);

        // Extract question text
        const questionText = lines[0] || "";

        // Extract choices
        const choices = {};
        lines.forEach(line => {
            const match = line.match(/^([A-D])\)\s*(.*)/);
            if (match) choices[match[1]] = match[2];
        });

        // Extract correct answer
        const correctMatch = lines.find(l => l.toLowerCase().startsWith("correct answer"));
        let correctOption = "";
        if (correctMatch) {
            const match = correctMatch.match(/([A-D])\)/);
            if (match) correctOption = match[1];
        }

        // Build question card
        const div = document.createElement("div");
        div.className = "question-item";
        div.style = "background:#f9f9ff;border:1px solid rgba(147,51,234,0.1);padding:1rem;border-radius:0.5rem;margin-bottom:1rem;";

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:0.75rem;">
                <h4 style="font-weight:600;">Question ${i + 1}</h4>
                <button type="button" onclick="this.closest('.question-item').remove()" 
                    style="color:#4f46e5;font-weight:500;border:1px solid rgba(79,70,229,0.2);
                        background:rgba(79,70,229,0.05);padding:0.4rem 1rem;border-radius:0.4rem;cursor:pointer;">
                    Remove
                </button>
            </div>

            <input type="text" class="form-input" placeholder="Enter question" value="${questionText}" style="margin-bottom:1rem;">

            <div class="space-y-2">
            ${["A","B","C","D"].map(letter => `
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
                    <input type="radio" name="correct-${i}" ${correctOption === letter ? "checked" : ""} style="width:1rem;height:1rem;accent-color:#6366f1;">
                    <input type="text" class="form-input" placeholder="Option ${letter}" value="${choices[letter] || `Option ${letter}`}" style="flex:1;padding:0.5rem;">
                </div>
            `).join("")}
            </div>
        `;

        container.appendChild(div);
    });

    // Enable Save button
    document.getElementById("ai-save-btn").disabled = false;
    document.getElementById("ai-save-btn").style.opacity = 1;

  } catch (err) {
    console.error("Error generating quiz:", err);
    showNotification("Error generating quiz. Please try again.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "✨ Generate Quiz with AI";
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

    const res = await fetch(`/api/lessons-with-topics?class_id=${classId}`);
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


async function loadQuizzes() {
    try {
        const user = getCurrentUser();
        const now = new Date();

        // ✅ Get selected class and subject_id
        const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
        const subjectId = selectedClass?.subject_id;

        if (!subjectId) {
            console.warn("⚠️ No subject_id found in selected class.");
            return;
        }

        // ✅ Fetch quizzes
        const res = await fetch(`/api/reading-quizzes?subject_id=${subjectId}`);
        const quizzes = await res.json();

        // ✅ Fetch student attempts (if not teacher)
        let studentAttempts = [];
        if (user.role !== 'teacher') {
            const attemptsRes = await fetch(`/api/reading-quiz-attempts?student_id=${user.user_id}`);
            studentAttempts = await attemptsRes.json();
        }

        const createdContainer = document.getElementById('lessons-grid');
        const builtInContainer = document.getElementById('created-lessons-grid');
        builtInContainer.innerHTML = '';
        createdContainer.innerHTML = '';

        // ✅ Difficulty containers
        const beginnerContainer = document.createElement('div');
        const intermediateContainer = document.createElement('div');
        const advancedContainer = document.createElement('div');

        beginnerContainer.innerHTML = `<h2 class="card-title text-center px-2 py-1 text-lg rounded-lg bg-secondary/10 text-secondary">Beginner</h2>`;
        intermediateContainer.innerHTML = `<h2 class="card-title text-center px-2 py-1 text-lg rounded-lg bg-secondary/10 text-secondary">Intermediate</h2>`;
        advancedContainer.innerHTML = `<h2 class="card-title text-center px-2 py-1 text-lg rounded-lg bg-secondary/10 text-secondary">Advanced</h2>`;

        // ✅ Counters for numbering per difficulty
        let beginnerCount = 1;
        let intermediateCount = 1;
        let advancedCount = 1;

        quizzes.forEach(quiz => {
            const start = quiz.unlock_time ? new Date(quiz.unlock_time) : null;
            const end = quiz.lock_time ? new Date(quiz.lock_time) : null;

            let isLocked = true;
            if (start && end) {
                isLocked = !(now >= start && now <= end);
            }

            const card = document.createElement('div');
            card.className = 'card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1';

            const difficultyColors = {
                beginner: 'bg-secondary/10 text-secondary',
                intermediate: 'bg-secondary/10 text-secondary',
                advanced: 'bg-secondary/10 text-secondary'
            };

            let actionButtons = '';

            // ✅ Teacher buttons
            if (user.role === 'teacher') {
                actionButtons = `
                <button class="btn btn-outline flex-1" onclick="event.stopPropagation(); openLeaderboardModal(${quiz.quiz_id})">
                    <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>Leaderboard
                </button>
                <button 
                    id="lock-btn-${quiz.quiz_id}"
                    class="btn btn-primary flex-1"
                    onclick="handleLockUnlock(${quiz.quiz_id}, ${isLocked}); event.stopPropagation()"
                >
                    <i data-lucide="${isLocked ? 'unlock' : 'lock'}" class="size-3 mr-1"></i>
                    ${isLocked ? 'Unlocked' : 'Locked'}
                </button>`;
            } 
            // ✅ Student buttons
            else {
                const studentAttempt = studentAttempts.find(a => a.quiz_id === quiz.quiz_id);

                let btnText = "Start Quiz";
                let btnIcon = "play";
                let btnDisabled = isLocked;

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
                    class="btn btn-primary flex-1 ${btnDisabled ? 'opacity-50 cursor-not-allowed' : ''}" 
                    ${btnDisabled ? 'disabled' : ''}
                    onclick="event.stopPropagation(); ${btnDisabled ? '' : `openQuizModal(${quiz.quiz_id})`}">
                    <i data-lucide="${btnIcon}" class="size-3 mr-1"></i>
                    ${btnText}
                </button>
                <button 
                    class="btn btn-outline flex-1"
                    onclick="event.stopPropagation(); openLeaderboardModal(${quiz.quiz_id})">
                    <i data-lucide="bar-chart-3" class="size-3 mr-1"></i>
                    Leaderboard
                </button>`;
            }

            // ✅ Determine the number for this quiz
            let quizNumber;
            if (quiz.difficulty === 'beginner') quizNumber = beginnerCount++;
            else if (quiz.difficulty === 'intermediate') quizNumber = intermediateCount++;
            else if (quiz.difficulty === 'advanced') quizNumber = advancedCount++;

            // ✅ Card HTML with number
            card.innerHTML = `
                <div class="p-4 rounded-lg border border-border cursor-pointer">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="font-semibold text-lg text-primary">
                                ${quizNumber}. ${quiz.title}
                            </h3>
                            <p class="text-sm text-muted-foreground italic">
                                ${quiz.passage ? quiz.passage.substring(0, 100) + '...' : 'No description available.'}
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-1 text-xs rounded ${difficultyColors[quiz.difficulty]} capitalize">
                                ${quiz.difficulty}
                            </span>
                            <i data-lucide="book-open" class="size-5 text-primary"></i>
                        </div>
                    </div>

                    <div class="card-details hidden mt-4 border-t pt-3 quiz-details space-y-3">
                        <div class="flex flex-col text-xs text-muted-foreground gap-1">
                            <span>Start: ${quiz.unlock_time ? formatDateTime(quiz.unlock_time) : 'N/A'}</span>
                            <span>Deadline: ${quiz.lock_time ? formatDateTime(quiz.lock_time) : 'N/A'}</span>
                        </div>
                        <div class="flex gap-2">
                            ${actionButtons}
                        </div>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => toggleQuizCard(card));

            // ✅ Append card to correct container
            if (quiz.difficulty === 'beginner') beginnerContainer.appendChild(card);
            else if (quiz.difficulty === 'intermediate') intermediateContainer.appendChild(card);
            else if (quiz.difficulty === 'advanced') advancedContainer.appendChild(card);
        });

        // ✅ Add containers to page
        builtInContainer.appendChild(beginnerContainer);
        builtInContainer.appendChild(intermediateContainer);
        builtInContainer.appendChild(advancedContainer);

        lucide.createIcons({ icons: lucide.icons });
    } catch (err) {
        console.error('Error loading quizzes:', err);
    }
}

function handleLockUnlock(quizId, isLocked) {
    const button = document.getElementById(`lock-btn-${quizId}`);

    if (isLocked) {
        // 🔓 Unlock → open modal
        openScheduleModal(quizId);
    } else {
        // 🔒 Lock immediately
        fetch(`/api/lock-quiz/${quizId}`, { method: "PUT" })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // ✅ Update button label & icon dynamically
                    button.innerHTML = `<i data-lucide="lock" class="size-3 mr-1"></i>Locked`;
                    button.disabled = false;
                    button.classList.remove('opacity-50', 'cursor-not-allowed');
                    lucide.createIcons({ icons: lucide.icons });
                    showNotification("🔒 Quiz locked successfully!", "success");

                    // Refresh quizzes to ensure state consistency
                    loadQuizzes();
                } else {
                    showNotification("❌ Failed to lock quiz: " + data.message, "error");
                }
            })
            .catch(err => {
                console.error("Failed to lock quiz:", err);
                showNotification("❌ Failed to lock quiz.", "error");
            });
    }
}

function openLeaderboardModal(quizId) {
    document.getElementById("leaderboard-modal").classList.remove("hidden");
    loadLeaderboard(quizId);
}

function closeLeaderboardModal() {
    document.getElementById('leaderboard-modal').classList.add('hidden');
    document.getElementById('quiz-result-modal').classList.add('hidden');
}


function closeLeaderboardModal() {
    document.getElementById('leaderboard-modal').classList.add('hidden');
    document.getElementById('quiz-result-modal').classList.add('hidden');
}

let currentQuizId = null;

async function loadLeaderboard(quizId = null) {
    try {
        if (quizId !== null) currentQuizId = quizId;

        let url = "/api/reading-quiz-leaderboard";
        if (currentQuizId) url += `?quiz_id=${currentQuizId}`;

        const res = await fetch(url);
        const data = await res.json();

        const tbody = document.getElementById("leaderboard-body");
        tbody.innerHTML = "";

        // Set quiz title
        document.getElementById("quiz-title").textContent = 
            (data.leaderboard && data.leaderboard.length > 0)
                ? `✨ ${data.leaderboard[0].quiz_title || "Quiz"}`
                : "✨ Quiz";

        // Podium cards
        const podiums = [
            document.querySelector(".podium-card.first-place"),
            document.querySelector(".podium-card.second-place"),
            document.querySelector(".podium-card.third-place")
        ];
        const gradients = ["#fbbf24,#f59e0b", "#9ca3af,#6b7280", "#fb923c,#ea580c"];

        // Reset podiums first
        podiums.forEach((podium, idx) => {
            if (!podium) return;
            podium.querySelector(".podium-avatar").textContent = "";
            podium.querySelector(".podium-name").textContent = "—";
            podium.querySelector(".podium-score").innerHTML = "-";
            podium.querySelector(".podium-avatar").style.background = `linear-gradient(135deg, ${gradients[idx]})`;
        });

        if (Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
            data.leaderboard.forEach((entry, index) => {
                const initials = entry.student_name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();

                // Populate podium only for top 3 students
                if (index < 3 && podiums[index]) {
                    podiums[index].querySelector(".podium-avatar").textContent = initials;
                    podiums[index].querySelector(".podium-name").textContent = entry.student_name;
                    podiums[index].querySelector(".podium-score").innerHTML = `${entry.score}<span>pts</span>`;
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
            // No students yet
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#999;">No students have taken this quiz yet</td></tr>`;
        }

    } catch (err) {
        console.error("❌ Load leaderboard error:", err);
        document.getElementById("leaderboard-body").innerHTML = `
            <tr><td colspan="5" style="text-align:center; color:red;">Failed to load leaderboard</td></tr>`;
    }
}

function refreshLeaderboard() {
    loadLeaderboard(currentQuizId);
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
}

// Utility functions
function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr.replace(' ', 'T'));
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}