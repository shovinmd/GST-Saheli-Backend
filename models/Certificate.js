const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true, // One record per user
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  badgesCount: {
    type: Number,
    required: true
  },
  invoicesCreated: {
    type: Number,
    required: true
  },
  quizzesCompleted: {
    type: Number,
    required: true
  },
  dateOfCompletion: {
    type: Date,
    default: Date.now
  },
  isCertified: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Certificate', CertificateSchema);
