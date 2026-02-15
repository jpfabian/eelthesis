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
      const res = await fetch("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      document.getElementById("loading-screen")?.classList.add("hidden");

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate reset link.");
      }

      const resetLink = data.resetLink || "";

      await Swal.fire({
        icon: "success",
        title: "Reset link generated",
        html: resetLink
          ? `
            <div style="text-align:left; font-size:0.9rem;">
              <div class="text-muted-foreground" style="margin-bottom:.5rem;">Open this link to reset your password:</div>
              <div style="word-break:break-all; padding:.75rem; border:1px solid var(--border); border-radius:.5rem; background:var(--card); color:var(--foreground);">
                <a href="${resetLink}" style="color:var(--primary); text-decoration:underline;">${resetLink}</a>
              </div>
            </div>
          `
          : "If your email exists, you’ll receive a reset link.",
        confirmButtonText: "Continue",
      });

      if (resetLink) {
        window.location.href = resetLink;
      }
    } catch (err) {
      document.getElementById("loading-screen")?.classList.add("hidden");
      Swal.fire({ icon: "error", title: "Error", text: err?.message || "Something went wrong." });
    }
  });
});

