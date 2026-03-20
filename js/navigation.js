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
        user.role === "master_admin" ? "Master Admin" :
        "Student";

    // Replace the default header (p-6) with a cleaner profile header, without changing page HTML files
    const headerContainer = sidebarTitle.parentElement; // the .p-6 div in templates
    if (headerContainer) {
        headerContainer.classList.add("sidebar-profile");
        headerContainer.classList.remove("p-6");

        const classLine = currentPage === "classes"
            ? (user.role === "teacher" ? "Your classrooms" : "Your classes")
            : currentPage === "settings"
                ? "My Account"
                : currentPage === "deleted-classes"
                    ? "Archived Classes Cache"
                : currentPage === "teacher-dashboard" && user.role === "teacher"
                    ? "Dashboard"
                : (selectedClass
                    ? `${selectedClass.name ?? ""} ${selectedClass.section ?? ""}`.trim()
                    : "No class selected");

        const teacherClassCode = selectedClass?.class_code ? String(selectedClass.class_code) : "-";
        const classExtra = (currentPage === "classes" || currentPage === "settings")
            ? ""
            : (selectedClass
                ? (user.role === "teacher"
                    ? `<span class="sidebar-class-code-row">
                        <span>Code: ${escapeHtml(teacherClassCode)}</span>
                        <button type="button" class="sidebar-copy-code-btn" id="sidebar-copy-code-btn" data-class-code="${escapeHtml(teacherClassCode)}" aria-label="Copy class code" title="Copy class code">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                      </span>${subject ? `<br>Subject: ${escapeHtml(subject)}` : ""}`
                    : `${subject ? `Subject: ${escapeHtml(subject)}` : ""}`)
                : "");

        const userEmail = user.email || "";
        const avatarUrl = user.avatar_url || null;
        const avatarHtml = avatarUrl
            ? `<img class="sidebar-avatar sidebar-avatar-img" src="${escapeHtml(avatarUrl)}" alt="">`
            : `<span class="sidebar-avatar" aria-hidden="true">${initials}</span>`;
        const popoverAvatarHtml = avatarUrl
            ? `<img class="sidebar-profile-popover-avatar-img" src="${escapeHtml(avatarUrl)}" alt="">`
            : initials;
        const showClassDetailsBadge =
            currentPage !== "settings" &&
            currentPage !== "classes" &&
            currentPage !== "deleted-classes" &&
            !(currentPage === "teacher-dashboard" && user.role === "teacher");

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
                        ${user.role === "master_admin" ? `<a href="master-admin.html" class="sidebar-profile-popover-link"><i data-lucide="shield" class="size-4"></i>Master Admin</a>` : ""}
                        <a href="settings.html" class="sidebar-profile-popover-link">
                            <i data-lucide="user" class="size-4"></i>
                            My Account
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
            ${showClassDetailsBadge ? `<div class="sidebar-badge">
                <span class="sidebar-badge-label">Class details</span>
                ${classExtra ? `<span class="sidebar-badge-value">${classExtra}</span>` : (classLine ? `<span class="sidebar-badge-value">${escapeHtml(classLine)}</span>` : "<span class=\"sidebar-badge-value\">No class selected</span>")}
            </div>` : ""}
        `;
        const copyBtn = headerContainer.querySelector("#sidebar-copy-code-btn");
        if (copyBtn) {
            copyBtn.addEventListener("click", async function (e) {
                e.preventDefault();
                e.stopPropagation();
                const classCode = String(copyBtn.getAttribute("data-class-code") || "").trim();
                if (!classCode) return;
                let copied = false;
                try {
                    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                        await navigator.clipboard.writeText(classCode);
                        copied = true;
                    }
                } catch {}
                if (!copied) {
                    try {
                        const ta = document.createElement("textarea");
                        ta.value = classCode;
                        ta.setAttribute("readonly", "");
                        ta.style.position = "fixed";
                        ta.style.top = "-9999px";
                        document.body.appendChild(ta);
                        ta.select();
                        copied = document.execCommand("copy");
                        ta.remove();
                    } catch {}
                }
                if (copied) {
                    if (typeof showNotification === "function") showNotification("Class code copied.", "success");
                    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>`;
                    setTimeout(() => {
                        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"></path></svg>`;
                    }, 1200);
                } else {
                    if (typeof showNotification === "function") showNotification("Failed to copy class code.", "error");
                }
            });
        }
        setupProfilePopover(headerContainer, user);
    } else {
        // Fallback if templates differ
        sidebarTitle.textContent = fullName;
        sidebarWelcome.textContent = selectedClass ? `${selectedClass.name ?? ""} ${selectedClass.section ?? ""}` : "No class selected";
    }

    // Use clean URLs (no class_id in address bar); class is in localStorage.
    const classIdParam = '';

    // Define pages + groupings for a friendlier nav
    const groups = [];

    // Settings and Logout live in the sidebar HTML with Back to Classes, not in nav groups.

    // Special case: on Classes/Settings/Deleted Classes/Teacher Dashboard pages, show minimal sidebar.
    if (currentPage === "classes" || currentPage === "settings" || currentPage === "deleted-classes" || (user.role === "teacher" && currentPage === "teacher-dashboard")) {
        if (user.role === "teacher") {
            groups.push({
                title: "Overview",
                items: [{ id: 'teacher-dashboard', label: 'Dashboard', icon: 'layout-dashboard', url: 'teacher-dashboard.html' }]
            });
            groups.push({
                title: "Classroom",
                items: [{ id: 'classes', label: 'Classroom', icon: 'layers', url: 'classes.html' }]
            });
            groups.push({
                title: "Account",
                items: [
                    { id: 'settings', label: 'My Account', icon: 'user', url: 'settings.html' },
                    { id: 'deleted-classes', label: 'Archived Classes', icon: 'archive', url: 'deleted-classes.html' }
                ]
            });
        } else {
            groups.push({
                title: "Classroom",
                items: [{ id: 'classes', label: 'Classroom', icon: 'layers', url: 'classes.html' }]
            });
            groups.push({
                title: "Account",
                items: [{ id: 'settings', label: 'My Account', icon: 'user', url: 'settings.html' }]
            });
        }
    } else

    if (user.role === "admin") {
        groups.push({
            title: "Overview",
            items: [
                { id: 'admin-dashboard', label: 'Dashboard', icon: 'layout-dashboard', url: 'admin-dashboard.html' },
            ]
        });
        groups.push({
            title: "Management",
            items: [
                { id: 'account-verification', label: 'Account Verification', icon: 'check-circle', url: 'account-verification.html' },
            ]
        });
    } else if (user.role === "master_admin" || user.role === "teacher") {
        const teacherOverview = user.role === "teacher" && !selectedClass
            ? [{ id: 'teacher-dashboard', label: 'Dashboard', icon: 'layout-dashboard', url: 'teacher-dashboard.html' }]
            : [];
        if (teacherOverview.length) {
            groups.push({ title: "Overview", items: teacherOverview });
        }
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
                { id: 'student-progress', label: 'Student Statistics', icon: 'users', url: 'student-progress.html' },
                { id: 'deleted-ai-quizzes', label: 'Quiz & Exam Archive', icon: 'archive', url: 'deleted-ai-quizzes.html' },
            ]
        });
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

    // Wire the sidebar Logout button (Settings and Logout are in HTML with Back to Classes)
    const sidebarLogoutBtn = document.getElementById('logout-btn');
    if (sidebarLogoutBtn && !sidebarLogoutBtn._eelLogoutWired) {
        sidebarLogoutBtn._eelLogoutWired = true;
        sidebarLogoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogoutWithConfirm();
        });
    }

    // Active state for Settings link (lives in sidebar HTML, not in nav groups)
    const settingsLink = document.querySelector('#sidebar a[href="settings.html"]');
    if (settingsLink && currentPage === 'settings') {
        settingsLink.classList.add('active');
    }

    // Render lucide icons if available
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

