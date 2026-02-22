-- Add class_id to attempt tables so quiz data is scoped per classroom.
-- Run this once on your database. Existing rows will have class_id = NULL (not shown when viewing a specific class).

-- Reading quiz attempts (built-in quizzes)
ALTER TABLE reading_quiz_attempts
  ADD COLUMN class_id INT UNSIGNED NULL DEFAULT NULL AFTER quiz_id,
  ADD KEY idx_reading_attempts_class (class_id),
  ADD CONSTRAINT fk_reading_attempts_class
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

-- Teacher reading quiz attempts
ALTER TABLE teacher_reading_quiz_attempts
  ADD COLUMN class_id INT UNSIGNED NULL DEFAULT NULL AFTER quiz_id,
  ADD KEY idx_trqa_class (class_id),
  ADD CONSTRAINT fk_trqa_class
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

-- Pronunciation quiz attempts
ALTER TABLE pronunciation_quiz_attempts
  ADD COLUMN class_id INT UNSIGNED NULL DEFAULT NULL AFTER quiz_id,
  ADD KEY idx_pron_attempts_class (class_id),
  ADD CONSTRAINT fk_pron_attempts_class
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

UPDATE teacher_reading_quizzes
SET class_id = 6
WHERE quiz_id = 4;