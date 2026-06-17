const https = require('https');

/**
 * Utility function to send an email via Brevo transactional SMTP endpoint
 */
const sendBrevoEmail = (payload) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ message: 'Success (no json response)' });
          }
        } else {
          reject(new Error(`Brevo API returned status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
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
            <p>Thank you for registering on <strong>GST Saheli</strong>, the gamified learning platform created specifically to empower women entrepreneurs to master GST filing, invoicing, and tax concepts.</p>
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
    console.log(`Welcome email successfully sent to ${email}. Message ID:`, res.messageId);
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
    console.log(`Password reset email successfully sent to ${email}. Message ID:`, res.messageId);
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
    console.log(`Progress report successfully sent to ${email}. Message ID:`, res.messageId);
    return { success: true, response: res };
  } catch (error) {
    console.error(`Error sending progress report email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendReportEmail
};
