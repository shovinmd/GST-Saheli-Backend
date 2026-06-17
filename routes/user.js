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

// POST /api/user/practice - Submit quiz score and award points
router.post('/practice', auth, async (req, res) => {
  try {
    const { quizTitle, score, totalQuestions, pointsEarned } = req.body;
    const firebaseUid = req.user.uid;

    if (!quizTitle || score === undefined || pointsEarned === undefined) {
      return res.status(400).json({ success: false, message: 'Missing practice results payload.' });
    }

    const Practice = require('../models/Practice');
    const User = require('../models/User');

    // 1. Create and save new Practice document
    const practice = new Practice({
      firebaseUid,
      quizTitle,
      score,
      totalQuestions: totalQuestions || 5,
      pointsEarned
    });
    await practice.save();
    console.log(`Saved practice session for ${firebaseUid}: ${quizTitle}`);

    // 2. Increment user points in MongoDB
    let user = await User.findOne({ firebaseUid });
    if (user) {
      user.points = (user.points || 0) + pointsEarned;
      await user.save();
      console.log(`Awarded ${pointsEarned} points to user ${user.email}. New total: ${user.points}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Practice score recorded successfully.',
      points: user ? user.points : 0,
      user: user ? {
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
      } : null
    });
  } catch (error) {
    console.error('Error in /practice route:', error);
    return res.status(500).json({ success: false, message: 'Server error during practice score submission.' });
  }
});

// POST /api/user/certificate - Save/Update user's unlocked certificate details
router.post('/certificate', auth, async (req, res) => {
  try {
    const { userName, points, badgesCount, invoicesCreated, quizzesCompleted } = req.body;
    const firebaseUid = req.user.uid;
    const Certificate = require('../models/Certificate');

    let certificate = await Certificate.findOne({ firebaseUid });
    if (certificate) {
      certificate.userName = userName;
      certificate.points = points;
      certificate.badgesCount = badgesCount;
      certificate.invoicesCreated = invoicesCreated;
      certificate.quizzesCompleted = quizzesCompleted;
      certificate.dateOfCompletion = new Date();
      await certificate.save();
    } else {
      certificate = new Certificate({
        firebaseUid,
        userName,
        points,
        badgesCount,
        invoicesCreated,
        quizzesCompleted,
        dateOfCompletion: new Date()
      });
      await certificate.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Certificate saved successfully.',
      certificate
    });
  } catch (error) {
    console.error('Error saving certificate:', error);
    return res.status(500).json({ success: false, message: 'Server error saving certificate.' });
  }
});

// GET /api/user/certificate - Retrieve certificate details
router.get('/certificate', auth, async (req, res) => {
  try {
    const firebaseUid = req.user.uid;
    const Certificate = require('../models/Certificate');

    const certificate = await Certificate.findOne({ firebaseUid });
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'No certificate found for this user.' });
    }

    return res.status(200).json({
      success: true,
      certificate
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching certificate.' });
  }
});

module.exports = router;