function ensureMobileSidebarControls() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    let overlay = document.getElementById('mobile-sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mobile-sidebar-overlay';
        overlay.className = 'mobile-sidebar-overlay hidden';
        document.body.appendChild(overlay);
    }

    // Persist sidebar open/closed across page navigations (sessionStorage)
    const STORAGE_KEY = 'eel-sidebar-open';
    const isDesktop = window.matchMedia && window.matchMedia('(min-width: 769px)').matches;
    if (!sidebar._eelSidebarInitialized) {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
            const wantOpen = stored === 'true';
            if (wantOpen) {
                sidebar.classList.add('open');
                overlay.classList.remove('hidden');
            } else {
                sidebar.classList.remove('open');
                overlay.classList.add('hidden');
            }
        } else {
            if (isDesktop) {
                sidebar.classList.add('open');
                overlay.classList.remove('hidden');
                sessionStorage.setItem(STORAGE_KEY, 'true');
            } else {
                sidebar.classList.remove('open');
                overlay.classList.add('hidden');
                sessionStorage.setItem(STORAGE_KEY, 'false');
            }
        }
    }
    sidebar._eelSidebarInitialized = true;

    const closeSidebar = () => {
        sidebar.classList.remove('open');
        overlay.classList.add('hidden');
        updateBurgerIcon(false);
        sessionStorage.setItem(STORAGE_KEY, 'false');
    };
    const openSidebar = () => {
        sidebar.classList.add('open');
        overlay.classList.remove('hidden');
        updateBurgerIcon(true);
        sessionStorage.setItem(STORAGE_KEY, 'true');
    };
    function updateBurgerIcon(isOpen) {
        const btn = document.getElementById('mobileNavMenuBtn') || document.getElementById('mobile-sidebar-toggle');
        if (!btn) return;
        btn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
        const menuSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
        const closeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
        btn.innerHTML = isOpen ? closeSvg : menuSvg;
    }
    updateBurgerIcon(sidebar.classList.contains('open'));
    const sidebarToggleHandler = () => {
        const willOpen = !sidebar.classList.contains('open');
        if (willOpen) {
            openSidebar();
        } else {
            closeSidebar();
        }
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            setTimeout(() => window.lucide.createIcons(), 0);
        }
    };
    let toggle = document.getElementById('mobileNavMenuBtn') || document.getElementById('mobile-sidebar-toggle');
    if (toggle && !toggle._eelSidebarWired) {
        toggle._eelSidebarWired = true;
        toggle.addEventListener('click', sidebarToggleHandler);
        updateBurgerIcon(sidebar.classList.contains('open'));
    } else if (!document.getElementById('mobileNavMenuBtn') && !document.getElementById('mobile-sidebar-toggle')) {
        toggle = document.createElement('button');
        toggle.id = 'mobile-sidebar-toggle';
        toggle.type = 'button';
        toggle.className = 'mobile-sidebar-toggle';
        toggle.setAttribute('aria-label', 'Open sidebar');
        toggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
        toggle._eelSidebarWired = true;
        toggle.addEventListener('click', sidebarToggleHandler);
        document.body.appendChild(toggle);
    }

    // On phone/tablet: close sidebar when navigating to another page (so it stays closed on load).
    // Keep sidebar state on logout click until user confirms in the dialog.
    const isPhoneOrTablet = () => window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    if (!sidebar._eelCloseOnNavWired) {
        sidebar._eelCloseOnNavWired = true;
        sidebar.addEventListener('click', function (e) {
            if (isPhoneOrTablet()) {
                const link = e.target.closest('a[href]');
                if (link) {
                    const href = (link.getAttribute('href') || '').trim();
                    if (href && href !== '#' && !href.startsWith('javascript:')) {
                        closeSidebar();
                    }
                }
            }
        });
    }
    if (!overlay._eelCloseWired) {
        overlay._eelCloseWired = true;
        overlay.addEventListener('click', closeSidebar);
    }

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

async function confirmLogout() {
    const hasSwal = typeof Swal !== 'undefined' && Swal && typeof Swal.fire === 'function';
    if (hasSwal) {
        const result = await Swal.fire({
            icon: 'question',
            title: 'Log out?',
            text: 'Are you sure you want to log out?',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
            confirmButtonColor: '#8b5cf6',
        });
        return !!result.isConfirmed;
    }
    return window.confirm('Are you sure you want to log out?');
}

async function handleLogoutWithConfirm() {
    const ok = await confirmLogout();
    if (!ok) return;
    if (typeof logout === 'function') {
        await logout();
        return;
    }
    try {
        localStorage.removeItem('eel_user');
        localStorage.removeItem('eel_avatar_url');
    } catch (_) {}
    window.location.replace('login.html');
}

function getCurrentPageId() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().split('?')[0].replace('.html', '');

    const pageMap = {
        'teacher-dashboard': 'teacher-dashboard',
        'lessons': 'lessons',
        'reading-lessons': 'reading-lessons',
        'pronunciation-lessons': 'pronunciation-lessons',
        'exam-generator': 'exam-generator',
        'recitation': 'recitation',
        'student-progress': 'student-progress',
        'my-progress': 'my-progress',
        'deleted-classes': 'deleted-classes',
        'deleted-ai-quizzes': 'deleted-ai-quizzes',
        'settings': 'settings',
        'classes': 'classes'
    };
    
    return pageMap[filename] || filename || 'dashboard';
}

// Helper function to validate user access to page
function validatePageAccess(user, pageId) {
    const teacherPages = [
        'classes', 'teacher-dashboard',
        'lessons', 'reading-lessons', 'pronunciation-lessons', 
        'exam-generator', 'recitation',
        'student-progress', 'settings', 'deleted-classes', 'deleted-ai-quizzes'
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
        // Strip class_id from URL and store in localStorage (keep URLs clean)
        const params = new URLSearchParams(window.location.search);
        if (params.has('class_id')) {
            const classId = params.get('class_id');
            if (classId) localStorage.setItem('eel_selected_class_id', classId);
            params.delete('class_id');
            const newSearch = params.toString();
            const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
            window.history.replaceState({}, document.title, newUrl);
        }

        // Check authentication
        if (!isAuthenticated()) {
            window.location.replace('login.html');
            return;
        }

        const user = getCurrentUser();
        if (!user) {
            window.location.replace('login.html');
            return;
        }

        const currentPageId = getCurrentPageId();
        
        // Validate user has access to this page
        if (!validatePageAccess(user, currentPageId)) {
            // Redirect to appropriate dashboard
            window.location.href = user.role === 'teacher' ? 'teacher-dashboard.html' : 'dashboard.html';
            return;
        }

        // Setup sidebar
        setupSidebar(user, currentPageId);
        ensureMobileSidebarControls();
        setupHeaderHideWhenModalOpen();
        setupSharedClassNotifications(user, currentPageId);
        // Theme toggle is now the top-right corner button (js/theme.js)

        resolve(user);
    });
}

