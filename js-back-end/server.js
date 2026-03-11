const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const loginRoutes = require("./login");
const signupRoutes = require("./signup");
const readingRoutes = require("./reading");
const pronunciationRoutes = require("./pronunciation");
const classesRoutes = require("./classes");
const lessonRoutes = require("./lesson");
const classgradeRoutes = require("./classgrade");
const examGenerated = require("./exam");
const recitation = require("./recitation");
const { handleGenerateRecitationQuestions } = require("./recitation");
const adminRoutes = require("./admin");
const passwordResetRoutes = require("./password-reset");
const profileRoutes = require("./profile");
const teachersDashboardRoutes = require("./teachers-dashboard");
const { getTeachersDashboardStats } = require("./teachers-dashboard");

// 1️⃣ Create Express app first
const app = express();
let pool = null;

// 2️⃣ Middlewares — CORS: localhost (dev) + ALLOWED_ORIGINS for EC2 (e.g. http://your-ec2-ip:3000)
const allowedOriginsEnv = (process.env.ALLOWED_ORIGINS || "").trim().split(",").filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const isLocal =
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
    if (isLocal) return cb(null, true);
    if (allowedOriginsEnv.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(bodyParser.json());

const DB_CONFIG = {
  host: process.env.DB_HOST || "eel.ctu0q8kog8ck.ap-southeast-2.rds.amazonaws.com",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "Thesiseel12345",
  database: process.env.DB_NAME || "eel_db",
  port: Number(process.env.DB_PORT || 3306),
};

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, "database.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  const bootstrapConn = await mysql.createConnection({
    host: DB_CONFIG.host,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    port: DB_CONFIG.port,
    multipleStatements: true,
    connectTimeout: 10000,
  });

  try {
    // Create DB first so first-time setup works without manual SQL.
    await bootstrapConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await bootstrapConn.query(`USE \`${DB_CONFIG.database}\``);
    await bootstrapConn.query(schemaSql);
  } finally {
    await bootstrapConn.end();
  }

  pool = mysql.createPool({
    host: DB_CONFIG.host,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    database: DB_CONFIG.database,
    port: DB_CONFIG.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    dateStrings: ["DATE", "DATETIME"],
  });
}

app.use((req, res, next) => {
  if (!pool) return res.status(503).json({ error: "Database is not ready yet" });
  req.pool = pool;
  next();
});

// 5️⃣ API routes (before static so /api/* is never served as static files)
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'eel-backend' }));
app.get('/api/teachers-dashboard-stats', getTeachersDashboardStats);
app.post('/api/generate-recitation-questions', handleGenerateRecitationQuestions);

// Serve PDFs from uploads. Use UPLOADS_DIR env or path next to server.js.
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.warn('[uploads] Directory not found:', uploadsDir);
}

// Dedicated route for lesson PDFs: GET /api/lesson-pdf?path=Oral%20Communication/module1.pdf
app.get('/api/lesson-pdf', (req, res) => {
  const raw = req.query.path;
  if (!raw || typeof raw !== 'string') return res.status(400).send('Missing path');
  try {
    const decoded = decodeURIComponent(raw.trim());
    if (decoded.includes('..')) return res.status(400).send('Invalid path');
    const segments = decoded.split(/[/\\]/).filter(Boolean);
    const filePath = path.join(uploadsDir, ...segments);
    const resolved = path.resolve(filePath);
    const relative = path.relative(uploadsDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return res.status(400).send('Invalid path');
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return res.status(404).send('File not found');
    const ext = path.extname(resolved).toLowerCase();
    const contentType = ext === '.pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/pdf';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.sendFile(resolved, (err) => {
      if (err && !res.headersSent) res.status(500).send('Error');
    });
  } catch (e) {
    if (!res.headersSent) res.status(500).send('Error');
  }
});

function serveUploads(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const prefix = '/uploads/';
  const rawUrl = req.originalUrl || req.url || '';
  let fullPath = rawUrl.split('?')[0];
  fullPath = fullPath.replace(/\/+/g, '/');
  if (!fullPath.startsWith(prefix)) return false;
  const encodedSub = fullPath.slice(prefix.length).replace(/^\//, '');
  if (!encodedSub) return false;
  try {
    let decoded;
    try {
      decoded = decodeURIComponent(encodedSub);
    } catch (_) {
      decoded = encodedSub;
    }
    if (decoded.includes('..')) {
      res.status(400).send('Invalid path');
      return true;
    }
    const segments = decoded.split(/[/\\]/).filter(Boolean);
    const filePath = path.join(uploadsDir, ...segments);
    const resolved = path.resolve(filePath);
    const relative = path.relative(uploadsDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      res.status(400).send('Invalid path');
      return true;
    }
    let toSend = resolved;
    if (!fs.existsSync(resolved)) {
      const fallback = path.join(uploadsDir, decoded.replace(/\//g, path.sep));
      if (fs.existsSync(fallback)) toSend = path.resolve(fallback);
    }
    if (!fs.existsSync(toSend) || !fs.statSync(toSend).isFile()) {
      res.status(404).send('File not found');
      return true;
    }
    res.sendFile(toSend, (err) => {
      if (err && !res.headersSent) res.status(500).send('Error sending file');
    });
    return true;
  } catch (e) {
    if (!res.headersSent) res.status(500).send('Error');
    return true;
  }
}
app.use((req, res, next) => {
  if (serveUploads(req, res)) return;
  next();
});
app.use("/", recitation);
app.use("/", loginRoutes);
app.use("/", signupRoutes);
app.use("/", classesRoutes);
app.use("/", readingRoutes);
app.use("/", pronunciationRoutes);
app.use("/", lessonRoutes);
app.use("/", classgradeRoutes);
app.use("/", examGenerated);
app.use("/", adminRoutes);
app.use("/", passwordResetRoutes);
app.use("/", profileRoutes);
app.use("/", teachersDashboardRoutes);

// 6️⃣ Static files (after API so API takes precedence)
app.use('/images', express.static(path.join(__dirname, '../images')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js-front-end')));
app.use(express.static(path.join(__dirname, '../')));

// 7️⃣ Initialize DB and start server
const PORT = Number(process.env.PORT || 3000);
initializeDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🗄️  Database ready: ${DB_CONFIG.database}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to initialize database:", err?.message || err);
    process.exit(1);
  });
