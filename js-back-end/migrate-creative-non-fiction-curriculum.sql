-- Migration: Seed Creative Non-Fiction curriculum (13 lessons in 4 quarters)
-- Subject: Creative Non-Fiction = subject_id 4 (must exist in your subjects table)
-- PDF base: s3://eel-bucket/subjects/Creative Non-Fiction/
-- Requires: lessons table has quarter_number, quarter_title columns.
--
-- ONE CLICK: Run this entire file in MySQL (e.g. Execute SQL script).
-- Or run the procedure only: CALL seed_creative_non_fiction();

SET NAMES utf8mb4;

DELIMITER $$

DROP PROCEDURE IF EXISTS seed_creative_non_fiction$$

CREATE PROCEDURE seed_creative_non_fiction()
BEGIN
  -- 1) Clear existing lessons/topics for subject_id 4
  DELETE t FROM topics t INNER JOIN lessons l ON t.lesson_id = l.lesson_id WHERE l.subject_id = 4;
  DELETE FROM lessons WHERE subject_id = 4;

-- 2) Quarter 1 – Introduction to Creative Non-Fiction
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

-- 3) Quarter 2 – Planning and Research
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

-- 4) Quarter 3 – Writing the Draft
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

-- 5) Quarter 4 – Publishing and Sharing
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

END$$

DELIMITER ;

CALL seed_creative_non_fiction();
