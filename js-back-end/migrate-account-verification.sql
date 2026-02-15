/* =========================================================
   Migration: Account verification columns for `users`
   Run this ONCE on your existing database.
   ========================================================= */

/* MySQL 5.7-safe: conditionally add columns via dynamic SQL */
SET @db := DATABASE();

SET @has_verification_status := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_status'
);
SET @sql := IF(
  @has_verification_status = 0,
  "ALTER TABLE users ADD COLUMN verification_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER role",
  "SELECT 1"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_verified_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verified_at'
);
SET @sql := IF(@has_verified_at = 0, "ALTER TABLE users ADD COLUMN verified_at TIMESTAMP NULL DEFAULT NULL AFTER verification_status", "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_verified_by := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verified_by'
);
SET @sql := IF(@has_verified_by = 0, "ALTER TABLE users ADD COLUMN verified_by VARCHAR(100) NULL AFTER verified_at", "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_rejected_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'rejected_at'
);
SET @sql := IF(@has_rejected_at = 0, "ALTER TABLE users ADD COLUMN rejected_at TIMESTAMP NULL DEFAULT NULL AFTER verified_by", "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_rejected_reason := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'rejected_reason'
);
SET @sql := IF(@has_rejected_reason = 0, "ALTER TABLE users ADD COLUMN rejected_reason VARCHAR(255) NULL AFTER rejected_at", "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Add index if missing */
SET @has_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_verification_status'
);
SET @sql := IF(@has_idx = 0, "ALTER TABLE users ADD INDEX idx_users_verification_status (verification_status)", "SELECT 1");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Optional: mark existing users as approved (if you already have active accounts) */
UPDATE users
SET verification_status = 'approved'
WHERE verification_status = 'pending';

