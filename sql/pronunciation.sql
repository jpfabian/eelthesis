-- Pronunciation Quizzes (common for all difficulties)
CREATE TABLE pronunciation_quizzes (
  quiz_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,                                -- e.g. Oral Communication = 2
  title VARCHAR(255) NOT NULL,
  difficulty ENUM('beginner','intermediate','advanced') NOT NULL,
  passage TEXT,
  status ENUM('draft','scheduled','active','closed') DEFAULT 'draft',
  unlock_time DATETIME NULL,
  lock_time DATETIME NULL,
  retake_option ENUM('all','specific') DEFAULT 'all',
  allowed_students JSON NULL,
  time_limit INT DEFAULT NULL,                            -- in minutes (NULL = no time limit)
  is_locked TINYINT(1) DEFAULT 0,                         -- 0 = unlocked, 1 = locked
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
);

-- Beginner: Consonant Cluster Questions
CREATE TABLE pronunciation_beginner_questions (
  question_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  quiz_id BIGINT NOT NULL,
  word VARCHAR(255) NOT NULL,                 -- the target word
  correct_pronunciation VARCHAR(255) NOT NULL, -- what the student should pronounce
  position INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES pronunciation_quizzes(quiz_id) ON DELETE CASCADE
);

-- Intermediate: Word Stress Questions
CREATE TABLE pronunciation_intermediate_questions (
  question_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  quiz_id BIGINT NOT NULL,
  word VARCHAR(255) NOT NULL,                 -- the target word
  stressed_syllable VARCHAR(255) NOT NULL,   -- stressed syllable format
  position INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES pronunciation_quizzes(quiz_id) ON DELETE CASCADE
);

-- Advanced: Linking & Reduction / Sentences
CREATE TABLE pronunciation_advanced_questions (
  question_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  quiz_id BIGINT NOT NULL,
  sentence TEXT NOT NULL,                     -- sentence with blank
  reduced_form VARCHAR(255) NOT NULL,        -- reduced/linked form
  full_sentence TEXT NOT NULL,               -- what student should say
  position INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES pronunciation_quizzes(quiz_id) ON DELETE CASCADE
);

CREATE TABLE pronunciation_quiz_attempts (
  attempt_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,                    -- Linked to users(user_id)
  quiz_id BIGINT NOT NULL,                    -- Linked to pronunciation_quizzes(quiz_id)
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME NULL,
  score DECIMAL(5,2) DEFAULT 0.00,
  total_points DECIMAL(5,2) DEFAULT 0.00,
  status ENUM('in_progress','completed','submitted') DEFAULT 'in_progress',
  recording_url TEXT DEFAULT NULL,            -- 🔹 optional: store path/URL to student's recorded audio
  pronunciation_score DECIMAL(5,2) DEFAULT 0, -- 🔹 optional: AI pronunciation rating (0–100)
  feedback TEXT DEFAULT NULL,                 -- 🔹 optional: AI or teacher feedback
  FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES pronunciation_quizzes(quiz_id) ON DELETE CASCADE
);

CREATE TABLE pronunciation_quiz_answers (
  answer_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  attempt_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  difficulty ENUM('beginner','intermediate','advanced') NOT NULL, -- 🔹 identifies which question table
  student_audio VARCHAR(255) NOT NULL,                            -- 🔹 path or URL to recorded file
  pronunciation_score DECIMAL(5,2) DEFAULT 0.00,                  -- 🔹 AI or teacher rating
  feedback TEXT,
  evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id) REFERENCES pronunciation_quiz_attempts(attempt_id) ON DELETE CASCADE
);

-- Table for reading quiz results
CREATE TABLE IF NOT EXISTS reading_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    quiz_id INT NOT NULL,
    score FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_classes(student_id)
);