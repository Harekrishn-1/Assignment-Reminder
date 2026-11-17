import React, { useState, useEffect } from 'react';

function Dashboard() {
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null,
  });

  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [assignments, setAssignments] = useState([]);
  const [pastAssignments, setPastAssignments] = useState([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [isTriggeringReminders, setIsTriggeringReminders] = useState(false);
  const [testDelayMinutes, setTestDelayMinutes] = useState(1);

  const [feedback, setFeedback] = useState({ type: '', message: '' }); // type: 'success' | 'error' | 'warning'

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Helper to fetch assignments from backend API
  const fetchAssignments = async () => {
    setIsLoadingAssignments(true);
    try {
      const res = await fetch(`${backendUrl}/api/assignments`, {
        method: 'GET',
        credentials: 'include',
      });

      if (res.status === 401) {
        setFeedback({
          type: 'warning',
          message: 'Your session has expired. Please click "Sign Out" and sign in again with Google.',
        });
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
        setPastAssignments(data.pastAssignments || []);
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
      setPastAssignments([]);
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

      if (res.status === 401) {
        setFeedback({
          type: 'error',
          message: 'Session expired due to server restart. Please click "Sign Out" and sign in again with Google.',
        });
        return;
      }

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.message || `Successfully synced ${data.count} assignment(s).`,
        });
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

  // Handle Send Test Email
  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await fetch(`${backendUrl}/api/assignments/test-email`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.status === 401) {
        setFeedback({
          type: 'error',
          message: 'Session expired due to server restart. Please click "Sign Out" and sign in again with Google.',
        });
        return;
      }

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.message || 'Test email sent successfully! Check your inbox.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to send test email. Check EMAIL_USER and EMAIL_APP_PASSWORD in backend/.env',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Network error sending test email.',
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Handle Create Sample Upcoming Assignment (with configurable short reminder delay for testing)
  const handleCreateTestAssignment = async (overrideDelay) => {
    setIsCreatingTest(true);
    setFeedback({ type: '', message: '' });
    const delayToUse = overrideDelay !== undefined ? overrideDelay : testDelayMinutes;

    try {
      const res = await fetch(`${backendUrl}/api/assignments/create-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ delayMinutes: delayToUse }),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.message || `Sample test assignment created! Reminder will fire in ${delayToUse} min.`,
        });
        await fetchAssignments();
        setActiveTab('upcoming');
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to create test assignment.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Error creating test assignment.',
      });
    } finally {
      setIsCreatingTest(false);
    }
  };

  // Handle Trigger Reminders Manually
  const handleTriggerReminders = async () => {
    setIsTriggeringReminders(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await fetch(`${backendUrl}/api/assignments/trigger-reminders`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.message || 'Reminder check executed! Check server log & inbox.',
        });
        await fetchAssignments();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to trigger reminders.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Error triggering reminders.',
      });
    } finally {
      setIsTriggeringReminders(false);
    }
  };

  // Handle Delete Test Assignments
  const handleDeleteTestAssignments = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/assignments/test`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: 'Sample test assignment removed.',
        });
        await fetchAssignments();
      }
    } catch (err) {
      console.error('Error clearing test assignments:', err);
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
    if (diffMs <= 0) return 'Past Deadline';

    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours <= 1) return 'Due in < 1 hour';
    if (diffHours < 24) return `Due in ${diffHours} hours`;
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  // Render Reminder Status Badge
  const renderReminderBadge = (assignment) => {
    const status = assignment.reminderStatus || (assignment.reminderSent ? 'SENT' : 'SCHEDULED');

    switch (status) {
      case 'SENT': {
        const timeStr = assignment.reminderSentAt
          ? new Date(assignment.reminderSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
        return (
          <span className="reminder-badge badge-sent" title={`Automated reminder was successfully dispatched ${timeStr}`}>
            ✅ Reminder Sent {timeStr && `(${timeStr})`}
          </span>
        );
      }
      case 'SENDING':
        return (
          <span className="reminder-badge badge-scheduled" title="Automated email is currently being delivered...">
            ⏳ Sending Email...
          </span>
        );
      case 'FAILED':
        return (
          <span
            className="reminder-badge badge-failed"
            title={assignment.reminderError || 'Reminder delivery failed. Will retry.'}
          >
            ⚠️ Reminder Failed
          </span>
        );
      case 'SCHEDULED': {
        const schedStr = assignment.reminderTime
          ? new Date(assignment.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
        return (
          <span
            className="reminder-badge badge-scheduled"
            title="Automated email reminder scheduled"
          >
            ⏰ Reminder Scheduled {schedStr && `(${schedStr})`}
          </span>
        );
      }
      case 'NOT_APPLICABLE':
      default:
        return (
          <span
            className="reminder-badge badge-not-applicable"
            title="No reminder scheduled (past 3h window or no due date)"
          >
            ⚪ No Reminder Set
          </span>
        );
    }
  };

  const hasTestAssignment = assignments.some((a) => a.googleAssignmentId?.startsWith('test-'));

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div>
          <h1 className="brand-title">Assignment Reminder</h1>
          <p className="brand-subtitle">
            Automated Google Classroom assignment tracker & 3-hour deadline email reminder
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
              Connect your Google Classroom account to automatically sync your courses,
              track deadlines, and receive automated email alerts <strong>3 hours</strong> before submission deadlines.
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
              Secure Google OAuth 2.0 with read-only Classroom permissions.
            </p>
          </section>
        ) : (
          /* Logged-In Student Dashboard */
          <section className="dashboard-card">
            <div className="card-header-row">
              <div className="section-title">
                <h2>Assignments</h2>
                <span className="badge-count">
                  {activeTab === 'upcoming' ? `${assignments.length} Upcoming` : `${pastAssignments.length} Past Synced`}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="card-actions-group">
                {/* Send Test Email Button */}
                <button
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail}
                  className="btn-secondary"
                  title="Send a test notification to verify Gmail SMTP setup"
                >
                  {isSendingTestEmail ? (
                    <>
                      <span className="sync-spinner-dark"></span>
                      <span>Sending Test...</span>
                    </>
                  ) : (
                    <>
                      <span>✉️</span>
                      <span>Send Test Email</span>
                    </>
                  )}
                </button>

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

                {/* 1-Min Test Reminder Button */}
                <button
                  onClick={() => handleCreateTestAssignment(testDelayMinutes)}
                  disabled={isCreatingTest}
                  className="btn-success-soft"
                  style={{ fontSize: '0.85rem' }}
                  title="Create a test assignment that triggers an automated reminder in 1 minute"
                >
                  {isCreatingTest ? 'Creating...' : '➕ Test 1-Min Reminder'}
                </button>
              </div>
            </div>

            {/* Tabs for Upcoming vs Past Assignments */}
            <div className="dashboard-tabs">
              <button
                className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                <span>⏰ Upcoming Deadlines</span>
                <span className="badge-count">{assignments.length}</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
                onClick={() => setActiveTab('past')}
              >
                <span>📚 All Synced from Classroom</span>
                <span className="badge-count">{pastAssignments.length}</span>
              </button>
            </div>

            {/* Assignments View */}
            {isLoadingAssignments ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#5f6368' }}>
                Loading assignments...
              </div>
            ) : activeTab === 'upcoming' ? (
              assignments.length === 0 ? (
                /* Empty State for Upcoming Tab */
                <div className="assignment-placeholder">
                  <div className="placeholder-icon">🎉</div>
                  <h3 className="placeholder-title">No Upcoming Assignments Due</h3>
                  <p className="placeholder-text">
                    You are all caught up! All <strong>{pastAssignments.length} assignments</strong> in your enrolled
                    Google Classroom courses have deadlines in the past.
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#5f6368', marginBottom: '1rem' }}>
                    Want to test the <strong>automated email reminder</strong> right now with a short delay without waiting 3 hours?
                  </p>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.9rem', color: '#3c4043', fontWeight: '500' }}>
                      Reminder Delay:
                    </label>
                    <select
                      value={testDelayMinutes}
                      onChange={(e) => setTestDelayMinutes(Number(e.target.value))}
                      style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #dadce0', fontSize: '0.9rem', backgroundColor: '#fff' }}
                    >
                      <option value={1}>1 Minute (Fastest)</option>
                      <option value={2}>2 Minutes</option>
                      <option value={5}>5 Minutes</option>
                    </select>
                  </div>

                  <div className="placeholder-actions">
                    <button
                      onClick={() => handleCreateTestAssignment(testDelayMinutes)}
                      disabled={isCreatingTest}
                      className="btn-success-soft"
                    >
                      {isCreatingTest ? 'Creating Demo...' : `➕ Create Test Assignment (Reminder in ${testDelayMinutes} min)`}
                    </button>
                    <button
                      onClick={() => setActiveTab('past')}
                      className="btn-secondary"
                    >
                      View All {pastAssignments.length} Synced Assignments ↗
                    </button>
                  </div>
                </div>
              ) : (
                /* List of Upcoming Assignments */
                <>
                  {/* Test Mode Banner */}
                  {hasTestAssignment && (
                    <div style={{
                      backgroundColor: '#e8f0fe',
                      border: '1px solid #d2e3fc',
                      borderRadius: '8px',
                      padding: '0.75rem 1.25rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      fontSize: '0.88rem',
                      color: '#1a73e8'
                    }}>
                      <div>
                        <strong>🧪 Test Reminder Active:</strong> Automated email reminder will be sent to your Gmail. You can wait for the 1-minute cron or click <em>Run Reminder Check Now</em>.
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={handleTriggerReminders}
                          disabled={isTriggeringReminders}
                          className="btn-sync"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                          title="Force cron scheduler to evaluate pending reminders immediately"
                        >
                          {isTriggeringReminders ? 'Triggering...' : '⚡ Run Reminder Check Now'}
                        </button>
                        <button
                          onClick={handleDeleteTestAssignments}
                          className="btn-danger-soft"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                          title="Delete simulated test assignment"
                        >
                          🗑️ Clear Test
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="assignments-list">
                    {assignments.map((assignment) => (
                      <div key={assignment._id || assignment.googleAssignmentId} className="assignment-item">
                        <div className="assignment-main">
                          <h4 className="assignment-title">{assignment.title}</h4>
                          <div className="assignment-meta">
                            <span className="course-badge">{assignment.courseName}</span>
                            {renderReminderBadge(assignment)}
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
                            <span className="due-date-sub">
                              {getDueBadgeText(assignment.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Test Controls Bar */}
                  {hasTestAssignment && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        onClick={handleTriggerReminders}
                        disabled={isTriggeringReminders}
                        className="btn-sync"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                        title="Force cron scheduler to evaluate pending 3h reminders immediately"
                      >
                        {isTriggeringReminders ? 'Triggering...' : '⚡ Run Reminder Check Now'}
                      </button>
                      <button
                        onClick={handleDeleteTestAssignments}
                        className="btn-danger-soft"
                        title="Delete the sample test assignment"
                      >
                        🗑️ Delete Test Assignment
                      </button>
                    </div>
                  )}
                </>
              )
            ) : (
              /* Past Synced Assignments Tab */
              <div className="assignments-list">
                {pastAssignments.map((assignment) => (
                  <div key={assignment._id || assignment.googleAssignmentId} className="assignment-item" style={{ opacity: 0.85 }}>
                    <div className="assignment-main">
                      <h4 className="assignment-title">{assignment.title}</h4>
                      <div className="assignment-meta">
                        <span className="course-badge">{assignment.courseName}</span>
                        <span className="reminder-badge badge-not-applicable">
                          ⚪ Past Deadline
                        </span>
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
                      <span className="due-date-text" style={{ color: '#80868b' }}>
                        Due: {formatDueDate(assignment.dueDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* System Architecture / Info */}
        <section className="dashboard-card">
          <h3 className="section-title">How Automatic 3-Hour Email Reminders Work</h3>
          <div className="info-grid">
            <div className="info-card">
              <h4>1. Smart 3-Hour Window</h4>
              <p>Calculates reminder time (due date minus 3 hours). The cron scheduler checks pending alerts every minute.</p>
            </div>
            <div className="info-card">
              <h4>2. Atomic Deduplication</h4>
              <p>Uses atomic MongoDB locks to ensure students receive exactly one reminder email per assignment.</p>
            </div>
            <div className="info-card">
              <h4>3. Resilient Delivery</h4>
              <p>Gmail SMTP with automatic retry tracking, detailed error diagnostics, and test email verification.</p>
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
