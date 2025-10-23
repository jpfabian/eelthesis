let state = {
    uploadedFile: null,
    questionTypes: ['multiple-choice'],
    questionCount: 10,
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

// Question Templates
const questionTemplates = {
    'multiple-choice': [
        { question: 'Which sentence is grammatically correct?', options: ['Each of the students have a book.', 'Each of the students has a book.', 'Each of the student have a book.', 'Each of the student has a book.'], answer: 'Each of the students has a book.' },
        { question: 'Which of the following sentences uses the correct verb form?', options: ['She don’t like reading novels.', 'She doesn’t likes reading novels.', 'She doesn’t like reading novels.', 'She not like reading novels.'], answer: 'She doesn’t like reading novels.' },
        { question: 'Which sentence is written in active voice?', options: ['The cake was baked by Maria.', 'Maria baked the cake.', 'The cake is being baked by Maria.', 'The cake will be baked by Maria.'], answer: 'Maria baked the cake.' },
        { question: 'Which of the following is a complex sentence?', options: ['She opened the door and greeted her friend.', 'While I was studying, my phone rang.', 'The teacher gave homework.', 'I like apples and oranges.'], answer: 'While I was studying, my phone rang.' },
        { question: 'Which sentence contains an error in subject-verb agreement?', options: ['Neither of the boys is absent.', 'The team are playing well.', 'Everyone loves ice cream.', 'Each student has a notebook.'], answer: 'The team are playing well.' },
    ],

    'noun': [
        { question: 'Identify the collective noun: "The committee decided to postpone the meeting."', answer: 'committee' },
        { question: 'Which of the following is a proper noun?', options: ['river', 'teacher', 'Mount Fuji', 'country'], answer: 'Mount Fuji' },
        { question: 'Find the abstract noun: "Her kindness touched everyone."', answer: 'kindness' },
        { question: 'Identify the common noun in: "The artist painted a beautiful picture."', answer: 'artist, picture' },
        { question: 'Which sentence contains a compound noun?', options: ['She enjoys swimming.', 'I bought a toothpaste.', 'The teacher smiled.', 'They play soccer.'], answer: 'I bought a toothpaste.' },
    ],

    'pronoun': [
        { question: 'Choose the correct pronoun: "Each of the students must submit ___ own project."', answer: 'his or her' },
        { question: 'Identify the correct pronoun use: "It was ___ who called last night."', options: ['me', 'I', 'mine', 'myself'], answer: 'I' },
        { question: 'Select the reflexive pronoun: "He blamed ___ for the mistake."', answer: 'himself' },
        { question: 'Which sentence uses a demonstrative pronoun?', options: ['She herself fixed the computer.', 'This is the best day ever!', 'Who is calling?', 'The teacher gave us homework.'], answer: 'This is the best day ever!' },
        { question: 'Replace the noun with the correct pronoun: "The students said the students would help."', answer: 'They said they would help.' },
    ],

    'past-tense': [
        { question: 'Change to past tense: "She writes a letter every week."', answer: 'She wrote a letter every week.' },
        { question: 'Choose the sentence in past perfect tense.', options: ['She had finished her work before the bell rang.', 'She finished her work before the bell rang.', 'She finishes her work before the bell rang.', 'She is finishing her work before the bell rang.'], answer: 'She had finished her work before the bell rang.' },
        { question: 'Convert to past tense: "They are playing basketball."', answer: 'They were playing basketball.' },
        { question: 'Which sentence is written in the correct past tense form?', options: ['He run to the store.', 'He ran to the store.', 'He running to the store.', 'He runs to the store.'], answer: 'He ran to the store.' },
        { question: 'What is the past tense of "teach"?', answer: 'taught' },
    ],

    'comprehension': [
        { question: 'Liam studied late to pass the exam. Who studied late?', answer: 'Liam' },
        { question: 'The storm destroyed several houses in the town. What destroyed the houses?', answer: 'storm' },
        { question: 'Ella read a novel during her vacation. What did she read?', answer: 'novel' },
        { question: 'The farmer planted rice in the field. What did the farmer plant?', answer: 'rice' },
        { question: 'The students cleaned the classroom after class. What did they clean?', answer: 'classroom' },
    ],

    'vocabulary': [
        { question: 'What is the synonym of "significant"?', options: ['Unimportant', 'Meaningful', 'Minor', 'Ordinary'], answer: 'Meaningful' },
        { question: 'Choose the antonym of "abundant".', options: ['Plentiful', 'Scarce', 'Many', 'Sufficient'], answer: 'Scarce' },
        { question: 'What does "articulate" mean?', options: ['To speak clearly', 'To draw', 'To write fast', 'To argue'], answer: 'To speak clearly' },
        { question: 'Define "benevolent".', answer: 'Kind and generous' },
        { question: 'What is the meaning of "vital"?', answer: 'Essential' },
    ],

    'spelling': [
        { question: 'Correct the spelling: "recieve"', answer: 'receive' },
        { question: 'Spell the word meaning "necessary or very important".', answer: 'essential' },
        { question: 'Correct the spelling: "occurence"', answer: 'occurrence' },
        { question: 'Spell the word for "something you achieve after effort".', answer: 'achievement' },
        { question: 'Correct the spelling: "seperate"', answer: 'separate' },
    ],
};

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
    } else {
        console.warn("No class ID found in URL or localStorage.");
    }
});

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
        const res = await fetch(`http://localhost:3000/api/class/${classId}/students`);
        const data = await res.json();

        // data itself is an array already ✅
        if (Array.isArray(data) && data.length > 0) {
            state.students = data.map(s => ({
                id: s.student_id,
                name: `${s.student_fname} ${s.student_lname}`,
                answered: false
            }));

            console.log("Loaded students:", state.students);

            state.currentQuestionIndex = 0;
            renderStudentSlider();
            updateQuestionProgress();
        } else {
            console.warn('No students found for this class.');
        }
    } catch (err) {
        console.error('Error loading students:', err);
    }
}