const NAV_NOTIF_ITEMS_KEY = "eel_lessons_class_notifications_v1";
const NAV_NOTIF_STATE_KEY = "eel_lessons_class_notifications_state_v1";
const NAV_NOTIF_USER_KEY = "eel_notif_user_id_v1";
let __navNotifPollHandle = null;
const NAV_USER_INFO_CACHE = {};

function getNavNotifUserId() {
    try {
        const u = localStorage.getItem("eel_user");
        const parsed = u ? JSON.parse(u) : null;
        return parsed?.user_id != null ? String(parsed.user_id) : "";
    } catch { return ""; }
}

function ensureNavNotifUserScoped() {
    const current = getNavNotifUserId();
    const stored = localStorage.getItem(NAV_NOTIF_USER_KEY) || "";
    if (current && stored !== current) {
        try {
            localStorage.removeItem(NAV_NOTIF_ITEMS_KEY);
            localStorage.removeItem(NAV_NOTIF_STATE_KEY);
            localStorage.setItem(NAV_NOTIF_USER_KEY, current);
        } catch {}
    }
}

function readNavNotifStore(key) {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function writeNavNotifStore(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value || {}));
    } catch {}
}

function getNavClassContext() {
    let selectedClass = null;
    try {
        selectedClass = JSON.parse(localStorage.getItem("eel_selected_class") || "null");
    } catch {
        selectedClass = null;
    }
    const classId = localStorage.getItem("eel_selected_class_id") || selectedClass?.id || selectedClass?.class_id || "";
    const className = selectedClass?.name ? String(selectedClass.name) : "this class";
    const subjectId = selectedClass?.subject_id != null ? Number(selectedClass.subject_id) : null;
    return { classId: String(classId || ""), className, subjectId };
}

function getNavNotifItems(classId) {
    if (!classId) return [];
    const all = readNavNotifStore(NAV_NOTIF_ITEMS_KEY);
    return Array.isArray(all[classId]) ? all[classId] : [];
}

function setNavNotifItems(classId, items) {
    if (!classId) return;
    const all = readNavNotifStore(NAV_NOTIF_ITEMS_KEY);
    all[classId] = Array.isArray(items) ? items.slice(0, 80) : [];
    writeNavNotifStore(NAV_NOTIF_ITEMS_KEY, all);
}

function markNavNotificationItemRead(classId, itemId) {
    if (!classId || !itemId) return;
    const items = getNavNotifItems(classId).map((item) =>
        String(item.id) === String(itemId) ? { ...item, read: true } : item
    );
    setNavNotifItems(classId, items);
}

function deleteNavNotificationItem(classId, itemId) {
    if (!classId || !itemId) return;
    const items = getNavNotifItems(classId).filter((item) => String(item.id) !== String(itemId));
    setNavNotifItems(classId, items);
}

function getNavNotifState(classId) {
    ensureNavNotifUserScoped();
    if (!classId) return { knownStudentIds: [], seenOpenQuizIds: [], seenClosingQuizIds: [], seenClosedQuizIds: [], firstSeenAt: null };
    const all = readNavNotifStore(NAV_NOTIF_STATE_KEY);
    const s = all[classId] || {};
    return {
        knownStudentIds: Array.isArray(s.knownStudentIds) ? s.knownStudentIds.map((v) => String(v)) : [],
        seenOpenQuizIds: Array.isArray(s.seenOpenQuizIds) ? s.seenOpenQuizIds.map((v) => String(v)) : [],
        seenClosingQuizIds: Array.isArray(s.seenClosingQuizIds) ? s.seenClosingQuizIds.map((v) => String(v)) : [],
        seenClosedQuizIds: Array.isArray(s.seenClosedQuizIds) ? s.seenClosedQuizIds.map((v) => String(v)) : [],
        firstSeenAt: s.firstSeenAt != null ? Number(s.firstSeenAt) : null
    };
}

function setNavNotifState(classId, stateValue) {
    if (!classId) return;
    const all = readNavNotifStore(NAV_NOTIF_STATE_KEY);
    all[classId] = {
        knownStudentIds: Array.isArray(stateValue?.knownStudentIds) ? stateValue.knownStudentIds.map((v) => String(v)) : [],
        seenOpenQuizIds: Array.isArray(stateValue?.seenOpenQuizIds) ? stateValue.seenOpenQuizIds.map((v) => String(v)) : [],
        seenClosingQuizIds: Array.isArray(stateValue?.seenClosingQuizIds) ? stateValue.seenClosingQuizIds.map((v) => String(v)) : [],
        seenClosedQuizIds: Array.isArray(stateValue?.seenClosedQuizIds) ? stateValue.seenClosedQuizIds.map((v) => String(v)) : [],
        firstSeenAt: stateValue?.firstSeenAt != null ? Number(stateValue.firstSeenAt) : null
    };
    writeNavNotifStore(NAV_NOTIF_STATE_KEY, all);
}

function buildNavNotificationUrl(type, classId) {
    const encodedClassId = encodeURIComponent(String(classId || ""));
    if (type === "quiz-open") return `lessons.html?class_id=${encodedClassId}&view=quizzes`;
    if (type === "enroll") return `student-progress.html?class_id=${encodedClassId}`;
    return "";
}

function resolveNavNotificationTarget(item, classId) {
    if (item && item.targetUrl) return String(item.targetUrl);
    const key = String(item?.eventKey || "");
    if (key.startsWith("quiz-open:")) return buildNavNotificationUrl("quiz-open", classId);
    if (key.startsWith("quiz-closing:")) return buildNavNotificationUrl("quiz-open", classId);
    if (key.startsWith("quiz-closed:")) return buildNavNotificationUrl("quiz-open", classId);
    if (key.startsWith("enroll:")) return buildNavNotificationUrl("enroll", classId);
    return "";
}

