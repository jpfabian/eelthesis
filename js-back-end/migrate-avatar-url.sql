-- Add avatar_url column to users table for profile pictures (S3)
-- Run once: mysql -u admin -p eel_db < migrate-avatar-url.sql

ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512) NULL COMMENT 'Profile picture URL (e.g. S3)' AFTER updated_at;
