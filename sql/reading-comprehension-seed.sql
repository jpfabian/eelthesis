-- =========================================================
-- Reading Comprehension: Built-in Stories + Multiple Choice Questions
-- Run after database.sql. No subject_id; quizzes appear for all subjects.
--
-- NOTE: If you get "Duplicate entry" on (subject_id, quiz_number), you already
-- have reading quizzes for those numbers. Delete them first or skip this seed.
-- =========================================================

SET NAMES utf8mb4;

-- Make subject_id nullable (required before inserts; safe to run multiple times)
ALTER TABLE reading_quizzes
  MODIFY subject_id INT UNSIGNED NULL DEFAULT NULL;

-- =========================================================
-- Story 1: Magellan's Voyage
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  1,
  "Magellan's Voyage: The First Circumnavigation of the Globe",
  'intermediate',
  "In the 16th century, an age of great marine and terrestrial exploration, Ferdinand Magellan led the first expedition to sail around the world. As a young Portuguese noble, he served the king of Portugal, but he became involved in the quagmire of political intrigue at court and lost the king's favor. After he was dismissed from service by the king of Portugal, he offered to serve the future Emperor Charles V of Spain.\n\nA papal decree of 1493 had assigned all land in the New World west of 50 degrees W longitude to Spain and all the land east of that line to Portugal. Magellan offered to prove that the East Indies fell under Spanish authority. On September 20, 1519, Magellan set sail from Spain with five ships. More than a year later, one of these ships was exploring the topography of South America in search of a water route across the continent. This ship sank, but the remaining four ships searched along the southern peninsula of South America. Finally they found the passage they sought near 50 degrees S latitude. Magellan named this passage the Strait of All Saints, but today it is known as the Strait of Magellan.\n\nOne ship deserted while in this passage and returned to Spain, so fewer sailors were privileged to gaze at that first panorama of the Pacific Ocean. Those who remained crossed the meridian now known as the International Date Line in the early spring of 1521 after 98 days on the Pacific Ocean. During those long days at sea, many of Magellan's men died of starvation and disease.\n\nLater, Magellan became involved in an insular conflict in the Philippines and was killed in a tribal battle. Only one ship and 17 sailors under the command of the Basque navigator Elcano survived to complete the westward journey to Spain and thus prove once and for all that the world is round, with no precipice at the edge.",
  'active', 0, 70.00
);
SET @quiz1 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz1, 'mcq', 'Why did Magellan leave Portugal?', 1.00, 1),
(@quiz1, 'mcq', 'What did the papal decree of 1493 accomplish?', 1.00, 2),
(@quiz1, 'mcq', 'Where is the Strait of Magellan located?', 1.00, 3),
(@quiz1, 'mcq', 'What happened to Magellan?', 1.00, 4),
(@quiz1, 'mcq', 'Who completed the voyage to Spain after Magellan died?', 1.00, 5),
(@quiz1, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q1_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz1 AND position = 1);
SET @q1_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz1 AND position = 2);
SET @q1_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz1 AND position = 3);
SET @q1_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz1 AND position = 4);
SET @q1_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz1 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q1_1, 'He was dismissed from service by the king', 1, 1),
(@q1_1, 'He wanted to explore the East Indies', 0, 2),
(@q1_1, 'He was offered a job in Spain', 0, 3),
(@q1_1, 'The pope assigned him to Spain', 0, 4),
(@q1_2, 'Assigned land in the New World to Spain and Portugal', 1, 1),
(@q1_2, 'Granted Magellan permission to sail', 0, 2),
(@q1_2, 'Divided the East Indies', 0, 3),
(@q1_2, 'Created the Strait of Magellan', 0, 4),
(@q1_3, 'Near 50 degrees S latitude in South America', 1, 1),
(@q1_3, 'In the East Indies', 0, 2),
(@q1_3, 'Near the International Date Line', 0, 3),
(@q1_3, 'In the Philippines', 0, 4),
(@q1_4, 'He was killed in a tribal battle in the Philippines', 1, 1),
(@q1_4, 'He completed the voyage to Spain', 0, 2),
(@q1_4, 'He died of starvation at sea', 0, 3),
(@q1_4, 'He returned to Portugal', 0, 4),
(@q1_5, 'Elcano and 17 sailors', 1, 1),
(@q1_5, 'Magellan himself', 0, 2),
(@q1_5, 'All five original ships', 0, 3),
(@q1_5, 'The king of Spain', 0, 4);

-- =========================================================
-- Story 2: Marie Curie
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  2,
  'Marie Curie',
  'intermediate',
  "Marie Curie was one of the most accomplished scientists in history. Together with her husband, Pierre, she discovered radium, an element widely used for treating cancer, and studied uranium and other radioactive substances. Pierre and Marie's amicable collaboration later helped to unlock the secrets of the atom.\n\nMarie was born in 1867 in Warsaw, Poland, where her father was a professor of physics. At an early age, she displayed a brilliant mind and a blithe personality. Her great exuberance for learning prompted her to continue with her studies after high school. She became disgruntled, however, when she learned that the university in Warsaw was closed to women. Determined to receive a higher education, she defiantly left Poland and in 1891 entered the Sorbonne, a French university, where she earned her master's degree and doctorate in physics.\n\nMarie was fortunate to have studied at the Sorbonne with some of the greatest scientists of her day, one of whom was Pierre Curie. Marie and Pierre were married in 1895 and spent many productive years working together in the physics laboratory. A short time after they discovered radium, Pierre was killed by a horse-drawn wagon in 1906. Marie was stunned by this horrible misfortune and endured heartbreaking anguish. Despondently she recalled their close relationship and the joy that they had shared in scientific research. The fact that she had two young daughters to raise by herself greatly increased her distress.\n\nCurie's feeling of desolation finally began to fade when she was asked to succeed her husband as a physics professor at the Sorbonne. She was the first woman to be given a professorship at the world-famous university. In 1911 she received the Nobel Prize in chemistry for isolating radium. Although Marie Curie eventually suffered a fatal illness from her long exposure to radium, she never became disillusioned about her work. Regardless of the consequences, she had dedicated herself to science and to revealing the mysteries of the physical world.",
  'active', 1, 70.00
);
SET @quiz2 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz2, 'mcq', 'What did Marie Curie discover with her husband Pierre?', 1.00, 1),
(@quiz2, 'mcq', 'Why did Marie leave Poland?', 1.00, 2),
(@quiz2, 'mcq', 'Where did Marie earn her doctorate in physics?', 1.00, 3),
(@quiz2, 'mcq', 'What happened to Pierre Curie?', 1.00, 4),
(@quiz2, 'mcq', 'What did Marie receive in 1911?', 1.00, 5),
(@quiz2, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q2_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz2 AND position = 1);
SET @q2_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz2 AND position = 2);
SET @q2_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz2 AND position = 3);
SET @q2_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz2 AND position = 4);
SET @q2_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz2 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q2_1, 'Radium', 1, 1),
(@q2_1, 'Uranium only', 0, 2),
(@q2_1, 'Gold', 0, 3),
(@q2_1, 'The atom', 0, 4),
(@q2_2, 'The university in Warsaw was closed to women', 1, 1),
(@q2_2, 'She wanted to marry Pierre', 0, 2),
(@q2_2, 'Her father moved to France', 0, 3),
(@q2_2, 'She was offered a job at the Sorbonne', 0, 4),
(@q2_3, 'The Sorbonne', 1, 1),
(@q2_3, 'The University of Warsaw', 0, 2),
(@q2_3, 'Oxford University', 0, 3),
(@q2_3, 'Harvard University', 0, 4),
(@q2_4, 'He was killed by a horse-drawn wagon', 1, 1),
(@q2_4, 'He died from radiation exposure', 0, 2),
(@q2_4, 'He retired from science', 0, 3),
(@q2_4, 'He moved to Poland', 0, 4),
(@q2_5, 'The Nobel Prize in chemistry', 1, 1),
(@q2_5, 'The Nobel Prize in physics', 0, 2),
(@q2_5, 'A professorship at Oxford', 0, 3),
(@q2_5, 'The discovery of uranium', 0, 4);

