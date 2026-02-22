-- Migration: Seed Creative Writing curriculum (16 lessons in 4 quarters)
-- Subject: Creative Writing = subject_id 3 (must exist in your subjects table)
-- PDF base: s3://eel-bucket/subjects/Creative Writing/
-- Requires: lessons table has quarter_number, quarter_title columns.

SET NAMES utf8mb4;

-- 1) Creative Writing = subject_id 3. Clear its existing lessons/topics.
DELETE t FROM topics t INNER JOIN lessons l ON t.lesson_id = l.lesson_id WHERE l.subject_id = 3;
DELETE FROM lessons WHERE subject_id = 3;

-- 2) Quarter 1 – Introduction to Creative Writing
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

-- 3) Quarter 2 – Developing Creative Works
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

-- 4) Quarter 3 – Writing and Revising
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

-- 5) Quarter 4 – Publishing and Performance
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