function getNavNotificationInitials(name) {
    const n = String(name || "").trim();
    if (!n) return "?";
    const parts = n.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

function inferNavActorName(item) {
    const explicit = String(item?.actor_name || "").trim();
    if (explicit) return explicit;
    const message = String(item?.message || "").trim();
    if (!message) return "";
    const enrollMatch = message.match(/^(.+?)\s+(requested to join|enrolled in)\b/i);
    if (enrollMatch && enrollMatch[1]) return String(enrollMatch[1]).trim();
    if (/^Quiz is (now open|closing soon|closed):/i.test(message)) return "Teacher";
    return "";
}

function getNavNotificationAvatarHtml(item) {
    const name = inferNavActorName(item);
    const avatarUrl = String(item?.actor_avatar_url || "").trim();
    if (avatarUrl) {
        return `<img class="mobile-nav-notification-avatar-img" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name || "Profile")}" />`;
    }
    return `<span class="mobile-nav-notification-avatar-initials" aria-hidden="true">${escapeHtml(getNavNotificationInitials(name || "Teacher"))}</span>`;
}

async function fetchNavUserName(userId) {
    const info = await fetchNavUserInfo(userId);
    return info?.name || "";
}

async function fetchNavUserInfo(userId) {
    const key = String(userId || "").trim();
    if (!key) return { name: "", avatarUrl: "" };
    if (NAV_USER_INFO_CACHE[key]) return NAV_USER_INFO_CACHE[key];
    try {
        const res = await fetch(`${window.API_BASE || ""}/api/users/me?user_id=${encodeURIComponent(key)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.user) {
            const u = data.user;
            const name = `${u.fname || ""} ${u.lname || ""}`.trim();
            const avatarUrl = String(u.avatar_url || "").trim();
            NAV_USER_INFO_CACHE[key] = { name, avatarUrl };
            return NAV_USER_INFO_CACHE[key];
        }
    } catch {}
    NAV_USER_INFO_CACHE[key] = { name: "", avatarUrl: "" };
    return NAV_USER_INFO_CACHE[key];
}

async function backfillNavQuizOpenActors(classId, quizList, role, user) {
    const items = getNavNotifItems(classId);
    if (!items.length) return;
    const ownerByQuizId = new Map(
        (Array.isArray(quizList) ? quizList : [])
            .map((q) => [String(q?.quiz_id ?? ""), q?.user_id != null ? String(q.user_id) : ""])
            .filter(([id]) => !!id)
    );
    let changed = false;
    for (const item of items) {
        const key = String(item?.eventKey || "");
        if (!(key.startsWith("quiz-open:") || key.startsWith("quiz-closing:") || key.startsWith("quiz-closed:"))) continue;
        const needsActor = !String(item.actor_name || "").trim() || String(item.actor_name).trim() === "Teacher";
        if (!needsActor) continue;
        const quizId = key.split(":")[1] || "";
        if (!quizId) continue;
        if (role === "teacher") {
            const myName = `${user?.fname || ""} ${user?.lname || ""}`.trim();
            if (myName) {
                item.actor_name = myName;
                item.actor_avatar_url = localStorage.getItem("eel_avatar_url") || item.actor_avatar_url || "";
                changed = true;
            }
            continue;
        }
        const ownerId = ownerByQuizId.get(quizId);
        if (!ownerId) continue;
        const teacherInfo = await fetchNavUserInfo(ownerId);
        if (teacherInfo?.name) {
            item.actor_name = teacherInfo.name;
            item.actor_avatar_url = teacherInfo?.avatarUrl || "";
            changed = true;
        }
    }
    if (changed) setNavNotifItems(classId, items);
}

const SHARED_VOICE_NAMES = [
    'Google US English',
    'Microsoft Zira',
    'Microsoft Aria',
    'Microsoft Jenny',
    'Samantha',
    'Karen',
    'Victoria',
    'Google UK English Female',
    'Microsoft Susan',
    'Moira',
    'Tessa'
];

let _cachedSharedVoice = null;

function getSharedPronunciationVoice() {
    if (_cachedSharedVoice) return _cachedSharedVoice;
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    for (const name of SHARED_VOICE_NAMES) {
        const v = voices.find((x) => x.name && x.name.includes(name));
        if (v) {
            _cachedSharedVoice = v;
            return v;
        }
    }
    const enUs = voices.filter((v) => v.lang && (v.lang.startsWith('en-US') || v.lang === 'en-US'));
    const female = enUs.find((v) => v.name && /female|zira|aria|samantha|karen|victoria|susan|jenny|moira|tessa/i.test(v.name));
    if (female) {
        _cachedSharedVoice = female;
        return female;
    }
    if (enUs.length > 0) {
        _cachedSharedVoice = enUs[0];
        return enUs[0];
    }
    return null;
}

function ensureSharedVoicesLoaded(cb) {
    if (!window.speechSynthesis) {
        if (cb) cb();
        return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        if (cb) cb();
        return;
    }
    window.speechSynthesis.onvoiceschanged = function () {
        window.speechSynthesis.onvoiceschanged = null;
        if (cb) cb();
    };
}

function speakVocabularyWord(word) {
    if (!word) return;
    
    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported in this browser');
        return;
    }

    function doSpeak() {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Create new speech utterance
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 1.05; // Matches pronunciation-lessons voice
        utterance.pitch = 1.75; // Matches pronunciation-lessons voice
        utterance.volume = 1;

        const voice = getSharedPronunciationVoice();
        if (voice) utterance.voice = voice;

        // Speak the word
        window.speechSynthesis.speak(utterance);
    }

    ensureSharedVoicesLoaded(doSpeak);
}

function renderNavVocabState(html) {
    const resultEl = document.getElementById("mobileNavVocabResult");
    if (!resultEl) return;
    resultEl.innerHTML = html;
}

function clearNavVocabSearch() {
    const input = document.getElementById("mobileNavVocabInput");
    const result = document.getElementById("mobileNavVocabResult");
    if (input) input.value = "";
    if (result) result.innerHTML = `<p class="mobile-nav-vocab-empty">Type a word to search its meaning.</p>`;
}

async function searchSharedVocabulary(term) {
    const q = String(term || "").trim().toLowerCase();
    if (!q) {
        renderNavVocabState("<p class=\"mobile-nav-vocab-empty\">Type a word to search its meaning.</p>");
        return;
    }
    renderNavVocabState("<p class=\"mobile-nav-vocab-empty\">Searching...</p>");
    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("Word not found");
        const data = await res.json();
        const entry = Array.isArray(data) ? data[0] : null;
        if (!entry) throw new Error("No entry");
        const phonetic = entry.phonetic || (Array.isArray(entry.phonetics) ? (entry.phonetics.find((p) => p && p.text)?.text || "") : "");
        const meanings = Array.isArray(entry.meanings) ? entry.meanings.slice(0, 4) : [];
        if (meanings.length === 0) throw new Error("No meanings");
        const meaningsHtml = meanings.map((m) => {
            const defs = Array.isArray(m.definitions) ? m.definitions.slice(0, 2) : [];
            const top = defs[0] || {};
            return `<div class="mobile-nav-vocab-entry">
                <div class="mobile-nav-vocab-pos">${escapeHtml(m.partOfSpeech || "meaning")}</div>
                <p class="mobile-nav-vocab-def">${escapeHtml(top.definition || "No definition available.")}</p>
                ${top.example ? `<p class="mobile-nav-vocab-example">"${escapeHtml(top.example)}"</p>` : ""}
            </div>`;
        }).join("");
        renderNavVocabState(
            `<div class="mobile-nav-vocab-header">` +
                `<div class="mobile-nav-vocab-word">${escapeHtml(entry.word || q)}</div>` +
                `<button type="button" class="mobile-nav-vocab-speak-btn" onclick="speakVocabularyWord('${escapeHtml(entry.word || q)}')" aria-label="Pronounce word">` +
                    `<i data-lucide="volume-2" class="size-4"></i>` +
                `</button>` +
            `</div>` +
            (phonetic ? `<div class="mobile-nav-vocab-phonetic">${escapeHtml(phonetic)}</div>` : "") +
            meaningsHtml
        );
        
        // Initialize Lucide icons for the speaker button
        if (typeof lucide !== "undefined" && lucide.createIcons) {
            setTimeout(() => lucide.createIcons(), 0);
        }
    } catch {
        renderNavVocabState("<p class=\"mobile-nav-vocab-empty\">No result found. Try another word or use Oxford/Cambridge links.</p>");
    }
}

function formatNavNotifTime(ts) {
    if (!ts) return "";
    try {
        const d = new Date(ts);
        const diff = Date.now() - d.getTime();
        if (diff < 60 * 1000) return "just now";
        const mins = Math.floor(diff / (60 * 1000));
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return d.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
}

function pushNavNotification(classId, message, eventKey, targetUrl, actorName, actorAvatarUrl, eventTs) {
    if (!classId || !message || !eventKey) return;
    const items = getNavNotifItems(classId);
    if (items.some((item) => item.eventKey === eventKey)) return;
    const ts = eventTs ? (typeof eventTs === "number" ? new Date(eventTs).toISOString() : String(eventTs)) : new Date().toISOString();
    const addedAt = Date.now();
    items.push({
        id: `${addedAt}-${Math.random().toString(16).slice(2)}`,
        message: String(message),
        eventKey: String(eventKey),
        targetUrl: targetUrl ? String(targetUrl) : "",
        actor_name: actorName ? String(actorName) : "",
        actor_avatar_url: actorAvatarUrl ? String(actorAvatarUrl) : "",
        ts,
        addedAt,
        read: false
    });
    setNavNotifItems(classId, items);
}

function markNavNotificationsRead(classId) {
    if (!classId) return;
    const items = getNavNotifItems(classId).map((item) => ({ ...item, read: true }));
    setNavNotifItems(classId, items);
}

function getNavQuizStatuses(quizzes) {
    return (Array.isArray(quizzes) ? quizzes : [])
        .map((quiz) => {
            const id = quiz?.quiz_id != null ? String(quiz.quiz_id) : "";
            if (!id) return null;
            const start = quiz.unlock_time ? new Date(String(quiz.unlock_time).replace(" ", "T")).getTime() : NaN;
            const end = quiz.lock_time ? new Date(String(quiz.lock_time).replace(" ", "T")).getTime() : NaN;
            return {
                id,
                title: quiz.title ? String(quiz.title) : "Quiz",
                opened_by_user_id: quiz.user_id != null ? String(quiz.user_id) : "",
                start_ms: start,
                end_ms: end
            };
        })
        .filter(Boolean);
}

async function fetchNavQuizList(user, classInfo) {
    if (!classInfo.classId) return [];
    const role = String(user?.role || "").toLowerCase();
    if (Number.isFinite(classInfo.subjectId)) {
        const res = await fetch(`${window.API_BASE || ""}/api/teacher/reading-quizzes?subject_id=${encodeURIComponent(classInfo.subjectId)}&class_id=${encodeURIComponent(classInfo.classId)}`);
        if (!res.ok) throw new Error("Failed to fetch quizzes");
        return await res.json();
    }
    if (role === "teacher") {
        const params = new URLSearchParams({ user_id: String(user.user_id), class_id: classInfo.classId });
        const res = await fetch(`${window.API_BASE || ""}/api/teacher/reading-quizzes?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch teacher quizzes");
        return await res.json();
    }
    return [];
}

function ensureSharedNotificationUI() {
    const header = document.getElementById("mobileNavHeader") || document.querySelector(".mobile-nav-header");
    if (!header) return null;
    let themeBtn = document.getElementById("eel-theme-header-toggle");
    if (!themeBtn) return null;

    let rightWrap = header.querySelector(".mobile-nav-actions-right");
    if (!rightWrap) {
        rightWrap = document.createElement("div");
        rightWrap.className = "mobile-nav-actions-right";
        header.appendChild(rightWrap);
        rightWrap.appendChild(themeBtn);
    } else if (!rightWrap.contains(themeBtn)) {
        rightWrap.appendChild(themeBtn);
    }

    let notifBtn = document.getElementById("mobileNavNotificationBtn");
    let vocabBtn = document.getElementById("mobileNavVocabBtn");
    if (!vocabBtn) {
        vocabBtn = document.createElement("button");
        vocabBtn.type = "button";
        vocabBtn.className = "mobile-nav-btn mobile-nav-vocab-btn";
        vocabBtn.id = "mobileNavVocabBtn";
        vocabBtn.setAttribute("aria-label", "Open vocabulary search");
        vocabBtn.setAttribute("aria-expanded", "false");
        vocabBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>`;
        rightWrap.insertBefore(vocabBtn, themeBtn);
    }

    if (!notifBtn) {
        notifBtn = document.createElement("button");
        notifBtn.type = "button";
        notifBtn.className = "mobile-nav-btn mobile-nav-notification-btn";
        notifBtn.id = "mobileNavNotificationBtn";
        notifBtn.setAttribute("aria-label", "Open notifications");
        notifBtn.setAttribute("aria-expanded", "false");
        notifBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"></path><path d="M9 17a3 3 0 0 0 6 0"></path></svg><span id="mobileNavNotificationBadge" class="mobile-nav-notification-badge hidden" aria-hidden="true">0</span>`;
        rightWrap.insertBefore(notifBtn, themeBtn);
    }

    let vocabPanel = document.getElementById("mobileNavVocabPanel");
    if (!vocabPanel) {
        vocabPanel = document.createElement("div");
        vocabPanel.id = "mobileNavVocabPanel";
        vocabPanel.className = "mobile-nav-vocab-panel hidden";
        vocabPanel.setAttribute("role", "region");
        vocabPanel.setAttribute("aria-label", "Vocabulary search");
        vocabPanel.innerHTML = `
            <div class="mobile-nav-vocab-panel__header">
                <strong>Vocabulary</strong>
            </div>
            <form id="mobileNavVocabForm" class="mobile-nav-vocab-form">
                <div class="mobile-nav-vocab-input-wrap">
                    <input id="mobileNavVocabInput" type="search" class="mobile-nav-vocab-input" placeholder="Search a word..." autocomplete="off" />
                    <button type="submit" class="mobile-nav-vocab-submit">Search</button>
                </div>
                <p class="mobile-nav-vocab-ref">Reference links: <a href="https://www.oxfordlearnersdictionaries.com/" target="_blank" rel="noopener noreferrer">Oxford</a> · <a href="https://dictionary.cambridge.org/" target="_blank" rel="noopener noreferrer">Cambridge</a></p>
            </form>
            <div id="mobileNavVocabResult" class="mobile-nav-vocab-result">
                <p class="mobile-nav-vocab-empty">Type a word to search its meaning.</p>
            </div>
        `;
        document.body.appendChild(vocabPanel);
    }

    let panel = document.getElementById("mobileNavNotificationPanel");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "mobileNavNotificationPanel";
        panel.className = "mobile-nav-notification-panel hidden";
        panel.setAttribute("role", "region");
        panel.setAttribute("aria-label", "Classroom notifications");
        panel.innerHTML = `
            <div class="mobile-nav-notification-panel__header">
                <strong id="mobileNavNotificationTitle">Notifications</strong>
                <button type="button" id="mobileNavNotificationMarkAll" class="mobile-nav-notification-mark-read">Mark all read</button>
            </div>
            <div id="mobileNavNotificationList" class="mobile-nav-notification-list">
                <p class="mobile-nav-notification-empty">No notifications yet for this classroom.</p>
            </div>
        `;
        document.body.appendChild(panel);
    }
    return { notifBtn, panel, vocabBtn, vocabPanel };
}

function renderSharedNotifications(classId) {
    const listEl = document.getElementById("mobileNavNotificationList");
    const badgeEl = document.getElementById("mobileNavNotificationBadge");
    const titleEl = document.getElementById("mobileNavNotificationTitle");
    const btn = document.getElementById("mobileNavNotificationBtn");
    if (!listEl || !badgeEl || !classId) return;
    const state = getNavNotifState(classId);
    let firstSeenAt = state.firstSeenAt;
    if (firstSeenAt == null) {
        firstSeenAt = Date.now();
        setNavNotifState(classId, { ...state, firstSeenAt });
    }
    const allItems = getNavNotifItems(classId);
    const items = allItems.filter((item) => {
        const addedAt = item.addedAt != null ? Number(item.addedAt) : new Date(item.ts || 0).getTime();
        return (addedAt || 0) >= firstSeenAt;
    });
    const unread = items.filter((item) => !item.read).length;
    if (unread > 0) {
        badgeEl.classList.remove("hidden");
        badgeEl.textContent = unread > 9 ? "9+" : String(unread);
    } else {
        badgeEl.classList.add("hidden");
        badgeEl.textContent = "0";
    }
    if (titleEl) titleEl.textContent = unread > 0 ? `Notifications (${unread})` : "Notifications";
    if (btn) btn.setAttribute("aria-label", unread > 0 ? `Open notifications (${unread} unread)` : "Open notifications");

    if (items.length === 0) {
        listEl.innerHTML = "<p class=\"mobile-nav-notification-empty\">No notifications yet for this classroom.</p>";
        listEl.style.maxHeight = "none";
        listEl.style.overflowY = "hidden";
        return;
    }

    // Sort by actual event time (ts) descending; fallback to addedAt.
    const sortedItems = items.slice().sort((a, b) => {
        const aTs = a?.ts ? new Date(a.ts).getTime() : NaN;
        const bTs = b?.ts ? new Date(b.ts).getTime() : NaN;
        const aKey = Number.isFinite(aTs) ? aTs : (a?.addedAt != null ? Number(a.addedAt) : 0);
        const bKey = Number.isFinite(bTs) ? bTs : (b?.addedAt != null ? Number(b.addedAt) : 0);
        return bKey - aKey;
    });

    listEl.innerHTML = sortedItems.map((item) => {
        const unreadClass = item.read ? "" : " mobile-nav-notification-item--unread";
        const targetUrl = resolveNavNotificationTarget(item, classId);
        const targetAttr = targetUrl ? ` data-target-url="${escapeHtml(targetUrl)}"` : "";
        const itemIdAttr = ` data-item-id="${escapeHtml(String(item.id || ""))}"`;
        return `<div class="mobile-nav-notification-item${unreadClass}"${itemIdAttr}>
            <button type="button" class="mobile-nav-notification-main"${targetAttr}>
                <span class="mobile-nav-notification-avatar">${getNavNotificationAvatarHtml(item)}</span>
                <span class="mobile-nav-notification-content">
                    <span class="mobile-nav-notification-item-title">${escapeHtml(item.message || "Notification")}</span>
                    <span class="mobile-nav-notification-item-meta">${escapeHtml(formatNavNotifTime(item.ts))}</span>
                </span>
            </button>
            <button type="button" class="mobile-nav-notification-more" aria-label="More actions">⋮</button>
            <div class="mobile-nav-notification-actions hidden">
                <button type="button" class="mobile-nav-notification-action mobile-nav-notification-action--read">Mark as read</button>
                <button type="button" class="mobile-nav-notification-action mobile-nav-notification-action--delete">Archive</button>
            </div>
        </div>`;
    }).join("");

    const rows = Array.from(listEl.querySelectorAll(".mobile-nav-notification-item"));
    if (rows.length > 5) {
        const h = rows.slice(0, 5).reduce((sum, row) => sum + row.offsetHeight, 0);
        listEl.style.maxHeight = `${h}px`;
        listEl.style.overflowY = "auto";
        listEl.style.overflowX = "hidden";
    } else {
        listEl.style.maxHeight = "none";
        listEl.style.overflow = "visible";
    }
}

async function pollSharedClassNotifications(user) {
    const role = String(user?.role || "").toLowerCase();
    if (!["teacher", "student"].includes(role)) return;
    const classInfo = getNavClassContext();
    if (!classInfo.classId) return;
    const state = getNavNotifState(classInfo.classId);
    let next = { ...state };
    if (next.firstSeenAt == null) {
        next.firstSeenAt = Date.now();
        setNavNotifState(classInfo.classId, next);
    }

    const quizzes = await fetchNavQuizList(user, classInfo);
    await backfillNavQuizOpenActors(classInfo.classId, quizzes, role, user);
    const quizStatuses = getNavQuizStatuses(quizzes);
    const now = Date.now();
    const THIRTY_MIN_MS = 30 * 60 * 1000;
    const openQuizzes = quizStatuses.filter((q) => Number.isFinite(q.start_ms) && Number.isFinite(q.end_ms) && now >= q.start_ms && now <= q.end_ms);
    const closingQuizzes = openQuizzes.filter((q) => q.end_ms - now <= THIRTY_MIN_MS);
    const closedQuizzes = quizStatuses.filter((q) => Number.isFinite(q.end_ms) && now > q.end_ms);
    const seen = new Set((next.seenOpenQuizIds || []).map((v) => String(v)));
    const seenClosing = new Set((next.seenClosingQuizIds || []).map((v) => String(v)));
    const seenClosed = new Set((next.seenClosedQuizIds || []).map((v) => String(v)));
    for (const quiz of openQuizzes) {
        if (!seen.has(quiz.id)) {
            let actorName = "";
            let actorAvatarUrl = "";
            if (role === "teacher") {
                actorName = `${user?.fname || ""} ${user?.lname || ""}`.trim() || "You";
                actorAvatarUrl = localStorage.getItem("eel_avatar_url") || "";
            } else if (quiz.opened_by_user_id) {
                const info = await fetchNavUserInfo(quiz.opened_by_user_id);
                actorName = info?.name || "";
                actorAvatarUrl = info?.avatarUrl || "";
            }
            pushNavNotification(
                classInfo.classId,
                `Quiz is now open: ${quiz.title}`,
                `quiz-open:${quiz.id}`,
                buildNavNotificationUrl("quiz-open", classInfo.classId),
                actorName || "Teacher",
                actorAvatarUrl,
                Number.isFinite(quiz.start_ms) ? quiz.start_ms : undefined
            );
            seen.add(quiz.id);
        }
    }
    for (const quiz of closingQuizzes) {
        if (!seenClosing.has(quiz.id)) {
            let actorName = "";
            let actorAvatarUrl = "";
            if (role === "teacher") {
                actorName = `${user?.fname || ""} ${user?.lname || ""}`.trim() || "You";
                actorAvatarUrl = localStorage.getItem("eel_avatar_url") || "";
            } else if (quiz.opened_by_user_id) {
                const info = await fetchNavUserInfo(quiz.opened_by_user_id);
                actorName = info?.name || "";
                actorAvatarUrl = info?.avatarUrl || "";
            }
            pushNavNotification(
                classInfo.classId,
                `Quiz is closing soon: ${quiz.title}`,
                `quiz-closing:${quiz.id}`,
                buildNavNotificationUrl("quiz-open", classInfo.classId),
                actorName || "Teacher",
                actorAvatarUrl,
                Number.isFinite(quiz.start_ms) ? quiz.start_ms : undefined
            );
            seenClosing.add(quiz.id);
        }
    }
    for (const quiz of closedQuizzes) {
        if (!seenClosed.has(quiz.id)) {
            let actorName = "";
            let actorAvatarUrl = "";
            if (role === "teacher") {
                actorName = `${user?.fname || ""} ${user?.lname || ""}`.trim() || "You";
                actorAvatarUrl = localStorage.getItem("eel_avatar_url") || "";
            } else if (quiz.opened_by_user_id) {
                const info = await fetchNavUserInfo(quiz.opened_by_user_id);
                actorName = info?.name || "";
                actorAvatarUrl = info?.avatarUrl || "";
            }
            pushNavNotification(
                classInfo.classId,
                `Quiz is closed: ${quiz.title}`,
                `quiz-closed:${quiz.id}`,
                buildNavNotificationUrl("quiz-open", classInfo.classId),
                actorName || "Teacher",
                actorAvatarUrl,
                Number.isFinite(quiz.end_ms) ? quiz.end_ms : undefined
            );
            seenClosed.add(quiz.id);
        }
    }
    next.seenOpenQuizIds = Array.from(new Set([...Array.from(seen), ...openQuizzes.map((q) => q.id)])).slice(-300);
    next.seenClosingQuizIds = Array.from(new Set([...Array.from(seenClosing), ...closingQuizzes.map((q) => q.id)])).slice(-300);
    next.seenClosedQuizIds = Array.from(new Set([...Array.from(seenClosed), ...closedQuizzes.map((q) => q.id)])).slice(-300);

    if (role === "teacher") {
        try {
            const res = await fetch(`${window.API_BASE || ""}/api/class/${encodeURIComponent(classInfo.classId)}/students`);
            if (res.ok) {
                const students = await res.json();
                const list = Array.isArray(students) ? students : [];
                const enrollIds = list.map((s) => String(s?.id || "")).filter(Boolean).sort();
                const known = new Set(Array.isArray(next.knownStudentIds) ? next.knownStudentIds : []);
                if (known.size > 0) {
                    list.filter((s) => {
                        const id = String(s?.id || "");
                        return id && !known.has(id);
                    }).forEach((s) => {
                        const enrollId = String(s.id);
                        const fullName = `${s?.student_fname || ""} ${s?.student_lname || ""}`.trim() || "A student";
                        const status = String(s?.status || "").toLowerCase();
                        const msg = status === "pending"
                            ? `${fullName} requested to join ${classInfo.className}.`
                            : `${fullName} enrolled in ${classInfo.className}.`;
                        // joined_at from DB often looks like "YYYY-MM-DD HH:mm:ss" which is not reliably parsed by Date() in all browsers.
                        const enrollTs = s.joined_at
                            ? (typeof s.joined_at === "number"
                                ? s.joined_at
                                : new Date(String(s.joined_at).replace(" ", "T")).getTime())
                            : undefined;
                        pushNavNotification(
                            classInfo.classId,
                            msg,
                            `enroll:${enrollId}:${status || "unknown"}`,
                            buildNavNotificationUrl("enroll", classInfo.classId),
                            fullName,
                            undefined,
                            Number.isFinite(enrollTs) ? enrollTs : undefined
                        );
                    });
                }
                next.knownStudentIds = enrollIds.slice(-600);
            }
        } catch {}
    }

    setNavNotifState(classInfo.classId, next);
    renderSharedNotifications(classInfo.classId);
}

function setupSharedClassNotifications(user, currentPageId) {
    const enabledPages = new Set([
        "dashboard",
        "lessons",
        "reading-lessons",
        "pronunciation-lessons",
        "recitation",
        "exam-generator",
        "student-progress",
        "my-progress",
        "deleted-archive"
    ]);
    if (!enabledPages.has(currentPageId)) return;

    const ui = ensureSharedNotificationUI();
    if (!ui) return;
    const classInfo = getNavClassContext();
    if (classInfo.classId) renderSharedNotifications(classInfo.classId);

    const btn = document.getElementById("mobileNavNotificationBtn");
    const panel = document.getElementById("mobileNavNotificationPanel");
    const vocabBtn = document.getElementById("mobileNavVocabBtn");
    const vocabPanel = document.getElementById("mobileNavVocabPanel");
    const vocabForm = document.getElementById("mobileNavVocabForm");
    const vocabInput = document.getElementById("mobileNavVocabInput");
    const markAll = document.getElementById("mobileNavNotificationMarkAll");
    const listEl = document.getElementById("mobileNavNotificationList");
    if (!btn || !panel || !markAll || !listEl || !vocabBtn || !vocabPanel || !vocabForm || !vocabInput) return;

    if (!btn.__navNotifBound) {
        btn.__navNotifBound = true;
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const classCtx = getNavClassContext();
            const show = panel.classList.contains("hidden");
            panel.classList.toggle("hidden", !show);
            btn.setAttribute("aria-expanded", show ? "true" : "false");
            if (show) {
                vocabPanel.classList.add("hidden");
                vocabBtn.setAttribute("aria-expanded", "false");
                clearNavVocabSearch();
            }
            if (show && classCtx.classId) {
                markNavNotificationsRead(classCtx.classId);
                renderSharedNotifications(classCtx.classId);
            }
        });
    }

    if (!markAll.__navNotifBound) {
        markAll.__navNotifBound = true;
        markAll.addEventListener("click", () => {
            const classCtx = getNavClassContext();
            if (!classCtx.classId) return;
            markNavNotificationsRead(classCtx.classId);
            renderSharedNotifications(classCtx.classId);
        });
    }

    if (!listEl.__navNotifClickBound) {
        listEl.__navNotifClickBound = true;
        listEl.addEventListener("click", async (e) => {
            const row = e.target && e.target.closest ? e.target.closest(".mobile-nav-notification-item") : null;
            if (!row) return;
            const itemId = row.getAttribute("data-item-id");
            const classCtx = getNavClassContext();
            const moreBtn = e.target.closest(".mobile-nav-notification-more");
            const readBtn = e.target.closest(".mobile-nav-notification-action--read");
            const deleteBtn = e.target.closest(".mobile-nav-notification-action--delete");
            const mainBtn = e.target.closest(".mobile-nav-notification-main");

            if (moreBtn) {
                e.stopPropagation();
                const willOpen = !!row.querySelector(".mobile-nav-notification-actions.hidden");
                listEl.querySelectorAll(".mobile-nav-notification-actions").forEach((menu) => menu.classList.add("hidden"));
                listEl.querySelectorAll(".mobile-nav-notification-item--menu-open").forEach((r) => r.classList.remove("mobile-nav-notification-item--menu-open"));
                const menu = row.querySelector(".mobile-nav-notification-actions");
                if (menu && willOpen) {
                    menu.classList.remove("hidden");
                    row.classList.add("mobile-nav-notification-item--menu-open");
                }
                return;
            }
            if (readBtn) {
                e.stopPropagation();
                if (classCtx.classId) {
                    markNavNotificationItemRead(classCtx.classId, itemId);
                    renderSharedNotifications(classCtx.classId);
                }
                return;
            }
            if (deleteBtn) {
                e.stopPropagation();
                if (classCtx.classId) {
                    const hasSwal = typeof Swal !== "undefined" && Swal && typeof Swal.fire === "function";
                    if (hasSwal) {
                        const result = await Swal.fire({
                            title: "Archive notification?",
                            text: "This will remove the notification from your list.",
                            icon: "question",
                            showCancelButton: true,
                            confirmButtonText: "Archive",
                            cancelButtonText: "Cancel",
                            confirmButtonColor: "#dc2626",
                        });
                        if (!result.isConfirmed) return;
                    }
                    deleteNavNotificationItem(classCtx.classId, itemId);
                    renderSharedNotifications(classCtx.classId);
                }
                return;
            }
            if (mainBtn) {
                const url = mainBtn.getAttribute("data-target-url");
                if (classCtx.classId) {
                    markNavNotificationItemRead(classCtx.classId, itemId);
                    renderSharedNotifications(classCtx.classId);
                }
                if (url) window.location.href = url;
            }
        });
    }

    if (!vocabBtn.__navVocabBound) {
        vocabBtn.__navVocabBound = true;
        vocabBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const show = vocabPanel.classList.contains("hidden");
            vocabPanel.classList.toggle("hidden", !show);
            vocabBtn.setAttribute("aria-expanded", show ? "true" : "false");
            if (show) {
                panel.classList.add("hidden");
                btn.setAttribute("aria-expanded", "false");
                vocabInput.focus();
            } else {
                clearNavVocabSearch();
            }
        });
    }

    if (!vocabForm.__navVocabBound) {
        vocabForm.__navVocabBound = true;
        vocabForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await searchSharedVocabulary(vocabInput.value);
        });
    }

    if (!document.body.__navNotifOutsideBound) {
        document.body.__navNotifOutsideBound = true;
        document.addEventListener("click", (e) => {
            const p = document.getElementById("mobileNavNotificationPanel");
            const b = document.getElementById("mobileNavNotificationBtn");
            const vp = document.getElementById("mobileNavVocabPanel");
            const vb = document.getElementById("mobileNavVocabBtn");
            if (p && b && !p.classList.contains("hidden") && !p.contains(e.target) && !b.contains(e.target)) {
                p.classList.add("hidden");
                b.setAttribute("aria-expanded", "false");
            }
            if (vp && vb && !vp.classList.contains("hidden") && !vp.contains(e.target) && !vb.contains(e.target)) {
                vp.classList.add("hidden");
                vb.setAttribute("aria-expanded", "false");
                clearNavVocabSearch();
            }
        });
    }

    pollSharedClassNotifications(user).catch(() => {});
    if (__navNotifPollHandle) clearInterval(__navNotifPollHandle);
    __navNotifPollHandle = setInterval(() => {
        pollSharedClassNotifications(user).catch(() => {});
    }, 30000);
}