-- =========================================================
-- Story 3: Mount Vesuvius and the Destruction of Pompeii
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  3,
  'Mount Vesuvius and the Destruction of Pompeii',
  'intermediate',
  "Mount Vesuvius, a volcano located between the ancient Italian cities of Pompeii and Herculaneum, has received much attention because of its frequent and destructive eruptions. The most famous of these eruptions occurred in A.D. 79.\n\nThe volcano had been inactive for centuries. There was little warning of the coming eruption, although one account unearthed by archaeologists says that a hard rain and a strong wind had disturbed the celestial calm during the preceding night. Early the next morning, the volcano poured a huge river of molten rock down upon Herculaneum, completely burying the city and filling the harbor with coagulated lava.\n\nMeanwhile, on the other side of the mountain, cinders, stone and ash rained down on Pompeii. Sparks from the burning ash ignited the combustible rooftops quickly. Large portions of the city were destroyed in the conflagration. Fire, however, was not the only cause of destruction. Poisonous sulfuric gases saturated the air. These heavy gases were not buoyant in the atmosphere and therefore sank toward the earth and suffocated people.\n\nOver the years, excavations of Pompeii and Herculaneum have revealed a great deal about the behavior of the volcano. By analyzing data, much as a zoologist dissects an animal specimen, scientists have concluded that the eruption changed large portions of the area's geography. For instance, it turned the Sarno River from its course and raised the level of the beach along the Bay of Naples. Meteorologists studying these events have also concluded that Vesuvius caused a huge tidal wave that affected the world's climate.\n\nIn addition to making these investigations, archaeologists have been able to study the skeletons of victims by using distilled water to wash away the volcanic ash. By strengthening the brittle bones with acrylic paint, scientists have been able to examine the skeletons and draw conclusions about the diet and habits of the residents. Finally, the excavations at both Pompeii and Herculaneum have yielded many examples of classical art, such as jewelry made of bronze, which is an alloy of copper and tin. The eruption of Mount Vesuvius and its tragic consequences have provided everyone with a wealth of data about the effects that volcanoes can have on the surrounding area. Today, volcanologists can locate and predict eruptions, saving lives and preventing the destruction of other cities and cultures.",
  'active', 1, 70.00
);
SET @quiz3 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz3, 'mcq', 'When did the most famous eruption of Mount Vesuvius occur?', 1.00, 1),
(@quiz3, 'mcq', 'What did the volcano pour down upon Herculaneum?', 1.00, 2),
(@quiz3, 'mcq', 'Besides fire, what caused destruction in Pompeii?', 1.00, 3),
(@quiz3, 'mcq', 'How have archaeologists studied the skeletons of victims?', 1.00, 4),
(@quiz3, 'mcq', 'What did scientists conclude about the eruption?', 1.00, 5),
(@quiz3, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q3_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz3 AND position = 1);
SET @q3_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz3 AND position = 2);
SET @q3_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz3 AND position = 3);
SET @q3_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz3 AND position = 4);
SET @q3_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz3 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q3_1, 'A.D. 79', 1, 1),
(@q3_1, 'A.D. 100', 0, 2),
(@q3_1, 'A.D. 50', 0, 3),
(@q3_1, 'A.D. 200', 0, 4),
(@q3_2, 'A huge river of molten rock', 1, 1),
(@q3_2, 'Cinders and ash only', 0, 2),
(@q3_2, 'Poisonous gases', 0, 3),
(@q3_2, 'A tidal wave', 0, 4),
(@q3_3, 'Poisonous sulfuric gases', 1, 1),
(@q3_3, 'Molten lava', 0, 2),
(@q3_3, 'Earthquakes', 0, 3),
(@q3_3, 'Flooding', 0, 4),
(@q3_4, 'Using distilled water and acrylic paint', 1, 1),
(@q3_4, 'Using fire to burn away ash', 0, 2),
(@q3_4, 'Using acid', 0, 3),
(@q3_4, 'Using X-rays only', 0, 4),
(@q3_5, 'It changed large portions of the area''s geography', 1, 1),
(@q3_5, 'It had no lasting effects', 0, 2),
(@q3_5, 'It only affected Pompeii', 0, 3),
(@q3_5, 'It improved the climate', 0, 4);

-- =========================================================
-- Story 4: The Spanish Armada
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  4,
  'The Spanish Armada',
  'intermediate',
  "Conflict had existed between Spain and England since the 1570s. England wanted a share of the wealth that Spain had been taking from the lands it had claimed in the Americas.\n\nElizabeth I, Queen of England, encouraged her staunch admiral of the navy, Sir Francis Drake, to raid Spanish ships and towns. Though these raids were on a small scale, Drake achieved dramatic success, adding gold and silver to England's treasury and diminishing Spain's supremacy.\n\nReligious differences also caused conflict between the two countries. Whereas Spain was Roman Catholic, most of England had become Protestant. King Philip II of Spain wanted to claim the throne and make England a Catholic country again. To satisfy his ambition and also to retaliate against England's theft of his gold and silver, King Philip began to build his fleet of warships, the Spanish Armada, in January 1586.\n\nPhilip intended his fleet to be indestructible. In addition to building new warships, he marshaled 130 sailing vessels of all types and recruited more than 19,000 robust soldiers and 8,000 sailors. Although some of his ships lacked guns and others lacked ammunition, Philip was convinced that his Armada could withstand any battle with England.\n\nThe martial Armada set sail from Lisbon, Portugal, on May 9, 1588, but bad weather forced it back to port. The voyage resumed on July 22 after the weather became more stable.\n\nThe Spanish fleet met the smaller, faster, and more maneuverable English ships in battle off the coast of Plymouth, England, first on July 31 and again on August 2. The two battles left Spain vulnerable, having lost several ships and with its ammunition depleted. On August 7, while the Armada lay at anchor on the French side of the Strait of Dover, England sent eight burning ships into the midst of the Spanish fleet to set it on fire. Blocked on one side, the Spanish ships could only drift away, their crews in panic and disorder. Before the Armada could regroup, the English attacked again on August 8.\n\nAlthough the Spaniards made a valiant effort to fight back, the fleet suffered extensive damage. During the eight hours of battle, the Armada drifted perilously close to the rocky coastline. At the moment when it seemed that the Spanish ships would be driven onto the English shore, the wind shifted, and the Armada drifted out into the North Sea. The Spaniards recognized the superiority of the English fleet and returned home, defeated.",
  'active', 1, 70.00
);
SET @quiz4 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz4, 'mcq', 'Why did conflict exist between Spain and England since the 1570s?', 1.00, 1),
(@quiz4, 'mcq', 'What did Elizabeth I encourage Sir Francis Drake to do?', 1.00, 2),
(@quiz4, 'mcq', 'What religious difference caused conflict between Spain and England?', 1.00, 3),
(@quiz4, 'mcq', 'When did King Philip begin building the Spanish Armada?', 1.00, 4),
(@quiz4, 'mcq', 'Where did the Spanish Armada set sail from?', 1.00, 5),
(@quiz4, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q4_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz4 AND position = 1);
SET @q4_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz4 AND position = 2);
SET @q4_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz4 AND position = 3);
SET @q4_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz4 AND position = 4);
SET @q4_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz4 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q4_1, 'England wanted a share of the wealth Spain took from the Americas', 1, 1),
(@q4_1, 'Spain wanted to invade England', 0, 2),
(@q4_1, 'England was Catholic', 0, 3),
(@q4_1, 'Philip II was king of Spain', 0, 4),
(@q4_2, 'Raid Spanish ships and towns', 1, 1),
(@q4_2, 'Build warships', 0, 2),
(@q4_2, 'Convert to Protestantism', 0, 3),
(@q4_2, 'Surrender to Spain', 0, 4),
(@q4_3, 'Spain was Roman Catholic, England had become Protestant', 1, 1),
(@q4_3, 'England was Catholic, Spain was Protestant', 0, 2),
(@q4_3, 'Both were Catholic', 0, 3),
(@q4_3, 'Both were Protestant', 0, 4),
(@q4_4, 'January 1586', 1, 1),
(@q4_4, 'May 1588', 0, 2),
(@q4_4, 'July 1588', 0, 3),
(@q4_4, '1570', 0, 4),
(@q4_5, 'Lisbon, Portugal', 1, 1),
(@q4_5, 'Plymouth, England', 0, 2),
(@q4_5, 'The Strait of Dover', 0, 3),
(@q4_5, 'The North Sea', 0, 4);

-- =========================================================
-- Story 5: The Battle of Marathon
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  5,
  'The Battle of Marathon',
  'intermediate',
  "The victory of the small Greek democracy of Athens over the mighty Persian Empire in 490 B.C. is one of the most famous events in history. Darius, king of the Persian Empire, was furious because Athens had interceded for the other Greek city-states in revolt against Persian domination. In anger the king sent an enormous army to defeat Athens. He thought it would take drastic steps to pacify the rebellious part of the empire.\n\nPersia was ruled by one man. In Athens, however, all citizens helped to rule. Ennobled by this participation, Athenians were prepared to die for their city-state. Perhaps this was the secret of the remarkable victory at Marathon, which freed them from Persian rule. On their way to Marathon, the Persians tried to fool some Greek city-states by claiming to have come in peace. The frightened citizens of Delos refused to believe this. Not wanting to abet the conquest of Greece, they fled from their city and did not return until the Persians had left. They were wise, for the Persians next conquered the city of Eritrea and captured its people.\n\nTiny Athens stood alone against Persia. The Athenian people went to their sanctuaries. There they prayed for deliverance. They asked their gods to expedite their victory. The Athenians refurbished their weapons and moved to the plain of Marathon, where their little band would meet the Persians. At the last moment, soldiers from Plataea reinforced the Athenian troops.\n\nThe Athenian army attacked, and Greek citizens fought bravely. The power of the mighty Persians was offset by the love that the Athenians had for their city. Athenians defeated the Persians in both archery and hand combat. Greek soldiers seized Persian ships and burned them, and the Persians fled in terror. Herodotus, a famous historian, reports that 6,400 Persians died, compared to only 192 Athenians.",
  'active', 1, 70.00
);
SET @quiz5 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz5, 'mcq', 'Why was Darius furious with Athens?', 1.00, 1),
(@quiz5, 'mcq', 'How was Persia ruled compared to Athens?', 1.00, 2),
(@quiz5, 'mcq', 'What did the citizens of Delos do when the Persians claimed to have come in peace?', 1.00, 3),
(@quiz5, 'mcq', 'What city did the Persians conquer after Delos?', 1.00, 4),
(@quiz5, 'mcq', 'Where did the Athenian army meet the Persians?', 1.00, 5),
(@quiz5, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q5_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz5 AND position = 1);
SET @q5_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz5 AND position = 2);
SET @q5_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz5 AND position = 3);
SET @q5_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz5 AND position = 4);
SET @q5_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz5 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q5_1, 'Athens had interceded for other Greek city-states in revolt against Persian domination', 1, 1),
(@q5_1, 'Athens refused to pay tribute', 0, 2),
(@q5_1, 'Athens attacked Persia', 0, 3),
(@q5_1, 'Athens allied with Delos', 0, 4),
(@q5_2, 'Persia was ruled by one man; in Athens all citizens helped to rule', 1, 1),
(@q5_2, 'Both were ruled by kings', 0, 2),
(@q5_2, 'Both were democracies', 0, 3),
(@q5_2, 'Athens was ruled by one man', 0, 4),
(@q5_3, 'They fled from their city and did not return until the Persians had left', 1, 1),
(@q5_3, 'They believed the Persians and welcomed them', 0, 2),
(@q5_3, 'They joined the Persian army', 0, 3),
(@q5_3, 'They attacked the Persians', 0, 4),
(@q5_4, 'Eritrea', 1, 1),
(@q5_4, 'Athens', 0, 2),
(@q5_4, 'Plataea', 0, 3),
(@q5_4, 'Marathon', 0, 4),
(@q5_5, 'The plain of Marathon', 1, 1),
(@q5_5, 'Delos', 0, 2),
(@q5_5, 'Athens', 0, 3),
(@q5_5, 'Plataea', 0, 4);

