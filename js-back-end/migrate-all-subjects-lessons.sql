-- =========================================================
-- ONE-CLICK: All subjects + lessons + topics
-- Run this entire file in MySQL (Execute SQL script).
-- Requires: database.sql and subjects table with IDs 1-5.
-- =========================================================

SET NAMES utf8mb4;

-- 1) Ensure subjects exist
INSERT IGNORE INTO subjects (subject_id, subject_name) VALUES
  (1, 'Reading and Writing Skills'),
  (2, 'Oral Communication'),
  (3, 'Creative Writing'),
  (4, 'Creative Non-Fiction'),
  (5, 'English for Academic and Professional Purposes');

-- 2) Add quarter columns if missing (MySQL 5.7-safe)
SET @db := DATABASE();
SET @has_qn := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'lessons' AND COLUMN_NAME = 'quarter_number');
SET @sql := IF(@has_qn = 0, "ALTER TABLE lessons ADD COLUMN quarter_number TINYINT UNSIGNED NULL COMMENT '1-4 for display grouping'", "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_qt := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'lessons' AND COLUMN_NAME = 'quarter_title');
SET @sql := IF(@has_qt = 0, "ALTER TABLE lessons ADD COLUMN quarter_title VARCHAR(255) NULL", "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =========================================================
-- SUBJECT 1: Reading and Writing Skills
-- =========================================================
DELETE t FROM topics t INNER JOIN lessons l ON t.lesson_id = l.lesson_id WHERE l.subject_id = 1;
DELETE FROM lessons WHERE subject_id = 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 1: Nature of Academic Texts', 1, 'Reading Academic Texts');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Features of academic writing', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 1/Features of academic writing.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 1: Nature of Academic Texts' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Formal language', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 1/Formal language.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 1: Nature of Academic Texts' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Objectivity', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 1/Objectivity.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 1: Nature of Academic Texts' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 2: Text Structures', 1, 'Reading Academic Texts');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Description', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 2/Description.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 2: Text Structures' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Definition', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 2/Definition.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 2: Text Structures' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Classification', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 2/Classification.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 2: Text Structures' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Comparison & Contrast', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 2/Comparison and Contrast.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 2: Text Structures' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Cause & Effect', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 2/Cause and Effect.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 2: Text Structures' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Problem & Solution', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 2/Problem and Solution.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 2: Text Structures' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 3: Critical Reading', 1, 'Reading Academic Texts');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Explicit vs implicit information', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 3/Explicit vs implicit information.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 3: Critical Reading' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Identifying claims', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 3/Identifying claims.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 3: Critical Reading' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Evaluating arguments', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 3/Evaluating arguments.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 3: Critical Reading' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 4: Evaluating Texts', 1, 'Reading Academic Texts');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Bias', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 4/Bias.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 4: Evaluating Texts' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Evidence', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 4/Evidence.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 4: Evaluating Texts' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Credibility of sources', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 4/Credibility of sources.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 4: Evaluating Texts' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 5: Writing Process', 2, 'Writing Process');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Prewriting', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 5/Prewriting.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 5: Writing Process' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Drafting', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 5/Drafting.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 5: Writing Process' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Revising', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 5/Revising.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 5: Writing Process' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Editing', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 5/Editing.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 5: Writing Process' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 6: Thesis Statement', 2, 'Writing Process');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Parts of a thesis', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 6/Parts of a thesis.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 6: Thesis Statement' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Types of thesis', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 6/Types of thesis.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 6: Thesis Statement' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Writing a focused thesis', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 6/Writing a focused thesis.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 6: Thesis Statement' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 7: Outlining', 2, 'Writing Process');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Topic outline', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 7/Topic outline.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 7: Outlining' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Sentence outline', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 7/Sentence outline.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 7: Outlining' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 8: Summarizing & Paraphrasing', 2, 'Writing Process');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Identifying main ideas', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 8/Identifying main ideas.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 8: Summarizing & Paraphrasing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Avoiding plagiarism', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 8/Avoiding plagiarism.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 8: Summarizing & Paraphrasing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Proper paraphrasing', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 8/Proper paraphrasing.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 8: Summarizing & Paraphrasing' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 9: Academic Integrity', 3, 'Citation');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Plagiarism', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 9/Plagiarism.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 9: Academic Integrity' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Ethical writing', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 9/Ethical writing.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 9: Academic Integrity' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 10: In-text Citation', 3, 'Citation');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Basic citation format', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 10/Basic citation format.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 10: In-text Citation' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Citing sources in text', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 10/Citing sources in text.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 10: In-text Citation' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 11: Reference List', 3, 'Citation');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Citing books', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 11/Citing books.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 11: Reference List' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Citing journals', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 11/Citing journals.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 11: Reference List' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Citing websites', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 11/Citing websites.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 11: Reference List' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 12: Reaction Paper', 4, 'Academic Papers');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Structure', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 12/Structure.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 12: Reaction Paper' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Personal response', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 12/Personal response.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 12: Reaction Paper' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Supporting ideas', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 12/Supporting ideas.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 12: Reaction Paper' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 13: Concept Paper', 4, 'Academic Papers');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Purpose', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 13/Purpose.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 13: Concept Paper' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Components', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 13/Components.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 13: Concept Paper' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Proposal format', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 13/Proposal format.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 13: Concept Paper' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 14: Position Paper', 4, 'Academic Papers');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Claim', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 14/Claim.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 14: Position Paper' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Supporting evidence', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 14/Supporting evidence.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 14: Position Paper' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Counterargument', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 14/Counterargument.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 14: Position Paper' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (1, 'Lesson 15: Critique Paper', 4, 'Academic Papers');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Analysis', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 15/Analysis.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 15: Critique Paper' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Evaluation', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 15/Evaluation.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 15: Critique Paper' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Judgment', 's3://eel-bucket/subjects/Reading and Writing Skills/Lesson 15/Judgment.pdf' FROM lessons WHERE subject_id = 1 AND lesson_title = 'Lesson 15: Critique Paper' LIMIT 1;

