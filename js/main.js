// EEL Application - Main JavaScript

// Application state
const AppState = {
    userRole: null,
    userName: null,
    activeSection: 'dashboard'
};

// Main Application
const App = {
    init() {
        this.bindEvents();
        this.showRoleSelection();
    },

    bindEvents() {
        // Name input validation
        const nameInput = document.getElementById('user-name');
        nameInput.addEventListener('input', this.validateName);

        // Role selection
        document.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', () => this.selectRole(card.dataset.role));
        });

        // Demo buttons
        document.querySelectorAll('.demo-button').forEach(button => {
            button.addEventListener('click', () => this.demoLogin(button.dataset.demoRole));
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    },

    validateName() {
        const nameInput = document.getElementById('user-name');
        const roleButtons = document.querySelectorAll('.role-button');
        const hasName = nameInput.value.trim().length > 0;
        
        roleButtons.forEach(button => {
            button.disabled = !hasName;
        });
    },

    selectRole(role) {
        const nameInput = document.getElementById('user-name');
        const name = nameInput.value.trim();
        
        if (!name) {
            this.showNotification('Please enter your name first', 'warning');
            nameInput.focus();
            return;
        }

        AppState.userRole = role;
        AppState.userName = name;
        this.showMainApp();
    },

    demoLogin(role) {
        AppState.userRole = role;
        AppState.userName = role === 'teacher' ? 'Demo Teacher' : 'Demo Student';
        this.showMainApp();
    },

    logout: () => {
        AppState.userRole = null;
        AppState.userName = null;
        AppState.activeSection = 'dashboard';

        document.getElementById('user-name').value = '';
        App.validateName(); // tawagin mo gamit `App`, para sure
        App.showRoleSelection();
    },

    showRoleSelection() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('role-selection').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        
        // Reinitialize Lucide icons
        setTimeout(() => lucide.createIcons(), 100);
    },

    showMainApp() {
        document.getElementById('role-selection').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        this.setupSidebar();
        this.renderSection('dashboard');
        
        // Reinitialize Lucide icons
        setTimeout(() => lucide.createIcons(), 100);
    },

    setupSidebar() {
        const sidebarTitle = document.getElementById('sidebar-title');
        const sidebarWelcome = document.getElementById('sidebar-welcome');
        const sidebarNav = document.getElementById('sidebar-nav');

        // Update header
        if (AppState.userRole === 'teacher') {
            sidebarTitle.textContent = 'EEL Teacher';
            sidebarTitle.className = 'text-xl font-semibold text-primary';
        } else {
            sidebarTitle.textContent = 'EEL Student';
            sidebarTitle.className = 'text-xl font-semibold text-secondary';
        }
        sidebarWelcome.textContent = `Welcome, ${AppState.userName}`;

        // Setup navigation
        const sections = AppState.userRole === 'teacher' ? [
            { id: 'dashboard', label: 'Dashboard', icon: 'bar-chart-3' },
            { id: 'reading-lessons', label: 'Reading Lessons', icon: 'book-open' },
            { id: 'pronunciation-lessons', label: 'Pronunciation', icon: 'brain' },
            { id: 'quiz-generator', label: 'Quiz Generator', icon: 'pen-tool' },
            { id: 'student-progress', label: 'Student Progress', icon: 'users' },
            { id: 'settings', label: 'Settings', icon: 'settings' }
        ] : [
            { id: 'dashboard', label: 'Dashboard', icon: 'bar-chart-3' },
            { id: 'reading-practice', label: 'Reading Practice', icon: 'book-open' },
            { id: 'pronunciation-practice', label: 'Pronunciation', icon: 'brain' },
            { id: 'spelling-practice', label: 'Spelling', icon: 'spell-check-2' },
            { id: 'take-quiz', label: 'Take Quiz', icon: 'trophy' },
            { id: 'my-progress', label: 'My Progress', icon: 'bar-chart-3' },
            { id: 'settings', label: 'Settings', icon: 'settings' }
        ];

        sidebarNav.innerHTML = sections.map(section => `
            <button 
                class="nav-button btn-side-bar w-full justify-start gap-3 p-3 rounded-md text-left transition-all ${
                    AppState.activeSection === section.id 
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }"
                onclick="App.renderSection('${section.id}')"
            >
                <i data-lucide="${section.icon}" class="size-5"></i>
                ${section.label}
            </button>
        `).join('');
    },

    renderSection(sectionId) {
        AppState.activeSection = sectionId;
        
        // Update active nav state
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.className = btn.className.replace(/bg-sidebar-primary.*?foreground/, '').replace(/\s+/, ' ');
            if (btn.onclick.toString().includes(`'${sectionId}'`)) {
                btn.className += ' bg-sidebar-primary text-sidebar-primary-foreground';
            } else {
                btn.className += ' text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';
            }
        });

        // Render content
        const content = this.getSectionContent(sectionId);
        document.getElementById('main-content').innerHTML = content;
        
        // Reinitialize Lucide icons
        setTimeout(() => lucide.createIcons(), 100);
    },

    getSectionContent(sectionId) {
        if (AppState.userRole === 'teacher') {
            switch (sectionId) {
                case 'dashboard':
                    return this.getTeachingDashboard();
                case 'reading-lessons':
                    return this.getReadingSection();
                case 'pronunciation-lessons':
                    return this.getPronunciationSection();
                case 'quiz-generator':
                    return this.getQuizGeneratorSection();
                case 'student-progress':
                    return this.getProgressSection();
                case 'settings':
                    return this.getSettingsSection();
                default:
                    return this.getTeachingDashboard();
            }
        } else {
            switch (sectionId) {
                case 'dashboard':
                    return this.getStudentDashboard();
                case 'reading-practice':
                    return this.getReadingSection();
                case 'pronunciation-practice':
                    return this.getPronunciationSection();
                case 'spelling-practice':
                    return this.getSpellingPracticeSection();
                case 'take-quiz':
                    return this.getTakeQuizSection();
                case 'my-progress':
                    return this.getProgressSection();
                case 'settings':
                    return this.getSettingsSection();
                default:
                    return this.getStudentDashboard();
            }
        }
    },

    getTeachingDashboard() {
        return `
            <div class="p-6 space-y-6">
                <div>
                    <h2 class="text-2xl font-semibold mb-2">Teaching Dashboard</h2>
                    <p class="text-muted-foreground">Manage your lessons, track student progress, and create engaging content</p>
                </div>

                <!-- Stats Overview -->
                <div class="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-sm font-medium">Total Students</h3>
                                <i data-lucide="users" class="size-4 text-primary"></i>
                            </div>
                            <div class="text-2xl font-bold text-primary">28</div>
                            <p class="text-xs text-muted-foreground">15 currently online</p>
                        </div>
                    </div>

                    <div class="card bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-sm font-medium">Active Lessons</h3>
                                <i data-lucide="book-open" class="size-4 text-secondary"></i>
                            </div>
                            <div class="text-2xl font-bold text-secondary">12</div>
                            <p class="text-xs text-muted-foreground">5 created this week</p>
                        </div>
                    </div>

                    <div class="card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-sm font-medium">Quizzes Created</h3>
                                <i data-lucide="pen-tool" class="size-4 text-primary"></i>
                            </div>
                            <div class="text-2xl font-bold text-primary">8</div>
                            <p class="text-xs text-muted-foreground">AI-powered assessments</p>
                        </div>
                    </div>

                    <div class="card bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-sm font-medium">Avg. Score</h3>
                                <i data-lucide="trending-up" class="size-4 text-secondary"></i>
                            </div>
                            <div class="text-2xl font-bold text-secondary">82%</div>
                            <p class="text-xs text-muted-foreground">+3% from last month</p>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div>
                    <h3 class="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div class="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1" onclick="App.renderSection('reading-lessons')">
                            <div class="card-content p-4 text-center space-y-3">
                                <div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
                                    <i data-lucide="book-open" class="size-6 text-primary"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-sm">Create Reading Lesson</h4>
                                    <p class="text-xs text-muted-foreground">Design new comprehension exercises</p>
                                </div>
                                <button class="btn btn-outline w-full">
                                    <i data-lucide="plus" class="size-3 mr-1"></i>
                                    Create
                                </button>
                            </div>
                        </div>

                        <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1" onclick="App.renderSection('quiz-generator')">
                            <div class="card-content p-4 text-center space-y-3">
                                <div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-secondary/10">
                                    <i data-lucide="pen-tool" class="size-6 text-secondary"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-sm">Generate Quiz</h4>
                                    <p class="text-xs text-muted-foreground">Create AI-powered assessments</p>
                                </div>
                                <button class="btn btn-outline w-full">
                                    <i data-lucide="plus" class="size-3 mr-1"></i>
                                    Create
                                </button>
                            </div>
                        </div>

                        <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1" onclick="App.renderSection('pronunciation-lessons')">
                            <div class="card-content p-4 text-center space-y-3">
                                <div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
                                    <i data-lucide="brain" class="size-6 text-primary"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-sm">Pronunciation Lesson</h4>
                                    <p class="text-xs text-muted-foreground">Build speaking exercises</p>
                                </div>
                                <button class="btn btn-outline w-full">
                                    <i data-lucide="plus" class="size-3 mr-1"></i>
                                    Create
                                </button>
                            </div>
                        </div>

                        <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1" onclick="App.renderSection('student-progress')">
                            <div class="card-content p-4 text-center space-y-3">
                                <div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-secondary/10">
                                    <i data-lucide="users" class="size-6 text-secondary"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-sm">View Students</h4>
                                    <p class="text-xs text-muted-foreground">Monitor student progress</p>
                                </div>
                                <button class="btn btn-outline w-full">
                                    <i data-lucide="plus" class="size-3 mr-1"></i>
                                    View
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content Grid -->
                <div class="grid grid-cols-2 lg:grid-cols-2 gap-6">
                    <!-- Recent Activity -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title flex items-center gap-2">
                                <i data-lucide="clock" class="size-5 text-primary"></i>
                                Recent Activity
                            </h3>
                        </div>
                        <div class="card-content space-y-3">
                            <div class="flex items-center gap-3 p-3 bg-gradient-to-r from-accent/30 to-accent/10 rounded-lg">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center bg-primary/20">
                                    <i data-lucide="book-open" class="size-4 text-primary"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="text-sm font-medium">Created new reading lesson: 'Environmental Science'</p>
                                    <p class="text-xs text-muted-foreground">2 hours ago</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-3 p-3 bg-gradient-to-r from-accent/30 to-accent/10 rounded-lg">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center bg-secondary/20">
                                    <i data-lucide="pen-tool" class="size-4 text-secondary"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="text-sm font-medium">Generated vocabulary quiz for Grade 8</p>
                                    <p class="text-xs text-muted-foreground">4 hours ago</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-3 p-3 bg-gradient-to-r from-accent/30 to-accent/10 rounded-lg">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center bg-primary/20">
                                    <i data-lucide="brain" class="size-4 text-primary"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="text-sm font-medium">Sarah completed pronunciation exercise</p>
                                    <p class="text-xs text-muted-foreground">6 hours ago</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Upcoming Lessons -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title flex items-center gap-2">
                                <i data-lucide="book-open" class="size-5 text-secondary"></i>
                                Upcoming Lessons
                            </h3>
                        </div>
                        <div class="card-content space-y-3">
                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-accent/30 to-accent/10 rounded-lg">
                                <div class="flex-1">
                                    <h4 class="font-medium text-sm">Advanced Reading Comprehension</h4>
                                    <p class="text-xs text-muted-foreground">Today, 2:00 PM</p>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="px-2 py-1 text-xs rounded border border-border bg-background">Reading</span>
                                        <span class="text-xs text-muted-foreground">15 students</span>
                                    </div>
                                </div>
                                <button class="btn btn-outline">View</button>
                            </div>

                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-accent/30 to-accent/10 rounded-lg">
                                <div class="flex-1">
                                    <h4 class="font-medium text-sm">Pronunciation Workshop</h4>
                                    <p class="text-xs text-muted-foreground">Tomorrow, 10:00 AM</p>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="px-2 py-1 text-xs rounded border border-border bg-background">Pronunciation</span>
                                        <span class="text-xs text-muted-foreground">12 students</span>
                                    </div>
                                </div>
                                <button class="btn btn-outline">View</button>
                            </div>

                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-accent/30 to-accent/10 rounded-lg">
                                <div class="flex-1">
                                    <h4 class="font-medium text-sm">Grammar Review Session</h4>
                                    <p class="text-xs text-muted-foreground">Friday, 3:00 PM</p>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="px-2 py-1 text-xs rounded border border-border bg-background">Grammar</span>
                                        <span class="text-xs text-muted-foreground">20 students</span>
                                    </div>
                                </div>
                                <button class="btn btn-outline">View</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Student Progress Overview -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title flex items-center gap-2">
                            <i data-lucide="users" class="size-5 text-primary"></i>
                            Class Performance Overview
                        </h3>
                    </div>
                    <div class="card-content space-y-4">
                        <div class="grid grid-cols-3 md:grid-cols-3 gap-4">
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span>Reading Comprehension</span>
                                    <span class="font-medium">85%</span>
                                </div>
                                <div class="w-full bg-muted rounded-full h-2">
                                    <div class="bg-primary h-2 rounded-full" style="width: 85%"></div>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span>Pronunciation</span>
                                    <span class="font-medium">78%</span>
                                </div>
                                <div class="w-full bg-muted rounded-full h-2">
                                    <div class="bg-secondary h-2 rounded-full" style="width: 78%"></div>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span>Spelling</span>
                                    <span class="font-medium">92%</span>
                                </div>
                                <div class="w-full bg-muted rounded-full h-2">
                                    <div class="bg-primary h-2 rounded-full" style="width: 92%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <button class="btn btn-outline" onclick="App.renderSection('student-progress')">View Detailed Reports</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getStudentDashboard() {
        return `
            <div class="p-6 space-y-8">
                <!-- Hero Section -->
                <div class="text-center space-y-6 py-8">
                    <div class="space-y-4">
                        <h1 class="text-4xl md:text-6xl font-bold text-gradient">
                            ENHANCE YOUR ENGLISH
                        </h1>
                        <h1 class="text-4xl md:text-6xl font-bold text-gradient">
                            LITERACY WITH EEL
                        </h1>
                        <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Master reading comprehension, perfect your pronunciation, and excel with AI-generated quizzes 
                            tailored to your learning level.
                        </p>
                    </div>
                    
                    <div class="flex grid-cols-2 sm:flex-row gap-4 justify-center items-center">
                        <button class="btn btn-primary" onclick="App.renderSection('reading-practice')">
                            <i data-lucide="play" class="size-5 mr-2"></i>
                            Start Learning
                        </button>
                        <button class="btn btn-outline" onclick="App.renderSection('my-progress')">
                            View Progress
                            <i data-lucide="arrow-right" class="size-5 ml-2"></i>
                        </button>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="grid grid-cols-3 md:grid-cols-3 gap-6">
                    <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1" onclick="App.renderSection('reading-practice')">
                        <div class="card-content p-6 text-center space-y-4">
                            <div class="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-primary/10">
                                <i data-lucide="book-open" class="size-8 text-primary"></i>
                            </div>
                            <div>
                                <h3 class="font-semibold mb-2">Start Reading</h3>
                                <p class="text-sm text-muted-foreground">Practice comprehension skills</p>
                            </div>
                            <button class="btn btn-outline w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                Get Started
                            </button>
                        </div>
                    </div>

                    <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1" onclick="App.renderSection('pronunciation-practice')">
                        <div class="card-content p-6 text-center space-y-4">
                            <div class="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-secondary/10">
                                <i data-lucide="brain" class="size-8 text-secondary"></i>
                            </div>
                            <div>
                                <h3 class="font-semibold mb-2">Practice Speaking</h3>
                                <p class="text-sm text-muted-foreground">Improve pronunciation</p>
                            </div>
                            <button class="btn btn-outline w-full group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                                Get Started
                            </button>
                        </div>
                    </div>

                    <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1" onclick="App.renderSection('take-quiz')">
                        <div class="card-content p-6 text-center space-y-4">
                            <div class="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-primary/10">
                                <i data-lucide="trophy" class="size-8 text-primary"></i>
                            </div>
                            <div>
                                <h3 class="font-semibold mb-2">Take Quiz</h3>
                                <p class="text-sm text-muted-foreground">Test your knowledge</p>
                            </div>
                            <button class="btn btn-outline w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Stats Overview -->
                <div class="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-sm font-medium">Reading Lessons</h3>
                                <i data-lucide="book-open" class="size-4 text-primary"></i>
                            </div>
                            <div class="text-2xl font-bold text-primary">12</div>
                            <p class="text-xs text-muted-foreground">Completed this month</p>
                        </div>
                    </div>

                    <div class="card bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-sm font-medium">Pronunciation</h3>
                                <i data-lucide="brain" class="size-4 text-secondary"></i>
                            </div>
                            <div class="text-2xl font-bold text-secondary">8</div>
                            <p class="text-xs text-muted-foreground">Sessions completed</p>
                        </div>
                    </div>

                    <div class="card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-sm font-medium">Average Score</h3>
                                <i data-lucide="trophy" class="size-4 text-primary"></i>
                            </div>
                            <div class="text-2xl font-bold text-primary">85%</div>
                            <p class="text-xs text-muted-foreground">Across all quizzes</p>
                        </div>
                    </div>

                    <div class="card bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-sm font-medium">Study Time</h3>
                                <i data-lucide="clock" class="size-4 text-secondary"></i>
                            </div>
                            <div class="text-2xl font-bold text-secondary">45h</div>
                            <p class="text-xs text-muted-foreground">This month</p>
                        </div>
                    </div>
                </div>

                <!-- Progress Section -->
                <div class="grid grid-cols-2 lg:grid-cols-2 gap-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title flex items-center gap-2">
                                <i data-lucide="trophy" class="size-5 text-primary"></i>
                                Learning Streak
                            </h3>
                        </div>
                        <div class="card-content space-y-4">
                            <div class="text-center">
                                <div class="text-4xl font-bold text-primary">7</div>
                                <p class="text-muted-foreground">days in a row</p>
                            </div>
                            <div class="w-full bg-muted rounded-full h-3">
                                <div class="bg-primary h-3 rounded-full" style="width: 70%"></div>
                            </div>
                            <p class="text-sm text-muted-foreground text-center">
                                Keep going! 3 more days to reach your monthly goal
                            </p>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title flex items-center gap-2">
                                <i data-lucide="clock" class="size-5 text-secondary"></i>
                                Recent Activity
                            </h3>
                        </div>
                        <div class="card-content space-y-3">
                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-accent/50 to-accent/20 rounded-lg">
                                <div class="flex-1">
                                    <p class="font-medium text-sm">Advanced Comprehension: Climate Change</p>
                                    <p class="text-xs text-muted-foreground">Today</p>
                                </div>
                                <span class="px-2 py-1 text-xs rounded bg-primary text-primary-foreground">92%</span>
                            </div>

                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-accent/50 to-accent/20 rounded-lg">
                                <div class="flex-1">
                                    <p class="font-medium text-sm">Pronunciation Practice - Vowels</p>
                                    <p class="text-xs text-muted-foreground">Yesterday</p>
                                </div>
                                <span class="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground">88%</span>
                            </div>

                            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-accent/50 to-accent/20 rounded-lg">
                                <div class="flex-1">
                                    <p class="font-medium text-sm">Grammar and Vocabulary Quiz</p>
                                    <p class="text-xs text-muted-foreground">2 days ago</p>
                                </div>
                                <span class="px-2 py-1 text-xs rounded bg-border text-foreground">79%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getReadingSection() {
        return `
            <div class="p-6 space-y-6">
                <div>
                    <h2 class="text-2xl font-semibold mb-2">${AppState.userRole === 'teacher' ? 'Reading Lessons' : 'Reading Practice'}</h2>
                    <p class="text-muted-foreground">${AppState.userRole === 'teacher' ? 'Create and manage reading comprehension lessons' : 'Improve your reading comprehension skills'}</p>
                </div>

                ${AppState.userRole === 'teacher' ? `
                    <div class="flex flex-wrap gap-4">
                        <button class="btn btn-primary">
                            <i data-lucide="plus" class="size-4 mr-2"></i>
                            Create New Lesson
                        </button>
                        <button class="btn btn-outline">
                            <i data-lucide="upload" class="size-4 mr-2"></i>
                            Import Text
                        </button>
                        <button class="btn btn-outline">
                            <i data-lucide="brain" class="size-4 mr-2"></i>
                            AI Generate
                        </button>
                    </div>
                ` : ''}

                <div class="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-4">
                                <span class="px-2 py-1 text-xs rounded bg-primary/10 text-primary">Beginner</span>
                                <i data-lucide="book-open" class="size-5 text-primary"></i>
                            </div>
                            <h3 class="font-semibold mb-2">The Weather Today</h3>
                            <p class="text-sm text-muted-foreground mb-4">A simple passage about different types of weather conditions and seasonal changes.</p>
                            <div class="flex items-center justify-between text-xs text-muted-foreground mb-4">
                                <span>5 min read</span>
                                <span>8 questions</span>
                            </div>
                            <button class="btn btn-outline w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                ${AppState.userRole === 'teacher' ? 'Edit Lesson' : 'Start Reading'}
                            </button>
                        </div>
                    </div>

                    <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-4">
                                <span class="px-2 py-1 text-xs rounded bg-secondary/10 text-secondary">Intermediate</span>
                                <i data-lucide="book-open" class="size-5 text-secondary"></i>
                            </div>
                            <h3 class="font-semibold mb-2">Technology in Education</h3>
                            <p class="text-sm text-muted-foreground mb-4">Explore how modern technology is transforming the way we learn and teach.</p>
                            <div class="flex items-center justify-between text-xs text-muted-foreground mb-4">
                                <span>8 min read</span>
                                <span>12 questions</span>
                            </div>
                            <button class="btn btn-outline w-full group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                                ${AppState.userRole === 'teacher' ? 'Edit Lesson' : 'Start Reading'}
                            </button>
                        </div>
                    </div>

                    <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-4">
                                <span class="px-2 py-1 text-xs rounded bg-primary/10 text-primary">Advanced</span>
                                <i data-lucide="book-open" class="size-5 text-primary"></i>
                            </div>
                            <h3 class="font-semibold mb-2">Climate Change Solutions</h3>
                            <p class="text-sm text-muted-foreground mb-4">A comprehensive analysis of innovative approaches to combat climate change.</p>
                            <div class="flex items-center justify-between text-xs text-muted-foreground mb-4">
                                <span>12 min read</span>
                                <span>15 questions</span>
                            </div>
                            <button class="btn btn-outline w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                ${AppState.userRole === 'teacher' ? 'Edit Lesson' : 'Start Reading'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getPronunciationSection() {
        return `
            <div class="p-6 space-y-6">
                <div>
                    <h2 class="text-2xl font-semibold mb-2">${AppState.userRole === 'teacher' ? 'Pronunciation Lessons' : 'Pronunciation Practice'}</h2>
                    <p class="text-muted-foreground">${AppState.userRole === 'teacher' ? 'Create pronunciation exercises and track student progress' : 'Improve your pronunciation with interactive exercises'}</p>
                </div>

                ${AppState.userRole === 'teacher' ? `
                    <div class="flex flex-wrap gap-4">
                        <button class="btn btn-primary">
                            <i data-lucide="plus" class="size-4 mr-2"></i>
                            Create Exercise
                        </button>
                        <button class="btn btn-outline">
                            <i data-lucide="mic" class="size-4 mr-2"></i>
                            Record Sample
                        </button>
                    </div>
                ` : ''}

                <div class="grid grid-cols-2 lg:grid-cols-2 gap-6">
                    <div class="space-y-6">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Vowel Sounds</h3>
                                <p class="card-description">Practice the fundamental vowel sounds in English</p>
                            </div>
                            <div class="card-content space-y-4">
                                <div class="grid grid-cols-2 gap-3">
                                    <button class="btn btn-outline flex items-center gap-2">
                                        <i data-lucide="volume-2" class="size-4"></i>
                                        /æ/ as in "cat"
                                    </button>
                                    <button class="btn btn-outline flex items-center gap-2">
                                        <i data-lucide="volume-2" class="size-4"></i>
                                        /ɪ/ as in "bit"
                                    </button>
                                    <button class="btn btn-outline flex items-center gap-2">
                                        <i data-lucide="volume-2" class="size-4"></i>
                                        /ʌ/ as in "but"
                                    </button>
                                    <button class="btn btn-outline flex items-center gap-2">
                                        <i data-lucide="volume-2" class="size-4"></i>
                                        /ɔ/ as in "hot"
                                    </button>
                                </div>
                                <button class="btn btn-primary w-full">
                                    <i data-lucide="mic" class="size-4 mr-2"></i>
                                    Start Practice Session
                                </button>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Consonant Clusters</h3>
                                <p class="card-description">Master difficult consonant combinations</p>
                            </div>
                            <div class="card-content space-y-4">
                                <div class="space-y-3">
                                    <div class="p-3 bg-muted rounded-lg">
                                        <div class="flex items-center justify-between">
                                            <span class="font-medium">/str/ sounds</span>
                                            <button class="btn btn-outline btn-sm">
                                                <i data-lucide="play" class="size-3"></i>
                                            </button>
                                        </div>
                                        <p class="text-sm text-muted-foreground mt-1">street, strong, destroy</p>
                                    </div>
                                    <div class="p-3 bg-muted rounded-lg">
                                        <div class="flex items-center justify-between">
                                            <span class="font-medium">/θr/ sounds</span>
                                            <button class="btn btn-outline btn-sm">
                                                <i data-lucide="play" class="size-3"></i>
                                            </button>
                                        </div>
                                        <p class="text-sm text-muted-foreground mt-1">three, throw, through</p>
                                    </div>
                                </div>
                                <button class="btn btn-secondary w-full">
                                    <i data-lucide="mic" class="size-4 mr-2"></i>
                                    Practice Clusters
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Recording Studio</h3>
                                <p class="card-description">Record and analyze your pronunciation</p>
                            </div>
                            <div class="card-content space-y-4">
                                <div class="text-center p-8 border-2 border-dashed border-border rounded-lg">
                                    <i data-lucide="mic" class="size-16 text-muted-foreground mx-auto mb-4"></i>
                                    <p class="text-muted-foreground mb-4">Click to start recording</p>
                                    <button class="btn btn-primary">
                                        <i data-lucide="mic" class="size-4 mr-2"></i>
                                        Record
                                    </button>
                                </div>
                                <div class="space-y-2">
                                    <div class="flex justify-between text-sm">
                                        <span>Accuracy Score</span>
                                        <span class="font-medium">--</span>
                                    </div>
                                    <div class="w-full bg-muted rounded-full h-2">
                                        <div class="bg-primary h-2 rounded-full" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Recent Recordings</h3>
                            </div>
                            <div class="card-content space-y-3">
                                <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div>
                                        <p class="font-medium text-sm">Vowel Practice</p>
                                        <p class="text-xs text-muted-foreground">2 hours ago</p>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="px-2 py-1 text-xs rounded bg-primary text-primary-foreground">92%</span>
                                        <button class="btn btn-outline btn-sm">
                                            <i data-lucide="play" class="size-3"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div>
                                        <p class="font-medium text-sm">Word Stress</p>
                                        <p class="text-xs text-muted-foreground">1 day ago</p>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground">88%</span>
                                        <button class="btn btn-outline btn-sm">
                                            <i data-lucide="play" class="size-3"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getQuizGeneratorSection() {
        return `
            <div class="p-6 space-y-6">
                <div>
                    <h2 class="text-2xl font-semibold mb-2">Quiz Generator</h2>
                    <p class="text-muted-foreground">Create AI-powered quizzes and assessments for your students</p>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-2 gap-6">
                    <div class="space-y-6">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Create New Quiz</h3>
                                <p class="card-description">Generate a quiz from text or topic</p>
                            </div>
                            <div class="card-content space-y-4">
                                <div class="space-y-2">
                                    <label class="form-label">Quiz Topic or Text</label>
                                    <textarea class="form-textarea" placeholder="Enter a topic (e.g., 'Climate Change') or paste text to generate questions from..." rows="4"></textarea>
                                </div>
                                
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="space-y-2">
                                        <label class="form-label">Question Count</label>
                                        <select class="form-input">
                                            <option>5 questions</option>
                                            <option>10 questions</option>
                                            <option>15 questions</option>
                                            <option>20 questions</option>
                                        </select>
                                    </div>
                                    <div class="space-y-2">
                                        <label class="form-label">Difficulty</label>
                                        <select class="form-input">
                                            <option>Beginner</option>
                                            <option>Intermediate</option>
                                            <option>Advanced</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <label class="form-label">Question Types</label>
                                    <div class="space-y-2">
                                        <label class="flex items-center gap-2">
                                            <input type="checkbox" checked>
                                            Multiple Choice
                                        </label>
                                        <label class="flex items-center gap-2">
                                            <input type="checkbox" checked>
                                            True/False
                                        </label>
                                        <label class="flex items-center gap-2">
                                            <input type="checkbox">
                                            Fill in the Blanks
                                        </label>
                                        <label class="flex items-center gap-2">
                                            <input type="checkbox">
                                            Short Answer
                                        </label>
                                    </div>
                                </div>

                                <button class="btn btn-primary w-full">
                                    <i data-lucide="brain" class="size-4 mr-2"></i>
                                    Generate Quiz
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Recent Quizzes</h3>
                            </div>
                            <div class="card-content space-y-3">
                                <div class="p-3 border border-border rounded-lg">
                                    <div class="flex items-center justify-between mb-2">
                                        <h4 class="font-medium">Environmental Science Quiz</h4>
                                        <span class="px-2 py-1 text-xs rounded bg-primary/10 text-primary">10 questions</span>
                                    </div>
                                    <p class="text-sm text-muted-foreground mb-3">Created 2 hours ago • Intermediate level</p>
                                    <div class="flex gap-2">
                                        <button class="btn btn-outline btn-sm">
                                            <i data-lucide="edit" class="size-3 mr-1"></i>
                                            Edit
                                        </button>
                                        <button class="btn btn-outline btn-sm">
                                            <i data-lucide="share" class="size-3 mr-1"></i>
                                            Share
                                        </button>
                                        <button class="btn btn-outline btn-sm">
                                            <i data-lucide="bar-chart" class="size-3 mr-1"></i>
                                            Results
                                        </button>
                                    </div>
                                </div>

                                <div class="p-3 border border-border rounded-lg">
                                    <div class="flex items-center justify-between mb-2">
                                        <h4 class="font-medium">Grammar Fundamentals</h4>
                                        <span class="px-2 py-1 text-xs rounded bg-secondary/10 text-secondary">15 questions</span>
                                    </div>
                                    <p class="text-sm text-muted-foreground mb-3">Created yesterday • Beginner level</p>
                                    <div class="flex gap-2">
                                        <button class="btn btn-outline btn-sm">
                                            <i data-lucide="edit" class="size-3 mr-1"></i>
                                            Edit
                                        </button>
                                        <button class="btn btn-outline btn-sm">
                                            <i data-lucide="share" class="size-3 mr-1"></i>
                                            Share
                                        </button>
                                        <button class="btn btn-outline btn-sm">
                                            <i data-lucide="bar-chart" class="size-3 mr-1"></i>
                                            Results
                                        </button>
                                    </div>
                                </div>

                                <div class="p-3 border border-border rounded-lg">
                                    <div class="flex items-center justify-between mb-2">
                                        <h4 class="font-medium">Reading Comprehension</h4>
                                        <span class="px-2 py-1 text-xs rounded bg-primary/10 text-primary">12 questions</span>
                                    </div>
                                    <p class="text-sm text-muted-foreground mb-3">Created 3 days ago • Advanced level</p>
                                    <div class="flex gap-2">
                                        <button class="btn btn-outline btn-sm">
                                            <i data-lucide="edit" class="size-3 mr-1"></i>
                                            Edit
                                        </button>
                                        <button class="btn btn-outline btn-sm">
                                            <i data-lucide="share" class="size-3 mr-1"></i>
                                            Share
                                        </button>
                                        <button class="btn btn-outline btn-sm">
                                            <i data-lucide="bar-chart" class="size-3 mr-1"></i>
                                            Results
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">Quiz Templates</h3>
                            </div>
                            <div class="card-content space-y-3">
                                <button class="w-full p-3 text-left border border-border rounded-lg hover:bg-muted transition-colors">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <h4 class="font-medium">Vocabulary Builder</h4>
                                            <p class="text-sm text-muted-foreground">Test word meanings and usage</p>
                                        </div>
                                        <i data-lucide="chevron-right" class="size-4"></i>
                                    </div>
                                </button>

                                <button class="w-full p-3 text-left border border-border rounded-lg hover:bg-muted transition-colors">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <h4 class="font-medium">Grammar Check</h4>
                                            <p class="text-sm text-muted-foreground">Focus on grammar rules</p>
                                        </div>
                                        <i data-lucide="chevron-right" class="size-4"></i>
                                    </div>
                                </button>

                                <button class="w-full p-3 text-left border border-border rounded-lg hover:bg-muted transition-colors">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <h4 class="font-medium">Reading Comprehension</h4>
                                            <p class="text-sm text-muted-foreground">Test understanding of texts</p>
                                        </div>
                                        <i data-lucide="chevron-right" class="size-4"></i>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getSpellingPracticeSection() {
        return `
            <div class="p-6 space-y-6">
                <div>
                    <h2 class="text-2xl font-semibold mb-2">Spelling Practice</h2>
                    <p class="text-muted-foreground">Improve your spelling skills with interactive exercises</p>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-2 gap-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Current Exercise</h3>
                            <p class="card-description">Listen and spell the word correctly</p>
                        </div>
                        <div class="card-content space-y-4">
                            <div class="text-center p-8 bg-muted rounded-lg">
                                <i data-lucide="volume-2" class="size-16 text-primary mx-auto mb-4"></i>
                                <button class="btn btn-primary mb-4">
                                    <i data-lucide="play" class="size-4 mr-2"></i>
                                    Play Word
                                </button>
                                <p class="text-sm text-muted-foreground">Click to hear the word</p>
                            </div>
                            
                            <div class="space-y-2">
                                <label class="form-label">Your Answer</label>
                                <input type="text" class="form-input text-center text-lg" placeholder="Type the word here...">
                            </div>
                            
                            <div class="flex gap-2">
                                <button class="btn btn-outline flex-1">
                                    <i data-lucide="skip-forward" class="size-4 mr-2"></i>
                                    Skip
                                </button>
                                <button class="btn btn-primary flex-1">
                                    <i data-lucide="check" class="size-4 mr-2"></i>
                                    Check Answer
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Session Progress</h3>
                        </div>
                        <div class="card-content space-y-4">
                            <div class="flex items-center justify-between">
                                <span>Word 3 of 10</span>
                                <span class="text-primary font-medium">70% Correct</span>
                            </div>
                            <div class="w-full bg-muted rounded-full h-2">
                                <div class="bg-primary h-2 rounded-full" style="width: 30%"></div>
                            </div>
                            <div class="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div class="text-2xl font-bold text-primary">7</div>
                                    <p class="text-xs text-muted-foreground">Correct</p>
                                </div>
                                <div>
                                    <div class="text-2xl font-bold text-destructive">3</div>
                                    <p class="text-xs text-muted-foreground">Incorrect</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-2 gap-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Difficulty Levels</h3>
                        </div>
                        <div class="card-content space-y-3">
                            <button class="w-full p-4 text-left border border-primary bg-primary/5 rounded-lg">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h4 class="font-medium text-primary">Beginner</h4>
                                        <p class="text-sm text-muted-foreground">3-5 letter words</p>
                                    </div>
                                    <i data-lucide="check" class="size-5 text-primary"></i>
                                </div>
                            </button>

                            <button class="w-full p-4 text-left border border-border rounded-lg hover:bg-muted transition-colors">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h4 class="font-medium">Intermediate</h4>
                                        <p class="text-sm text-muted-foreground">6-8 letter words</p>
                                    </div>
                                    <i data-lucide="lock" class="size-5 text-muted-foreground"></i>
                                </div>
                            </button>

                            <button class="w-full p-4 text-left border border-border rounded-lg hover:bg-muted transition-colors">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h4 class="font-medium">Advanced</h4>
                                        <p class="text-sm text-muted-foreground">Complex words & phrases</p>
                                    </div>
                                    <i data-lucide="lock" class="size-5 text-muted-foreground"></i>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Performance</h3>
                        </div>
                        <div class="card-content space-y-3">
                            <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <p class="font-medium text-sm">Yesterday's Session</p>
                                    <p class="text-xs text-muted-foreground">20 words • Beginner</p>
                                </div>
                                <span class="px-2 py-1 text-xs rounded bg-primary text-primary-foreground">85%</span>
                            </div>

                            <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <p class="font-medium text-sm">Practice Session</p>
                                    <p class="text-xs text-muted-foreground">15 words • Beginner</p>
                                </div>
                                <span class="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground">92%</span>
                            </div>

                            <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <p class="font-medium text-sm">Weekly Challenge</p>
                                    <p class="text-xs text-muted-foreground">25 words • Mixed</p>
                                </div>
                                <span class="px-2 py-1 text-xs rounded bg-border text-foreground">78%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-1">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Spelling Tips</h3>
                        </div>
                        <div class="card-content">
                            <div class="p-3 bg-primary/5 rounded-lg border border-primary/20">
                                <h4 class="font-medium text-primary mb-2">💡 Today's Tip</h4>
                                <p class="text-sm">Remember: "I before E, except after C" - like in "receive" and "ceiling"</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getTakeQuizSection() {
        return `
            <div class="p-6 space-y-6">
                <div>
                    <h2 class="text-2xl font-semibold mb-2">Take Quiz</h2>
                    <p class="text-muted-foreground">Test your knowledge with available quizzes</p>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-4">
                                <span class="px-2 py-1 text-xs rounded bg-primary/10 text-primary">10 Questions</span>
                                <i data-lucide="clock" class="size-4 text-muted-foreground"></i>
                            </div>
                            <h3 class="font-semibold mb-2">Grammar Fundamentals</h3>
                            <p class="text-sm text-muted-foreground mb-4">Test your understanding of basic English grammar rules and sentence structure.</p>
                            <div class="flex items-center justify-between text-xs text-muted-foreground mb-4">
                                <span>15 min</span>
                                <span>Beginner</span>
                            </div>
                            <button class="btn btn-primary w-full">
                                Start Quiz
                            </button>
                        </div>
                    </div>

                    <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-4">
                                <span class="px-2 py-1 text-xs rounded bg-secondary/10 text-secondary">15 Questions</span>
                                <i data-lucide="clock" class="size-4 text-muted-foreground"></i>
                            </div>
                            <h3 class="font-semibold mb-2">Vocabulary Builder</h3>
                            <p class="text-sm text-muted-foreground mb-4">Expand your vocabulary with words commonly used in academic and professional settings.</p>
                            <div class="flex items-center justify-between text-xs text-muted-foreground mb-4">
                                <span>20 min</span>
                                <span>Intermediate</span>
                            </div>
                            <button class="btn btn-secondary w-full">
                                Start Quiz
                            </button>
                        </div>
                    </div>

                    <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-4">
                                <span class="px-2 py-1 text-xs rounded bg-primary/10 text-primary">12 Questions</span>
                                <i data-lucide="clock" class="size-4 text-muted-foreground"></i>
                            </div>
                            <h3 class="font-semibold mb-2">Reading Comprehension</h3>
                            <p class="text-sm text-muted-foreground mb-4">Read passages and answer questions to test your understanding and analysis skills.</p>
                            <div class="flex items-center justify-between text-xs text-muted-foreground mb-4">
                                <span>25 min</span>
                                <span>Advanced</span>
                            </div>
                            <button class="btn btn-primary w-full">
                                Start Quiz
                            </button>
                        </div>
                    </div>

                    <div class="card group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div class="card-content p-6">
                            <div class="flex items-center justify-between mb-4">
                                <span class="px-2 py-1 text-xs rounded bg-secondary/10 text-secondary">8 Questions</span>
                                <i data-lucide="clock" class="size-4 text-muted-foreground"></i>
                            </div>
                            <h3 class="font-semibold mb-2">Pronunciation Check</h3>
                            <p class="text-sm text-muted-foreground mb-4">Audio-based quiz to test your pronunciation and listening skills.</p>
                            <div class="flex items-center justify-between text-xs text-muted-foreground mb-4">
                                <span>12 min</span>
                                <span>Intermediate</span>
                            </div>
                            <button class="btn btn-secondary w-full">
                                Start Quiz
                            </button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Scores</h3>
                        </div>
                        <div class="card-content space-y-3">
                            <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <p class="font-medium text-sm">Grammar Fundamentals</p>
                                    <p class="text-xs text-muted-foreground">Completed today</p>
                                </div>
                                <span class="px-2 py-1 text-xs rounded bg-primary text-primary-foreground">92%</span>
                            </div>

                            <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <p class="font-medium text-sm">Vocabulary Builder</p>
                                    <p class="text-xs text-muted-foreground">Yesterday</p>
                                </div>
                                <span class="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground">88%</span>
                            </div>

                            <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                    <p class="font-medium text-sm">Reading Comprehension</p>
                                    <p class="text-xs text-muted-foreground">2 days ago</p>
                                </div>
                                <span class="px-2 py-1 text-xs rounded bg-border text-foreground">76%</span>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Quiz Stats</h3>
                        </div>
                        <div class="card-content space-y-4">
                            <div class="text-center">
                                <div class="text-2xl font-bold text-primary">85%</div>
                                <p class="text-sm text-muted-foreground">Average Score</p>
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span>Quizzes Completed</span>
                                    <span class="font-medium">15</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span>Best Score</span>
                                    <span class="font-medium text-primary">98%</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span>Time Spent</span>
                                    <span class="font-medium">5.2 hours</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recommended</h3>
                        </div>
                        <div class="card-content">
                            <div class="p-3 bg-secondary/5 rounded-lg border border-secondary/20">
                                <h4 class="font-medium text-secondary mb-2">🎯 Focus Area</h4>
                                <p class="text-sm">Based on your recent performance, we recommend practicing more vocabulary exercises.</p>
                                <button class="btn btn-secondary w-full mt-3">
                                    Start Vocabulary Quiz
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getProgressSection() {
        const isTeacher = AppState.userRole === 'teacher';
        
        if (isTeacher) {
            return `
                <div class="p-6 space-y-6">
                    <div>
                        <h2 class="text-2xl font-semibold mb-2">Student Progress</h2>
                        <p class="text-muted-foreground">Monitor and analyze your students' learning progress</p>
                    </div>

                    <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2 space-y-6">
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">Class Overview</h3>
                                </div>
                                <div class="card-content">
                                    <div class="grid grid-cols-3 md:grid-cols-3 gap-4 mb-6">
                                        <div class="text-center p-4 bg-primary/5 rounded-lg">
                                            <div class="text-2xl font-bold text-primary">28</div>
                                            <p class="text-sm text-muted-foreground">Total Students</p>
                                        </div>
                                        <div class="text-center p-4 bg-secondary/5 rounded-lg">
                                            <div class="text-2xl font-bold text-secondary">82%</div>
                                            <p class="text-sm text-muted-foreground">Average Score</p>
                                        </div>
                                        <div class="text-center p-4 bg-primary/5 rounded-lg">
                                            <div class="text-2xl font-bold text-primary">15</div>
                                            <p class="text-sm text-muted-foreground">Active Today</p>
                                        </div>
                                    </div>

                                    <div class="space-y-3">
                                        <div class="flex items-center justify-between p-3 border border-border rounded-lg">
                                            <div class="flex items-center gap-3">
                                                <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <span class="text-sm font-medium">SA</span>
                                                </div>
                                                <div>
                                                    <p class="font-medium">Sarah Anderson</p>
                                                    <p class="text-sm text-muted-foreground">Last active: 2 hours ago</p>
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <div class="text-primary font-medium">94%</div>
                                                <p class="text-xs text-muted-foreground">Average</p>
                                            </div>
                                        </div>

                                        <div class="flex items-center justify-between p-3 border border-border rounded-lg">
                                            <div class="flex items-center gap-3">
                                                <div class="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                                                    <span class="text-sm font-medium">MJ</span>
                                                </div>
                                                <div>
                                                    <p class="font-medium">Michael Johnson</p>
                                                    <p class="text-sm text-muted-foreground">Last active: 1 day ago</p>
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <div class="text-secondary font-medium">87%</div>
                                                <p class="text-xs text-muted-foreground">Average</p>
                                            </div>
                                        </div>

                                        <div class="flex items-center justify-between p-3 border border-border rounded-lg">
                                            <div class="flex items-center gap-3">
                                                <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <span class="text-sm font-medium">EW</span>
                                                </div>
                                                <div>
                                                    <p class="font-medium">Emily Wilson</p>
                                                    <p class="text-sm text-muted-foreground">Last active: 3 hours ago</p>
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <div class="text-primary font-medium">91%</div>
                                                <p class="text-xs text-muted-foreground">Average</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex justify-center mt-4">
                                        <button class="btn btn-outline">View All Students</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">Performance Metrics</h3>
                                </div>
                                <div class="card-content space-y-4">
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-sm">
                                            <span>Reading Comprehension</span>
                                            <span class="font-medium">85%</span>
                                        </div>
                                        <div class="w-full bg-muted rounded-full h-2">
                                            <div class="bg-primary h-2 rounded-full" style="width: 85%"></div>
                                        </div>
                                    </div>
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-sm">
                                            <span>Pronunciation</span>
                                            <span class="font-medium">78%</span>
                                        </div>
                                        <div class="w-full bg-muted rounded-full h-2">
                                            <div class="bg-secondary h-2 rounded-full" style="width: 78%"></div>
                                        </div>
                                    </div>
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-sm">
                                            <span>Spelling</span>
                                            <span class="font-medium">92%</span>
                                        </div>
                                        <div class="w-full bg-muted rounded-full h-2">
                                            <div class="bg-primary h-2 rounded-full" style="width: 92%"></div>
                                        </div>
                                    </div>
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-sm">
                                            <span>Quiz Performance</span>
                                            <span class="font-medium">81%</span>
                                        </div>
                                        <div class="w-full bg-muted rounded-full h-2">
                                            <div class="bg-secondary h-2 rounded-full" style="width: 81%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">Recent Activity</h3>
                                </div>
                                <div class="card-content space-y-3">
                                    <div class="flex items-center gap-3 p-2">
                                        <i data-lucide="user-check" class="size-4 text-primary"></i>
                                        <div>
                                            <p class="text-sm">3 students completed quiz</p>
                                            <p class="text-xs text-muted-foreground">2 hours ago</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3 p-2">
                                        <i data-lucide="book-open" class="size-4 text-secondary"></i>
                                        <div>
                                            <p class="text-sm">New reading lesson assigned</p>
                                            <p class="text-xs text-muted-foreground">5 hours ago</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3 p-2">
                                        <i data-lucide="trending-up" class="size-4 text-primary"></i>
                                        <div>
                                            <p class="text-sm">Class average improved</p>
                                            <p class="text-xs text-muted-foreground">1 day ago</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="p-6 space-y-6">
                    <div>
                        <h2 class="text-2xl font-semibold mb-2">My Progress</h2>
                        <p class="text-muted-foreground">Track your learning journey and achievements</p>
                    </div>

                    <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2 space-y-6">
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">Learning Progress</h3>
                                </div>
                                <div class="card-content space-y-6">
                                    <div class="grid grid-cols-2 md:grid-cols-2 gap-4">
                                        <div class="text-center p-4 bg-primary/5 rounded-lg">
                                            <div class="text-3xl font-bold text-primary">85%</div>
                                            <p class="text-sm text-muted-foreground">Overall Score</p>
                                        </div>
                                        <div class="text-center p-4 bg-secondary/5 rounded-lg">
                                            <div class="text-3xl font-bold text-secondary">7</div>
                                            <p class="text-sm text-muted-foreground">Day Streak</p>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-2 md:grid-cols-1 gap-4">
                                        <div class="space-y-2">
                                            <div class="flex justify-between text-sm">
                                                <span>Reading Comprehension</span>
                                                <span class="font-medium">88%</span>
                                            </div>
                                            <div class="w-full bg-muted rounded-full h-3">
                                                <div class="bg-primary h-3 rounded-full" style="width: 88%"></div>
                                            </div>
                                            <p class="text-xs text-muted-foreground">12 lessons completed</p>
                                        </div>

                                        <div class="space-y-2">
                                            <div class="flex justify-between text-sm">
                                                <span>Pronunciation</span>
                                                <span class="font-medium">82%</span>
                                            </div>
                                            <div class="w-full bg-muted rounded-full h-3">
                                                <div class="bg-secondary h-3 rounded-full" style="width: 82%"></div>
                                            </div>
                                            <p class="text-xs text-muted-foreground">8 sessions completed</p>
                                        </div>

                                        <div class="space-y-2">
                                            <div class="flex justify-between text-sm">
                                                <span>Spelling</span>
                                                <span class="font-medium">91%</span>
                                            </div>
                                            <div class="w-full bg-muted rounded-full h-3">
                                                <div class="bg-primary h-3 rounded-full" style="width: 91%"></div>
                                            </div>
                                            <p class="text-xs text-muted-foreground">15 exercises completed</p>
                                        </div>

                                        <div class="space-y-2">
                                            <div class="flex justify-between text-sm">
                                                <span>Quiz Performance</span>
                                                <span class="font-medium">85%</span>
                                            </div>
                                            <div class="w-full bg-muted rounded-full h-3">
                                                <div class="bg-secondary h-3 rounded-full" style="width: 85%"></div>
                                            </div>
                                            <p class="text-xs text-muted-foreground">15 quizzes taken</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">Recent Achievements</h3>
                                </div>
                                <div class="card-content space-y-3">
                                    <div class="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                                        <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                        <i data-lucide="trophy" class="size-5 text-primary"></i>
                                        </div>
                                        <div>
                                        <p class="font-medium">Perfect Score!</p>
                                        <p class="text-sm text-muted-foreground">Got 100% on Grammar Quiz</p>
                                        </div>
                                        <span class="time-label">Today</span>
                                    </div>

                                    <div class="flex items-center gap-3 p-3 bg-secondary/5 rounded-lg">
                                        <div class="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                                        <i data-lucide="flame" class="size-5 text-secondary"></i>
                                        </div>
                                        <div>
                                        <p class="font-medium">Week Streak</p>
                                        <p class="text-sm text-muted-foreground">Practiced 7 days in a row</p>
                                        </div>
                                        <span class="time-label">Yesterday</span>
                                    </div>

                                    <div class="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                                        <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                        <i data-lucide="book-open" class="size-5 text-primary"></i>
                                        </div>
                                        <div>
                                        <p class="font-medium">Reading Master</p>
                                        <p class="text-sm text-muted-foreground">Completed 10 reading lessons</p>
                                        </div>
                                        <span class="time-label">2 days ago</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">Study Stats</h3>
                                </div>
                                <div class="card-content space-y-4">
                                    <div class="text-center">
                                        <div class="text-2xl font-bold text-primary">45h</div>
                                        <p class="text-sm text-muted-foreground">Total Study Time</p>
                                    </div>
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-sm">
                                            <span>This Week</span>
                                            <span class="font-medium">8.5h</span>
                                        </div>
                                        <div class="flex justify-between text-sm">
                                            <span>Daily Average</span>
                                            <span class="font-medium">1.2h</span>
                                        </div>
                                        <div class="flex justify-between text-sm">
                                            <span>Sessions</span>
                                            <span class="font-medium">42</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">Goals</h3>
                                </div>
                                <div class="card-content space-y-3">
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-sm">
                                            <span>Monthly Goal</span>
                                            <span class="font-medium">23/30 days</span>
                                        </div>
                                        <div class="w-full bg-muted rounded-full h-2">
                                            <div class="bg-primary h-2 rounded-full" style="width: 77%"></div>
                                        </div>
                                    </div>
                                    <div class="space-y-2">
                                        <div class="flex justify-between text-sm">
                                            <span>Reading Challenge</span>
                                            <span class="font-medium">12/15 lessons</span>
                                        </div>
                                        <div class="w-full bg-muted rounded-full h-2">
                                            <div class="bg-secondary h-2 rounded-full" style="width: 80%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-header">
                                    <h3 class="card-title">Recommendations</h3>
                                </div>
                                <div class="card-content">
                                    <div class="p-3 bg-secondary/5 rounded-lg border border-secondary/20">
                                        <h4 class="font-medium text-secondary mb-2">💡 Next Step</h4>
                                        <p class="text-sm mb-3">Try intermediate pronunciation exercises to improve your speaking skills.</p>
                                        <button class="btn btn-secondary w-full" onclick="App.renderSection('pronunciation-practice')">
                                            Start Practice
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    getSettingsSection() {
        return `
            <div class="p-6 space-y-6">
                <div>
                    <h2 class="text-2xl font-semibold mb-2">Settings</h2>
                    <p class="text-muted-foreground">Manage your account and application preferences</p>
                </div>

                <div class="grid grid-cols-3 md:grid-cols2 lg:grid-cols-3 gap-4">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Profile Information</h3>
                            <p class="card-description">Update your personal details</p>
                        </div>
                        <div class="card-content space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <label class="form-label">Full Name</label>
                                    <input type="text" class="form-input" value="${AppState.userName}">
                                </div>
                                <div class="space-y-2">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-input" value="demo@eel-learning.com">
                                </div>
                            </div>
                            <div class="space-y-2">
                                <label class="form-label">Role</label>
                                <input type="text" class="form-input" value="${AppState.userRole === 'teacher' ? 'Teacher' : 'Student'}" disabled>
                            </div>
                            <div class="flex justify-end">
                                <button class="btn btn-primary">Save Changes</button>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Learning Preferences</h3>
                            <p class="card-description">Customize your learning experience</p>
                        </div>
                        <div class="card-content space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <label class="form-label">Difficulty Level</label>
                                    <select class="form-input">
                                        <option>Beginner</option>
                                        <option selected>Intermediate</option>
                                        <option>Advanced</option>
                                    </select>
                                </div>
                                <div class="space-y-2">
                                    <label class="form-label">Daily Goal (minutes)</label>
                                    <select class="form-input">
                                        <option>15 minutes</option>
                                        <option>30 minutes</option>
                                        <option selected>60 minutes</option>
                                        <option>90 minutes</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="space-y-3">
                                <label class="form-label">Preferred Learning Areas</label>
                                <div class="space-y-2">
                                    <label class="flex items-center gap-2">
                                        <input type="checkbox" checked>
                                        Reading Comprehension
                                    </label>
                                    <label class="flex items-center gap-2">
                                        <input type="checkbox" checked>
                                        Pronunciation
                                    </label>
                                    <label class="flex items-center gap-2">
                                        <input type="checkbox">
                                        Spelling
                                    </label>
                                    <label class="flex items-center gap-2">
                                        <input type="checkbox" checked>
                                        Grammar
                                    </label>
                                </div>
                            </div>

                            <div class="flex justify-end">
                                <button class="btn btn-primary">Update Preferences</button>
                            </div>
                        </div>
                    </div>

                    ${AppState.userRole === 'teacher' ? `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Teaching Settings</h3>
                            <p class="card-description">Configure your teaching environment</p>
                        </div>
                        <div class="card-content space-y-4">
                            <div class="space-y-2">
                                <label class="form-label">Class Name</label>
                                <input type="text" class="form-input" value="English 101">
                            </div>
                            
                            <div class="space-y-3">
                                <label class="form-label">Auto-Generate Settings</label>
                                <div class="space-y-2">
                                    <label class="flex items-center gap-2">
                                        <input type="checkbox" checked>
                                        Auto-generate quizzes from reading materials
                                    </label>
                                    <label class="flex items-center gap-2">
                                        <input type="checkbox">
                                        Send progress reports to students weekly
                                    </label>
                                    <label class="flex items-center gap-2">
                                        <input type="checkbox" checked>
                                        Enable AI suggestions for lesson improvements
                                    </label>
                                </div>
                            </div>

                            <div class="flex justify-end">
                                <button class="btn btn-primary">Save Settings</button>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="grid grid-cols-2 md:grid-cols2 lg:grid-cols-3 gap-4">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Notifications</h3>
                        </div>
                        <div class="card-content space-y-3">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-medium">Email Notifications</p>
                                    <p class="text-sm text-muted-foreground">Receive updates via email</p>
                                </div>
                                <input type="checkbox" class="toggle" checked>
                            </div>
                            
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-medium">Daily Reminders</p>
                                    <p class="text-sm text-muted-foreground">Practice reminder notifications</p>
                                </div>
                                <input type="checkbox" class="toggle" checked>
                            </div>
                            
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-medium">Achievement Alerts</p>
                                    <p class="text-sm text-muted-foreground">Celebrate your progress</p>
                                </div>
                                <input type="checkbox" class="toggle">
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Audio Settings</h3>
                        </div>
                        <div class="card-content space-y-4">
                            <div class="space-y-2">
                                <label class="form-label">Voice Speed</label>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm">Slow</span>
                                    <input type="range" class="flex-1" min="0.5" max="2" step="0.1" value="1">
                                    <span class="text-sm">Fast</span>
                                </div>
                            </div>
                            
                            <div class="space-y-2">
                                <label class="form-label">Voice Type</label>
                                <select class="form-input">
                                    <option>Female (US)</option>
                                    <option selected>Male (US)</option>
                                    <option>Female (UK)</option>
                                    <option>Male (UK)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Account</h3>
                        </div>
                        <div class="card-content space-y-3">
                            <button class="btn btn-outline w-full">
                                <i data-lucide="download" class="size-4 mr-2"></i>
                                Export Progress Data
                            </button>
                            <button class="btn btn-outline w-full">
                                <i data-lucide="refresh-cw" class="size-4 mr-2"></i>
                                Reset Progress
                            </button>
                            <button class="btn btn-outline w-full" onclick="App.logout()">
                                <i data-lucide="log-out" class="size-4 mr-2"></i>
                                Switch Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i data-lucide="x" class="size-4"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);
        lucide.createIcons();

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Show loading screen initially
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        lucide.createIcons();
    }, 1000);
});