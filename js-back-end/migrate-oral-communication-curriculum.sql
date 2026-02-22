-- Migration: Seed Oral Communication curriculum (15 lessons in 4 quarters)
-- Subject: Oral Communication = subject_id 2 (must exist in your subjects table)
-- PDF base: s3://eel-bucket/subjects/Oral Communication/
-- Requires: lessons table has quarter_number, quarter_title columns (run migrate-reading-writing-curriculum.sql ALTERs first if needed).

SET NAMES utf8mb4;

-- 1) Oral Communication = subject_id 2. Clear its existing lessons/topics.
DELETE t FROM topics t INNER JOIN lessons l ON t.lesson_id = l.lesson_id WHERE l.subject_id = 2;
DELETE FROM lessons WHERE subject_id = 2;

-- 2) Quarter 1 – Nature of Communication
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

-- 3) Quarter 2 – Speech Context & Style
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

-- 4) Quarter 3 – Verbal & Nonverbal Communication
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

-- 5) Quarter 4 – Public Speaking
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
