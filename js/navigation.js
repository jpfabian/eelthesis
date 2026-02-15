function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setupProfilePopover(headerContainer, user) {
    const btn = document.getElementById("sidebar-avatar-btn");
    const popover = document.getElementById("sidebar-profile-popover");
    if (!btn || !popover) return;

    function close() {
        popover.classList.add("hidden");
        btn.setAttribute("aria-expanded", "false");
    }

    function open() {
        popover.classList.remove("hidden");
        btn.setAttribute("aria-expanded", "true");
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    function toggle() {
        const isOpen = !popover.classList.contains("hidden");
        if (isOpen) close();
        else open();
    }

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
    });

    document.addEventListener("click", (e) => {
        if (popover.classList.contains("hidden")) return;
        if (popover.contains(e.target) || btn.contains(e.target)) return;
        close();
    });
}

const TUTORIAL_STORAGE_KEY = "eel_tutorial_done";

function getTutorialSteps(user, currentPageId) {
    const isTeacher = user.role === "teacher";
    return [
        {
            title: "Welcome to EEL",
            body: "English Enhancement Learning helps you improve reading and pronunciation. This short tour will show you around.",
            icon: "sparkles"
        },
        {
            title: "Your sidebar",
            body: isTeacher
                ? "Use the sidebar to open Subject Lessons, Reading, Pronunciation, Recitation, Exam Generator, and Student Progress. Click your avatar at the top to see your profile and Settings."
                : "Use the sidebar to open Subject Lessons, Reading, Pronunciation, and My Progress to track your learning. Click your avatar at the top to see your profile and Settings.",
            icon: "panel-left"
        },
        {
            title: currentPageId === "classes" ? "Classes" : "Getting started",
            body: isTeacher
                ? "From the Classroom you can create classes and share the class code with students. Select a class to manage lessons and view progress."
                : "Join a class using the code from your teacher. After joining, select a class to access lessons, reading, and pronunciation activities.",
            icon: "layers"
        },
        {
            title: "You're all set",
            body: "You can change theme (light/dark) from the button in the top-right corner. Need this tour again? Open Settings to replay the tutorial.",
            icon: "check-circle"
        }
    ];
}

