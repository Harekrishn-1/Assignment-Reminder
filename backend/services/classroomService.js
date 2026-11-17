const { google } = require('googleapis');
const Assignment = require('../models/Assignment');

/**
 * Creates an authorized OAuth2 client using the user's stored tokens.
 * Listens for token refresh events to automatically persist updated access tokens.
 */
const getOAuth2Client = (user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID?.trim(),
    process.env.GOOGLE_CLIENT_SECRET?.trim(),
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback'
  );

  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken || undefined,
  });

  // Automatically persist refreshed tokens to MongoDB
  oauth2Client.on('tokens', async (tokens) => {
    try {
      if (tokens.access_token) {
        user.accessToken = tokens.access_token;
      }
      if (tokens.refresh_token) {
        user.refreshToken = tokens.refresh_token;
      }
      await user.save();
      console.log(`[Google Classroom] Access token refreshed automatically for user ${user._id}`);
    } catch (saveErr) {
      console.error('[Google Classroom] Error saving refreshed token:', saveErr.message);
    }
  });

  return oauth2Client;
};

/**
 * Fetches active courses and coursework for the given student user,
 * then saves them into MongoDB without duplicates and schedules reminders.
 */
const syncClassroomAssignments = async (user) => {
  if (!user || !user.accessToken) {
    throw new Error('User not authenticated with Google or access token missing. Please sign in again.');
  }

  const oauth2Client = getOAuth2Client(user);
  const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

  // 1. Fetch courses where user is enrolled as a student
  let courses = [];
  try {
    const coursesResponse = await classroom.courses.list({
      studentId: 'me',
      courseStates: ['ACTIVE'],
    });
    courses = coursesResponse.data.courses || [];
  } catch (courseErr) {
    if (courseErr.code === 403) {
      throw new Error(
        'Google Classroom API is not enabled in your Google Cloud Console. Please enable "Google Classroom API" in APIs & Services.'
      );
    }
    if (courseErr.code === 401) {
      throw new Error('Google session expired or unauthorized. Please sign out and sign in again.');
    }
    throw new Error(`Failed to fetch courses from Google Classroom: ${courseErr.message}`);
  }

  if (courses.length === 0) {
    return { count: 0, coursesCount: 0, message: 'No active enrolled courses found in Google Classroom.' };
  }

  let totalSynced = 0;
  const now = new Date();

  // 2. Iterate through each enrolled course and fetch coursework
  for (const course of courses) {
    try {
      const courseworkResponse = await classroom.courses.courseWork.list({
        courseId: course.id,
        courseWorkStates: ['PUBLISHED'],
      });

      const courseWorks = courseworkResponse.data.courseWork || [];

      for (const cw of courseWorks) {
        // Parse due date and due time (Google Classroom returns UTC date/time)
        let dueDate = null;
        let reminderTime = null;
        let initialStatus = 'NOT_APPLICABLE';

        if (cw.dueDate && cw.dueDate.year && cw.dueDate.month && cw.dueDate.day) {
          const year = cw.dueDate.year;
          const month = cw.dueDate.month - 1; // JavaScript Date month is 0-indexed (0-11)
          const day = cw.dueDate.day;
          const hours = cw.dueTime?.hours || 23;
          const minutes = cw.dueTime?.minutes || 59;
          const seconds = cw.dueTime?.seconds || 0;

          dueDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));

          // Schedule reminder exactly 3 hours before the deadline
          reminderTime = new Date(dueDate.getTime() - 3 * 60 * 60 * 1000);

          // If reminderTime is strictly in the future, mark as SCHEDULED
          // If the 3-hour mark has already passed at sync time, mark as NOT_APPLICABLE so we don't send immediately
          if (reminderTime > now) {
            initialStatus = 'SCHEDULED';
          } else {
            initialStatus = 'NOT_APPLICABLE';
          }
        }

        // Check if assignment already exists
        const existing = await Assignment.findOne({
          googleAssignmentId: cw.id,
          userId: user._id.toString(),
        });

        const updateDoc = {
          googleAssignmentId: cw.id,
          userId: user._id.toString(),
          title: cw.title || 'Untitled Assignment',
          courseName: course.name || 'Untitled Course',
          dueDate: dueDate,
          alternateLink: cw.alternateLink || '',
          reminderTime: reminderTime,
        };

        if (!existing) {
          updateDoc.reminderStatus = initialStatus;
          updateDoc.reminderSent = false;
        } else if (existing.reminderStatus !== 'SENT') {
          // If not already sent, update status according to newly evaluated reminderTime
          if (existing.reminderStatus !== 'SENDING') {
            updateDoc.reminderStatus = initialStatus;
          }
        }

        // Upsert assignment in MongoDB (prevents duplicates per user & assignment ID)
        await Assignment.findOneAndUpdate(
          {
            googleAssignmentId: cw.id,
            userId: user._id.toString(),
          },
          { $set: updateDoc },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );

        totalSynced++;
      }
    } catch (cwErr) {
      console.warn(`[Google Classroom] Skipping course "${course.name}" (${course.id}): ${cwErr.message}`);
    }
  }

  return {
    count: totalSynced,
    coursesCount: courses.length,
    message: `Successfully synced ${totalSynced} assignment(s) across ${courses.length} course(s).`,
  };
};

module.exports = {
  syncClassroomAssignments,
};
