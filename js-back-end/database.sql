/* =========================================================
   EEL (English Enhancement Learning) - MySQL Schema
   Covers all tables used in `js-back-end/*.js`.
   Engine: InnoDB, Charset: utf8mb4
   ========================================================= */

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

/* =========================
   Auth / Users
   ========================= */
CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fname VARCHAR(100) NOT NULL,
  lname VARCHAR(100) NOT NULL,
  /* Student profile (Senior High School) */
  section VARCHAR(50) NULL,
  strand VARCHAR(80) NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
  /* Admin control: deactivate approved accounts */
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deactivated_at TIMESTAMP NULL DEFAULT NULL,
  deactivated_by VARCHAR(100) NULL,
  deactivated_reason VARCHAR(255) NULL,
  /* Account verification (admin approval) */
  verification_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP NULL DEFAULT NULL,
  verified_by VARCHAR(100) NULL,
  rejected_at TIMESTAMP NULL DEFAULT NULL,
  rejected_reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_verification_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================
   Classes
   ========================= */
CREATE TABLE IF NOT EXISTS classes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  section VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_classes_class_code (class_code),
  KEY idx_classes_teacher (teacher_id),
  CONSTRAINT fk_classes_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS student_classes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  student_fname VARCHAR(100) NOT NULL,
  student_lname VARCHAR(100) NOT NULL,
  class_id INT UNSIGNED NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_classes_student_class (student_id, class_id),
  KEY idx_student_classes_class (class_id),
  KEY idx_student_classes_student (student_id),
  CONSTRAINT fk_student_classes_student
    FOREIGN KEY (student_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_student_classes_class
    FOREIGN KEY (class_id) REFERENCES classes(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================
   Password reset tokens
   ========================= */
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  reset_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reset_id),
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  KEY idx_password_reset_user (user_id),
  KEY idx_password_reset_expires (expires_at),
  CONSTRAINT fk_password_reset_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================
   Curriculum: subjects / lessons / topics
   ========================= */
CREATE TABLE IF NOT EXISTS subjects (
  subject_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_name VARCHAR(255) NOT NULL,
  PRIMARY KEY (subject_id),
  UNIQUE KEY uq_subjects_name (subject_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lessons (
  lesson_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_id INT UNSIGNED NOT NULL,
  lesson_title VARCHAR(255) NOT NULL,
  quarter_number TINYINT UNSIGNED NULL COMMENT '1-4 for display grouping',
  quarter_title VARCHAR(255) NULL COMMENT 'e.g. Reading Academic Texts',
  PRIMARY KEY (lesson_id),
  KEY idx_lessons_subject (subject_id),
  KEY idx_lessons_quarter (quarter_number),
  CONSTRAINT fk_lessons_subject
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS topics (
  topic_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lesson_id INT UNSIGNED NOT NULL,
  topic_title VARCHAR(255) NOT NULL,
  pdf_path VARCHAR(500) NULL,
  PRIMARY KEY (topic_id),
  KEY idx_topics_lesson (lesson_id),
  CONSTRAINT fk_topics_lesson
  FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================
   Exams (AI exam generator)
   ========================= */
CREATE TABLE IF NOT EXISTS exams (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_id INT UNSIGNED NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  question_count INT UNSIGNED NULL,
  types TEXT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_exams_class (class_id),
  KEY idx_exams_created_by (created_by),
  CONSTRAINT fk_exams_class
    FOREIGN KEY (class_id) REFERENCES classes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_exams_created_by
    FOREIGN KEY (created_by) REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cached_exams (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  question_count INT UNSIGNED NULL,
  types TEXT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_cached_exams_subject (subject),
  KEY idx_cached_exams_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================
   Reading quizzes (built-in quizzes)
   ========================= */
CREATE TABLE IF NOT EXISTS reading_quizzes (
  quiz_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_id INT UNSIGNED NOT NULL,
  /* Order within a subject-based track (1..20) */
  quiz_number INT UNSIGNED NOT NULL DEFAULT 1,
  title VARCHAR(255) NOT NULL,
  difficulty ENUM('beginner','intermediate','advanced') NOT NULL,
  passage LONGTEXT NULL,
  unlock_time DATETIME NULL,
  lock_time DATETIME NULL,
  time_limit INT UNSIGNED NULL, /* minutes */
  status ENUM('draft','active','locked','closed') NOT NULL DEFAULT 'draft',
  is_locked TINYINT(1) NOT NULL DEFAULT 1,
  /* Passing threshold as percent (0-100) to unlock next quiz */
  passing_score DECIMAL(6,2) NOT NULL DEFAULT 70.00,
  retake_option ENUM('none','all','specific') NOT NULL DEFAULT 'all',
  allowed_students JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (quiz_id),
  KEY idx_reading_quizzes_subject (subject_id),
  UNIQUE KEY uq_reading_quizzes_subject_number (subject_id, quiz_number),
  KEY idx_reading_quizzes_status (status),
  CONSTRAINT fk_reading_quizzes_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reading_questions (
  question_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  question_type ENUM('mcq','fill_blank','essay') NOT NULL,
  question_text TEXT NOT NULL,
  points DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (question_id),
  KEY idx_reading_questions_quiz (quiz_id),
  CONSTRAINT fk_reading_questions_quiz
    FOREIGN KEY (quiz_id) REFERENCES reading_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reading_mcq_options (
  option_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id INT UNSIGNED NOT NULL,
  option_text TEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (option_id),
  KEY idx_reading_mcq_options_question (question_id),
  CONSTRAINT fk_reading_mcq_options_question
    FOREIGN KEY (question_id) REFERENCES reading_questions(question_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reading_fill_blanks (
  blank_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id INT UNSIGNED NOT NULL,
  blank_number INT UNSIGNED NOT NULL,
  answer_text VARCHAR(255) NOT NULL,
  points DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (blank_id),
  UNIQUE KEY uq_reading_fill_blanks_question_blankno (question_id, blank_number),
  KEY idx_reading_fill_blanks_question (question_id),
  CONSTRAINT fk_reading_fill_blanks_question
    FOREIGN KEY (question_id) REFERENCES reading_questions(question_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reading_quiz_attempts (
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
  KEY idx_reading_attempts_student (student_id),
  KEY idx_reading_attempts_quiz (quiz_id),
  KEY idx_reading_attempts_student_quiz (student_id, quiz_id),
  CONSTRAINT fk_reading_attempts_student
    FOREIGN KEY (student_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reading_attempts_quiz
    FOREIGN KEY (quiz_id) REFERENCES reading_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* Track-based unlock/progress for built-in reading quizzes */
CREATE TABLE IF NOT EXISTS reading_student_progress (
  student_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  /* Highest unlocked quiz_number for this subject (starts at 1) */
  unlocked_quiz_number INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, subject_id),
  KEY idx_reading_progress_subject (subject_id),
  CONSTRAINT fk_reading_progress_student
    FOREIGN KEY (student_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reading_progress_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reading_quiz_answers (
  answer_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  question_type ENUM('mcq','fill_blank','essay') NOT NULL,
  student_answer TEXT NULL,
  is_correct TINYINT(1) NULL,
  points_earned DECIMAL(10,2) NULL,
  /* Teacher can override grading for near-miss spelling/case */
  teacher_override TINYINT(1) NOT NULL DEFAULT 0,
  teacher_id INT UNSIGNED NULL,
  teacher_updated_at TIMESTAMP NULL DEFAULT NULL,
  ai_score DECIMAL(6,2) NULL,
  ai_feedback TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (answer_id),
  UNIQUE KEY uq_reading_answers_attempt_question (attempt_id, question_id),
  KEY idx_reading_answers_attempt (attempt_id),
  KEY idx_reading_answers_question (question_id),
  CONSTRAINT fk_reading_answers_attempt
    FOREIGN KEY (attempt_id) REFERENCES reading_quiz_attempts(attempt_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reading_answers_question
    FOREIGN KEY (question_id) REFERENCES reading_questions(question_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reading_quiz_blanks (
  student_blank_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  answer_id INT UNSIGNED NOT NULL,
  blank_id INT UNSIGNED NOT NULL,
  student_text TEXT NULL,
  is_correct TINYINT(1) NULL,
  points_earned DECIMAL(10,2) NULL,
  /* Teacher can override blank grading */
  teacher_override TINYINT(1) NOT NULL DEFAULT 0,
  teacher_id INT UNSIGNED NULL,
  teacher_updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (student_blank_id),
  UNIQUE KEY uq_reading_quiz_blanks_answer_blank (answer_id, blank_id),
  KEY idx_reading_quiz_blanks_answer (answer_id),
  KEY idx_reading_quiz_blanks_blank (blank_id),
  CONSTRAINT fk_reading_quiz_blanks_answer
    FOREIGN KEY (answer_id) REFERENCES reading_quiz_answers(answer_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reading_quiz_blanks_blank
    FOREIGN KEY (blank_id) REFERENCES reading_fill_blanks(blank_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================
   Teacher-created reading quizzes
   (stored separately from built-in `reading_*`)
   ========================= */
CREATE TABLE IF NOT EXISTS teacher_reading_quizzes (
  quiz_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL, /* teacher */
  title VARCHAR(255) NOT NULL,
  difficulty ENUM('beginner','intermediate','advanced') NOT NULL,
  passage LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (quiz_id),
  KEY idx_teacher_reading_quizzes_subject (subject_id),
  KEY idx_teacher_reading_quizzes_user (user_id),
  CONSTRAINT fk_teacher_reading_quizzes_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_teacher_reading_quizzes_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teacher_reading_beginner_questions (
  question_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  PRIMARY KEY (question_id),
  KEY idx_trbq_quiz (quiz_id),
  CONSTRAINT fk_trbq_quiz
    FOREIGN KEY (quiz_id) REFERENCES teacher_reading_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teacher_reading_mcq_options (
  option_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id INT UNSIGNED NOT NULL,
  option_text TEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (option_id),
  KEY idx_trmo_question (question_id),
  CONSTRAINT fk_trmo_question
    FOREIGN KEY (question_id) REFERENCES teacher_reading_beginner_questions(question_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teacher_reading_intermediate_questions (
  question_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  PRIMARY KEY (question_id),
  KEY idx_triq_quiz (quiz_id),
  CONSTRAINT fk_triq_quiz
    FOREIGN KEY (quiz_id) REFERENCES teacher_reading_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teacher_reading_fill_blanks (
  blank_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id INT UNSIGNED NOT NULL,
  blank_number INT UNSIGNED NOT NULL,
  answer_text VARCHAR(255) NOT NULL,
  points DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (blank_id),
  UNIQUE KEY uq_trfb_question_blankno (question_id, blank_number),
  KEY idx_trfb_question (question_id),
  CONSTRAINT fk_trfb_question
    FOREIGN KEY (question_id) REFERENCES teacher_reading_intermediate_questions(question_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teacher_reading_advanced_questions (
  question_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  points DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (question_id),
  KEY idx_traq_quiz (quiz_id),
  CONSTRAINT fk_traq_quiz
    FOREIGN KEY (quiz_id) REFERENCES teacher_reading_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* Teacher/AI quiz attempts (when a student takes a teacher-created reading quiz) */
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

CREATE TABLE IF NOT EXISTS teacher_reading_quiz_answers (
  answer_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  question_type ENUM('mcq','fill_blank','essay') NOT NULL DEFAULT 'mcq',
  student_answer TEXT NULL,
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

/* =========================
   Pronunciation quizzes (built-in quizzes)
   ========================= */
CREATE TABLE IF NOT EXISTS pronunciation_quizzes (
  quiz_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_id INT UNSIGNED NOT NULL,
  /* Order within a subject-based track (1..20) */
  quiz_number INT UNSIGNED NOT NULL DEFAULT 1,
  title VARCHAR(255) NOT NULL,
  difficulty ENUM('beginner','intermediate','advanced') NOT NULL,
  passage LONGTEXT NULL,
  unlock_time DATETIME NULL,
  lock_time DATETIME NULL,
  time_limit INT UNSIGNED NULL, /* minutes */
  status ENUM('draft','active','locked','closed') NOT NULL DEFAULT 'draft',
  /* Passing threshold as percent (0-100) to unlock next quiz */
  passing_score DECIMAL(6,2) NOT NULL DEFAULT 70.00,
  retake_option ENUM('none','all','specific') NOT NULL DEFAULT 'all',
  allowed_students JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (quiz_id),
  KEY idx_pronunciation_quizzes_subject (subject_id),
  UNIQUE KEY uq_pronunciation_quizzes_subject_number (subject_id, quiz_number),
  KEY idx_pronunciation_quizzes_status (status),
  CONSTRAINT fk_pronunciation_quizzes_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pronunciation_beginner_questions (
  question_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  word VARCHAR(255) NOT NULL,
  correct_pronunciation VARCHAR(255) NULL,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (question_id),
  KEY idx_pbq_quiz (quiz_id),
  CONSTRAINT fk_pbq_quiz
    FOREIGN KEY (quiz_id) REFERENCES pronunciation_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pronunciation_intermediate_questions (
  question_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  word VARCHAR(255) NOT NULL,
  stressed_syllable VARCHAR(255) NULL,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (question_id),
  KEY idx_piq_quiz (quiz_id),
  CONSTRAINT fk_piq_quiz
    FOREIGN KEY (quiz_id) REFERENCES pronunciation_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pronunciation_advanced_questions (
  question_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  sentence TEXT NOT NULL,
  reduced_form VARCHAR(255) NULL,
  full_sentence TEXT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (question_id),
  KEY idx_paq_quiz (quiz_id),
  CONSTRAINT fk_paq_quiz
    FOREIGN KEY (quiz_id) REFERENCES pronunciation_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pronunciation_quiz_attempts (
  attempt_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  quiz_id INT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NULL,
  status ENUM('in_progress','submitted','completed') NOT NULL DEFAULT 'in_progress',
  score DECIMAL(6,2) NULL,              /* 0-100 */
  pronunciation_score DECIMAL(6,2) NULL,/* 0-100 (alias field used in code) */
  total_points DECIMAL(10,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attempt_id),
  KEY idx_pron_attempts_student (student_id),
  KEY idx_pron_attempts_quiz (quiz_id),
  KEY idx_pron_attempts_student_quiz (student_id, quiz_id),
  CONSTRAINT fk_pron_attempts_student
    FOREIGN KEY (student_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pron_attempts_quiz
    FOREIGN KEY (quiz_id) REFERENCES pronunciation_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* Track-based unlock/progress for built-in pronunciation quizzes */
CREATE TABLE IF NOT EXISTS pronunciation_student_progress (
  student_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  unlocked_quiz_number INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, subject_id),
  KEY idx_pron_progress_subject (subject_id),
  CONSTRAINT fk_pron_progress_student
    FOREIGN KEY (student_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pron_progress_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pronunciation_quiz_answers (
  answer_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  difficulty ENUM('beginner','intermediate','advanced') NOT NULL,
  student_audio VARCHAR(1000) NOT NULL,
  transcript TEXT NULL,
  pronunciation_score DECIMAL(6,2) NULL,
  /* Teacher can override pronunciation grading */
  teacher_score DECIMAL(6,2) NULL,
  teacher_notes TEXT NULL,
  teacher_id INT UNSIGNED NULL,
  teacher_updated_at TIMESTAMP NULL DEFAULT NULL,
  evaluated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (answer_id),
  UNIQUE KEY uq_pron_answers_attempt_question (attempt_id, question_id),
  KEY idx_pron_answers_attempt (attempt_id),
  KEY idx_pron_answers_question (question_id),
  CONSTRAINT fk_pron_answers_attempt
    FOREIGN KEY (attempt_id) REFERENCES pronunciation_quiz_attempts(attempt_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================
   Teacher-created pronunciation quizzes
   ========================= */
CREATE TABLE IF NOT EXISTS teacher_pronunciation_quizzes (
  quiz_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL, /* teacher */
  title VARCHAR(255) NOT NULL,
  difficulty ENUM('beginner','intermediate','advanced') NOT NULL,
  passage LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (quiz_id),
  KEY idx_teacher_pron_quizzes_subject (subject_id),
  KEY idx_teacher_pron_quizzes_user (user_id),
  CONSTRAINT fk_teacher_pron_quizzes_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_teacher_pron_quizzes_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teacher_pronunciation_beginner_questions (
  question_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  word VARCHAR(255) NOT NULL,
  correct_pronunciation VARCHAR(255) NULL,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (question_id),
  KEY idx_tpbq_quiz (quiz_id),
  CONSTRAINT fk_tpbq_quiz
    FOREIGN KEY (quiz_id) REFERENCES teacher_pronunciation_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teacher_pronunciation_intermediate_questions (
  question_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  word VARCHAR(255) NOT NULL,
  stressed_syllable VARCHAR(255) NULL,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (question_id),
  KEY idx_tpiq_quiz (quiz_id),
  CONSTRAINT fk_tpiq_quiz
    FOREIGN KEY (quiz_id) REFERENCES teacher_pronunciation_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teacher_pronunciation_advanced_questions (
  question_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  sentence TEXT NOT NULL,
  reduced_form VARCHAR(255) NULL,
  full_sentence TEXT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (question_id),
  KEY idx_tpaq_quiz (quiz_id),
  CONSTRAINT fk_tpaq_quiz
    FOREIGN KEY (quiz_id) REFERENCES teacher_pronunciation_quizzes(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================
   AI-generated pronunciation quiz storage
   ========================= */
CREATE TABLE IF NOT EXISTS ai_quiz_pronunciation (
  quiz_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  difficulty ENUM('beginner','intermediate','advanced') NOT NULL,
  passage LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (quiz_id),
  KEY idx_ai_pron_teacher (teacher_id),
  KEY idx_ai_pron_subject (subject_id),
  CONSTRAINT fk_ai_pron_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_ai_pron_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_quiz_pronunciation_questions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  word VARCHAR(255) NOT NULL,
  answer VARCHAR(255) NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_ai_pron_questions_quiz (quiz_id),
  CONSTRAINT fk_ai_pron_questions_quiz
    FOREIGN KEY (quiz_id) REFERENCES ai_quiz_pronunciation(quiz_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;