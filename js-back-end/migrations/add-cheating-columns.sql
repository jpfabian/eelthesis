-- Add cheating detection columns to quiz attempt tables.
-- Run once on your database.

-- Teacher reading quiz attempts (AI quiz, teacher reading quiz)
ALTER TABLE teacher_reading_quiz_attempts
  ADD COLUMN cheating_violations INT UNSIGNED NOT NULL DEFAULT 0 AFTER total_points,
  ADD COLUMN cheating_voided TINYINT(1) NOT NULL DEFAULT 0 AFTER cheating_violations;

-- Reading quiz attempts (built-in quizzes)
ALTER TABLE reading_quiz_attempts
  ADD COLUMN cheating_violations INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN cheating_voided TINYINT(1) NOT NULL DEFAULT 0;

-- Pronunciation quiz attempts
ALTER TABLE pronunciation_quiz_attempts
  ADD COLUMN cheating_violations INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN cheating_voided TINYINT(1) NOT NULL DEFAULT 0;
