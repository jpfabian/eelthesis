-- =========================================================
-- Pronunciation: Built-in Quizzes (Thematic Categories)
-- Run after database.sql. No subject_id; quizzes appear for all subjects.
--
-- Categories: alphabet, numbers, flowers, animals, colors, food, nature, family
--
-- NOTE: If you get "Duplicate entry" on (subject_id, quiz_number), you already
-- have pronunciation quizzes. Delete them first or skip this seed.
-- =========================================================

SET NAMES utf8mb4;

-- Make subject_id nullable (required before inserts; safe to run multiple times)
ALTER TABLE pronunciation_quizzes
  MODIFY subject_id INT UNSIGNED NULL DEFAULT NULL;

-- =========================================================
-- Category: Alphabet — Letters A to M
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  1,
  'Alphabet: Letters A to M',
  'beginner',
  'alphabet',
  'Practice pronouncing the letters of the alphabet clearly.',
  'active', 70.00
);
SET @quiz1 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz1, 'A', '/eɪ/', 1),
(@quiz1, 'B', '/biː/', 2),
(@quiz1, 'C', '/siː/', 3),
(@quiz1, 'D', '/diː/', 4),
(@quiz1, 'E', '/iː/', 5),
(@quiz1, 'F', '/ef/', 6),
(@quiz1, 'G', '/dʒiː/', 7),
(@quiz1, 'H', '/eɪtʃ/', 8),
(@quiz1, 'I', '/aɪ/', 9),
(@quiz1, 'J', '/dʒeɪ/', 10),
(@quiz1, 'K', '/keɪ/', 11),
(@quiz1, 'L', '/el/', 12),
(@quiz1, 'M', '/em/', 13);

-- =========================================================
-- Category: Alphabet — Letters N to Z
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  2,
  'Alphabet: Letters N to Z',
  'beginner',
  'alphabet',
  'Practice pronouncing the letters of the alphabet clearly.',
  'active', 70.00
);
SET @quiz2 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz2, 'N', '/en/', 1),
(@quiz2, 'O', '/əʊ/', 2),
(@quiz2, 'P', '/piː/', 3),
(@quiz2, 'Q', '/kjuː/', 4),
(@quiz2, 'R', '/ɑː/', 5),
(@quiz2, 'S', '/es/', 6),
(@quiz2, 'T', '/tiː/', 7),
(@quiz2, 'U', '/juː/', 8),
(@quiz2, 'V', '/viː/', 9),
(@quiz2, 'W', '/ˈdʌbljuː/', 10),
(@quiz2, 'X', '/eks/', 11),
(@quiz2, 'Y', '/waɪ/', 12),
(@quiz2, 'Z', '/zed/', 13);

-- =========================================================
-- Category: Numbers — One to Twenty
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  3,
  'Numbers: One to Twenty',
  'beginner',
  'numbers',
  'Practice pronouncing numbers from one to twenty.',
  'active', 70.00
);
SET @quiz3 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz3, 'one', '/wʌn/', 1),
(@quiz3, 'two', '/tuː/', 2),
(@quiz3, 'three', '/θriː/', 3),
(@quiz3, 'four', '/fɔː/', 4),
(@quiz3, 'five', '/faɪv/', 5),
(@quiz3, 'six', '/sɪks/', 6),
(@quiz3, 'seven', '/ˈsevn/', 7),
(@quiz3, 'eight', '/eɪt/', 8),
(@quiz3, 'nine', '/naɪn/', 9),
(@quiz3, 'ten', '/ten/', 10),
(@quiz3, 'eleven', '/ɪˈlevn/', 11),
(@quiz3, 'twelve', '/twelv/', 12),
(@quiz3, 'thirteen', '/ˌθɜːˈtiːn/', 13),
(@quiz3, 'fourteen', '/ˌfɔːˈtiːn/', 14),
(@quiz3, 'fifteen', '/ˌfɪfˈtiːn/', 15),
(@quiz3, 'sixteen', '/ˌsɪksˈtiːn/', 16),
(@quiz3, 'seventeen', '/ˌsevnˈtiːn/', 17),
(@quiz3, 'eighteen', '/ˌeɪˈtiːn/', 18),
(@quiz3, 'nineteen', '/ˌnaɪnˈtiːn/', 19),
(@quiz3, 'twenty', '/ˈtwenti/', 20);

-- =========================================================
-- Category: Numbers — Tens and Hundreds
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  4,
  'Numbers: Tens and Hundreds',
  'beginner',
  'numbers',
  'Practice pronouncing tens (thirty, forty) and hundreds. Watch the stress: thirteen vs thirty.',
  'active', 70.00
);
SET @quiz4 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz4, 'thirty', '/ˈθɜːti/', 1),
(@quiz4, 'forty', '/ˈfɔːti/', 2),
(@quiz4, 'fifty', '/ˈfɪfti/', 3),
(@quiz4, 'sixty', '/ˈsɪksti/', 4),
(@quiz4, 'seventy', '/ˈsevnti/', 5),
(@quiz4, 'eighty', '/ˈeɪti/', 6),
(@quiz4, 'ninety', '/ˈnaɪnti/', 7),
(@quiz4, 'hundred', '/ˈhʌndrəd/', 8),
(@quiz4, 'thousand', '/ˈθaʊznd/', 9),
(@quiz4, 'million', '/ˈmɪljən/', 10);