function setupEventListeners() {
    // File upload
    const fileInput = document.getElementById('file-upload');
    const uploadArea = document.getElementById('upload-area');
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Question types
    const questionTypeCheckboxes = document.querySelectorAll('.question-type');
    questionTypeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleQuestionTypeChange);
    });
    
    // Question count
    const questionCountSelect = document.getElementById('question-count');
    questionCountSelect.addEventListener('change', (e) => {
        state.questionCount = parseInt(e.target.value);
    });

    // Generate Questions button
    const generateBtn = document.getElementById('generate-questions');
    generateBtn.addEventListener('click', generateQuestions);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        state.uploadedFile = file;
        showFilePreview(file);
        updateGenerateButton();
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'var(--violet-600)';
    e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.05)';
}

function handleDragLeave(e) {
    e.currentTarget.style.borderColor = '';
    e.currentTarget.style.backgroundColor = '';
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '';
    e.currentTarget.style.backgroundColor = '';
    
    const file = e.dataTransfer.files[0];
    if (file) {
        state.uploadedFile = file;
        showFilePreview(file);
        updateGenerateButton();
    }
}

function showFilePreview(file) {
    const uploadArea = document.getElementById('upload-area');
    const filePreview = document.getElementById('file-preview');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');

    uploadArea.classList.add('hidden');       // hide upload area
    filePreview.classList.remove('hidden');   // show preview
    fileName.textContent = file.name;
    if(fileSize) fileSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';

    lucide.createIcons();
}

function removeFile() {
    const uploadArea = document.getElementById('upload-area');
    const filePreview = document.getElementById('file-preview');
    const fileInput = document.getElementById('file-upload'); // <--- add this

    state.uploadedFile = null;
    state.questions = [];

    // Reset file input
    fileInput.value = '';  // <-- important!

    uploadArea.classList.remove('hidden');   // show upload area
    filePreview.classList.add('hidden');     // hide preview

    updateGenerateButton();
    updateStartButton();
}