// ===================== Hide header when any modal is open (student + teacher) =====================
// Profile popover (avatar dropdown) does not hide the header.
function isModalElement(el) {
    if (!el || !el.classList) return false;
    if (el.id === "sidebar-profile-popover") return false;
    if (el.classList.contains("swal2-container") || el.classList.contains("swal2-popup")) return false;
    if (typeof el.closest === "function" && el.closest(".swal2-container")) return false;
    return (
        el.classList.contains("modal-overlay") ||
        el.classList.contains("modal-quiz-overlay") ||
        el.classList.contains("modal-create-overlay") ||
        el.classList.contains("recitation-picker-overlay") ||
        el.classList.contains("recitation-question-overlay") ||
        el.classList.contains("join-class-modal-overlay") ||
        el.classList.contains("create-class-modal-overlay") ||
        el.getAttribute("role") === "dialog" ||
        el.id === "password-modal" ||
        (el.id && String(el.id).toLowerCase().includes("modal"))
    );
}

function isModalVisible(el) {
    return isModalElement(el) && !el.classList.contains("hidden");
}

function countVisibleModals() {
    const candidates = document.querySelectorAll(
        ".modal-overlay, .modal-quiz-overlay, .modal-create-overlay, " +
        ".recitation-picker-overlay, .recitation-question-overlay, " +
        ".join-class-modal-overlay, .create-class-modal-overlay, " +
        "#password-modal, [role=dialog]"
    );
    return Array.from(candidates).filter((el) => {
        if (el.id === "sidebar-profile-popover") return false;
        if (el.classList && (el.classList.contains("swal2-container") || el.classList.contains("swal2-popup"))) return false;
        if (typeof el.closest === "function" && el.closest(".swal2-container")) return false;
        return !el.classList.contains("hidden");
    }).length;
}

function updateHeaderVisibilityForModals() {
    const header = document.getElementById("mobileNavHeader") || document.querySelector(".mobile-nav-header");
    const openCount = countVisibleModals();
    if (openCount > 0) {
        document.body.classList.add("eel-modal-open");
        if (header) header.classList.add("hidden");
    } else {
        document.body.classList.remove("eel-modal-open");
        if (header) header.classList.remove("hidden");
    }
}

function setupHeaderHideWhenModalOpen() {
    updateHeaderVisibilityForModals();
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === "attributes" && m.attributeName === "class" && isModalElement(m.target)) {
                updateHeaderVisibilityForModals();
                return;
            }
        }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true });
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