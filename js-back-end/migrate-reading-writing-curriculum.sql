-- Migration: Add quarter columns to lessons and seed Reading and Writing Skills curriculum
-- Subject: Reading and Writing Skills = subject_id 1 (must exist in your subjects table)
-- PDF base: s3://eel-bucket/subjects/Reading and Writing Skills/
-- If your schema already has quarter_number/quarter_title (e.g. from database.sql), comment out the two ALTER lines below.

SET NAMES utf8mb4;

-- 1) Add quarter columns to lessons (skip if already applied)
ALTER TABLE lessons ADD COLUMN quarter_number TINYINT UNSIGNED NULL COMMENT '1-4 for display grouping';
ALTER TABLE lessons ADD COLUMN quarter_title VARCHAR(255) NULL COMMENT 'e.g. Reading Academic Texts';

-- 2) Reading and Writing Skills = subject_id 1. Clear its existing lessons/topics.
DELETE t FROM topics t INNER JOIN lessons l ON t.lesson_id = l.lesson_id WHERE l.subject_id = 1;
DELETE FROM lessons WHERE subject_id = 1;

-- 3) Quarter 1 – Reading Academic Texts
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

-- 4) Quarter 2 – Writing Process
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

-- 5) Quarter 3 – Citation
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

-- 6) Quarter 4 – Academic Papers
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
