-- Add class_id to teacher_reading_quiz_attempts.
-- Run once: mysql -u admin -p eel_db < migrations/add-class-id-teacher-reading-attempts.sql
-- Or from project root: mysql -u admin -p eel_db < js-back-end/migrations/add-class-id-teacher-reading-attempts.sql

ALTER TABLE teacher_reading_quiz_attempts
  ADD COLUMN class_id INT UNSIGNED NULL DEFAULT NULL AFTER quiz_id,
  ADD KEY idx_trqa_class (class_id),
  ADD CONSTRAINT fk_trqa_class
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

-- Backfill: set class_id for existing attempts (adjust class_id if your class differs)
UPDATE teacher_reading_quiz_attempts
SET class_id = 1
WHERE quiz_id = 1 AND (class_id IS NULL OR class_id = 0);
