-- Backfill class_id for existing reading_quiz_attempts so they show under class ABM 11-A (id = 1).
-- Run after add-class-id-to-attempts.sql. Adjust class_id or attempt_id list if needed.

UPDATE reading_quiz_attempts
SET class_id = 1
WHERE attempt_id IN (1, 2, 3)
  AND class_id IS NULL;
