function getCurrentUser() {
    const user = localStorage.getItem("eel_user");
    return user ? JSON.parse(user) : null;
}

const DELETED_CLASSES_CACHE_KEY = "eel_deleted_classes_cache_v1";

function cacheDeletedClass(cls, userId) {
    if (!cls) return;
    try {
        const raw = localStorage.getItem(DELETED_CLASSES_CACHE_KEY);
        const parsed = JSON.parse(raw || "[]");
        const list = Array.isArray(parsed) ? parsed : [];
        list.push({
            deleted_event_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            id: cls.id ?? cls.class_id ?? null,
            name: cls.name ?? "",
            section: cls.section ?? "",
            subject: cls.subject ?? "",
            class_code: cls.class_code ?? "",
            deleted_at: new Date().toISOString(),
            deleted_by: userId ?? null
        });
        // Keep latest 200 cache entries max.
        localStorage.setItem(DELETED_CLASSES_CACHE_KEY, JSON.stringify(list.slice(-200)));
    } catch (_) {}
}


document.addEventListener('DOMContentLoaded', async function() {
    try {
        const user = await initializePage();

        // page title
        document.title = user.role === 'teacher' ? "EEL - Teacher" : "EEL - Student";

        // Subtitle by role: create for teacher, join for student
        const subtitleEl = document.getElementById('classes-page-subtitle');
        if (subtitleEl) {
            subtitleEl.textContent = user.role === 'teacher'
                ? 'Create classes to get started.'
                : 'Join classes to get started.';
        }

        // Show grid based on role
        if (user.role === 'teacher') {
            document.getElementById('classes-grid-teacher').classList.remove('hidden');
            await loadTeacherClasses();
        } else if (user.role === 'student') {
            document.getElementById('classes-grid-student').classList.remove('hidden');
            await loadStudentClasses();
        }

        hideLoading();
    } catch (e) {
        console.error("Error initializing classes page:", e);
        hideLoading();
    }
});

