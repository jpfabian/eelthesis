(function () {
  const MASTER_ADMIN_TOKEN_KEY = "eel_master_admin_token";

  function getMasterAdminToken() {
    return localStorage.getItem(MASTER_ADMIN_TOKEN_KEY) || "";
  }

  function apiHeaders() {
    return {
      "Content-Type": "application/json",
      "x-master-admin-token": getMasterAdminToken(),
    };
  }

  async function ensureMasterAdmin() {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const token = getMasterAdminToken();
    if (!user || user.role !== "master_admin" || !token) {
      window.location.href = "login.html";
      return null;
    }
    return user;
  }

  async function loadSubjects() {
    const res = await fetch((window.API_BASE || "") + "/api/master-admin/subjects", {
      headers: apiHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to load subjects");
    return data.subjects || [];
  }

  async function loadLessons(subjectId) {
    const res = await fetch(
      (window.API_BASE || "") + "/api/master-admin/lessons?subject_id=" + encodeURIComponent(subjectId),
      { headers: apiHeaders() }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to load lessons");
    return data.lessons || [];
  }

  function fillSubjectSelect(selectId, subjects, emptyOption = "Select subject...") {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = "<option value=\"\">" + emptyOption + "</option>";
    (subjects || []).forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.subject_id;
      opt.textContent = s.subject_name;
      el.appendChild(opt);
    });
  }

  function fillLessonSelect(lessons, emptyOption = "Select lesson...") {
    const el = document.getElementById("topic-lesson-id");
    if (!el) return;
    el.innerHTML = "<option value=\"\">" + emptyOption + "</option>";
    (lessons || []).forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.lesson_id;
      opt.textContent = l.lesson_title;
      el.appendChild(opt);
    });
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDateMMDDYYYY(dateStr) {
    if (!dateStr) return "";
    const s = String(dateStr).slice(0, 10);
    const parts = s.split("-");
    if (parts.length !== 3) return s;
    return parts[1] + "-" + parts[2] + "-" + parts[0];
  }

  async function loadAdmins() {
    const res = await fetch((window.API_BASE || "") + "/api/master-admin/admins", { headers: apiHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to load admins");
    return data.admins || [];
  }

  function renderAdminsTable(admins) {
    const tbody = document.getElementById("master-admin-admins-tbody");
    const emptyEl = document.getElementById("master-admin-admins-empty");
    const tableWrap = document.querySelector(".master-admin-admins-table-wrap");
    if (!tbody) return;
    if (!admins || admins.length === 0) {
      tbody.innerHTML = "";
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (tableWrap) tableWrap.classList.add("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");
    if (tableWrap) tableWrap.classList.remove("hidden");
    tbody.innerHTML = admins
      .map(
        (a) => `
        <tr class="master-admin-admins-row">
          <td class="master-admin-admins-cell master-admin-admins-cell-name">${escapeHtml((a.fname || "") + " " + (a.lname || "")).trim() || "—"}</td>
          <td class="master-admin-admins-cell">${escapeHtml(a.email || "")}</td>
          <td class="master-admin-admins-cell">
            <span class="master-admin-admins-status master-admin-admins-status--${a.is_active ? "active" : "deactivated"}">
              ${a.is_active ? "Active" : "Deactivated"}
            </span>
          </td>
          <td class="master-admin-admins-cell master-admin-admins-cell-muted">${escapeHtml(a.created_at ? formatDateMMDDYYYY(a.created_at) : "—")}</td>
          <td class="master-admin-admins-cell master-admin-admins-cell-actions">
            ${a.is_active ? `<button type="button" class="btn btn-destructive btn-sm rounded-full master-admin-deactivate-btn inline-flex items-center gap-2" data-user-id="${a.user_id}" data-email="${escapeHtml(a.email || "")}"><i data-lucide="circle-slash" class="size-4"></i>Deactivate</button>` : `<button type="button" class="btn btn-outline btn-sm master-admin-activate-btn" data-user-id="${a.user_id}">Activate</button>`}
          </td>
        </tr>
      `
      )
      .join("");
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  const CURR_PAGE_SIZE = 10;
  let curriculumSubjects = [];
  let curriculumLessons = [];
  let curriculumTopics = [];
  let curriculumSubjectsPage = 1;
  let curriculumLessonsPage = 1;
  let curriculumTopicsPage = 1;

  async function loadAllLessons() {
    const res = await fetch((window.API_BASE || "") + "/api/master-admin/lessons/all", { headers: apiHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to load lessons");
    return data.lessons || [];
  }

  async function loadAllTopics() {
    const res = await fetch((window.API_BASE || "") + "/api/master-admin/topics/all", { headers: apiHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to load topics");
    return data.topics || [];
  }

  function updatePaginationControls(kind, total, page) {
    const pageSize = CURR_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
    const wrap = document.getElementById("curriculum-" + kind + "-pagination");
    const label = document.getElementById("curriculum-" + kind + "-page-label");
    const prev = document.getElementById("curriculum-" + kind + "-prev");
    const next = document.getElementById("curriculum-" + kind + "-next");
    if (!wrap || !label || !prev || !next) return;
    if (total <= pageSize) {
      wrap.classList.add("hidden");
      return;
    }
    wrap.classList.remove("hidden");
    label.textContent = "Page " + page + " of " + totalPages;
    prev.disabled = page <= 1;
    next.disabled = page >= totalPages;
  }

  function renderCurriculumSubjectsTable(subjects, page) {
    if (subjects) {
      curriculumSubjects = subjects;
      curriculumSubjectsPage = 1;
    }
    const data = curriculumSubjects || [];
    const pageNum = page || curriculumSubjectsPage || 1;
    curriculumSubjectsPage = pageNum;
    const tbody = document.getElementById("curriculum-subjects-tbody");
    const emptyEl = document.getElementById("curriculum-subjects-empty");
    if (!tbody) return;
    const tableWrap = tbody.closest(".curriculum-box")?.querySelector(".curriculum-table-wrap");
    if (!data || data.length === 0) {
      tbody.innerHTML = "";
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (tableWrap) tableWrap.classList.add("hidden");
      updatePaginationControls("subjects", 0, 1);
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");
    if (tableWrap) tableWrap.classList.remove("hidden");
    const start = (pageNum - 1) * CURR_PAGE_SIZE;
    const slice = data.slice(start, start + CURR_PAGE_SIZE);
    tbody.innerHTML = slice
      .map(
        (s) => `
        <tr class="curriculum-row">
          <td class="curriculum-cell curriculum-cell-name">${escapeHtml(s.subject_name || "")}</td>
          <td class="curriculum-cell curriculum-cell-actions">
            <button type="button" class="btn btn-outline btn-sm curriculum-delete-btn curriculum-delete-subject-btn" data-id="${s.subject_id}">Delete</button>
          </td>
        </tr>
      `
      )
      .join("");
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    updatePaginationControls("subjects", data.length, pageNum);
  }

  const S3_LESSON_BASE = "https://eel-bucket.s3.ap-southeast-1.amazonaws.com";

  let __masterAdminCurrentTopic = null;
  let __masterAdminCurrentLesson = null;
  let __masterAdminCurrentSubject = null;

  async function fetchTopicContentMasterAdmin(regenerate = false) {
    const topic = __masterAdminCurrentTopic;
    const lesson = __masterAdminCurrentLesson;
    const subject = __masterAdminCurrentSubject;
    if (!topic) return { success: false, error: "No topic" };
    const res = await fetch((window.API_BASE || "") + "/api/generate-topic-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_id: topic.topic_id,
        topic_title: topic.topic_title ?? "Topic",
        lesson_title: (lesson && lesson.lesson_title) ?? "",
        subject_name: (subject && subject.subject_name) ?? "",
        regenerate: !!regenerate,
        always_5_slides: !!regenerate,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || "Request failed" };
    return data;
  }

  function enhanceLessonTopicPresentation(contentEl) {
    if (!contentEl || contentEl.dataset.enhancedPresentation === "true") return;
    const originalNodes = Array.from(contentEl.childNodes);
    if (!originalNodes.length) return;
    const deck = document.createElement("div");
    deck.className = "lesson-topic-deck";
    let slide = null;
    let slideBody = null;
    const createSlide = (headingEl) => {
      const article = document.createElement("article");
      article.className = "lesson-topic-slide";
      const header = document.createElement("div");
      header.className = "lesson-topic-slide__header";
      const badge = document.createElement("span");
      badge.className = "lesson-topic-slide__badge";
      badge.textContent = deck.children.length === 0 ? "Overview" : "Slide " + (deck.children.length + 1);
      const title = document.createElement("div");
      title.className = "lesson-topic-slide__title";
      title.innerHTML = headingEl.outerHTML;
      header.appendChild(badge);
      header.appendChild(title);
      const body = document.createElement("div");
      body.className = "lesson-topic-slide__body";
      article.appendChild(header);
      article.appendChild(body);
      deck.appendChild(article);
      return { article, body };
    };
    originalNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && !String(node.textContent || "").trim()) return;
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "H2") {
        const created = createSlide(node);
        slide = created.article;
        slideBody = created.body;
        return;
      }
      if (!slide || !slideBody) {
        const fallbackHeading = document.createElement("h2");
        fallbackHeading.textContent = "Topic Highlights";
        const created = createSlide(fallbackHeading);
        slide = created.article;
        slideBody = created.body;
      }
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "H3") {
        const headingText = String(node.textContent || "").trim().toLowerCase();
        const isAccentH2 = /example scenario|quick examples|key takeaways/.test(headingText);
        if (isAccentH2) {
          const h2 = document.createElement("h2");
          h2.innerHTML = node.innerHTML;
          if (/example|scenario/.test(headingText)) h2.classList.add("lesson-topic-accent-heading", "lesson-topic-accent-heading--scenario");
          if (/takeaway|summary|quick examples/.test(headingText)) h2.classList.add("lesson-topic-accent-heading", "lesson-topic-accent-heading--takeaway");
          const created = createSlide(h2);
          slide = created.article;
          slideBody = created.body;
          return;
        }
        if (/example|scenario/.test(headingText)) node.classList.add("lesson-topic-accent-heading", "lesson-topic-accent-heading--scenario");
        if (/takeaway|summary|quick examples/.test(headingText)) node.classList.add("lesson-topic-accent-heading", "lesson-topic-accent-heading--takeaway");
      }
      slideBody.appendChild(node);
    });
    contentEl.innerHTML = "";
    contentEl.appendChild(deck);
    contentEl.dataset.enhancedPresentation = "true";
  }

  async function viewTopicWithGeneratedContentMasterAdmin(topic, lesson, subject) {
    __masterAdminCurrentTopic = topic;
    __masterAdminCurrentLesson = lesson;
    __masterAdminCurrentSubject = subject;
    const modal = document.getElementById("master-admin-topic-modal");
    const titleEl = document.getElementById("master-admin-topic-title");
    const loadingEl = document.getElementById("master-admin-topic-loading");
    const contentEl = document.getElementById("master-admin-topic-content");
    const regenerateBtn = document.getElementById("master-admin-topic-regenerate-btn");
    const downloadBtn = document.getElementById("master-admin-topic-download-ppt-btn");
    const topicTitle = topic?.topic_title ?? "Topic";
    if (titleEl) titleEl.textContent = topicTitle;
    if (regenerateBtn) regenerateBtn.classList.add("hidden");
    if (downloadBtn) downloadBtn.classList.add("hidden");
    if (loadingEl) loadingEl.style.display = "flex";
    if (contentEl) {
      contentEl.classList.add("hidden");
      contentEl.innerHTML = "";
    }
    if (modal) {
      modal.classList.remove("hidden");
      document.body.classList.add("eel-modal-open");
    }
    setTimeout(() => {
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    }, 50);
    try {
      const data = await fetchTopicContentMasterAdmin(false);
      if (loadingEl) loadingEl.style.display = "none";
      if (!data.success) {
        const errMsg = data.error || "Failed to generate topic content.";
        if (contentEl) {
          contentEl.innerHTML = "<p class=\"text-destructive\">" + escapeHtml(errMsg) + "</p>";
          contentEl.classList.remove("hidden");
        }
        return;
      }
      if (contentEl && data.content) {
        contentEl.innerHTML = data.content;
        delete contentEl.dataset.enhancedPresentation;
        enhanceLessonTopicPresentation(contentEl);
        contentEl.classList.remove("hidden");
        if (regenerateBtn) regenerateBtn.classList.remove("hidden");
        if (downloadBtn) downloadBtn.classList.remove("hidden");
        if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
      }
    } catch (err) {
      if (loadingEl) loadingEl.style.display = "none";
      if (contentEl) {
        contentEl.innerHTML = "<p class=\"text-destructive\">" + escapeHtml(err?.message || "Something went wrong.") + "</p>";
        contentEl.classList.remove("hidden");
      }
    }
  }

  function closeMasterAdminTopicModal() {
    const modal = document.getElementById("master-admin-topic-modal");
    const contentEl = document.getElementById("master-admin-topic-content");
    if (modal) modal.classList.add("hidden");
    document.body.classList.remove("eel-modal-open");
    if (contentEl) contentEl.innerHTML = "";
  }

  async function regenerateMasterAdminTopicContent() {
    const loadingEl = document.getElementById("master-admin-topic-loading");
    const contentEl = document.getElementById("master-admin-topic-content");
    const regenerateBtn = document.getElementById("master-admin-topic-regenerate-btn");
    const downloadBtn = document.getElementById("master-admin-topic-download-ppt-btn");
    if (!__masterAdminCurrentTopic) return;
    if (regenerateBtn) regenerateBtn.disabled = true;
    if (downloadBtn) downloadBtn.classList.add("hidden");
    if (loadingEl) loadingEl.style.display = "flex";
    if (contentEl) contentEl.classList.add("hidden");
    try {
      const data = await fetchTopicContentMasterAdmin(true);
      if (loadingEl) loadingEl.style.display = "none";
      if (!data.success) {
        Swal.fire({ icon: "error", title: "Error", text: data.error || "Failed to regenerate." });
        if (contentEl) contentEl.classList.remove("hidden");
        return;
      }
      if (contentEl && data.content) {
        contentEl.innerHTML = data.content;
        delete contentEl.dataset.enhancedPresentation;
        enhanceLessonTopicPresentation(contentEl);
        contentEl.classList.remove("hidden");
        if (downloadBtn) downloadBtn.classList.remove("hidden");
      }
    } catch (err) {
      if (loadingEl) loadingEl.style.display = "none";
      Swal.fire({ icon: "error", title: "Error", text: err?.message || "Something went wrong." });
      if (contentEl) contentEl.classList.remove("hidden");
    } finally {
      if (regenerateBtn) regenerateBtn.disabled = false;
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    }
  }

  function downloadMasterAdminLessonAsPpt() {
    const contentEl = document.getElementById("master-admin-topic-content");
    const titleEl = document.getElementById("master-admin-topic-title");
    if (!contentEl || !contentEl.innerHTML.trim()) return;

    if (typeof PptxGenJS === "undefined") {
      Swal.fire({ icon: "error", title: "Error", text: "Download library not loaded. Please refresh the page." });
      return;
    }

    const topicTitle = (titleEl?.textContent || "Topic").trim();
    const pres = new PptxGenJS();

    pres.author = "EEL - Efficient English Literacy";
    pres.title = topicTitle;
    pres.layout = "LAYOUT_16x9";

    const VIOLET = "8b5cf6";
    const VIOLET_PALE = "ede9fe";
    const GREEN = "22c55e";
    const GREEN_LIGHT = "4ade80";
    const GREEN_PALE = "dcfce7";
    const SLIDE_BG = "faf5ff";
    const TEXT_DARK = "2d2d33";
    const TEXT_MUTED = "6b7280";

    const nodes = contentEl.querySelectorAll("h2, h3, p, ul, .lesson-topic-slide__body");
    let slideContent = [];
    let currentChars = 0;
    const CHAR_LIMIT_PER_SLIDE = 600; 
    const SLIDE_HEIGHT = 5.625; 

    function addContentSlide(title, content) {
      const slide = pres.addSlide();
      slide.background = { color: SLIDE_BG };

      if (title) {
        slide.addShape(pres.ShapeType.rect, {
          x: 0, y: 0, w: 0.12, h: SLIDE_HEIGHT,
          fill: { color: VIOLET },
        });
        slide.addShape(pres.ShapeType.rect, {
          x: 0.12, y: 0, w: 9.88, h: 0.8,
          fill: { color: VIOLET_PALE, transparency: 50 },
        });
        slide.addText(title, {
          x: 0.5, y: 0.15, w: 8.7, h: 0.5,
          fontSize: 20, bold: true, color: VIOLET,
        });
      }

      if (content && content.length > 0) {
        slide.addText(content, {
          x: 0.5, y: title ? 1.0 : 0.4, w: 8.7, h: title ? 4.0 : 4.6,
          fontSize: 12, color: TEXT_DARK, valign: "top",
          lineSpacing: 18,
        });
      }

      slide.addShape(pres.ShapeType.rect, {
        x: 0, y: 5.225, w: 5, h: 0.4,
        fill: { color: VIOLET },
      });
      slide.addShape(pres.ShapeType.rect, {
        x: 5, y: 5.225, w: 5, h: 0.4,
        fill: { color: GREEN },
      });
      slide.addText("EEL", {
        x: 8.8, y: 5.3, w: 0.8, h: 0.25,
        fontSize: 10, bold: true, color: "ffffff",
      });
    }

    function flushSlide(title) {
      if (slideContent.length === 0 && !title) return;
      addContentSlide(title, slideContent);
      slideContent = [];
      currentChars = 0;
    }

    function addToSlide(text, options, extraChars = 0) {
      const len = text.length;
      if (currentChars + len + extraChars > CHAR_LIMIT_PER_SLIDE && slideContent.length > 0) {
        flushSlide(currentH2);
      }
      slideContent.push({ text: text, options: options });
      currentChars += len;
    }

    let hasTitleSlide = false;
    let currentH2 = "";

    nodes.forEach((el, idx) => {
      const tag = el.tagName?.toUpperCase();
      const text = el.textContent?.trim() || "";

      if (["H3", "P", "UL"].includes(tag) && el.parentElement?.classList.contains("lesson-topic-slide__body")) {
        return;
      }

      if (tag === "H2") {
        flushSlide(currentH2);
        currentH2 = text;
        if (!hasTitleSlide) {
          const titleSlide = pres.addSlide();
          titleSlide.background = { color: VIOLET };
          titleSlide.addShape(pres.ShapeType.rect, {
            x: 0, y: 4.8, w: 10, h: 0.4,
            fill: { color: GREEN },
          });
          titleSlide.addShape(pres.ShapeType.rect, {
            x: 0.6, y: 0.8, w: 8.8, h: 2.0,
            fill: { color: "ffffff", transparency: 15 },
          });
          titleSlide.addText(topicTitle, {
            x: 0.8, y: 1.0, w: 8.4, h: 1.2,
            fontSize: 32, bold: true, align: "center", color: VIOLET,
          });
          titleSlide.addText("Efficient English Literacy", {
            x: 0.8, y: 2.2, w: 8.4, h: 0.4,
            fontSize: 16, align: "center", color: GREEN, bold: true,
          });
          titleSlide.addShape(pres.ShapeType.rect, {
            x: 4.2, y: 2.8, w: 1.6, h: 0.08,
            fill: { color: GREEN },
          });
          hasTitleSlide = true;
        }
      } else if (tag === "H3") {
        const h3Text = text.toLowerCase();
        const isAccentH2 = /example scenario|quick examples|key takeaways/.test(h3Text);

        if (isAccentH2) {
          flushSlide(currentH2);
          currentH2 = text;
          return;
        }

        if (slideContent.length > 0) {
          flushSlide(currentH2);
          currentH2 = "";
        }
        let h3Color = VIOLET;
        if (el.classList.contains("lesson-topic-accent-heading--scenario") || el.classList.contains("lesson-topic-accent-heading--takeaway")) {
          h3Color = GREEN;
        }

        let nextPTextLen = 0;
        for (let i = idx + 1; i < nodes.length; i++) {
          const next = nodes[i];
          const nextTag = next.tagName?.toUpperCase();
          if (nextTag === "P") {
            nextPTextLen = (next.textContent || "").trim().length;
            break;
          } else if (nextTag === "H3" || nextTag === "H2") {
            break;
          }
        }
        addToSlide(text, { bullet: false, bold: true, fontSize: 14, color: h3Color, breakLine: true }, nextPTextLen);
      } else if (tag === "P") {
        addToSlide(text, { bullet: false, color: TEXT_DARK, breakLine: true });
      } else if (tag === "UL") {
        el.querySelectorAll("li").forEach((li) => {
          const liText = li.textContent?.trim();
          if (liText) addToSlide(liText, { bullet: { code: "2022", color: VIOLET }, color: TEXT_DARK, breakLine: true });
        });
      } else if (tag === "DIV" && el.classList.contains("lesson-topic-slide__body")) {
        const children = Array.from(el.childNodes);
        children.forEach((child, cidx) => {
          if (child.nodeType === Node.TEXT_NODE) {
            const t = child.textContent?.trim();
            if (t) addToSlide(t, { bullet: false, color: TEXT_DARK, breakLine: true });
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const ctag = child.tagName?.toUpperCase();
            const ctext = child.textContent?.trim() || "";
            if (ctext) {
              if (ctag === "H3") {
                const h3Text = ctext.toLowerCase();
                const isAccentH2 = /example scenario|quick examples|key takeaways/.test(h3Text);

                if (isAccentH2) {
                  flushSlide(currentH2);
                  currentH2 = ctext;
                  return;
                }

                let h3Color = VIOLET;
                if (child.classList.contains("lesson-topic-accent-heading--scenario") || child.classList.contains("lesson-topic-accent-heading--takeaway")) h3Color = GREEN;

                let nextCPTextLen = 0;
                for (let j = cidx + 1; j < children.length; j++) {
                  const nchild = children[j];
                  if (nchild.nodeType === Node.ELEMENT_NODE) {
                    const ntag = nchild.tagName?.toUpperCase();
                    if (ntag === "P") {
                      nextCPTextLen = (nchild.textContent || "").trim().length;
                      break;
                    } else if (ntag === "H3") break;
                  }
                }
                addToSlide(ctext, { bullet: false, bold: true, fontSize: 14, color: h3Color, breakLine: true }, nextCPTextLen);
              } else if (ctag === "P") {
                addToSlide(ctext, { bullet: false, color: TEXT_DARK, breakLine: true });
              } else if (ctag === "UL") {
                child.querySelectorAll("li").forEach((li) => {
                  const liText = li.textContent?.trim();
                  if (liText) addToSlide(liText, { bullet: { code: "2022", color: VIOLET }, color: TEXT_DARK, breakLine: true });
                });
              } else {
                addToSlide(ctext, { bullet: false, color: TEXT_DARK, breakLine: true });
              }
            }
          }
        });
      }
    });

    flushSlide(currentH2);

    if (pres.slides.length === 0) {
      const slide = pres.addSlide();
      slide.background = { color: SLIDE_BG };
      slide.addText(topicTitle, {
        x: 0.5, y: 1.5, w: 9, h: 1, fontSize: 28, bold: true, align: "center", color: VIOLET,
      });
      slide.addText(contentEl.textContent?.trim().slice(0, 500) || "No content", {
        x: 0.5, y: 2.8, w: 9, h: 3.5, fontSize: 14, color: TEXT_DARK,
      });
    }

    const safeName = topicTitle.replace(/[<>:"/\\|?*]/g, "_").slice(0, 80);
    pres.writeFile({ fileName: `${safeName}.pptx` });
  }

  function getTopicPdfUrl(pdfPath) {
    const p = String(pdfPath ?? "").trim();
    if (!p) return null;
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    if (p.startsWith("s3://")) {
      const withoutScheme = p.replace(/^s3:\/\/[^/]+\/?/, "");
      if (!withoutScheme) return null;
      const encoded = withoutScheme.split("/").map((seg) => encodeURIComponent(seg)).join("/");
      return S3_LESSON_BASE + "/" + encoded;
    }
    return (window.API_BASE || "") + "/api/lesson-pdf?path=" + encodeURIComponent(p);
  }

  async function loadCurriculumBrowse(subjectId) {
    const res = await fetch(
      (window.API_BASE || "") + "/api/master-admin/curriculum/" + encodeURIComponent(subjectId),
      { headers: apiHeaders() }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to load curriculum");
    return data;
  }

  function renderCurriculumBrowse(data, topicSearch = "") {
    const contentEl = document.getElementById("curriculum-browse-content");
    const emptyEl = document.getElementById("curriculum-browse-empty");
    const placeholder = contentEl?.querySelector(".curriculum-browse-placeholder");
    if (!contentEl) return;
    const search = String(topicSearch || "").trim().toLowerCase();
    if (!data || !data.subject) {
      if (placeholder) placeholder.classList.remove("hidden");
      if (emptyEl) emptyEl.classList.add("hidden");
      contentEl.innerHTML = '<p class="curriculum-browse-placeholder text-muted-foreground">Select a subject to view lessons and topics.</p>';
      return;
    }
    if (placeholder) placeholder.classList.add("hidden");
    const lessons = data.lessons || [];
    if (lessons.length === 0) {
      contentEl.innerHTML = "";
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");
    const subjectName = escapeHtml(data.subject.subject_name || "");
    let html = `
      <div class="curriculum-browse-subject-label">
        <span class="curriculum-browse-label">Subject</span>
        <h3 class="curriculum-browse-subject-name">${subjectName}</h3>
      </div>
    `;
    const byQuarter = {};
    lessons.forEach((l) => {
      const q = l.quarter_number != null ? String(l.quarter_number) : "_";
      if (!byQuarter[q]) byQuarter[q] = [];
      byQuarter[q].push(l);
    });
    const quarterOrder = ["1", "2", "3", "4", "_"];
    quarterOrder.forEach((qKey) => {
      const list = byQuarter[qKey];
      if (!list || list.length === 0) return;
      const quarterNum = qKey === "_" ? null : qKey;
      const quarterTitle = list[0]?.quarter_title || (quarterNum ? "Quarter " + quarterNum : "General");
      html += `
        <div class="curriculum-browse-quarter">
          <div class="curriculum-browse-quarter-header">
            ${quarterNum != null ? '<span class="curriculum-browse-quarter-badge">Quarter ' + quarterNum + "</span>" : ""}
            <span class="curriculum-browse-quarter-title">${escapeHtml(quarterTitle)}</span>
          </div>
      `;
      list.forEach((lesson) => {
        const topics = (lesson.topics || []).filter((t) => {
          if (!search) return true;
          return String(t.topic_title || "").toLowerCase().includes(search);
        });
        const topicCount = lesson.topics?.length || 0;
        const lessonId = "curriculum-lesson-" + lesson.lesson_id;
        html += `
          <div class="curriculum-browse-lesson-card" data-lesson-id="${lesson.lesson_id}">
            <div class="curriculum-browse-lesson-header" role="button" tabindex="0" aria-expanded="true" aria-controls="${lessonId}" id="${lessonId}-btn">
              <div class="curriculum-browse-lesson-icon">
                <i data-lucide="bar-chart-3" class="size-5"></i>
              </div>
              <div class="curriculum-browse-lesson-title-wrap">
                <span class="curriculum-browse-lesson-title">${escapeHtml(lesson.lesson_title || "")}</span>
                <span class="curriculum-browse-lesson-meta">${topicCount} topic${topicCount !== 1 ? "s" : ""}</span>
              </div>
              <i data-lucide="chevron-up" class="curriculum-browse-lesson-chevron size-5"></i>
            </div>
            <div id="${lessonId}" class="curriculum-browse-lesson-topics" role="region" aria-labelledby="${lessonId}-btn">
        `;
        topics.forEach((topic) => {
          const subjectName = data.subject?.subject_name || "";
          html += `
            <div class="curriculum-browse-topic-tile">
              <div class="curriculum-browse-topic-icon"><i data-lucide="book-open" class="size-4"></i></div>
              <span class="curriculum-browse-topic-title">${escapeHtml(topic.topic_title || "")}</span>
              <button type="button" class="btn btn-outline btn-sm curriculum-browse-view-topic"
                data-topic-id="${topic.topic_id || ""}"
                data-topic-title="${escapeHtml(topic.topic_title || "")}"
                data-lesson-title="${escapeHtml(lesson.lesson_title || "")}"
                data-subject-name="${escapeHtml(subjectName)}">
                <i data-lucide="presentation" class="size-4"></i>
                View Topic
              </button>
            </div>
          `;
        });
        html += `
            </div>
          </div>
        `;
      });
      html += "</div>";
    });
    contentEl.innerHTML = html;
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    contentEl.querySelectorAll(".curriculum-browse-lesson-header").forEach((btn) => {
      btn.addEventListener("click", function () {
        const card = this.closest(".curriculum-browse-lesson-card");
        const topicsEl = card?.querySelector(".curriculum-browse-lesson-topics");
        const chevron = this.querySelector(".curriculum-browse-lesson-chevron");
        if (!topicsEl) return;
        const isExpanded = !topicsEl.classList.contains("collapsed");
        topicsEl.classList.toggle("collapsed", isExpanded);
        btn.setAttribute("aria-expanded", !isExpanded);
        if (chevron) {
          chevron.setAttribute("data-lucide", isExpanded ? "chevron-down" : "chevron-up");
          if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
        }
      });
    });

    contentEl.querySelectorAll(".curriculum-browse-view-topic").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        const topicId = this.getAttribute("data-topic-id");
        const topicTitle = this.getAttribute("data-topic-title") || "";
        const lessonTitle = this.getAttribute("data-lesson-title") || "";
        const subjectName = this.getAttribute("data-subject-name") || "";
        viewTopicWithGeneratedContentMasterAdmin({
          topic_id: topicId ? Number(topicId) : null,
          topic_title: topicTitle,
        }, { lesson_title: lessonTitle }, { subject_name: subjectName });
      });
    });
  }

  function getSelectedSubjectId(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return null;
    const v = el.value;
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async function loadTracks() {
    const res = await fetch((window.API_BASE || "") + "/api/master-admin/tracks", {
      headers: apiHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to load tracks");
    return data.tracks || [];
  }

  function renderTracksTable(tracks) {
    const tbody = document.getElementById("curriculum-tracks-tbody");
    const emptyEl = document.getElementById("curriculum-tracks-empty");
    const tableWrap = document.querySelector("#curriculum-box-tracks .curriculum-table-wrap");
    if (!tbody) return;
    if (!tracks || tracks.length === 0) {
      tbody.innerHTML = "";
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (tableWrap) tableWrap.classList.add("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");
    if (tableWrap) tableWrap.classList.remove("hidden");
    tbody.innerHTML = tracks
      .map(
        (t) => `
        <tr class="curriculum-row">
          <td class="curriculum-cell curriculum-cell-name">${escapeHtml(t.track_name || "")}</td>
          <td class="curriculum-cell curriculum-cell-actions">
            <button type="button" class="btn btn-outline btn-sm curriculum-delete-btn curriculum-delete-track-btn" data-id="${t.track_id}">Delete</button>
          </td>
        </tr>
      `
      )
      .join("");
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  function renderCurriculumLessonsTable(lessons, page) {
    if (lessons) {
      curriculumLessons = lessons;
      curriculumLessonsPage = 1;
    }
    let data = curriculumLessons || [];
    const filterSubjectId = getSelectedSubjectId("curriculum-lessons-subject-filter");
    if (filterSubjectId != null) {
      data = data.filter((l) => Number(l.subject_id) === filterSubjectId);
    }
    const pageNum = page || curriculumLessonsPage || 1;
    curriculumLessonsPage = pageNum;
    const tbody = document.getElementById("curriculum-lessons-tbody");
    const emptyEl = document.getElementById("curriculum-lessons-empty");
    if (!tbody) return;
    const tableWrap = tbody.closest(".curriculum-box")?.querySelector(".curriculum-table-wrap");
    if (!data || data.length === 0) {
      tbody.innerHTML = "";
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (tableWrap) tableWrap.classList.add("hidden");
      updatePaginationControls("lessons", 0, 1);
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");
    if (tableWrap) tableWrap.classList.remove("hidden");
    const start = (pageNum - 1) * CURR_PAGE_SIZE;
    const slice = data.slice(start, start + CURR_PAGE_SIZE);
    tbody.innerHTML = slice
      .map(
        (l) => `
        <tr class="curriculum-row">
          <td class="curriculum-cell">${escapeHtml(l.subject_name || "—")}</td>
          <td class="curriculum-cell curriculum-cell-name">${escapeHtml(l.lesson_title || "")}</td>
          <td class="curriculum-cell curriculum-cell-muted">${l.quarter_number != null ? escapeHtml(String(l.quarter_number)) : "—"}</td>
          <td class="curriculum-cell curriculum-cell-actions">
            <button type="button" class="btn btn-outline btn-sm curriculum-delete-btn curriculum-delete-lesson-btn" data-id="${l.lesson_id}">Delete</button>
          </td>
        </tr>
      `
      )
      .join("");
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    updatePaginationControls("lessons", data.length, pageNum);
  }

  function renderCurriculumTopicsTable(topics, page) {
    if (topics) {
      curriculumTopics = topics;
      curriculumTopicsPage = 1;
    }
    let data = curriculumTopics || [];
    const filterSubjectId = getSelectedSubjectId("curriculum-topics-subject-filter");
    if (filterSubjectId != null) {
      data = data.filter((t) => Number(t.subject_id) === filterSubjectId);
    }
    const pageNum = page || curriculumTopicsPage || 1;
    curriculumTopicsPage = pageNum;
    const tbody = document.getElementById("curriculum-topics-tbody");
    const emptyEl = document.getElementById("curriculum-topics-empty");
    if (!tbody) return;
    const tableWrap = tbody.closest(".curriculum-box")?.querySelector(".curriculum-table-wrap");
    if (!data || data.length === 0) {
      tbody.innerHTML = "";
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (tableWrap) tableWrap.classList.add("hidden");
      updatePaginationControls("topics", 0, 1);
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");
    if (tableWrap) tableWrap.classList.remove("hidden");
    const start = (pageNum - 1) * CURR_PAGE_SIZE;
    const slice = data.slice(start, start + CURR_PAGE_SIZE);
    tbody.innerHTML = slice
      .map(
        (t) => `
        <tr class="curriculum-row">
          <td class="curriculum-cell">${escapeHtml(t.subject_name || "—")}</td>
          <td class="curriculum-cell">${escapeHtml(t.lesson_title || "—")}</td>
          <td class="curriculum-cell curriculum-cell-name">${escapeHtml(t.topic_title || "")}</td>
          <td class="curriculum-cell curriculum-cell-actions">
            <button type="button" class="btn btn-outline btn-sm curriculum-delete-btn curriculum-delete-topic-btn" data-id="${t.topic_id}">Delete</button>
          </td>
        </tr>
      `
      )
      .join("");
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    updatePaginationControls("topics", data.length, pageNum);
  }

  function isAdminAccountsPage() {
    const path = window.location.pathname || "";
    return path.includes("admin-accounts.html");
  }

  function isCurriculumPage() {
    const path = window.location.pathname || "";
    return path.includes("master-admin-curriculum.html");
  }

  function isTracksPage() {
    const path = window.location.pathname || "";
    return path.includes("master-admin-tracks.html");
  }

  function isDashboardPage() {
    const path = window.location.pathname || "";
    return path.includes("master-admin-dashboard.html");
  }

  function isMasterAdminPage() {
    return isAdminAccountsPage() || isCurriculumPage() || isDashboardPage() || isTracksPage();
  }

  async function loadDashboardStats() {
    const res = await fetch((window.API_BASE || "") + "/api/master-admin/dashboard-stats", {
      headers: apiHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to load dashboard stats");
    return data.stats || {};
  }

  function renderDashboardStats(stats) {
    const ids = [
      "stat-admins",
      "stat-teachers",
      "stat-students",
      "stat-classes",
      "stat-subjects",
      "stat-lessons",
      "stat-topics",
      "stat-pending",
      "stat-approved",
      "stat-rejected",
    ];
    const keys = [
      "admins",
      "teachers",
      "students",
      "classes",
      "subjects",
      "lessons",
      "topics",
      "verification.pending",
      "verification.approved",
      "verification.rejected",
    ];
    ids.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      let val = stats;
      keys[i].split(".").forEach((k) => {
        val = val != null && typeof val === "object" ? val[k] : undefined;
      });
      el.textContent = val != null && Number.isFinite(Number(val)) ? String(val) : "—";
    });
    const v = stats?.verification || {};
    const pending = Number(v.pending || 0);
    const approved = Number(v.approved || 0);
    const rejected = Number(v.rejected || 0);
    const total = pending + approved + rejected;
    let pPct = 0;
    let aPct = 0;
    let rPct = 0;
    if (total > 0) {
      pPct = Math.round((pending / total) * 100);
      aPct = Math.round((approved / total) * 100);
      rPct = 100 - pPct - aPct;
      if (rPct < 0) rPct = 0;
    }
    const pendingSeg = document.getElementById("progress-pending");
    const approvedSeg = document.getElementById("progress-approved");
    const rejectedSeg = document.getElementById("progress-rejected");
    if (pendingSeg) pendingSeg.style.width = pPct + "%";
    if (approvedSeg) approvedSeg.style.width = aPct + "%";
    if (rejectedSeg) rejectedSeg.style.width = rPct + "%";
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  document.addEventListener("DOMContentLoaded", async function () {
    if (!isMasterAdminPage()) return;

    try {
      const user = await ensureMasterAdmin();
      if (!user) return;

      document.getElementById("loading-screen").classList.add("hidden");
      document.getElementById("main-app").classList.remove("hidden");

      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }

      // Sidebar open/close (same behavior as navigation.js ensureMobileSidebarControls)
      (function initSidebarToggle() {
        const sidebar = document.getElementById("sidebar");
        const menuBtn = document.getElementById("mobileNavMenuBtn");
        if (!sidebar || !menuBtn) return;
        let overlay = document.getElementById("mobile-sidebar-overlay");
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.id = "mobile-sidebar-overlay";
          overlay.className = "mobile-sidebar-overlay hidden";
          document.body.appendChild(overlay);
        }
        const STORAGE_KEY = "eel-sidebar-open";
        const isDesktop = window.matchMedia && window.matchMedia("(min-width: 769px)").matches;
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          if (stored === "true") {
            sidebar.classList.add("open");
            overlay.classList.remove("hidden");
          } else {
            sidebar.classList.remove("open");
            overlay.classList.add("hidden");
          }
        } else {
          if (isDesktop) {
            sidebar.classList.add("open");
            overlay.classList.remove("hidden");
            sessionStorage.setItem(STORAGE_KEY, "true");
          } else {
            sidebar.classList.remove("open");
            overlay.classList.add("hidden");
            sessionStorage.setItem(STORAGE_KEY, "false");
          }
        }
        function updateBurgerIcon(isOpen) {
          menuBtn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
          const menuSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 6h16M4 12h16M4 18h16\"/></svg>";
          const closeSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M18 6L6 18M6 6l12 12\"/></svg>";
          menuBtn.innerHTML = isOpen ? closeSvg : menuSvg;
        }
        function closeSidebar() {
          sidebar.classList.remove("open");
          overlay.classList.add("hidden");
          updateBurgerIcon(false);
          sessionStorage.setItem(STORAGE_KEY, "false");
        }
        function openSidebar() {
          sidebar.classList.add("open");
          overlay.classList.remove("hidden");
          updateBurgerIcon(true);
          sessionStorage.setItem(STORAGE_KEY, "true");
        }
        updateBurgerIcon(sidebar.classList.contains("open"));
        menuBtn.addEventListener("click", function () {
          if (sidebar.classList.contains("open")) closeSidebar();
          else openSidebar();
        });
        overlay.addEventListener("click", closeSidebar);
        sidebar.addEventListener("click", function (e) {
          if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches()) {
            const link = e.target.closest("a[href]");
            const href = (link && link.getAttribute("href")) || "";
            if (href && href.trim() !== "" && href !== "#" && !href.startsWith("javascript:")) {
              closeSidebar();
            }
          }
        });
      })();

      // Master admin notification (pending verification)
      (function initMasterAdminNotification() {
        const btn = document.getElementById("masterAdminNotificationBtn");
        const panel = document.getElementById("masterAdminNotificationPanel");
        const badge = document.getElementById("masterAdminNotificationBadge");
        const listEl = document.getElementById("masterAdminNotificationList");
        if (!btn || !panel) return;
        function updateNotification(pending) {
          const n = Number(pending || 0);
          if (badge) {
            if (n > 0) {
              badge.textContent = n > 99 ? "99+" : String(n);
              badge.classList.remove("hidden");
            } else {
              badge.classList.add("hidden");
            }
          }
          if (btn) btn.setAttribute("aria-label", n > 0 ? `Open notifications (${n} pending)` : "Open notifications");
          if (listEl) {
            if (n > 0) {
              listEl.innerHTML = `<a href="master-admin-dashboard.html" class="mobile-nav-notification-item mobile-nav-notification-item--unread" style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;text-decoration:none;color:inherit;border-bottom:1px solid var(--border);"><span class="mobile-nav-notification-avatar" style="background:linear-gradient(135deg,var(--primary),var(--secondary));color:white;width:2.5rem;height:2.5rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.875rem;">!</span><span class="mobile-nav-notification-content" style="flex:1;"><span class="mobile-nav-notification-item-title" style="display:block;font-weight:500;">${n === 1 ? "1 account" : n + " accounts"} pending verification</span><span class="mobile-nav-notification-item-meta" style="font-size:0.75rem;color:var(--muted-foreground);">View dashboard</span></span></a>`;
            } else {
              listEl.innerHTML = "<p class=\"mobile-nav-notification-empty\">No notifications.</p>";
            }
          }
        }
        loadDashboardStats()
          .then((stats) => updateNotification(stats?.verification?.pending))
          .catch(() => updateNotification(0));
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          const isOpen = !panel.classList.contains("hidden");
          panel.classList.toggle("hidden", isOpen);
          btn.setAttribute("aria-expanded", !isOpen);
        });
        document.addEventListener("click", function (e) {
          if (panel.classList.contains("hidden")) return;
          if (panel.contains(e.target) || btn.contains(e.target)) return;
          panel.classList.add("hidden");
          btn.setAttribute("aria-expanded", "false");
        });
      })();

      // Dashboard page: load stats
      if (isDashboardPage()) {
        loadDashboardStats()
          .then(renderDashboardStats)
          .catch((e) => {
            const msg = e.message || "Failed to load";
            ["stat-admins", "stat-teachers", "stat-students", "stat-classes", "stat-subjects", "stat-lessons", "stat-topics", "stat-pending", "stat-approved", "stat-rejected"].forEach((id) => {
              const el = document.getElementById(id);
              if (el) el.textContent = "Error";
            });
            if (typeof showNotification === "function") showNotification(msg, "error");
          });
      }

      const curriculumBoxIds = ["browse", "subjects", "lessons", "topics"];

      function showCurriculumBox(boxKey) {
        curriculumBoxIds.forEach((key) => {
          const box = document.getElementById("curriculum-box-" + key);
          const btn = document.querySelector('.curriculum-tab-btn[data-box="' + key + '"]');
          const isActive = key === boxKey;
          if (box) box.classList.toggle("hidden", !isActive);
          if (btn) btn.classList.toggle("active", isActive);
        });
        document.querySelectorAll(".curriculum-action-btn[data-action]").forEach((actionBtn) => {
          const action = actionBtn.getAttribute("data-action");
          actionBtn.classList.toggle("hidden", action !== boxKey);
        });
      }

      // Admin accounts page: load admins and wire handlers
      if (isAdminAccountsPage()) {
        loadAdmins()
          .then(renderAdminsTable)
          .catch((e) => {
            const tbody = document.getElementById("master-admin-admins-tbody");
            if (tbody) tbody.innerHTML = "<tr><td colspan=\"5\" class=\"master-admin-admins-loading master-admin-admins-error\">" + escapeHtml(e.message || "Failed to load") + "</td></tr>";
          });
      }

      // Curriculum page: load data and wire handlers
      if (isCurriculumPage()) {
        showCurriculumBox("browse");
        loadSubjects()
          .then((subjects) => {
            fillSubjectSelect("lesson-subject-id", subjects);
            fillSubjectSelect("topic-subject-id", subjects);
            renderCurriculumSubjectsTable(subjects);
            const lessonsFilter = document.getElementById("curriculum-lessons-subject-filter");
            const topicsFilter = document.getElementById("curriculum-topics-subject-filter");
            if (lessonsFilter) {
              lessonsFilter.innerHTML =
                '<option value="">All subjects</option>' +
                subjects
                  .map(
                    (s) =>
                      '<option value="' +
                      String(s.subject_id) +
                      '">' +
                      escapeHtml(s.subject_name || "") +
                      "</option>"
                  )
                  .join("");
            }
            if (topicsFilter) {
              topicsFilter.innerHTML =
                '<option value="">All subjects</option>' +
                subjects
                  .map(
                    (s) =>
                      '<option value="' +
                      String(s.subject_id) +
                      '">' +
                      escapeHtml(s.subject_name || "") +
                      "</option>"
                  )
                  .join("");
            }
            const browseSubject = document.getElementById("curriculum-browse-subject");
            if (browseSubject) {
              browseSubject.innerHTML =
                '<option value="">Select a subject</option>' +
                subjects
                  .map(
                    (s) =>
                      '<option value="' +
                      String(s.subject_id) +
                      '">' +
                      escapeHtml(s.subject_name || "") +
                      "</option>"
                  )
                  .join("");
            }
          })
          .catch((e) => {
            const tbody = document.getElementById("curriculum-subjects-tbody");
            if (tbody) tbody.innerHTML = "<tr><td colspan=\"2\" class=\"p-4 text-center text-destructive\">" + escapeHtml(e.message || "Failed to load") + "</td></tr>";
          });
        loadAllLessons()
          .then(renderCurriculumLessonsTable)
          .catch((e) => {
            const tbody = document.getElementById("curriculum-lessons-tbody");
            if (tbody) tbody.innerHTML = "<tr><td colspan=\"4\" class=\"p-4 text-center text-destructive\">" + escapeHtml(e.message || "Failed to load") + "</td></tr>";
          });
        loadAllTopics()
          .then(renderCurriculumTopicsTable)
          .catch((e) => {
            const tbody = document.getElementById("curriculum-topics-tbody");
            if (tbody) tbody.innerHTML = "<tr><td colspan=\"4\" class=\"p-4 text-center text-destructive\">" + escapeHtml(e.message || "Failed to load") + "</td></tr>";
          });

        let __curriculumBrowseData = null;
        const browseSubjectEl = document.getElementById("curriculum-browse-subject");
        const browseSearchEl = document.getElementById("curriculum-browse-search");
        if (browseSubjectEl) {
          browseSubjectEl.addEventListener("change", async function () {
            const id = getSelectedSubjectId("curriculum-browse-subject");
            const contentEl = document.getElementById("curriculum-browse-content");
            const placeholder = contentEl?.querySelector(".curriculum-browse-placeholder");
            if (!id) {
              __curriculumBrowseData = null;
              contentEl.innerHTML = '<p class="curriculum-browse-placeholder text-muted-foreground">Select a subject to view lessons and topics.</p>';
              return;
            }
            contentEl.innerHTML = '<p class="curriculum-browse-placeholder text-muted-foreground">Loading…</p>';
            if (placeholder) placeholder.classList.add("hidden");
            try {
              __curriculumBrowseData = await loadCurriculumBrowse(id);
              renderCurriculumBrowse(__curriculumBrowseData, browseSearchEl?.value || "");
            } catch (e) {
              contentEl.innerHTML = '<p class="curriculum-browse-placeholder text-destructive">' + escapeHtml(e.message || "Failed to load") + "</p>";
            }
          });
        }
        if (browseSearchEl) {
          browseSearchEl.addEventListener("input", function () {
            if (__curriculumBrowseData) renderCurriculumBrowse(__curriculumBrowseData, this.value);
          });
        }

        document.getElementById("master-admin-topic-close-btn")?.addEventListener("click", closeMasterAdminTopicModal);
        document.getElementById("master-admin-topic-regenerate-btn")?.addEventListener("click", regenerateMasterAdminTopicContent);
        document.getElementById("master-admin-topic-modal")?.addEventListener("click", function (e) {
          if (e.target === this) closeMasterAdminTopicModal();
        });
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape") {
            const modal = document.getElementById("master-admin-topic-modal");
            if (modal && !modal.classList.contains("hidden")) closeMasterAdminTopicModal();
          }
        });
      }

      if (isTracksPage()) {
        loadTracks()
          .then(renderTracksTable)
          .catch((e) => {
            const tbody = document.getElementById("curriculum-tracks-tbody");
            if (tbody) tbody.innerHTML = "<tr><td colspan=\"2\" class=\"p-4 text-center text-destructive\">" + escapeHtml(e.message || "Failed to load") + "</td></tr>";
          });

        const addTrackBtn = document.getElementById("curriculum-open-track-modal-btn");
        const addTrackModal = document.getElementById("add-track-modal");
        const trackForm = document.getElementById("master-admin-track-form");

        function openAddTrackModal() {
          if (addTrackModal) {
            document.body.classList.add("eel-modal-open");
            addTrackModal.classList.remove("hidden");
            document.getElementById("track-name").value = "";
            if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
          }
        }
        function closeAddTrackModal() {
          if (addTrackModal) addTrackModal.classList.add("hidden");
          document.body.classList.remove("eel-modal-open");
        }

        addTrackBtn?.addEventListener("click", openAddTrackModal);
        addTrackModal?.addEventListener("click", function (e) {
          if (e.target === addTrackModal) closeAddTrackModal();
        });
        document.querySelectorAll(".curriculum-modal-close[data-modal=\"add-track-modal\"]").forEach((btn) => {
          btn.addEventListener("click", closeAddTrackModal);
        });
        document.querySelector("#add-track-modal .modal-card")?.addEventListener("click", function (e) {
          e.stopPropagation();
        });

        trackForm?.addEventListener("submit", async function (e) {
          e.preventDefault();
          const name = document.getElementById("track-name").value.trim();
          if (!name) return;
          try {
            const res = await fetch((window.API_BASE || "") + "/api/master-admin/tracks", {
              method: "POST",
              headers: apiHeaders(),
              body: JSON.stringify({ track_name: name }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to add track");
            Swal.fire({ icon: "success", title: "Done", text: "Track added." });
            closeAddTrackModal();
            loadTracks().then(renderTracksTable);
          } catch (err) {
            Swal.fire({ icon: "error", title: "Error", text: err.message || "Server error" });
          }
        });

        document.getElementById("curriculum-tracks-tbody")?.addEventListener("click", async function (e) {
          const btn = e.target.closest(".curriculum-delete-track-btn");
          if (!btn) return;
          const id = btn.getAttribute("data-id");
          if (!id) return;
          e.preventDefault();
          const result = await Swal.fire({
            title: "Delete track?",
            text: "This track will be removed. Students who selected it may need to update their profile.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
          });
          if (!result.isConfirmed) return;
          try {
            const res = await fetch((window.API_BASE || "") + "/api/master-admin/tracks/" + encodeURIComponent(id), {
              method: "DELETE",
              headers: apiHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to delete");
            Swal.fire({ icon: "success", title: "Deleted", text: "Track deleted." });
            loadTracks().then(renderTracksTable);
          } catch (err) {
            Swal.fire({ icon: "error", title: "Error", text: err.message || "Server error" });
          }
        });
      }

      if (isAdminAccountsPage()) {
      document.getElementById("master-admin-admins-tbody")?.addEventListener("click", async function (e) {
        const deact = e.target.closest(".master-admin-deactivate-btn");
        const act = e.target.closest(".master-admin-activate-btn");
        const userId = (deact || act)?.getAttribute("data-user-id");
        if (!userId) return;
        e.preventDefault();
        if (deact) {
          const result = await Swal.fire({
            title: "Deactivate admin?",
            text: "They will not be able to sign in until activated again.",
            input: "text",
            inputLabel: "Reason (optional)",
            inputPlaceholder: "e.g. Left the organization",
            showCancelButton: true,
            confirmButtonColor: "#d33",
          });
          if (!result.isConfirmed) return;
          const reason = result.value || "";
          try {
            const res = await fetch((window.API_BASE || "") + "/api/master-admin/admins/" + userId + "/deactivate", {
              method: "PATCH",
              headers: apiHeaders(),
              body: JSON.stringify({ reason: reason || "" }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to deactivate");
            Swal.fire({ icon: "success", title: "Deactivated", text: "Admin account deactivated." });
            loadAdmins().then(renderAdminsTable);
          } catch (err) {
            Swal.fire({ icon: "error", title: "Error", text: err.message || "Server error" });
          }
        } else {
          try {
            const res = await fetch((window.API_BASE || "") + "/api/master-admin/admins/" + userId + "/activate", {
              method: "PATCH",
              headers: apiHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to activate");
            Swal.fire({ icon: "success", title: "Activated", text: "Admin account can sign in again." });
            loadAdmins().then(renderAdminsTable);
          } catch (err) {
            Swal.fire({ icon: "error", title: "Error", text: err.message || "Server error" });
          }
        }
      });

      const signupModal = document.getElementById("signup-admin-modal");
      function openSignupAdminModal() {
        if (signupModal) {
          document.body.classList.add("eel-modal-open");
          signupModal.classList.remove("hidden");
          if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
          setTimeout(updatePasswordStrength, 0);
        }
      }
      function closeSignupAdminModal() {
        if (signupModal) signupModal.classList.add("hidden");
        document.body.classList.remove("eel-modal-open");
      }
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && signupModal && !signupModal.classList.contains("hidden")) {
          closeSignupAdminModal();
        }
      });
      document.getElementById("master-admin-open-signup-modal-btn")?.addEventListener("click", openSignupAdminModal);
      document.getElementById("signup-admin-modal-close")?.addEventListener("click", closeSignupAdminModal);
      signupModal?.addEventListener("click", function (e) {
        if (e.target === signupModal) closeSignupAdminModal();
      });
      document.querySelector("#signup-admin-modal .modal-card")?.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      function validateAdminPassword(pwd) {
        if (pwd.length < 8) return "Password must be at least 8 characters.";
        if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
        if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
        if (!/[^A-Za-z0-9]/.test(pwd)) return "Password must contain at least one special character.";
        return null;
      }

      function updatePasswordStrength() {
        const pwd = (document.getElementById("admin-password") && document.getElementById("admin-password").value) || "";
        const wrap = document.getElementById("admin-password-strength-wrap");
        const fill = document.getElementById("admin-password-strength-fill");
        const label = document.getElementById("admin-password-strength-label");
        const addHint = document.getElementById("admin-password-add-hint");
        if (!wrap || !fill || !label || !addHint) return;
        if (pwd.length === 0) {
          wrap.classList.add("hidden");
          addHint.classList.add("hidden");
          return;
        }
        wrap.classList.remove("hidden");
        addHint.classList.remove("hidden");
        const hasLength = pwd.length >= 8;
        const hasUpper = /[A-Z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
        const count = [hasLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
        const pct = count === 0 ? 0 : (count / 4) * 100;
        let strength = "weak";
        if (count >= 4) strength = "strong";
        else if (count >= 2) strength = "fair";
        wrap.setAttribute("data-strength", strength);
        fill.style.width = pct + "%";
        label.textContent = strength === "strong" ? "Strong" : strength === "fair" ? "Fair" : "Weak";
        const add = [];
        if (!hasLength) add.push("At least 8 characters");
        if (!hasUpper) add.push("Uppercase letter");
        if (!hasNumber) add.push("Number");
        if (!hasSpecial) add.push("Special character");
        addHint.textContent = add.length ? "Add: " + add.join(", ") : "Password meets all requirements.";
      }
      document.getElementById("admin-password")?.addEventListener("input", updatePasswordStrength);
      document.getElementById("admin-password")?.addEventListener("change", updatePasswordStrength);

      document.getElementById("master-admin-signup-form")?.addEventListener("submit", async function (e) {
        e.preventDefault();
        const fname = document.getElementById("admin-fname").value.trim();
        const lname = document.getElementById("admin-lname").value.trim();
        const email = document.getElementById("admin-email").value.trim();
        const password = document.getElementById("admin-password").value;
        const confirmPassword = document.getElementById("admin-password-confirm").value;
        const pwdError = validateAdminPassword(password);
        if (pwdError) {
          Swal.fire({ icon: "error", title: "Invalid password", text: pwdError });
          return;
        }
        if (password !== confirmPassword) {
          Swal.fire({ icon: "error", title: "Passwords don't match", text: "Password and Confirm password must be the same." });
          return;
        }
        try {
          const res = await fetch((window.API_BASE || "") + "/api/master-admin/admins", {
            method: "POST",
            headers: apiHeaders(),
            body: JSON.stringify({ fname, lname, email, password }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to create admin");
          Swal.fire({ icon: "success", title: "Done", text: "Admin account created." });
          this.reset();
          document.getElementById("admin-password-confirm").value = "";
          closeSignupAdminModal();
          loadAdmins().then(renderAdminsTable);
        } catch (err) {
          Swal.fire({ icon: "error", title: "Error", text: err.message || "Server error" });
        }
      });
      }

      if (isCurriculumPage()) {
      document.getElementById("topic-subject-id")?.addEventListener("change", async function () {
        const subjectId = this.value;
        const lessonSelect = document.getElementById("topic-lesson-id");
        if (lessonSelect) lessonSelect.innerHTML = "<option value=\"\">Select lesson...</option>";
        if (!subjectId) return;
        try {
          const lessons = await loadLessons(subjectId);
          fillLessonSelect(lessons);
        } catch (e) {
          if (typeof showNotification === "function") showNotification(e.message || "Failed to load lessons", "error");
        }
      });

      function openCurriculumModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) {
          document.body.classList.add("eel-modal-open");
          el.classList.remove("hidden");
          if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
        }
      }
      function closeCurriculumModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) el.classList.add("hidden");
        const anyOpen = ["add-subject-modal", "add-lesson-modal", "add-topic-modal"].some(
          (id) => document.getElementById(id) && !document.getElementById(id).classList.contains("hidden")
        );
        const signupModal = document.getElementById("signup-admin-modal");
        const signupHidden = !signupModal || signupModal.classList.contains("hidden");
        if (!anyOpen && signupHidden) {
          document.body.classList.remove("eel-modal-open");
        }
      }
      document.getElementById("curriculum-open-subject-modal-btn")?.addEventListener("click", () => openCurriculumModal("add-subject-modal"));
      document.getElementById("curriculum-open-lesson-modal-btn")?.addEventListener("click", () => {
        loadSubjects().then((subjects) => fillSubjectSelect("lesson-subject-id", subjects));
        openCurriculumModal("add-lesson-modal");
      });
      document.getElementById("curriculum-open-topic-modal-btn")?.addEventListener("click", () => {
        loadSubjects().then((subjects) => {
          fillSubjectSelect("topic-subject-id", subjects);
        });
        openCurriculumModal("add-topic-modal");
      });

      function refreshCurriculumTables() {
        loadSubjects()
          .then((subjects) => {
            fillSubjectSelect("lesson-subject-id", subjects);
            fillSubjectSelect("topic-subject-id", subjects);
            renderCurriculumSubjectsTable(subjects);
            const lessonsFilter = document.getElementById("curriculum-lessons-subject-filter");
            const topicsFilter = document.getElementById("curriculum-topics-subject-filter");
            if (lessonsFilter && lessonsFilter.options.length <= 1) {
              lessonsFilter.innerHTML = '<option value="">All subjects</option>' + subjects.map((s) => '<option value="' + String(s.subject_id) + '">' + escapeHtml(s.subject_name || "") + "</option>").join("");
            }
            if (topicsFilter && topicsFilter.options.length <= 1) {
              topicsFilter.innerHTML = '<option value="">All subjects</option>' + subjects.map((s) => '<option value="' + String(s.subject_id) + '">' + escapeHtml(s.subject_name || "") + "</option>").join("");
            }
          })
          .catch(() => {});
        loadAllLessons().then(renderCurriculumLessonsTable).catch(() => {});
        loadAllTopics().then(renderCurriculumTopicsTable).catch(() => {});
      }
      document.querySelectorAll(".curriculum-tab-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const box = this.getAttribute("data-box");
          if (box) showCurriculumBox(box);
        });
      });

      document.getElementById("curriculum-lessons-subject-filter")?.addEventListener("change", () => {
        renderCurriculumLessonsTable(null, 1);
      });
      document.getElementById("curriculum-topics-subject-filter")?.addEventListener("change", () => {
        renderCurriculumTopicsTable(null, 1);
      });

      document.getElementById("curriculum-subjects-prev")?.addEventListener("click", () => {
        if (curriculumSubjectsPage > 1) renderCurriculumSubjectsTable(null, curriculumSubjectsPage - 1);
      });
      document.getElementById("curriculum-subjects-next")?.addEventListener("click", () => {
        const totalPages = Math.max(1, Math.ceil((curriculumSubjects || []).length / CURR_PAGE_SIZE));
        if (curriculumSubjectsPage < totalPages) renderCurriculumSubjectsTable(null, curriculumSubjectsPage + 1);
      });
      document.getElementById("curriculum-lessons-prev")?.addEventListener("click", () => {
        if (curriculumLessonsPage > 1) renderCurriculumLessonsTable(null, curriculumLessonsPage - 1);
      });
      document.getElementById("curriculum-lessons-next")?.addEventListener("click", () => {
        const totalPages = Math.max(1, Math.ceil((curriculumLessons || []).length / CURR_PAGE_SIZE));
        if (curriculumLessonsPage < totalPages) renderCurriculumLessonsTable(null, curriculumLessonsPage + 1);
      });
      document.getElementById("curriculum-topics-prev")?.addEventListener("click", () => {
        if (curriculumTopicsPage > 1) renderCurriculumTopicsTable(null, curriculumTopicsPage - 1);
      });
      document.getElementById("curriculum-topics-next")?.addEventListener("click", () => {
        const totalPages = Math.max(1, Math.ceil((curriculumTopics || []).length / CURR_PAGE_SIZE));
        if (curriculumTopicsPage < totalPages) renderCurriculumTopicsTable(null, curriculumTopicsPage + 1);
      });

      document.getElementById("curriculum-subjects-tbody")?.addEventListener("click", async function (e) {
        const btn = e.target.closest(".curriculum-delete-subject-btn");
        if (!btn) return;
        const id = btn.getAttribute("data-id");
        if (!id) return;
        e.preventDefault();
        const result = await Swal.fire({ title: "Delete subject?", text: "This will also delete all lessons and topics under this subject.", icon: "warning", showCancelButton: true, confirmButtonColor: "#d33" });
        if (!result.isConfirmed) return;
        try {
          const res = await fetch((window.API_BASE || "") + "/api/master-admin/subjects/" + id, { method: "DELETE", headers: apiHeaders() });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to delete");
          Swal.fire({ icon: "success", title: "Deleted", text: "Subject deleted." });
          refreshCurriculumTables();
        } catch (err) {
          Swal.fire({ icon: "error", title: "Error", text: err.message || "Server error" });
        }
      });
      document.getElementById("curriculum-lessons-tbody")?.addEventListener("click", async function (e) {
        const btn = e.target.closest(".curriculum-delete-lesson-btn");
        if (!btn) return;
        const id = btn.getAttribute("data-id");
        if (!id) return;
        e.preventDefault();
        const result = await Swal.fire({ title: "Delete lesson?", text: "This will also delete all topics under this lesson.", icon: "warning", showCancelButton: true, confirmButtonColor: "#d33" });
        if (!result.isConfirmed) return;
        try {
          const res = await fetch((window.API_BASE || "") + "/api/master-admin/lessons/" + id, { method: "DELETE", headers: apiHeaders() });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to delete");
          Swal.fire({ icon: "success", title: "Deleted", text: "Lesson deleted." });
          refreshCurriculumTables();
        } catch (err) {
          Swal.fire({ icon: "error", title: "Error", text: err.message || "Server error" });
        }
      });
      document.getElementById("curriculum-topics-tbody")?.addEventListener("click", async function (e) {
        const btn = e.target.closest(".curriculum-delete-topic-btn");
        if (!btn) return;
        const id = btn.getAttribute("data-id");
        if (!id) return;
        e.preventDefault();
        const result = await Swal.fire({ title: "Delete topic?", icon: "warning", showCancelButton: true, confirmButtonColor: "#d33" });
        if (!result.isConfirmed) return;
        try {
          const res = await fetch((window.API_BASE || "") + "/api/master-admin/topics/" + id, { method: "DELETE", headers: apiHeaders() });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to delete");
          Swal.fire({ icon: "success", title: "Deleted", text: "Topic deleted." });
          refreshCurriculumTables();
        } catch (err) {
          Swal.fire({ icon: "error", title: "Error", text: err.message || "Server error" });
        }
      });
      document.querySelectorAll(".curriculum-modal-close").forEach((btn) => {
        btn.addEventListener("click", function () {
          closeCurriculumModal(this.getAttribute("data-modal"));
        });
      });
      ["add-subject-modal", "add-lesson-modal", "add-topic-modal"].forEach((id) => {
        const overlay = document.getElementById(id);
        if (overlay) {
          overlay.addEventListener("click", function (e) {
            if (e.target === overlay) closeCurriculumModal(id);
          });
          overlay.querySelector(".modal-card")?.addEventListener("click", (e) => e.stopPropagation());
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        const signupModalEl = document.getElementById("signup-admin-modal");
        if (signupModalEl && !signupModalEl.classList.contains("hidden")) return;
        ["add-subject-modal", "add-lesson-modal", "add-topic-modal"].forEach((id) => {
          const el = document.getElementById(id);
          if (el && !el.classList.contains("hidden")) closeCurriculumModal(id);
        });
      });

      document.getElementById("master-admin-subject-form")?.addEventListener("submit", async function (e) {
        e.preventDefault();
        const subject_name = document.getElementById("subject-name").value.trim();
        try {
          const res = await fetch((window.API_BASE || "") + "/api/master-admin/subjects", {
            method: "POST",
            headers: apiHeaders(),
            body: JSON.stringify({ subject_name }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to add subject");
          Swal.fire({ icon: "success", title: "Done", text: "Subject added." });
          this.reset();
          closeCurriculumModal("add-subject-modal");
          const subjects = await loadSubjects();
          fillSubjectSelect("lesson-subject-id", subjects);
          fillSubjectSelect("topic-subject-id", subjects);
          renderCurriculumSubjectsTable(subjects);
        } catch (err) {
          Swal.fire({ icon: "error", title: "Error", text: err.message || "Server error" });
        }
      });

      document.getElementById("master-admin-lesson-form")?.addEventListener("submit", async function (e) {
        e.preventDefault();
        const subject_id = parseInt(document.getElementById("lesson-subject-id").value, 10);
        const lesson_title = document.getElementById("lesson-title").value.trim();
        const quarter_number = document.getElementById("lesson-quarter").value.trim();
        const quarter_title = document.getElementById("lesson-quarter-title").value.trim();
        const body = { subject_id, lesson_title };
        if (quarter_number) body.quarter_number = parseInt(quarter_number, 10);
        if (quarter_title) body.quarter_title = quarter_title;
        try {
          const res = await fetch((window.API_BASE || "") + "/api/master-admin/lessons", {
            method: "POST",
            headers: apiHeaders(),
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to add lesson");
          Swal.fire({ icon: "success", title: "Done", text: "Lesson added." });
          document.getElementById("lesson-title").value = "";
          document.getElementById("lesson-quarter").value = "";
          document.getElementById("lesson-quarter-title").value = "";
          closeCurriculumModal("add-lesson-modal");
          loadAllLessons().then(renderCurriculumLessonsTable);
        } catch (err) {
          Swal.fire({ icon: "error", title: "Error", text: err.message || "Server error" });
        }
      });

      document.getElementById("master-admin-topic-form")?.addEventListener("submit", async function (e) {
        e.preventDefault();
        const lesson_id = parseInt(document.getElementById("topic-lesson-id").value, 10);
        const topic_title = document.getElementById("topic-title").value.trim();
        const pdf_path = document.getElementById("topic-pdf-path").value.trim();
        const body = { lesson_id, topic_title };
        if (pdf_path) body.pdf_path = pdf_path;
        try {
          const res = await fetch((window.API_BASE || "") + "/api/master-admin/topics", {
            method: "POST",
            headers: apiHeaders(),
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to add topic");
          Swal.fire({ icon: "success", title: "Done", text: "Topic (module) added." });
          document.getElementById("topic-title").value = "";
          document.getElementById("topic-pdf-path").value = "";
          closeCurriculumModal("add-topic-modal");
          loadAllTopics().then(renderCurriculumTopicsTable);
        } catch (err) {
          Swal.fire({ icon: "error", title: "Error", text: err.message || "Server error" });
        }
      });
      }

      document.getElementById("logout-btn")?.addEventListener("click", async function () {
        const result = typeof Swal !== "undefined" && Swal?.fire
          ? await Swal.fire({
              icon: "question",
              title: "Log out?",
              text: "Are you sure you want to log out?",
              showCancelButton: true,
              confirmButtonText: "Yes",
              cancelButtonText: "No",
              confirmButtonColor: "#8b5cf6",
            })
          : { isConfirmed: window.confirm("Are you sure you want to log out?") };
        if (!result.isConfirmed) return;
        try {
          localStorage.removeItem("eel_token");
          localStorage.removeItem("eel_user");
          localStorage.removeItem("eel_avatar_url");
          localStorage.removeItem(MASTER_ADMIN_TOKEN_KEY);
          localStorage.removeItem("eel_admin_token");
        } catch (_) {}
        window.location.replace("login.html");
      });
    } catch (err) {
      console.error("Master admin init:", err);
      window.location.href = "login.html";
    }
  });
})();
