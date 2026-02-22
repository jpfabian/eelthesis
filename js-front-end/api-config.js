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
}
