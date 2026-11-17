# Assignment Reminder

An automated web application that fetches assignments and their due dates from Google Classroom and sends students additional email reminders before their deadlines.

**Project Goal:** Help students avoid forgetting assignments by sending automatic reminders 3 hours before the submission deadline.

**Project Scope:** This application focuses only on assignment reminders. It does not track assignment submissions, calculate marks, or manage grading.

---

## 1. Features

### Google Authentication
- Sign in using Google OAuth 2.0.
- Secure authentication using Passport.js.
- Access Google Classroom using read-only permissions.

### Google Classroom Integration
- Automatically fetch enrolled courses.
- Fetch assignments and their due dates.
- Display assignment title, course name, deadline, and direct Classroom link.
- Store assignments in MongoDB.
- Avoid duplicate assignments during synchronization.

### Automatic Email Reminders
- Automatically send email reminders 3 hours before assignment deadlines.
- Use Nodemailer with Gmail SMTP.
- Run a background scheduler using node-cron.
- Check pending reminders every minute.
- Display reminder status on the dashboard.
- Prevent duplicate emails using atomic MongoDB operations.
- Skip assignments with past deadlines or assignments discovered after their reminder time.

### Short-Delay Test Mode
The application supports short-delay testing to demonstrate automatic email reminders without waiting 3 hours.

Available testing options:
- 1-minute reminder
- 2-minute reminder
- 5-minute reminder

Additional features:
- Create temporary test assignments.
- Run the reminder scheduler manually.
- Verify email delivery.
- Check duplicate-email prevention.
- Clear test assignments after testing.

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
| Styling | CSS |
| Backend | Node.js, Express.js |
| Authentication | Google OAuth 2.0, Passport.js, Express-Session |
| API Integration | Google Classroom API |
| Database | MongoDB, Mongoose |
| Email Service | Nodemailer, Gmail SMTP |
| Scheduler | node-cron |
| Configuration | dotenv |
| Version Control | Git, GitHub |

---

## 3. Project Structure

```text
Assignment-Reminder/
│
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   └── passport.js
│   │
│   ├── models/
│   │   ├── Assignment.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   └── assignments.js
│   │
│   ├── services/
│   │   ├── classroomService.js
│   │   ├── emailService.js
│   │   └── schedulerService.js
│   │
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── research.md
├── fieldwork.md
├── data.csv
├── Image1.jpeg
├── Image 2.jpeg
├── .gitignore
└── README.md
```

---

## 4. Assignment Model

The Assignment model stores the following information:

| Field | Description |
|---|---|
| googleAssignmentId | Unique assignment ID from Google Classroom |
| userId | ID of the student |
| title | Assignment title |
| courseName | Name of the Classroom course |
| dueDate | Assignment submission deadline |
| alternateLink | Direct Google Classroom assignment link |
| reminderSent | Indicates whether the reminder was sent |
| reminderTime | Scheduled reminder timestamp |
| reminderStatus | Current reminder status |
| reminderSentAt | Time when the email was sent |
| reminderError | Error details if email delivery fails |

### Reminder Statuses

- `SCHEDULED` — Reminder is waiting to be sent.
- `SENDING` — Email is currently being processed.
- `SENT` — Reminder email was successfully sent.
- `FAILED` — Email delivery failed.
- `NOT_APPLICABLE` — No reminder can be scheduled.

A compound index on `googleAssignmentId` and `userId` helps prevent duplicate assignment records.

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

**Important:** The backend must remain running for automatic reminders to work. If the backend is stopped or the laptop is turned off, reminders will not be sent during that time.

---

## 6. Google Classroom API Setup

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project named Assignment Reminder.
3. Open APIs & Services → Library.
4. Search for Google Classroom API.
5. Enable the API.
6. Configure the OAuth consent screen.
7. Create OAuth 2.0 credentials using the Web Application type.
8. Add the following authorized redirect URI:

```text
http://localhost:5000/auth/google/callback
```

9. Add the following authorized JavaScript origin:

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

The application uses Gmail SMTP through Nodemailer to send reminder emails.

To configure it:

1. Open [Google Account Security](https://myaccount.google.com/security).
2. Enable 2-Step Verification.
3. Open [Google App Passwords](https://myaccount.google.com/apppasswords).
4. Create an App Password named `Assignment Reminder`.
5. Copy the generated password.
6. Add it to the backend environment configuration.

Use an App Password instead of your regular Gmail password.

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

Create a `.env` file inside the backend folder.

Add the required configuration:

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

Replace the placeholder values with your actual credentials.

**Never upload your `.env` file or share your credentials on GitHub.**

### Step 4: Start Backend

```bash
npm run dev
```

The backend will run at:

```text
http://localhost:5000
```

### Step 5: Install Frontend Dependencies

Open another terminal:

```bash
cd frontend
npm install
```

### Step 6: Start Frontend

```bash
npm run dev
```

Open the application:

```text
http://localhost:5173
```

### Step 7: Sign In and Synchronize

1. Click Sign in with Google.
2. Grant the requested Google Classroom permissions.
3. Open the dashboard.
4. Click Sync Google Classroom.
5. View your upcoming assignments and reminder statuses.

---

## 9. Testing Email Reminders

### Test Email

1. Open the dashboard.
2. Click Send Test Email.
3. Check your Gmail inbox.

This verifies Gmail SMTP connectivity without changing assignment reminder statuses.

### Automatic Reminder Test

1. Select a short delay: 1, 2, or 5 minutes.
2. Click the test assignment creation button.
3. Check that the test assignment appears on the dashboard.
4. Wait for the scheduled reminder or click Run Reminder Check Now.
5. Check your Gmail inbox.
6. Verify that the dashboard status changes to SENT.
7. Run the reminder check again to verify duplicate prevention.
8. Click Clear Test after completing the demonstration.

### Production Reminder Logic

Real Google Classroom assignments use the actual deadline minus 3 hours.

Short-delay testing is intended only for demonstration and testing. It does not change real assignment deadlines.

---

## 10. Environment and Security

- Google OAuth credentials are stored in environment variables.
- Gmail App Password is stored in the backend environment file.
- `.env` files are excluded from Git.
- Google Classroom permissions are read-only.
- Email credentials are not exposed in frontend code.
- Assignment records are associated with their respective users.
- MongoDB atomic operations help prevent duplicate reminder delivery.

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

- `research.md` — Problem research and existing solutions.
- `fieldwork.md` — Fieldwork observations and conversations.
- `data.csv` — Survey data containing 10 actual responses and 10 additional hypothetical sample responses for testing.

The sample responses are not actual student survey results.

---

## 12. Limitations

- The application currently runs locally and requires the backend to remain active for scheduled reminders.
- Google Classroom API access and OAuth permissions are required.
- Gmail SMTP requires a valid App Password.
- Assignments discovered after their 3-hour reminder time are not sent late reminders.
- The application does not track assignment submissions or grading.
- Test mode is intended for demonstration and should not be confused with actual assignment deadlines.

---

## 13. Future Improvements

- Deploy the application on a cloud platform.
- Support more email providers.
- Add customizable reminder intervals.
- Improve notification and error monitoring.

---

## 14. Repository

GitHub: [Assignment Reminder](https://github.com/Harekrishn-1/Assignment-Reminder)

**Developed as a student project to help students manage assignment deadlines through automatic reminders.**
