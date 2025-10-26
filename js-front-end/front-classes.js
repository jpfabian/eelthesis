function getCurrentUser() {
    const user = localStorage.getItem("eel_user");
    return user ? JSON.parse(user) : null;
}

async function loadClasses() {
    const user = getCurrentUser();
    if (!user) return;

    let endpoint = "";
    if (user.role === "teacher") {
        endpoint = `/api/classes/${user.user_id}`; // yung mga ginawa nya
    } else {
        endpoint = `/api/student-classes/${user.user_id}`; // yung mga sinalihan nya
    }

    try {
        const res = await fetch(`${endpoint}`);
        const classes = await res.json();

        const container = document.getElementById("classes-container");
        container.innerHTML = "";

        classes.forEach(cls => {
            const div = document.createElement("div");
            div.className = "p-4 border rounded cursor-pointer hover:bg-gray-100";
            div.textContent = `${cls.name} - ${cls.section} (${cls.class_code})`;

            div.addEventListener("click", () => {
                localStorage.setItem("eel_selected_class", JSON.stringify(cls));
                window.location.href = "lessons.html";
            });

            container.appendChild(div);
        });
    } catch (err) {

    }
}

document.addEventListener("DOMContentLoaded", loadClasses);


document.addEventListener('DOMContentLoaded', async function() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Attach logout button
    document.getElementById("logout-btn").addEventListener("click", () => {
        logout();
    });

    // show loading
    document.getElementById('loading-screen').classList.remove('hidden');

    // setup sidebar
    setupSidebar(user, 'classes');

    // setup page title
    document.title = user.role === 'teacher' ? "EEL - Teacher" : "EEL - Student";

    // finish loading
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        // Show grid based on role
        if (user.role === 'teacher') {
            document.getElementById('classes-grid-teacher').classList.remove('hidden');
            loadTeacherClasses();
        } else if (user.role === 'student') {
            document.getElementById('classes-grid-student').classList.remove('hidden');
            loadStudentClasses();
        }

        lucide.createIcons({ icons: lucide.icons });
    }, 500);
});

function setupSidebar(user, currentPage) {
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarWelcome = document.getElementById('sidebar-welcome');
    const sidebarNav = document.getElementById('sidebar-nav');

    if (currentPage === 'classes') {
            if (user.role === 'teacher') {
                sidebarTitle.textContent = 'EEL Teacher';
                sidebarTitle.className = 'text-xl font-semibold text-secondary';
            } else {
                sidebarTitle.textContent = 'EEL Student';
                sidebarTitle.className = 'text-xl font-semibold text-secondary';
            }
            sidebarWelcome.textContent = `Welcome, ${user.fname} ${user.lname}`;

        sidebarNav.innerHTML = `
            <a href="classes.html" 
            class="nav-button btn btn-side-bar w-full justify-start gap-3 p-3 rounded-md text-left transition-all flex items-center bg-sidebar-primary text-sidebar-primary-foreground">
                <i data-lucide="layers" class="size-5"></i>
                Classes
            </a>
        `;
        return;
    }
}

// Get current user first (assuming you have a function like getCurrentUser)
const user = getCurrentUser();

// Show the correct classes grid based on role
if (user && user.role === 'teacher') {
    document.getElementById('classes-grid-teacher').classList.remove('hidden');
} else if (user && user.role === 'student') {
    document.getElementById('classes-grid-student').classList.remove('hidden');
}

function openJoinModal() {
    document.getElementById('join-class-code').value = '';
    document.getElementById('join-class-modal').classList.remove('hidden');
}

function closeJoinModal() {
    document.getElementById('join-class-modal').classList.add('hidden');
}

async function joinClass() {
    const classCode = document.getElementById('join-class-code').value.trim();
    const user = getCurrentUser();

    if (!classCode) return showNotification("Please enter a class code.");

    try {
        const res = await fetch("/api/join-class", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: user.user_id, class_code: classCode })
        });

        const data = await res.json();
        showNotification(data.message, data.success ? "success" : "error");

        if (data.success) {
            closeJoinModal();
            loadStudentClasses(); // ← refresh student classes grid
        }
    } catch (err) {
        showNotification("Server error.");
    }
}

function selectClass(cls) {
    localStorage.setItem("eel_selected_class", JSON.stringify(cls));
    window.location.href = "lessons.html";
}

function openClassModal() {
    // clear inputs every time modal opens
    document.getElementById('class-name').value = "";
    document.getElementById('class-section').value = "";
    document.getElementById('class-subject').value = "";

    document.getElementById('create-class-modal').classList.remove('hidden');
}

function closeClassModal() {
    document.getElementById('create-class-modal').classList.add('hidden');
}

