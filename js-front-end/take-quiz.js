(function () {
  "use strict";

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  let quizData = null;
  let currentQuestionIndex = 0;
  let studentAnswers = {};
  let countdownInterval = null;
  let teacherQuizAttemptId = null;
  let submitResult = null;

  function getQuestionTypeLabel(q) {
    if (q.question_type === "fill_blank") return "Fill in the blank";
    if (q.question_type === "essay") return "Essay";
    if (q.question_type !== "mcq" || !q.options || !q.options.length) return null;
    const opts = q.options.map(function (o) { return String(o.option_text || "").trim(); });
    const hasOther = opts.some(function (t) { return t === "(Other)"; });
    if (q.options.length === 2 && hasOther) return "Identification";
    var isTrueFalse = opts.length === 2 && opts.indexOf("True") !== -1 && opts.indexOf("False") !== -1;
    if (isTrueFalse) return "True or False";
    return "Multiple choice";
  }

  function renderQuestion(q, index) {
    var div = document.createElement("div");
    div.classList.add("question-item");

    var headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.alignItems = "center";
    headerRow.style.gap = "0.5rem";
    headerRow.style.flexWrap = "wrap";
    headerRow.style.marginBottom = "0.5rem";

    var header = document.createElement("h4");
    header.textContent = "Question " + (index + 1) + " of " + quizData.questions.length;
    header.style.fontWeight = "600";
    header.style.margin = "0";
    header.style.fontSize = "1.125rem";
    headerRow.appendChild(header);

    var typeLabel = getQuestionTypeLabel(q);
    if (typeLabel) {
      var badge = document.createElement("span");
      badge.className = "ai-question-type-badge";
      badge.textContent = typeLabel;
      headerRow.appendChild(badge);
    }
    div.appendChild(headerRow);

    var p = document.createElement("p");
    p.textContent = q.question_text || "";
    p.style.marginBottom = "1rem";
    p.classList.add("quiz-question-text");
    div.appendChild(p);

    var studentAnswer = studentAnswers[q.question_id];
    var isIdentification =
      q.question_type === "mcq" &&
      q.options &&
      q.options.length === 2 &&
      q.options.some(function (o) { return String(o.option_text || "").trim() === "(Other)"; });

    if (isIdentification) {
      var input = document.createElement("input");
      input.type = "text";
      input.name = "take_identification_" + q.question_id;
      input.value = typeof studentAnswer === "string" ? studentAnswer : "";
      input.placeholder = "Type your answer";
      input.classList.add("form-input");
      input.style.width = "100%";
      input.style.padding = "0.75rem";
      input.setAttribute("autocomplete", "off");
      div.appendChild(input);
    } else if (q.question_type === "mcq" && q.options && q.options.length) {
      q.options.forEach(function (opt) {
        var label = document.createElement("label");
        label.classList.add("quiz-option");
        var radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "take_question_" + q.question_id;
        radio.value = opt.option_id;
        var span = document.createElement("span");
        span.textContent = opt.option_text;
        label.appendChild(radio);
        label.appendChild(span);
        div.appendChild(label);
      });
    } else if (q.question_type === "fill_blank" && q.blanks && q.blanks.length) {
      var realAnswers = q.blanks.map(function (b) { return (b.correct_answer || b.answer_text || "").trim(); }).filter(Boolean);
      var randomDistractors = ["understanding", "tone", "message", "feedback", "interpretation", "receiver", "barrier", "context", "emotion", "transmission", "clarity", "listening", "expression", "meaning", "perception"];
      var combined = realAnswers.slice();
      randomDistractors.forEach(function (w) {
        if (combined.indexOf(w) === -1) combined.push(w);
      });
      var shuffledExtras = combined.filter(function (w) { return realAnswers.indexOf(w) === -1; }).sort(function () { return Math.random() - 0.5; }).slice(0, Math.max(0, 10 - realAnswers.length));
      var finalWords = realAnswers.concat(shuffledExtras).sort(function () { return Math.random() - 0.5; });

      q.blanks.forEach(function (blank) {
        var blankDiv = document.createElement("div");
        blankDiv.style.marginBottom = "1rem";
        var blabel = document.createElement("label");
        blabel.textContent = "Blank " + blank.blank_number + ":";
        blabel.classList.add("form-label");
        blankDiv.appendChild(blabel);
        var binput = document.createElement("input");
        binput.type = "text";
        binput.name = "take_blank_" + blank.blank_id;
        binput.value = (studentAnswer && studentAnswer[blank.blank_id]) || "";
        binput.classList.add("form-input");
        binput.style.width = "100%";
        binput.style.padding = "0.75rem";
        blankDiv.appendChild(binput);
        div.appendChild(blankDiv);
      });
      var wordBank = document.createElement("div");
      wordBank.className = "mt-4 p-4 border border-border rounded-lg bg-secondary/10 shadow-sm";
      wordBank.innerHTML = "<strong class=\"block mb-3 text-primary text-lg\">Word Bank:</strong><div class=\"grid grid-cols-5 sm:grid-cols-3 md:grid-cols-5 gap-2\">" + finalWords.map(function (w) { return "<div class=\"px-3 py-2 text-sm font-medium text-center bg-white border border-gray-200 rounded-md\">" + escapeHtml(w) + "</div>"; }).join("") + "</div>";
      div.appendChild(wordBank);
    } else if (q.question_type === "essay") {
      var textarea = document.createElement("textarea");
      textarea.name = "take_essay_" + q.question_id;
      textarea.rows = 6;
      textarea.value = studentAnswer || "";
      textarea.classList.add("form-textarea");
      textarea.style.width = "100%";
      textarea.style.minHeight = "150px";
      div.appendChild(textarea);
    }
    return div;
  }

  function updateProgressBar() {
    var progressBar = document.getElementById("take-quiz-progress");
    if (!quizData || !quizData.questions || !quizData.questions.length) return;
    var total = quizData.questions.length;
    var pct = ((currentQuestionIndex + 1) / total) * 100;
    progressBar.style.width = pct + "%";
  }

  function showSingleQuestion(question) {
    var container = document.getElementById("take-quiz-questions");
    var nextBtn = document.getElementById("take-quiz-next-btn");
    var submitBtn = document.getElementById("take-quiz-submit-btn");
    var prevBtn = document.getElementById("take-quiz-prev-btn");
    if (!container) return;

    container.innerHTML = "";
    container.appendChild(renderQuestion(question, currentQuestionIndex));

    if (!question) return;

    var isIdentification =
      question.question_type === "mcq" &&
      question.options &&
      question.options.length === 2 &&
      question.options.some(function (o) { return String(o.option_text || "").trim() === "(Other)"; });

    container.querySelectorAll("input, textarea").forEach(function (el) {
      el.addEventListener("input", function () {
        if (question.question_type === "fill_blank") {
          if (!studentAnswers[question.question_id]) studentAnswers[question.question_id] = {};
          var blankId = el.name.replace("take_blank_", "");
          studentAnswers[question.question_id][blankId] = el.value;
        } else if (question.question_type === "essay") {
          studentAnswers[question.question_id] = el.value;
        } else if (isIdentification && el.name === "take_identification_" + question.question_id) {
          studentAnswers[question.question_id] = el.value;
        }
      });
      el.addEventListener("change", function () {
        if (question.question_type === "mcq" && !isIdentification) studentAnswers[question.question_id] = el.value;
      });
    });

    var savedAnswer = studentAnswers[question.question_id];
    if (savedAnswer !== undefined) {
      if (isIdentification) {
        var identInput = container.querySelector("input[name=\"take_identification_" + question.question_id + "\"]");
        if (identInput) identInput.value = typeof savedAnswer === "string" ? savedAnswer : "";
      } else if (question.question_type === "mcq") {
        var radio = container.querySelector("input[name=\"take_question_" + question.question_id + "\"][value=\"" + savedAnswer + "\"]");
        if (radio) radio.checked = true;
      } else if (question.question_type === "fill_blank" && typeof savedAnswer === "object") {
        if (question.blanks) question.blanks.forEach(function (b) {
          var binput = container.querySelector("input[name=\"take_blank_" + b.blank_id + "\"]");
          if (binput && savedAnswer[b.blank_id] !== undefined) binput.value = savedAnswer[b.blank_id];
        });
      } else if (question.question_type === "essay") {
        var ta = container.querySelector("textarea[name=\"take_essay_" + question.question_id + "\"]");
        if (ta) ta.value = savedAnswer;
      }
    }

    var total = quizData ? quizData.questions.length : 0;
    if (prevBtn) {
      prevBtn.disabled = currentQuestionIndex === 0;
      prevBtn.style.opacity = currentQuestionIndex === 0 ? "0.5" : "1";
      prevBtn.classList.remove("hidden");
    }
    if (currentQuestionIndex >= total - 1) {
      if (submitBtn) { submitBtn.classList.remove("hidden"); submitBtn.style.display = "inline-flex"; }
      if (nextBtn) nextBtn.classList.add("hidden");
    } else {
      if (submitBtn) submitBtn.classList.add("hidden");
      if (nextBtn) { nextBtn.classList.remove("hidden"); nextBtn.style.display = "inline-flex"; }
    }
    updateProgressBar();
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  function saveCurrentAnswer() {
    if (!quizData || !quizData.questions) return;
    var question = quizData.questions[currentQuestionIndex];
    if (!question) return;

    var isIdentification =
      question.question_type === "mcq" &&
      question.options &&
      question.options.length === 2 &&
      question.options.some(function (o) { return String(o.option_text || "").trim() === "(Other)"; });

    if (isIdentification) {
      var input = document.querySelector("input[name=\"take_identification_" + question.question_id + "\"]");
      if (input) studentAnswers[question.question_id] = input.value || "";
    } else if (question.question_type === "mcq") {
      var selected = document.querySelector("input[name=\"take_question_" + question.question_id + "\"]:checked");
      if (selected) studentAnswers[question.question_id] = selected.value;
    } else if (question.question_type === "fill_blank") {
      var blanksObj = {};
      if (question.blanks) question.blanks.forEach(function (b) {
        var binput = document.querySelector("input[name=\"take_blank_" + b.blank_id + "\"]");
        if (binput) blanksObj[b.blank_id] = binput.value || "";
      });
      studentAnswers[question.question_id] = blanksObj;
    } else if (question.question_type === "essay") {
      var textarea = document.querySelector("textarea[name=\"take_essay_" + question.question_id + "\"]");
      if (textarea) studentAnswers[question.question_id] = textarea.value || "";
    }
  }

  function prevQuestion() {
    if (!quizData || !quizData.questions.length) return;
    if (currentQuestionIndex <= 0) return;
    saveCurrentAnswer();
    currentQuestionIndex--;
    showSingleQuestion(quizData.questions[currentQuestionIndex]);
  }

  function nextQuestion() {
    if (!quizData || !quizData.questions.length) return;
    saveCurrentAnswer();
    if (currentQuestionIndex < quizData.questions.length - 1) {
      currentQuestionIndex++;
      showSingleQuestion(quizData.questions[currentQuestionIndex]);
    }
  }

  function hasAnswerForQuestion(q, answer) {
    if (answer === undefined || answer === null) return false;
    var isIdentification =
      q.question_type === "mcq" && q.options && q.options.length === 2 &&
      q.options.some(function (o) { return String(o.option_text || "").trim() === "(Other)"; });
    if (q.question_type === "mcq" && !isIdentification) return true;
    if (typeof answer === "string") return String(answer).trim().length > 0;
    if (q.question_type === "fill_blank" && typeof answer === "object" && q.blanks) {
      return q.blanks.some(function (b) {
        var v = answer[b.blank_id];
        return v != null && String(v).trim().length > 0;
      });
    }
    return false;
  }

  function getAnswerDisplayText(q, answer) {
    if (answer === undefined || answer === null) return "—";
    var isIdentification =
      q.question_type === "mcq" && q.options && q.options.length === 2 &&
      q.options.some(function (o) { return String(o.option_text || "").trim() === "(Other)"; });
    if (q.question_type === "mcq" && !isIdentification && q.options && q.options.length) {
      var optId = Number(answer);
      var opt = q.options.filter(function (o) { return Number(o.option_id) === optId; })[0];
      return opt ? (opt.option_text || "—") : String(answer);
    }
    if (typeof answer === "string") return answer || "—";
    if (q.question_type === "fill_blank" && typeof answer === "object" && q.blanks) {
      return q.blanks.map(function (b) { return "Blank " + b.blank_number + ": " + (answer[b.blank_id] != null ? answer[b.blank_id] : "—"); }).join("; ");
    }
    return String(answer);
  }

  function buildConfirmAnswersHtml() {
    if (!quizData || !quizData.questions || !quizData.questions.length) return "";
    saveCurrentAnswer();
    var html = [];
    quizData.questions.forEach(function (q, i) {
      var ans = studentAnswers[q.question_id];
      var hasAnswer = hasAnswerForQuestion(q, ans);
      var text = getAnswerDisplayText(q, ans);
      var shortQ = (q.question_text || "Question " + (i + 1)).slice(0, 80);
      if ((q.question_text || "").length > 80) shortQ += "…";
      var itemClass = "quiz-confirm-item " + (hasAnswer ? "quiz-confirm-item--answered" : "quiz-confirm-item--unanswered");
      html.push(
        '<div class="' + itemClass + '">' +
          '<div style="font-weight: 600; font-size: 0.875rem; margin-bottom: 0.35rem;">Question ' + (i + 1) + '</div>' +
          '<div style="font-size: 0.8125rem; color: var(--muted-foreground); margin-bottom: 0.35rem;">' + escapeHtml(shortQ) + '</div>' +
          '<div style="font-size: 0.9375rem;"><strong>Your answer:</strong> ' + escapeHtml(text) + '</div>' +
        '</div>'
      );
    });
    return html.join("");
  }

  function showSubmitConfirmModal() {
    if (!quizData) return;
    var container = document.getElementById("quiz-submit-confirm-answers");
    var modal = document.getElementById("quiz-submit-confirm-modal");
    if (!container || !modal) return;
    container.innerHTML = buildConfirmAnswersHtml();
    modal.classList.remove("hidden");
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  function closeSubmitConfirmModal() {
    var modal = document.getElementById("quiz-submit-confirm-modal");
    if (modal) modal.classList.add("hidden");
  }

  function buildAnswersPayload() {
    if (!quizData || !quizData.questions) return [];
    saveCurrentAnswer();
    return quizData.questions.map(function (q) {
      var ans = studentAnswers[q.question_id];
      return { question_id: q.question_id, student_answer: ans };
    });
  }

  function submitQuiz() {
    if (!quizData) return;
    closeSubmitConfirmModal();
    saveCurrentAnswer();
    clearInterval(countdownInterval);
    countdownInterval = null;
    exitFullscreen();
    document.getElementById("quiz-page").classList.add("hidden");
    var doneEl = document.getElementById("quiz-done");
    var doneMsg = doneEl ? doneEl.querySelector(".take-quiz-done-msg") : null;
    var card = doneEl ? doneEl.querySelector(".quiz-done-card") : null;
    var charImg = doneEl ? document.getElementById("quiz-done-character") : null;
    var scoreWrap = doneEl ? document.getElementById("quiz-done-score-wrap") : null;
    var scoreVal = doneEl ? document.getElementById("quiz-done-score-value") : null;
    var scoreTotal = doneEl ? document.getElementById("quiz-done-score-total") : null;
    var percentEl = doneEl ? document.getElementById("quiz-done-percent") : null;

    function renderDone(score, totalPoints, success) {
      if (card) {
        card.classList.remove("quiz-done--high", "quiz-done--low");
      }
      if (scoreWrap) scoreWrap.classList.add("hidden");
      if (doneMsg) doneMsg.textContent = "Quiz completed. Your attempt has been saved.";
      if (charImg) charImg.src = "image/eel-character-celebrate.png";
      if (charImg) charImg.alt = "EEL character celebrating";

      if (success && score != null && totalPoints != null && totalPoints > 0) {
        var pct = Math.round((score / totalPoints) * 100);
        var isHigh = pct >= 70;
        if (card) card.classList.add(isHigh ? "quiz-done--high" : "quiz-done--low");
        if (charImg) {
          charImg.src = isHigh ? "image/eel-character-celebrate.png" : "image/eel-character-sad.png";
          charImg.alt = isHigh ? "EEL character celebrating" : "EEL character";
        }
        if (scoreWrap) {
          scoreWrap.classList.remove("hidden");
          if (scoreVal) scoreVal.textContent = String(score);
          if (scoreTotal) scoreTotal.textContent = String(totalPoints);
          if (percentEl) percentEl.textContent = pct + "%";
        }
        if (doneMsg) {
          doneMsg.textContent = isHigh
            ? "Great job! Your attempt has been saved."
            : "Keep practicing! Your attempt has been saved.";
        }
      } else if (doneMsg && !success) {
        doneMsg.textContent = "Quiz completed. There was a problem saving your attempt.";
      }
    }

    if (teacherQuizAttemptId != null) {
      var answers = buildAnswersPayload();
      fetch("http://localhost:3000/api/teacher/reading-quiz-attempts/" + teacherQuizAttemptId + "/submit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answers })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          submitResult = data;
          renderDone(
            data.score != null ? data.score : null,
            data.total_points != null ? data.total_points : null,
            !!data.success
          );
        })
        .catch(function () {
          renderDone(null, null, false);
          if (doneMsg) doneMsg.textContent = "Quiz completed. There was a problem saving your attempt.";
        });
    } else {
      renderDone(null, null, true);
      if (doneMsg) doneMsg.textContent = "Quiz completed.";
    }
    if (doneEl) doneEl.classList.remove("hidden");
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  function loadQuestions(questions) {
    var nav = document.getElementById("take-quiz-nav");
    if (!questions || !questions.length) {
      document.getElementById("take-quiz-questions").innerHTML = "<p>No questions available for this quiz.</p>";
      if (nav) nav.classList.add("hidden");
      return;
    }
    nav.classList.remove("hidden");
    currentQuestionIndex = 0;
    showSingleQuestion(questions[0]);
  }

  function requestFullscreen() {
    var el = document.documentElement;
    try {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    } catch (e) {}
  }

  function exitFullscreen() {
    try {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    } catch (e) {}
  }

  function showError(msg) {
    exitFullscreen();
    document.getElementById("loading-screen").classList.add("hidden");
    document.getElementById("quiz-page").classList.add("hidden");
    var errEl = document.getElementById("quiz-error");
    var msgEl = document.getElementById("quiz-error-message");
    if (msgEl) msgEl.textContent = msg || "Invalid quiz or not available.";
    if (errEl) errEl.classList.remove("hidden");
  }

  /** If opened from lessons (window.opener), reload opener, focus it, and close this tab; else navigate to lessons. */
  function goBackToLessons() {
    if (window.opener && !window.opener.closed) {
      window.opener.location.reload();
      window.opener.focus();
      window.close();
    } else {
      window.location.href = "lessons.html";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".back-to-lessons-link").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        goBackToLessons();
      });
    });

    var user = null;
    try {
      var stored = localStorage.getItem("eel_user");
      if (!stored) throw new Error("Not logged in");
      user = JSON.parse(stored);
    } catch (e) {
      window.location.href = "login.html";
      return;
    }

    var params = new URLSearchParams(window.location.search);
    var quizId = params.get("quiz_id");
    var isReviewMode = params.get("review") === "1";
    if (!quizId) {
      showError("Missing quiz. Open the quiz from Lessons.");
      return;
    }

    if (isReviewMode) {
      fetch("http://localhost:3000/api/teacher/reading-quizzes/" + quizId + "/review?student_id=" + encodeURIComponent(user.user_id))
        .then(function (res) {
          if (res.status === 404) throw new Error("You have not taken this quiz yet.");
          if (!res.ok) throw new Error("Could not load your attempt.");
          return res.json();
        })
        .then(function (data) {
          if (!data.success || !data.quiz || !data.attempt || !data.answers) throw new Error("Invalid review data.");
          var quiz = data.quiz;
          var attempt = data.attempt;
          var answers = data.answers;
          document.getElementById("loading-screen").classList.add("hidden");
          var reviewWrap = document.getElementById("quiz-review");
          var titleEl = document.getElementById("quiz-review-title");
          var scoreEl = document.getElementById("quiz-review-score");
          var passageEl = document.getElementById("quiz-review-passage");
          var container = document.getElementById("quiz-review-answers");
          if (titleEl) titleEl.textContent = quiz.title || "Review your answers";
          var pct = attempt.total_points > 0 ? Math.round((attempt.score / attempt.total_points) * 100) : 0;
          if (scoreEl) scoreEl.innerHTML = "Your score: <strong>" + attempt.score + " / " + attempt.total_points + "</strong> (" + pct + "%)";
          if (passageEl) passageEl.textContent = quiz.passage || "(No passage)";
          if (container) {
            container.innerHTML = answers.map(function (a, i) {
              var yourAnswerText = a.student_answer != null && a.student_answer !== "" ? escapeHtml(String(a.student_answer)) : "—";
              if (a.options && a.options.length) {
                var selectedOptId = parseInt(a.student_answer, 10);
                var selectedOpt = a.options.find(function (o) { return Number(o.option_id) === selectedOptId; });
                yourAnswerText = selectedOpt ? escapeHtml(selectedOpt.option_text) : yourAnswerText;
              }
              var correctText = a.correct_answer_text != null ? escapeHtml(String(a.correct_answer_text)) : "—";
              var badgeClass = a.is_correct ? "quiz-review-badge--correct" : "quiz-review-badge--incorrect";
              var badgeText = a.is_correct ? "Correct" : "Incorrect";
              return (
                "<div class=\"quiz-review-item\">" +
                  "<div class=\"quiz-review-item__header\">" +
                    "<span class=\"quiz-review-item__num\">Question " + (i + 1) + "</span>" +
                    "<span class=\"quiz-review-badge " + badgeClass + "\">" + badgeText + "</span>" +
                  "</div>" +
                  "<p class=\"quiz-review-item__q\">" + escapeHtml(a.question_text || "") + "</p>" +
                  "<div class=\"quiz-review-item__row\"><strong>Your answer:</strong> " + yourAnswerText + "</div>" +
                  "<div class=\"quiz-review-item__row\"><strong>Correct answer:</strong> " + correctText + "</div>" +
                "</div>"
              );
            }).join("");
          }
          if (reviewWrap) reviewWrap.classList.remove("hidden");
          if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
        })
        .catch(function (err) {
          showError(err.message || "Failed to load review.");
        });
      return;
    }

    fetch("http://localhost:3000/api/teacher/reading-quizzes/" + quizId)
      .then(function (res) {
        if (!res.ok) throw new Error("Quiz not found or not available.");
        return res.json();
      })
      .then(function (quiz) {
        var now = new Date();
        var unlockTime = quiz.unlock_time ? new Date(quiz.unlock_time.replace(" ", "T")) : null;
        var lockTime = quiz.lock_time ? new Date(quiz.lock_time.replace(" ", "T")) : null;
        if (!unlockTime || !lockTime) throw new Error("This quiz is not yet scheduled by your teacher.");
        if (now < unlockTime) throw new Error("This quiz is not yet open.");
        if (now > lockTime) throw new Error("This quiz has closed.");

        quizData = quiz;
        studentAnswers = {};
        currentQuestionIndex = 0;

        fetch("http://localhost:3000/api/teacher/reading-quiz-attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id: user.user_id, quiz_id: quiz.quiz_id })
        })
          .then(function (r) {
            return r.json().then(function (data) {
              if (r.status === 403 && data.error && data.error.indexOf("already taken") !== -1) {
                var e = new Error("ALREADY_TAKEN");
                e.reviewUrl = "take-quiz.html?quiz_id=" + encodeURIComponent(quizId) + "&review=1";
                throw e;
              }
              if (!r.ok) throw new Error(data.error || "Could not start quiz");
              return data;
            });
          })
          .then(function (data) {
            if (data.success && data.attempt_id) teacherQuizAttemptId = data.attempt_id;
            document.getElementById("loading-screen").classList.add("hidden");
            var gateEl = document.getElementById("quiz-fullscreen-gate");
            var quizPageEl = document.getElementById("quiz-page");

            function startQuizInFullscreen() {
              requestFullscreen();
              if (gateEl) gateEl.classList.add("hidden");
              if (quizPageEl) quizPageEl.classList.remove("hidden");

              document.getElementById("take-quiz-title").textContent = quiz.title || "Quiz";
              document.getElementById("take-quiz-passage").textContent = quiz.passage || "(No passage provided)";

              var countdownEl = document.getElementById("take-quiz-countdown");
              var timerWrap = document.getElementById("take-quiz-timer-wrap");
              if (quiz.time_limit) {
                var timeRemaining = quiz.time_limit * 60;
                if (timerWrap) timerWrap.style.display = "";
                countdownInterval = setInterval(function () {
                  var minutes = Math.floor(timeRemaining / 60);
                  var seconds = timeRemaining % 60;
                  if (countdownEl) countdownEl.textContent = (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
                  if (timeRemaining <= 0) {
                    clearInterval(countdownInterval);
                    if (countdownEl) countdownEl.textContent = "00:00";
                    submitQuiz();
                  }
                  timeRemaining--;
                }, 1000);
              } else {
                if (timerWrap) timerWrap.style.display = "none";
                if (countdownEl) countdownEl.textContent = "";
              }

              loadQuestions(quiz.questions || []);

              document.getElementById("take-quiz-prev-btn").addEventListener("click", prevQuestion);
              document.getElementById("take-quiz-next-btn").addEventListener("click", nextQuestion);
              document.getElementById("take-quiz-submit-btn").addEventListener("click", showSubmitConfirmModal);

              var confirmBack = document.getElementById("quiz-submit-confirm-back");
              var confirmSubmitBtn = document.getElementById("quiz-submit-confirm-submit");
              var confirmClose = document.getElementById("quiz-submit-confirm-close");
              if (confirmBack) confirmBack.addEventListener("click", closeSubmitConfirmModal);
              if (confirmSubmitBtn) confirmSubmitBtn.addEventListener("click", submitQuiz);
              if (confirmClose) confirmClose.addEventListener("click", closeSubmitConfirmModal);

              if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
            }

            if (gateEl) {
              gateEl.classList.remove("hidden");
              if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
              var getStartedBtn = document.getElementById("quiz-gate-get-started-btn");
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
            document.getElementById("loading-screen").classList.add("hidden");
            if (err.message === "ALREADY_TAKEN" && err.reviewUrl) {
              var errEl = document.getElementById("quiz-error");
              var msgEl = document.getElementById("quiz-error-message");
              if (msgEl) msgEl.innerHTML = "You have already taken this quiz. <a href=\"" + err.reviewUrl + "\" class=\"btn btn-primary\" style=\"margin-top:0.5rem;display:inline-block;\">Review your answers</a>";
              if (errEl) errEl.classList.remove("hidden");
            } else {
              showError(err.message || "Failed to start quiz.");
            }
          });
      })
      .catch(function (err) {
        showError(err.message || "Failed to load quiz.");
      });
  });
})();
