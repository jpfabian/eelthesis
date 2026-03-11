-- Archive tables for AI quiz, classroom, and exam AI generated.
-- When items are archived (instead of hard-deleted), a snapshot is stored here for restore.
-- Run once on your database.

-- Archive AI-generated reading quizzes (teacher_reading_quizzes)
CREATE TABLE IF NOT EXISTS archive_ai_quizzes (
  archive_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  original_quiz_id INT UNSIGNED NOT NULL,
  archived_by INT UNSIGNED NOT NULL,
  archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  snapshot JSON NOT NULL COMMENT 'Full quiz + questions snapshot for restore',
  PRIMARY KEY (archive_id),
  KEY idx_archive_ai_quizzes_archived_by (archived_by),
  KEY idx_archive_ai_quizzes_archived_at (archived_at),
  CONSTRAINT fk_archive_ai_quizzes_user
    FOREIGN KEY (archived_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Archive classrooms (classes)
CREATE TABLE IF NOT EXISTS archive_classrooms (
  archive_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  original_class_id INT UNSIGNED NOT NULL,
  archived_by INT UNSIGNED NOT NULL,
  archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  snapshot JSON NOT NULL COMMENT 'Full class snapshot for restore',
  PRIMARY KEY (archive_id),
  KEY idx_archive_classrooms_archived_by (archived_by),
  KEY idx_archive_classrooms_archived_at (archived_at),
  CONSTRAINT fk_archive_classrooms_user
    FOREIGN KEY (archived_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Archive exam AI generated (exams)
CREATE TABLE IF NOT EXISTS archive_exams (
  archive_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  original_exam_id INT UNSIGNED NOT NULL,
  archived_by INT UNSIGNED NOT NULL,
  archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  snapshot JSON NOT NULL COMMENT 'Full exam snapshot for restore',
  PRIMARY KEY (archive_id),
  KEY idx_archive_exams_archived_by (archived_by),
  KEY idx_archive_exams_archived_at (archived_at),
  CONSTRAINT fk_archive_exams_user
    FOREIGN KEY (archived_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
