// Teacher Dashboard — stats overview for teachers

function showDashboardError(msg) {
  const container = document.getElementById("teacher-dashboard-stats");
  if (!container) return;
  const alert = document.createElement("div");
  alert.className = "p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20";
  alert.textContent = msg;
  container.insertBefore(alert, container.firstChild);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = await initializePage();
    if (!user || user.role !== "teacher") {
      window.location.href = "classes.html";
      return;
    }

    const fromEl = document.getElementById("teacher-month-from");
    const toEl = document.getElementById("teacher-month-to");
    const yearEl = document.getElementById("teacher-year");
    const from = fromEl ? parseInt(fromEl.value, 10) || 1 : 1;
    const to = toEl ? parseInt(toEl.value, 10) || 6 : 6;
    const year = yearEl ? parseInt(yearEl.value, 10) || new Date().getFullYear() : new Date().getFullYear();
    const range = `${Math.min(from, to)}-${Math.max(from, to)}`;
    await loadTeacherDashboardStats(user, range, year);
  } catch (err) {
    console.error("Error initializing teacher dashboard:", err);
  } finally {
    if (typeof hideLoading === "function") hideLoading();
  }
});

async function loadTeacherDashboardStats(user, range, year) {
  const teacherId = user?.user_id;
  if (!teacherId) return;

  const params = new URLSearchParams({ teacher_id: teacherId });
  if (range) params.set("range", String(range));
  if (year) params.set("year", String(year));
  const url = `${window.API_BASE || ""}/api/teachers-dashboard-stats?${params.toString()}`;
  let data;
  try {
    const res = await fetch(url);
    let json;
    try {
      json = await res.json();
    } catch (_) {
      throw new Error(res.ok ? "Invalid response" : `HTTP ${res.status}`);
    }
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load dashboard stats");
    }
    data = json;
  } catch (err) {
    console.error("Teacher dashboard API error:", err);
    showDashboardError("Could not load stats. Make sure the server is running at http://localhost:3000 and you're logged in as a teacher.");
    return;
  }

  const classesCount = data.classes?.count ?? 0;
  const studentsCount = data.students?.count ?? 0;
  const quizzesCount = data.quizzes?.generatedThisMonth ?? 0;
  const improvementRate = data.analytics?.improvementRate;
  const studentProgress = data.studentProgress || [];

  document.getElementById("teacher-stat-classes").textContent = String(classesCount);
  document.getElementById("teacher-stat-students").textContent = String(studentsCount);
  document.getElementById("teacher-stat-quizzes").textContent = String(quizzesCount);
  document.getElementById("teacher-stat-improvement").textContent =
    improvementRate != null ? `${improvementRate}%` : "—";

  const readingSkill = studentProgress.find((s) => (s.skill || "").toLowerCase().includes("reading"));
  const pronSkill = studentProgress.find((s) => (s.skill || "").toLowerCase().includes("pronunciation"));

  const monthly = data.monthlyProgress || {};
  const monthLabels = monthly.months || [];
  const readingData = monthly.reading || [];
  const pronData = monthly.pronunciation || [];

  renderMergedLineChart("teacher-merged-line-svg", monthLabels, readingData, pronData);

  const fromEl = document.getElementById("teacher-month-from");
  const toEl = document.getElementById("teacher-month-to");
  const yearEl = document.getElementById("teacher-year");
  const [fromVal, toVal] = (range || "1-6").split("-").map((x) => parseInt(x, 10));
  const currentYear = new Date().getFullYear();
  if (fromEl) fromEl.value = String(fromVal || 1);
  if (toEl) toEl.value = String(toVal || 6);
  if (yearEl) {
    if (!yearEl.options.length) {
      for (let y = currentYear; y >= currentYear - 5; y--) {
        const opt = document.createElement("option");
        opt.value = String(y);
        opt.textContent = String(y);
        if (y === currentYear) opt.selected = true;
        yearEl.appendChild(opt);
      }
    }
    yearEl.value = String(year ?? currentYear);
  }
  if (fromEl && toEl && !fromEl._teacherFilterWired) {
    fromEl._teacherFilterWired = true;
    toEl._teacherFilterWired = true;
    const applyFilter = () => {
      const f = parseInt(fromEl.value, 10) || 1;
      const t = parseInt(toEl.value, 10) || 6;
      const y = yearEl ? parseInt(yearEl.value, 10) || currentYear : currentYear;
      loadTeacherDashboardStats(user, `${Math.min(f, t)}-${Math.max(f, t)}`, y);
    };
    fromEl.addEventListener("change", applyFilter);
    toEl.addEventListener("change", applyFilter);
    if (yearEl) yearEl.addEventListener("change", applyFilter);
  }

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function renderMergedLineChart(svgId, months, readingValues, pronValues) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const padding = { top: 30, right: 40, bottom: 45, left: 58 };
  const w = 720;
  const h = 220;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const maxVal = 100;
  const minVal = 0;
  const range = maxVal - minVal;

  const readingColor = "var(--primary)";
  const pronColor = "var(--secondary)";

  const readingPoints = readingValues.map((v, i) => {
    const x = padding.left + (i / Math.max(1, readingValues.length - 1)) * chartW;
    const y = padding.top + chartH - ((v - minVal) / range) * chartH;
    return { x, y, v };
  });
  const pronPoints = pronValues.map((v, i) => {
    const x = padding.left + (i / Math.max(1, pronValues.length - 1)) * chartW;
    const y = padding.top + chartH - ((v - minVal) / range) * chartH;
    return { x, y, v };
  });

  const pathD = (pts) => pts.length > 0 ? "M " + pts.map((p) => `${p.x} ${p.y}`).join(" L ") : "";
  const areaD = (pts, color) => {
    if (pts.length === 0) return "";
    const yBase = padding.top + chartH;
    return `M ${pts[0].x} ${yBase} L ` + pts.map((p) => `${p.x} ${p.y}`).join(" L ") + ` L ${pts[pts.length - 1].x} ${yBase} Z`;
  };

  const gradId1 = "teacher-merged-grad-reading";
  const gradId2 = "teacher-merged-grad-pron";
  const glowId = "teacher-chart-glow";

  const gridLines = [100, 75, 50, 25, 0].map((pct) => {
    const y = padding.top + chartH - ((pct - minVal) / range) * chartH;
    return `<line x1="${padding.left}" y1="${y}" x2="${w - padding.right}" y2="${y}" stroke="var(--border)" stroke-dasharray="4 4" opacity="0.6"/>`;
  }).join("");

  const yAxisLabels = [100, 75, 50, 25, 0].map((pct) => {
    const y = padding.top + chartH - ((pct - minVal) / range) * chartH;
    return `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" class="teacher-progress-y-axis" font-size="10">${pct}%</text>`;
  }).join("");

  const monthAxis = months.map((m, i) => {
    const x = padding.left + (i / Math.max(1, months.length - 1)) * chartW;
    return `<text x="${x}" y="${h - 10}" text-anchor="middle" class="teacher-progress-line-axis" font-size="11">${m}</text>`;
  }).join("");

  const readingPath = pathD(readingPoints);
  const pronPath = pathD(pronPoints);
  const readingArea = areaD(readingPoints, readingColor);
  const pronArea = areaD(pronPoints, pronColor);

  const readingCircles = readingPoints.map((p, i) => `<g class="teacher-chart-point" data-index="${i}"><circle cx="${p.x}" cy="${p.y}" r="8" fill="transparent"/><circle cx="${p.x}" cy="${p.y}" r="4" fill="${readingColor}" stroke="var(--card)" stroke-width="2"/></g>`).join("");
  const pronCircles = pronPoints.map((p, i) => `<g class="teacher-chart-point" data-index="${i}"><circle cx="${p.x}" cy="${p.y}" r="8" fill="transparent"/><circle cx="${p.x}" cy="${p.y}" r="4" fill="${pronColor}" stroke="var(--card)" stroke-width="2"/></g>`).join("");

  const readingLabels = readingPoints.map((p) => {
    if (!p.v || p.v <= 0) return "";
    return `<text x="${p.x}" y="${Math.max(padding.top - 4, p.y - 14)}" text-anchor="middle" class="teacher-progress-line-label teacher-progress-line-label--reading" font-size="11" fill="${readingColor}">${Math.round(p.v)}%</text>`;
  }).join("");
  const pronLabels = pronPoints.map((p) => {
    if (!p.v || p.v <= 0) return "";
    return `<text x="${p.x}" y="${Math.min(h - padding.bottom + 4, p.y + 16)}" text-anchor="middle" class="teacher-progress-line-label teacher-progress-line-label--pron" font-size="11" fill="${pronColor}">${Math.round(p.v)}%</text>`;
  }).join("");

  svg.innerHTML = `
    <defs>
      <filter id="${glowId}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="${gradId1}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${readingColor}" stop-opacity="0.4"/>
        <stop offset="60%" stop-color="${readingColor}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="${readingColor}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${gradId2}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${pronColor}" stop-opacity="0.4"/>
        <stop offset="60%" stop-color="${pronColor}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="${pronColor}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="${padding.left}" y="${padding.top}" width="${chartW}" height="${chartH}" rx="8" class="teacher-chart-bg"/>
    <g class="teacher-progress-line-grid">${gridLines}</g>
    ${yAxisLabels}
    <path fill="url(#${gradId1})" d="${readingArea}" class="teacher-chart-area"/>
    <path fill="url(#${gradId2})" d="${pronArea}" class="teacher-chart-area"/>
    <path fill="none" stroke="${readingColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="${readingPath}" class="teacher-chart-line teacher-chart-line--reading" filter="url(#${glowId})"/>
    <path fill="none" stroke="${pronColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="${pronPath}" class="teacher-chart-line teacher-chart-line--pron" filter="url(#${glowId})"/>
    ${readingCircles}
    ${pronCircles}
    ${readingLabels}
    ${pronLabels}
    ${monthAxis}
  `;

  setupChartTooltip(svg, months, readingPoints, pronPoints, padding, w, h, chartW);
}