-- =========================================================
-- Category: Flowers — Common Flower Names
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  5,
  'Flowers: Common Names',
  'beginner',
  'flowers',
  'Practice pronouncing the names of common flowers.',
  'active', 70.00
);
SET @quiz5 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz5, 'rose', '/rəʊz/', 1),
(@quiz5, 'tulip', '/ˈtjuːlɪp/', 2),
(@quiz5, 'daisy', '/ˈdeɪzi/', 3),
(@quiz5, 'flower', '/ˈflaʊə/', 4),
(@quiz5, 'sunflower', '/ˈsʌnflaʊə/', 5),
(@quiz5, 'lily', '/ˈlɪli/', 6),
(@quiz5, 'orchid', '/ˈɔːkɪd/', 7),
(@quiz5, 'daffodil', '/ˈdæfədɪl/', 8),
(@quiz5, 'carnation', '/kɑːˈneɪʃn/', 9),
(@quiz5, 'jasmine', '/ˈdʒæzmɪn/', 10),
(@quiz5, 'lavender', '/ˈlævəndə/', 11),
(@quiz5, 'violet', '/ˈvaɪələt/', 12);

-- =========================================================
-- Category: Animals — Common Animals
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  6,
  'Animals: Common Names',
  'beginner',
  'animals',
  'Practice pronouncing the names of common animals.',
  'active', 70.00
);
SET @quiz6 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz6, 'cat', '/kæt/', 1),
(@quiz6, 'dog', '/dɒɡ/', 2),
(@quiz6, 'bird', '/bɜːd/', 3),
(@quiz6, 'fish', '/fɪʃ/', 4),
(@quiz6, 'horse', '/hɔːs/', 5),
(@quiz6, 'elephant', '/ˈelɪfənt/', 6),
(@quiz6, 'butterfly', '/ˈbʌtəflaɪ/', 7),
(@quiz6, 'rabbit', '/ˈræbɪt/', 8),
(@quiz6, 'tiger', '/ˈtaɪɡə/', 9),
(@quiz6, 'dolphin', '/ˈdɒlfɪn/', 10),
(@quiz6, 'monkey', '/ˈmʌŋki/', 11),
(@quiz6, 'lion', '/ˈlaɪən/', 12);

-- =========================================================
-- Category: Colors — Basic Colors
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  7,
  'Colors: Basic Names',
  'beginner',
  'colors',
  'Practice pronouncing color names.',
  'active', 70.00
);
SET @quiz7 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz7, 'red', '/red/', 1),
(@quiz7, 'blue', '/bluː/', 2),
(@quiz7, 'green', '/ɡriːn/', 3),
(@quiz7, 'yellow', '/ˈjeləʊ/', 4),
(@quiz7, 'orange', '/ˈɒrɪndʒ/', 5),
(@quiz7, 'purple', '/ˈpɜːpl/', 6),
(@quiz7, 'black', '/blæk/', 7),
(@quiz7, 'white', '/waɪt/', 8),
(@quiz7, 'brown', '/braʊn/', 9),
(@quiz7, 'pink', '/pɪŋk/', 10),
(@quiz7, 'gray', '/ɡreɪ/', 11),
(@quiz7, 'gold', '/ɡəʊld/', 12);

-- =========================================================
-- Category: Food — Fruits and Vegetables
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  8,
  'Food: Fruits and Vegetables',
  'beginner',
  'food',
  'Practice pronouncing the names of fruits and vegetables.',
  'active', 70.00
);
SET @quiz8 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz8, 'apple', '/ˈæpl/', 1),
(@quiz8, 'banana', '/bəˈnɑːnə/', 2),
(@quiz8, 'orange', '/ˈɒrɪndʒ/', 3),
(@quiz8, 'grape', '/ɡreɪp/', 4),
(@quiz8, 'mango', '/ˈmæŋɡəʊ/', 5),
(@quiz8, 'tomato', '/təˈmɑːtəʊ/', 6),
(@quiz8, 'potato', '/pəˈteɪtəʊ/', 7),
(@quiz8, 'carrot', '/ˈkærət/', 8),
(@quiz8, 'onion', '/ˈʌnjən/', 9),
(@quiz8, 'cabbage', '/ˈkæbɪdʒ/', 10),
(@quiz8, 'broccoli', '/ˈbrɒkəli/', 11),
(@quiz8, 'watermelon', '/ˈwɔːtəmelən/', 12);

