let readingQuestionCount = 0;
let pronunciationQuestionCount = 0;

const MASTER_ADMIN_TOKEN = localStorage.getItem("eel_master_admin_token") || "eel_master_admin_token_v1";

// Sidebar & Notification Logic
(function initMasterAdminCommon() {
    // Initial Auth Check
    const user = JSON.parse(localStorage.getItem('eel_user') || '{}');
    if (user.role !== 'master_admin') {
        window.location.href = 'login.html';
        return;
    }

    // Lucide Icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Hide Loading Screen
    const loadingScreen = document.getElementById('loading-screen');
    const mainApp = document.getElementById('main-app');
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');

    // Mobile Sidebar Toggle (Match behavior of other master admin pages)
    (function initSidebarToggle() {
        const sidebar = document.getElementById("sidebar");
        const menuBtn = document.getElementById("mobileNavMenuBtn");
        if (!sidebar || !menuBtn) return;
        
        let overlay = document.getElementById("mobile-sidebar-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "mobile-sidebar-overlay";
            overlay.className = "mobile-sidebar-overlay hidden";
            document.body.appendChild(overlay);
        }

        const STORAGE_KEY = "eel-sidebar-open";
        const isDesktop = window.matchMedia && window.matchMedia("(min-width: 769px)").matches;
        const stored = sessionStorage.getItem(STORAGE_KEY);
        
        // Initial state
        if (stored !== null) {
            if (stored === "true") {
                sidebar.classList.add("open");
                overlay.classList.remove("hidden");
            } else {
                sidebar.classList.remove("open");
                overlay.classList.add("hidden");
            }
        } else {
            if (isDesktop) {
                sidebar.classList.add("open");
                overlay.classList.remove("hidden");
                sessionStorage.setItem(STORAGE_KEY, "true");
            } else {
                sidebar.classList.remove("open");
                overlay.classList.add("hidden");
                sessionStorage.setItem(STORAGE_KEY, "false");
            }
        }

        function updateBurgerIcon(isOpen) {
            menuBtn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
            const menuSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`;
            const closeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
            menuBtn.innerHTML = isOpen ? closeSvg : menuSvg;
        }

        function closeSidebar() {
            sidebar.classList.remove("open");
            overlay.classList.add("hidden");
            updateBurgerIcon(false);
            sessionStorage.setItem(STORAGE_KEY, "false");
        }

        function openSidebar() {
            sidebar.classList.add("open");
            overlay.classList.remove("hidden");
            updateBurgerIcon(true);
            sessionStorage.setItem(STORAGE_KEY, "true");
        }

        updateBurgerIcon(sidebar.classList.contains("open"));

        menuBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            if (sidebar.classList.contains("open")) closeSidebar();
            else openSidebar();
        });

        overlay.addEventListener("click", closeSidebar);

        // Auto-close on link click (mobile only)
        sidebar.addEventListener("click", function (e) {
            if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) {
                const link = e.target.closest("a[href]");
                const href = (link && link.getAttribute("href")) || "";
                if (href && href.trim() !== "" && href !== "#" && !href.startsWith("javascript:")) {
                    closeSidebar();
                }
            }
        });
    })();

    // Logout Logic
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            const result = await Swal.fire({
                icon: "question",
                title: "Log out?",
                text: "Are you sure you want to log out?",
                showCancelButton: true,
                confirmButtonText: "Yes",
                cancelButtonText: "No",
                confirmButtonColor: "#8b5cf6",
            });
            if (result.isConfirmed) {
                localStorage.removeItem("eel_user");
                localStorage.removeItem("eel_master_admin_token");
                localStorage.removeItem("eel_token");
                window.location.href = "login.html";
            }
        });
    }

    // Notification Logic
    const notifBtn = document.getElementById("masterAdminNotificationBtn");
    const notifPanel = document.getElementById("masterAdminNotificationPanel");
    const notifBadge = document.getElementById("masterAdminNotificationBadge");
    const notifList = document.getElementById("masterAdminNotificationList");

    if (notifBtn && notifPanel) {
        notifBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle("hidden");
            const isOpen = !notifPanel.classList.contains("hidden");
            notifBtn.setAttribute("aria-expanded", isOpen);
        });

        document.addEventListener("click", (e) => {
            if (!notifPanel.classList.contains("hidden") && !notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
                notifPanel.classList.add("hidden");
                notifBtn.setAttribute("aria-expanded", "false");
            }
        });

        // Fetch pending verifications for notification badge
        async function updateNotificationBadge() {
            try {
                const res = await fetch((window.API_BASE || "") + "/api/master-admin/dashboard-stats", {
                    headers: { "x-master-admin-token": MASTER_ADMIN_TOKEN }
                });
                
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Invalid server response (HTML instead of JSON).");
                }

                const data = await res.json();
        if (data.success && data.stats) {
                    const pending = data.stats.verification?.pending || 0;
                    if (pending > 0) {
                        notifBadge.textContent = pending > 99 ? "99+" : pending;
                        notifBadge.classList.remove("hidden");
                        if (notifList) {
                            notifList.innerHTML = `<a href="master-admin-dashboard.html" class="mobile-nav-notification-item" style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;text-decoration:none;color:inherit;border-bottom:1px solid var(--border);"><i data-lucide="user-check" class="size-5 text-violet-500"></i><div><p style="font-weight:600;font-size:0.875rem;">${pending} pending verifications</p><p style="font-size:0.75rem;color:var(--text-muted);">Review new account requests</p></div></a>`;
                            if (window.lucide) window.lucide.createIcons();
                        }
                    } else {
                        notifBadge.classList.add("hidden");
                        if (notifList) notifList.innerHTML = '<p class="mobile-nav-notification-empty">No notifications.</p>';
                    }
                }
            } catch (err) {
                console.error("Failed to fetch notification stats:", err);
            }
        }
        updateNotificationBadge();
    }
})();

