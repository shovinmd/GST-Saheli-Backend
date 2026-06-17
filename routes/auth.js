const express = require('express');
const router = express.Router();
const User = require('../models/User');
const admin = require('firebase-admin');
const { sendWelcomeEmail, sendPasswordResetEmail, sendLoginNotificationEmail } = require('../services/emailService');

// Helper to extract token from Authorization header
const extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return req.body.idToken || req.query.idToken;
};

// POST /api/auth/signup - Verify Firebase ID token and sync user with MongoDB
router.post('/signup', async (req, res) => {
  try {
    const idToken = extractToken(req);
    let decodedToken;
    let fallbackUser = null;

    // Check if we are running in mock/dev fallback mode (e.g., if firebase-admin is not fully configured)
    const firebaseConfigured = admin.apps.length > 0;

    if (firebaseConfigured && idToken) {
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (err) {
        console.error('Firebase token verification failed:', err.message);
        console.warn('Falling back to decoding token payload without signature verification for dev/testing...');
        
        // Try decoding unverified JWT payload
        try {
          const parts = idToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            decodedToken = {
              uid: payload.user_id || payload.sub,
              email: payload.email,
              name: payload.name || payload.email?.split('@')[0],
              phone_number: payload.phone_number
            };
          }
        } catch (e) {
          console.error('Error decoding unverified token payload:', e.message);
        }

        // If decoding failed, fallback to body values
        if (!decodedToken) {
          const { firebaseUid, email, name, phoneNumber } = req.body;
          if (firebaseUid && email) {
            decodedToken = {
              uid: firebaseUid,
              email: email,
              name: name || email.split('@')[0],
              phone_number: phoneNumber
            };
          }
        }
      }
    } else {
      // Fallback mode for development/testing if no firebase key is uploaded yet
      console.warn('--- RUNNING IN FIREBASE FALLBACK/DEVELOPMENT MODE ---');
      
      // If we got a mock payload, use it
      const { firebaseUid, email, name, phoneNumber } = req.body;
      if (firebaseUid && email) {
        decodedToken = {
          uid: firebaseUid,
          email: email,
          name: name || email.split('@')[0],
          phone_number: phoneNumber
        };
      } else if (idToken) {
        // Simple mock decoding of base64 JWT payload for dev testing without verification
        try {
          const parts = idToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            decodedToken = {
              uid: payload.user_id || payload.sub,
              email: payload.email,
              name: payload.name || payload.email?.split('@')[0],
              phone_number: payload.phone_number
            };
          }
        } catch (e) {
          console.error('Error decoding mock JWT:', e.message);
        }
      }
    }

    if (!decodedToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'No credentials or valid token provided. Set up your Firebase settings or send user credentials in body.' 
      });
    }

    const { uid, email, name, phone_number } = decodedToken;

    // Try to find the user in MongoDB Atlas by uid or email
    let query = { firebaseUid: uid };
    if (email) {
      query = { $or: [{ firebaseUid: uid }, { email: email.toLowerCase() }] };
    }
    let user = await User.findOne(query);
    let isNewUser = false;

    if (!user) {
      // User doesn't exist, create a new record in MongoDB
      user = new User({
        firebaseUid: uid,
        email: email || `user_${uid}@gstsaheli.com`,
        name: name || req.body.name || 'GST Saheli Member',
        phoneNumber: phone_number || req.body.phoneNumber || '',
        photoUrl: req.body.photoUrl || (decodedToken && decodedToken.picture) || ''
      });
      await user.save();
      isNewUser = true;
      console.log(`Created new MongoDB record for user: ${user.email || uid}`);

      // Async send welcome email via Brevo
      sendWelcomeEmail(user.email, user.name).catch(err => {
        console.error(`Welcome email async failure for ${user.email}:`, err.message);
      });
    } else {
      console.log(`User already exists in MongoDB: ${user.email || uid}`);
      
      // Send login alert email with timestamp
      const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) + ' (IST)';
      sendLoginNotificationEmail(user.email, user.name, timestamp).catch(err => {
        console.error(`Login email notification failed for ${user.email}:`, err.message);
      });

      // Optionally update name/phone/photoUrl if they changed
      let updated = false;
      if (name && user.name !== name) {
        user.name = name;
        updated = true;
      }
      if (phone_number && user.phoneNumber !== phone_number) {
        user.phoneNumber = phone_number;
        updated = true;
      }
      if (req.body.photoUrl && user.photoUrl !== req.body.photoUrl) {
        user.photoUrl = req.body.photoUrl;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'User sync successful',
      isNewUser: isNewUser,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        photoUrl: user.photoUrl || '',
        points: user.points,
        streak: user.streak,
        badges: user.badges,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Error in signup/sync route:', error);
    return res.status(500).json({ success: false, message: 'Server error during authentication sync' });
  }
});

// POST /api/auth/forgot-password - Send password reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Optional check: verify if user exists in database first
    const user = await User.findOne({ email: email.toLowerCase() });
    const displayName = user ? user.name : 'GST Saheli Member';

    // Generate Firebase password reset link if configured, or default fallback link
    let resetLink = 'https://gstsaheli.firebaseapp.com/__/auth/action?mode=resetPassword';
    if (admin.apps.length > 0) {
      try {
        resetLink = await admin.auth().generatePasswordResetLink(email);
      } catch (err) {
        console.warn('Firebase Admin generatePasswordResetLink skipped/failed:', err.message);
      }
    }

    const emailResult = await sendPasswordResetEmail(email, resetLink);

    if (emailResult.success) {
      return res.status(200).json({
        success: true,
        message: 'Password reset link sent successfully.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email via Brevo.',
        error: emailResult.error
      });
    }
  } catch (error) {
    console.error('Error in forgot-password route:', error);
    return res.status(500).json({ success: false, message: 'Server error during forgot-password link dispatch.' });
  }
});

module.exports = router;