function showTutorialIfNew(user, currentPageId) {
    if (localStorage.getItem(TUTORIAL_STORAGE_KEY)) return;
    if (user.role === "admin") return;

    const steps = getTutorialSteps(user, currentPageId);
    let stepIndex = 0;

    const overlay = document.createElement("div");
    overlay.id = "eel-tutorial-overlay";
    overlay.className = "eel-tutorial-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "eel-tutorial-title");

    function closeTutorial() {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
        overlay.remove();
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    function renderStep() {
        const step = steps[stepIndex];
        if (!step) return;
        const titleEl = overlay.querySelector("#eel-tutorial-title");
        const bodyEl = overlay.querySelector("#eel-tutorial-body");
        const iconEl = overlay.querySelector("#eel-tutorial-icon");
        const backBtn = overlay.querySelector("#eel-tutorial-back");
        const nextBtn = overlay.querySelector("#eel-tutorial-next");
        const progressEl = overlay.querySelector("#eel-tutorial-progress");
        if (titleEl) titleEl.textContent = step.title;
        if (bodyEl) bodyEl.textContent = step.body;
        if (iconEl) {
            iconEl.setAttribute("data-lucide", step.icon);
            if (window.lucide && typeof window.lucide.createIcons === "function") {
                window.lucide.createIcons();
            }
        }
        if (backBtn) {
            backBtn.style.display = stepIndex === 0 ? "none" : "inline-flex";
        }
        if (nextBtn) {
            nextBtn.textContent = stepIndex === steps.length - 1 ? "Finish" : "Next";
        }
        if (progressEl) {
            progressEl.textContent = (stepIndex + 1) + " / " + steps.length;
        }
    }

    overlay.innerHTML = `
        <div class="eel-tutorial-backdrop"></div>
        <div class="eel-tutorial-card">
            <div class="eel-tutorial-icon-wrap">
                <i id="eel-tutorial-icon" data-lucide="sparkles" class="eel-tutorial-icon"></i>
            </div>
            <h2 id="eel-tutorial-title" class="eel-tutorial-title"></h2>
            <p id="eel-tutorial-body" class="eel-tutorial-body"></p>
            <div class="eel-tutorial-progress" id="eel-tutorial-progress"></div>
            <div class="eel-tutorial-actions">
                <button type="button" id="eel-tutorial-skip" class="btn btn-outline btn-sm">Skip</button>
                <div class="eel-tutorial-nav">
                    <button type="button" id="eel-tutorial-back" class="btn btn-outline btn-sm" style="display:none;">Back</button>
                    <button type="button" id="eel-tutorial-next" class="btn btn-primary btn-sm">Next</button>
                </div>
            </div>
        </div>
    `;

    overlay.querySelector("#eel-tutorial-skip").addEventListener("click", closeTutorial);
    overlay.querySelector("#eel-tutorial-back").addEventListener("click", () => {
        if (stepIndex > 0) {
            stepIndex--;
            renderStep();
        }
    });
    overlay.querySelector("#eel-tutorial-next").addEventListener("click", () => {
        if (stepIndex < steps.length - 1) {
            stepIndex++;
            renderStep();
        } else {
            closeTutorial();
        }
    });
    overlay.querySelector(".eel-tutorial-backdrop").addEventListener("click", closeTutorial);

    document.body.appendChild(overlay);
    renderStep();
    if (typeof hideLoading === "function") hideLoading();
}

function setupSidebar(user, currentPage) {
    const sidebar = document.getElementById('sidebar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarWelcome = document.getElementById('sidebar-welcome');
    const sidebarNav = document.getElementById('sidebar-nav');

    if (!sidebarTitle || !sidebarWelcome || !sidebarNav) return;

    // Read selected class from localStorage (both roles)
    let selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));

    // Normalize subject for display (do NOT hardcode subject_id mapping;
    // subject IDs come from the database and may differ).
    let subject = "";
    if (selectedClass?.subject) {
        subject = selectedClass.subject
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    const fullName = `${user.fname ?? ""} ${user.lname ?? ""}`.trim() || "User";
    const initials = fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(s => s[0]?.toUpperCase())
        .join("") || "U";

    const roleLabel =
        user.role === "teacher" ? "Teacher" :
        user.role === "admin" ? "Admin" :
        "Student";

    // Replace the default header (p-6) with a cleaner profile header, without changing page HTML files
    const headerContainer = sidebarTitle.parentElement; // the .p-6 div in templates
    if (headerContainer) {
        headerContainer.classList.add("sidebar-profile");
        headerContainer.classList.remove("p-6");

        const classLine = currentPage === "classes"
            ? (user.role === "teacher" ? "Your classrooms" : "Your classes")
            : (selectedClass
                ? `${selectedClass.name ?? ""} ${selectedClass.section ?? ""}`.trim()
                : "No class selected");

        const classExtra = (currentPage === "classes")
            ? ""
            : (selectedClass
                ? (user.role === "teacher"
                    ? `Code: ${escapeHtml(selectedClass.class_code ?? "-")}${subject ? `<br>Subject: ${escapeHtml(subject)}` : ""}`
                    : `${subject ? `Subject: ${escapeHtml(subject)}` : ""}`)
                : "");

        const userEmail = user.email || "";
        const avatarUrl = typeof localStorage !== "undefined" ? localStorage.getItem("eel_avatar_url") : null;
        const avatarHtml = avatarUrl
            ? `<img class="sidebar-avatar sidebar-avatar-img" src="${escapeHtml(avatarUrl)}" alt="">`
            : `<span class="sidebar-avatar" aria-hidden="true">${initials}</span>`;
        const popoverAvatarHtml = avatarUrl
            ? `<img class="sidebar-profile-popover-avatar-img" src="${escapeHtml(avatarUrl)}" alt="">`
            : initials;
        headerContainer.innerHTML = `
            <div class="sidebar-profile-top">
                <div class="sidebar-avatar-wrap">
                    <button type="button" class="sidebar-avatar-btn" id="sidebar-avatar-btn" aria-label="View profile" aria-expanded="false" aria-haspopup="true">
                        ${avatarHtml}
                    </button>
                    <div id="sidebar-profile-popover" class="sidebar-profile-popover hidden" role="dialog" aria-label="Profile">
                        <div class="sidebar-profile-popover-avatar">${popoverAvatarHtml}</div>
                        <div class="sidebar-profile-popover-name">${fullName}</div>
                        ${userEmail ? `<div class="sidebar-profile-popover-email">${escapeHtml(userEmail)}</div>` : ""}
                        <a href="settings.html" class="sidebar-profile-popover-link">
                            <i data-lucide="settings" class="size-4"></i>
                            Settings
                        </a>
                    </div>
                </div>
                <div style="min-width:0;">
                    <div class="sidebar-name-row">
                        <span id="sidebar-title" class="sidebar-user-name">${fullName}</span>
                        <span class="sidebar-user-role">${roleLabel}</span>
                    </div>
                    <div id="sidebar-welcome" class="sidebar-user-meta">${classLine}</div>
                </div>
            </div>
            <div class="sidebar-badge">
                <span class="sidebar-badge-label">Class details</span>
                ${classExtra ? `<span class="sidebar-badge-value">${classExtra}</span>` : (classLine ? `<span class="sidebar-badge-value">${escapeHtml(classLine)}</span>` : "<span class=\"sidebar-badge-value\">No class selected</span>")}
            </div>
        `;
        setupProfilePopover(headerContainer, user);
    } else {
        // Fallback if templates differ
        sidebarTitle.textContent = fullName;
        sidebarWelcome.textContent = selectedClass ? `${selectedClass.name ?? ""} ${selectedClass.section ?? ""}` : "No class selected";
    }

    const classIdParam = selectedClass ? `?class_id=${selectedClass.id}` : '';

    // Define pages + groupings for a friendlier nav
    const groups = [];

    const accountGroup = {
        title: "Account",
        items: [
            { id: 'settings', label: 'Settings', icon: 'settings', url: 'settings.html' },
            { id: 'logout', label: 'Logout', icon: 'log-out', action: 'logout' },
        ]
    };

    // Special case: on Classes page, keep navigation minimal
    if (currentPage === "classes") {
        groups.push({
            title: "Classroom",
            items: [
                { id: 'classes', label: 'Classroom', icon: 'layers', url: 'classes.html' },
                { id: 'logout', label: 'Logout', icon: 'log-out', action: 'logout' },
            ]
        });
    } else

    if (user.role === "admin") {
        groups.push({
            title: "Admin",
            items: [
                { id: 'account-verification', label: 'Account Verification', icon: 'check-circle', url: 'account-verification.html' },
            ]
        });
        groups.push(accountGroup);
    } else if (user.role === "teacher") {
        groups.push({
            title: "Learning",
            items: [
                { id: 'lessons', label: 'Subject Lessons', icon: 'library', url: 'lessons.html' },
                { id: 'reading-lessons', label: 'Reading', icon: 'book-open', url: 'reading-lessons.html' },
                { id: 'pronunciation-lessons', label: 'Pronunciation', icon: 'mic', url: 'pronunciation-lessons.html' },
                { id: 'recitation', label: 'Recitation', icon: 'brain', url: 'recitation.html' },
            ]
        });
        groups.push({
            title: "Tools",
            items: [
                { id: 'exam-generator', label: 'Exam Generator', icon: 'pen-tool', url: 'exam-generator.html' },
            ]
        });
        groups.push({
            title: "Reports",
            items: [
                { id: 'student-progress', label: 'Student Progress', icon: 'users', url: 'student-progress.html' },
            ]
        });
        groups.push(accountGroup);
    } else {
        groups.push({
            title: "Learning",
            items: [
                { id: 'lessons', label: 'Subject Lessons', icon: 'library', url: 'lessons.html' },
                { id: 'reading-lessons', label: 'Reading', icon: 'book-open', url: 'reading-lessons.html' },
                { id: 'pronunciation-lessons', label: 'Pronunciation', icon: 'mic', url: 'pronunciation-lessons.html' },
            ]
        });
        groups.push({
            title: "Progress",
            items: [
                { id: 'my-progress', label: 'My Progress', icon: 'trending-up', url: 'my-progress.html' },
            ]
        });
        groups.push(accountGroup);
    }

    function renderItem(item) {
        const activeClass = currentPage === item.id ? 'active' : '';
        const common = `nav-button btn btn-side-bar w-full justify-start gap-3 text-left transition-all flex items-center ${activeClass}`;

        if (item.action === 'logout') {
            return `
                <button type="button" data-action="logout" class="${common}">
                    <i data-lucide="${item.icon}" class="size-5"></i>
                    <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.label}</span>
                </button>
            `;
        }

        return `
            <a href="${item.url}${classIdParam}"
               class="${common}">
                <i data-lucide="${item.icon}" class="size-5"></i>
                <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.label}</span>
            </a>
        `;
    }

    sidebarNav.innerHTML = groups.map((group, idx) => {
        const itemsHtml = group.items.map(renderItem).join('');
        const dividerHtml = idx === groups.length - 1 ? '' : '<div class="sidebar-divider"></div>';

        return `
            <div class="sidebar-section-title">${group.title}</div>
            <div class="space-y-2">${itemsHtml}</div>
            ${dividerHtml}
        `;
    }).join('');

    // Wire actions (logout) and hide legacy footer button to avoid duplicates
    sidebarNav.querySelectorAll('[data-action="logout"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            logout();
            window.location.href = 'login.html';
        });
    });

    const legacyLogout = document.getElementById('logout-btn');
    if (legacyLogout) {
        const wrapper = legacyLogout.closest('div');
        if (wrapper) wrapper.remove();
        else legacyLogout.remove();
    }

    // Render lucide icons if available
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

