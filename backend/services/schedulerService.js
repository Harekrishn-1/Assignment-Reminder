const cron = require('node-cron');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { isEmailConfigured, sendReminderEmail } = require('./emailService');

let isProcessing = false;

/**
 * Checks for assignments that are due in 3 hours and dispatches automated reminder emails.
 * Uses atomic MongoDB operations to strictly prevent duplicate emails.
 */
const checkAndSendReminders = async () => {
  if (isProcessing) return; // Prevent overlapping runs
  isProcessing = true;

  try {
    const now = new Date();

    // Find assignments eligible for reminder:
    // 1. reminderStatus is 'SCHEDULED' or 'FAILED'
    // 2. reminderSent is false
    // 3. dueDate is strictly in the future (skip past deadlines)
    // 4. reminderTime exists and is <= now (the 3-hour mark has arrived)
    const eligibleAssignments = await Assignment.find({
      reminderStatus: { $in: ['SCHEDULED', 'FAILED'] },
      reminderSent: false,
      dueDate: { $gt: now },
      reminderTime: { $ne: null, $lte: now },
    });

    if (eligibleAssignments.length === 0) {
      isProcessing = false;
      return;
    }

    console.log(`\n[Scheduler] Found ${eligibleAssignments.length} pending assignment reminder(s) to process.`);

    for (const candidate of eligibleAssignments) {
      // Requirement: Do not send immediately if a real assignment was discovered after its 3-hour reminder mark passed.
      // Simulated test assignments (prefixed with 'test-') are specifically created for verification and should not be skipped.
      const isTestAssignment = Boolean(candidate.googleAssignmentId && candidate.googleAssignmentId.startsWith('test-'));
      if (!isTestAssignment && candidate.createdAt && candidate.createdAt > candidate.reminderTime) {
        console.log(`[Scheduler] Skipping "${candidate.title}" - discovered after its 3-hour reminder time had already passed.`);
        await Assignment.findByIdAndUpdate(candidate._id, {
          $set: { reminderStatus: 'NOT_APPLICABLE' },
        });
        continue;
      }

      // Atomic lock: Transition reminderStatus to 'SENDING'
      // If another process acquired it, findOneAndUpdate returns null, preventing duplicate emails.
      const lockedAssignment = await Assignment.findOneAndUpdate(
        {
          _id: candidate._id,
          reminderStatus: { $in: ['SCHEDULED', 'FAILED'] },
          reminderSent: false,
          dueDate: { $gt: now },
        },
        {
          $set: { reminderStatus: 'SENDING' },
        },
        { new: true }
      );

      if (!lockedAssignment) {
        continue; // Already locked or processed by another run
      }

      try {
        // Retrieve recipient student user
        const user = await User.findById(lockedAssignment.userId);
        if (!user || !user.email) {
          throw new Error('Student user or Google email address not found in database.');
        }

        if (!isEmailConfigured()) {
          throw new Error('Gmail SMTP credentials not configured (EMAIL_USER / EMAIL_APP_PASSWORD).');
        }

        console.log(`[Scheduler] Dispatching 3-hour reminder for "${lockedAssignment.title}" to ${user.email}...`);
        await sendReminderEmail(user.email, user.displayName, lockedAssignment);

        // Mark as SENT only after successful email delivery
        await Assignment.findByIdAndUpdate(lockedAssignment._id, {
          $set: {
            reminderSent: true,
            reminderStatus: 'SENT',
            reminderSentAt: new Date(),
            reminderError: null,
          },
        });

        console.log(`[Scheduler] ✅ Reminder successfully delivered to ${user.email} for "${lockedAssignment.title}".`);
      } catch (sendErr) {
        console.error(`[Scheduler] ❌ Delivery failed for "${lockedAssignment.title}":`, sendErr.message);

        // On failure, mark as FAILED so it can be retried safely without duplicate emails
        await Assignment.findByIdAndUpdate(lockedAssignment._id, {
          $set: {
            reminderSent: false,
            reminderStatus: 'FAILED',
            reminderError: sendErr.message,
          },
        });
      }
    }
  } catch (error) {
    console.error('[Scheduler Error]', error.message);
  } finally {
    isProcessing = false;
  }
};

/**
 * Initializes the node-cron scheduled job to run every minute
 */
const startReminderScheduler = () => {
  console.log('[Scheduler] Initializing automated reminder cron job (running every minute: * * * * *)...');
  const task = cron.schedule('* * * * *', () => {
    checkAndSendReminders();
  });
  return task;
};

module.exports = {
  checkAndSendReminders,
  startReminderScheduler,
};
