const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Explicitly load .env using absolute path
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Clean helper to strip surrounding quotes or whitespace
const sanitize = (val) => {
  if (!val) return '';
  let str = val.trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  return str;
};

// Serialize user ID into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-accessToken -refreshToken');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

const clientID = sanitize(process.env.GOOGLE_CLIENT_ID);
const clientSecret = sanitize(process.env.GOOGLE_CLIENT_SECRET);
const callbackURL = sanitize(process.env.GOOGLE_CALLBACK_URL) || 'http://localhost:5000/auth/google/callback';

if (!clientID || !clientSecret) {
  console.warn('[Google OAuth Warning] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in backend/.env.');
} else {
  try {
    passport.use(
      new GoogleStrategy(
        {
          clientID,
          clientSecret,
          callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email =
              profile.emails && profile.emails[0] ? profile.emails[0].value : '';
            const avatar =
              profile.photos && profile.photos[0] ? profile.photos[0].value : '';
            const displayName =
              profile.displayName ||
              `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() ||
              'Student';

            // Look up user by googleId
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
              // Update profile info & tokens
              user.displayName = displayName;
              user.email = email;
              user.avatar = avatar;
              user.accessToken = accessToken;
              if (refreshToken) {
                user.refreshToken = refreshToken;
              }
              await user.save();
              return done(null, user);
            }

            // Create new user record
            user = await User.create({
              googleId: profile.id,
              displayName,
              email,
              avatar,
              accessToken,
              refreshToken: refreshToken || '',
            });

            return done(null, user);
          } catch (error) {
            console.error('[Google OAuth Strategy Error]', error.message);
            return done(error, null);
          }
        }
      )
    );
    console.log('[Google OAuth] Passport Google Strategy registered successfully.');
  } catch (strategyErr) {
    console.error('[Google OAuth Strategy Registration Error]', strategyErr.message);
  }
}

module.exports = passport;
