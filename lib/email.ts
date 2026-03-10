import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Email not sent.');
    return { error: 'Email service not configured' };
  }

  try {
    const result = await getResend().emails.send({
      from: from ?? 'SMM Hub <onboarding@resend.dev>',
      to,
      subject,
      html,
      text,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { error: 'Failed to send email', details: error };
  }
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(to: string, userName: string) {
  return sendEmail({
    to,
    subject: 'Welcome to SMM Hub!',
    html: `
      <h1>Welcome to SMM Hub!</h1>
      <p>Hi ${userName},</p>
      <p>Thanks for joining our platform. We're excited to have you on board!</p>
      <p>Get started by exploring our features and setting up your first campaign.</p>
      <p>Best regards,<br/>The SMM Hub Team</p>
    `,
    text: `Hi ${userName},\n\nWelcome to SMM Hub! Thanks for joining our platform.\n\nBest regards,\nThe SMM Hub Team`,
  });
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(to: string, userName: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: 'Reset Your Password',
    html: `
      <h1>Password Reset Request</h1>
      <p>Hi ${userName},</p>
      <p>You requested to reset your password. Click the button below to proceed:</p>
      <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
    text: `Hi ${userName},\n\nYou requested to reset your password. Use this link: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });
}
