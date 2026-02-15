let state = {
    selectedTopicId: null,
    questionTypes: [],
    questionCount: 0,
    questions: [],
    students: [],
    currentQuestionIndex: 0,
    isSpinning: false,
    spinSpeed: 50,
    currentSlideIndex: 0,
    selectedStudent: null,
    currentAnswer: '',
    intervalId: null
};

// Same pattern as lessons.html AI quiz: types and quantity per type
const RECITATION_QUESTION_TYPES = ['multiple-choice', 'true-false', 'identification'];
const RECITATION_QTY_IDS = {
    'multiple-choice': 'recitation-qty-multiple-choice',
    'true-false': 'recitation-qty-true-false',
    'identification': 'recitation-qty-identification'
};

function getRecitationQuestionCounts() {
    const counts = {};
    RECITATION_QUESTION_TYPES.forEach(type => {
        const el = document.getElementById(RECITATION_QTY_IDS[type]);
        const n = el ? Math.max(0, Math.min(20, parseInt(el.value, 10) || 0)) : 0;
        counts[type] = n;
    });
    return counts;
}

function getSelectedRecitationTypes() {
    const counts = getRecitationQuestionCounts();
    return RECITATION_QUESTION_TYPES.filter(t => counts[t] > 0);
}

function initRecitationTypeQuantities() {
    if (window._recitationTypeQuantitiesInit) return;
    window._recitationTypeQuantitiesInit = true;
    RECITATION_QUESTION_TYPES.forEach(type => {
        const input = document.getElementById(RECITATION_QTY_IDS[type]);
        const cb = document.querySelector('.recitation-type-cb[value="' + type + '"]');
        if (!cb || !input) return;
        cb.addEventListener('change', () => {
            if (cb.checked) input.value = Math.max(1, parseInt(input.value, 10) || 0);
            else input.value = '0';
            updateGenerateButton();
        });
        input.addEventListener('input', () => {
            const n = parseInt(input.value, 10) || 0;
            cb.checked = n > 0;
            updateGenerateButton();
        });
    });
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

    // ✅ Always get latest classId (from URL or storage)
    const selectedClassId = classId || localStorage.getItem("eel_selected_class_id");

    if (selectedClassId) {
        loadClassStudents(selectedClassId);
        loadRecitationTopics();
    } else {
        console.warn("No class ID found in URL or localStorage.");
    }
});

async function loadRecitationTopics() {
    try {
        const classId = localStorage.getItem("eel_selected_class_id") || (() => {
            const c = JSON.parse(localStorage.getItem("eel_selected_class") || "{}");
            return c && c.class_id ? c.class_id : "";
        })();
        const topicSelect = document.getElementById("recitation-topic");
        if (!topicSelect) return;
        if (!classId) {
            topicSelect.innerHTML = "<option value=''>Select a class first</option>";
            return;
        }
        topicSelect.innerHTML = "<option value=''>Loading...</option>";
        const res = await fetch(`http://localhost:3000/api/lessons-with-topics?class_id=${classId}`);
        const data = await res.json();
        if (!Array.isArray(data)) {
            topicSelect.innerHTML = "<option value=''>Error loading topics</option>";
            return;
        }
        if (data.length === 0) {
            topicSelect.innerHTML = "<option value=''>No topics found</option>";
            return;
        }
        topicSelect.innerHTML = "<option value=''>Select a topic</option>";
        data.forEach(function (lesson) {
            const optgroup = document.createElement("optgroup");
            optgroup.label = lesson.lesson_title;
            (lesson.topics || []).forEach(function (topic) {
                const option = document.createElement("option");
                option.value = topic.topic_id;
                option.textContent = topic.topic_title;
                optgroup.appendChild(option);
            });
            topicSelect.appendChild(optgroup);
        });
    } catch (err) {
        console.error("loadRecitationTopics:", err);
        const topicSelect = document.getElementById("recitation-topic");
        if (topicSelect) topicSelect.innerHTML = "<option value=''>Error loading topics</option>";
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    // Back to Classes
    const backBtn = document.getElementById('back-class-btn');
    if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'classes.html');
});

