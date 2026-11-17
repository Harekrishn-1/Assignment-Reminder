const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 1. Explicitly load backend/.env using absolute path BEFORE any other imports
const envPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

// 2. Safe Diagnostics Logging (True/False only - never credentials)
console.log('\n--- Environment & OAuth Diagnostics ---');
console.log(`[Config] Resolved .env path: ${envPath}`);
console.log(`[Config] .env file exists: ${fs.existsSync(envPath)}`);
console.log(`[Config] GOOGLE_CLIENT_ID loaded: ${Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim().length > 0)}`);
console.log(`[Config] GOOGLE_CLIENT_SECRET loaded: ${Boolean(process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.trim().length > 0)}`);
console.log(`[Config] GOOGLE_CALLBACK_URL: ${process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback'}`);
console.log(`[Config] MONGO_URI loaded: ${Boolean(process.env.MONGO_URI && process.env.MONGO_URI.trim().length > 0)}`);
console.log(`[Config] SESSION_SECRET loaded: ${Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length > 0)}`);
console.log('----------------------------------------\n');

// 3. Import Express and remaining modules after dotenv is guaranteed to be loaded
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const assignmentRoutes = require('./routes/assignments');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Connect to MongoDB Atlas
connectDB();

// CORS configuration (allow cookies from frontend)
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

// Session middleware using HTTP-only cookies
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'assignment_reminder_session_secret_key_123',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevents client-side script access
      secure: process.env.NODE_ENV === 'production', // true in HTTPS production
      sameSite: 'lax', // Required for OAuth redirects and CSRF mitigation
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Mount Routes
app.use('/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const isOauthConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID.trim().length > 0 &&
    process.env.GOOGLE_CLIENT_SECRET.trim().length > 0
  );

  res.status(200).json({
    status: 'Server is running',
    database: isDbConnected ? 'connected' : 'disconnected',
    oauthConfigured: isOauthConfigured,
  });
});

app.get('/', (req, res) => {
  res.send('Assignment Reminder API is running. Check /api/health for status.');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Google OAuth route: http://localhost:${PORT}/auth/google`);
  console.log(`Classroom sync route: http://localhost:${PORT}/api/assignments/sync`);
});