async function saveClass() {
    const name = document.getElementById('class-name').value.trim();
    const section = document.getElementById('class-section').value.trim();
    const subject = document.getElementById('class-subject').value.trim();

    if (!name || !section || !subject) {
        showNotification("Please fill in Class Name, Section, and Subject.");
        return;
    }

    const user = getCurrentUser();
    if (!user || !user.user_id) {
        showNotification("User not logged in properly.");
        return;
    }

    try {
        const response = await fetch("/api/classes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                section,
                subject,
                teacher_id: user.user_id
            })
        });

        const data = await response.json();

        if (data && (data.success || data.insertId)) {
            showNotification(`Class created successfully!`, "success");
            closeClassModal();
            loadTeacherClasses();
        } else {
            showNotification("Error creating class.");
        }
    } catch (err) {
        showNotification("Server error.");
    }
}

async function loadTeacherClasses() {
    const user = getCurrentUser();
    if (!user || user.role !== "teacher") return;

    try {
        const response = await fetch(`/api/classes/${user.user_id}`);
        const classes = await response.json();

        const grid = document.getElementById('teacher-classes-grid');

        Array.from(grid.children).forEach((child, idx) => {
            if (idx !== grid.children.length - 1) grid.removeChild(child);
        });

        classes.forEach(cls => {
            const card = document.createElement('div');
            card.classList.add('card', 'group', 'cursor-pointer', 'hover:shadow-lg', 'transition-all', 'duration-300', 'hover:-translate-y-1');

            // Build query params for dashboard
            const queryParams = new URLSearchParams({
                id: cls.id,
                name: cls.name,
                section: cls.section,
                subject: cls.subject
            }).toString();

            card.innerHTML = `
                <div class="card-content p-4 text-center space-y-3 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
                        <i data-lucide="book-open" class="size-6 text-primary"></i>
                    </div>
                    <div>
                        <h4 class="font-medium text-sm">${cls.name} - ${cls.section}</h4>
                        <p class="text-xs text-muted-foreground">${cls.subject}</p>
                    </div>
                    <button class="btn btn-outline w-full" onclick='selectClass(${JSON.stringify(cls)})'>
                        <i class="size-3 mr-1" data-lucide="plus"></i> Open
                    </button>
                </div>
            `;

            // Insert before the last child (Create Class card)
            grid.insertBefore(card, grid.lastElementChild);
        });

        lucide.createIcons({ icons: lucide.icons });
    } catch (err) {
        console.error("Error loading classes:", err);
    }
}

async function loadStudentClasses() {
    const user = getCurrentUser();
    if (!user || user.role !== "student") return;

    try {
        const response = await fetch(`/api/student-classes/${user.user_id}`);
        const classes = await response.json();

        const grid = document.getElementById('student-classes-grid');

        // Clear previous content
        grid.innerHTML = '';

        // Add student classes
        classes.forEach(cls => {
            const card = document.createElement('div');
            card.classList.add('card', 'group', 'cursor-pointer', 'hover:shadow-lg', 'transition-all', 'duration-300', 'hover:-translate-y-1');

            card.innerHTML = `
                <div class="card-content p-4 text-center space-y-3 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
                        <i data-lucide="book-open" class="size-6 text-primary"></i>
                    </div>
                    <div>
                        <h4 class="font-medium text-sm">${cls.name} - ${cls.section}</h4>
                        <p class="text-xs text-muted-foreground">${cls.subject}</p>
                    </div>
                    <button class="btn btn-outline w-full" onclick='selectClass(${JSON.stringify(cls)})'>
                        <i data-lucide="plus" class="size-3 mr-1"></i> Open
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Always add Join Card at the end
        const joinCard = document.createElement('div');
        joinCard.classList.add('card', 'group', 'cursor-pointer', 'hover:shadow-lg', 'transition-all', 'duration-300', 'hover:-translate-y-1');
        joinCard.onclick = () => openJoinModal();
        joinCard.innerHTML = `
            <div class="card-content p-4 text-center space-y-3">
                <div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
                    <i data-lucide="book-open" class="size-6 text-primary"></i>
                </div>
                <div>
                    <h4 class="font-medium text-sm">Join Class</h4>
                    <p class="text-xs text-muted-foreground">Join your designated class</p>
                </div>
                <button class="btn btn-outline w-full">
                    <i data-lucide="plus" class="size-3 mr-1"></i> Join
                </button>
            </div>
        `;
        grid.appendChild(joinCard);

        // Show the whole section
        document.getElementById('classes-grid-student').classList.remove('hidden');

        lucide.createIcons({ icons: lucide.icons });
    } catch (err) {
        console.error("Error loading student classes:", err);
    }
}