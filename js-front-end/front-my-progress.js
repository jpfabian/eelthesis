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
    var __aiScoresChart = null;
    var __readingScoresChart = null;
    var __pronunciationScoresChart = null;
    var __lastProgressData = null;

    function cssVar(name, fallback) {
        if (typeof fallback === "undefined") fallback = "";
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    function chartTextColor() {
        return cssVar("--muted-foreground", "#64748b");
    }

    function chartGridColor() {
        return cssVar("--chart-grid", cssVar("--border", "rgba(0,0,0,0.1)"));
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
                        backgroundColor: [cssVar("--primary", "#8b5cf6"), cssVar("--chart-remaining", "#e2e8f0")],
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

        const aiQuizzes = quizzes.filter(function (q) { return q.type === "ai"; });
        const readingQuizzes = quizzes.filter(function (q) { return q.type === "reading"; });
        const pronunciationQuizzes = quizzes.filter(function (q) { return q.type === "pronunciation"; });

        function renderScoresChart(canvasId, emptyId, quizList, color, chartRef) {
            const canvas = document.getElementById(canvasId);
            const emptyEl = document.getElementById(emptyId);
            if (!canvas || typeof Chart === "undefined") return;
            destroyChart(chartRef);
            const recent = quizList.slice(0, 12);
            if (emptyEl) emptyEl.classList.toggle("hidden", recent.length > 0);
            const wrapEl = canvas.closest(".my-progress-chart-wrap");
            if (wrapEl) wrapEl.classList.toggle("hidden", recent.length === 0);
            if (recent.length === 0) return;
            const labels = recent.map(function (q) {
                const name = (q.quiz_name || "Quiz").toString();
                return name.length > 18 ? name.slice(0, 15) + "…" : name;
            });
            const values = recent.map(function (q) { return Number.isFinite(q.score) ? q.score : 0; });
            return new Chart(canvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Score (%)",
                        data: values,
                        borderRadius: 6,
                        backgroundColor: color,
                        borderColor: color,
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

        __aiScoresChart = renderScoresChart(
            "my-progress-ai-scores-chart", "my-progress-ai-scores-empty",
            aiQuizzes, cssVar("--primary", "#8b5cf6"), __aiScoresChart
        );
        __readingScoresChart = renderScoresChart(
            "my-progress-reading-scores-chart", "my-progress-reading-scores-empty",
            readingQuizzes, cssVar("--primary", "#8b5cf6"), __readingScoresChart
        );
        __pronunciationScoresChart = renderScoresChart(
            "my-progress-pronunciation-scores-chart", "my-progress-pronunciation-scores-empty",
            pronunciationQuizzes, cssVar("--secondary", "#22c55e"), __pronunciationScoresChart
        );
    }

    function renderStats(data) {
        const overall = data.overall_avg != null ? Number(data.overall_avg) : null;
        const reading = data.reading_avg != null ? Number(data.reading_avg) : null;
        const pronunciation = data.pronunciation_avg != null ? Number(data.pronunciation_avg) : null;
        const ai = data.ai_avg != null ? Number(data.ai_avg) : null;

        const elOverall = document.getElementById("stat-overall");
        if (elOverall) elOverall.textContent = overall != null ? overall + "%" : "—";

        const elReading = document.getElementById("stat-reading");
        if (elReading) elReading.textContent = reading != null ? reading + "%" : "—";

        const elPronunciation = document.getElementById("stat-pronunciation");
        if (elPronunciation) elPronunciation.textContent = pronunciation != null ? pronunciation + "%" : "—";

        const elAi = document.getElementById("stat-ai");
        if (elAi) elAi.textContent = ai != null ? ai + "%" : "—";
    }

    function formatPoints(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return "";
        return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
    }

    function toScoreFraction(quiz) {
        if (!quiz) return "—";
        const displayScore = Number(quiz.display_score);
        const displayTotal = Number(quiz.display_total);
        if (Number.isFinite(displayScore) && Number.isFinite(displayTotal) && displayTotal > 0) {
            return formatPoints(displayScore) + "/" + formatPoints(displayTotal);
        }
        const raw = Number(quiz.raw_score);
        const total = Number(quiz.total_points);
        if (Number.isFinite(raw) && Number.isFinite(total) && total > 0) {
            return formatPoints(raw) + "/" + formatPoints(total);
        }
        if (quiz.score != null && quiz.score !== "") {
            return formatPoints(quiz.score) + "/100";
        }
        return "—";
    }

    function renderQuizHistory(quizzes) {
        const container = document.getElementById("my-progress-breakdown-groups");
        if (!container) return;

        const groups = [
            { key: "ai", title: "AI Quiz Generated Results", empty: "No AI-generated quiz records yet." },
            { key: "reading", title: "Reading Quiz Result Data", empty: "No reading quiz records yet." },
            { key: "pronunciation", title: "Pronunciation Quiz Result Data", empty: "No pronunciation quiz records yet." }
        ];

        function getQuizNamesByType(typeKey) {
            var seen = {};
            var result = [];
            (quizzes || []).forEach(function (q) {
                if (String(q.type || "").toLowerCase() !== typeKey) return;
                var name = String(q.quiz_name || "").trim();
                if (!name || seen[name]) return;
                seen[name] = true;
                var order = Number(q.quiz_order);
                result.push({ name: name, order: Number.isFinite(order) ? order : 999999 });
            });
            return result
                .sort(function (a, b) { return (a.order - b.order) || a.name.localeCompare(b.name); })
                .map(function (item) { return item.name; });
        }

        function renderBreakdownTableByType(typeKey, title, emptyMessage) {
            var quizNames = getQuizNamesByType(typeKey);
            if (!quizNames.length) {
                return (
                    "<section class=\"scores-subtable-group my-progress-breakdown-section\">" +
                    "<div class=\"scores-subtable-head\"><h4 class=\"scores-subtable-title my-progress-breakdown-title\">" + escapeHtml(title) + "</h4></div>" +
                    "<p class=\"scores-section-message\">" + escapeHtml(emptyMessage) + "</p>" +
                    "</section>"
                );
            }
            var totalScore = 0, totalPossible = 0;
            var scoreCells = quizNames.map(function (qName) {
                var q = (quizzes || []).find(function (quiz) {
                    return String(quiz.type || "").toLowerCase() === typeKey && quiz.quiz_name === qName;
                });
                var shownScore = Number(q && q.display_score);
                var shownTotal = Number(q && q.display_total);
                var fallbackScore = Number(q && q.raw_score);
                var fallbackTotal = Number(q && q.total_points);
                var usedScore = Number.isFinite(shownScore) ? shownScore : fallbackScore;
                var usedTotal = Number.isFinite(shownTotal) ? shownTotal : fallbackTotal;
                if (Number.isFinite(usedScore) && Number.isFinite(usedTotal) && usedTotal > 0) {
                    totalScore += usedScore;
                    totalPossible += usedTotal;
                }
                return "<td>" + escapeHtml(toScoreFraction(q)) + "</td>";
            }).join("");
            var totalDisplay = totalPossible > 0 ? formatPoints(totalScore) + "/" + formatPoints(totalPossible) : "—";
            var rowHtml = (
                "<tr>" +
                scoreCells +
                "<td>" + escapeHtml(totalDisplay) + "</td></tr>"
            );
            return (
                "<section class=\"scores-subtable-group\">" +
                "<div class=\"scores-subtable-head\">" +
                "<h4 class=\"scores-subtable-title\">" + escapeHtml(title) + "</h4>" +
                "</div>" +
                "<div class=\"scores-table-scroll my-progress-table-scroll table-scroll\">" +
                "<table class=\"scores-table\">" +
                "<thead><tr>" +
                quizNames.map(function (q) { return "<th>" + escapeHtml(q) + "</th>"; }).join("") +
                "<th>Total</th></tr></thead>" +
                "<tbody>" + rowHtml + "</tbody></table></div>" +
                "</section>"
            );
        }

        container.innerHTML = groups.map(function (g) {
            return renderBreakdownTableByType(g.key, g.title, g.empty);
        }).join("");

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
                __lastProgressData = data;
                renderStats(data);
                renderCharts(data);
                renderQuizHistory(data.quizzes || []);
            } else {
                if (!res.ok && !data) console.error("My progress fetch error: " + res.status + " " + res.statusText);
                __lastProgressData = { completed_count: 0, total_quizzes: 0, quizzes: [] };
                renderStats(__lastProgressData);
                renderCharts(__lastProgressData);
                renderQuizHistory([]);
            }
        } catch (err) {
            console.error("My progress fetch error:", err);
            __lastProgressData = { completed_count: 0, total_quizzes: 0, quizzes: [] };
            renderStats(__lastProgressData);
            renderCharts(__lastProgressData);
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

    function setupThemeObserver() {
        if (window.__myProgressThemeObserver) return;
        window.__myProgressThemeObserver = true;
        var observer = new MutationObserver(function () {
            if (__lastProgressData) {
                renderCharts(__lastProgressData);
            }
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            setupBackToClassesButton();
            if (typeof initializePage === "function") {
                initializePage().then(function () {
                    const userStr = localStorage.getItem("eel_user");
                    const user = userStr ? JSON.parse(userStr) : null;
                    if (user && user.role === "student") {
                        setupThemeObserver();
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
                setupThemeObserver();
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
                setupThemeObserver();
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
        setupThemeObserver();
        loadProgress();
    }
}
})();
