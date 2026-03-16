document.addEventListener("DOMContentLoaded", () => {
  try {
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  } catch (_) {}

  const form = document.getElementById("forgot-password-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("fp-email")?.value?.trim();
    if (!email) return;

    document.getElementById("loading-screen")?.classList.remove("hidden");
    try {
      const res = await fetch((window.API_BASE || "") + "/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      document.getElementById("loading-screen")?.classList.add("hidden");

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send verification code.");
      }

      await Swal.fire({
        icon: "success",
        title: "Code sent",
        text: "Check your email for the 6-digit verification code, then enter it on the next page.",
        confirmButtonText: "Continue",
      });

      try { sessionStorage.setItem("rp_email", email); } catch (_) {}
      window.location.href = "reset-password.html";
    } catch (err) {
      document.getElementById("loading-screen")?.classList.add("hidden");
      const msg = err?.message || "Something went wrong.";
      const isNoAccount = /no account|not found|not registered/i.test(msg);
      Swal.fire({
        icon: "error",
        title: isNoAccount ? "No account found" : "Error",
        text: msg,
      });
    }
  });
});
