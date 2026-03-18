(function () {
  "use strict";

  let cheatingViolations = 0;
  let cheatingVoided = false;
  let cheatingListenersCleanup = null;

  const isTakePronunciationPage = () =>
    typeof window !== "undefined" &&
    (window.location.pathname || "").includes("take-pronunciation");

  function goBack() {
    if (window.opener && !window.opener.closed) {
      window.opener.location.reload();
      window.opener.focus();
      window.close();
    } else {
      const returnUrl =
        new URLSearchParams(window.location.search).get("return") ||
        "pronunciation-lessons.html";
      window.location.href = returnUrl;
    }
  }

  const originalCloseTakePronunciationModal = window.closeTakePronunciationModal;
  if (typeof originalCloseTakePronunciationModal === "function") {
    window.closeTakePronunciationModal = function () {
      if (isTakePronunciationPage()) {
        if (window.opener && !window.opener.closed) {
          window.opener.location.reload();
          window.opener.focus();
          window.close();
        } else {
          window.location.href =
            new URLSearchParams(window.location.search).get("return") ||
            "pronunciation-lessons.html";
        }
      } else {
        originalCloseTakePronunciationModal();
      }
    };
  }

  function requestFullscreenForQuiz() {
    const el = document.documentElement;
    try {
      if (el && el.requestFullscreen) el.requestFullscreen().catch(function () {});
      else if (el && el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el && el.msRequestFullscreen) el.msRequestFullscreen();
    } catch (e) {}
  }

  let quizStartTime = 0;
  function handleCheatingViolation() {
    if ((new URLSearchParams(window.location.search)).get("retake") === "1") return;
    if (cheatingVoided) return;
    const graceMs = 15000;
    if (quizStartTime && Date.now() - quizStartTime < graceMs) return;
    cheatingViolations++;
    if (cheatingViolations === 1) {
      const modal = document.getElementById("quiz-cheating-warning-modal");
      const okBtn = document.getElementById("quiz-cheating-warning-ok");
      if (modal) modal.classList.remove("hidden");
      if (okBtn && !okBtn.__cheatingBound) {
        okBtn.__cheatingBound = true;
        okBtn.addEventListener("click", function () {
          if (modal) modal.classList.add("hidden");
          requestFullscreenForQuiz();
        });
      }
    } else {
      cheatingVoided = true;
      if (cheatingListenersCleanup) cheatingListenersCleanup();
      voidPronunciationQuiz();
    }
  }

  function setupCheatingListeners() {
    if (cheatingListenersCleanup) cheatingListenersCleanup();
    const onVisibilityChange = function () {
      if (document.hidden) handleCheatingViolation();
    };
    const onFullscreenChange = function () {
      if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        handleCheatingViolation();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);
    cheatingListenersCleanup = function () {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
      cheatingListenersCleanup = null;
    };
  }

  async function voidPronunciationQuiz() {
    try { clearInterval(pronunciationTimer); } catch (e) {}
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (!user || !pronunciationQuizData) return;
    const selectedClass = (() => {
      try { return JSON.parse(localStorage.getItem("eel_selected_class") || "null"); } catch (_) { return null; }
    })();
    const classId = selectedClass?.id != null ? selectedClass.id : localStorage.getItem("eel_selected_class_id");
    try {
      const res = await fetch((window.API_BASE || "") + "/api/pronunciation-void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: user.user_id,
          quiz_id: pronunciationQuizData.quiz_id,
          class_id: classId || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        pronunciationQuizData = null;
        pronunciationAnswers = {};
        document.getElementById("quiz-page").classList.add("hidden");
        showPronunciationQuizDone(0, false);
        const msgEl = document.getElementById("pronunciation-quiz-done-msg");
        if (msgEl) setQuizInvalidatedMessage(msgEl);
      }
    } catch (err) {
      if (typeof showNotification === "function") showNotification("Error submitting quiz.", "error");
    }
  }

  function setQuizInvalidatedMessage(el) {
    if (!el) return;
    el.classList.add("eel-alert", "eel-alert--danger");
    el.innerHTML =
      '<span class="eel-alert__icon" aria-hidden="true">⚠️</span>' +
      '<span class="eel-alert__content">' +
      '<span class="eel-alert__title">Quiz invalidated (score of 0)</span>' +
      '<span class="eel-alert__text">The student exited fullscreen or switched tabs multiple times, resulting in an automatic zero score.</span>' +
      "</span>";
  }

  const originalSubmitPronunciationQuiz = window.submitPronunciationQuiz;
  if (typeof originalSubmitPronunciationQuiz === "function") {
    window.submitPronunciationQuiz = async function (event) {
      if (event) event.preventDefault();
      if (!isTakePronunciationPage()) {
        return originalSubmitPronunciationQuiz.call(this, event);
      }
      if (window.pronunciationSubmitting) return;
      window.pronunciationSubmitting = true;
      const submitBtn = document.getElementById("pronunciation-submit-btn");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.style.pointerEvents = "none"; submitBtn.style.opacity = "0.6"; }
      clearInterval(pronunciationTimer);
      const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
      if (!user) return;
      if (cheatingListenersCleanup) {
        cheatingListenersCleanup();
        cheatingListenersCleanup = null;
      }
      const isRetake = (new URLSearchParams(window.location.search)).get("retake") === "1";
      const formData = new FormData();
      formData.append("student_id", user.user_id);
      formData.append("quiz_id", pronunciationQuizData.quiz_id);
      if (isRetake) formData.append("retake", "1");
      formData.append("cheating_violations", isRetake ? "0" : String(cheatingViolations));
      formData.append("cheating_voided", isRetake ? "0" : (cheatingVoided ? "1" : "0"));
      const selectedClass = (() => {
        try {
          return JSON.parse(localStorage.getItem("eel_selected_class") || "null");
        } catch (_) {
          return null;
        }
      })();
      const classId = selectedClass?.id != null ? selectedClass.id : localStorage.getItem("eel_selected_class_id");
      if (classId) formData.append("class_id", classId);
      for (let i = 0; i < pronunciationQuizData.questions.length; i++) {
        const answer = pronunciationAnswers[i];
        if (!answer) continue;
        formData.append("audio_" + i, answer.blob, "answer_q" + answer.questionId + ".webm");
        formData.append("question_id_" + i, answer.questionId);
        formData.append("answer_" + i, answer.transcript || "");
        formData.append("difficulty_" + i, pronunciationQuizData.questions[i].difficulty || pronunciationQuizData.difficulty);
      }

      try {
        const res = await fetch((window.API_BASE || "") + "/api/pronunciation-submit", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          pronunciationQuizData = null;
          pronunciationAnswers = {};
          document.getElementById("quiz-page").classList.add("hidden");
          const accuracy = data.accuracy != null ? Number(data.accuracy) : 0;
          showPronunciationQuizDone(accuracy, !!data.show_retake);
          if (cheatingVoided) {
            const msgEl = document.getElementById("pronunciation-quiz-done-msg");
            if (msgEl) setQuizInvalidatedMessage(msgEl);
          }
          if (data.unlockedNext && typeof showNotification === "function") {
            showNotification("Great job! Next quiz unlocked.", "success");
          }
        } else {
          if (typeof showNotification === "function") showNotification("Failed to submit quiz.", "error");
          window.pronunciationSubmitting = false;
          if (submitBtn) { submitBtn.disabled = false; submitBtn.style.pointerEvents = ""; submitBtn.style.opacity = ""; }
        }
      } catch (err) {
        if (typeof showNotification === "function") showNotification("Error submitting quiz.", "error");
        window.pronunciationSubmitting = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.pointerEvents = ""; submitBtn.style.opacity = ""; }
      }
    };
  }

  function showError(msg) {
    document.getElementById("loading-screen").classList.add("hidden");
    document.getElementById("quiz-page").classList.add("hidden");
    const errEl = document.getElementById("quiz-error");
    const msgEl = document.getElementById("quiz-error-message");
    if (msgEl) msgEl.textContent = msg || "Invalid quiz or not available.";
    if (errEl) errEl.classList.remove("hidden");
  }

  function formatPronunciationPassageHTML(text) {
    if (!text || typeof text !== "string") return "<p>(No instructions provided)</p>";
    const escaped = String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
    return '<div class="reading-passage__label"><span class="reading-passage__icon" aria-hidden="true">🎤</span> Pronunciation</div><div class="reading-passage__content"><p>' + escaped + "</p></div>";
  }

  function showPronunciationPassageOnlyView() {
    const passageEl = document.getElementById("pronunciation-passage");
    const promptEl = document.getElementById("pronunciation-passage-prompt");
    const questionContent = document.getElementById("pronunciation-question-content");
    const prevBtn = document.getElementById("pronunciation-prev-btn");
    const nextBtn = document.getElementById("pronunciation-next-btn");
    const submitBtn = document.getElementById("pronunciation-submit-btn");
    if (passageEl) passageEl.classList.remove("hidden");
    if (promptEl) promptEl.classList.remove("hidden");
    if (questionContent) questionContent.classList.add("hidden");
    if (prevBtn) {
      prevBtn.disabled = true;
      prevBtn.style.opacity = "0.5";
      prevBtn.classList.remove("hidden");
    }
    if (submitBtn) submitBtn.classList.add("hidden");
    if (nextBtn) {
      nextBtn.classList.remove("hidden");
      nextBtn.style.display = "inline-flex";
      nextBtn.innerHTML = "Continue to Questions <i data-lucide=\"chevron-right\" class=\"size-4\"></i>";
    }
    if (typeof updatePronunciationProgress === "function") updatePronunciationProgress();
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  function showPronunciationQuestionView() {
    const passageEl = document.getElementById("pronunciation-passage");
    const promptEl = document.getElementById("pronunciation-passage-prompt");
    const questionContent = document.getElementById("pronunciation-question-content");
    const prevBtn = document.getElementById("pronunciation-prev-btn");
    const nextBtn = document.getElementById("pronunciation-next-btn");
    const submitBtn = document.getElementById("pronunciation-submit-btn");
    if (passageEl) passageEl.classList.remove("hidden");
    if (promptEl) promptEl.classList.add("hidden");
    if (questionContent) questionContent.classList.remove("hidden");
    if (prevBtn) {
      prevBtn.disabled = pronunciationCurrentIndex === 0;
      prevBtn.style.opacity = pronunciationCurrentIndex === 0 ? "0.5" : "1";
      prevBtn.innerHTML = "<i data-lucide=\"chevron-left\" class=\"size-4\"></i> Previous";
    }
    if (nextBtn) nextBtn.innerHTML = "Next <i data-lucide=\"chevron-right\" class=\"size-4\"></i>";
    const total = pronunciationQuizData && pronunciationQuizData.questions ? pronunciationQuizData.questions.length : 0;
    if (pronunciationCurrentIndex >= total - 1) {
      if (submitBtn) { submitBtn.classList.remove("hidden"); submitBtn.style.display = "inline-flex"; }
      if (nextBtn) nextBtn.classList.add("hidden");
    } else {
      if (submitBtn) submitBtn.classList.add("hidden");
      if (nextBtn) { nextBtn.classList.remove("hidden"); nextBtn.style.display = "inline-flex"; }
    }
    if (typeof loadPronunciationQuestion === "function") loadPronunciationQuestion(pronunciationCurrentIndex);
    if (typeof updatePronunciationProgress === "function") updatePronunciationProgress();
    if (typeof resetRecordingUI === "function") resetRecordingUI();
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  const originalPronunciationPrevQuestion = window.pronunciationPrevQuestion;
  const originalPronunciationNextQuestion = window.pronunciationNextQuestion;
  if (typeof originalPronunciationPrevQuestion === "function") {
    window.pronunciationPrevQuestion = function () {
      if (!isTakePronunciationPage()) return originalPronunciationPrevQuestion();
      if (pronunciationCurrentIndex > 0) {
        pronunciationCurrentIndex--;
        showPronunciationQuestionView();
      }
    };
  }
  if (typeof originalPronunciationNextQuestion === "function") {
    window.pronunciationNextQuestion = function () {
      if (!isTakePronunciationPage()) return originalPronunciationNextQuestion();
      if (!pronunciationAnswers[pronunciationCurrentIndex]) {
        if (typeof showNotification === "function") showNotification("Please record your answer before moving on.", "warning");
        return;
      }
      if (pronunciationCurrentIndex < pronunciationQuizData.questions.length - 1) {
        pronunciationCurrentIndex++;
        showPronunciationQuestionView();
      }
    };
  }

  function showPronunciationQuizDone(accuracyValue, showRetake) {
    const doneEl = document.getElementById("quiz-done");
    const card = document.getElementById("pronunciation-quiz-done-card");
    const charImg = document.getElementById("pronunciation-quiz-done-character");
    const percentEl = document.getElementById("pronunciation-quiz-done-percent");
    const msgEl = document.getElementById("pronunciation-quiz-done-msg");
    const retakeBtn = document.getElementById("pronunciation-quiz-done-retake-btn");
    if (!doneEl) return;
    const totalAccuracy = Math.max(0, Math.min(parseFloat(accuracyValue) || 0, 100));
    if (card) card.classList.remove("quiz-done--high", "quiz-done--low");
    if (card) card.classList.add(totalAccuracy >= 70 ? "quiz-done--high" : "quiz-done--low");
    if (charImg) {
      charImg.src = totalAccuracy >= 70 ? "image/eel-character-celebrate.png" : "image/eel-character-sad.png";
      charImg.alt = totalAccuracy >= 70 ? "EEL character celebrating" : "EEL character";
    }
    if (percentEl) percentEl.textContent = Math.round(totalAccuracy) + "%";
    if (msgEl) {
      if (totalAccuracy >= 90) msgEl.textContent = "🌟 Excellent pronunciation! Keep it up!";
      else if (totalAccuracy >= 85) msgEl.textContent = "👏 Great job! A little more practice and you'll be perfect!";
      else if (totalAccuracy >= 70) msgEl.textContent = "💪 Good effort! Keep practicing — you're improving!";
      else if (totalAccuracy >= 50) msgEl.textContent = "📢 Keep practicing! Focus on clear pronunciation.";
      else msgEl.textContent = "🎯 Don't give up! Listen to the word again and practice.";
    }
    if (retakeBtn) {
      if (showRetake) retakeBtn.classList.remove("hidden");
      else retakeBtn.classList.add("hidden");
    }
    doneEl.classList.remove("hidden");
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!isTakePronunciationPage()) return;

    document.querySelectorAll(".back-to-lessons-link").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        goBack();
      });
    });
    const retakeBtn = document.getElementById("pronunciation-quiz-done-retake-btn");
    if (retakeBtn) {
      retakeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        const params = new URLSearchParams(window.location.search);
        params.set("retake", "1");
        params.delete("review");
        window.location.href = window.location.pathname + "?" + params.toString();
      });
    }

    const user = (() => {
      try {
        const stored = localStorage.getItem("eel_user");
        if (!stored) return null;
        return JSON.parse(stored);
      } catch (_) {
        return null;
      }
    })();

    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const quizId = params.get("quiz_id") || sessionStorage.getItem("eel_quiz_id");
    const isReview = params.get("review") === "1";

    if (!quizId) {
      showError("Missing quiz. Open the quiz from Pronunciation Lessons.");
      return;
    }

    if (isReview) {
      fetch(
        (window.API_BASE || "") +
          "/api/pronunciation-review?student_id=" +
          encodeURIComponent(user.user_id) +
          "&quiz_id=" +
          encodeURIComponent(quizId)
      )
        .then(function (r) {
          if (!r.ok) throw new Error("Could not load review");
          return r.json();
        })
        .then(function (data) {
          if (!data.success || !data.answers || data.answers.length === 0) {
            showError("No recorded answers found for this quiz.");
            return;
          }
          document.getElementById("loading-screen").classList.add("hidden");
          document.getElementById("quiz-page").classList.add("hidden");
          const wrap = document.getElementById("pronunciation-review-wrap");
          const titleEl = document.getElementById("pronunciation-review-title");
          const container = document.getElementById("pronunciation-review-answers");
          if (titleEl) titleEl.textContent = (data.quiz?.title || "Review") + " – Your answers";
          if (container) {
            container.innerHTML = data.answers
              .map(function (a, i) {
                const qText = a.question_text || "Question " + (i + 1);
                const score = a.pronunciation_score != null ? a.pronunciation_score + "%" : "—";
                return (
                  '<div class="p-4 mb-3 border rounded-lg bg-muted/10 shadow-sm">' +
                  "<h4 class='font-semibold text-primary mb-1'>Question " +
                  (i + 1) +
                  "</h4>" +
                  "<p class='text-sm italic mb-2'>" +
                  String(qText).replace(/</g, "&lt;").replace(/>/g, "&gt;") +
                  "</p>" +
                  (a.student_audio
                    ? '<audio controls src="' +
                      (a.student_audio.startsWith("/") ? (window.API_BASE || "") + a.student_audio : a.student_audio) +
                      '" class="w-full mb-2"></audio>'
                    : "") +
                  "<p class='text-sm text-green-600 font-medium'>Score: " +
                  score +
                  "</p></div>"
                );
              })
              .join("");
          }
          if (wrap) wrap.classList.remove("hidden");
          if (window.lucide && typeof window.lucide.createIcons === "function")
            window.lucide.createIcons();
        })
        .catch(function (err) {
          showError(err.message || "Failed to load review.");
        });
      return;
    }

    fetch((window.API_BASE || "") + "/api/pronunciation-quizzes/" + quizId)
      .then(function (r) {
        if (!r.ok) throw new Error("Quiz not found");
        return r.json();
      })
      .then(function (quiz) {
        const now = new Date();
        const unlockTime = quiz.unlock_time ? new Date(quiz.unlock_time.replace(" ", "T")) : null;
        const lockTime = quiz.lock_time ? new Date(quiz.lock_time.replace(" ", "T")) : null;
        if (
          (unlockTime && now < unlockTime) ||
          (lockTime && now > lockTime) ||
          Number(quiz.is_locked) === 1
        ) {
          throw new Error("This quiz is not available.");
        }

        pronunciationQuizData = quiz;
        pronunciationCurrentIndex = 0;
        pronunciationAnswers = {};

        document.getElementById("pronunciation-quiz-title").textContent =
          quiz.title || "Pronunciation Practice";
        document.getElementById("pronunciation-passage").innerHTML = formatPronunciationPassageHTML(
          quiz.passage || "Click the microphone button to record your pronunciation. Listen to your recording before submitting. Speak clearly and at a natural pace."
        );

        const countdownEl = document.getElementById("pronunciation-countdown");
        if (quiz.time_limit) {
          pronunciationRemainingSeconds = Number(quiz.time_limit) * 60;
          clearInterval(pronunciationTimer);
          pronunciationTimer = setInterval(function () {
            if (pronunciationRemainingSeconds <= 0) {
              clearInterval(pronunciationTimer);
              if (countdownEl) countdownEl.textContent = "00:00";
              if (typeof submitPronunciationQuiz === "function") submitPronunciationQuiz();
              return;
            }
            const min = Math.floor(pronunciationRemainingSeconds / 60);
            const sec = pronunciationRemainingSeconds % 60;
            if (countdownEl)
              countdownEl.textContent =
                (min < 10 ? "0" : "") + min + ":" + (sec < 10 ? "0" : "") + sec;
            pronunciationRemainingSeconds--;
          }, 1000);
          document.getElementById("pronunciation-timer-container").style.display = "";
        } else {
          if (countdownEl) countdownEl.textContent = "";
          document.getElementById("pronunciation-timer-container").style.display = "none";
        }

        document.getElementById("loading-screen").classList.add("hidden");
        const gateEl = document.getElementById("quiz-fullscreen-gate");
        const quizPageEl = document.getElementById("quiz-page");
        function requestFullscreen() {
          const el = document.documentElement;
          if (el && el.requestFullscreen) el.requestFullscreen().catch(function () {});
        }
        function startQuizInFullscreen() {
          quizStartTime = Date.now();
          requestFullscreen();
          if (gateEl) gateEl.classList.add("hidden");
          if (quizPageEl) quizPageEl.classList.remove("hidden");
          setupCheatingListeners();
          showPronunciationQuestionView();
        }
        if (gateEl) {
          gateEl.classList.remove("hidden");
          if (window.lucide && typeof window.lucide.createIcons === "function")
            window.lucide.createIcons();
          const getStartedBtn = document.getElementById("quiz-gate-get-started-btn");
          function goFullscreenAndStart() {
            if (getStartedBtn) getStartedBtn.removeEventListener("click", goFullscreenAndStart);
            startQuizInFullscreen();
          }
          if (getStartedBtn) getStartedBtn.addEventListener("click", goFullscreenAndStart, { once: true });
        } else {
          startQuizInFullscreen();
        }
      })
      .catch(function (err) {
        showError(err.message || "Failed to load quiz.");
      });
  });
})();
