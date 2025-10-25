const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const path = require("path");
const loginRoutes = require("./login");
const signupRoutes = require("./signup");
const readingRoutes = require("./reading");
const pronunciationRoutes = require("./pronunciation");
const classesRoutes = require("./classes");
const lessonRoutes = require("./lesson");
const classgradeRoutes = require("./classgrade");
const examGenerated = require("./exam");
const recitation = require("./recitation");

// 1️⃣ Create Express app first
const app = express();

// 2️⃣ Middlewares
app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:5501"], credentials: true }));
app.use(bodyParser.json());

// 3️⃣ Serve frontend static files
app.use(express.static(path.join(__dirname, 'js-front-end')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'js-front-end', 'index.html'));
});

// 4️⃣ MySQL pool
const pool = mysql.createPool({
  host: "eel.c32myuyisk0v.ap-southeast-2.rds.amazonaws.com",
  user: "admin",
  password: "Thesiseel12345",
  database: "eeldb",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// 5️⃣ API routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/", loginRoutes);
app.use("/", signupRoutes);
app.use("/", classesRoutes);
app.use("/", readingRoutes);
app.use("/", pronunciationRoutes);
app.use("/", lessonRoutes);
app.use("/", classgradeRoutes);
app.use("/", examGenerated);
app.use("/", recitation);

// 6️⃣ Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