function ensureMobileSidebarControls() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Overlay
    let overlay = document.getElementById('mobile-sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mobile-sidebar-overlay';
        overlay.className = 'mobile-sidebar-overlay hidden';
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.add('hidden');
        });
        document.body.appendChild(overlay);
    }

    // Toggle button
    let toggle = document.getElementById('mobile-sidebar-toggle');
    if (!toggle) {
        toggle = document.createElement('button');
        toggle.id = 'mobile-sidebar-toggle';
        toggle.type = 'button';
        toggle.className = 'mobile-sidebar-toggle';
        toggle.setAttribute('aria-label', 'Toggle sidebar');
        toggle.innerHTML = `<i data-lucide="menu" class="size-5"></i>`;
        toggle.addEventListener('click', () => {
            const willOpen = !sidebar.classList.contains('open');
            sidebar.classList.toggle('open', willOpen);
            overlay.classList.toggle('hidden', !willOpen);
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                setTimeout(() => window.lucide.createIcons(), 0);
            }
        });
        document.body.appendChild(toggle);
    }

    // Close sidebar when a nav item is clicked (mobile UX)
    sidebar.querySelectorAll('.nav-button').forEach(el => {
        el.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.add('hidden');
        });
    });

    // Ensure icons are rendered
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        setTimeout(() => window.lucide.createIcons(), 0);
    }
}

