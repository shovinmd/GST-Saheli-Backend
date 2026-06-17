const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sendReportEmail } = require('../services/emailService');

// POST /api/user/report - Send email report to user
router.post('/report', auth, async (req, res) => {
  try {
    const { email, name, points, streak, badgesCount } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    }

    const reportDetails = {
      points: points !== undefined ? points : 100,
      streak: streak !== undefined ? streak : 1,
      badgesCount: badgesCount !== undefined ? badgesCount : 0
    };

    const result = await sendReportEmail(
      email, 
      name || 'GST Saheli Member', 
      reportDetails
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Progress report emailed successfully.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send progress report email.',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in user report route:', error);
    return res.status(500).json({ success: false, message: 'Server error during report email sending.' });
  }
});

// POST /api/user/profile - Update user profile details (like photoUrl)
router.post('/profile', auth, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    const firebaseUid = req.user.uid;
    const User = require('../models/User');

    let user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (photoUrl !== undefined) {
      user.photoUrl = photoUrl;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
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
    console.error('Error updating user profile:', error);
    return res.status(500).json({ success: false, message: 'Server error during profile update.' });
  }
});

module.exports = router;
