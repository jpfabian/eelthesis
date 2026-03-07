-- Store AI-generated topic presentation content so teacher and students see the same content.
-- Run: mysql -u USER -p DATABASE < js-back-end/migrations/add-topic-content.sql

ALTER TABLE topics ADD COLUMN topic_content LONGTEXT NULL COMMENT 'Cached AI-generated HTML presentation';