function ensureThemeToggleButton() {
    if (!window.EELTheme) return;
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Add once per page
    if (document.getElementById('theme-toggle-btn')) return;

    const footer = sidebar.querySelector('.p-4:last-child') || sidebar;

    const btn = document.createElement('button');
    btn.id = 'theme-toggle-btn';
    btn.type = 'button';
    btn.className = 'w-full p-3 btn-side-bar border';
    btn.style.marginBottom = '0.75rem';

    const updateLabel = () => {
        const resolved = document.documentElement.dataset.theme || window.EELTheme.getSystemTheme();
        const icon = resolved === 'dark' ? 'moon' : 'sun';
        const label = resolved === 'dark' ? 'Dark mode' : 'Light mode';
        btn.innerHTML = `<i data-lucide="${icon}"></i>${label}`;
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            setTimeout(() => window.lucide.createIcons(), 0);
        }
    };

    btn.addEventListener('click', () => {
        window.EELTheme.toggleTheme();
        updateLabel();
        showNotification(`Theme set to ${document.documentElement.dataset.theme}`, 'success');
    });

    updateLabel();

    // Insert above logout button (footer container)
    footer.insertAdjacentElement('afterbegin', btn);
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type} fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg max-w-sm`;
    
    // Set notification styling based on type
    if (type === 'success') {
        notification.classList.add('bg-primary', 'text-primary-foreground', 'border-primary');
    } else if (type === 'error') {
        notification.classList.add('bg-destructive', 'text-destructive-foreground', 'border-destructive');
    } else if (type === 'warning') {
        notification.classList.add('bg-secondary', 'text-secondary-foreground', 'border-secondary');
    } else {
        notification.classList.add('bg-card', 'text-card-foreground', 'border-border');
    }

    notification.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="flex-1">${message}</div>
        </div>
    `;

    document.body.appendChild(notification);
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getCurrentPageId() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().split('?')[0].replace('.html', '');

    const pageMap = {
        //'dashboard': 'dashboard',
        'lessons': 'lessons',
        'reading-lessons': 'reading-lessons',
        'pronunciation-lessons': 'pronunciation-lessons',
        'exam-generator': 'exam-generator',
        'recitation': 'recitation',
        'student-progress': 'student-progress',
        'my-progress': 'my-progress',
        'settings': 'settings',
        'classes': 'classes'
    };
    
    return pageMap[filename] || filename || 'dashboard';
}