function switchTab(tab) {
    const readingSection = document.getElementById('reading-quiz-section');
    const pronunciationSection = document.getElementById('pronunciation-quiz-section');
    const readingTable = document.getElementById('reading-quizzes-table-section');
    const pronunciationTable = document.getElementById('pronunciation-quizzes-table-section');
    const tabR = document.getElementById('tab-reading');
    const tabP = document.getElementById('tab-pronunciation');

    if (tab === 'reading') {
        readingSection.classList.remove('hidden');
        pronunciationSection.classList.add('hidden');
        readingTable.classList.remove('hidden');
        pronunciationTable.classList.add('hidden');
        tabR.classList.add('active');
        tabP.classList.remove('active');
    } else {
        readingSection.classList.add('hidden');
        pronunciationSection.classList.remove('hidden');
        readingTable.classList.add('hidden');
        pronunciationTable.classList.remove('hidden');
        tabR.classList.remove('active');
        tabP.classList.add('active');
    }
}

function addReadingQuestion() {
    readingQuestionCount++;
    const container = document.getElementById('reading-questions-container');
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.id = `r-q-${readingQuestionCount}`;
    questionDiv.innerHTML = `
        <div class="question-item-header flex items-center justify-between p-4 bg-muted/20 rounded-t-xl border-b border-border">
            <span class="text-xs font-black uppercase tracking-widest text-muted-foreground">Question #${readingQuestionCount}</span>
            <button type="button" class="remove-btn text-red-500 hover:text-red-700 transition-colors flex items-center gap-1.5" onclick="removeElement('r-q-${readingQuestionCount}')">
                <i data-lucide="trash-2" class="size-4"></i>
                <span class="remove-label">Remove</span>
            </button>
        </div>
        <div class="p-4 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                    <label class="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Question Type</label>
                    <select class="form-control q-type" onchange="toggleReadingQuestionType(${readingQuestionCount}, this.value)">
                        <option value="mcq">Multiple Choice</option>
                        <option value="essay">Essay / Open Ended</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Points</label>
                    <input type="number" class="form-control q-points" value="1" min="1">
                </div>
            </div>
            <div class="form-group">
                <label class="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Question Text</label>
                <textarea class="form-control q-text" required rows="2" placeholder="Enter the question..."></textarea>
            </div>
            <div class="mcq-options-wrap mt-2" id="mcq-options-${readingQuestionCount}">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold uppercase text-muted-foreground">Options</span>
                    <span class="text-[9px] text-muted-foreground italic">Select the correct answer</span>
                </div>
                <div class="space-y-2">
                    ${[0, 1, 2, 3].map(i => `
                        <div class="option-item flex items-center gap-2 p-2 bg-muted/10 rounded-lg border border-border/50 hover:border-primary/30 transition-all">
                            <input type="radio" name="correct-${readingQuestionCount}" value="${i}" class="size-3.5 accent-primary" ${i === 0 ? 'checked' : ''}>
                            <input type="text" class="form-control opt-text !p-1.5 !text-xs" placeholder="Option ${i + 1}">
                        </div>
                    `).join('')}
                </div>
            </div>

        <div class="essay-placeholder hidden" id="essay-info-${readingQuestionCount}" style="padding: 1.25rem; background: color-mix(in srgb, var(--primary) 5%, transparent); border: 1px dashed var(--primary); border-radius: 0.75rem; text-align: center;">
            <i data-lucide="info" class="size-5" style="color: var(--primary); margin-bottom: 0.5rem; display: block; margin-left: auto; margin-right: auto;"></i>
            <p style="font-size: 0.875rem; color: var(--muted-foreground); margin: 0;">Students will provide a written answer for this question. It will be graded based on the passage content.</p>
        </div>
    `;
    container.appendChild(questionDiv);
    if (window.lucide) window.lucide.createIcons();
}

