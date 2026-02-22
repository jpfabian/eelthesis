/* =========================================================
   Teacher / AI-generated reading quiz attempts
   Run this after database.sql (teacher_reading_quizzes must exist).
   If teacher_reading_quizzes does not have unlock_time, lock_time, time_limit
   then run: ALTER TABLE teacher_reading_quizzes
     ADD COLUMN unlock_time DATETIME NULL,
     ADD COLUMN lock_time DATETIME NULL,
     ADD COLUMN time_limit INT UNSIGNED NULL;
   ========================================================= */

SET NAMES utf8mb4;

-- Attempts when a student takes a teacher/AI-generated reading quiz
CREATE TABLE IF NOT EXISTS teacher_reading_quiz_attempts (
  attempt_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  quiz_id INT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NULL,
  status ENUM('in_progress','completed') NOT NULL DEFAULT 'in_progress',
  score DECIMAL(10,2) NULL,
  total_points DECIMAL(10,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attempt_id),
  KEY idx_trqa_student (student_id),
  KEY idx_trqa_quiz (quiz_id),
  KEY idx_trqa_student_quiz (student_id, quiz_id),
  CONSTRAINT fk_trqa_student
    FOREIGN KEY (student_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_trqa_quiz
    FOREIGN KEY (quiz_id) REFERENCES teacher_reading_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-question answers for teacher reading quiz attempts
CREATE TABLE IF NOT EXISTS teacher_reading_quiz_answers (
  answer_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL COMMENT 'teacher_reading_beginner_questions.question_id (or intermediate/advanced)',
  question_type ENUM('mcq','fill_blank','essay') NOT NULL DEFAULT 'mcq',
  student_answer TEXT NULL COMMENT 'option_id for mcq, or text for identification, or JSON for fill_blank',
  is_correct TINYINT(1) NULL,
  points_earned DECIMAL(10,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (answer_id),
  UNIQUE KEY uq_trq_answers_attempt_question (attempt_id, question_id),
  KEY idx_trq_answers_attempt (attempt_id),
  KEY idx_trq_answers_question (question_id),
  CONSTRAINT fk_trq_answers_attempt
    FOREIGN KEY (attempt_id) REFERENCES teacher_reading_quiz_attempts(attempt_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
