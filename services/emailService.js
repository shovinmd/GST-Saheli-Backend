const nodemailer = require('nodemailer');

// Initialize SMTP transporter if configured in environment variables
let transporter = null;
const smtpConfigured =
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS);
const brevoApiConfigured = Boolean(process.env.BREVO_API_KEY);
const allowBrevoApiFallback = process.env.ALLOW_BREVO_API_FALLBACK === 'true';

if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log(`SMTP email dispatcher initialized successfully for host: ${process.env.SMTP_HOST}`);
} else {
  console.log('SMTP is not configured. Email dispatch will use the Brevo HTTP REST API if available.');
}

/**
 * Utility function to send an email via SMTP or fallback to Brevo HTTP API.
 * SMTP protocol is highly recommended to bypass IP restrictions.
 */
const sendBrevoEmail = async (payload, retries = 2) => {
  // If SMTP configurations are available, use them directly (bypasses Brevo API IP restrictions)
  if (transporter) {
    try {
      const fromName = payload.sender?.name || process.env.SENDER_NAME || 'GST Saheli';
      const fromEmail = payload.sender?.email || process.env.SENDER_EMAIL || 'no-reply@gstsaheli.com';
      const toEmails = payload.to.map(t => `"${t.name || ''}" <${t.email}>`).join(', ');

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: toEmails,
        subject: payload.subject,
        html: payload.htmlContent
      });

      return { messageId: info.messageId || 'smtp-success', provider: 'smtp' };
    } catch (err) {
      console.error('SMTP direct dispatch failed:', err.message);
      if (!allowBrevoApiFallback) {
        throw new Error(
          `SMTP dispatch failed and REST fallback is disabled to avoid Brevo IP verification issues: ${err.message}`,
        );
      }
    }
  }

  if (!brevoApiConfigured) {
    if (smtpConfigured) {
      throw new Error('SMTP dispatch failed and no Brevo API key is configured for fallback.');
    }
    throw new Error('No email provider is configured. Set SMTP_* variables or BREVO_API_KEY.');
  }

  // Fallback to Brevo REST API
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const body = await response.text();
      if (response.ok) {
        try {
          return { ...JSON.parse(body), provider: 'brevo-api' };
        } catch (e) {
          return { message: 'Success', provider: 'brevo-api' };
        }
      } else {
        throw new Error(`Brevo API returned status ${response.status}: ${body}`);
      }
    } catch (err) {
      if (i === retries) {
        throw err;
      }
      console.warn(`Transient email dispatch failure (attempt ${i + 1}/${retries + 1}): ${err.message}. Retrying...`);
      // Short delay before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
};

/**
 * Sends a welcome email to a new user
 */