-- =========================================================
-- Story 6: What Started the Trojan War?
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  6,
  'What Started the Trojan War?',
  'intermediate',
  "The Trojan War is one of the most famous wars in history. It is well known for the 10-year duration, for the heroism of a number of legendary characters, and for the Trojan horse. What may not be familiar, however, is the story of how the war began.\n\nAccording to Greek myth, the strife between the Trojans and the Greeks started at the wedding of Peleus, King of Thessaly, and Thetis, a sea nymph. All of the gods and goddesses had been invited to the wedding celebration in Troy except Eris, goddess of discord. She had been omitted from the guest list because her presence always embroiled mortals and immortals alike in conflict.\n\nTo take revenge on those who had slighted her, Eris decided to cause a skirmish. Into the middle of the banquet hall, she threw a golden apple marked \"for the most beautiful.\" All of the goddesses began to haggle over who should possess it. The gods and goddesses reached a stalemate when the choice was narrowed to Hera, Athena, and Aphrodite. Someone was needed to settle the controversy by picking a winner. The job eventually fell to Paris, son of King Priam of Troy, who was said to be a good judge of beauty. Paris did not have an easy job. Each goddess, eager to win the golden apple, tried aggressively to bribe him.\n\n\"I'll grant you vast kingdoms to rule,\" promised Hera. \"Vast kingdoms are nothing in comparison with my gift,\" contradicted Athena. \"Choose me and I'll see that you win victory and fame in war.\" Aphrodite outdid her adversaries, however. She won the golden apple by offering Helen, daughter of Zeus and the most beautiful mortal in the land, to Paris. Paris, anxious to claim Helen, set off for Sparta in Greece.\n\nAlthough Paris learned that Helen was married, he nevertheless accepted the hospitality of her husband, King Menelaus of Sparta. Therefore, Menelaus was outraged for a number of reasons when Paris departed, taking Helen and much of the king's wealth back to Troy. Menelaus collected his loyal forces and set sail for Troy to begin the war to reclaim Helen.",
  'active', 1, 70.00
);
SET @quiz6 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz6, 'mcq', 'Where did the strife between the Trojans and Greeks begin according to Greek myth?', 1.00, 1),
(@quiz6, 'mcq', 'Why was Eris not invited to the wedding?', 1.00, 2),
(@quiz6, 'mcq', 'What did Eris throw into the banquet hall?', 1.00, 3),
(@quiz6, 'mcq', 'Who was chosen to settle the controversy by picking a winner?', 1.00, 4),
(@quiz6, 'mcq', 'What did Aphrodite offer Paris to win the golden apple?', 1.00, 5),
(@quiz6, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q6_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz6 AND position = 1);
SET @q6_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz6 AND position = 2);
SET @q6_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz6 AND position = 3);
SET @q6_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz6 AND position = 4);
SET @q6_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz6 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q6_1, 'At the wedding of Peleus and Thetis', 1, 1),
(@q6_1, 'In Sparta', 0, 2),
(@q6_1, 'On the battlefield', 0, 3),
(@q6_1, 'At the court of King Priam', 0, 4),
(@q6_2, 'Her presence always caused conflict', 1, 1),
(@q6_2, 'She was not a goddess', 0, 2),
(@q6_2, 'She lived too far away', 0, 3),
(@q6_2, 'She had offended Peleus', 0, 4),
(@q6_3, 'A golden apple marked "for the most beautiful"', 1, 1),
(@q6_3, 'A golden crown', 0, 2),
(@q6_3, 'A sword', 0, 3),
(@q6_3, 'A mirror', 0, 4),
(@q6_4, 'Paris, son of King Priam of Troy', 1, 1),
(@q6_4, 'Zeus', 0, 2),
(@q6_4, 'Peleus', 0, 3),
(@q6_4, 'Menelaus', 0, 4),
(@q6_5, 'Helen, daughter of Zeus', 1, 1),
(@q6_5, 'Vast kingdoms', 0, 2),
(@q6_5, 'Victory and fame in war', 0, 3),
(@q6_5, 'The golden apple itself', 0, 4);

-- =========================================================
-- Story 7: The Identity of Anastasia
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  7,
  'The Identity of Anastasia',
  'intermediate',
  "One of the most intriguing stories of the Russian Revolution concerns the identity of Anastasia, the youngest daughter of Czar Nicholas II. During his reign over Russia, the czar had planned to revoke many of the harsh laws established by previous czars. Some workers and peasants, however, clamored for more rapid social reform. In 1918, a group of these people known as Bolsheviks overthrew the government. On July 17 or 18, they murdered the czar and what was thought to be his entire family.\n\nAlthough witnesses vouched that all the members of the czar's family had been executed, there were rumors suggesting that Anastasia had survived. Over the years, a number of women claimed to be Grand Duchess Anastasia. Perhaps the most famous claimant was Anastasia Tschaikovsky, who was also known as Anna Anderson.\n\nIn 1920, 18 months after the czar's execution, this terrified young woman was rescued from drowning in a Berlin river. She spent two years in a hospital, where she attempted to reclaim her health and shattered mind. The doctors and nurses thought that she resembled Anastasia and questioned her about her background. She disclaimed any connection with the czar's family. Eight years later, however, she claimed that she was Anastasia. She said that she had been rescued by two Russian soldiers after the czar and the rest of her family had been killed. Two brothers named Tschaikovsky had carried her into Romania. She had married one of the brothers, who had taken her to Berlin and left her there, penniless and without a vocation. Unable to invoke the aid of her mother's family in Germany, she had tried to drown herself.\n\nDuring the next few years, scores of the czar's relatives, ex-servants, and acquaintances interviewed her. Many of these people said that her looks and mannerisms were evocative of the Anastasia that they had known. Her grandmother and other relatives denied that she was the real Anastasia, however.\n\nTired of being accused of fraud, Anastasia immigrated to the United States in 1928 and took the name Anna Anderson. She still wished to prove that she was Anastasia, though, and returned to Germany in 1933 to bring suit against her mother's family. There she declaimed to the court, asserting that she was indeed Anastasia and deserved her inheritance.\n\nIn 1957, the court decided that it could neither confirm nor deny Anastasia's identity. Although it will probably never be known whether this woman was the Grand Duchess Anastasia, her search to establish her identity has been the subject of numerous books, plays, and movies.",
  'active', 1, 70.00
);
SET @quiz7 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz7, 'mcq', 'Who was Anastasia?', 1.00, 1),
(@quiz7, 'mcq', 'What group overthrew the Russian government in 1918?', 1.00, 2),
(@quiz7, 'mcq', 'Who did the woman claim rescued her after the czar''s family was killed?', 1.00, 3),
(@quiz7, 'mcq', 'What name did she take when she immigrated to the United States?', 1.00, 4),
(@quiz7, 'mcq', 'What did her grandmother and other relatives say about her claim?', 1.00, 5),
(@quiz7, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q7_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz7 AND position = 1);
SET @q7_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz7 AND position = 2);
SET @q7_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz7 AND position = 3);
SET @q7_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz7 AND position = 4);
SET @q7_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz7 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q7_1, 'The youngest daughter of Czar Nicholas II', 1, 1),
(@q7_1, 'A German woman who claimed to be royalty', 0, 2),
(@q7_1, 'The wife of a Russian soldier', 0, 3),
(@q7_1, 'A Bolshevik leader', 0, 4),
(@q7_2, 'The Bolsheviks', 1, 1),
(@q7_2, 'The czar''s family', 0, 2),
(@q7_2, 'The Tschaikovsky brothers', 0, 3),
(@q7_2, 'German doctors', 0, 4),
(@q7_3, 'Two Russian soldiers', 1, 1),
(@q7_3, 'The Tschaikovsky brothers', 0, 2),
(@q7_3, 'Her grandmother', 0, 3),
(@q7_3, 'Doctors and nurses', 0, 4),
(@q7_4, 'Anna Anderson', 1, 1),
(@q7_4, 'Anastasia Tschaikovsky', 0, 2),
(@q7_4, 'Grand Duchess', 0, 3),
(@q7_4, 'She kept her original name', 0, 4),
(@q7_5, 'They denied that she was the real Anastasia', 1, 1),
(@q7_5, 'They confirmed her identity', 0, 2),
(@q7_5, 'They helped her claim her inheritance', 0, 3),
(@q7_5, 'They had no opinion', 0, 4);