function openJoinModal() {
    document.getElementById('join-class-code').value = '';
    document.getElementById('join-class-modal').classList.remove('hidden');
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

function closeJoinModal() {
    document.getElementById('join-class-modal').classList.add('hidden');
}

async function joinClass() {
    const classCode = document.getElementById('join-class-code').value.trim();
    const user = getCurrentUser();

    if (!classCode) return showNotification("Please enter a class code.");

    try {
        const res = await fetch((window.API_BASE || "") + "/api/join-class", {
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
    if (!cls) return;
    localStorage.setItem("eel_selected_class", JSON.stringify(cls));
    // Keep class_id in sync so pages (reading, exam, recitation, etc.) load data for this class, not a previous one
    const classId = cls.id != null ? cls.id : cls.class_id;
    if (classId != null) {
        localStorage.setItem("eel_selected_class_id", String(classId));
    }
    window.location.href = "lessons.html";
}

async function openClassModal() {
    document.getElementById('class-name').value = "";
    document.getElementById('class-section').value = "";
    document.getElementById('class-subject').value = "";
    await loadSubjectsIntoDropdown();
    document.getElementById('create-class-modal').classList.remove('hidden');
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

async function loadSubjectsIntoDropdown() {
    const select = document.getElementById('class-subject');
    if (!select) return;
    select.innerHTML = "";
    const placeholder = document.createElement('option');
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = "Select a subject";
    select.appendChild(placeholder);
    try {
        const res = await fetch((window.API_BASE || "") + "/api/subjects");
        const data = await res.json();
        if (data.success && Array.isArray(data.subjects)) {
            data.subjects.forEach((s) => {
                const opt = document.createElement('option');
                opt.value = (s.subject_name || "").trim();
                opt.textContent = (s.subject_name || "").trim();
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Failed to load subjects:", err);
    }
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
        const response = await fetch((window.API_BASE || "") + "/api/classes", {
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

async function deleteClassById(cls) {
    const user = getCurrentUser();
    if (!user || user.role !== "teacher") return;
    const classId = cls?.id != null ? cls.id : cls?.class_id;
    if (!classId) return;

    const classLabel = `${cls?.name || "Class"}${cls?.section ? ` (${cls.section})` : ""}`;
    let confirmed = false;
    if (typeof Swal !== "undefined" && Swal && typeof Swal.fire === "function") {
        const result = await Swal.fire({
            icon: "warning",
            title: "Delete class?",
            text: `${classLabel} will be permanently deleted.`,
            showCancelButton: true,
            confirmButtonText: "Archive",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#dc2626",
        });
        confirmed = !!result.isConfirmed;
    } else {
        confirmed = window.confirm(`Archive ${classLabel}? This cannot be undone.`);
    }
    if (!confirmed) return;

    try {
        const teacherId = encodeURIComponent(user.user_id);
        let response = await fetch(`${window.API_BASE || ""}/api/classes/${encodeURIComponent(classId)}?teacher_id=${teacherId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacher_id: user.user_id })
        });
        let data = await response.json().catch(() => ({}));

        // Fallback for environments where DELETE route is not available yet.
        if (response.status === 404) {
            response = await fetch(`${window.API_BASE || ""}/api/classes/${encodeURIComponent(classId)}/delete?teacher_id=${teacherId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teacher_id: user.user_id })
            });
            data = await response.json().catch(() => ({}));
        }

        if (!response.ok || !data.success) {
            showNotification(data.message || "Failed to archive class.", "error");
            return;
        }
        cacheDeletedClass(cls, user.user_id);
        showNotification("Class archived successfully.", "success");
        await loadTeacherClasses();
    } catch (err) {
        console.error("Delete class error:", err);
        showNotification("Server error while deleting class.", "error");
    }
}

async function loadTeacherClasses() {
    const user = getCurrentUser();
    if (!user || user.role !== "teacher") return;

    try {
        const response = await fetch(`${window.API_BASE || ""}/api/classes/${user.user_id}`);
        const classes = await response.json();

        const grid = document.getElementById('teacher-classes-grid');

        // Keep Create Class card by reference (last child after previous load), then clear grid
        const createClassCard = grid.lastElementChild;
        while (grid.firstChild) grid.removeChild(grid.firstChild);

        classes.forEach(cls => {
            const card = document.createElement('div');
            card.classList.add('class-card');
            card.tabIndex = 0;

            const title = `${cls.name ?? ''}`.trim() || 'Untitled class';
            const section = `${cls.section ?? ''}`.trim();
            const subject = `${cls.subject ?? ''}`.trim();
            const code = `${cls.class_code ?? ''}`.trim();

            card.innerHTML = `
                <div class="class-card__header">
                    <div class="class-card__icon">
                        <i data-lucide="layers" class="size-5"></i>
                    </div>
                    <div class="class-card__header-text">
                        <div class="class-card__title">${escapeHtml(title)}</div>
                        <div class="class-card__subtitle">
                            ${section ? `<span class="class-pill">${escapeHtml(section)}</span>` : ''}
                            ${subject ? `<span class="class-pill class-pill--muted">${escapeHtml(subject)}</span>` : ''}
                        </div>
                    </div>
                    <div class="class-card__menu-wrap">
                        <button type="button" class="class-card__menu-btn" aria-label="Class actions" aria-expanded="false">⋮</button>
                        <div class="class-card__menu hidden">
                            <button type="button" class="class-card__menu-item class-card__menu-item--delete">Archive</button>
                        </div>
                    </div>
                </div>
                <div class="class-card__meta">
                    <div class="class-meta-row">
                        <span class="class-meta-label">Class code</span>
                        <span class="class-code">${code ? escapeHtml(code) : '-'}</span>
                    </div>
                </div>
                <div class="class-card__footer">
                    <button type="button" class="btn btn-primary w-full class-open-btn">
                        <i data-lucide="arrow-right" class="size-4"></i>
                        Open classroom
                    </button>
                </div>
            `;

            const openBtn = card.querySelector('.class-open-btn');
            const menuBtn = card.querySelector('.class-card__menu-btn');
            const menuEl = card.querySelector('.class-card__menu');
            const deleteBtn = card.querySelector('.class-card__menu-item--delete');
            if (openBtn) {
                openBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectClass(cls);
                });
            }
            if (menuBtn && menuEl) {
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.class-card__menu').forEach((m) => {
                        if (m !== menuEl) m.classList.add('hidden');
                    });
                    const willOpen = menuEl.classList.contains('hidden');
                    menuEl.classList.toggle('hidden', !willOpen);
                    menuBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                });
            }
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (menuEl) menuEl.classList.add('hidden');
                    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
                    await deleteClassById(cls);
                });
            }
            card.addEventListener('click', () => selectClass(cls));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectClass(cls);
                }
            });

            grid.appendChild(card);
        });

        grid.appendChild(createClassCard);

        if (!document.body._classCardMenuOutsideBound) {
            document.body._classCardMenuOutsideBound = true;
            document.addEventListener('click', () => {
                document.querySelectorAll('.class-card__menu').forEach((m) => m.classList.add('hidden'));
                document.querySelectorAll('.class-card__menu-btn[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
            });
        }

        lucide.createIcons({ icons: lucide.icons });
    } catch (err) {
        console.error("Error loading classes:", err);
    }
}