-- =========================================================
-- Category: Food — Common Foods
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  9,
  'Food: Common Foods',
  'beginner',
  'food',
  'Practice pronouncing common food and drink names.',
  'active', 70.00
);
SET @quiz9 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz9, 'bread', '/bred/', 1),
(@quiz9, 'rice', '/raɪs/', 2),
(@quiz9, 'cheese', '/tʃiːz/', 3),
(@quiz9, 'chicken', '/ˈtʃɪkɪn/', 4),
(@quiz9, 'coffee', '/ˈkɒfi/', 5),
(@quiz9, 'water', '/ˈwɔːtə/', 6),
(@quiz9, 'milk', '/mɪlk/', 7),
(@quiz9, 'egg', '/eɡ/', 8),
(@quiz9, 'sugar', '/ˈʃʊɡə/', 9),
(@quiz9, 'salt', '/sɔːlt/', 10),
(@quiz9, 'honey', '/ˈhʌni/', 11),
(@quiz9, 'vegetable', '/ˈvedʒtəbl/', 12);

-- =========================================================
-- Category: Nature — Plants and Weather
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  10,
  'Nature: Plants and Weather',
  'beginner',
  'nature',
  'Practice pronouncing words related to nature, plants, and weather.',
  'active', 70.00
);
SET @quiz10 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz10, 'tree', '/triː/', 1),
(@quiz10, 'grass', '/ɡrɑːs/', 2),
(@quiz10, 'leaf', '/liːf/', 3),
(@quiz10, 'rain', '/reɪn/', 4),
(@quiz10, 'sun', '/sʌn/', 5),
(@quiz10, 'cloud', '/klaʊd/', 6),
(@quiz10, 'wind', '/wɪnd/', 7),
(@quiz10, 'snow', '/snəʊ/', 8),
(@quiz10, 'mountain', '/ˈmaʊntɪn/', 9),
(@quiz10, 'river', '/ˈrɪvə/', 10),
(@quiz10, 'ocean', '/ˈəʊʃn/', 11),
(@quiz10, 'forest', '/ˈfɒrɪst/', 12);

-- =========================================================
-- Category: Family — Family Members
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  11,
  'Family: Family Members',
  'beginner',
  'family',
  'Practice pronouncing the names of family members.',
  'active', 70.00
);
SET @quiz11 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz11, 'mother', '/ˈmʌðə/', 1),
(@quiz11, 'father', '/ˈfɑːðə/', 2),
(@quiz11, 'sister', '/ˈsɪstə/', 3),
(@quiz11, 'brother', '/ˈbrʌðə/', 4),
(@quiz11, 'grandmother', '/ˈɡrænmʌðə/', 5),
(@quiz11, 'grandfather', '/ˈɡrænfɑːðə/', 6),
(@quiz11, 'daughter', '/ˈdɔːtə/', 7),
(@quiz11, 'son', '/sʌn/', 8),
(@quiz11, 'aunt', '/ɑːnt/', 9),
(@quiz11, 'uncle', '/ˈʌŋkl/', 10),
(@quiz11, 'cousin', '/ˈkʌzn/', 11),
(@quiz11, 'family', '/ˈfæməli/', 12);

-- =========================================================
-- Category: Body — Body Parts
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  12,
  'Body: Body Parts',
  'beginner',
  'body',
  'Practice pronouncing the names of body parts.',
  'active', 70.00
);
SET @quiz12 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz12, 'head', '/hed/', 1),
(@quiz12, 'eye', '/aɪ/', 2),
(@quiz12, 'ear', '/ɪə/', 3),
(@quiz12, 'nose', '/nəʊz/', 4),
(@quiz12, 'mouth', '/maʊθ/', 5),
(@quiz12, 'hand', '/hænd/', 6),
(@quiz12, 'foot', '/fʊt/', 7),
(@quiz12, 'arm', '/ɑːm/', 8),
(@quiz12, 'leg', '/leɡ/', 9),
(@quiz12, 'finger', '/ˈfɪŋɡə/', 10),
(@quiz12, 'heart', '/hɑːt/', 11),
(@quiz12, 'face', '/feɪs/', 12);

-- =========================================================
-- Category: Home — Rooms and Objects
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  13,
  'Home: Rooms and Objects',
  'beginner',
  'home',
  'Practice pronouncing words for rooms and common objects at home.',
  'active', 70.00
);
SET @quiz13 = LAST_INSERT_ID();

INSERT INTO pronunciation_beginner_questions (quiz_id, word, correct_pronunciation, position) VALUES
(@quiz13, 'house', '/haʊs/', 1),
(@quiz13, 'room', '/ruːm/', 2),
(@quiz13, 'kitchen', '/ˈkɪtʃɪn/', 3),
(@quiz13, 'bedroom', '/ˈbedruːm/', 4),
(@quiz13, 'bathroom', '/ˈbɑːθruːm/', 5),
(@quiz13, 'table', '/ˈteɪbl/', 6),
(@quiz13, 'chair', '/tʃeə/', 7),
(@quiz13, 'door', '/dɔː/', 8),
(@quiz13, 'window', '/ˈwɪndəʊ/', 9),
(@quiz13, 'bed', '/bed/', 10),
(@quiz13, 'lamp', '/læmp/', 11),
(@quiz13, 'book', '/bʊk/', 12);

