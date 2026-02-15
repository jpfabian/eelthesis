/* =========================================================
   Migration: Add is_active + deactivation fields to users
   MySQL 5.7-safe (dynamic SQL)
   Run this ONCE on your existing database.
   ========================================================= */

SET @db := DATABASE();

/* is_active */
SET @has_is_active := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_active'
);
SET @sql_is_active := IF(
  @has_is_active = 0,
  "ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role",
  "SELECT 1"
);
PREPARE stmt_is_active FROM @sql_is_active;
EXECUTE stmt_is_active;
DEALLOCATE PREPARE stmt_is_active;

/* deactivated_at */
SET @has_deactivated_at := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deactivated_at'
);
SET @sql_deactivated_at := IF(
  @has_deactivated_at = 0,
  "ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMP NULL DEFAULT NULL AFTER is_active",
  "SELECT 1"
);
PREPARE stmt_deactivated_at FROM @sql_deactivated_at;
EXECUTE stmt_deactivated_at;
DEALLOCATE PREPARE stmt_deactivated_at;

/* deactivated_by */
SET @has_deactivated_by := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deactivated_by'
);
SET @sql_deactivated_by := IF(
  @has_deactivated_by = 0,
  "ALTER TABLE users ADD COLUMN deactivated_by VARCHAR(100) NULL AFTER deactivated_at",
  "SELECT 1"
);
PREPARE stmt_deactivated_by FROM @sql_deactivated_by;
EXECUTE stmt_deactivated_by;
DEALLOCATE PREPARE stmt_deactivated_by;

/* deactivated_reason */
SET @has_deactivated_reason := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deactivated_reason'
);
SET @sql_deactivated_reason := IF(
  @has_deactivated_reason = 0,
  "ALTER TABLE users ADD COLUMN deactivated_reason VARCHAR(255) NULL AFTER deactivated_by",
  "SELECT 1"
);
PREPARE stmt_deactivated_reason FROM @sql_deactivated_reason;
EXECUTE stmt_deactivated_reason;
DEALLOCATE PREPARE stmt_deactivated_reason;