-- =========================================================
-- Story 8: The Fall of French Royalty
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  8,
  'The Fall of French Royalty',
  'intermediate',
  "King Louis XVI and Queen Marie Antoinette ruled France from 1774 to 1789, a time when the country was fighting bankruptcy. The royal couple did not let France's insecure financial situation limit their immoderate spending, however. Even though the minister of finance repeatedly warned the king and queen against wasting money, they continued to spend great fortunes on their personal pleasure. This lavish spending greatly enraged the people of France. They felt that the royal couple bought its luxurious lifestyle at the poor people's expense.\n\nMarie Antoinette, the beautiful but exceedingly impractical queen, seemed uncaring about her subjects' misery. While French citizens begged for lower taxes, the queen embellished her palace with extravagant works of art. She also surrounded herself with artists, writers, and musicians, who encouraged the queen to spend money even more profusely.\n\nWhile the queen's favorites glutted themselves on huge feasts at the royal table, many people in France were starving. The French government taxed the citizens outrageously. These high taxes paid for the entertainments the queen and her court so enjoyed. When the minister of finance tried to stop these royal spendthrifts, the queen replaced him. The intense hatred that the people felt for Louis XVI and Marie Antoinette kept building until it led to the French Revolution. During this time of struggle and violence (1789-1799), thousands of aristocrats, as well as the king and queen themselves, lost their lives at the guillotine. Perhaps if Louis XVI and Marie Antoinette had reined in their extravagant spending, the events that rocked France would not have occurred.",
  'active', 1, 70.00
);
SET @quiz8 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz8, 'mcq', 'When did Louis XVI and Marie Antoinette rule France?', 1.00, 1),
(@quiz8, 'mcq', 'What was France''s financial situation during their reign?', 1.00, 2),
(@quiz8, 'mcq', 'What did Marie Antoinette do while citizens begged for lower taxes?', 1.00, 3),
(@quiz8, 'mcq', 'What happened when the minister of finance tried to stop the royal spending?', 1.00, 4),
(@quiz8, 'mcq', 'What did the intense hatred of the people lead to?', 1.00, 5),
(@quiz8, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q8_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz8 AND position = 1);
SET @q8_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz8 AND position = 2);
SET @q8_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz8 AND position = 3);
SET @q8_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz8 AND position = 4);
SET @q8_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz8 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q8_1, '1774 to 1789', 1, 1),
(@q8_1, '1789 to 1799', 0, 2),
(@q8_1, '1774 to 1799', 0, 3),
(@q8_1, '1789 to 1815', 0, 4),
(@q8_2, 'Fighting bankruptcy', 1, 1),
(@q8_2, 'Prosperous and wealthy', 0, 2),
(@q8_2, 'Stable and secure', 0, 3),
(@q8_2, 'Recently recovered', 0, 4),
(@q8_3, 'Embellished her palace with extravagant works of art', 1, 1),
(@q8_3, 'Lowered taxes for the poor', 0, 2),
(@q8_3, 'Dismissed her artists and musicians', 0, 3),
(@q8_3, 'Reduced royal spending', 0, 4),
(@q8_4, 'The queen replaced him', 1, 1),
(@q8_4, 'The king agreed with him', 0, 2),
(@q8_4, 'Spending was reduced', 0, 3),
(@q8_4, 'He was promoted', 0, 4),
(@q8_5, 'The French Revolution', 1, 1),
(@q8_5, 'A new tax system', 0, 2),
(@q8_5, 'The queen''s exile', 0, 3),
(@q8_5, 'Economic reform', 0, 4);

-- =========================================================
-- Story 9: The Invention of the Airplane
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  9,
  'The Invention of the Airplane',
  'intermediate',
  "Many great inventions are initially greeted with ridicule and disbelief. The invention of the airplane was no exception. Although many people who heard about the first powered flight on December 17, 1903 were excited and impressed, others reacted with peals of laughter. The idea of flying an aircraft was repulsive to some people. Such people called Wilbur and Orville Wright, the inventors of the first flying machine, impulsive fools. Negative reactions, however, did not stop the Wrights. Impelled by their desire to succeed, they continued their experiments in aviation.\n\nOrville and Wilbur Wright had always had a compelling interest in aeronautics and mechanics. As young boys they earned money by making and selling kites and mechanical toys. Later, they designed a newspaper-folding machine, built a printing press, and operated a bicycle-repair shop. In 1896, when they read about the death of Otto Lilienthal, the brothers' interest in flight grew into a compulsion.\n\nLilienthal, a pioneer in hang-gliding, had controlled his gliders by shifting his body in the desired direction. This idea was repellent to the Wright brothers, however, and they searched for more efficient methods to control the balance of airborne vehicles. In 1900 and 1901, the Wrights tested numerous gliders and developed control techniques. The brothers' inability to obtain enough lift power for the gliders almost led them to abandon their efforts.\n\nAfter further study, the Wright brothers concluded that the published tables of air pressure on curved surfaces must be wrong. They set up a wind tunnel and began a series of experiments with model wings. Because of their efforts, the old tables were repealed in time and replaced by the first reliable figures for air pressure on curved surfaces. This work, in turn, made it possible for the brothers to design a machine that would fly. In 1903 the Wrights built their first airplane, which cost less than $1,000. They even designed and built their own source of propulsion-a lightweight gasoline engine. When they started the engine on December 17, the airplane pulsated wildly before taking off. The plane managed to stay aloft for 12 seconds, however, and it flew 120 feet.\n\nBy 1905, the Wrights had perfected the first airplane that could turn, circle, and remain airborne for half an hour at a time. Others had flown in balloons and hang gliders, but the Wright brothers were the first to build a full-size machine that could fly under its own power. As the contributors of one of the most outstanding engineering achievements in history, the Wright brothers are accurately called the fathers of aviation.",
  'active', 1, 70.00
);
SET @quiz9 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz9, 'mcq', 'When did the first powered flight occur?', 1.00, 1),
(@quiz9, 'mcq', 'How did some people react to the idea of the airplane?', 1.00, 2),
(@quiz9, 'mcq', 'What did Otto Lilienthal contribute to aviation?', 1.00, 3),
(@quiz9, 'mcq', 'What did the Wright brothers do to fix the air pressure tables?', 1.00, 4),
(@quiz9, 'mcq', 'How long did the first flight stay aloft, and how far did it fly?', 1.00, 5),
(@quiz9, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q9_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz9 AND position = 1);
SET @q9_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz9 AND position = 2);
SET @q9_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz9 AND position = 3);
SET @q9_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz9 AND position = 4);
SET @q9_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz9 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q9_1, 'December 17, 1903', 1, 1),
(@q9_1, 'December 17, 1905', 0, 2),
(@q9_1, 'January 1, 1900', 0, 3),
(@q9_1, '1896', 0, 4),
(@q9_2, 'With ridicule and disbelief', 1, 1),
(@q9_2, 'With enthusiasm and support', 0, 2),
(@q9_2, 'With indifference', 0, 3),
(@q9_2, 'With financial backing', 0, 4),
(@q9_3, 'He was a pioneer in hang-gliding who controlled gliders by shifting his body', 1, 1),
(@q9_3, 'He built the first airplane', 0, 2),
(@q9_3, 'He invented the wind tunnel', 0, 3),
(@q9_3, 'He designed the gasoline engine', 0, 4),
(@q9_4, 'They set up a wind tunnel and ran experiments with model wings', 1, 1),
(@q9_4, 'They abandoned their efforts', 0, 2),
(@q9_4, 'They copied Lilienthal''s methods', 0, 3),
(@q9_4, 'They built a full-size glider', 0, 4),
(@q9_5, '12 seconds and 120 feet', 1, 1),
(@q9_5, 'Half an hour and several miles', 0, 2),
(@q9_5, '5 minutes and 500 feet', 0, 3),
(@q9_5, '1 minute and 60 feet', 0, 4);