function handleQuestionTypeChange(e) {
    const type = e.target.dataset.type;
    if (e.target.checked) {
        if (!state.questionTypes.includes(type)) {
            state.questionTypes.push(type);
        }
    } else {
        state.questionTypes = state.questionTypes.filter(t => t !== type);
    }
    updateGenerateButton();
}

function updateGenerateButton() {
    const btn = document.getElementById('generate-questions');
    btn.disabled = !state.uploadedFile || state.questionTypes.length === 0;
}

function updateStartButton() {
    const btn = document.getElementById('start-session');
    if (btn) btn.disabled = state.questions.length === 0;
}

async function generateQuestions() {
    const btn = document.getElementById('generate-questions');
    if (!btn) return;

    const icon = btn.querySelector('i');
    
    btn.disabled = true;
    if (icon) icon.classList.add('spinner');
    
    // Optional: safely set text
    btn.textContent = 'Generating...';

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate questions
    state.questions = mockGenerateQuestions(state.questionTypes, state.questionCount);
    
    // Update UI
    if (icon) icon.classList.remove('spinner');
    btn.textContent = 'Generate Questions';
    btn.disabled = false;
    
    const questionsGenerated = document.getElementById('questions-generated');
    if (questionsGenerated) questionsGenerated.style.display = 'block';
    
    const questionCountText = document.getElementById('question-count-text');
    if (questionCountText) questionCountText.textContent = state.questions.length;

    showNotification('✅ Questions successfully generated!', 'success');
    updateStartButton();
}

function mockGenerateQuestions(types, count) {
    const questions = [];
    let questionId = 1;
    
    while (questions.length < count) {
        for (const type of types) {
            if (questions.length >= count) break;
            
            const templates = questionTemplates[type];
            const template = templates[Math.floor(Math.random() * templates.length)];
            
            questions.push({
            id: `q${questionId++}`,
            type,
            question: template.question,
            options: template.options || null,
            correctAnswer: template.answer || template.correctAnswer || ''
            });
        }
    }
    
    return questions.slice(0, count);
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
}


function backToSetup() {
    const setup = document.getElementById('session-setup');
    const picker = document.getElementById('student-picker');

    if (setup && picker) {
        picker.classList.add('hidden');       // hide modal
        setup.classList.remove('hidden');     // show setup section
    }
}


function updateQuestionProgress() {
    document.getElementById('current-question-num').textContent = state.currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = state.questions.length;
    
    const availableStudents = state.students.filter(s => !s.answered);
    document.getElementById('students-remaining').textContent = availableStudents.length;
}