-- =========================================================
-- Category: Flowers — Intermediate: Word Stress
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  14,
  'Flowers: Word Stress',
  'intermediate',
  'flowers',
  'Practice word stress in flower names. Place emphasis on the correct syllable.',
  'active', 70.00
);
SET @quiz14 = LAST_INSERT_ID();

INSERT INTO pronunciation_intermediate_questions (quiz_id, word, stressed_syllable, position) VALUES
(@quiz14, 'sunflower', 'SUN-flow-er', 1),
(@quiz14, 'daffodil', 'DAF-fo-dil', 2),
(@quiz14, 'carnation', 'car-NA-tion', 3),
(@quiz14, 'lavender', 'LA-ven-der', 4),
(@quiz14, 'chrysanthemum', 'chry-SAN-the-mum', 5),
(@quiz14, 'geranium', 'ge-RA-ni-um', 6),
(@quiz14, 'hibiscus', 'hi-BIS-cus', 7),
(@quiz14, 'marigold', 'MA-ri-gold', 8),
(@quiz14, 'peony', 'PE-o-ny', 9),
(@quiz14, 'poppy', 'POP-py', 10);

-- =========================================================
-- Category: Animals — Intermediate: Word Stress
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  15,
  'Animals: Word Stress',
  'intermediate',
  'animals',
  'Practice word stress in animal names.',
  'active', 70.00
);
SET @quiz15 = LAST_INSERT_ID();

INSERT INTO pronunciation_intermediate_questions (quiz_id, word, stressed_syllable, position) VALUES
(@quiz15, 'elephant', 'E-le-phant', 1),
(@quiz15, 'butterfly', 'BU-tter-fly', 2),
(@quiz15, 'dolphin', 'DOL-phin', 3),
(@quiz15, 'crocodile', 'CRO-co-dile', 4),
(@quiz15, 'kangaroo', 'kan-ga-ROO', 5),
(@quiz15, 'octopus', 'OC-to-pus', 6),
(@quiz15, 'penguin', 'PEN-guin', 7),
(@quiz15, 'hippopotamus', 'hip-po-PO-ta-mus', 8),
(@quiz15, 'caterpillar', 'CA-ter-pil-lar', 9),
(@quiz15, 'hummingbird', 'HUM-ming-bird', 10);

-- =========================================================
-- Category: Numbers — Intermediate: Stress (Thirteen vs Thirty)
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  16,
  'Numbers: Thirteen vs Thirty',
  'intermediate',
  'numbers',
  'Practice the stress difference: thirteen (stress on -teen) vs thirty (stress on first syllable).',
  'active', 70.00
);
SET @quiz16 = LAST_INSERT_ID();

INSERT INTO pronunciation_intermediate_questions (quiz_id, word, stressed_syllable, position) VALUES
(@quiz16, 'thirteen', 'thir-TEEN', 1),
(@quiz16, 'thirty', 'THIR-ty', 2),
(@quiz16, 'fourteen', 'four-TEEN', 3),
(@quiz16, 'forty', 'FOR-ty', 4),
(@quiz16, 'fifteen', 'fif-TEEN', 5),
(@quiz16, 'fifty', 'FIF-ty', 6),
(@quiz16, 'sixteen', 'six-TEEN', 7),
(@quiz16, 'sixty', 'SIX-ty', 8),
(@quiz16, 'seventeen', 'seven-TEEN', 9),
(@quiz16, 'seventy', 'SE-ven-ty', 10);

-- =========================================================
-- Category: Food — Intermediate: Word Stress
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  17,
  'Food: Word Stress',
  'intermediate',
  'food',
  'Practice word stress in food names.',
  'active', 70.00
);
SET @quiz17 = LAST_INSERT_ID();

INSERT INTO pronunciation_intermediate_questions (quiz_id, word, stressed_syllable, position) VALUES
(@quiz17, 'banana', 'ba-NA-na', 1),
(@quiz17, 'tomato', 'to-MA-to', 2),
(@quiz17, 'potato', 'po-TA-to', 3),
(@quiz17, 'vegetable', 'VE-ge-ta-ble', 4),
(@quiz17, 'watermelon', 'WA-ter-mel-on', 5),
(@quiz17, 'broccoli', 'BRO-cco-li', 6),
(@quiz17, 'avocado', 'a-vo-CA-do', 7),
(@quiz17, 'chocolate', 'CHO-co-late', 8),
(@quiz17, 'spaghetti', 'spa-GHE-ti', 9),
(@quiz17, 'restaurant', 'RES-tau-rant', 10);

-- =========================================================
-- Category: Nature — Intermediate: Word Stress
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  18,
  'Nature: Word Stress',
  'intermediate',
  'nature',
  'Practice word stress in nature vocabulary.',
  'active', 70.00
);
SET @quiz18 = LAST_INSERT_ID();

