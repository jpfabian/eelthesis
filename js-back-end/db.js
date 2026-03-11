const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "eel.ctu0q8kog8ck.ap-southeast-2.rds.amazonaws.com",
  user: "admin",
  password: "Thesiseel12345",
  database: "eel_db",
  port: 3306,
});

module.exports = pool;