const sendWelcomeEmail = async (email, name) => {
  const payload = {
    sender: {
      name: process.env.SENDER_NAME || 'GST Saheli Team',
      email: process.env.SENDER_EMAIL || 'no-reply@gstsaheli.com'
    },
    to: [
      {
        email: email,
        name: name
      }
    ],
    subject: `Welcome to GST Saheli, ${name}! 🎉`,
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #8E24AA 0%, #D81B60 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">GST Saheli</h1>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <h2 style="color: #4A148C; margin-top: 0;">Welcome, ${name}!</h2>
            <p><strong>Thank you for registering. Begin your learning!</strong></p>
            <p>GST Saheli is the gamified learning platform created specifically to empower women entrepreneurs to master GST filing, invoicing, and tax concepts.</p>
            <p>Here are your account details for getting started:</p>
            <ul style="padding-left: 20px;">
              <li><strong>Registered Email:</strong> ${email}</li>
              <li><strong>Welcome Reward:</strong> 100 XP Coins</li>
            </ul>
            <p>You can now start learning modules like "GST Basics" and playing billing challenges to earn badges and streak points.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background: #D81B60; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 24px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(216,27,96,0.25);">Start Learning Now</a>
            </div>
            <p>Best regards,<br><strong>The GST Saheli Team</strong></p>
          </div>
          <div style="background: #f9f9f9; padding: 12px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #777;">
            &copy; ${new Date().getFullYear()} GST Saheli. All rights reserved.
          </div>
        </body>
      </html>
    `
  };

  try {
    const res = await sendBrevoEmail(payload);
    console.log(
      `Welcome email successfully sent to ${email} via ${res.provider}. Message ID:`,
      res.messageId,
    );
    return { success: true, response: res };
  } catch (error) {
    console.error(`Error sending welcome email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a password reset request email
 */
const sendPasswordResetEmail = async (email, resetLink) => {
  const payload = {
    sender: {
      name: process.env.SENDER_NAME || 'GST Saheli Team',
      email: process.env.SENDER_EMAIL || 'no-reply@gstsaheli.com'
    },
    to: [
      {
        email: email,
        name: 'GST Saheli User'
      }
    ],
    subject: 'Reset your GST Saheli Password 🔑',
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #8E24AA 0%, #D81B60 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">GST Saheli Support</h1>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <h2 style="color: #4A148C; margin-top: 0;">Password Reset Request</h2>
            <p>We received a request to reset the password for your GST Saheli account associated with <strong>${email}</strong>.</p>
            <p>Please click the button below to choose a new password. This reset link will expire shortly.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #8E24AA; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 24px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(142,36,170,0.25);">Reset Password</a>
            </div>
            <p>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            <p>Best regards,<br><strong>The GST Saheli Team</strong></p>
          </div>
          <div style="background: #f9f9f9; padding: 12px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #777;">
            &copy; ${new Date().getFullYear()} GST Saheli. All rights reserved.
          </div>
        </body>
      </html>
    `
  };

  try {
    const res = await sendBrevoEmail(payload);
    console.log(
      `Password reset email successfully sent to ${email} via ${res.provider}. Message ID:`,
      res.messageId,
    );
    return { success: true, response: res };
  } catch (error) {
    console.error(`Error sending password reset email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends progress reports to the user
 */
const sendReportEmail = async (email, name, progressDetails) => {
  const payload = {
    sender: {
      name: process.env.SENDER_NAME || 'GST Saheli Team',
      email: process.env.SENDER_EMAIL || 'no-reply@gstsaheli.com'
    },
    to: [
      {
        email: email,
        name: name
      }
    ],
    subject: 'Your GST Saheli Learning Report 📊',
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #8E24AA 0%, #D81B60 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">GST Learning Progress</h1>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <h2 style="color: #4A148C; margin-top: 0;">Hi ${name}, here is your learning progress!</h2>
            <p>Keep up the great work! Below is a summary of your achievements and learning stats in <strong>GST Saheli</strong>:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f9f9f9; border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: bold; color: #555;">Metric</td>
                <td style="padding: 12px; font-weight: bold; color: #555; text-align: right;">Status</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; color: #555;">XP Coins Earned</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #D81B60;">${progressDetails.points} XP</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; color: #555;">Active Study Streak</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #8E24AA;">${progressDetails.streak} Days</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; color: #555;">Badges Earned</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #555;">${progressDetails.badgesCount} Badges</td>
              </tr>
            </table>

            <p>Ready to unlock more levels? Log in to your app today to continue solving tax calculations and claiming awards.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background: #D81B60; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 24px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(216,27,96,0.25);">Open GST Saheli</a>
            </div>
            <p>Best regards,<br><strong>The GST Saheli Team</strong></p>
          </div>
          <div style="background: #f9f9f9; padding: 12px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #777;">
            &copy; ${new Date().getFullYear()} GST Saheli. All rights reserved.
          </div>
        </body>
      </html>
    `
  };

  try {
    const res = await sendBrevoEmail(payload);
    console.log(
      `Progress report successfully sent to ${email} via ${res.provider}. Message ID:`,
      res.messageId,
    );
    return { success: true, response: res };
  } catch (error) {
    console.error(`Error sending progress report email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a login notification email with timestamp
 */
const sendLoginNotificationEmail = async (email, name, timestamp) => {
  const payload = {
    sender: {
      name: process.env.SENDER_NAME || 'GST Saheli Team',
      email: process.env.SENDER_EMAIL || 'no-reply@gstsaheli.com'
    },
    to: [
      {
        email: email,
        name: name
      }
    ],
    subject: 'New Login Detected on GST Saheli 🔐',
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #8E24AA 0%, #D81B60 100%); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">GST Saheli Security</h1>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <h2 style="color: #4A148C; margin-top: 0;">Hi ${name},</h2>
            <p>We detected a new login to your <strong>GST Saheli</strong> account on:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 14px; margin: 15px 0; border-left: 4px solid #8E24AA;">
              <strong>Time:</strong> ${timestamp}<br>
              <strong>Status:</strong> Success
            </div>
            <p>If this was you, you can safely disregard this email. Happy learning!</p>
            <p>If you did not authorize this login, please contact our support immediately.</p>
            <p>Best regards,<br><strong>The GST Saheli Team</strong></p>
          </div>
          <div style="background: #f9f9f9; padding: 12px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #777;">
            &copy; ${new Date().getFullYear()} GST Saheli. All rights reserved.
          </div>
        </body>
      </html>
    `
  };

  try {
    const res = await sendBrevoEmail(payload);
    console.log(
      `Login notification email successfully sent to ${email} via ${res.provider}. Message ID:`,
      res.messageId,
    );
    return { success: true, response: res };
  } catch (error) {
    console.error(`Error sending login notification email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendReportEmail,
  sendLoginNotificationEmail
};