INSERT INTO pronunciation_intermediate_questions (quiz_id, word, stressed_syllable, position) VALUES
(@quiz18, 'mountain', 'MOUN-tain', 1),
(@quiz18, 'ocean', 'O-cean', 2),
(@quiz18, 'forest', 'FO-rest', 3),
(@quiz18, 'volcano', 'vol-CA-no', 4),
(@quiz18, 'hurricane', 'HUR-ri-cane', 5),
(@quiz18, 'temperature', 'TEM-pe-ra-ture', 6),
(@quiz18, 'environment', 'en-VI-ron-ment', 7),
(@quiz18, 'photograph', 'PHO-to-graph', 8),
(@quiz18, 'photography', 'pho-TO-gra-phy', 9),
(@quiz18, 'beautiful', 'BEAU-ti-ful', 10);

-- =========================================================
-- Category: Family — Intermediate: Word Stress
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  19,
  'Family: Word Stress',
  'intermediate',
  'family',
  'Practice word stress in family vocabulary.',
  'active', 70.00
);
SET @quiz19 = LAST_INSERT_ID();

INSERT INTO pronunciation_intermediate_questions (quiz_id, word, stressed_syllable, position) VALUES
(@quiz19, 'grandmother', 'GRAND-mo-ther', 1),
(@quiz19, 'grandfather', 'GRAND-fa-ther', 2),
(@quiz19, 'daughter', 'DAUGH-ter', 3),
(@quiz19, 'family', 'FA-mi-ly', 4),
(@quiz19, 'wedding', 'WED-ding', 5),
(@quiz19, 'relationship', 're-LA-tion-ship', 6),
(@quiz19, 'generation', 'ge-ne-RA-tion', 7),
(@quiz19, 'grandchildren', 'GRAND-chil-dren', 8),
(@quiz19, 'grandparents', 'GRAND-pa-rents', 9),
(@quiz19, 'celebration', 'ce-le-BRA-tion', 10);

-- =========================================================
-- Category: Home — Intermediate: Word Stress
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  20,
  'Home: Word Stress',
  'intermediate',
  'home',
  'Practice word stress in home vocabulary.',
  'active', 70.00
);
SET @quiz20 = LAST_INSERT_ID();

INSERT INTO pronunciation_intermediate_questions (quiz_id, word, stressed_syllable, position) VALUES
(@quiz20, 'kitchen', 'KIT-chen', 1),
(@quiz20, 'bedroom', 'BED-room', 2),
(@quiz20, 'bathroom', 'BATH-room', 3),
(@quiz20, 'furniture', 'FUR-ni-ture', 4),
(@quiz20, 'television', 'te-le-VI-sion', 5),
(@quiz20, 'refrigerator', 're-FRI-ge-ra-tor', 6),
(@quiz20, 'apartment', 'a-PART-ment', 7),
(@quiz20, 'neighborhood', 'NEIGH-bor-hood', 8),
(@quiz20, 'restaurant', 'RES-tau-rant', 9),
(@quiz20, 'comfortable', 'COM-for-ta-ble', 10);

-- =========================================================
-- Category: Body — Intermediate: Word Stress
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  21,
  'Body: Word Stress',
  'intermediate',
  'body',
  'Practice word stress in body part names.',
  'active', 70.00
);
SET @quiz21 = LAST_INSERT_ID();

INSERT INTO pronunciation_intermediate_questions (quiz_id, word, stressed_syllable, position) VALUES
(@quiz21, 'finger', 'FIN-ger', 1),
(@quiz21, 'stomach', 'STO-mach', 2),
(@quiz21, 'shoulder', 'SHOUL-der', 3),
(@quiz21, 'elbow', 'EL-bow', 4),
(@quiz21, 'forehead', 'FORE-head', 5),
(@quiz21, 'eyebrow', 'EYE-brow', 6),
(@quiz21, 'skeleton', 'SKE-le-ton', 7),
(@quiz21, 'muscle', 'MUS-cle', 8),
(@quiz21, 'intestine', 'in-TES-tine', 9),
(@quiz21, 'appendix', 'ap-PEN-dix', 10);

-- =========================================================
-- Category: Colors — Intermediate: Word Stress
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  22,
  'Colors: Word Stress',
  'intermediate',
  'colors',
  'Practice word stress in color names and shades.',
  'active', 70.00
);
SET @quiz22 = LAST_INSERT_ID();

INSERT INTO pronunciation_intermediate_questions (quiz_id, word, stressed_syllable, position) VALUES
(@quiz22, 'yellow', 'YEL-low', 1),
(@quiz22, 'orange', 'O-range', 2),
(@quiz22, 'purple', 'PUR-ple', 3),
(@quiz22, 'turquoise', 'TUR-quoise', 4),
(@quiz22, 'lavender', 'LA-ven-der', 5),
(@quiz22, 'crimson', 'CRIM-son', 6),
(@quiz22, 'emerald', 'E-mer-ald', 7),
(@quiz22, 'sapphire', 'SAP-phire', 8),
(@quiz22, 'burgundy', 'BUR-gun-dy', 9),
(@quiz22, 'magenta', 'ma-GEN-ta', 10);

