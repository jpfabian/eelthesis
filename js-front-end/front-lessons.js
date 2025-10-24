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
    try {
        const user = await initializePage();

        // Role-based UI
        if (user.role === 'student') {
            document.querySelectorAll(".teacher-only").forEach(btn => btn.style.display = "none");
            document.querySelectorAll(".student-only").forEach(btn => btn.classList.remove("hidden"));
        }

        hideLoading();

        const subjectFilter = document.getElementById("subject-filter");
        if (subjectFilter) {
            subjectFilter.addEventListener("change", loadCurriculum);
        }

        const backBtn = document.getElementById("back-class-btn");
        if (backBtn) backBtn.addEventListener("click", () => window.location.href = "classes.html");

        await loadCurriculum(); // load lessons after setup

    } catch (error) {
        console.error('Error initializing page:', error);
        window.location.href = 'login.html';
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const filter = document.getElementById("subject-filter");
    const lessonsGrid = document.getElementById("lessons-grid");

    if (!filter || !lessonsGrid) return; // prevent errors if elements missing

    let lessons = Array.from(lessonsGrid.querySelectorAll(".card"));

    filter.addEventListener("change", () => {
        const selected = filter.value;
        lessons.forEach(card => {
            if (selected === "all" || card.dataset.subject === selected) {
                card.style.display = "block";
            } else {
                card.style.display = "none";
            }
        });
    });

    // Hide assign button if role = student
    const user = JSON.parse(localStorage.getItem("eel_user"));
    if (user?.role === "student") {
        document.querySelectorAll(".teacher-only").forEach(btn => btn.style.display = "none");
    }
});


document.addEventListener("DOMContentLoaded", () => {
    const filter = document.getElementById("subject-filter");
    if (!filter) return; // exit if element not found

    // Assuming lessons are loaded dynamically
    let lessons = Array.from(document.querySelectorAll("#lessons-grid .card"));
    let currentPage = 1;

    filter.addEventListener("change", () => {
        const selected = filter.value;

        if (selected === "all") {
            loadLessons(); // reload all lessons
        } else {
            const filtered = lessons.filter(l => l.dataset.subject.toLowerCase().includes(selected));
            lessons = filtered;
            currentPage = 1;
            renderLessons();
        }
    });
});


function viewLesson(topicId, pdfPath, topicTitle) {
    document.getElementById("lesson-title").textContent = topicTitle;
    document.getElementById("lesson-pdf").src = pdfPath;
    document.getElementById("lesson-modal").classList.remove("hidden");
}

function closeLesson() {
    document.getElementById("lesson-modal").classList.add("hidden");
    document.getElementById("lesson-pdf").src = "";
}

function toggleLesson(element) {
    // Isara lahat ng ibang lesson-footer
    document.querySelectorAll(".lesson-footer").forEach(footer => {
        if (footer !== element.querySelector(".lesson-footer")) {
            footer.classList.add("hidden");
        }
    });

    // Toggle yung pinindot mo
    const footer = element.querySelector(".lesson-footer");
    if (footer) {
        footer.classList.toggle("hidden");
    }
}

async function loadCurriculum() {
    try {
        const res = await fetch("http://localhost:3000/curriculum");
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        console.log("Curriculum data:", data);

        const subjectNameEl = document.getElementById("subject-name");
        const container = document.getElementById("lessons-container");
        container.innerHTML = ""; // clear previous lessons

        // Kunin yung subject ng classroom na pinili
        const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class"));
        let selectedSubject = selectedClass ? selectedClass.subject.toLowerCase() : document.getElementById("subject-filter").value.toLowerCase();

        // Filter subjects
        const filteredSubjects = data.filter(subject => 
            subject.subject_name.toLowerCase().includes(selectedSubject)
        );

        if (!filteredSubjects.length) {
            subjectNameEl.textContent = "No subject selected";
            return;
        }

        // Ipakita lang subject name ng first filtered subject
        subjectNameEl.textContent = filteredSubjects[0].subject_name;

        // Populate lessons inside lessons-container
        filteredSubjects[0].lessons.forEach(lesson => {
            let lessonHTML = `
                <div class="card-header">
                    <h3 class="card-title text-center px-2 py-1 text-lg rounded-lg bg-secondary/10 text-secondary">
                        ${lesson.lesson_title}
                    </h3>
                </div>
                <div class="card-content space-y-3">
            `;

            lesson.topics.forEach(topic => {
                lessonHTML += `
                    <div class="topic-card flex flex-col gap-3 p-3 bg-gradient-to-r from-accent/30 to-accent/10 rounded-lg card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                        onclick="toggleLesson(this)">
                        <div class="flex items-center justify-between">
                            <p class="px-2 py-1 text-6xl rounded-lg bg-primary/10 text-primary">${topic.topic_title}</p>
                            <i data-lucide="book-open" class="size-5 text-primary"></i>
                        </div>
                        <div class="lesson-footer hidden mt-3 space-y-2">
                            <button class="btn btn-outline w-full" onclick="viewLesson(${topic.topic_id}, '${topic.pdf_path}', '${topic.topic_title}'); event.stopPropagation();">View</button>
                        </div>
                    </div>
                `;
            });

            lessonHTML += `</div>`; // close card-content
            container.innerHTML += lessonHTML;
        });

        lucide.createIcons({ icons: lucide.icons });

        // Role check
        const user = JSON.parse(localStorage.getItem("eel_user"));
        if (user?.role === "student") {
            document.querySelectorAll(".teacher-only").forEach(btn => btn.style.display = "none");
            document.querySelectorAll(".student-only").forEach(btn => btn.classList.remove("hidden"));
        } else {
            document.querySelectorAll(".student-only").forEach(btn => btn.style.display = "none");
        }

    } catch (err) {
        console.error("Error loading curriculum:", err);
    }
}

// Re–load lessons kapag nagpalit ng subject sa dropdown
document.addEventListener("DOMContentLoaded", loadCurriculum);
