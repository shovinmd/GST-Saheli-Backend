require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (serviceAccountPath) {
  try {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin with service account:', error.message);
    console.log('Running in Development/Fallback Auth mode.');
  }
} else {
  console.log('No FIREBASE_SERVICE_ACCOUNT_PATH specified in .env.');
  console.log('Running in Development/Fallback Auth mode (Tokens will be parsed without verification).');
}

// Connect to MongoDB Atlas (handled helper for serverless environment)
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI is not defined in the environment variables.');
  process.exit(1);
}

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  await mongoose.connect(MONGODB_URI);
};

// Start initial connection
connectDB().catch((err) => {
  console.error('MongoDB Atlas initial connection error:', err);
});

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

// Middleware to ensure DB is connected for API requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection failed during request routing:', err.message);
    next(); // Proceed to allow error handlers or status response
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Health Check / Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'GST Saheli API Server is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    firebaseAdmin: admin.apps.length > 0 ? 'initialized' : 'fallback_mode'
  });
});

// Start Server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`GST Saheli Backend running on port ${PORT}`);
  });
}

module.exports = app;
