const nodemailer = require('nodemailer');

/**
 * Checks whether Gmail SMTP credentials are configured in environment
 */
const isEmailConfigured = () => {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_APP_PASSWORD?.trim();
  return Boolean(user && pass && !user.includes('your_email') && !pass.includes('your_'));
};

/**
 * Creates a Nodemailer transport using Gmail SMTP
 */
const getTransporter = () => {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_APP_PASSWORD?.trim();

  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_APP_PASSWORD must be configured in backend/.env');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Sends a professional 3-hour deadline reminder email to the student
 */
const sendReminderEmail = async (studentEmail, studentName, assignment) => {
  const transporter = getTransporter();

  const formattedDueDate = assignment.dueDate
    ? new Date(assignment.dueDate).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      })
    : 'No due date set';

  const assignmentUrl = assignment.alternateLink || 'https://classroom.google.com';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; color: #202124; }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e8eaed; }
        .email-header { background: #1a73e8; color: #ffffff; padding: 24px; text-align: center; }
        .email-header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
        .email-body { padding: 32px 28px; }
        .alert-badge { display: inline-block; background-color: #fce8e6; color: #c5221f; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 20px; margin-bottom: 20px; }
        .assignment-card { background: #f8f9fa; border: 1px solid #dadce0; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { margin-bottom: 12px; }
        .detail-label { font-size: 12px; text-transform: uppercase; color: #5f6368; font-weight: 600; margin-bottom: 2px; }
        .detail-value { font-size: 16px; color: #202124; font-weight: 600; }
        .btn-action { display: inline-block; background: #1a73e8; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-top: 15px; text-align: center; }
        .email-footer { background: #f8f9fa; border-top: 1px solid #e8eaed; padding: 18px; text-align: center; font-size: 12px; color: #5f6368; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>Assignment Reminder</h1>
        </div>
        <div class="email-body">
          <div class="alert-badge">⏰ DEADLINE IN 3 HOURS</div>
          <p style="font-size: 16px; margin-top: 0;">Hello <strong>${studentName || 'Student'}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #3c4043;">
            This is an automated reminder that your assignment is due in <strong>3 hours</strong>. Please make sure to complete and submit your work before the deadline!
          </p>

          <div class="assignment-card">
            <div class="detail-row">
              <div class="detail-label">Assignment Title</div>
              <div class="detail-value">${assignment.title}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Course</div>
              <div class="detail-value">${assignment.courseName}</div>
            </div>
            <div class="detail-row" style="margin-bottom: 0;">
              <div class="detail-label">Submission Deadline</div>
              <div class="detail-value" style="color: #c5221f;">${formattedDueDate}</div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="${assignmentUrl}" target="_blank" class="btn-action">
              Open in Google Classroom ↗
            </a>
          </div>
        </div>
        <div class="email-footer">
          <p style="margin: 0;">Sent automatically by Assignment Reminder &bull; NIT Jamshedpur</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Assignment Reminder" <${process.env.EMAIL_USER?.trim()}>`,
    to: studentEmail,
    subject: `🚨 [Urgent: 3 Hours Left] Assignment Due: ${assignment.title} (${assignment.courseName})`,
    html: htmlContent,
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Sends a test verification email to confirm Gmail SMTP is working properly
 */
const sendTestEmail = async (studentEmail, studentName) => {
  const transporter = getTransporter();

  const mailOptions = {
    from: `"Assignment Reminder" <${process.env.EMAIL_USER?.trim()}>`,
    to: studentEmail,
    subject: `✅ [Test Successful] Assignment Reminder Email Service`,
    html: `
      <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1a73e8; margin-top: 0;">Assignment Reminder Email Service Active</h2>
        <p>Hello <strong>${studentName || 'Student'}</strong>,</p>
        <p>This is a test notification confirming that your <strong>Nodemailer Gmail SMTP service</strong> is configured properly!</p>
        <div style="background: #e6f4ea; border-left: 4px solid #137333; padding: 12px; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #137333;">Status: Ready</strong><br>
          <span style="font-size: 14px; color: #3c4043;">You will receive automated emails exactly 3 hours before upcoming Google Classroom assignment deadlines.</span>
        </div>
        <p style="font-size: 12px; color: #888;">This test email does not affect any assignment reminder status.</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  isEmailConfigured,
  sendReminderEmail,
  sendTestEmail,
};
