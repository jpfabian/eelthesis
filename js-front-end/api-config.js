// Use same-origin for API when not on loopback to avoid Private Network Access block.
// When on loopback but not on port 3000 (e.g. Live Server on 5501), point API to backend on 3000.
if (typeof window !== "undefined") {
  var isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(window.location.origin);
  if (!isLoopback) {
    window.API_BASE = "";
  } else if (window.API_BASE === undefined) {
    var port = parseInt(window.location.port, 10) || (window.location.protocol === "https:" ? 443 : 80);
    if (port === 3000) {
      window.API_BASE = "";
    } else {
      window.API_BASE = window.location.protocol + "//" + window.location.hostname + ":3000";
    }
  }

  // Hide IDs and sensitive params from URL - store in sessionStorage/localStorage and replace URL
  (function hideIdsFromUrl() {
    var params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;
    var changed = false;
    var keys = ["email", "token", "class_id", "quiz_id", "open_quiz_id", "student_id", "user_id", "subject_id", "return"];
    keys.forEach(function (k) {
      var v = params.get(k);
      if (v) {
        if (k === "class_id") try { localStorage.setItem("eel_selected_class_id", v); } catch (_) {}
        else if (k === "email") try { sessionStorage.setItem("rp_email", v); } catch (_) {}
        else if (k === "token") try { sessionStorage.setItem("rp_token", v); } catch (_) {}
        else if (k === "quiz_id") try { sessionStorage.setItem("eel_quiz_id", v); } catch (_) {}
        else if (k === "open_quiz_id") try { sessionStorage.setItem("eel_open_quiz_id", v); } catch (_) {}
        else if (k === "return") try { sessionStorage.setItem("eel_return_url", v); } catch (_) {}
        else try { sessionStorage.setItem("eel_url_" + k, v); } catch (_) {}
        params.delete(k);
        changed = true;
      }
    });
    if (changed) {
      var newSearch = params.toString();
      var newUrl = window.location.pathname + (newSearch ? "?" + newSearch : "");
      try { window.history.replaceState({}, document.title, newUrl); } catch (_) {}
    }
  })();
}
