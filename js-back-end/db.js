const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "eeldatabse.cnuayk8m8zwm.ap-southeast-1.rds.amazonaws.com",
  user: "admin",
  password: "Thesiseel12345",
  database: "eel_db",
  port: 3306,
});

module.exports = pool;
