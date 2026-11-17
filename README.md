# Assignment Reminder

An automated web application designed to fetch assignments and due dates from Google Classroom and send students timely email reminders **3 hours** before their deadlines.

> **Project Scope:** Focused strictly on proactive reminders (3 hours before due time) to ensure students never miss an assignment deadline. It does not track submissions, calculate marks, or manage grading.

---

## Tech Stack

- **Frontend:** React (v18), Vite, Modern Responsive CSS
- **Backend:** Node.js, Express.js, Passport.js, Express-Session, CORS, Dotenv
- **Integration:** Google Classroom API (`googleapis`)
- **Authentication:** Google OAuth 2.0 (Passport Google Strategy with Classroom Scopes)
- **Email Service:** Nodemailer with Gmail SMTP
- **Task Scheduling:** `node-cron` (checks pending reminders every minute)
- **Database:** MongoDB with Mongoose ORM

---

## Automatic 3-Hour Email Reminders

1. **Scheduling Logic:**
   - When assignments are synced from Google Classroom, a reminder timestamp is set:  
     `reminderTime = dueDate - 3 hours`.
   - The cron scheduler (`node-cron`) wakes up every minute to check for assignments where `reminderTime <= now` and `dueDate > now`.
2. **Duplicate Prevention:**
   - Uses an atomic MongoDB lock (`findOneAndUpdate` transitioning status to `SENDING`).
   - Marks status as `SENT` only after Nodemailer confirms delivery.
   - If delivery fails, status becomes `FAILED` with error logging, allowing safe retry without duplicate emails.
3. **Smart Exclusions:**
   - Past deadlines (`dueDate < now`) are skipped.
   - Assignments without deadlines (`dueDate: null`) are marked `NOT_APPLICABLE`.
   - Assignments discovered after their 3-hour mark has already passed are not immediately spammed.

---

## Project Structure

```text
Assignment-Reminder/
├── backend/
│   ├── config/
│   │   ├── db.js                 # MongoDB Mongoose connection handler
│   │   └── passport.js           # Passport.js Google OAuth 2.0 strategy
│   ├── models/
│   │   ├── Assignment.js         # Assignment schema with reminderStatus
│   │   └── User.js               # Student model with OAuth tokens
│   ├── routes/
│   │   ├── auth.js               # Google OAuth routes (/auth/google, /auth/me, /auth/logout)
│   │   └── assignments.js        # Classroom sync & test-email routes
│   ├── services/
│   │   ├── classroomService.js   # Google Classroom API integration & token refresh
│   │   ├── emailService.js       # Nodemailer Gmail SMTP client & HTML templates
│   │   └── schedulerService.js   # node-cron scheduler & atomic duplicate prevention
│   ├── .env                      # Local environment config (git-ignored)
│   ├── .env.example              # Safe environment template
│   ├── .gitignore                # Ignores node_modules, .env, logs
│   ├── package.json              # Backend scripts & dependencies
│   └── server.js                 # Express server entry point & cron runner
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.jsx     # Dashboard with test email & reminder badges
│   │   ├── App.jsx               # Root React component
│   │   ├── index.css             # Responsive styles, reminder status badges
│   │   └── main.jsx              # React 18 DOM entry point
│   ├── .env                      # Local frontend config (git-ignored)
│   ├── .env.example              # Frontend environment template
│   ├── .gitignore                # Ignores node_modules, dist, .env
│   ├── index.html                # HTML template
│   ├── package.json              # Frontend scripts & dependencies
│   └── vite.config.js            # Vite configuration (port 5173)
│
├── data.csv                      # Fieldwork survey data (preserved)
├── fieldwork.md                  # Student interviews & observations (preserved)
├── research.md                   # Problem definition & literature review (preserved)
├── .gitignore                    # Root gitignore
└── README.md                     # Documentation & setup instructions
```

---

## Assignment Model Schema

| Field | Type | Description |
|---|---|---|
| `googleAssignmentId` | String (Required) | Unique coursework ID from Google Classroom |
| `userId` | String (Required) | MongoDB ID of the student user |
| `title` | String (Required) | Assignment title |
| `courseName` | String (Required) | Name of the enrolled Classroom course |
| `dueDate` | Date (Optional) | Due deadline in UTC (or `null` if none set) |
| `alternateLink` | String | Direct URL to assignment in Google Classroom |
| `reminderTime` | Date | Scheduled reminder timestamp (`dueDate - 3 hours`) |
| `reminderSent` | Boolean | True once reminder email has been sent |
| `reminderStatus` | String (Enum) | `SCHEDULED`, `SENDING`, `SENT`, `FAILED`, `NOT_APPLICABLE` |
| `reminderSentAt` | Date | Timestamp of successful email dispatch |
| `reminderError` | String | Error message if delivery failed |

---

## Gmail SMTP Setup (App Password)

To send automated reminder emails via Gmail:

1. Go to your **[Google Account Security Settings](https://myaccount.google.com/security)**.
2. Enable **2-Step Verification** (if not already enabled).
3. Search for **App passwords** in the top search bar (or go to *2-Step Verification > App passwords*).
4. Enter an app name like `Assignment Reminder` and click **Create**.
5. Google will generate a 16-character password (e.g. `abcd efgh ijkl mnop`).
6. Copy this password into [backend/.env](file:///c:/Users/hp/Desktop/Assignment-Reminder/backend/.env):
   ```env
   EMAIL_USER=your_actual_email@gmail.com
   EMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

---

## How to Run & Test

### 1. Start Backend
```powershell
cd backend
npm run dev
```
You will see:
```text
[Scheduler] Initializing automated reminder cron job (running every minute: * * * * *)...
Server is running on port 5000
[MongoDB Connected] Host: ...
```

### 2. Start Frontend
In a second terminal:
```powershell
cd frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 3. Test Email Verification
1. Sign in with Google.
2. Click the **"Send Test Email"** button in the dashboard.
3. Check your student Gmail inbox for the test confirmation email.

### 4. Automatic Reminders
1. Click **"Sync Google Classroom"** to load upcoming coursework.
2. Each assignment will display its reminder status badge:
   - `⏰ Reminder Scheduled`
   - `✅ Reminder Sent`
   - `⚠️ Reminder Failed`
3. When the 3-hour threshold arrives, `node-cron` automatically delivers the email and updates the badge to `✅ Reminder Sent`.
