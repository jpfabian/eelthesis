-- Scope AI/teacher-created reading quizzes per class (same subject, different class code = separate quizzes).
-- Run once. Existing rows get class_id = NULL (will not show when filtering by class).

ALTER TABLE teacher_reading_quizzes
  ADD COLUMN class_id INT UNSIGNED NULL DEFAULT NULL AFTER user_id,
  ADD KEY idx_teacher_reading_quizzes_class (class_id),
  ADD CONSTRAINT fk_teacher_reading_quizzes_class
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