// Helper function to validate user access to page
function validatePageAccess(user, pageId) {
    const teacherPages = [
        'classes', // ➕ dito
        'dashboard', 'lessons', 'reading-lessons', 'pronunciation-lessons', 
        'exam-generator', 'recitation',
        'student-progress', 'settings'
    ];

    const studentPages = [
        'classes', // ➕ dito
        'dashboard', 'lessons', 'reading-lessons', 'pronunciation-lessons',
        'my-progress', 'settings'
    ];
    
    if (user.role === 'teacher') {
        return teacherPages.includes(pageId);
    } else {
        return studentPages.includes(pageId);
    }
}

// Common page setup function
function initializePage() {
    return new Promise((resolve, reject) => {
        // Check authentication
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        const user = getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const currentPageId = getCurrentPageId();
        
        // Validate user has access to this page
        if (!validatePageAccess(user, currentPageId)) {
            // Redirect to appropriate dashboard
            window.location.href = 'dashboard.html';
            return;
        }

        // Setup sidebar
        setupSidebar(user, currentPageId);
        ensureMobileSidebarControls();
        // Theme toggle is now the top-right corner button (js/theme.js)

        // Tutorial for new users (teacher or student)
        showTutorialIfNew(user, currentPageId);

        // Setup logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                logout();
                window.location.href = 'login.html';
            });
        }

        resolve(user);
    });
}

// Loading screen helpers
function showLoading(message = 'Loading...') {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        const loadingText = loadingScreen.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
        loadingScreen.classList.remove('hidden');
    }
}

function hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
    if (mainApp) {
        mainApp.classList.remove('hidden');
    }
    
    // Reinitialize Lucide icons
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        setTimeout(() => window.lucide.createIcons(), 100);
    }
}