-- =========================================================
-- Category: Flowers — Advanced: Natural Speech
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  23,
  'Flowers: Natural Speech',
  'advanced',
  'flowers',
  'Practice saying these sentences with natural rhythm, linking, and reductions.',
  'active', 70.00
);
SET @quiz23 = LAST_INSERT_ID();

INSERT INTO pronunciation_advanced_questions (quiz_id, sentence, reduced_form, full_sentence, position) VALUES
(@quiz23, 'I am going to buy some flowers.', 'I''m gonna buy some flowers', 'I am going to buy some flowers.', 1),
(@quiz23, 'She loves roses and tulips.', 'She loves roses ''n tulips', 'She loves roses and tulips.', 2),
(@quiz23, 'The flowers are beautiful.', 'The flowers''re beautiful', 'The flowers are beautiful.', 3),
(@quiz23, 'I want to plant a garden.', 'I wanna plant a garden', 'I want to plant a garden.', 4),
(@quiz23, 'What kind of flowers do you like?', 'What kind of flowers d''you like?', 'What kind of flowers do you like?', 5),
(@quiz23, 'There is a sunflower in the yard.', 'There''s a sunflower in the yard', 'There is a sunflower in the yard.', 6),
(@quiz23, 'We have to water the plants.', 'We hafta water the plants', 'We have to water the plants.', 7),
(@quiz23, 'Could you give me that flower?', 'Couldja give me that flower?', 'Could you give me that flower?', 8),
(@quiz23, 'It is going to bloom soon.', 'It''s gonna bloom soon', 'It is going to bloom soon.', 9),
(@quiz23, 'Let me see the lavender.', 'Lemme see the lavender', 'Let me see the lavender.', 10);

-- =========================================================
-- Category: Animals — Advanced: Natural Speech
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  24,
  'Animals: Natural Speech',
  'advanced',
  'animals',
  'Practice saying these sentences with natural rhythm and reductions.',
  'active', 70.00
);
SET @quiz24 = LAST_INSERT_ID();

INSERT INTO pronunciation_advanced_questions (quiz_id, sentence, reduced_form, full_sentence, position) VALUES
(@quiz24, 'I have a cat and a dog.', 'I''ve got a cat ''n a dog', 'I have a cat and a dog.', 1),
(@quiz24, 'The elephant is very big.', 'The elephant''s very big', 'The elephant is very big.', 2),
(@quiz24, 'Did you see the butterfly?', 'Didja see the butterfly?', 'Did you see the butterfly?', 3),
(@quiz24, 'We are going to the zoo.', 'We''re gonna the zoo', 'We are going to the zoo.', 4),
(@quiz24, 'There are many birds here.', 'There''re many birds here', 'There are many birds here.', 5),
(@quiz24, 'I want to feed the fish.', 'I wanna feed the fish', 'I want to feed the fish.', 6),
(@quiz24, 'The dolphin is swimming.', 'The dolphin''s swimming', 'The dolphin is swimming.', 7),
(@quiz24, 'What kind of animal is that?', 'What kind of animal''s that?', 'What kind of animal is that?', 8),
(@quiz24, 'He has to take care of his horse.', 'He''s gotta take care of his horse', 'He has to take care of his horse.', 9),
(@quiz24, 'Let us watch the monkeys.', 'Let''s watch the monkeys', 'Let us watch the monkeys.', 10);

-- =========================================================
-- Category: Numbers — Advanced: Natural Speech
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  25,
  'Numbers: Natural Speech',
  'advanced',
  'numbers',
  'Practice saying numbers in natural phrases and sentences.',
  'active', 70.00
);
SET @quiz25 = LAST_INSERT_ID();

INSERT INTO pronunciation_advanced_questions (quiz_id, sentence, reduced_form, full_sentence, position) VALUES
(@quiz25, 'I have three apples.', 'I''ve got three apples', 'I have three apples.', 1),
(@quiz25, 'It is twenty past five.', 'It''s twenty past five', 'It is twenty past five.', 2),
(@quiz25, 'There are about a hundred people.', 'There''re about a hundred people', 'There are about a hundred people.', 3),
(@quiz25, 'She is fifteen years old.', 'She''s fifteen years old', 'She is fifteen years old.', 4),
(@quiz25, 'We need to wait for thirty minutes.', 'We need to wait for thirty minutes', 'We need to wait for thirty minutes.', 5),
(@quiz25, 'That will be fifty dollars.', 'That''ll be fifty dollars', 'That will be fifty dollars.', 6),
(@quiz25, 'I have been here for two hours.', 'I''ve been here for two hours', 'I have been here for two hours.', 7),
(@quiz25, 'Could you give me seven of those?', 'Couldja give me seven of those?', 'Could you give me seven of those?', 8),
(@quiz25, 'It is going to take a thousand years.', 'It''s gonna take a thousand years', 'It is going to take a thousand years.', 9),
(@quiz25, 'There are millions of stars.', 'There''re millions of stars', 'There are millions of stars.', 10);