-- =========================================================
-- SUBJECT 2: Oral Communication
-- =========================================================
DELETE t FROM topics t INNER JOIN lessons l ON t.lesson_id = l.lesson_id WHERE l.subject_id = 2;
DELETE FROM lessons WHERE subject_id = 2;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 1: Nature of Communication', 1, 'Nature of Communication');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Definition of communication', 's3://eel-bucket/subjects/Oral Communication/Lesson 1/Definition of communication.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 1: Nature of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Purpose of communication', 's3://eel-bucket/subjects/Oral Communication/Lesson 1/Purpose of communication.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 1: Nature of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Communication process', 's3://eel-bucket/subjects/Oral Communication/Lesson 1/Communication process.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 1: Nature of Communication' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 2: Elements of Communication', 1, 'Nature of Communication');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Speaker', 's3://eel-bucket/subjects/Oral Communication/Lesson 2/Speaker.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 2: Elements of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Message', 's3://eel-bucket/subjects/Oral Communication/Lesson 2/Message.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 2: Elements of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Encoding and Decoding', 's3://eel-bucket/subjects/Oral Communication/Lesson 2/Encoding and Decoding.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 2: Elements of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Channel', 's3://eel-bucket/subjects/Oral Communication/Lesson 2/Channel.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 2: Elements of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Feedback', 's3://eel-bucket/subjects/Oral Communication/Lesson 2/Feedback.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 2: Elements of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Context', 's3://eel-bucket/subjects/Oral Communication/Lesson 2/Context.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 2: Elements of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Noise/Barriers', 's3://eel-bucket/subjects/Oral Communication/Lesson 2/Noise and Barriers.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 2: Elements of Communication' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 3: Models of Communication', 1, 'Nature of Communication');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Linear Model', 's3://eel-bucket/subjects/Oral Communication/Lesson 3/Linear Model.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 3: Models of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Interactive Model', 's3://eel-bucket/subjects/Oral Communication/Lesson 3/Interactive Model.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 3: Models of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Transactional Model', 's3://eel-bucket/subjects/Oral Communication/Lesson 3/Transactional Model.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 3: Models of Communication' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 4: Functions of Communication', 1, 'Nature of Communication');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Regulation/Control', 's3://eel-bucket/subjects/Oral Communication/Lesson 4/Regulation and Control.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 4: Functions of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Social Interaction', 's3://eel-bucket/subjects/Oral Communication/Lesson 4/Social Interaction.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 4: Functions of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Motivation', 's3://eel-bucket/subjects/Oral Communication/Lesson 4/Motivation.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 4: Functions of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Information', 's3://eel-bucket/subjects/Oral Communication/Lesson 4/Information.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 4: Functions of Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Emotional Expression', 's3://eel-bucket/subjects/Oral Communication/Lesson 4/Emotional Expression.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 4: Functions of Communication' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 5: Types of Speech Context', 2, 'Speech Context & Style');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Intrapersonal', 's3://eel-bucket/subjects/Oral Communication/Lesson 5/Intrapersonal.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 5: Types of Speech Context' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Interpersonal', 's3://eel-bucket/subjects/Oral Communication/Lesson 5/Interpersonal.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 5: Types of Speech Context' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Public', 's3://eel-bucket/subjects/Oral Communication/Lesson 5/Public.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 5: Types of Speech Context' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Mass Communication', 's3://eel-bucket/subjects/Oral Communication/Lesson 5/Mass Communication.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 5: Types of Speech Context' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 6: Types of Speech Style', 2, 'Speech Context & Style');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Intimate', 's3://eel-bucket/subjects/Oral Communication/Lesson 6/Intimate.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 6: Types of Speech Style' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Casual', 's3://eel-bucket/subjects/Oral Communication/Lesson 6/Casual.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 6: Types of Speech Style' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Consultative', 's3://eel-bucket/subjects/Oral Communication/Lesson 6/Consultative.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 6: Types of Speech Style' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Formal', 's3://eel-bucket/subjects/Oral Communication/Lesson 6/Formal.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 6: Types of Speech Style' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Frozen', 's3://eel-bucket/subjects/Oral Communication/Lesson 6/Frozen.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 6: Types of Speech Style' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 7: Communicative Strategies', 2, 'Speech Context & Style');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Nomination', 's3://eel-bucket/subjects/Oral Communication/Lesson 7/Nomination.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 7: Communicative Strategies' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Restriction', 's3://eel-bucket/subjects/Oral Communication/Lesson 7/Restriction.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 7: Communicative Strategies' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Turn-taking', 's3://eel-bucket/subjects/Oral Communication/Lesson 7/Turn-taking.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 7: Communicative Strategies' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Topic Control', 's3://eel-bucket/subjects/Oral Communication/Lesson 7/Topic Control.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 7: Communicative Strategies' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Topic Shifting', 's3://eel-bucket/subjects/Oral Communication/Lesson 7/Topic Shifting.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 7: Communicative Strategies' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Repair', 's3://eel-bucket/subjects/Oral Communication/Lesson 7/Repair.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 7: Communicative Strategies' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Termination', 's3://eel-bucket/subjects/Oral Communication/Lesson 7/Termination.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 7: Communicative Strategies' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 8: Barriers to Communication', 2, 'Speech Context & Style');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Physical barriers', 's3://eel-bucket/subjects/Oral Communication/Lesson 8/Physical barriers.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 8: Barriers to Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Psychological barriers', 's3://eel-bucket/subjects/Oral Communication/Lesson 8/Psychological barriers.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 8: Barriers to Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Language barriers', 's3://eel-bucket/subjects/Oral Communication/Lesson 8/Language barriers.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 8: Barriers to Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Cultural barriers', 's3://eel-bucket/subjects/Oral Communication/Lesson 8/Cultural barriers.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 8: Barriers to Communication' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 9: Verbal Communication', 3, 'Verbal & Nonverbal Communication');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Language use', 's3://eel-bucket/subjects/Oral Communication/Lesson 9/Language use.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 9: Verbal Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Diction', 's3://eel-bucket/subjects/Oral Communication/Lesson 9/Diction.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 9: Verbal Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Clarity', 's3://eel-bucket/subjects/Oral Communication/Lesson 9/Clarity.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 9: Verbal Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Appropriateness', 's3://eel-bucket/subjects/Oral Communication/Lesson 9/Appropriateness.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 9: Verbal Communication' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 10: Nonverbal Communication', 3, 'Verbal & Nonverbal Communication');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Facial expressions', 's3://eel-bucket/subjects/Oral Communication/Lesson 10/Facial expressions.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 10: Nonverbal Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Gestures', 's3://eel-bucket/subjects/Oral Communication/Lesson 10/Gestures.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 10: Nonverbal Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Eye contact', 's3://eel-bucket/subjects/Oral Communication/Lesson 10/Eye contact.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 10: Nonverbal Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Posture', 's3://eel-bucket/subjects/Oral Communication/Lesson 10/Posture.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 10: Nonverbal Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Proxemics', 's3://eel-bucket/subjects/Oral Communication/Lesson 10/Proxemics.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 10: Nonverbal Communication' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Paralanguage', 's3://eel-bucket/subjects/Oral Communication/Lesson 10/Paralanguage.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 10: Nonverbal Communication' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 11: Communication Across Cultures', 3, 'Verbal & Nonverbal Communication');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Cultural differences', 's3://eel-bucket/subjects/Oral Communication/Lesson 11/Cultural differences.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 11: Communication Across Cultures' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Global communication', 's3://eel-bucket/subjects/Oral Communication/Lesson 11/Global communication.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 11: Communication Across Cultures' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Cultural sensitivity', 's3://eel-bucket/subjects/Oral Communication/Lesson 11/Cultural sensitivity.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 11: Communication Across Cultures' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 12: Types of Speech According to Delivery', 4, 'Public Speaking');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Manuscript', 's3://eel-bucket/subjects/Oral Communication/Lesson 12/Manuscript.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 12: Types of Speech According to Delivery' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Memorized', 's3://eel-bucket/subjects/Oral Communication/Lesson 12/Memorized.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 12: Types of Speech According to Delivery' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Extemporaneous', 's3://eel-bucket/subjects/Oral Communication/Lesson 12/Extemporaneous.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 12: Types of Speech According to Delivery' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Impromptu', 's3://eel-bucket/subjects/Oral Communication/Lesson 12/Impromptu.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 12: Types of Speech According to Delivery' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 13: Principles of Effective Speech Delivery', 4, 'Public Speaking');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Voice modulation', 's3://eel-bucket/subjects/Oral Communication/Lesson 13/Voice modulation.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 13: Principles of Effective Speech Delivery' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Pitch', 's3://eel-bucket/subjects/Oral Communication/Lesson 13/Pitch.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 13: Principles of Effective Speech Delivery' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Volume', 's3://eel-bucket/subjects/Oral Communication/Lesson 13/Volume.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 13: Principles of Effective Speech Delivery' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Rate', 's3://eel-bucket/subjects/Oral Communication/Lesson 13/Rate.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 13: Principles of Effective Speech Delivery' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Pronunciation', 's3://eel-bucket/subjects/Oral Communication/Lesson 13/Pronunciation.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 13: Principles of Effective Speech Delivery' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Stage presence', 's3://eel-bucket/subjects/Oral Communication/Lesson 13/Stage presence.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 13: Principles of Effective Speech Delivery' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 14: Preparing a Speech', 4, 'Public Speaking');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Audience analysis', 's3://eel-bucket/subjects/Oral Communication/Lesson 14/Audience analysis.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 14: Preparing a Speech' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Organizing ideas', 's3://eel-bucket/subjects/Oral Communication/Lesson 14/Organizing ideas.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 14: Preparing a Speech' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Writing an outline', 's3://eel-bucket/subjects/Oral Communication/Lesson 14/Writing an outline.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 14: Preparing a Speech' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (2, 'Lesson 15: Delivering a Speech', 4, 'Public Speaking');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Managing stage fright', 's3://eel-bucket/subjects/Oral Communication/Lesson 15/Managing stage fright.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 15: Delivering a Speech' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Using visual aids', 's3://eel-bucket/subjects/Oral Communication/Lesson 15/Using visual aids.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 15: Delivering a Speech' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Audience engagement', 's3://eel-bucket/subjects/Oral Communication/Lesson 15/Audience engagement.pdf' FROM lessons WHERE subject_id = 2 AND lesson_title = 'Lesson 15: Delivering a Speech' LIMIT 1;

