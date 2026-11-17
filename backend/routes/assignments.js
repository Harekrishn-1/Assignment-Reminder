const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const { syncClassroomAssignments } = require('../services/classroomService');

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
    // Retrieve full user record with tokens
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
 * GET /api/assignments
 * Returns upcoming assignments for the authenticated student.
 * Filters strictly where dueDate >= now, sorted by nearest deadline first.
 * Does NOT delete past assignments from MongoDB.
 */
router.get('/', ensureAuth, async (req, res) => {
  try {
    const now = new Date();
    const filterQuery = { userId: req.user._id.toString() };

    // Default to showing only upcoming assignments (dueDate >= current time)
    if (req.query.all !== 'true') {
      filterQuery.dueDate = { $ne: null, $gte: now };
    }

    const assignments = await Assignment.find(filterQuery).sort({
      dueDate: 1, // Ascending: nearest deadline first
    });

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
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
