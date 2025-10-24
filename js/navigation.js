function setupSidebar(user, currentPage) {
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarWelcome = document.getElementById('sidebar-welcome');
    const sidebarNav = document.getElementById('sidebar-nav');

    // Update header
    sidebarTitle.textContent = 
    user.role === 'teacher' ? 'EEL Teacher' : 
    user.role === 'admin' ? 'Admin' : 
    'EEL Student';
    sidebarTitle.className = 'text-xl font-semibold text-secondary';

    // Welcome message
    sidebarWelcome.textContent = `Welcome, ${user.fname ?? ''} ${user.lname ?? ''}`;

    // Read selected class from localStorage (both roles)
    let selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
    if (selectedClass) {
        const subject = selectedClass.subject
            ? selectedClass.subject
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")
            : "";

        // ✅ Add subject_id mapping
        const subjectMapping = {
            "reading and writing skills": 1,
            "oral communication": 2,
            "creative writing": 3,
            "creative non-fiction": 4,
            "english for academic and professional purposes": 5,
        };

        const subjectKey = subject.toLowerCase();
        const subjectId = subjectMapping[subjectKey] || null;

        // ✅ Update localStorage with subject_id (if not yet present)
        if (!selectedClass.subject_id && subjectId) {
            selectedClass.subject_id = subjectId;
            localStorage.setItem("eel_selected_class", JSON.stringify(selectedClass));
            console.log("✅ Added subject_id to eel_selected_class:", subjectId);
        }

        let classInfoText = `${selectedClass.name} ${selectedClass.section}<br>Subject: ${subject}`;

        // Teacher sees class code
        if (user.role === 'teacher') {
            classInfoText = `${selectedClass.name} ${selectedClass.section}<br>Class Code: ${selectedClass.class_code}<br>Subject: ${subject}`;
        }

        const classInfo = document.createElement("div");
        classInfo.className = "mt-1 text-sm text-gray-500";
        classInfo.id = "sidebar-class-info";
        classInfo.innerHTML = classInfoText;

        // Remove existing duplicate
        const existing = document.getElementById("sidebar-class-info");
        if (existing) existing.remove();
        sidebarWelcome.insertAdjacentElement("afterend", classInfo);
    } else {
        // Remove class info if none exists
        const existing = document.getElementById("sidebar-class-info");
        if (existing) existing.remove();
    }

    const pages = user.role === 'admin' ? [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', url: 'admin-dashboard.html' },
        { id: 'account-verification', label: 'Account Verification', icon: 'check-circle', url: 'account-verification.html' },
        { id: 'settings', label: 'Settings', icon: 'settings', url: 'settings.html' }
    ] : user.role === 'teacher' ? [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', url: 'dashboard.html' },
        { id: 'lessons', label: 'Subject Lessons', icon: 'library', url: 'lessons.html' },
        { id: 'reading-lessons', label: 'Reading Activity', icon: 'book-open', url: 'reading-lessons.html' },
        { id: 'pronunciation-lessons', label: 'Pronunciation Activity', icon: 'mic', url: 'pronunciation-lessons.html' },
        { id: 'recitation', label: 'Recitation', icon: 'brain', url: 'recitation.html' },
        { id: 'exam-generator', label: 'Exam Generator', icon: 'pen-tool', url: 'exam-generator.html' },
        { id: 'student-progress', label: 'Student Progress', icon: 'users', url: 'student-progress.html' },
        { id: 'settings', label: 'Settings', icon: 'settings', url: 'settings.html' }
    ] : [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', url: 'dashboard.html' },
        { id: 'lessons', label: 'Subject Lessons', icon: 'library', url: 'lessons.html' },
        { id: 'reading-lessons', label: 'Reading Activity', icon: 'book-open', url: 'reading-lessons.html' },
        { id: 'pronunciation-lessons', label: 'Pronunciation Activity', icon: 'mic', url: 'pronunciation-lessons.html' },
        { id: 'settings', label: 'Settings', icon: 'settings', url: 'settings.html' }
    ];

    // Build sidebar links
    let classIdParam = selectedClass ? `?class_id=${selectedClass.id}` : '';
    sidebarNav.innerHTML = pages.map(page => `
        <a href="${page.url}${classIdParam}" 
           class="nav-button btn btn-side-bar w-full justify-start gap-3 p-3 rounded-md text-left transition-all flex items-center ${currentPage === page.id ? 'active' : ''}">
            <i data-lucide="${page.icon}" class="size-5"></i>
            ${page.label}
        </a>
    `).join('');
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
    lucide.createIcons({ icons: lucide.icons });

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
        'dashboard': 'dashboard',
        'lessons': 'lessons',
        'reading-lessons': 'reading-lessons',
        'pronunciation-lessons': 'pronunciation-lessons',
        'exam-generator': 'exam-generator',
        'recitation': 'recitation',
        'student-progress': 'student-progress',
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
        'settings'
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
    setTimeout(() => lucide.createIcons({ icons: lucide.icons }), 100);
}