-- =========================================================
-- Story 10: John Muir
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  10,
  'John Muir',
  'intermediate',
  "In 1892, the Sierra Club was formed. In 1908, an area of coastal redwood trees north of San Francisco was established as Muir Woods National Monument. In the Sierra Nevada Mountains, a walking trail from Yosemite Valley to Mount Whitney was dedicated in 1938. It is called the John Muir Trail.\n\nJohn Muir was born in 1838 in Scotland. His family name means \"moor,\" which is a meadow full of flowers and animals. John loved nature from the time he was small. He also liked to climb rocky cliffs and walls.\n\nWhen John was 11 years old, his family moved to the United States and settled in Wisconsin. John was good with tools and soon became an inventor. He first invented a model of a sawmill. Later, he invented an alarm clock that would cause the sleeping person to be tipped out of bed when the timer sounded.\n\nMuir left home at an early age. He took a 1,000-mile walk south to the Gulf of Mexico in 1867 and 1868. Then he sailed for San Francisco. The city was too noisy and crowded for Muir, so he headed inland for the Sierra Nevadas.\n\nWhen Muir discovered the Yosemite Valley in the Sierra Nevadas, it was as if he had come home. He loved the mountains, the wildlife, and the trees. He climbed the mountains and even climbed trees during thunderstorms in order to get closer to the wind. He put forth the theory in the late 1860s that the Yosemite Valley had been formed through the action of glaciers. People ridiculed him. Not until 1930 was Muir's theory proven correct.\n\nMuir began to write articles about the Yosemite Valley to tell readers about its beauty. His writing also warned people that Yosemite was in danger from timber mining and sheep ranching interests. In 1901, Theodore Roosevelt became president of the United States. He was interested in conservation. Muir took the president through Yosemite, and Roosevelt helped get legislation passed to create Yosemite National Park in 1906.\n\nAlthough Muir won many conservation battles, he lost a major one. He fought to save the Hetch Hetchy Valley, which people wanted to dam in order to provide water for San Francisco. In late 1913, a bill was signed to dam the valley. Muir died in 1914. Some people say losing the fight to protect the valley killed Muir.",
  'active', 1, 70.00
);
SET @quiz10 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz10, 'mcq', 'When was the Sierra Club formed?', 1.00, 1),
(@quiz10, 'mcq', 'What does the name Muir mean?', 1.00, 2),
(@quiz10, 'mcq', 'What did John invent as a young person?', 1.00, 3),
(@quiz10, 'mcq', 'What was Muir''s theory about the Yosemite Valley?', 1.00, 4),
(@quiz10, 'mcq', 'When was Muir''s theory proven correct?', 1.00, 5),
(@quiz10, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q10_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz10 AND position = 1);
SET @q10_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz10 AND position = 2);
SET @q10_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz10 AND position = 3);
SET @q10_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz10 AND position = 4);
SET @q10_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz10 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q10_1, '1892', 1, 1),
(@q10_1, '1908', 0, 2),
(@q10_1, '1906', 0, 3),
(@q10_1, '1938', 0, 4),
(@q10_2, '"Moor," a meadow full of flowers and animals', 1, 1),
(@q10_2, 'Mountain', 0, 2),
(@q10_2, 'Forest', 0, 3),
(@q10_2, 'Valley', 0, 4),
(@q10_3, 'A model of a sawmill and an alarm clock that tipped the sleeper out of bed', 1, 1),
(@q10_3, 'A walking trail', 0, 2),
(@q10_3, 'A type of tree', 0, 3),
(@q10_3, 'A national park', 0, 4),
(@q10_4, 'It was formed through the action of glaciers', 1, 1),
(@q10_4, 'It was formed by volcanic activity', 0, 2),
(@q10_4, 'It was formed by a river', 0, 3),
(@q10_4, 'It was formed by earthquakes', 0, 4),
(@q10_5, '1930', 1, 1),
(@q10_5, '1868', 0, 2),
(@q10_5, '1906', 0, 3),
(@q10_5, '1914', 0, 4);

-- =========================================================
-- Story 11: Using a Metal File
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  11,
  'Using a Metal File',
  'intermediate',
  "When using a metal file, always remember to bear down on the forward stroke only. On the return stroke, lift the file clear of the surface to avoid dulling the instrument's teeth. Only when working on very soft metals is it advisable to drag the file's teeth slightly on the return stroke. This helps clear out metal pieces from between the teeth.\n\nIt is best to bear down just hard enough to keep the file cutting at all times. Too little pressure uses only the tips of the teeth, while too much pressure can chip the teeth. Move the file in straight lines across the surface. Use a vise to grip the work so that your hands are free to hold the file. Protect your hands by equipping the file with a handle. Buy a wooden handle and install it by inserting the pointed end of the file into the handle hole.",
  'active', 1, 70.00
);
SET @quiz11 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz11, 'mcq', 'When should you bear down on the file?', 1.00, 1),
(@quiz11, 'mcq', 'Why should you lift the file on the return stroke?', 1.00, 2),
(@quiz11, 'mcq', 'When is it advisable to drag the file''s teeth on the return stroke?', 1.00, 3),
(@quiz11, 'mcq', 'What happens with too much pressure?', 1.00, 4),
(@quiz11, 'mcq', 'How should you move the file across the surface?', 1.00, 5),
(@quiz11, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q11_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz11 AND position = 1);
SET @q11_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz11 AND position = 2);
SET @q11_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz11 AND position = 3);
SET @q11_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz11 AND position = 4);
SET @q11_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz11 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q11_1, 'On the forward stroke only', 1, 1),
(@q11_1, 'On the return stroke only', 0, 2),
(@q11_1, 'On both strokes', 0, 3),
(@q11_1, 'Only when working on soft metals', 0, 4),
(@q11_2, 'To avoid dulling the instrument''s teeth', 1, 1),
(@q11_2, 'To clear out metal pieces', 0, 2),
(@q11_2, 'To apply more pressure', 0, 3),
(@q11_2, 'To protect your hands', 0, 4),
(@q11_3, 'Only when working on very soft metals', 1, 1),
(@q11_3, 'Always', 0, 2),
(@q11_3, 'Never', 0, 3),
(@q11_3, 'Only when the file is dull', 0, 4),
(@q11_4, 'It can chip the teeth', 1, 1),
(@q11_4, 'It uses only the tips of the teeth', 0, 2),
(@q11_4, 'It dulls the file', 0, 3),
(@q11_4, 'It clears out metal pieces', 0, 4),
(@q11_5, 'In straight lines across the surface', 1, 1),
(@q11_5, 'In circular motions', 0, 2),
(@q11_5, 'At an angle only', 0, 3),
(@q11_5, 'Back and forth quickly', 0, 4);

-- =========================================================
-- Story 12: The Life of Sojourner Truth
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  12,
  'The Life of Sojourner Truth',
  'intermediate',
  "\"Old woman,\" grumbled the burly white man who had just heard Sojourner Truth speak, \"do you think your talk about slavery does any good? I don't care any more for your talk than I do for the bite of a flea.\"\n\nThe tall, imposing black woman turned her piercing eyes on him. \"Perhaps not,\" she answered, \"but I'll keep you scratching.\"\n\nThe little incident of the 1840s sums up all that Sojourner Truth was: utterly dedicated to spreading her message, afraid of no one, and both forceful and witty in speech.\n\nYet 40 years earlier, who could have suspected that a spindly slave girl growing up in a damp cellar in upstate New York would become one of the most remarkable women in American history? Her name then was Isabella Baumfree, and by the time she was 14 years old she had seen both parents die of cold and hunger. She herself had been sold several times. By 1827, when New York freed its slaves, she had married and given birth to four children.\n\nThe first hint of Isabella's fighting spirit came soon afterwards, when her youngest son was illegally seized and sold. She marched to the courthouse and badgered officials until her son was returned to her.\n\nIn 1843, inspired by religion, she changed her name to Sojourner (meaning \"one who stays briefly\") Truth and, with only pennies in her purse, set out to preach against slavery. From New England to Minnesota she trekked, gaining a reputation for her plain but powerful and moving words. Incredibly, despite being black and female (only white males were expected to be public speakers), she drew thousands to town halls, tents, and churches to hear her powerful, deep-voiced pleas on equality for blacks-and for women. Often she had to face threatening hoodlums. Once she stood before armed bullies and sang a hymn to them. Awed by her courage and her commanding presence, they sheepishly retreated.\n\nDuring the Civil War, she cared for homeless ex-slaves in Washington, DC. President Lincoln invited her to the White House to bestow praise on her. Later, she petitioned Congress to help former slaves get land in the West. Even in her old age, she forced the city of Washington, DC to integrate its trolley cars so that black and white passengers could ride together.\n\nShortly before her death at the age of 86, she was asked what kept her going. \"I think of the great things,\" replied Sojourner.",
  'active', 1, 70.00
);
SET @quiz12 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz12, 'mcq', 'What was Sojourner Truth''s birth name?', 1.00, 1),
(@quiz12, 'mcq', 'When did New York free its slaves?', 1.00, 2),
(@quiz12, 'mcq', 'What happened when her youngest son was illegally seized and sold?', 1.00, 3),
(@quiz12, 'mcq', 'What does the name Sojourner mean?', 1.00, 4),
(@quiz12, 'mcq', 'Who invited Sojourner Truth to the White House?', 1.00, 5),
(@quiz12, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q12_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz12 AND position = 1);
SET @q12_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz12 AND position = 2);
SET @q12_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz12 AND position = 3);
SET @q12_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz12 AND position = 4);
SET @q12_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz12 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q12_1, 'Isabella Baumfree', 1, 1),
(@q12_1, 'Sojourner Truth', 0, 2),
(@q12_1, 'Isabella Truth', 0, 3),
(@q12_1, 'Sojourner Baumfree', 0, 4),
(@q12_2, '1827', 1, 1),
(@q12_2, '1843', 0, 2),
(@q12_2, '1865', 0, 3),
(@q12_2, '1820', 0, 4),
(@q12_3, 'She marched to the courthouse and badgered officials until her son was returned', 1, 1),
(@q12_3, 'She gave up and never saw him again', 0, 2),
(@q12_3, 'She hired a lawyer to sue', 0, 3),
(@q12_3, 'She appealed to the president', 0, 4),
(@q12_4, '"One who stays briefly"', 1, 1),
(@q12_4, '"One who speaks truth"', 0, 2),
(@q12_4, '"One who travels"', 0, 3),
(@q12_4, '"One who preaches"', 0, 4),
(@q12_5, 'President Lincoln', 1, 1),
(@q12_5, 'Congress', 0, 2),
(@q12_5, 'The governor of New York', 0, 3),
(@q12_5, 'A group of abolitionists', 0, 4);

