function togglePassword(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  if (icon) icon.setAttribute("data-lucide", show ? "eye" : "eye-off");
  try {
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  } catch (_) {}
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  } catch (_) {}

  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";
  const token = params.get("token") || "";

  const emailEl = document.getElementById("rp-email");
  const tokenEl = document.getElementById("rp-token");
  if (emailEl) emailEl.value = email;
  if (tokenEl) tokenEl.value = token;

  const form = document.getElementById("reset-password-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailVal = document.getElementById("rp-email")?.value?.trim();
    const tokenVal = document.getElementById("rp-token")?.value?.trim();
    const pass = document.getElementById("rp-password")?.value ?? "";
    const confirm = document.getElementById("rp-confirm")?.value ?? "";

    if (!emailVal || !tokenVal) return;
    if (pass.length < 6) return Swal.fire({ icon: "error", title: "Weak password", text: "Password must be at least 6 characters." });
    if (pass !== confirm) return Swal.fire({ icon: "error", title: "Passwords do not match", text: "Please confirm your password." });

    document.getElementById("loading-screen")?.classList.remove("hidden");
    try {
      const res = await fetch((window.API_BASE || "") + "/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, token: tokenVal, new_password: pass }),
      });
      const data = await res.json().catch(() => ({}));
      document.getElementById("loading-screen")?.classList.add("hidden");

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Reset failed.");
      }

      await Swal.fire({
        icon: "success",
        title: "Password updated",
        text: "You can now sign in with your new password.",
        confirmButtonText: "Go to Login",
      });
      window.location.href = "login.html";
    } catch (err) {
      document.getElementById("loading-screen")?.classList.add("hidden");
      Swal.fire({ icon: "error", title: "Error", text: err?.message || "Something went wrong." });
    }
  });
});

