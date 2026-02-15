/* =========================================================
   Migration: Add section + strand to users (MySQL 5.7-safe)
   Run this ONCE on your existing database.
   ========================================================= */

SET @db := DATABASE();

/* Add section */
SET @has_section := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'section'
);
SET @sql_section := IF(
  @has_section = 0,
  "ALTER TABLE users ADD COLUMN section VARCHAR(50) NULL AFTER lname",
  "SELECT 1"
);
PREPARE stmt_section FROM @sql_section;
EXECUTE stmt_section;
DEALLOCATE PREPARE stmt_section;

/* Add strand */
SET @has_strand := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'strand'
);
SET @sql_strand := IF(
  @has_strand = 0,
  "ALTER TABLE users ADD COLUMN strand VARCHAR(80) NULL AFTER section",
  "SELECT 1"
);
PREPARE stmt_strand FROM @sql_strand;
EXECUTE stmt_strand;
DEALLOCATE PREPARE stmt_strand;