function setupChartTooltip(svg, months, readingPoints, pronPoints, padding, w, h, chartW) {
  const tooltip = document.getElementById("teacher-chart-tooltip");
  const wrap = svg.closest(".teacher-progress-line-wrap");
  if (!tooltip || !wrap) return;

  const showTooltip = (idx, x, y) => {
    if (idx < 0 || idx >= months.length) return;
    const month = months[idx] || "";
    const reading = readingPoints[idx];
    const pron = pronPoints[idx];
    const rVal = reading ? Math.round(reading.v) : 0;
    const pVal = pron ? Math.round(pron.v) : 0;
    tooltip.innerHTML = `
      <div class="teacher-chart-tooltip-month">${month}</div>
      <div class="teacher-chart-tooltip-row"><span class="teacher-chart-tooltip-dot" style="background: var(--primary)"></span> Reading: ${rVal}%</div>
      <div class="teacher-chart-tooltip-row"><span class="teacher-chart-tooltip-dot" style="background: var(--secondary)"></span> Pronunciation: ${pVal}%</div>
    `;
    tooltip.classList.remove("hidden");
    const rect = wrap.getBoundingClientRect();
    const localX = x - rect.left;
    const localY = y - rect.top;
    const tw = 140;
    const th = 70;
    let tx = localX + 12;
    let ty = localY - th - 8;
    if (tx + tw > rect.width) tx = localX - tw - 12;
    if (tx < 0) tx = 8;
    if (ty < 0) ty = localY + 12;
    if (ty + th > rect.height) ty = rect.height - th - 8;
    tooltip.style.left = tx + "px";
    tooltip.style.top = ty + "px";
  };

  const hideTooltip = () => {
    tooltip.classList.add("hidden");
  };

  const getSvgPoint = (clientX, clientY) => {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  wrap.addEventListener("mousemove", (e) => {
    const pt = getSvgPoint(e.clientX, e.clientY);
    if (pt.x < padding.left || pt.x > w - padding.right || pt.y < padding.top || pt.y > h - padding.bottom) {
      hideTooltip();
      return;
    }
    const relX = pt.x - padding.left;
    const idx = Math.round((relX / chartW) * (months.length - 1));
    const clampedIdx = Math.max(0, Math.min(idx, months.length - 1));
    showTooltip(clampedIdx, e.clientX, e.clientY);
  });

  wrap.addEventListener("mouseleave", hideTooltip);
}
