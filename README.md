# Assignment Reminder

An automated web application designed to fetch assignments and due dates from Google Classroom and send students timely reminders before their deadlines.

> **Project Scope:** Focused strictly on proactive reminders (e.g. 2–3 hours before due time) to ensure students never miss an assignment deadline. It does not track submissions, calculate marks, or manage grading.

---

## Tech Stack

- **Frontend:** React (v18), Vite, Modern Responsive CSS
- **Backend:** Node.js, Express.js, Passport.js, Express-Session, CORS, Dotenv
- **Integration:** Google Classroom API (`googleapis`)
- **Authentication:** Google OAuth 2.0 (Passport Google Strategy with Classroom Scopes)
- **Database:** MongoDB with Mongoose ORM

---

## Google Classroom Scopes

The application requests the following read-only OAuth 2.0 scopes:
1. `openid` — OpenID Connect identity
2. `profile` — Basic user profile info (name, avatar)
3. `email` — Student email address
4. `https://www.googleapis.com/auth/classroom.courses.readonly` — Read student's enrolled courses
5. `https://www.googleapis.com/auth/classroom.coursework.me.readonly` — Read student's coursework and assignment due dates

---

## Project Structure

```text
Assignment-Reminder/
├── backend/
│   ├── config/
│   │   ├── db.js                 # MongoDB Mongoose connection handler
│   │   └── passport.js           # Passport.js Google OAuth 2.0 strategy
│   ├── models/
│   │   ├── Assignment.js         # Assignment data schema & compound index
│   │   └── User.js               # Student model with OAuth access & refresh tokens
│   ├── routes/
│   │   ├── auth.js               # Google OAuth routes (/auth/google, /auth/me, /auth/logout)
│   │   └── assignments.js        # Classroom sync & fetch (/api/assignments, /api/assignments/sync)
│   ├── services/
│   │   └── classroomService.js   # Google Classroom API integration & token refresh handler
│   ├── .env                      # Local environment config (git-ignored)
│   ├── .env.example              # Safe environment template
│   ├── .gitignore                # Ignores node_modules, .env, logs
│   ├── package.json              # Backend scripts & dependencies
│   └── server.js                 # Express server & API routes
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.jsx     # Dashboard with Google sign-in & Classroom sync
│   │   ├── App.jsx               # Root React component
│   │   ├── index.css             # Responsive styles, assignment cards & badges
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
| `reminderSent` | Boolean | Flag tracking if alert was sent (default: `false`) |
| `reminderTime` | Date | Scheduled reminder timestamp |

*Note: Compound index on `{ googleAssignmentId: 1, userId: 1 }` prevents duplicates.*

---

## Getting Started

### 1. Enable Google Classroom API in Google Cloud
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project.
3. Navigate to **APIs & Services > Library**.
4. Search for **Google Classroom API** and click **Enable**.
5. In **APIs & Services > OAuth consent screen > Scopes**, add:
   - `.../auth/classroom.courses.readonly`
   - `.../auth/classroom.coursework.me.readonly`

### 2. Run Backend
```powershell
cd backend
npm run dev
```

### 3. Run Frontend
In a separate terminal:
```powershell
cd frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser:
1. Click **"Sign in with Google"** and grant access to Google Classroom courses & coursework.
2. Click **"Sync Google Classroom"** to import your assignments.
