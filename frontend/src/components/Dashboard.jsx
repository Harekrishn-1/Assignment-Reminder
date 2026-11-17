import React, { useState, useEffect } from 'react';

function Dashboard() {
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null,
  });

  const [assignments, setAssignments] = useState([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [feedback, setFeedback] = useState({ type: '', message: '' }); // type: 'success' | 'error' | 'warning'

  // Backend URL from Vite environment variable
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Helper to fetch upcoming assignments from backend API
  const fetchAssignments = async () => {
    setIsLoadingAssignments(true);
    try {
      const res = await fetch(`${backendUrl}/api/assignments`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    // 1. Check URL query parameters for OAuth notices
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam === 'oauth_not_configured') {
      setFeedback({
        type: 'warning',
        message:
          'Google OAuth credentials not configured on backend. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env',
      });
    } else if (errorParam === 'auth_failed') {
      setFeedback({
        type: 'error',
        message: 'Google authentication was cancelled or failed. Please try again.',
      });
    }

    if (errorParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Check backend health
    fetch(`${backendUrl}/api/health`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => setServerStatus('connected'))
      .catch(() => setServerStatus('disconnected'));

    // 3. Check current authentication status
    fetch(`${backendUrl}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const isAuth = Boolean(data.isAuthenticated);
        setAuthState({
          isLoading: false,
          isAuthenticated: isAuth,
          user: data.user || null,
        });

        if (isAuth) {
          fetchAssignments();
        }
      })
      .catch(() => {
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
        });
      });
  }, [backendUrl]);

  // Handle Google OAuth Login
  const handleGoogleLogin = () => {
    window.location.href = `${backendUrl}/auth/google`;
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch(`${backendUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
      setAssignments([]);
      setFeedback({ type: '', message: '' });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Handle Google Classroom Sync
  const handleSyncClassroom = async () => {
    setIsSyncing(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await fetch(`${backendUrl}/api/assignments/sync`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.message || `Successfully synced ${data.count} assignment(s).`,
        });
        // Refresh assignments list
        await fetchAssignments();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to sync assignments with Google Classroom.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Network error communicating with backend server during sync.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Format due date in student's local timezone
  const formatDueDate = (dateString) => {
    if (!dateString) return 'No due date set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'No due date set';

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Compute countdown badge
  const getDueBadgeText = (dateString) => {
    if (!dateString) return null;
    const due = new Date(dateString);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    if (diffMs <= 0) return 'Due now';

    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours <= 1) return 'Due in < 1 hour';
    if (diffHours < 24) return `Due in ${diffHours} hours`;
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div>
          <h1 className="brand-title">Assignment Reminder</h1>
          <p className="brand-subtitle">
            Automated Google Classroom assignment tracker & reminder system
          </p>
        </div>

        <div className="header-right">
          {/* Server Status Badge */}
          {serverStatus === 'checking' && (
            <span className="server-status-badge status-checking">
              <span className="status-dot"></span> Checking backend...
            </span>
          )}
          {serverStatus === 'connected' && (
            <span className="server-status-badge status-online">
              <span className="status-dot"></span> Backend Active
            </span>
          )}
          {serverStatus === 'disconnected' && (
            <span className="server-status-badge status-offline">
              <span className="status-dot"></span> Backend Offline (Port 5000)
            </span>
          )}

          {/* User Profile */}
          {authState.isAuthenticated && authState.user && (
            <div className="user-profile-badge">
              {authState.user.avatar ? (
                <img
                  src={authState.user.avatar}
                  alt={authState.user.displayName}
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  {authState.user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="user-details">
                <span className="user-name">{authState.user.displayName}</span>
                <span className="user-email">{authState.user.email}</span>
              </div>
              <button onClick={handleLogout} className="btn-logout" title="Sign Out">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Feedback Alerts */}
      {feedback.message && (
        <div className={`alert-banner alert-${feedback.type}`}>
          <span>{feedback.message}</span>
          <button
            className="alert-close"
            onClick={() => setFeedback({ type: '', message: '' })}
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Content */}
      <main>
        {authState.isLoading ? (
          <div className="dashboard-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#5f6368' }}>Loading student session...</p>
          </div>
        ) : !authState.isAuthenticated ? (
          /* Sign In Card for Logged-Out Users */
          <section className="dashboard-card auth-hero-card">
            <div className="auth-hero-icon">🔐</div>
            <h2 className="auth-hero-title">Sign In to Continue</h2>
            <p className="auth-hero-desc">
              Connect your Google Classroom account to automatically sync your courses and
              upcoming coursework deadlines without manual entry.
            </p>

            <button onClick={handleGoogleLogin} className="btn-google">
              <svg viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

            <p className="auth-notice">
              Requests read-only access to your enrolled courses and coursework.
            </p>
          </section>
        ) : (
          /* Logged-In Student Dashboard */
          <section className="dashboard-card">
            <div className="card-header-row">
              <div className="section-title">
                <h2>Upcoming Assignments</h2>
                <span className="badge-count">{assignments.length} Upcoming</span>
              </div>

              {/* Sync Google Classroom Button */}
              <button
                onClick={handleSyncClassroom}
                disabled={isSyncing}
                className="btn-sync"
                title="Fetch latest assignments from Google Classroom"
              >
                {isSyncing ? (
                  <>
                    <span className="sync-spinner"></span>
                    <span>Syncing Classroom...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Sync Google Classroom</span>
                  </>
                )}
              </button>
            </div>

            {/* Assignments View */}
            {isLoadingAssignments ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#5f6368' }}>
                Loading upcoming assignments...
              </div>
            ) : assignments.length === 0 ? (
              /* Proper Empty State for No Upcoming Assignments */
              <div className="assignment-placeholder">
                <div className="placeholder-icon">🎉</div>
                <h3 className="placeholder-title">No Upcoming Assignments Due</h3>
                <p className="placeholder-text">
                  You are all caught up! There are no pending assignments with upcoming deadlines
                  in your enrolled Google Classroom courses.
                </p>
                <button onClick={handleSyncClassroom} disabled={isSyncing} className="btn-sync">
                  Check for New Assignments
                </button>
              </div>
            ) : (
              /* List of Upcoming Assignments (Sorted by nearest deadline first) */
              <div className="assignments-list">
                {assignments.map((assignment) => (
                  <div key={assignment._id || assignment.googleAssignmentId} className="assignment-item">
                    <div className="assignment-main">
                      <h4 className="assignment-title">{assignment.title}</h4>
                      <div className="assignment-meta">
                        <span className="course-badge">{assignment.courseName}</span>
                        {assignment.alternateLink && (
                          <a
                            href={assignment.alternateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-open-assignment"
                          >
                            View in Google Classroom ↗
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="assignment-due-info">
                      <span className="due-date-text">
                        Due: {formatDueDate(assignment.dueDate)}
                      </span>
                      {getDueBadgeText(assignment.dueDate) && (
                        <span className="due-date-sub" style={{ color: '#1a73e8', fontWeight: 600 }}>
                          {getDueBadgeText(assignment.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* System Architecture / Info */}
        <section className="dashboard-card">
          <h3 className="section-title">How Google Classroom Integration Works</h3>
          <div className="info-grid">
            <div className="info-card">
              <h4>1. Read-Only Scopes</h4>
              <p>Securely reads enrolled courses and coursework without modifying any student work.</p>
            </div>
            <div className="info-card">
              <h4>2. Smart Deduplication</h4>
              <p>Assignments are stored by Google Assignment ID and Student ID, avoiding duplicate entries.</p>
            </div>
            <div className="info-card">
              <h4>3. Automatic Token Refresh</h4>
              <p>Uses stored refresh tokens to renew access silently when credentials expire.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Assignment Reminder &bull; Full-Stack React + Express + MongoDB Architecture</p>
      </footer>
    </div>
  );
}

export default Dashboard;
