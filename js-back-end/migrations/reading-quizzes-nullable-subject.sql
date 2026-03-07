-- Make subject_id nullable for built-in reading quizzes (no subject required).
-- Run once. Quizzes with subject_id = NULL will appear for all subjects.
ALTER TABLE reading_quizzes
  MODIFY subject_id INT UNSIGNED NULL DEFAULT NULL;
