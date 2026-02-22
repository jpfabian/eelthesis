-- Add students who have quiz attempts for class_id = 1 (ABM 11-A, PI9NLS6C) to student_classes
-- so they appear in the class roster. Uses names from users table.
-- Safe to run: only inserts if no row exists for (student_id, class_id).

INSERT INTO student_classes (student_id, student_fname, student_lname, class_id, status, joined_at)
SELECT a.student_id, u.fname, u.lname, 1, 'accepted', COALESCE(MIN(a.created_at), NOW())
FROM reading_quiz_attempts a
JOIN users u ON u.user_id = a.student_id
WHERE a.class_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM student_classes sc
    WHERE sc.student_id = a.student_id AND sc.class_id = 1
  )
GROUP BY a.student_id, u.fname, u.lname;
