const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");

const loginRoutes = require("./login");
const signupRoutes = require("./signup");
const readingRoutes = require("./reading");
const pronunciationRoutes = require("./pronunciation");
const classesRoutes = require("./classes");
const lessonRoutes = require("./lesson");
const classgradeRoutes = require("./classgrade");
const examGenerated = require("./exam")
const recitation = require("./recitation")
const path = require("path");

const app = express();
app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:5501"], credentials: true }));
app.use(bodyParser.json());

// Create MySQL pool
const pool = mysql.createPool({
  host: "eel.c32myuyisk0v.ap-southeast-2.rds.amazonaws.com",
  user: "admin",
  password: "Thesiseel12345",
  database: "eeldb",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // ✅ valid
});

app.use((req, res, next) => {
  req.pool = pool;
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// login
app.use("/", loginRoutes);
// signup
app.use("/", signupRoutes);
// classes
app.use("/", classesRoutes);
// reading
app.use("/", readingRoutes);
// pronunciation
app.use("/", pronunciationRoutes);
// lessons
app.use("/", lessonRoutes);
// class grades
app.use("/", classgradeRoutes);
// exam generated
app.use("/", examGenerated);
// recitation
app.use("", recitation)


// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