-- =========================================================
-- SUBJECT 3: Creative Writing
-- =========================================================
DELETE t FROM topics t INNER JOIN lessons l ON t.lesson_id = l.lesson_id WHERE l.subject_id = 3;
DELETE FROM lessons WHERE subject_id = 3;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 1: Nature and Purpose of Creative Writing', 1, 'Introduction to Creative Writing');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Definition of creative writing', 's3://eel-bucket/subjects/Creative Writing/Lesson 1/Definition of creative writing.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 1: Nature and Purpose of Creative Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Purpose: expression, storytelling, reflection', 's3://eel-bucket/subjects/Creative Writing/Lesson 1/Purpose expression storytelling reflection.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 1: Nature and Purpose of Creative Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Differences between creative and academic writing', 's3://eel-bucket/subjects/Creative Writing/Lesson 1/Differences between creative and academic writing.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 1: Nature and Purpose of Creative Writing' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 2: Elements of Creative Writing', 1, 'Introduction to Creative Writing');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Plot', 's3://eel-bucket/subjects/Creative Writing/Lesson 2/Plot.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 2: Elements of Creative Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Characters', 's3://eel-bucket/subjects/Creative Writing/Lesson 2/Characters.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 2: Elements of Creative Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Setting', 's3://eel-bucket/subjects/Creative Writing/Lesson 2/Setting.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 2: Elements of Creative Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Conflict', 's3://eel-bucket/subjects/Creative Writing/Lesson 2/Conflict.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 2: Elements of Creative Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Theme', 's3://eel-bucket/subjects/Creative Writing/Lesson 2/Theme.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 2: Elements of Creative Writing' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 3: Literary Genres', 1, 'Introduction to Creative Writing');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Fiction (short stories, novels)', 's3://eel-bucket/subjects/Creative Writing/Lesson 3/Fiction short stories novels.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 3: Literary Genres' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Poetry', 's3://eel-bucket/subjects/Creative Writing/Lesson 3/Poetry.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 3: Literary Genres' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Drama/Playwriting', 's3://eel-bucket/subjects/Creative Writing/Lesson 3/Drama Playwriting.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 3: Literary Genres' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Creative non-fiction', 's3://eel-bucket/subjects/Creative Writing/Lesson 3/Creative non-fiction.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 3: Literary Genres' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 4: Creative Writing Techniques', 1, 'Introduction to Creative Writing');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Imagery', 's3://eel-bucket/subjects/Creative Writing/Lesson 4/Imagery.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 4: Creative Writing Techniques' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Figurative language (simile, metaphor, personification)', 's3://eel-bucket/subjects/Creative Writing/Lesson 4/Figurative language.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 4: Creative Writing Techniques' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Dialogue', 's3://eel-bucket/subjects/Creative Writing/Lesson 4/Dialogue.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 4: Creative Writing Techniques' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Point of view', 's3://eel-bucket/subjects/Creative Writing/Lesson 4/Point of view.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 4: Creative Writing Techniques' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 5: Story Planning and Plot Development', 2, 'Developing Creative Works');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Plot structure: Exposition, Rising Action, Climax, Falling Action, Resolution', 's3://eel-bucket/subjects/Creative Writing/Lesson 5/Plot structure.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 5: Story Planning and Plot Development' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Story mapping/outline', 's3://eel-bucket/subjects/Creative Writing/Lesson 5/Story mapping outline.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 5: Story Planning and Plot Development' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 6: Character Development', 2, 'Developing Creative Works');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Character traits', 's3://eel-bucket/subjects/Creative Writing/Lesson 6/Character traits.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 6: Character Development' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Motivation', 's3://eel-bucket/subjects/Creative Writing/Lesson 6/Motivation.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 6: Character Development' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Character arcs', 's3://eel-bucket/subjects/Creative Writing/Lesson 6/Character arcs.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 6: Character Development' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 7: Setting and World-Building', 2, 'Developing Creative Works');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Physical setting', 's3://eel-bucket/subjects/Creative Writing/Lesson 7/Physical setting.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 7: Setting and World-Building' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Social/cultural setting', 's3://eel-bucket/subjects/Creative Writing/Lesson 7/Social cultural setting.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 7: Setting and World-Building' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Creating believable worlds', 's3://eel-bucket/subjects/Creative Writing/Lesson 7/Creating believable worlds.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 7: Setting and World-Building' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 8: Crafting Dialogue and Voice', 2, 'Developing Creative Works');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Natural-sounding dialogue', 's3://eel-bucket/subjects/Creative Writing/Lesson 8/Natural-sounding dialogue.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 8: Crafting Dialogue and Voice' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Character voice', 's3://eel-bucket/subjects/Creative Writing/Lesson 8/Character voice.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 8: Crafting Dialogue and Voice' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Tone and mood', 's3://eel-bucket/subjects/Creative Writing/Lesson 8/Tone and mood.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 8: Crafting Dialogue and Voice' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 9: Drafting Creative Work', 3, 'Writing and Revising');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Writing the first draft', 's3://eel-bucket/subjects/Creative Writing/Lesson 9/Writing the first draft.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 9: Drafting Creative Work' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Writing without overthinking', 's3://eel-bucket/subjects/Creative Writing/Lesson 9/Writing without overthinking.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 9: Drafting Creative Work' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Following the outline', 's3://eel-bucket/subjects/Creative Writing/Lesson 9/Following the outline.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 9: Drafting Creative Work' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 10: Revising and Editing', 3, 'Writing and Revising');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Revising for content and clarity', 's3://eel-bucket/subjects/Creative Writing/Lesson 10/Revising for content and clarity.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 10: Revising and Editing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Editing for grammar, punctuation, and style', 's3://eel-bucket/subjects/Creative Writing/Lesson 10/Editing for grammar punctuation and style.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 10: Revising and Editing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Peer review', 's3://eel-bucket/subjects/Creative Writing/Lesson 10/Peer review.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 10: Revising and Editing' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 11: Using Literary Devices', 3, 'Writing and Revising');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Symbolism', 's3://eel-bucket/subjects/Creative Writing/Lesson 11/Symbolism.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 11: Using Literary Devices' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Irony', 's3://eel-bucket/subjects/Creative Writing/Lesson 11/Irony.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 11: Using Literary Devices' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Allegory', 's3://eel-bucket/subjects/Creative Writing/Lesson 11/Allegory.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 11: Using Literary Devices' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Foreshadowing', 's3://eel-bucket/subjects/Creative Writing/Lesson 11/Foreshadowing.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 11: Using Literary Devices' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 12: Narrative Techniques', 3, 'Writing and Revising');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'First-person vs third-person narration', 's3://eel-bucket/subjects/Creative Writing/Lesson 12/First-person vs third-person narration.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 12: Narrative Techniques' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Stream of consciousness', 's3://eel-bucket/subjects/Creative Writing/Lesson 12/Stream of consciousness.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 12: Narrative Techniques' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Flashback and foreshadowing', 's3://eel-bucket/subjects/Creative Writing/Lesson 12/Flashback and foreshadowing.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 12: Narrative Techniques' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 13: Creative Non-Fiction and Personal Essay', 4, 'Publishing and Performance');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Memoir', 's3://eel-bucket/subjects/Creative Writing/Lesson 13/Memoir.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 13: Creative Non-Fiction and Personal Essay' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Personal essay', 's3://eel-bucket/subjects/Creative Writing/Lesson 13/Personal essay.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 13: Creative Non-Fiction and Personal Essay' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Reflection and opinion', 's3://eel-bucket/subjects/Creative Writing/Lesson 13/Reflection and opinion.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 13: Creative Non-Fiction and Personal Essay' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 14: Poetry Writing', 4, 'Publishing and Performance');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Types of poems (sonnet, free verse, haiku)', 's3://eel-bucket/subjects/Creative Writing/Lesson 14/Types of poems.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 14: Poetry Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Rhythm, rhyme, and meter', 's3://eel-bucket/subjects/Creative Writing/Lesson 14/Rhythm rhyme and meter.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 14: Poetry Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Imagery and emotion', 's3://eel-bucket/subjects/Creative Writing/Lesson 14/Imagery and emotion.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 14: Poetry Writing' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 15: Drama and Script Writing', 4, 'Publishing and Performance');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Playwriting basics', 's3://eel-bucket/subjects/Creative Writing/Lesson 15/Playwriting basics.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 15: Drama and Script Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Stage directions', 's3://eel-bucket/subjects/Creative Writing/Lesson 15/Stage directions.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 15: Drama and Script Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Dialogue and scene creation', 's3://eel-bucket/subjects/Creative Writing/Lesson 15/Dialogue and scene creation.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 15: Drama and Script Writing' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (3, 'Lesson 16: Sharing and Publishing Creative Works', 4, 'Publishing and Performance');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Oral performance/reading', 's3://eel-bucket/subjects/Creative Writing/Lesson 16/Oral performance reading.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 16: Sharing and Publishing Creative Works' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Class publication or portfolio', 's3://eel-bucket/subjects/Creative Writing/Lesson 16/Class publication or portfolio.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 16: Sharing and Publishing Creative Works' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Online publishing platforms', 's3://eel-bucket/subjects/Creative Writing/Lesson 16/Online publishing platforms.pdf' FROM lessons WHERE subject_id = 3 AND lesson_title = 'Lesson 16: Sharing and Publishing Creative Works' LIMIT 1;