function toggleReadingQuestionType(qNum, type) {
    const mcqWrap = document.getElementById(`mcq-options-${qNum}`);
    const essayInfo = document.getElementById(`essay-info-${qNum}`);
    
    if (type === 'essay') {
        if (mcqWrap) mcqWrap.classList.add('hidden');
        if (essayInfo) essayInfo.classList.remove('hidden');
    } else {
        if (mcqWrap) mcqWrap.classList.remove('hidden');
        if (essayInfo) essayInfo.classList.add('hidden');
    }
}

function updatePronunciationQuestionType() {
    const difficulty = document.getElementById('p-difficulty').value;
    const container = document.getElementById('pronunciation-questions-container');
    
    let headerText = 'Words/Sentences';
    if (difficulty === 'beginner') headerText = 'Consonant Clusters';
    else if (difficulty === 'intermediate') headerText = 'Words for Stress Practice';
    else if (difficulty === 'advanced') headerText = 'Sentences for Linking Practice';
    
    container.innerHTML = `<h3 class="mb-4">${headerText}</h3>`;
    pronunciationQuestionCount = 0;
    addPronunciationQuestion();
}

function addPronunciationQuestion() {
    pronunciationQuestionCount++;
    const difficulty = document.getElementById('p-difficulty').value;
    const container = document.getElementById('pronunciation-questions-container');
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.id = `p-q-${pronunciationQuestionCount}`;

    let fields = '';
    if (difficulty === 'beginner') {
        fields = `
            <div class="form-group">
                <label>Word (Consonant Cluster)</label>
                <input type="text" class="form-control p-word" required placeholder="e.g., Splash">
            </div>
            <div class="form-group">
                <label>Correct Pronunciation (Phonetic/Notes)</label>
                <input type="text" class="form-control p-notes" placeholder="e.g., /splæʃ/">
            </div>
        `;
    } else if (difficulty === 'intermediate') {
        fields = `
            <div class="form-group">
                <label>Word</label>
                <input type="text" class="form-control p-word" required placeholder="e.g., Computer">
            </div>
            <div class="form-group">
                <label>Stressed Syllable (Word Stress)</label>
                <input type="text" class="form-control p-stress" placeholder="e.g., 2nd syllable">
            </div>
        `;
    } else {
        fields = `
            <div class="form-group">
                <label>Full Sentence (Linking/Connected Speech)</label>
                <textarea class="form-control p-sentence" required rows="2" placeholder="e.g., How are you today?"></textarea>
            </div>
            <div class="form-group">
                <label>Reduced Form (Optional)</label>
                <input type="text" class="form-control p-reduced" placeholder="e.g., How're ya today?">
            </div>
        `;
    }

    questionDiv.innerHTML = `
        <div class="question-item-header flex items-center justify-between p-4 bg-muted/20 rounded-t-xl border-b border-border">
            <span class="text-xs font-black uppercase tracking-widest text-muted-foreground">Practice Item #${pronunciationQuestionCount}</span>
            <button type="button" class="remove-btn text-red-500 hover:text-red-700 transition-colors flex items-center gap-1.5" onclick="removeElement('p-q-${pronunciationQuestionCount}')">
                <i data-lucide="trash-2" class="size-4"></i>
                <span class="remove-label">Remove</span>
            </button>
        </div>
        <div class="p-4 space-y-4">
             <div id="p-item-fields-${pronunciationQuestionCount}">
                 ${fields}
             </div>
         </div>
    `;
    container.appendChild(questionDiv);
    if (window.lucide) window.lucide.createIcons();
}

function removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

document.getElementById('reading-quiz-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('r-title').value;
    const difficulty = 'beginner'; // Default to beginner as requested
    const passage = document.getElementById('r-passage').value;
    const passing_score = document.getElementById('r-passing').value;

    const questions = [];
    document.querySelectorAll('#reading-questions-container .question-item').forEach((qDiv, idx) => {
        const question_text = qDiv.querySelector('.q-text').value;
        const question_type = qDiv.querySelector('.q-type').value;
        const points = qDiv.querySelector('.q-points').value;
        
        const qObj = { question_text, question_type, points, position: idx + 1 };
        
        if (question_type === 'mcq') {
            const options = [];
            const correctIdx = qDiv.querySelector('input[type="radio"]:checked').value;
            qDiv.querySelectorAll('.opt-text').forEach((optInput, optIdx) => {
                if (optInput.value.trim()) {
                    options.push({
                        option_text: optInput.value,
                        is_correct: Number(correctIdx) === optIdx ? 1 : 0,
                        position: optIdx + 1
                    });
                }
            });
            qObj.options = options;
        }
        questions.push(qObj);
    });

    if (questions.length === 0) {
        Swal.fire('Error', 'Please add at least one question.', 'error');
        return;
    }

    try {
        const res = await fetch((window.API_BASE || "") + '/api/master-admin/reading-quizzes', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-master-admin-token': MASTER_ADMIN_TOKEN
            },
            body: JSON.stringify({ title, difficulty, passage, passing_score, questions })
        });
        const data = await res.json();
        if (data.success) {
            Swal.fire('Success', 'Reading quiz added successfully!', 'success').then(() => {
                window.location.reload();
            });
        } else {
            Swal.fire('Error', data.error || 'Failed to add quiz.', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Server error.', 'error');
    }
});

document.getElementById('pronunciation-quiz-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('p-title').value;
    const difficulty = document.getElementById('p-difficulty').value;

    const questions = [];
    document.querySelectorAll('#pronunciation-questions-container .question-item').forEach((qDiv, idx) => {
        const qObj = { position: idx + 1 };
        if (difficulty === 'beginner') {
            qObj.word = qDiv.querySelector('.p-word').value;
            qObj.correct_pronunciation = qDiv.querySelector('.p-notes').value;
        } else if (difficulty === 'intermediate') {
            qObj.word = qDiv.querySelector('.p-word').value;
            qObj.stressed_syllable = qDiv.querySelector('.p-stress').value;
        } else {
            qObj.sentence = qDiv.querySelector('.p-sentence').value;
            qObj.reduced_form = qDiv.querySelector('.p-reduced').value;
            qObj.full_sentence = qObj.sentence;
        }
        questions.push(qObj);
    });

    if (questions.length === 0) {
        Swal.fire('Error', 'Please add at least one item.', 'error');
        return;
    }

    try {
        const res = await fetch((window.API_BASE || "") + '/api/master-admin/pronunciation-quizzes', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-master-admin-token': MASTER_ADMIN_TOKEN
            },
            body: JSON.stringify({ title, difficulty, questions })
        });
        const data = await res.json();
        if (data.success) {
            Swal.fire('Success', 'Pronunciation quiz added successfully!', 'success').then(() => {
                window.location.reload();
            });
        } else {
            Swal.fire('Error', data.error || 'Failed to add quiz.', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Server error.', 'error');
    }
});