-- =========================================================
-- Story 13: The Galapagos Islands
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  13,
  'The Galapagos Islands',
  'intermediate',
  "The Galapagos Islands are in the Pacific Ocean, off the western coast of South America. They are a rocky, lonely spot, but they are also one of the most unusual places in the world. One reason is that they are the home of some of the last giant tortoises left on earth.\n\nWeighing hundreds of pounds, these tortoises, or land turtles, wander slowly around the rocks and sand of the islands. Strangely, each of these islands has its own particular kinds of tortoises. There are seven different kinds of tortoises on the eight islands, each kind being slightly different from the other.\n\nHundreds of years ago, thousands of tortoises wandered around these islands. However, all that changed when people started landing there. When people first arrived in 1535, their ships had no refrigerators. This meant that fresh food was always a problem for the sailors on board. The giant tortoises provided an easy solution to this problem.\n\nShips would anchor off the islands, and crews would row ashore and seize as many tortoises as they could. Once the animals were aboard the ship, the sailors would roll the tortoises onto their backs. The tortoises were completely helpless once on their backs, so they could only lie there until used for soups and stews. Almost 100,000 tortoises were carried off in this way.\n\nThe tortoises faced other problems, too. Soon after the first ships, settlers arrived, bringing pigs, goats, donkeys, dogs and cats. All of these animals ruined life for the tortoises. Donkeys and goats ate all the plants that the tortoises usually fed on, while the pigs, dogs and cats consumed thousands of baby tortoises each year. Within a few years, it was hard to find any tortoise eggs-or even any baby tortoises.\n\nBy the early 1900s, people began to worry that the last of the tortoises would soon die out. No one, however, seemed to care enough to do anything about the problem. More and more tortoises disappeared, even though sailors no longer needed them for food. For another 50 years, this situation continued. Finally, in the 1950s, scientists decided that something must be done.\n\nThe first part of their plan was to remove as many cats, dogs and other animals as they could from the islands. Next, they tried to make sure that more baby tortoises would be born. To do this, they started looking for wild tortoise eggs. They gathered the eggs and put them in safe containers. When the eggs hatched, the scientists raised the tortoises in special pens. Both the eggs and tortoises were numbered so that the scientists knew exactly which kinds of tortoises they had and which island they came from. Once the tortoises were old enough and big enough to take care of themselves, the scientists took them back to their islands and set them loose. This slow, hard work continues today, and, thanks to it, the number of tortoises is now increasing every year. Perhaps these wonderful animals will not disappear after all.",
  'active', 1, 70.00
);
SET @quiz13 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz13, 'mcq', 'Where are the Galapagos Islands located?', 1.00, 1),
(@quiz13, 'mcq', 'When did people first arrive at the Galapagos Islands?', 1.00, 2),
(@quiz13, 'mcq', 'Why did sailors capture tortoises?', 1.00, 3),
(@quiz13, 'mcq', 'What did sailors do to make tortoises helpless aboard the ship?', 1.00, 4),
(@quiz13, 'mcq', 'What animals did settlers bring that harmed the tortoises?', 1.00, 5),
(@quiz13, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q13_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz13 AND position = 1);
SET @q13_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz13 AND position = 2);
SET @q13_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz13 AND position = 3);
SET @q13_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz13 AND position = 4);
SET @q13_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz13 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q13_1, 'In the Pacific Ocean, off the western coast of South America', 1, 1),
(@q13_1, 'In the Atlantic Ocean', 0, 2),
(@q13_1, 'Near the coast of Africa', 0, 3),
(@q13_1, 'In the Indian Ocean', 0, 4),
(@q13_2, '1535', 1, 1),
(@q13_2, '1900', 0, 2),
(@q13_2, '1950', 0, 3),
(@q13_2, '1800', 0, 4),
(@q13_3, 'They needed fresh food and ships had no refrigerators', 1, 1),
(@q13_3, 'They wanted pets', 0, 2),
(@q13_3, 'They were studying them', 0, 3),
(@q13_3, 'They wanted to protect them', 0, 4),
(@q13_4, 'Rolled them onto their backs', 1, 1),
(@q13_4, 'Tied them up with rope', 0, 2),
(@q13_4, 'Put them in cages', 0, 3),
(@q13_4, 'Starved them', 0, 4),
(@q13_5, 'Pigs, goats, donkeys, dogs and cats', 1, 1),
(@q13_5, 'Rats and mice only', 0, 2),
(@q13_5, 'Birds', 0, 3),
(@q13_5, 'Other tortoises', 0, 4);

-- =========================================================
-- Story 14: Game Instructions
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  14,
  'Game Instructions',
  'intermediate',
  "The first person in the group starts off by naming anything that is geographical. It could be a city, state, country, river, lake, or any proper geographical term. For example, the person might say, \"Boston.\" The second person has 10 seconds to think of how the word ends and come up with another geographical term starting with that letter.\n\nThe second participant might say, \"Norway,\" because the geographical term has to start with \"N.\" The third person would have to choose a word beginning with \"Y.\" If a player fails to think of a correct answer within the time limit, that player is out of the game. The last person to survive is the champion.",
  'active', 1, 70.00
);
SET @quiz14 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz14, 'mcq', 'What kind of terms can be used in this game?', 1.00, 1),
(@quiz14, 'mcq', 'What letter must each new word start with?', 1.00, 2),
(@quiz14, 'mcq', 'How much time does a player have to think of an answer?', 1.00, 3),
(@quiz14, 'mcq', 'What happens if a player fails to think of a correct answer within the time limit?', 1.00, 4),
(@quiz14, 'mcq', 'Who wins the game?', 1.00, 5),
(@quiz14, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q14_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz14 AND position = 1);
SET @q14_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz14 AND position = 2);
SET @q14_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz14 AND position = 3);
SET @q14_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz14 AND position = 4);
SET @q14_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz14 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q14_1, 'Geographical terms such as cities, states, countries, rivers, or lakes', 1, 1),
(@q14_1, 'Any word at all', 0, 2),
(@q14_1, 'Only country names', 0, 3),
(@q14_1, 'Only city names', 0, 4),
(@q14_2, 'The letter that the previous word ends with', 1, 1),
(@q14_2, 'Any letter the player chooses', 0, 2),
(@q14_2, 'The first letter of the previous word', 0, 3),
(@q14_2, 'The letter N', 0, 4),
(@q14_3, '10 seconds', 1, 1),
(@q14_3, '30 seconds', 0, 2),
(@q14_3, '1 minute', 0, 3),
(@q14_3, '5 seconds', 0, 4),
(@q14_4, 'That player is out of the game', 1, 1),
(@q14_4, 'That player gets another turn', 0, 2),
(@q14_4, 'The game starts over', 0, 3),
(@q14_4, 'That player gets a 5-second penalty', 0, 4),
(@q14_5, 'The last person to survive', 1, 1),
(@q14_5, 'The first person to answer correctly', 0, 2),
(@q14_5, 'The person who names the most places', 0, 3),
(@q14_5, 'The person who goes last', 0, 4);

-- =========================================================
-- Story 15: Charles Lindbergh
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  15,
  'Charles Lindbergh',
  'intermediate',
  "Charles A. Lindbergh is remembered as the first person to make a nonstop solo flight across the Atlantic, in 1927. This feat, performed when Lindbergh was only 25 years old, assured him a lifetime of fame and public attention.\n\nCharles Augustus Lindbergh was more interested in flying airplanes than he was in studying. He dropped out of the University of Wisconsin after two years to earn a living performing daredevil airplane stunts at county fairs. Two years later, he joined the United States Army so that he could go to the Army Air Service flight-training school. After completing his training, he was hired to fly mail between St. Louis and Chicago.\n\nThen came the historic flight across the Atlantic. In 1919, a New York City hotel owner offered a prize of $25,000 for the first pilot to fly nonstop from New York to Paris. Nine St. Louis business leaders helped pay for the plane Lindbergh designed especially for the flight. Lindbergh tested the plane by flying it from San Diego to New York, with an overnight stop in St. Louis. The flight took only 20 hours and 21 minutes, a transcontinental record.\n\nNine days later, on May 20, 1927, Lindbergh took off from Long Island, New York, at 7:52 a.m. He landed in Paris on May 21 at 10:21 p.m. He had flown more than 3,600 miles in less than 34 hours. His flight made news around the world. He was given awards and parades everywhere he went. He was presented with the US Congressional Medal of Honor and the first Distinguished Flying Cross. For a long time, Lindbergh toured the world as a US goodwill ambassador. He met his future wife, Anne Morrow, in Mexico, where her father was the United States ambassador.\n\nDuring the 1930s, Charles and Anne Lindbergh worked for various airline companies, charting new commercial air routes. In 1931, for a major airline, they charted a new route from the east coast of the United States to the Orient. The shortest, most efficient route was a great curve across Canada, over Alaska, and down to China and Japan. Most pilots familiar with the Arctic did not believe that such a route was possible. The Lindberghs took on the task of proving that it was. They arranged for fuel and supplies to be set out along the route. On July 29, they took off from Long Island in a specially equipped small seaplane. They flew by day and each night landed on a lake or a river and camped. Near Nome, Alaska, they had their first serious emergency. Out of daylight and nearly out of fuel, they were forced down into a small ocean inlet. In the next morning's light, they discovered they had landed on barely three feet of water. On September 19, after two more emergency landings and numerous close calls, they landed in China with the maps for a safe airline passenger route.\n\nEven while actively engaged as a pioneering flier, Lindbergh was also working as an engineer. In 1935, he and Dr. Alexis Carrel were given a patent for an artificial heart. During World War II in the 1940s, Lindbergh served as a civilian technical advisor in aviation. Although he was a civilian, he flew over 50 combat missions in the Pacific. In the 1950s, Lindbergh helped design the famous 747 jet airliner. In the late 1960s, he spoke widely on conservation issues. He died in August 1974, having lived through aviation history from the time of the first powered flight to the first steps on the moon and having influenced a big part of that history himself.",
  'active', 1, 70.00
);
SET @quiz15 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz15, 'mcq', 'What is Charles Lindbergh remembered for?', 1.00, 1),
(@quiz15, 'mcq', 'How old was Lindbergh when he made the historic Atlantic flight?', 1.00, 2),
(@quiz15, 'mcq', 'How much was the prize for the first pilot to fly nonstop from New York to Paris?', 1.00, 3),
(@quiz15, 'mcq', 'What awards did Lindbergh receive for his flight?', 1.00, 4),
(@quiz15, 'mcq', 'Where did Lindbergh meet his future wife Anne Morrow?', 1.00, 5),
(@quiz15, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q15_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz15 AND position = 1);
SET @q15_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz15 AND position = 2);
SET @q15_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz15 AND position = 3);
SET @q15_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz15 AND position = 4);
SET @q15_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz15 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q15_1, 'Being the first person to make a nonstop solo flight across the Atlantic in 1927', 1, 1),
(@q15_1, 'Designing the 747 jet airliner', 0, 2),
(@q15_1, 'Flying mail between St. Louis and Chicago', 0, 3),
(@q15_1, 'Inventing the artificial heart', 0, 4),
(@q15_2, '25 years old', 1, 1),
(@q15_2, '20 years old', 0, 2),
(@q15_2, '30 years old', 0, 3),
(@q15_2, '35 years old', 0, 4),
(@q15_3, '$25,000', 1, 1),
(@q15_3, '$50,000', 0, 2),
(@q15_3, '$10,000', 0, 3),
(@q15_3, '$100,000', 0, 4),
(@q15_4, 'The US Congressional Medal of Honor and the first Distinguished Flying Cross', 1, 1),
(@q15_4, 'The Nobel Prize', 0, 2),
(@q15_4, 'The Pulitzer Prize', 0, 3),
(@q15_4, 'The Presidential Medal of Freedom', 0, 4),
(@q15_5, 'In Mexico, where her father was the United States ambassador', 1, 1),
(@q15_5, 'In Paris after his flight', 0, 2),
(@q15_5, 'In St. Louis', 0, 3),
(@q15_5, 'In New York', 0, 4);

