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

function checkPasswordStrength(password) {
  const strengthContainer = document.getElementById("rp-password-strength");
  if (!strengthContainer) return;

  let score = 0;
  const feedback = [];

  if (password.length >= 8 && password.length <= 30) score++;
  else feedback.push("At least 8 characters");

  if (/[A-Z]/.test(password)) score++;
  else feedback.push("Uppercase letter");

  if (/[0-9]/.test(password)) score++;
  else feedback.push("Number");

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push("Special character");

  let strength = "";
  let color = "";

  if (score <= 1) {
    strength = "Weak";
    color = "var(--destructive)";
  } else if (score <= 2) {
    strength = "Medium";
    color = "#f59e0b";
  } else {
    strength = "Strong";
    color = "var(--secondary)";
  }

  strengthContainer.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
      <div style="flex: 1; height: 0.25rem; background: var(--border); border-radius: 0.125rem;">
        <div style="width: ${(score / 4) * 100}%; height: 100%; background: ${color}; border-radius: 0.125rem; transition: all 0.3s;"></div>
      </div>
      <span style="font-size: 0.75rem; color: ${color};">${strength}</span>
    </div>
    ${feedback.length > 0 ? `<p style="font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.25rem;">Add: ${feedback.join(", ")}</p>` : ""}
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  } catch (_) {}

  const params = new URLSearchParams(window.location.search);
  let emailFromUrl = params.get("email") || sessionStorage.getItem("rp_email") || "";
  let tokenFromUrl = params.get("token") || sessionStorage.getItem("rp_token") || "";

  if (params.toString()) {
    if (emailFromUrl) sessionStorage.setItem("rp_email", emailFromUrl);
    if (tokenFromUrl) sessionStorage.setItem("rp_token", tokenFromUrl);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const digitInputs = [0, 1, 2, 3, 4, 5].map((i) => document.getElementById("rp-digit-" + i));
  if (tokenFromUrl && /^\d{6}$/.test(tokenFromUrl)) {
    tokenFromUrl.split("").forEach((ch, i) => {
      if (digitInputs[i]) digitInputs[i].value = ch;
    });
  }

  function getTokenFromDigits() {
    return digitInputs.map((el) => el?.value || "").join("");
  }

  digitInputs.forEach((input, idx) => {
    if (!input) return;
    input.addEventListener("input", (e) => {
      const val = (e.target.value || "").replace(/\D/g, "").slice(0, 1);
      e.target.value = val;
      if (val && idx < 5) digitInputs[idx + 1]?.focus();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && idx > 0) digitInputs[idx - 1]?.focus();
    });
    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6);
      pasted.split("").forEach((ch, i) => {
        if (digitInputs[i]) digitInputs[i].value = ch;
      });
      digitInputs[Math.min(pasted.length, 5)]?.focus();
    });
  });

  const stepVerify = document.getElementById("rp-step-verify");
  const stepPassword = document.getElementById("rp-step-password");
  const descriptionEl = document.getElementById("rp-description");
  const loadingText = document.getElementById("loading-text");

  // Step 1: Verify code
  const verifyForm = document.getElementById("verify-code-form");
  if (verifyForm) {
    verifyForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const emailVal = (emailFromUrl || "").trim();
      const tokenVal = getTokenFromDigits();

      if (!emailVal) {
        document.getElementById("loading-screen")?.classList.add("hidden");
        return Swal.fire({
          icon: "error",
          title: "Email missing",
          text: "Your email address could not be found. Please go back to the Forgot Password page and try again.",
          confirmButtonText: "Go Back",
        }).then(() => {
          window.location.href = "forgot-password.html";
        });
      }

      if (!tokenVal || tokenVal.length < 6) {
        document.getElementById("loading-screen")?.classList.add("hidden");
        return Swal.fire({
          icon: "info",
          title: "Incomplete code",
          text: "Please enter the full 6-digit verification code from your email.",
        });
      }

      if (!/^\d{6}$/.test(tokenVal)) {
        document.getElementById("loading-screen")?.classList.add("hidden");
        return Swal.fire({
          icon: "error",
          title: "Invalid code",
          text: "The verification code should only contain numbers.",
        });
      }

      document.getElementById("loading-screen")?.classList.remove("hidden");
      if (loadingText) loadingText.textContent = "Verifying code...";
      try {
        const res = await fetch((window.API_BASE || "") + "/api/auth/verify-reset-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailVal, code: tokenVal }),
        });
        const data = await res.json().catch(() => ({}));
        document.getElementById("loading-screen")?.classList.add("hidden");

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Invalid or expired code.");
        }

        if (stepVerify) stepVerify.classList.add("hidden");
        if (stepPassword) stepPassword.classList.remove("hidden");
        if (descriptionEl) descriptionEl.textContent = "Create a new password for your account.";

        document.getElementById("rp-email-hidden").value = emailVal;
        document.getElementById("rp-token-hidden").value = tokenVal;

        const passInput = document.getElementById("rp-password");
        if (passInput) {
          passInput.addEventListener("input", () => checkPasswordStrength(passInput.value));
          checkPasswordStrength(passInput.value);
        }

        try {
          if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
        } catch (_) {}
      } catch (err) {
        document.getElementById("loading-screen")?.classList.add("hidden");
        Swal.fire({ icon: "error", title: "Verification failed", text: err?.message || "Something went wrong." });
      }
    });
  }

  // Step 2: Update password
  const resetForm = document.getElementById("reset-password-form");
  if (!resetForm) return;

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailVal = document.getElementById("rp-email-hidden")?.value?.trim();
    const tokenVal = document.getElementById("rp-token-hidden")?.value?.trim();
    const pass = document.getElementById("rp-password")?.value ?? "";
    const confirm = document.getElementById("rp-confirm")?.value ?? "";

    if (!emailVal || !tokenVal) return;
    if (pass.length < 8 || pass.length > 30) return Swal.fire({ icon: "error", title: "Invalid password", text: "Password must be 8–30 characters." });
    if (!/[A-Z]/.test(pass)) return Swal.fire({ icon: "error", title: "Invalid password", text: "Password must include at least one capital letter." });
    if (!/[0-9]/.test(pass)) return Swal.fire({ icon: "error", title: "Invalid password", text: "Password must include at least one number." });
    if (!/[^A-Za-z0-9]/.test(pass)) return Swal.fire({ icon: "error", title: "Invalid password", text: "Password must include at least one special character." });
    if (pass !== confirm) return Swal.fire({ icon: "error", title: "Passwords do not match", text: "Please confirm your password." });

    document.getElementById("loading-screen")?.classList.remove("hidden");
    if (loadingText) loadingText.textContent = "Updating password...";
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
      sessionStorage.removeItem("rp_email");
      sessionStorage.removeItem("rp_token");
      window.location.href = "login.html";
    } catch (err) {
      document.getElementById("loading-screen")?.classList.add("hidden");
      Swal.fire({ icon: "error", title: "Error", text: err?.message || "Something went wrong." });
    }
  });
});
