import nodemailer from "nodemailer";
import {
  escapeHtml,
  sanitizeEmail,
  sanitizeSingleLineText,
  validateEmail,
} from "./validation";

// Email configuration interface
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
    contentType?: string;
  }>;
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send email
 * @param options - Email options
 * @returns Promise with email result
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const recipients = (Array.isArray(options.to) ? options.to : [options.to]).map(
      (recipient) => sanitizeEmail(recipient)
    );
    if (recipients.some((recipient) => !validateEmail(recipient))) {
      throw new Error("Invalid email recipient");
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: Array.isArray(options.to) ? recipients : recipients[0],
      subject: sanitizeSingleLineText(options.subject, 200),
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}

/**
 * Send team registration confirmation email
 * @param teamName - Name of the team
 * @param leaderName - Name of the team leader
 * @param leaderEmail - Email of the team leader
 * @param problemStatement - Selected problem statement
 */
export async function sendTeamRegistrationEmail(
  teamName: string,
  leaderName: string,
  leaderEmail: string,
  problemStatement: string
): Promise<void> {
  const safeTeamName = escapeHtml(teamName);
  const safeLeaderName = escapeHtml(leaderName);
  const safeProblemStatement = escapeHtml(problemStatement);
  const subject = `SIH 2026 - Team Registration Confirmed: ${sanitizeSingleLineText(
    teamName,
    80
  )}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>SIH Registration Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .highlight { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Registration Confirmed!</h1>
                <p>Smart India Hackathon 2026</p>
            </div>
            <div class="content">
                <h2>Hello ${safeLeaderName},</h2>
                <p>Congratulations! Your team <strong>"${safeTeamName}"</strong> has been successfully registered for the Smart India Hackathon 2026.</p>
                
                <div class="highlight">
                    <h3>📋 Registration Details:</h3>
                    <ul>
                        <li><strong>Team Name:</strong> ${safeTeamName}</li>
                        <li><strong>Team Leader:</strong> ${safeLeaderName}</li>
                        <li><strong>Problem Statement:</strong> ${safeProblemStatement}</li>
                        <li><strong>Registration Date:</strong> ${new Date().toLocaleDateString(
                          "en-IN",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}</li>
                    </ul>
                </div>
                
                <p>🔗 <strong>Next Steps:</strong></p>
                <ol>
                    <li>Log in to your team portal to view any assigned tasks</li>
                    <li>Keep an eye on your email for updates from the SIH team</li>
                    <li>Prepare your solution for the selected problem statement</li>
                </ol>
                
                <p>If you have any questions, please don't hesitate to contact our support team.</p>
                
                <p>Best of luck for the hackathon!</p>
                <p><strong>Team SIH 2026</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: leaderEmail,
    subject,
    html,
    text: `Hello ${sanitizeSingleLineText(leaderName, 100)}, Your team "${sanitizeSingleLineText(
      teamName,
      100
    )}" has been successfully registered for SIH 2026 with problem statement: ${sanitizeSingleLineText(
      problemStatement,
      200
    )}`,
  });
}

/**
 * Send task assignment notification email
 * @param teamName - Name of the team
 * @param leaderName - Name of the team leader
 * @param leaderEmail - Email of the team leader
 * @param taskTitle - Title of the assigned task
 * @param taskDescription - Description of the task
 * @param dueDate - Due date of the task (optional)
 */
export async function sendTaskAssignmentEmail(
  teamName: string,
  leaderName: string,
  leaderEmail: string,
  taskTitle: string,
  taskDescription?: string,
  dueDate?: Date
): Promise<void> {
  const safeTeamName = escapeHtml(teamName);
  const safeLeaderName = escapeHtml(leaderName);
  const safeTaskTitle = escapeHtml(taskTitle);
  const safeTaskDescription = taskDescription
    ? escapeHtml(taskDescription)
    : "";
  const subject = `SIH 2026 - New Task Assigned: ${sanitizeSingleLineText(
    taskTitle,
    100
  )}`;
  const dueDateText = dueDate
    ? `<li><strong>Due Date:</strong> ${dueDate.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}</li>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>SIH Task Assignment</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .highlight { background: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📝 New Task Assigned</h1>
                <p>Smart India Hackathon 2026</p>
            </div>
            <div class="content">
                <h2>Hello ${safeLeaderName},</h2>
                <p>A new task has been assigned to your team <strong>"${safeTeamName}"</strong>.</p>
                
                <div class="highlight">
                    <h3>📋 Task Details:</h3>
                    <ul>
                        <li><strong>Task:</strong> ${safeTaskTitle}</li>
                        ${
                          taskDescription
                            ? `<li><strong>Description:</strong> ${safeTaskDescription}</li>`
                            : ""
                        }
                        ${dueDateText}
                    </ul>
                </div>
                
                <p>🔗 Please log in to your team portal to view the complete task details and submit your response.</p>
                
                <p>If you have any questions about this task, please contact the SIH team.</p>
                
                <p>Best regards,</p>
                <p><strong>Team SIH 2026</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: leaderEmail,
    subject,
    html,
    text: `Hello ${sanitizeSingleLineText(leaderName, 100)}, A new task "${sanitizeSingleLineText(
      taskTitle,
      100
    )}" has been assigned to your team "${sanitizeSingleLineText(
      teamName,
      100
    )}".${
      taskDescription ? ` ${sanitizeSingleLineText(taskDescription, 1000)}` : ""
    }`,
  });
}
