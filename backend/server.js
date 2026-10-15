require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const connectDatabase = require('./config/database');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------- CORS: only the authorised frontend may call this API ---------- */
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const localhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = curl / Postman / server-to-server (not a browser).
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Local development convenience, only when FRONTEND_URL is not configured.
      if (allowedOrigins.length === 0 && localhost.test(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  })
);

app.use(helmet());
app.use(express.json({ limit: '10kb' }));

/* ---------- Health check (used by Render and by the frontend) ---------- */
app.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    database: dbUp ? 'connected' : 'disconnected'
  });
});

app.get('/', (req, res) =>
  res.json({ service: 'Student Information Management API', endpoints: '/api/students' })
);

/* ---------- Reject API calls while the database is unreachable ---------- */
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res
      .status(503)
      .json({ success: false, message: 'Database temporarily unavailable. Please try again.' });
  }
  next();
});

app.use('/api/students', studentRoutes);

/* ---------- 404 ---------- */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

/* ---------- Central error handler: no stack traces or secrets leak out ---------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: errors.join('. '), errors });
  }
  if (err.code === 11000) {
    return res
      .status(409)
      .json({ success: false, message: 'A student with this Student ID already exists' });
  }
  if (err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Origin not allowed' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

/* ---------- Start: listen first so Render sees the port, then connect ---------- */
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));

connectDatabase().catch((err) => {
  console.error('Initial database connection failed:', err.message);
  process.exit(1); // Render restarts the service; avoids running half-broken
});