async function loadClassStudents(classId) {
    try {
        console.log("Loading students for class:", classId);
        const res = await fetch(`http://localhost:3000/api/recitation/class/${classId}/students`);
        const data = await res.json();

        // data itself is an array already ✅ (API may send { id, name, answered } or { student_id, student_fname, student_lname })
        if (Array.isArray(data) && data.length > 0) {
            state.students = data.map(s => {
                const name = (s.name != null && String(s.name).trim() !== '')
                    ? String(s.name).trim()
                    : `${s.student_fname || ''} ${s.student_lname || ''}`.trim();
                return {
                    id: s.id != null ? s.id : s.student_id,
                    name: name || 'Student',
                    answered: s.answered === true
                };
            });

            console.log("Loaded students:", state.students);

            state.currentQuestionIndex = 0;
            renderStudentSlider();
            updateQuestionProgress();
        } else {
            state.students = [];
            renderStudentSlider();
            updateQuestionProgress();
            console.warn('No students found for this class.');
        }
    } catch (err) {
        console.error('Error loading students:', err);
    }
}

function setupEventListeners() {
    const topicSelect = document.getElementById('recitation-topic');
    if (topicSelect) {
        topicSelect.addEventListener('change', function () {
            const val = (topicSelect.value || '').trim();
            state.selectedTopicId = val || null;
            updateGenerateButton();
        });
    }

    initRecitationTypeQuantities();

    const generateBtn = document.getElementById('generate-questions');
    if (generateBtn) generateBtn.addEventListener('click', generateQuestions);
}

function updateGenerateButton() {
    const btn = document.getElementById('generate-questions');
    if (!btn) return;
    const topicId = state.selectedTopicId;
    const counts = getRecitationQuestionCounts();
    const total = RECITATION_QUESTION_TYPES.reduce((sum, t) => sum + (counts[t] || 0), 0);
    btn.disabled = !topicId || total < 1;
}

function updateStartButton() {
    const btn = document.getElementById('start-session');
    if (btn) btn.disabled = state.questions.length === 0;
}

async function generateQuestions() {
    const btn = document.getElementById('generate-questions');
    if (!btn) return;

    const topicId = state.selectedTopicId;
    const questionCounts = getRecitationQuestionCounts();
    const questionTypes = getSelectedRecitationTypes();
    const totalQuestions = RECITATION_QUESTION_TYPES.reduce((sum, t) => sum + (questionCounts[t] || 0), 0);

    if (!topicId) {
        showNotification('Please select a topic first.', 'error');
        return;
    }
    if (questionTypes.length === 0 || totalQuestions < 1) {
        showNotification('Set at least one question type with quantity greater than 0.', 'warning');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="brain" class="size-4 spinner"></i> Generating...';
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();

    try {
        const res = await fetch('http://localhost:3000/api/generate-recitation-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic_id: topicId,
                question_types: questionTypes,
                question_count: totalQuestions
            })
        });
        const text = await res.text();
        if (!res.ok && (text.startsWith('<!') || text.startsWith('<'))) {
            throw new Error('Recitation API not found (404). Start the backend from js-back-end: npm start');
        }
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (_) {
            throw new Error(res.ok ? 'Invalid response from server' : 'Recitation API not found. Start the backend from js-back-end: npm start');
        }

        if (!res.ok || !data.success || !Array.isArray(data.questions)) {
            throw new Error(data.message || data.error || 'Failed to generate questions');
        }

        state.questions = data.questions;

        const questionsGenerated = document.getElementById('questions-generated');
        if (questionsGenerated) questionsGenerated.classList.remove('hidden');

        const questionCountText = document.getElementById('question-count-text');
        if (questionCountText) questionCountText.textContent = state.questions.length;

        showNotification('Questions successfully generated!', 'success');
    } catch (err) {
        console.error('generateQuestions:', err);
        showNotification(err.message || 'Could not generate questions. Check server and GROQ API key.', 'error');
    } finally {
        btn.innerHTML = '<i data-lucide="brain" class="size-4"></i> Generate questions';
        btn.disabled = false;
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
        updateStartButton();
    }
}

function startSession() {
    const setup = document.getElementById('session-setup');
    const picker = document.getElementById('student-picker');

    if (setup && picker) {
        setup.classList.remove('active');
        setup.classList.add('hidden');
        picker.classList.remove('hidden');
    }

    state.currentQuestionIndex = 0;
    state.students.forEach(s => s.answered = false);

    // Clear any previously selected student
    clearSelectedStudents();

    updateQuestionProgress();
    renderStudentSlider();
    // Position slider after modal is visible and laid out
    setTimeout(updateSliderPosition, 80);
}