-- =========================================================
-- SUBJECT 4: Creative Non-Fiction
-- =========================================================
DELETE t FROM topics t INNER JOIN lessons l ON t.lesson_id = l.lesson_id WHERE l.subject_id = 4;
DELETE FROM lessons WHERE subject_id = 4;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 1: Nature and Purpose of Creative Non-Fiction', 1, 'Introduction to Creative Non-Fiction');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Definition of Creative Non-Fiction', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 1/Definition of Creative Non-Fiction.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 1: Nature and Purpose of Creative Non-Fiction' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Purpose: educate, inform, inspire, reflect', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 1/Purpose educate inform inspire reflect.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 1: Nature and Purpose of Creative Non-Fiction' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Differences between fiction, academic writing, and non-fiction', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 1/Differences between fiction academic writing and non-fiction.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 1: Nature and Purpose of Creative Non-Fiction' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 2: Types of Creative Non-Fiction', 1, 'Introduction to Creative Non-Fiction');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Memoir', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 2/Memoir.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 2: Types of Creative Non-Fiction' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Personal essay', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 2/Personal essay.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 2: Types of Creative Non-Fiction' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Literary journalism', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 2/Literary journalism.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 2: Types of Creative Non-Fiction' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Biography/Autobiography', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 2/Biography Autobiography.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 2: Types of Creative Non-Fiction' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 3: Key Elements', 1, 'Introduction to Creative Non-Fiction');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Real events and facts', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 3/Real events and facts.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 3: Key Elements' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Personal perspective/voice', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 3/Personal perspective and voice.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 3: Key Elements' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Emotional resonance', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 3/Emotional resonance.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 3: Key Elements' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Storytelling techniques', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 3/Storytelling techniques.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 3: Key Elements' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 4: Idea Generation and Topic Selection', 2, 'Planning and Research');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Choosing a compelling topic', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 4/Choosing a compelling topic.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 4: Idea Generation and Topic Selection' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Brainstorming techniques', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 4/Brainstorming techniques.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 4: Idea Generation and Topic Selection' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Narrowing down focus', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 4/Narrowing down focus.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 4: Idea Generation and Topic Selection' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 5: Research Skills', 2, 'Planning and Research');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Gathering factual information', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 5/Gathering factual information.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 5: Research Skills' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Using credible sources', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 5/Using credible sources.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 5: Research Skills' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Interviewing (if applicable)', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 5/Interviewing.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 5: Research Skills' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Note-taking and organization', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 5/Note-taking and organization.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 5: Research Skills' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 6: Outlining Creative Non-Fiction', 2, 'Planning and Research');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Structuring the narrative', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 6/Structuring the narrative.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 6: Outlining Creative Non-Fiction' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Chronological vs thematic organization', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 6/Chronological vs thematic organization.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 6: Outlining Creative Non-Fiction' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Main ideas and supporting details', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 6/Main ideas and supporting details.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 6: Outlining Creative Non-Fiction' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 7: Voice and Style', 3, 'Writing the Draft');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'First-person perspective', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 7/First-person perspective.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 7: Voice and Style' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Narrative voice and tone', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 7/Narrative voice and tone.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 7: Voice and Style' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Balancing fact and storytelling', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 7/Balancing fact and storytelling.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 7: Voice and Style' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 8: Writing the Draft', 3, 'Writing the Draft');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Opening that hooks the reader', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 8/Opening that hooks the reader.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 8: Writing the Draft' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Developing narrative with facts and personal reflection', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 8/Developing narrative with facts and personal reflection.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 8: Writing the Draft' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Integrating dialogue and description', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 8/Integrating dialogue and description.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 8: Writing the Draft' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 9: Using Literary Devices', 3, 'Writing the Draft');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Imagery', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 9/Imagery.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 9: Using Literary Devices' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Symbolism', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 9/Symbolism.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 9: Using Literary Devices' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Metaphor and analogy', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 9/Metaphor and analogy.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 9: Using Literary Devices' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Scene-building', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 9/Scene-building.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 9: Using Literary Devices' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 10: Revising and Editing', 3, 'Writing the Draft');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Revising for clarity and flow', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 10/Revising for clarity and flow.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 10: Revising and Editing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Editing for grammar, punctuation, and style', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 10/Editing for grammar punctuation and style.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 10: Revising and Editing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Peer and self-review', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 10/Peer and self-review.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 10: Revising and Editing' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 11: Formatting and Presentation', 4, 'Publishing and Sharing');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Organizing paragraphs and headings', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 11/Organizing paragraphs and headings.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 11: Formatting and Presentation' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Citation (if including references)', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 11/Citation.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 11: Formatting and Presentation' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Formatting for portfolio or class submission', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 11/Formatting for portfolio or class submission.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 11: Formatting and Presentation' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 12: Performance and Sharing', 4, 'Publishing and Sharing');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Oral reading/presentation', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 12/Oral reading presentation.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 12: Performance and Sharing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Feedback from peers and instructor', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 12/Feedback from peers and instructor.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 12: Performance and Sharing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Digital or printed publication (optional)', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 12/Digital or printed publication.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 12: Performance and Sharing' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (4, 'Lesson 13: Reflection and Assessment', 4, 'Publishing and Sharing');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Reflecting on learning and writing process', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 13/Reflecting on learning and writing process.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 13: Reflection and Assessment' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Evaluating strengths and areas for improvement', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 13/Evaluating strengths and areas for improvement.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 13: Reflection and Assessment' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Submission of final portfolio', 's3://eel-bucket/subjects/Creative Non-Fiction/Lesson 13/Submission of final portfolio.pdf' FROM lessons WHERE subject_id = 4 AND lesson_title = 'Lesson 13: Reflection and Assessment' LIMIT 1;

