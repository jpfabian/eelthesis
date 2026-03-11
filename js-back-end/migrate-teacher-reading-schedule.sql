/* =========================================================
   Migration: Add unlock_time, lock_time, time_limit to teacher_reading_quizzes
   Run this ONCE on your database if you get:
   "Unknown column 'unlock_time' in 'field list'"
   ========================================================= */

SET @db := DATABASE();

SET @has_unlock := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'teacher_reading_quizzes' AND COLUMN_NAME = 'unlock_time'
);

SET @sql := IF(
  @has_unlock = 0,
  "ALTER TABLE teacher_reading_quizzes
     ADD COLUMN unlock_time DATETIME NULL,
     ADD COLUMN lock_time DATETIME NULL,
     ADD COLUMN time_limit INT UNSIGNED NULL",
  "SELECT 1"
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