-- =========================================================
-- Category: Food — Advanced: Natural Speech
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  26,
  'Food: Natural Speech',
  'advanced',
  'food',
  'Practice saying these food-related sentences naturally.',
  'active', 70.00
);
SET @quiz26 = LAST_INSERT_ID();

INSERT INTO pronunciation_advanced_questions (quiz_id, sentence, reduced_form, full_sentence, position) VALUES
(@quiz26, 'I would like some coffee.', 'I''d like some coffee', 'I would like some coffee.', 1),
(@quiz26, 'What do you want to eat?', 'What d''you wanna eat?', 'What do you want to eat?', 2),
(@quiz26, 'We have to go to the grocery store.', 'We gotta go to the grocery store', 'We have to go to the grocery store.', 3),
(@quiz26, 'There is no bread left.', 'There''s no bread left', 'There is no bread left.', 4),
(@quiz26, 'Could you pass the salt?', 'Couldja pass the salt?', 'Could you pass the salt?', 5),
(@quiz26, 'I am going to make dinner.', 'I''m gonna make dinner', 'I am going to make dinner.', 6),
(@quiz26, 'She does not like vegetables.', 'She doesn''t like vegetables', 'She does not like vegetables.', 7),
(@quiz26, 'Let me try that banana.', 'Lemme try that banana', 'Let me try that banana.', 8),
(@quiz26, 'It is time for breakfast.', 'It''s time for breakfast', 'It is time for breakfast.', 9),
(@quiz26, 'We are going to order pizza.', 'We''re gonna order pizza', 'We are going to order pizza.', 10);

-- =========================================================
-- Category: Family — Advanced: Natural Speech
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  27,
  'Family: Natural Speech',
  'advanced',
  'family',
  'Practice saying these family-related sentences naturally.',
  'active', 70.00
);
SET @quiz27 = LAST_INSERT_ID();

INSERT INTO pronunciation_advanced_questions (quiz_id, sentence, reduced_form, full_sentence, position) VALUES
(@quiz27, 'I am going to visit my grandmother.', 'I''m gonna visit my grandmother', 'I am going to visit my grandmother.', 1),
(@quiz27, 'She is my older sister.', 'She''s my older sister', 'She is my older sister.', 2),
(@quiz27, 'We have a big family.', 'We''ve got a big family', 'We have a big family.', 3),
(@quiz27, 'There are five people in my family.', 'There''re five people in my family', 'There are five people in my family.', 4),
(@quiz27, 'My father is a teacher.', 'My father''s a teacher', 'My father is a teacher.', 5),
(@quiz27, 'I want to call my brother.', 'I wanna call my brother', 'I want to call my brother.', 6),
(@quiz27, 'Let us have a family dinner.', 'Let''s have a family dinner', 'Let us have a family dinner.', 7),
(@quiz27, 'Could you give this to your aunt?', 'Couldja give this to your aunt?', 'Could you give this to your aunt?', 8),
(@quiz27, 'They are my grandparents.', 'They''re my grandparents', 'They are my grandparents.', 9),
(@quiz27, 'We are going to the wedding.', 'We''re gonna the wedding', 'We are going to the wedding.', 10);

-- =========================================================
-- Category: Nature — Advanced: Natural Speech
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  28,
  'Nature: Natural Speech',
  'advanced',
  'nature',
  'Practice saying these nature-related sentences naturally.',
  'active', 70.00
);
SET @quiz28 = LAST_INSERT_ID();

INSERT INTO pronunciation_advanced_questions (quiz_id, sentence, reduced_form, full_sentence, position) VALUES
(@quiz28, 'It is going to rain tomorrow.', 'It''s gonna rain tomorrow', 'It is going to rain tomorrow.', 1),
(@quiz28, 'The mountain is very tall.', 'The mountain''s very tall', 'The mountain is very tall.', 2),
(@quiz28, 'We have to protect the environment.', 'We gotta protect the environment', 'We have to protect the environment.', 3),
(@quiz28, 'There is a river in the forest.', 'There''s a river in the forest', 'There is a river in the forest.', 4),
(@quiz28, 'I want to go to the beach.', 'I wanna go to the beach', 'I want to go to the beach.', 5),
(@quiz28, 'The ocean is beautiful today.', 'The ocean''s beautiful today', 'The ocean is beautiful today.', 6),
(@quiz28, 'Let us take a photograph.', 'Let''s take a photograph', 'Let us take a photograph.', 7),
(@quiz28, 'Did you see the sunset?', 'Didja see the sunset?', 'Did you see the sunset?', 8),
(@quiz28, 'It is a beautiful day.', 'It''s a beautiful day', 'It is a beautiful day.', 9),
(@quiz28, 'We are going to climb the mountain.', 'We''re gonna climb the mountain', 'We are going to climb the mountain.', 10);

