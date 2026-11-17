const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const express = require('express');
const passport = require('passport');
const router = express.Router();

// Explicitly load .env using absolute path
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Clean helper
const sanitize = (val) => {
  if (!val) return '';
  let str = val.trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  return str;
};

// Check if credentials are set
const isGoogleAuthConfigured = () => {
  const clientID = sanitize(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = sanitize(process.env.GOOGLE_CLIENT_SECRET);
  return Boolean(clientID && clientSecret);
};

// Google OAuth Scopes including Google Classroom read-only scopes
const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
];

/**
 * GET /auth/google
 * Initiates the Google OAuth 2.0 flow with Google Classroom scopes
 */
router.get('/google', (req, res, next) => {
  if (!isGoogleAuthConfigured()) {
    return res.status(503).json({
      error: 'Google OAuth is not configured yet. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env',
    });
  }

  const clientID = sanitize(process.env.GOOGLE_CLIENT_ID);
  const callbackURL = sanitize(process.env.GOOGLE_CALLBACK_URL) || 'http://localhost:5000/auth/google/callback';

  // Safe Diagnostic Logging (non-sensitive details only)
  const isRealFormat = /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientID);
  console.log('\n--- Outgoing Google OAuth Request ---');
  console.log(`[OAuth Diagnostic] Client ID Present: true (length: ${clientID.length})`);
  console.log(`[OAuth Diagnostic] Client ID Suffix: ${clientID.endsWith('.apps.googleusercontent.com') ? '.apps.googleusercontent.com' : 'non-standard'}`);
  console.log(`[OAuth Diagnostic] Client ID Real Google Project Format: ${isRealFormat ? 'YES' : 'NO (Placeholder detected)'}`);
  console.log(`[OAuth Diagnostic] Redirect URI (Callback): ${callbackURL}`);
  console.log(`[OAuth Diagnostic] Response Type: code`);
  console.log(`[OAuth Diagnostic] Scopes: ${GOOGLE_SCOPES.join(', ')}`);
  console.log(`[OAuth Diagnostic] Access Type: offline`);
  console.log(`[OAuth Diagnostic] Prompt: select_account consent`);

  if (!isRealFormat) {
    console.warn('\n[OAuth Notice] Your GOOGLE_CLIENT_ID appears to be a placeholder ("your_google_client_id_here...").');
    console.warn('Google Cloud requires a registered OAuth Client ID in the format: <project-number>-<hash>.apps.googleusercontent.com');
    console.warn('Without a real Google Cloud Client ID, Google returns: "400 Bad Request — The server cannot process the request because it is malformed"\n');
  }
  console.log('-------------------------------------\n');

  // Trigger Passport Google Authentication
  passport.authenticate('google', {
    scope: GOOGLE_SCOPES,
    accessType: 'offline', // Requests refresh token for background reminder sync
    prompt: 'select_account consent', // Forces account selector to prevent multi-account authuser=1 session collisions
    includeGrantedScopes: true,
  })(req, res, next);
});

/**
 * GET /auth/google/callback
 * Handles the OAuth 2.0 redirect from Google
 */
router.get(
  '/google/callback',
  (req, res, next) => {
    if (!isGoogleAuthConfigured()) {
      return res.redirect(`${FRONTEND_URL}/?error=oauth_not_configured`);
    }

    passport.authenticate('google', {
      failureRedirect: `${FRONTEND_URL}/?error=auth_failed`,
      session: true,
    })(req, res, next);
  },
  (req, res) => {
    // Successful authentication, redirect to frontend dashboard
    res.redirect(`${FRONTEND_URL}/`);
  }
);

/**
 * GET /auth/me
 * Returns the currently authenticated user's profile
 */
router.get('/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return res.status(200).json({
      isAuthenticated: true,
      user: {
        id: req.user._id,
        googleId: req.user.googleId,
        displayName: req.user.displayName,
        email: req.user.email,
        avatar: req.user.avatar,
      },
    });
  }

  return res.status(200).json({
    isAuthenticated: false,
    user: null,
  });
});

/**
 * POST /auth/logout
 * Destroys session and clears cookie
 */
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out' });
    }

    if (req.session) {
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          return res.status(500).json({ error: 'Failed to clear session' });
        }
        res.clearCookie('connect.sid');
        return res.status(200).json({ message: 'Logged out successfully' });
      });
    } else {
      res.clearCookie('connect.sid');
      return res.status(200).json({ message: 'Logged out successfully' });
    }
  });
});

module.exports = router;
