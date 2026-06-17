const mongoose = require('mongoose');

const PracticeSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    index: true // Ensure fast queries and prevent security leaks by indexing on the uid
  },
  quizTitle: {
    type: String,
    required: true,
    trim: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    default: 5
  },
  pointsEarned: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Practice', PracticeSchema);
