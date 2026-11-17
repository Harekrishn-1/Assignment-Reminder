# AI Conversation Log — Assignment Reminder

This folder documents the prompts, technical discussions, and code scaffolding conducted with AI assistants during the 24-hour take-home assignment.

---

## Session 1: Project Scaffolding & Initial Architecture
* **User Prompt:** Create the basic project structure for Assignment Reminder (React + Vite, Node.js + Express, MongoDB Mongoose, `/api/health` endpoint, clean folder structure).
* **AI Output:** Scaffolds frontend (`frontend/`) and backend (`backend/`) folders, initializes Vite React app, writes basic Express server on port 5000 with CORS and Mongoose connection handlers, and basic `.gitignore`.
* **Outcome:** Clean separation of frontend and backend environments running independently on ports 5173 and 5000.

---

## Session 2: MongoDB Atlas Integration
* **User Prompt:** Connect Express backend to remote MongoDB Atlas cluster using Mongoose and `MONGO_URI` in `.env`.
* **AI Output:** Created `backend/config/db.js` with structured connection logging, error handling, and environment variable resolution using absolute paths.
* **Outcome:** Verified connected to Atlas cluster (`ac-nxubrlg-shard-00-01.wsljxyk.mongodb.net`, DB: `assignment_reminder`).

---

## Session 3: Google OAuth 2.0 Implementation
* **User Prompt:** Implement Google OAuth 2.0 login with Passport.js for student authentication, saving Google user ID, display name, and email in MongoDB.
* **AI Output:** Created `models/User.js`, `config/passport.js` using `passport-google-oauth20`, and `/auth` routes (`/auth/google`, `/auth/google/callback`, `/auth/me`, `/auth/logout`).
* **Debugging & Fixes:**
  - Resolved `dotenv` path loading issue (`path.resolve(__dirname, '.env')`).
  - Added safe diagnostics logging (true/false flags, never printing secret tokens).
  - Switched session storage to persistent `connect-mongo` so server restarts do not invalidate student login cookies.

---

## Session 4: Google Classroom API Integration
* **User Prompt:** Automatically fetch enrolled courses and coursework from Google Classroom API, parse due dates, and save them in MongoDB without duplicates.
* **AI Output:** 
  - Added read-only Classroom scopes: `https://www.googleapis.com/auth/classroom.courses.readonly` and `https://www.googleapis.com/auth/classroom.coursework.me.readonly`.
  - Built `services/classroomService.js` using `googleapis` package.
  - Implemented token auto-refresh listener on `tokens` event to keep OAuth access tokens valid.
  - Created compound unique index on `{ googleAssignmentId: 1, userId: 1 }` to guarantee no duplicate records in MongoDB.
* **Outcome:** Synced 11 real coursework items from MCA Pattern Recognition and Java Lab courses.

---

## Session 5: Upcoming Assignments Filter & Past Deadlines Handling
* **User Prompt:** The dashboard was displaying past assignments as upcoming. Fix filtering so only assignments with `dueDate >= now` appear under Upcoming Deadlines, while keeping past assignments safely stored in MongoDB.
* **AI Output:**
  - Updated `backend/routes/assignments.js` query logic: `upcoming` filtered by `dueDate: { $ne: null, $gte: now }` sorted by nearest deadline first; `pastAssignments` filtered by `dueDate: { $lt: now }`.
  - Updated frontend `Dashboard.jsx` with tabbed navigation: **⏰ Upcoming Deadlines** vs **📚 All Synced from Classroom**.

---

## Session 6: Automated 3-Hour Email Reminders & Duplicate Prevention
* **User Prompt:** Implement automated email reminders sent exactly 3 hours before assignment deadlines using Nodemailer Gmail SMTP and `node-cron`. Prevent duplicate emails and skip past deadlines.
* **AI Output:**
  - Created `services/emailService.js` with responsive HTML email template detailing course name, title, due date, and direct Google Classroom link.
  - Created `services/schedulerService.js` running every minute (`* * * * *`).
  - Implemented atomic lock: `Assignment.findOneAndUpdate({ _id: candidate._id, reminderStatus: { $in: ['SCHEDULED', 'FAILED'] }, reminderSent: false }, { $set: { reminderStatus: 'SENDING' } })`.
  - Updated assignment schema with reminder tracking fields (`reminderStatus`, `reminderTime`, `reminderSentAt`, `reminderError`).

---

## Session 7: OAuth Access & Browser Shield Debugging
* **User Issue:** Encountered `403 access_denied` and `404 v3/warning` during Google OAuth in Brave browser.
* **AI Assistance & Student Resolution:**
  - Identified that Google Cloud's new "Google Auth Platform" requires test users to be manually added under the **Audience** tab while the app is in Testing mode.
  - Identified that Brave Browser Shields blocked Google's telemetry/redirect tokens (`play.google.com/log`), breaking the OAuth redirect token.
  - Added `prompt: 'select_account consent'` to prevent Google multi-account session clashes.
  - Verified login succeeded once test user was added and Brave Shields were disabled for localhost.

---

## Session 8: Fieldwork Data Analysis & Short-Delay Test Mode
* **User Prompt:** Add safe temporary test mode to verify reminders in 1 minute without waiting 3 hours, while keeping production logic and real deadlines untouched. Also link `data.csv` to the tool.
* **AI Output:**
  - Added `services/surveyAnalyzer.js` and `npm run analyze` to parse, validate, and extract reminder threshold statistics from `data.csv`.
  - Added `REMINDER_TEST_MODE=true` and `REMINDER_TEST_DELAY_MINUTES=1` support.
  - Created UI controls in dashboard for 1-minute test reminder execution and atomic duplicate prevention verification.