-- =========================================================
-- Category: Home — Advanced: Natural Speech
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  29,
  'Home: Natural Speech',
  'advanced',
  'home',
  'Practice saying these home-related sentences naturally.',
  'active', 70.00
);
SET @quiz29 = LAST_INSERT_ID();

INSERT INTO pronunciation_advanced_questions (quiz_id, sentence, reduced_form, full_sentence, position) VALUES
(@quiz29, 'I am going to clean the kitchen.', 'I''m gonna clean the kitchen', 'I am going to clean the kitchen.', 1),
(@quiz29, 'There is a lamp in the bedroom.', 'There''s a lamp in the bedroom', 'There is a lamp in the bedroom.', 2),
(@quiz29, 'We have to fix the refrigerator.', 'We gotta fix the refrigerator', 'We have to fix the refrigerator.', 3),
(@quiz29, 'Could you close the door?', 'Couldja close the door?', 'Could you close the door?', 4),
(@quiz29, 'She is in the bathroom.', 'She''s in the bathroom', 'She is in the bathroom.', 5),
(@quiz29, 'Let us buy new furniture.', 'Let''s buy new furniture', 'Let us buy new furniture.', 6),
(@quiz29, 'It is a comfortable house.', 'It''s a comfortable house', 'It is a comfortable house.', 7),
(@quiz29, 'I want to open the window.', 'I wanna open the window', 'I want to open the window.', 8),
(@quiz29, 'We are going to move to a new apartment.', 'We''re gonna move to a new apartment', 'We are going to move to a new apartment.', 9),
(@quiz29, 'There are many books on the table.', 'There''re many books on the table', 'There are many books on the table.', 10);

-- =========================================================
-- Category: Body — Advanced: Natural Speech
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  30,
  'Body: Natural Speech',
  'advanced',
  'body',
  'Practice saying these body-related sentences naturally.',
  'active', 70.00
);
SET @quiz30 = LAST_INSERT_ID();

INSERT INTO pronunciation_advanced_questions (quiz_id, sentence, reduced_form, full_sentence, position) VALUES
(@quiz30, 'I have a headache.', 'I''ve got a headache', 'I have a headache.', 1),
(@quiz30, 'My finger hurts.', 'My finger hurts', 'My finger hurts.', 2),
(@quiz30, 'She has to see a doctor.', 'She''s gotta see a doctor', 'She has to see a doctor.', 3),
(@quiz30, 'There is something in my eye.', 'There''s something in my eye', 'There is something in my eye.', 4),
(@quiz30, 'Could you wash your hands?', 'Couldja wash your hands?', 'Could you wash your hands?', 5),
(@quiz30, 'We need to exercise our muscles.', 'We need to exercise our muscles', 'We need to exercise our muscles.', 6),
(@quiz30, 'It is important to take care of your heart.', 'It''s important to take care of your heart', 'It is important to take care of your heart.', 7),
(@quiz30, 'Let me check your temperature.', 'Lemme check your temperature', 'Let me check your temperature.', 8),
(@quiz30, 'He broke his arm.', 'He broke his arm', 'He broke his arm.', 9),
(@quiz30, 'I am going to the hospital.', 'I''m gonna the hospital', 'I am going to the hospital.', 10);

-- =========================================================
-- Category: Colors — Advanced: Natural Speech
-- =========================================================
INSERT INTO pronunciation_quizzes (quiz_number, title, difficulty, category, passage, status, passing_score)
VALUES (
  31,
  'Colors: Natural Speech',
  'advanced',
  'colors',
  'Practice saying these color-related sentences naturally.',
  'active', 70.00
);
SET @quiz31 = LAST_INSERT_ID();

INSERT INTO pronunciation_advanced_questions (quiz_id, sentence, reduced_form, full_sentence, position) VALUES
(@quiz31, 'I like the blue one.', 'I like the blue one', 'I like the blue one.', 1),
(@quiz31, 'What color is it?', 'What color''s it?', 'What color is it?', 2),
(@quiz31, 'The sky is very blue today.', 'The sky''s very blue today', 'The sky is very blue today.', 3),
(@quiz31, 'She is wearing a red dress.', 'She''s wearing a red dress', 'She is wearing a red dress.', 4),
(@quiz31, 'We want to paint the wall green.', 'We wanna paint the wall green', 'We want to paint the wall green.', 5),
(@quiz31, 'There are many colors to choose from.', 'There''re many colors to choose from', 'There are many colors to choose from.', 6),
(@quiz31, 'Could you pass me the yellow one?', 'Couldja pass me the yellow one?', 'Could you pass me the yellow one?', 7),
(@quiz31, 'It is a beautiful purple flower.', 'It''s a beautiful purple flower', 'It is a beautiful purple flower.', 8),
(@quiz31, 'I am going to buy a black shirt.', 'I''m gonna buy a black shirt', 'I am going to buy a black shirt.', 9),
(@quiz31, 'The grass is green in spring.', 'The grass''s green in spring', 'The grass is green in spring.', 10);
