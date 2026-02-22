// Use same-origin for API when not on loopback to avoid Private Network Access block
// (e.g. page at http://100.52.238.165 must not fetch http://localhost:3000)
if (typeof window !== "undefined") {
  var isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(window.location.origin);
  if (!isLoopback) {
    window.API_BASE = "";
  } else if (window.API_BASE === undefined) {
    window.API_BASE = "";
  }
}
