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

module.exports = router;