-- =========================================================
-- Story 16: Instructions (Reading Meter Dials)
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  16,
  'Reading Meter Dials',
  'intermediate',
  "Always read the meter dials from the right to the left. This procedure is much easier, especially if any of the dial hands are near the zero mark. If the meter has two dials, and one is smaller than the other, then it is not imperative to read the smaller dial because it only registers a small amount. Read the dial at the right first. As the dial turns clockwise, always record the figure the pointer has just passed. Read the next dial to the left and record the figure it has just passed. Continue recording the figures on the dials from right to left. When finished, mark off the number of units recorded. Dials on water and gas meters usually indicate the amount each dial records.",
  'active', 1, 70.00
);
SET @quiz16 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz16, 'mcq', 'In what direction should you read meter dials?', 1.00, 1),
(@quiz16, 'mcq', 'Why is reading from right to left easier?', 1.00, 2),
(@quiz16, 'mcq', 'If a meter has two dials and one is smaller, which dial is not imperative to read?', 1.00, 3),
(@quiz16, 'mcq', 'Which dial should you read first?', 1.00, 4),
(@quiz16, 'mcq', 'As the dial turns clockwise, what figure should you record?', 1.00, 5),
(@quiz16, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q16_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz16 AND position = 1);
SET @q16_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz16 AND position = 2);
SET @q16_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz16 AND position = 3);
SET @q16_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz16 AND position = 4);
SET @q16_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz16 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q16_1, 'From right to left', 1, 1),
(@q16_1, 'From left to right', 0, 2),
(@q16_1, 'From top to bottom', 0, 3),
(@q16_1, 'Clockwise', 0, 4),
(@q16_2, 'Especially if any of the dial hands are near the zero mark', 1, 1),
(@q16_2, 'Because it is faster', 0, 2),
(@q16_2, 'Because the smaller dial is on the right', 0, 3),
(@q16_2, 'Because water meters work differently', 0, 4),
(@q16_3, 'The smaller dial', 1, 1),
(@q16_3, 'The larger dial', 0, 2),
(@q16_3, 'The dial on the left', 0, 3),
(@q16_3, 'Both dials must always be read', 0, 4),
(@q16_4, 'The dial at the right', 1, 1),
(@q16_4, 'The dial at the left', 0, 2),
(@q16_4, 'The larger dial', 0, 3),
(@q16_4, 'The smaller dial', 0, 4),
(@q16_5, 'The figure the pointer has just passed', 1, 1),
(@q16_5, 'The figure the pointer is approaching', 0, 2),
(@q16_5, 'The figure closest to zero', 0, 3),
(@q16_5, 'The highest number on the dial', 0, 4);

-- =========================================================
-- Story 17: Vestmannaeyjar
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  17,
  'Vestmannaeyjar',
  'intermediate',
  "The village of Vestmannaeyjar, in the far northern country of Iceland, is as bright and clean and up-to-date as any American or Canadian suburb. It is located on the island of Heimaey, just off the mainland. One January night in 1973, however, householders were shocked from their sleep. In some backyards, red-hot liquid was spurting from the ground. Flaming \"skyrockets\" shot up and over the houses. The island's volcano, Helgafell, silent for 7,000 years, was violently erupting!\n\nLuckily, the island's fishing fleet was in port, and within 24 hours almost everyone was ferried to the mainland. But then the agony of the island began in earnest. As in a nightmare, fountains of burning lava spurted 300 feet high. Black, baseball-size cinders rained down. An evil-smelling, eye-burning, throat-searing cloud of smoke and gas erupted into the air, and a river of lava flowed down the mountain. The constant shriek of escaping steam was punctuated by ear-splitting explosions.\n\nAs time went on, the once pleasant village of Vestmannaeyjar took on a weird aspect. Its street lamps still burning against the long Arctic night, the town lay under a thick blanket of cinders. All that could be seen above the 10-foot black drifts were the tips of street signs. Some houses had collapsed under the weight of cinders, while others had burst into flames as the heat ignited their oil storage tanks. Lighting the whole lurid scene, fire continued to shoot from the mouth of the looming volcano.\n\nThe eruption continued for six months. Scientists and reporters arrived from around the world to observe the awesome natural event. But the town did not die that easily. In July, when the eruption ceased, the people of Heimaey Island returned to assess the chances of rebuilding their homes and lives. They found tons of ash covering the ground. The Icelanders are a tough people, however, accustomed to the strange and violent nature of their Arctic land. They dug out their homes. They even used the cinders to build new roads and airport runways. Now the new homes of Heimaey are warmed from water pipes heated by molten lava.",
  'active', 1, 70.00
);
SET @quiz17 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz17, 'mcq', 'Where is Vestmannaeyjar located?', 1.00, 1),
(@quiz17, 'mcq', 'When did the volcano erupt?', 1.00, 2),
(@quiz17, 'mcq', 'What is the name of the volcano?', 1.00, 3),
(@quiz17, 'mcq', 'How long had the volcano been silent before erupting?', 1.00, 4),
(@quiz17, 'mcq', 'How did most people escape the island?', 1.00, 5),
(@quiz17, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q17_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz17 AND position = 1);
SET @q17_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz17 AND position = 2);
SET @q17_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz17 AND position = 3);
SET @q17_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz17 AND position = 4);
SET @q17_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz17 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q17_1, 'On the island of Heimaey, just off the mainland of Iceland', 1, 1),
(@q17_1, 'On the mainland of Iceland', 0, 2),
(@q17_1, 'In Norway', 0, 3),
(@q17_1, 'In Greenland', 0, 4),
(@q17_2, 'January 1973', 1, 1),
(@q17_2, 'July 1973', 0, 2),
(@q17_2, 'January 1970', 0, 3),
(@q17_2, 'January 1980', 0, 4),
(@q17_3, 'Helgafell', 1, 1),
(@q17_3, 'Vestmannaeyjar', 0, 2),
(@q17_3, 'Heimaey', 0, 3),
(@q17_3, 'Iceland', 0, 4),
(@q17_4, '7,000 years', 1, 1),
(@q17_4, '700 years', 0, 2),
(@q17_4, '70 years', 0, 3),
(@q17_4, '7 years', 0, 4),
(@q17_5, 'The fishing fleet ferried them to the mainland within 24 hours', 1, 1),
(@q17_5, 'They flew away by helicopter', 0, 2),
(@q17_5, 'They built boats to escape', 0, 3),
(@q17_5, 'They waited for rescue ships', 0, 4);

