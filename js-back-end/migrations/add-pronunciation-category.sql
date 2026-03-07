-- Add category column to pronunciation_quizzes for thematic grouping (alphabet, flowers, animals, etc.)
ALTER TABLE pronunciation_quizzes
  ADD COLUMN category VARCHAR(100) NULL DEFAULT NULL AFTER difficulty;
