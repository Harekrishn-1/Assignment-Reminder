const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const { syncClassroomAssignments } = require('../services/classroomService');
const { isEmailConfigured, sendTestEmail } = require('../services/emailService');
const { checkAndSendReminders } = require('../services/schedulerService');

// Middleware to ensure user is logged in
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({
    success: false,
    error: 'Unauthorized. Please sign in with your Google account.',
  });
};

/**
 * POST /api/assignments/sync
 * Fetches courses and coursework from Google Classroom and saves them to MongoDB.
 */
router.post('/sync', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User record not found.' });
    }

    const result = await syncClassroomAssignments(user);

    return res.status(200).json({
      success: true,
      count: result.count,
      coursesCount: result.coursesCount,
      message: result.message,
    });
  } catch (error) {
    console.error('[Sync Route Error]', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync assignments with Google Classroom.',
    });
  }
});

/**
 * POST /api/assignments/test-email
 * Sends a test confirmation email to the student's registered Google email.
 * Does NOT modify any assignment reminder status.
 */
router.post('/test-email', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.email) {
      return res.status(404).json({
        success: false,
        error: 'Student user or Google email not found in database.',
      });
    }

    if (!isEmailConfigured()) {
      return res.status(400).json({
        success: false,
        error:
          'Email service credentials not configured. Please add EMAIL_USER and EMAIL_APP_PASSWORD to backend/.env',
      });
    }

    await sendTestEmail(user.email, user.displayName);

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${user.email}!`,
    });
  } catch (error) {
    console.error('[Test Email Route Error]', error.message);
    return res.status(500).json({
      success: false,
      error: `Failed to deliver test email: ${error.message}`,
    });
  }
});

/**
 * POST /api/assignments/create-test
 * Creates a sample upcoming assignment with a configurable short reminder delay (e.g. 1 minute)
 * so students can test the full automated reminder pipeline without waiting 3 hours.
 * Production logic remains untouched: real Google Classroom assignments still use 3 hours before due date.
 */
router.post('/create-test', ensureAuth, async (req, res) => {
  try {
    const configuredDelay = parseInt(process.env.REMINDER_TEST_DELAY_MINUTES || '1', 10);
    const delayMinutes = req.body?.delayMinutes !== undefined
      ? Math.max(1, parseInt(req.body.delayMinutes, 10))
      : (configuredDelay > 0 ? configuredDelay : 1);

    const now = new Date();
    // Schedule reminder to fire in delayMinutes (e.g. 1 minute from now)
    const reminderTime = new Date(now.getTime() + delayMinutes * 60 * 1000);
    // Real production deadline is 3 hours after reminderTime, mimicking real 3-hour deadline reminder logic
    const dueDate = new Date(reminderTime.getTime() + 3 * 60 * 60 * 1000);

    // Remove any previous test assignments for this user
    await Assignment.deleteMany({
      userId: req.user._id.toString(),
      googleAssignmentId: { $regex: '^test-' },
    });

    const testAssignment = await Assignment.create({
      googleAssignmentId: `test-${Date.now()}`,
      userId: req.user._id.toString(),
      title: `[TEST] Demo Assignment (Reminder in ${delayMinutes} min)`,
      courseName: 'MCA Pattern Recognition',
      dueDate: dueDate,
      reminderTime: reminderTime,
      reminderStatus: 'SCHEDULED',
      reminderSent: false,
      alternateLink: 'https://classroom.google.com',
    });

    console.log(
      `[Test Mode] Created test assignment "${testAssignment.title}". Reminder will fire automatically at ${reminderTime.toLocaleTimeString()} (in ${delayMinutes} min).`
    );

    return res.status(201).json({
      success: true,
      message: `Sample upcoming assignment created! Automated reminder will be sent in ${delayMinutes} minute(s) at ${reminderTime.toLocaleTimeString()}.`,
      assignment: testAssignment,
      delayMinutes,
      reminderTime,
    });
  } catch (error) {
    console.error('[Create Test Assignment Error]', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create test assignment.',
    });
  }
});

/**
 * POST /api/assignments/trigger-reminders
 * Immediately runs the reminder checker instead of waiting for the 1-minute cron tick.
 */
router.post('/trigger-reminders', ensureAuth, async (req, res) => {
  try {
    await checkAndSendReminders();
    return res.status(200).json({
      success: true,
      message: 'Automatic reminder check triggered! Check server log & inbox.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger reminder check.',
    });
  }
});

/**
 * DELETE /api/assignments/test
 * Deletes any simulated test assignments.
 */
router.delete('/test', ensureAuth, async (req, res) => {
  try {
    await Assignment.deleteMany({
      userId: req.user._id.toString(),
      googleAssignmentId: { $regex: '^test-' },
    });
    return res.status(200).json({
      success: true,
      message: 'Simulated test assignments removed.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete test assignments.',
    });
  }
});

/**
 * GET /api/assignments
 * Returns both upcoming and past assignments for the authenticated student.
 */
router.get('/', ensureAuth, async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user._id.toString();

    // 1. Upcoming assignments: deadline strictly in future, nearest deadline first
    const upcoming = await Assignment.find({
      userId,
      dueDate: { $ne: null, $gte: now },
    }).sort({
      dueDate: 1,
    });

    // 2. Past assignments: deadline in past or null, most recent past first
    const past = await Assignment.find({
      userId,
      $or: [{ dueDate: { $lt: now } }, { dueDate: null }],
    }).sort({
      dueDate: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      upcomingCount: upcoming.length,
      pastCount: past.length,
      totalCount: upcoming.length + past.length,
      assignments: upcoming,
      pastAssignments: past,
      emailConfigured: isEmailConfigured(),
      testMode: process.env.REMINDER_TEST_MODE === 'true',
      testDelayMinutes: parseInt(process.env.REMINDER_TEST_DELAY_MINUTES || '1', 10),
    });
  } catch (error) {
    console.error('[Get Assignments Error]', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve assignments.',
    });
  }
});

module.exports = router;