-- =========================================================
-- Story 18: The Life of Frederick Douglass
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  18,
  'The Life of Frederick Douglass',
  'intermediate',
  "In 1841 a young man addressed an anti-slavery meeting in Massachusetts. He talked about what it was like to be separated from one's family as a child. He talked about being beaten and overworked. He talked about learning how to read and write in secret. He talked about what it was like to be a slave. Perhaps one of the reasons the listeners were so impressed with the speaker was because he had been a slave himself.\n\nFrederick Douglass was born into slavery in 1818 in Maryland. His last name was Bailey, the name of his mother. First he was separated from his mother, then his grandmother. He eventually was sent to work for a family named Auld. Sophia Auld taught Frederick how to read and write. By the time her husband stopped her, Frederick had learned enough to progress on his own. Later, Frederick worked for a man named Covey, who often beat him. One night Frederick resisted the beating and the two men fought for two hours. This was a dangerous thing for a slave to do, but Covey finally gave up. Frederick was never beaten again.\n\nIn 1836, Frederick and other slaves tried to escape. Someone betrayed them and the attempt failed. Shortly after that, Frederick met Anna Murray, a free black woman, and the two fell in love. In 1838, Frederick planned another escape, and this time he successfully reached New York City. He and Anna were married shortly thereafter. Frederick decided to change his last name to symbolize his new freedom. He took the name Douglass from a character in a book a friend of his was reading at the time.\n\nFrederick Douglass's presence was a tremendous boost to the anti-slavery movement. Anyone who had doubts about the morality or violence of slavery had only to listen to the articulate former slave describe his former life. After President Lincoln issued the Emancipation Proclamation in 1863, Douglass helped recruit black soldiers to fight for the Union in the Civil War. He died in 1895 after a long, full life.",
  'active', 1, 70.00
);
SET @quiz18 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz18, 'mcq', 'When and where was Frederick Douglass born?', 1.00, 1),
(@quiz18, 'mcq', 'What was Frederick''s original last name?', 1.00, 2),
(@quiz18, 'mcq', 'Who taught Frederick how to read and write?', 1.00, 3),
(@quiz18, 'mcq', 'What happened when Frederick resisted Covey''s beating?', 1.00, 4),
(@quiz18, 'mcq', 'When did Frederick successfully escape to freedom?', 1.00, 5),
(@quiz18, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q18_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz18 AND position = 1);
SET @q18_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz18 AND position = 2);
SET @q18_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz18 AND position = 3);
SET @q18_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz18 AND position = 4);
SET @q18_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz18 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q18_1, '1818 in Maryland', 1, 1),
(@q18_1, '1838 in New York', 0, 2),
(@q18_1, '1841 in Massachusetts', 0, 3),
(@q18_1, '1863 in Maryland', 0, 4),
(@q18_2, 'Bailey', 1, 1),
(@q18_2, 'Douglass', 0, 2),
(@q18_2, 'Auld', 0, 3),
(@q18_2, 'Covey', 0, 4),
(@q18_3, 'Sophia Auld', 1, 1),
(@q18_3, 'Anna Murray', 0, 2),
(@q18_3, 'His mother', 0, 3),
(@q18_3, 'His grandmother', 0, 4),
(@q18_4, 'They fought for two hours, Covey gave up, and Frederick was never beaten again', 1, 1),
(@q18_4, 'Frederick was severely punished', 0, 2),
(@q18_4, 'Frederick ran away immediately', 0, 3),
(@q18_4, 'Covey had Frederick arrested', 0, 4),
(@q18_5, '1838', 1, 1),
(@q18_5, '1836', 0, 2),
(@q18_5, '1841', 0, 3),
(@q18_5, '1863', 0, 4);

-- =========================================================
-- Story 19: What to Do When a Bone Breaks
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  19,
  'What to Do When a Bone Breaks',
  'intermediate',
  "First, be sure to keep the broken ends quiet. Keep the adjacent joints still. Should these joints bend, the muscles will act against the fractured bone and cause motion. Give the victim first aid for shock. Apply a sterile dressing to the fracture if it is compound. Do not try to push back a protruding bone. When you are splinting the fractured area, the end will slip back when the limb is straightened. An ice bag should be used with all fractures, sprains, and dislocations. A simple method of preventing motion of the fragments is to place the limb on pillows. Splints may also be used to keep the limb from moving. Breaks of the ribs or skull bone need no splints as they are held fast by other bones and tissue.",
  'active', 1, 70.00
);
SET @quiz19 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz19, 'mcq', 'Why should the adjacent joints be kept still when a bone is broken?', 1.00, 1),
(@quiz19, 'mcq', 'What should you apply to a compound fracture?', 1.00, 2),
(@quiz19, 'mcq', 'What should you NOT do with a protruding bone?', 1.00, 3),
(@quiz19, 'mcq', 'When will a protruding bone slip back into place?', 1.00, 4),
(@quiz19, 'mcq', 'What should be used with all fractures, sprains, and dislocations?', 1.00, 5),
(@quiz19, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q19_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz19 AND position = 1);
SET @q19_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz19 AND position = 2);
SET @q19_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz19 AND position = 3);
SET @q19_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz19 AND position = 4);
SET @q19_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz19 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q19_1, 'Because if the joints bend, the muscles will act against the fractured bone and cause motion', 1, 1),
(@q19_1, 'Because joints heal faster when still', 0, 2),
(@q19_1, 'Because the victim might be in shock', 0, 3),
(@q19_1, 'Because splints work better on still joints', 0, 4),
(@q19_2, 'A sterile dressing', 1, 1),
(@q19_2, 'An ice bag', 0, 2),
(@q19_2, 'A splint', 0, 3),
(@q19_2, 'Nothing special', 0, 4),
(@q19_3, 'Try to push it back', 1, 1),
(@q19_3, 'Apply a sterile dressing', 0, 2),
(@q19_3, 'Use an ice bag', 0, 3),
(@q19_3, 'Keep the limb still', 0, 4),
(@q19_4, 'When the limb is straightened during splinting', 1, 1),
(@q19_4, 'Immediately', 0, 2),
(@q19_4, 'After applying ice', 0, 3),
(@q19_4, 'Never', 0, 4),
(@q19_5, 'An ice bag', 1, 1),
(@q19_5, 'A sterile dressing', 0, 2),
(@q19_5, 'Pillows only', 0, 3),
(@q19_5, 'Heat', 0, 4);

-- =========================================================
-- Story 20: Wendy's Children
-- =========================================================
INSERT INTO reading_quizzes (quiz_number, title, difficulty, passage, status, is_locked, passing_score)
VALUES (
  20,
  'Wendy''s Children',
  'intermediate',
  "As Wendy Grant stepped off the plane in Denver, Colorado, seven children rushed to greet her shouting, \"Mother!\" Four of them spoke with a Vietnamese accent. In her arms Wendy held the gifts she had brought them-twin infant girls from Vietnam, the newest members of the Grant family. The Grants' six adopted Vietnamese children, and over 1,600 others like them, may well owe their lives to the determination of Wendy, her husband Duane, and a handful of other dedicated women and men.\n\nLike all wars, the war in Vietnam left thousands of children homeless. Their villages had been burned or blown to rubble. Their parents had been killed or lost amid the swarm of refugees clogging the dusty roads. The lucky children were taken in by orphanages. The rest were left to roam rural paths or city streets by themselves. They avoided starvation only by begging, stealing, or rummaging in garbage piles; they slept in gutters. Many were scarred or crippled by land mines, disease, or malnutrition.\n\nIt was in 1964 that the Grants, who had already adopted three American children, first heard of the plight of the Vietnamese orphans. Immediately they began the complicated task of adopting one-a girl, whom they named Diahan.\n\nBut soon Wendy realized that more must be done. Together with Duane and several other Americans, she founded an organization called Friends for All Children. The group located American homes for the war orphans and helped bring them to the United States. With the money they raised, they set up four orphanages in Vietnam.\n\nTwice Wendy went to Vietnam herself, despite the constant danger of enemy attack. Once she adopted and brought home a girl, Tia, so crippled by polio that she could not even stand. Today, thanks to American doctors, Tia walks unaided. On Wendy's final trip, with the enemy closing in on the capital city of Saigon, she remained until the last minute, arranging for orphans to be flown to the United States, Canada, and Australia. She narrowly missed a fatal plane crash.\n\nIf you someday meet a Vietnamese person with a last name such as Morris, Johnson, Riley, or Russo, remember Wendy Grant and her friends and their important work.",
  'active', 1, 70.00
);
SET @quiz20 = LAST_INSERT_ID();

INSERT INTO reading_questions (quiz_id, question_type, question_text, points, position) VALUES
(@quiz20, 'mcq', 'When did the Grants first hear of the plight of Vietnamese orphans?', 1.00, 1),
(@quiz20, 'mcq', 'What was the name of the first Vietnamese girl the Grants adopted?', 1.00, 2),
(@quiz20, 'mcq', 'What organization did Wendy found?', 1.00, 3),
(@quiz20, 'mcq', 'How many orphanages did Friends for All Children set up in Vietnam?', 1.00, 4),
(@quiz20, 'mcq', 'What was wrong with Tia when Wendy brought her home?', 1.00, 5),
(@quiz20, 'essay', 'Summarize the main idea or theme of the story in your own words.', 5.00, 6);

SET @q20_1 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz20 AND position = 1);
SET @q20_2 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz20 AND position = 2);
SET @q20_3 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz20 AND position = 3);
SET @q20_4 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz20 AND position = 4);
SET @q20_5 = (SELECT question_id FROM reading_questions WHERE quiz_id = @quiz20 AND position = 5);

INSERT INTO reading_mcq_options (question_id, option_text, is_correct, position) VALUES
(@q20_1, '1964', 1, 1),
(@q20_1, '1975', 0, 2),
(@q20_1, '1960', 0, 3),
(@q20_1, '1970', 0, 4),
(@q20_2, 'Diahan', 1, 1),
(@q20_2, 'Tia', 0, 2),
(@q20_2, 'Wendy', 0, 3),
(@q20_2, 'Diane', 0, 4),
(@q20_3, 'Friends for All Children', 1, 1),
(@q20_3, 'Friends of Vietnam', 0, 2),
(@q20_3, 'Grant Family Foundation', 0, 3),
(@q20_3, 'Vietnamese Orphans Fund', 0, 4),
(@q20_4, 'Four', 1, 1),
(@q20_4, 'Two', 0, 2),
(@q20_4, 'Six', 0, 3),
(@q20_4, 'Seven', 0, 4),
(@q20_5, 'She was crippled by polio and could not stand', 1, 1),
(@q20_5, 'She was malnourished', 0, 2),
(@q20_5, 'She was scarred by land mines', 0, 3),
(@q20_5, 'She was an infant', 0, 4);