function renderStudentSlider() {
    const slider = document.getElementById('student-slider');
    const availableStudents = state.students.filter(s => !s.answered);
    
    slider.innerHTML = '';
    
    // Triple the students for continuous sliding effect
    const studentsToRender = [...availableStudents, ...availableStudents, ...availableStudents];
    
    studentsToRender.forEach((student, idx) => {
    const box = document.createElement('div');
    box.className = 'student-box';
        box.innerHTML = `
            <i data-lucide="user" class="student-icon"></i>
            <span class="student-name">${student.name}</span>
        `;
        slider.appendChild(box);
    });
    
    lucide.createIcons();
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
        lucide.createIcons();

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
            lucide.createIcons();
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


const slider = document.getElementById('student-slider');
slider.style.transition = 'transform 0.3s ease-out'; // smooth transition

function updateSliderPosition() {
    const slider = document.getElementById('student-slider');
    const boxes = document.querySelectorAll('.student-box');
    const container = document.querySelector('.slider-container');

    if (!slider || boxes.length === 0 || !container) return;

    const availableStudents = state.students.filter(s => !s.answered);
    const totalStudents = availableStudents.length;

    if (totalStudents === 0) return;

    const boxWidth = boxes[0].offsetWidth + 16; // box width + gap
    const containerWidth = container.offsetWidth;

    // Center on the middle copy of triple-rendered students
    const middleIndex = state.currentSlideIndex + totalStudents;

    const offset = middleIndex * boxWidth - (containerWidth / 2 - boxWidth / 2);

    slider.style.transform = `translateX(-${offset}px)`;
    slider.style.transitionDuration = `${state.spinSpeed}ms`;
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

    // Add timer display if needed
    if (!timerEl) {
        const timerDisplay = document.createElement('div');
        timerDisplay.id = 'question-timer';
        timerDisplay.style.cssText = `
            font-size: 1.1rem;
            font-weight: 600;
            color: #ef4444;
            background: #fff1f2;
            border: 2px solid #fecaca;
            border-radius: 8px;
            padding: 0.3rem 0.8rem;
            display: inline-block;
            margin-left: 1rem;
            transition: all 0.15s ease;
        `;
        // append to header (safe guard)
        const header = modal.querySelector('.modal-header');
        if (header) header.appendChild(timerDisplay);
    }

    // Start countdown
    const timerDisplay = document.getElementById('question-timer');
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

    lucide.createIcons();
}

function renderAnswerInput(question) {
    const container = document.getElementById('answer-input-container');
    container.innerHTML = '';

    if (question.options) {
        // Multiple choice
        const radioGroup = document.createElement('div');
        radioGroup.className = 'radio-group';
        radioGroup.style.display = 'flex';
        radioGroup.style.flexDirection = 'column'; // vertical
        radioGroup.style.gap = '0.75rem';          // spacing between options
        radioGroup.style.marginTop = '0.5rem';

        question.options.forEach((option, idx) => {
            const label = document.createElement('label');
            label.className = 'radio-label';
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.padding = '0.5rem 0.75rem';
            label.style.border = '1px solid #ddd';
            label.style.borderRadius = '0.5rem';
            label.style.cursor = 'pointer';
            label.style.transition = 'all 0.2s ease';
            label.onmouseover = () => label.style.backgroundColor = 'rgba(236, 72, 153, 0.05)';
            label.onmouseleave = () => label.style.backgroundColor = 'transparent';

            label.innerHTML = `
                <input type="radio" name="answer" value="${option}" id="option-${idx}" style="margin-right: 0.5rem;">
                <span>${option}</span>
            `;

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

    // compare with correctAnswer (normalize)
    const correct = (currentQuestion.correctAnswer || '').toString();
    const isCorrect = userAnswer.toLowerCase().trim() === correct.toLowerCase().trim();

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
    resultSection.className = 'result-section ' + (isCorrect ? 'result-correct' : 'result-incorrect');

    if (isCorrect) {
        resultContent.innerHTML = `
            <div style="display:flex;align-items:center;gap:1rem;background:linear-gradient(135deg,#dcfce7,#bbf7d0);border:2px solid #22c55e;padding:1rem;border-radius:12px;">
                <div style="font-size:2rem">✅</div>
                <div><h4 style="margin:0;color:#15803d">Correct!</h4><p style="margin:0;color:#166534">Great job! 🎉</p></div>
            </div>
        `;
    } else {
        resultContent.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:1rem;background:linear-gradient(135deg,#fee2e2,#fecaca);border:2px solid #ef4444;padding:1rem;border-radius:12px;">
                <div style="font-size:2rem">❌</div>
                <div>
                    <h4 style="margin:0;color:#b91c1c">Incorrect</h4>
                    <p style="margin:4px 0;color:#1e293b">💡 <strong>Correct answer:</strong> <span style="color:#065f46">${correctAnswer}</span></p>
                    <p style="margin:2px 0;color:#475569">📝 <strong>Your answer:</strong> <span style="color:#b91c1c">${userAnswer}</span></p>
                </div>
            </div>
        `;
    }

    if (continueBtn) continueBtn.style.display = 'block';
    lucide.createIcons();

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
