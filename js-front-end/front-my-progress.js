(function () {
    "use strict";

    const API_BASE = window.API_BASE || "";

    function hideLoading() {
        const el = document.getElementById("loading-screen");
        if (el) el.classList.add("hidden");
        const app = document.getElementById("main-app");
        if (app) app.classList.remove("hidden");
    }

    function showLoading() {
        const el = document.getElementById("loading-screen");
        if (el) el.classList.remove("hidden");
        const app = document.getElementById("main-app");
        if (app) app.classList.add("hidden");
    }

    function escapeHtml(str) {
        if (str == null) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(dateStr) {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleDateString(undefined, { dateStyle: "short" }) + " " + d.toLocaleTimeString(undefined, { timeStyle: "short" });
    }

    var __completionChart = null;
    var __scoresChart = null;

    function cssVar(name, fallback) {
        if (typeof fallback === "undefined") fallback = "";
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    function chartTextColor() {
        return cssVar("--muted-foreground", "#64748b");
    }

    function chartGridColor() {
        return cssVar("--border", "rgba(0,0,0,0.1)");
    }

    function destroyChart(ch) {
        try { if (ch && ch.destroy) ch.destroy(); } catch (_) {}
    }

    function renderCharts(data) {
        const completed = Math.max(0, Number(data.completed_count ?? 0));
        const total = Math.max(0, Number(data.total_quizzes ?? 0));
        const remaining = Math.max(0, total - completed);
        const quizzes = data.quizzes || [];

        const completionCanvas = document.getElementById("my-progress-completion-chart");
        if (completionCanvas && typeof Chart !== "undefined") {
            destroyChart(__completionChart);
            __completionChart = new Chart(completionCanvas.getContext("2d"), {
                type: "doughnut",
                data: {
                    labels: ["Completed", "Remaining"],
                    datasets: [{
                        data: [completed, remaining],
                        backgroundColor: [cssVar("--primary", "#8b5cf6"), cssVar("--muted", "#f1f5f9")],
                        borderColor: cssVar("--card", "#ffffff"),
                        borderWidth: 2,
                        hoverOffset: 6,
                        cutout: "62%"
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "bottom", labels: { color: chartTextColor() } },
                        tooltip: {
                            callbacks: {
                                label: function (ctx) {
                                    const v = Number(ctx.raw || 0);
                                    const pct = total > 0 ? Math.round((v / total) * 1000) / 10 : 0;
                                    return " " + ctx.label + ": " + v + " (" + pct + "%)";
                                }
                            }
                        }
                    }
                }
            });
        }

        const scoresCanvas = document.getElementById("my-progress-scores-chart");
        if (scoresCanvas && typeof Chart !== "undefined") {
            destroyChart(__scoresChart);
            const recent = quizzes.slice(0, 12);
            const labels = recent.map(function (q, i) {
                const name = (q.quiz_name || "Quiz").toString();
                return name.length > 18 ? name.slice(0, 15) + "…" : name;
            });
            const values = recent.map(function (q) { return Number.isFinite(q.score) ? q.score : 0; });
            __scoresChart = new Chart(scoresCanvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Score (%)",
                        data: values,
                        borderRadius: 6,
                        backgroundColor: cssVar("--secondary", "#22c55e"),
                        borderColor: cssVar("--secondary", "#22c55e"),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: "y",
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            grid: { color: chartGridColor() },
                            ticks: { color: chartTextColor(), callback: function (v) { return v + "%"; } }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: chartTextColor(), maxRotation: 0, autoSkip: true }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (ctx) { return " " + ctx.parsed.x + "%"; }
                            }
                        }
                    }
                }
            });
        }
    }

    function renderStats(data) {
        const completed = Number(data.completed_count ?? 0);
        const total = Number(data.total_quizzes ?? 0);
        const overall = data.overall_avg != null ? Number(data.overall_avg) : null;
        const reading = data.reading_avg != null ? Number(data.reading_avg) : null;
        const pronunciation = data.pronunciation_avg != null ? Number(data.pronunciation_avg) : null;
        const completionRate = Number(data.completion_rate ?? 0);

        const elCompleted = document.getElementById("stat-completed");
        const elCompletedSub = document.getElementById("stat-completed-sub");
        if (elCompleted) elCompleted.textContent = String(completed);
        if (elCompletedSub) elCompletedSub.textContent = "of " + total + " total";

        const elOverall = document.getElementById("stat-overall");
        if (elOverall) elOverall.textContent = overall != null ? overall + "%" : "—";

        const elReading = document.getElementById("stat-reading");
        if (elReading) elReading.textContent = reading != null ? reading + "%" : "—";

        const elPronunciation = document.getElementById("stat-pronunciation");
        if (elPronunciation) elPronunciation.textContent = pronunciation != null ? pronunciation + "%" : "—";

        const elRate = document.getElementById("stat-completion-rate");
        if (elRate) elRate.textContent = String(completionRate);
        const elRateSub = document.getElementById("stat-completion-sub");
        if (elRateSub) elRateSub.textContent = "You have completed " + completed + " of " + total + " available quizzes.";
    }

    function renderQuizHistory(quizzes) {
        const emptyEl = document.getElementById("quiz-history-empty");
        const wrapEl = document.getElementById("quiz-history-wrap");
        const tbody = document.getElementById("quiz-history-body");
        if (!tbody) return;

        if (!quizzes || quizzes.length === 0) {
            if (emptyEl) emptyEl.classList.remove("hidden");
            if (wrapEl) wrapEl.classList.add("hidden");
            tbody.innerHTML = "";
            return;
        }

        if (emptyEl) emptyEl.classList.add("hidden");
        if (wrapEl) wrapEl.classList.remove("hidden");
        tbody.innerHTML = quizzes
            .map(function (q) {
                const typeLabel = q.type === "reading" ? "Reading" : "Pronunciation";
                const typeIcon = q.type === "reading" ? "book-open" : "mic";
                return (
                    "<tr class=\"border-b border-border\">" +
                    "<td class=\"py-3\">" + escapeHtml(q.quiz_name || "—") + "</td>" +
                    "<td class=\"py-3\"><span class=\"inline-flex items-center gap-1\"><i data-lucide=\"" + typeIcon + "\" class=\"size-4\"></i>" + escapeHtml(typeLabel) + "</span></td>" +
                    "<td class=\"py-3 font-medium\">" + (Number.isFinite(q.score) ? q.score + "%" : "—") + "</td>" +
                    "<td class=\"py-3 text-muted-foreground text-sm\">" + escapeHtml(formatDate(q.end_time)) + "</td>" +
                    "</tr>"
                );
            })
            .join("");

        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    async function loadProgress() {
        const userStr = localStorage.getItem("eel_user");
        if (!userStr) {
            hideLoading();
            return;
        }
        let user;
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            hideLoading();
            return;
        }
        const studentId = user.user_id;
        if (!studentId) {
            hideLoading();
            return;
        }
        if (user.role !== "student") {
            hideLoading();
            return;
        }

        const selectedClass = JSON.parse(localStorage.getItem("eel_selected_class") || "{}");
        const classId = selectedClass?.id || selectedClass?.class_id;
        let url = API_BASE + "/api/my-progress?student_id=" + encodeURIComponent(studentId);
        if (classId) url += "&class_id=" + encodeURIComponent(classId);

        try {
            const res = await fetch(url);
            const text = await res.text();
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (_) {
                console.warn("My progress: server returned non-JSON (status " + res.status + "). Is the backend running on " + API_BASE + "?");
            }
            if (data && data.success) {
                renderStats(data);
                renderCharts(data);
                renderQuizHistory(data.quizzes || []);
            } else {
                if (!res.ok && !data) console.error("My progress fetch error: " + res.status + " " + res.statusText);
                renderStats({ completed_count: 0, total_quizzes: 0, completion_rate: 0 });
                renderCharts({ completed_count: 0, total_quizzes: 0, quizzes: [] });
                renderQuizHistory([]);
            }
        } catch (err) {
            console.error("My progress fetch error:", err);
            renderStats({ completed_count: 0, total_quizzes: 0, completion_rate: 0 });
            renderCharts({ completed_count: 0, total_quizzes: 0, quizzes: [] });
            renderQuizHistory([]);
        } finally {
            hideLoading();
            if (window.lucide && typeof window.lucide.createIcons === "function") {
                window.lucide.createIcons();
            }
        }
    }

    function setupBackToClassesButton() {
        const backBtn = document.getElementById("back-class-btn");
        if (backBtn) backBtn.addEventListener("click", function () { window.location.href = "classes.html"; });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            setupBackToClassesButton();
            if (typeof initializePage === "function") {
                initializePage().then(function () {
                    const userStr = localStorage.getItem("eel_user");
                    const user = userStr ? JSON.parse(userStr) : null;
                    if (user && user.role === "student") {
                        loadProgress();
                    } else {
                        hideLoading();
                        if (user && user.role !== "student") {
                            window.location.href = "classes.html";
                        }
                    }
                }).catch(function () {
                    hideLoading();
                });
            } else {
                loadProgress();
            }
        });
    } else {
        setupBackToClassesButton();
        if (typeof initializePage === "function") {
            initializePage().then(function () {
                const userStr = localStorage.getItem("eel_user");
                const user = userStr ? JSON.parse(userStr) : null;
                if (user && user.role === "student") {
                    loadProgress();
                } else {
                    hideLoading();
                    if (user && user.role !== "student") {
                        window.location.href = "classes.html";
                    }
                }
            }).catch(function () {
                hideLoading();
            });
        } else {
            loadProgress();
        }
    }
})();