// Initialize with one question/item each
addReadingQuestion();
addPronunciationQuestion();

// Fetch and display existing quizzes
async function fetchReadingQuizzes() {
    const tbody = document.getElementById('reading-quizzes-tbody');
    try {
        const res = await fetch((window.API_BASE || "") + "/api/master-admin/reading-quizzes/all", {
            headers: { "x-master-admin-token": MASTER_ADMIN_TOKEN }
        });
        const data = await res.json();
        if (data.success && data.quizzes) {
            if (data.quizzes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-muted-foreground">No reading quizzes found.</td></tr>';
                return;
            }
            tbody.innerHTML = data.quizzes.map(q => `
                <tr class="quiz-row">
                    <td class="quiz-number-cell">#${q.quiz_number}</td>
                    <td class="font-bold">${q.title}</td>
                    <td><span class="level-badge ${q.difficulty}">${q.difficulty}</span></td>
                    <td>
                        <div class="flex items-center gap-1.5 font-medium">
                            <i data-lucide="target" class="size-3.5 text-muted-foreground"></i>
                            ${q.passing_score}%
                        </div>
                    </td>
                    <td>
                        <div class="status-indicator ${q.status}">
                            <div class="status-dot"></div>
                            ${q.status}
                        </div>
                    </td>
                    <td>
                        <div class="action-btns">
                            <button class="action-icon-btn view" title="View Details"><i data-lucide="eye" class="size-4"></i></button>
                            <button class="action-icon-btn edit" title="Edit Quiz"><i data-lucide="edit-3" class="size-4"></i></button>
                            <button class="action-icon-btn delete" title="Delete Quiz"><i data-lucide="trash-2" class="size-4"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
            if (window.lucide) window.lucide.createIcons();
        }
    } catch (err) {
        console.error("Failed to fetch reading quizzes:", err);
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-red-500">Failed to load reading quizzes.</td></tr>';
    }
}

async function fetchPronunciationQuizzes() {
    const tbody = document.getElementById('pronunciation-quizzes-tbody');
    try {
        const res = await fetch((window.API_BASE || "") + "/api/master-admin/pronunciation-quizzes/all", {
            headers: { "x-master-admin-token": MASTER_ADMIN_TOKEN }
        });
        const data = await res.json();
        if (data.success && data.quizzes) {
            if (data.quizzes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-muted-foreground">No pronunciation quizzes found.</td></tr>';
                return;
            }
            tbody.innerHTML = data.quizzes.map(q => `
                <tr class="quiz-row">
                    <td class="quiz-number-cell">#${q.quiz_number}</td>
                    <td class="font-bold">${q.title}</td>
                    <td><span class="level-badge ${q.difficulty}">${q.difficulty}</span></td>
                    <td>
                        <div class="status-indicator ${q.status}">
                            <div class="status-dot"></div>
                            ${q.status}
                        </div>
                    </td>
                    <td>
                        <div class="action-btns">
                            <button class="action-icon-btn view" title="View Details"><i data-lucide="eye" class="size-4"></i></button>
                            <button class="action-icon-btn edit" title="Edit Quiz"><i data-lucide="edit-3" class="size-4"></i></button>
                            <button class="action-icon-btn delete" title="Delete Quiz"><i data-lucide="trash-2" class="size-4"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
            if (window.lucide) window.lucide.createIcons();
        }
    } catch (err) {
        console.error("Failed to fetch pronunciation quizzes:", err);
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-500">Failed to load pronunciation quizzes.</td></tr>';
    }
}

// Initial fetch
fetchReadingQuizzes();
fetchPronunciationQuizzes();
