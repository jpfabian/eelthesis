const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "eel.c32myuyisk0v.ap-southeast-2.rds.amazonaws.com",
  user: "admin",
  password: "Thesiseel12345",
  database: "eeldb",
  port: 3306,
});

module.exports = pool;