async function loadStudentClasses() {
    const user = getCurrentUser();
    if (!user || user.role !== "student") return;

    try {
        const response = await fetch(`${window.API_BASE || ""}/api/student-classes/${user.user_id}`);
        const classes = await response.json();

        const grid = document.getElementById('student-classes-grid');

        // Clear previous content
        grid.innerHTML = '';

        // Add student classes
        classes.forEach(cls => {
            const card = document.createElement('div');
            card.classList.add('class-card');
            card.tabIndex = 0;

            const title = `${cls.name ?? ''}`.trim() || 'Untitled class';
            const section = `${cls.section ?? ''}`.trim();
            const subject = `${cls.subject ?? ''}`.trim();

            card.innerHTML = `
                <div class="class-card__header">
                    <div class="class-card__icon">
                        <i data-lucide="layers" class="size-5"></i>
                    </div>
                    <div class="class-card__header-text">
                        <div class="class-card__title">${escapeHtml(title)}</div>
                        <div class="class-card__subtitle">
                            ${section ? `<span class="class-pill">${escapeHtml(section)}</span>` : ''}
                            ${subject ? `<span class="class-pill class-pill--muted">${escapeHtml(subject)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="class-card__footer">
                    <button type="button" class="btn btn-primary w-full class-open-btn">
                        <i data-lucide="arrow-right" class="size-4"></i>
                        Open classroom
                    </button>
                </div>
            `;

            const openBtn = card.querySelector('.class-open-btn');
            if (openBtn) {
                openBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectClass(cls);
                });
            }
            card.addEventListener('click', () => selectClass(cls));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectClass(cls);
                }
            });

            grid.appendChild(card);
        });

        // Always add Join Card at the end
        const joinCard = document.createElement('div');
        joinCard.classList.add('class-card', 'class-card--action', 'card-join-class');
        joinCard.onclick = () => openJoinModal();
        joinCard.innerHTML = `
            <div class="class-card__header">
                <div class="class-card__icon class-card__icon--join card-join-class__icon-wrap">
                    <i data-lucide="plus" class="size-5 card-join-class__icon-svg"></i>
                </div>
                <div class="class-card__header-text">
                    <div class="class-card__title">Enroll in the class</div>
                    <div class="class-card__subtitle">
                        <span class="class-pill class-pill--muted">Enter the class code from your teacher</span>
                    </div>
                </div>
            </div>
            <div class="class-card__footer">
                <button class="btn btn-join-class w-full" type="button">
                    <i data-lucide="log-in" class="size-4"></i>
                    Enroll
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

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}