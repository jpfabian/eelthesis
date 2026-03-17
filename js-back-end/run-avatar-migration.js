const mysql = require("mysql2/promise");
require("dotenv").config();

const config = {
  host: process.env.DB_HOST || "eel.ctu0q8kog8ck.ap-southeast-2.rds.amazonaws.com",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "Thesiseel12345",
  database: process.env.DB_NAME || "eel_db",
  port: Number(process.env.DB_PORT || 3306),
};

async function run() {
  try {
    const conn = await mysql.createConnection(config);
    await conn.query(
      "ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512) NULL COMMENT 'Profile picture URL' AFTER updated_at"
    );
    console.log("Migration: avatar_url column added successfully");
    await conn.end();
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("Migration: avatar_url column already exists");
    } else {
      console.error("Migration error:", e.message);
      process.exit(1);
    }
  }
}
run();