-- =========================================================
-- SUBJECT 5: English for Academic and Professional Purposes (EAPP)
-- =========================================================
DELETE t FROM topics t INNER JOIN lessons l ON t.lesson_id = l.lesson_id WHERE l.subject_id = 5;
DELETE FROM lessons WHERE subject_id = 5;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 1: Nature and Purpose of Academic Reading', 1, 'Academic Reading and Comprehension');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Definition of academic reading', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 1/Definition of academic reading.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 1: Nature and Purpose of Academic Reading' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Purposes: understanding, evaluating, applying', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 1/Purposes understanding evaluating applying.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 1: Nature and Purpose of Academic Reading' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Difference between academic and casual reading', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 1/Difference between academic and casual reading.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 1: Nature and Purpose of Academic Reading' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 2: Reading Comprehension Strategies', 1, 'Academic Reading and Comprehension');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Skimming and scanning', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 2/Skimming and scanning.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 2: Reading Comprehension Strategies' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Identifying main ideas and supporting details', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 2/Identifying main ideas and supporting details.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 2: Reading Comprehension Strategies' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Making inferences', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 2/Making inferences.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 2: Reading Comprehension Strategies' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Recognizing text structures', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 2/Recognizing text structures.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 2: Reading Comprehension Strategies' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 3: Analyzing Academic Texts', 1, 'Academic Reading and Comprehension');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Distinguishing facts from opinions', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 3/Distinguishing facts from opinions.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 3: Analyzing Academic Texts' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Identifying bias and assumptions', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 3/Identifying bias and assumptions.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 3: Analyzing Academic Texts' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Evaluating credibility of sources', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 3/Evaluating credibility of sources.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 3: Analyzing Academic Texts' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 4: Summarizing and Paraphrasing', 1, 'Academic Reading and Comprehension');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Writing concise summaries', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 4/Writing concise summaries.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 4: Summarizing and Paraphrasing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Paraphrasing without plagiarism', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 4/Paraphrasing without plagiarism.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 4: Summarizing and Paraphrasing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Synthesizing information from multiple sources', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 4/Synthesizing information from multiple sources.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 4: Summarizing and Paraphrasing' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 5: Writing Academic Essays', 2, 'Academic Writing Foundations');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Essay structure: introduction, body, conclusion', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 5/Essay structure introduction body conclusion.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 5: Writing Academic Essays' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Crafting thesis statements', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 5/Crafting thesis statements.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 5: Writing Academic Essays' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Paragraph development', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 5/Paragraph development.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 5: Writing Academic Essays' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 6: Developing Arguments', 2, 'Academic Writing Foundations');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Claim, evidence, reasoning', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 6/Claim evidence reasoning.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 6: Developing Arguments' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Counterarguments', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 6/Counterarguments.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 6: Developing Arguments' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Supporting details and examples', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 6/Supporting details and examples.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 6: Developing Arguments' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 7: Cohesion and Coherence', 2, 'Academic Writing Foundations');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Transitional devices', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 7/Transitional devices.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 7: Cohesion and Coherence' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Paragraph unity', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 7/Paragraph unity.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 7: Cohesion and Coherence' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Logical flow of ideas', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 7/Logical flow of ideas.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 7: Cohesion and Coherence' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 8: Formal Tone and Style', 2, 'Academic Writing Foundations');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Appropriate vocabulary', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 8/Appropriate vocabulary.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 8: Formal Tone and Style' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Avoiding colloquial expressions', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 8/Avoiding colloquial expressions.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 8: Formal Tone and Style' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Academic voice and objectivity', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 8/Academic voice and objectivity.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 8: Formal Tone and Style' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 9: Research Process', 3, 'Research Skills and Technical Writing');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Selecting a research topic', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 9/Selecting a research topic.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 9: Research Process' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Conducting literature review', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 9/Conducting literature review.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 9: Research Process' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Organizing research notes', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 9/Organizing research notes.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 9: Research Process' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 10: Academic Citation and Plagiarism', 3, 'Research Skills and Technical Writing');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'In-text citations (APA, MLA, or Chicago style)', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 10/In-text citations APA MLA Chicago.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 10: Academic Citation and Plagiarism' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Reference list and bibliography', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 10/Reference list and bibliography.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 10: Academic Citation and Plagiarism' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Avoiding plagiarism', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 10/Avoiding plagiarism.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 10: Academic Citation and Plagiarism' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 11: Technical and Professional Writing', 3, 'Research Skills and Technical Writing');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Writing reports, memos, and proposals', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 11/Writing reports memos and proposals.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 11: Technical and Professional Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Email etiquette', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 11/Email etiquette.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 11: Technical and Professional Writing' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Professional formatting', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 11/Professional formatting.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 11: Technical and Professional Writing' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 12: Data Interpretation and Analysis', 3, 'Research Skills and Technical Writing');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Reading charts, graphs, and tables', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 12/Reading charts graphs and tables.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 12: Data Interpretation and Analysis' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Summarizing numerical data in writing', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 12/Summarizing numerical data in writing.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 12: Data Interpretation and Analysis' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Integrating visuals into text', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 12/Integrating visuals into text.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 12: Data Interpretation and Analysis' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 13: Writing a Position Paper', 4, 'Presentation and Portfolio');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Structuring arguments', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 13/Structuring arguments.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 13: Writing a Position Paper' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Presenting clear evidence', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 13/Presenting clear evidence.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 13: Writing a Position Paper' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Drafting and revising', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 13/Drafting and revising.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 13: Writing a Position Paper' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 14: Oral Presentation Skills', 4, 'Presentation and Portfolio');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Preparing slides or visual aids', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 14/Preparing slides or visual aids.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 14: Oral Presentation Skills' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Effective speech delivery', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 14/Effective speech delivery.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 14: Oral Presentation Skills' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Engaging the audience', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 14/Engaging the audience.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 14: Oral Presentation Skills' LIMIT 1;

INSERT INTO lessons (subject_id, lesson_title, quarter_number, quarter_title) VALUES (5, 'Lesson 15: Portfolio Compilation', 4, 'Presentation and Portfolio');
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Selecting best outputs', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 15/Selecting best outputs.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 15: Portfolio Compilation' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Reflection on learning', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 15/Reflection on learning.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 15: Portfolio Compilation' LIMIT 1;
INSERT INTO topics (lesson_id, topic_title, pdf_path) SELECT lesson_id, 'Final submission of academic portfolio', 's3://eel-bucket/subjects/English for Academic and Professional Purposes/Lesson 15/Final submission of academic portfolio.pdf' FROM lessons WHERE subject_id = 5 AND lesson_title = 'Lesson 15: Portfolio Compilation' LIMIT 1;

-- =========================================================
-- DONE. All 5 subjects with lessons and topics inserted.
-- =========================================================
