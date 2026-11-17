# Assignment Reminder

An automated web application that fetches assignments and their due dates from Google Classroom and sends students additional email reminders before their deadlines.

**Project Goal:** Help students avoid forgetting assignments by sending automatic reminders 3 hours before the submission deadline.

**Project Scope:** This application focuses only on assignment reminders. It does not track assignment submissions, calculate marks, or manage grading.

---

## 📌 Context & Fieldwork Details

* **Place:** Hostel K, National Institute of Technology (NIT) Jamshedpur
* **Person:** Ankit (1st Year MCA Student, NIT Jamshedpur)
* **Date:** 17–18 November 2026
* **The Problem:** In the hostel, professors post assignments on Google Classroom with tight 24-hour deadlines (typically due at 11:59 PM). Students see the initial notification, get busy or distracted, and remember only after the deadline has passed. Ankit shared: *"We start working when 2–3 hours are left. If someone or something alerts us at 9:00 PM without us having to manually type alarms, we will never miss a submission."*

---

## 📹 Screen Recording
* **[Watch 3-Minute Walkthrough Video (Google Drive)](https://drive.google.com/file/d/1t-B02t1USnJqTlbOlHnK2BXQDWUmFbrh/view?usp=sharing)** *(Explains the real student problem at Hostel K, the initial to-do app idea vs. shifting to automated Classroom sync after discussing with Ankit, fieldwork survey analysis, and live automated email reminder demonstration)*

---

## 1. Features

### Google Authentication
- Sign in using Google OAuth 2.0.
- Secure authentication using Passport.js and persistent MongoDB session storage (`connect-mongo`).
- Access Google Classroom using read-only permissions.

### Google Classroom Integration
- Automatically fetch enrolled courses.
- Fetch assignments and their due dates.
- Display assignment title, course name, deadline, and direct Classroom link.
- Store assignments in MongoDB.
- Avoid duplicate assignments during synchronization via compound unique index.

### Automatic Email Reminders
- Automatically send email reminders 3 hours before assignment deadlines.
- Use Nodemailer with Gmail SMTP.
- Run a background scheduler using node-cron.
- Check pending reminders every minute.
- Display reminder status on the dashboard (`SCHEDULED`, `SENDING`, `SENT`, `FAILED`).
- Prevent duplicate emails using atomic MongoDB operations (`findOneAndUpdate`).
- Skip assignments with past deadlines or assignments discovered after their reminder time.

### Short-Delay Test Mode
The application supports short-delay testing to demonstrate automatic email reminders without waiting 3 hours:
- 1-minute reminder
- 2-minute reminder
- 5-minute reminder

Additional features:
- Create temporary test assignments.
- Run the reminder scheduler manually (`⚡ Run Reminder Check Now`).
- Verify email delivery.
- Check duplicate-email prevention.
- Clear test assignments after testing (`🗑️ Clear Test`).

Test assignments do not modify actual Google Classroom deadlines.

### Dashboard
- View upcoming assignments.
- Synchronize assignments with Google Classroom.
- View countdowns until assignment deadlines.
- Check reminder statuses.
- Send a test email.
- Create and clear test assignments.

---

## 2. Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, Vite |
| Styling | CSS (Responsive modern design) |
| Backend | Node.js, Express.js |
| Authentication | Google OAuth 2.0, Passport.js, Express-Session, connect-mongo |
| API Integration | Google Classroom API (`googleapis`) |
| Database | MongoDB Atlas, Mongoose |
| Email Service | Nodemailer, Gmail SMTP |
| Scheduler | node-cron |
| Configuration | dotenv |
| Data Processing | Native Node.js CSV Parser for `data.csv` |
| Version Control | Git, GitHub |

---

## 3. Project Structure

```text
Assignment-Reminder/
├── backend/
│   ├── config/
│   │   ├── db.js                 # MongoDB Mongoose connection handler
│   │   └── passport.js           # Passport Google OAuth 2.0 strategy
│   ├── models/
│   │   ├── Assignment.js         # Schema with reminderStatus & timestamps
│   │   └── User.js               # Student model with OAuth refresh tokens
│   ├── routes/
│   │   ├── auth.js               # Google OAuth endpoints (/auth/google, /auth/me, /auth/logout)
│   │   └── assignments.js        # Sync, filter, fieldwork-stats & test routes
│   ├── services/
│   │   ├── classroomService.js   # Google Classroom API sync & token refresh
│   │   ├── emailService.js       # Nodemailer Gmail SMTP client & HTML templates
│   │   ├── schedulerService.js   # node-cron scheduler & atomic duplicate prevention
│   │   └── surveyAnalyzer.js     # Reads data.csv, computes threshold, detects bad rows
│   ├── .env                      # Local environment config (git-ignored)
│   ├── .env.example              # Safe environment template
│   ├── package.json              # Backend dependencies & npm run analyze script
│   └── server.js                 # Express server & cron runner
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.jsx     # Responsive dashboard with tabs & test controls
│   │   ├── App.jsx               # Root React component
│   │   ├── index.css             # UI styling & status badges
│   │   └── main.jsx              # React 18 DOM mount
│   ├── package.json              # Frontend dependencies
│   └── vite.config.js            # Vite configuration (port 5173)
│
├── ai-chats/
│   └── conversation-log.md       # Export of AI conversation logs and prompt history
├── data.csv                      # Raw fieldwork survey data (20 entries from Hostel K)
├── fieldwork.md                  # Hostel observations, conversation with Ankit & photos
├── research.md                   # Problem definition, existing solutions & sources
├── reflection.md                 # Post-build human reflection
├── Image1.jpeg                   # Fieldwork interview photo 1
├── Image 2.jpeg                  # Fieldwork interview photo 2
└── README.md                     # Documentation & setup instructions
```

---

## 4. Assignment Model

The Assignment model stores the following information:

| Field | Description |
|---|---|
| `googleAssignmentId` | Unique assignment ID from Google Classroom |
| `userId` | ID of the student |
| `title` | Assignment title |
| `courseName` | Name of the Classroom course |
| `dueDate` | Assignment submission deadline |
| `alternateLink` | Direct Google Classroom assignment link |
| `reminderSent` | Indicates whether the reminder was sent |
| `reminderTime` | Scheduled reminder timestamp (`dueDate - 3 hours`) |
| `reminderStatus` | Current reminder status (`SCHEDULED`, `SENDING`, `SENT`, `FAILED`, `NOT_APPLICABLE`) |
| `reminderSentAt` | Time when the email was sent |
| `reminderError` | Error details if email delivery fails |

---

## 5. How Automatic Reminders Work

1. Student signs in using Google.
2. Application fetches assignments from Google Classroom.
3. Assignment details are stored in MongoDB.
4. The application calculates the reminder time as 3 hours before the deadline.
5. The background scheduler checks pending reminders every minute.
6. When the reminder time arrives, the application sends an email through Gmail SMTP.
7. The reminder status is updated in MongoDB.
8. The dashboard displays the updated reminder status.

**Important:** The backend must remain running for automatic reminders to work.

---

## 6. Google Classroom API Setup

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project named Assignment Reminder.
3. Open APIs & Services → Library.
4. Search for Google Classroom API and enable it.
5. Configure the OAuth consent screen.
6. Create OAuth 2.0 credentials using the Web Application type.
7. Add the following authorized redirect URI:
```text
http://localhost:5000/auth/google/callback
```
8. Add the following authorized JavaScript origin:
```text
http://localhost:5173
```

### Required OAuth Scopes
```text
openid
profile
email
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.coursework.me.readonly
```

Add your Google account as a test user if the OAuth application is in testing mode.

---

## 7. Gmail App Password Setup

The application uses Gmail SMTP through Nodemailer to send reminder emails:

1. Open [Google Account Security](https://myaccount.google.com/security).
2. Enable 2-Step Verification.
3. Open [Google App Passwords](https://myaccount.google.com/apppasswords).
4. Create an App Password named `Assignment Reminder`.
5. Copy the generated password.
6. Add it to `backend/.env`.

---

## 8. Getting Started

### Prerequisites
- Node.js and npm
- MongoDB Atlas account or a MongoDB instance
- Google Cloud project with Google Classroom API enabled
- Gmail account with an App Password

### Step 1: Clone the Repository
```bash
git clone https://github.com/Harekrishn-1/Assignment-Reminder.git
cd Assignment-Reminder
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 3: Configure Backend Environment Variables
Create a `.env` file inside the `backend` folder:
```env
PORT=5000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret

EMAIL_USER=your_gmail_address
EMAIL_APP_PASSWORD=your_gmail_app_password

REMINDER_TEST_MODE=true
REMINDER_TEST_DELAY_MINUTES=1
```

### Step 4: Run the Fieldwork Data Analyzer
To process and validate the raw survey data from [data.csv](data.csv):
```bash
npm run analyze
```
*Live threshold evaluation (for interview call):*
```bash
node services/surveyAnalyzer.js --threshold 2
```

### Step 5: Start Backend
```bash
npm run dev
```

### Step 6: Install Frontend Dependencies & Start Frontend
Open another terminal:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 9. Testing Email Reminders

### Test Email
1. Open the dashboard.
2. Click **Send Test Email**.
3. Check your Gmail inbox for the confirmation email.

### Automatic Reminder Test
1. Select a short delay: 1, 2, or 5 minutes (or click **➕ Test 1-Min Reminder**).
2. The test assignment appears on the dashboard with `⏰ Reminder Scheduled`.
3. Wait 1 minute for the cron job or click **⚡ Run Reminder Check Now**.
4. Check your Gmail inbox for the styled HTML reminder.
5. Verify that the dashboard status changes to `✅ Reminder Sent`.
6. Run the reminder check again to verify duplicate prevention.
7. Click **🗑️ Clear Test** after completing the demonstration.

---

## 10. The Real Output

### 1. Fieldwork Data Analyzer Output (`npm run analyze`):
```text
====================================================
   FIELDWORK DATA ANALYZER (Hostel K, NIT JSR)      
====================================================

[Input] Loaded data from: C:\Users\hp\Desktop\Assignment-Reminder\data.csv
[Entries] Valid survey records: 20 / 20
✅ [Data Quality] All 20 entries cleanly validated. No corrupted rows.

--- Survey Findings ---
• Students who forget assignment deadlines: 16/20 (80%)
• Students who missed an 11:59 PM deadline: 14/20 (70%)
• Students wanting 100% automated import: 19/20 (95%)

--- Preferred Reminder Time Distribution ---
  1 hour(s) before deadline: 2 student(s) (10%)
  2 hour(s) before deadline: 7 student(s) (35%)
  3 hour(s) before deadline: 10 student(s) (50%)
  4 hour(s) before deadline: 1 student(s) (5%)

--- Decision Engine Threshold Output ---
Active Threshold Setting: 3 hour(s) before deadline
Student Coverage: 19/20 (95%)
Conclusion: 95% of surveyed students in Hostel K are protected when reminder threshold is set to 3 hours before deadline.
====================================================
```

### 2. Live Automated Email Reminder Log:
```text
[Scheduler] Found 1 pending assignment reminder(s) to process.
[Scheduler] Dispatching 3-hour reminder for "Assignment 3" to harekrishnpachauri@gmail.com...
[Scheduler] ✅ Reminder successfully delivered to harekrishnpachauri@gmail.com for "Assignment 3".
```

---

## 11. Fieldwork and Research

The project is based on the problem of students forgetting assignment deadlines even after receiving notifications from professors.

### Fieldwork Observations
- Students sometimes forget assignments after receiving an earlier notification.
- Students prefer an additional reminder 2–3 hours before the deadline.
- Students want assignments to be imported automatically instead of adding them manually.
- Some students create their own alarms, while others forget and miss deadlines.

### Survey Data
The project folder contains:
- `research.md` — Problem research, existing solutions, and reviewed literature.
- `fieldwork.md` — Fieldwork observations, interview photos, and conversation with Ankit.
- `data.csv` — Survey data containing 20 responses collected from students across Hostel K, NIT Jamshedpur regarding deadline submission habits and preferred reminder timing.
- `reflection.md` — Human reflection on technical challenges, initial assumptions, and learnings.
- `ai-chats/conversation-log.md` — Transparent log of AI conversation and prompts used during project development.

---

## 12. Limitations & What It Gets Wrong

1. **Assignments Without Due Dates:** If a professor creates coursework on Google Classroom without setting a due date and time, the tool marks its status as `NOT_APPLICABLE` because a 3-hour alert cannot be mathematically calculated.
2. **Assignments Given Less Than 3 Hours Before Deadline:** If a professor posts an assignment at 10:00 PM with an 11:59 PM deadline, sending an alert "3 hours before deadline" is physically impossible. The scheduler detects this (`createdAt > reminderTime`) and marks it `NOT_APPLICABLE` to avoid spamming the student after the window has closed.
3. **Reliance on Email Inbox:** The tool alerts via Gmail. If a student keeps email notifications turned off on their phone, they may still overlook the email.
4. **Google OAuth Token Revocation:** If a student revokes application permissions from their Google Account settings, background sync fails until they sign back in.

---

## 13. Repository

GitHub: [Assignment Reminder](https://github.com/Harekrishn-1/Assignment-Reminder)

**Developed as a 1-day take-home project for B.Tech/MCA graduates, solving a real student problem observed at Hostel K, NIT Jamshedpur.**
