/* =========================================================
   Migration: Insert default admin account
   Run this ONCE on your database.
   Username: eelteam.2026@gmail.com
   Password: admin123
   ========================================================= */

INSERT INTO users (
  fname,
  lname,
  email,
  password,
  role,
  verification_status
) VALUES (
  'EEL',
  'Admin',
  'eelteam.2026@gmail.com',
  '$2b$10$O12gxObW.BPZtvNB0ce15.lKZy7z/AyAN4WH6F3IjbO/YuUonTNwu',
  'admin',
  'approved'
)
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = 'admin',
  verification_status = 'approved';
