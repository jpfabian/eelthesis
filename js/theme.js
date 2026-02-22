// Theme manager for EEL (light / dark / system)
// Persists to localStorage: eel_theme = 'light' | 'dark' | 'system'

(function () {
  const STORAGE_KEY = "eel_theme";
  const THEMES = ["light", "dark", "system"];

  function getStoredTheme() {
    const v = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(v) ? v : "system";
  }

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function resolveTheme(theme) {
    return theme === "system" ? getSystemTheme() : theme;
  }

  function applyResolvedTheme(resolved) {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    // Let the browser render native controls appropriately
    root.style.colorScheme = resolved;
  }

  function applyTheme(theme) {
    const chosen = THEMES.includes(theme) ? theme : "system";
    localStorage.setItem(STORAGE_KEY, chosen);
    applyResolvedTheme(resolveTheme(chosen));
    ensureCornerToggle();
  }

  function renderThemeButton(btn, showLabel) {
    if (!btn) return;
    const resolved =
      document.documentElement.dataset.theme || resolveTheme(getStoredTheme());
    const isDark = resolved === "dark";
    const icon = isDark ? "☾" : "☀";
    const label = isDark ? "dark" : "light";
    btn.setAttribute("aria-label", "Toggle dark/light mode (currently " + label + ")");
    btn.innerHTML = "<span class=\"theme-icon\" aria-hidden=\"true\">" + icon + "</span>" +
      (showLabel ? "<span class=\"theme-label\">" + label + "</span>" : "");
  }

  function ensureCornerToggle() {
    if (!document.body) return;

    const headerToggle = document.getElementById("eel-theme-header-toggle");
    const mobileThemeBtn = document.getElementById("mobileNavThemeBtn");

    if (headerToggle) {
      renderThemeButton(headerToggle, true);
      if (!headerToggle._eelThemeWired) {
        headerToggle._eelThemeWired = true;
        headerToggle.addEventListener("click", () => {
          toggleTheme();
          renderThemeButton(headerToggle, true);
          if (mobileThemeBtn) renderThemeButton(mobileThemeBtn, false);
        });
      }
    }

    if (mobileThemeBtn && !mobileThemeBtn._eelThemeWired) {
      mobileThemeBtn._eelThemeWired = true;
      mobileThemeBtn.addEventListener("click", () => {
        toggleTheme();
        if (headerToggle) renderThemeButton(headerToggle, true);
      });
    }

    if (headerToggle || mobileThemeBtn) return;

    const existing = document.getElementById("eel-theme-corner-toggle");
    if (existing) {
      renderThemeButton(existing, true);
      return;
    }

    const btn = document.createElement("button");
    btn.id = "eel-theme-corner-toggle";
    btn.type = "button";
    btn.className = "theme-corner-toggle";

    btn.addEventListener("click", () => {
      toggleTheme();
      renderThemeButton(btn, true);
    });

    renderThemeButton(btn, true);
    document.body.appendChild(btn);
  }

  function getTheme() {
    return getStoredTheme();
  }

  function toggleTheme() {
    const currentResolved = document.documentElement.dataset.theme || resolveTheme(getTheme());
    const next = currentResolved === "dark" ? "light" : "dark";
    // When user explicitly toggles, switch to explicit theme
    applyTheme(next);
    return next;
  }

  function initTheme() {
    // Apply early
    applyResolvedTheme(resolveTheme(getStoredTheme()));

    // Apply font size preference globally (if set)
    const fontSize = localStorage.getItem("eel_font_size");
    if (fontSize && /^\d+$/.test(fontSize)) {
      document.documentElement.style.setProperty("--font-size", `${fontSize}px`);
    }

    // Ensure the top-right theme toggle exists on every page
    if (document.body) ensureCornerToggle();
    else document.addEventListener("DOMContentLoaded", ensureCornerToggle, { once: true });

    // If user is in "system" mode, react to OS theme changes
    if (window.matchMedia) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        if (getStoredTheme() === "system") {
          applyResolvedTheme(resolveTheme("system"));
          // Keep corner button label in sync
          ensureCornerToggle();
        }
      };
      // Safari compatibility
      if (media.addEventListener) media.addEventListener("change", handler);
      else if (media.addListener) media.addListener(handler);
    }
  }

  // Expose minimal API
  window.EELTheme = {
    initTheme,
    applyTheme,
    getTheme,
    toggleTheme,
    getSystemTheme,
  };

  // Auto-init ASAP (works even in <head> to reduce flash)
  try {
    initTheme();
  } catch (e) {
    document.addEventListener("DOMContentLoaded", initTheme, { once: true });
  }
})();

