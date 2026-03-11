/* =========================================================
   Migration: Add class_id to teacher_reading_quizzes
   Run this ONCE on your database if you get:
   "Unknown column 'class_id' in 'where clause'"
   ========================================================= */

SET @db := DATABASE();

SET @has_class_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'teacher_reading_quizzes' AND COLUMN_NAME = 'class_id'
);

SET @sql := IF(
  @has_class_id = 0,
  "ALTER TABLE teacher_reading_quizzes
     ADD COLUMN class_id INT UNSIGNED NULL DEFAULT NULL AFTER user_id,
     ADD KEY idx_teacher_reading_quizzes_class (class_id),
     ADD CONSTRAINT fk_teacher_reading_quizzes_class
       FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL",
  "SELECT 1"
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