function backToSetup() {
    const setup = document.getElementById('session-setup');
    const picker = document.getElementById('student-picker');

    if (setup && picker) {
        picker.classList.add('hidden');
        setup.classList.remove('hidden');
        setup.classList.add('active');
        const questionsGenerated = document.getElementById('questions-generated');
        if (questionsGenerated) questionsGenerated.classList.add('hidden');
    }
}


function updateQuestionProgress() {
    document.getElementById('current-question-num').textContent = state.currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = state.questions.length;
    
    const availableStudents = state.students.filter(s => !s.answered);
    document.getElementById('students-remaining').textContent = availableStudents.length;
}

function escapeHtmlRecitation(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getInitials(name) {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return '?';
}

function renderStudentSlider() {
    const slider = document.getElementById('student-slider');
    const availableStudents = state.students.filter(s => !s.answered);
    if (!slider) return;

    slider.innerHTML = '';
    
    // Triple the students for continuous sliding effect
    const studentsToRender = [...availableStudents, ...availableStudents, ...availableStudents];
    
    studentsToRender.forEach((student) => {
        const box = document.createElement('div');
        box.className = 'student-box';
        const initials = getInitials(student.name);
        const avatarHtml = student.avatarUrl
            ? `<img class="recitation-student-avatar-img" src="${escapeHtmlRecitation(student.avatarUrl)}" alt="">`
            : `<span class="recitation-student-avatar-initials" aria-hidden="true">${escapeHtmlRecitation(initials)}</span>`;
        box.innerHTML = `
            <div class="recitation-student-avatar">${avatarHtml}</div>
            <span class="student-name">${escapeHtmlRecitation(student.name)}</span>
        `;
        slider.appendChild(box);
    });

    // Set initial position after layout (no animation). Animation runs when user clicks Play.
    requestAnimationFrame(() => {
        updateSliderPosition({ animate: false });
        setTimeout(() => updateSliderPosition({ animate: false }), 60);
    });
}

function startSpinning() {
    const availableStudents = state.students.filter(s => !s.answered);
    if (availableStudents.length === 0) return;

    // Ensure previous interval cleared
    clearInterval(state.intervalId);

    state.intervalId = setInterval(() => {
        // advance index safely using availableStudents length
        state.currentSlideIndex = (state.currentSlideIndex + 1) % availableStudents.length;
        updateSliderPosition();
    }, state.spinSpeed);
}

function toggleSpin(autoPick = false) {
    const btn = document.getElementById('play-button');
    const btnText = document.getElementById('play-btn-text');
    const icon = btn ? btn.querySelector('i') : null;

    const availableStudents = state.students.filter(s => !s.answered);
    if (availableStudents.length === 0) return;

    if (!state.isSpinning) {
        // Reset previous selection
        clearSelectedStudents();

        state.isSpinning = true;
        state.spinSpeed = 50;

        if (icon) icon.setAttribute('data-lucide', 'pause');
        if (btnText) btnText.textContent = 'Stop';
        lucide.createIcons({ icons: lucide.icons });

        startSpinning();

        // 🕒 AUTO PICK TRIGGER — stops automatically after 3 seconds
        if (autoPick) {
            // store timeout id so we could cancel if user manually stops
            state.autoPickTimeout = setTimeout(() => {
                if (state.isSpinning) speedUpAndStop(availableStudents);
            }, 3000);
        }

    } else {
        // If user manually stops while an autoPick timeout exists, clear it
        if (state.autoPickTimeout) {
            clearTimeout(state.autoPickTimeout);
            state.autoPickTimeout = null;
        }
        speedUpAndStop(availableStudents);
    }
}

function speedUpAndStop(availableStudents) {
    const btn = document.getElementById('play-button');
    const btnText = document.getElementById('play-btn-text');
    const icon = btn ? btn.querySelector('i') : null;

    if (!btn || !btnText) return;

    // ensure any existing interval removed
    clearInterval(state.intervalId);

    const spinSteps = [
        { speed: 20, delay: 500 },
        { speed: 100, delay: 500 },
        { speed: 200, delay: 500 },
    ];

    let stepIndex = 0;

    function nextStep() {
        if (stepIndex >= spinSteps.length) {
            clearInterval(state.intervalId);
            state.isSpinning = false;

            // ensure index is within bounds (in case availableStudents changed)
            const idx = state.currentSlideIndex % availableStudents.length;
            state.selectedStudent = availableStudents[idx];
            highlightSelectedStudent();
            setTimeout(showQuestionModal, 500);

            if (icon) icon.setAttribute('data-lucide', 'play');
            btnText.textContent = 'Play';
            lucide.createIcons({ icons: lucide.icons });
            return;
        }

        const step = spinSteps[stepIndex];
        state.spinSpeed = step.speed;

        // restart interval with new speed
        startSpinning();

        setTimeout(() => {
            clearInterval(state.intervalId);
            stepIndex++;
            nextStep();
        }, step.delay);
    }

    nextStep();
}

// wrapper called by button; reads checkbox then calls toggleSpin(autoPick)
function onPlayButtonClick() {
    const autoPick = document.getElementById('auto-pick-toggle')?.checked === true;
    toggleSpin(autoPick);
}


function getSliderGapPx(slider) {
    const gap = slider && window.getComputedStyle(slider).gap;
    if (!gap) return 10;
    const num = parseFloat(gap);
    if (gap.includes('rem')) return num * 16;
    if (gap.includes('px')) return num;
    return num || 10;
}

function parsePaddingPx(el, side) {
    if (!el) return 0;
    const val = window.getComputedStyle(el)['padding' + (side === 'left' ? 'Left' : 'Right')];
    if (!val) return 0;
    const num = parseFloat(val);
    if (val.includes('rem')) return num * 16;
    return num;
}

function updateSliderPosition(opts) {
    opts = opts || {};
    const slider = document.getElementById('student-slider');
    const boxes = document.querySelectorAll('.student-box');
    const container = slider ? slider.closest('.recitation-slider-wrap') || slider.closest('.recitation-slider-container') || slider.closest('.slider-container') : null;

    if (!slider || boxes.length === 0 || !container) return;

    const availableStudents = state.students.filter(s => !s.answered);
    const totalStudents = availableStudents.length;

    if (totalStudents === 0) return;

    const gapPx = getSliderGapPx(slider);
    const boxWidth = boxes[0].offsetWidth + gapPx;
    const containerWidth = container.offsetWidth;

    // If container not yet laid out (e.g. modal just opened), retry shortly
    if (containerWidth <= 0 && !opts.retried) {
        setTimeout(() => updateSliderPosition({ retried: true }), 80);
        return;
    }

    const paddingLeft = parsePaddingPx(slider, 'left');

    // Center the middle copy's current student in the viewport
    const middleIndex = state.currentSlideIndex + totalStudents;
    const boxCenter = paddingLeft + middleIndex * boxWidth - boxWidth / 2;
    const offset = Math.round(boxCenter - containerWidth / 2);

    const useTransition = opts.animate !== false && state.isSpinning;
    const duration = useTransition ? 220 : 0;
    slider.style.transition = `transform ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
    slider.style.transform = `translate3d(-${offset}px, 0, 0)`;
}


function highlightSelectedStudent() {
    const boxes = document.querySelectorAll('.student-box');
    const availableStudents = state.students.filter(s => !s.answered);
    
    boxes.forEach((box, idx) => {
        if (idx % availableStudents.length === state.currentSlideIndex) {
            box.classList.add('selected');
        } else {
            box.classList.remove('selected');
        }
    });
}

function showQuestionModal() {
    const modal = document.getElementById('question-modal');
    const currentQuestion = state.questions[state.currentQuestionIndex];
    const timerEl = document.getElementById('question-timer');

    if (!modal || !state.selectedStudent || !currentQuestion) return;

    // --- reset modal-answer state to avoid race conditions ---
    state.modalAnswered = false;
    if (state.autoContinueTimeout) { clearTimeout(state.autoContinueTimeout); state.autoContinueTimeout = null; }
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }

    const studentNameEl = document.getElementById('modal-student-name');
    const questionTypeEl = document.getElementById('modal-question-type');
    const questionTextEl = document.getElementById('modal-question-text');
    const answerSection = document.getElementById('answer-section');
    const resultSection = document.getElementById('result-section');
    const modalActions = document.getElementById('modal-actions');
    const continueBtn = document.getElementById('continue-button');

    // Timer configuration
    let timeLeft = 20; // seconds to answer

    // Fill in modal content
    if (studentNameEl) studentNameEl.textContent = state.selectedStudent.name;
    if (questionTypeEl) {
        const typeName = currentQuestion.type
            .split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        questionTypeEl.textContent = typeName;
    }
    if (questionTextEl) questionTextEl.textContent = currentQuestion.question;
    const qNumEl = document.getElementById('modal-question-num');
    const qTotalEl = document.getElementById('modal-total-questions');
    if (qNumEl) qNumEl.textContent = String(state.currentQuestionIndex + 1);
    if (qTotalEl) qTotalEl.textContent = String(state.questions.length);

    // render inputs fresh
    renderAnswerInput(currentQuestion);

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('active');

    // Reset sections
    if (answerSection) answerSection.style.display = 'block';
    if (resultSection) resultSection.style.display = 'none';
    if (modalActions) modalActions.style.display = 'flex';
    if (continueBtn) continueBtn.style.display = 'none';

    // Timer lives in content area (below header); ensure it's in the right place
    const contentArea = modal.querySelector('.recitation-question-content');
    const timerDisplay = document.getElementById('question-timer');
    if (timerDisplay && contentArea && !contentArea.contains(timerDisplay)) {
        contentArea.insertBefore(timerDisplay, contentArea.firstChild);
    }

    // Start countdown
    timerDisplay.textContent = `⏰ ${timeLeft}s left`;
    timerDisplay.style.color = '#ef4444';
    timerDisplay.style.background = '#fff1f2';
    timerDisplay.style.transform = 'scale(1)';

    // Clear any previous interval then start a new one
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
    state.timerInterval = setInterval(() => {
        timeLeft--;
        // if already answered, stop timer immediately
        if (state.modalAnswered) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
            return;
        }

        timerDisplay.textContent = `⏰ ${timeLeft}s left`;

        if (timeLeft <= 5) {
            timerDisplay.style.color = '#dc2626';
            timerDisplay.style.background = '#fee2e2';
            timerDisplay.style.transform = 'scale(1.05)';
        }

        if (timeLeft <= 0) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;

            // final visual
            timerDisplay.textContent = '⏳ Time’s Up!';
            timerDisplay.style.color = '#b91c1c';
            timerDisplay.style.background = '#fecaca';

            // Disable answer inputs immediately
            const inputs = answerSection.querySelectorAll('input, button, textarea, select');
            inputs.forEach(el => el.disabled = true);

            // If not already answered, show time-up result — use correctAnswer field
            if (!state.modalAnswered) {
                state.modalAnswered = true; // prevent duplicate handling
                const correct = (currentQuestion.correctAnswer || '').toString();
                // showResult(false, 'No answer', correct, false)  -> false autoContinue here
                showResult(false, 'No answer', correct, false);

                // reveal continue button (teacher can continue)
                if (continueBtn) continueBtn.style.display = 'block';
            }
        }
    }, 1000);

    lucide.createIcons({ icons: lucide.icons });
}

function escapeForAttr(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderAnswerInput(question) {
    const container = document.getElementById('answer-input-container');
    if (!container) return;
    container.innerHTML = '';

    if (question.options && question.options.length > 0) {
        const radioGroup = document.createElement('div');
        radioGroup.className = 'radio-group';
        radioGroup.style.display = 'flex';
        radioGroup.style.flexDirection = 'column';
        radioGroup.style.gap = '0.75rem';
        radioGroup.style.marginTop = '0.5rem';

        const optionsList = question.options.map(opt => {
            if (opt == null) return '';
            if (typeof opt === 'string') return opt.trim();
            if (typeof opt === 'object' && (opt.text != null || opt.value != null || opt.label != null)) return String(opt.text ?? opt.value ?? opt.label ?? '').trim();
            return String(opt).trim();
        }).filter(Boolean);

        optionsList.forEach(function (optionText, idx) {
            const label = document.createElement('label');
            label.className = 'radio-label';
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.padding = '0.5rem 0.75rem';
            label.style.border = '1px solid var(--border)';
            label.style.borderRadius = '0.5rem';
            label.style.cursor = 'pointer';
            label.style.transition = 'all 0.2s ease';
            var optVal = escapeForAttr(optionText);
            label.innerHTML = '<input type="radio" name="answer" value="' + optVal + '" id="option-' + idx + '" style="margin-right: 0.5rem;"><span>' + escapeForAttr(optionText) + '</span>';
            radioGroup.appendChild(label);
        });

        container.appendChild(radioGroup);
    } else {
        // Text input
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.placeholder = 'Type your answer here...';
        input.id = 'text-answer';
        container.appendChild(input);
    }
}


function closeQuestionModal() {
    const modal = document.getElementById('question-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.classList.add('hidden');  // hide it completely
}


function submitAnswer() {
    // protect against double submit or already-answered (timer may be near zero)
    if (state.modalAnswered) return;

    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) return;

    let userAnswer = '';

    if (currentQuestion.options && currentQuestion.options.length) {
        const selected = document.querySelector('input[name="answer"]:checked');
        if (!selected) return; // no selection
        userAnswer = selected.value;
    } else {
        const input = document.getElementById('text-answer');
        if (!input || !input.value.trim()) return;
        userAnswer = input.value.trim();
    }

    // mark answered and clear timer to avoid race
    state.modalAnswered = true;
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    if (state.autoContinueTimeout) {
        clearTimeout(state.autoContinueTimeout);
        state.autoContinueTimeout = null;
    }

    // compare with correctAnswer (normalize: trim and case-insensitive)
    const correct = (currentQuestion.correctAnswer || '').toString().trim();
    const normalizedUser = userAnswer.trim();
    const isCorrect = normalizedUser.toLowerCase() === correct.toLowerCase();

    // show result and allow auto-continue if desired
    showResult(isCorrect, userAnswer, correct);
}


function showResult(isCorrect, userAnswer, correctAnswer, autoContinue = true) {
    // prevent duplicate calls
    if (state.modalAnswered === false) {
        state.modalAnswered = true;
    }
    // clear any timers
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
    if (state.autoContinueTimeout) { clearTimeout(state.autoContinueTimeout); state.autoContinueTimeout = null; }

    const answerSection = document.getElementById('answer-section');
    const resultSection = document.getElementById('result-section');
    const resultContent = document.getElementById('result-content');
    const modalActions = document.getElementById('modal-actions');
    const continueBtn = document.getElementById('continue-button');

    if (answerSection) answerSection.style.display = 'none';
    if (modalActions) modalActions.style.display = 'none';
    if (!resultSection || !resultContent) return;

    resultSection.style.display = 'block';
    resultSection.className = 'result-section recitation-result-section ' + (isCorrect ? 'result-correct' : 'result-incorrect');

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const safeUser = escapeHtml(userAnswer);
    const safeCorrect = escapeHtml(correctAnswer);

    if (isCorrect) {
        resultContent.innerHTML = `
            <span class="result-icon" aria-hidden="true">✅</span>
            <div class="result-body">
                <h4>Correct!</h4>
                <p>Great job! 🎉</p>
            </div>
        `;
    } else {
        resultContent.innerHTML = `
            <span class="result-icon" aria-hidden="true">❌</span>
            <div class="result-body">
                <h4>Incorrect</h4>
                <p>💡 <strong>Correct answer:</strong> <span class="correct-answer">${safeCorrect}</span></p>
                <p>📝 <strong>Your answer:</strong> <span class="your-answer">${safeUser}</span></p>
            </div>
        `;
    }

    if (continueBtn) continueBtn.style.display = 'block';
    lucide.createIcons({ icons: lucide.icons });
    // Auto-continue after 5s if requested
    if (autoContinue) {
        state.autoContinueTimeout = setTimeout(() => {
            state.autoContinueTimeout = null;
            continueToNext();
        }, 5000);
    }
}


function continueToNext() {
    if (!state.selectedStudent) return;

    // Mark current student as answered
    state.selectedStudent.answered = true;

    // Close the question modal
    closeQuestionModal();

    // Check if there are still questions remaining
    if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex++;
        updateQuestionProgress();
        renderStudentSlider();

        // Reopen student picker for next student
        const picker = document.getElementById('student-picker');
        if (picker) picker.classList.remove('hidden');
    } else {
        // All questions completed
        alert('All questions completed!');
        backToSetup();
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        alert('Logging out...');
        // Add logout logic here
    }
}

function clearSelectedStudents() {
    const boxes = document.querySelectorAll('.student-box');
    boxes.forEach(box => box.classList.remove('selected'));
    state.selectedStudent = null;
}
