const admin = require('firebase-admin');

module.exports = async (req, res, next) => {
  try {
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      idToken = req.headers.authorization.split(' ')[1];
    } else {
      idToken = req.body.idToken || req.query.idToken;
    }

    if (!idToken) {
      return res.status(401).json({ success: false, message: 'Authentication token is missing. Please log in.' });
    }

    const firebaseConfigured = admin.apps.length > 0;

    if (firebaseConfigured) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email?.split('@')[0],
          phoneNumber: decodedToken.phone_number
        };
        return next();
      } catch (err) {
        console.error('Firebase token verification failed inside middleware:', err.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
      }
    } else {
      // Fallback mode for local development/testing without active firebase admin configs
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          req.user = {
            uid: payload.user_id || payload.sub,
            email: payload.email,
            name: payload.name || payload.email?.split('@')[0],
            phoneNumber: payload.phone_number
          };
          return next();
        }
      } catch (e) {
        console.error('Error decoding mock JWT in middleware:', e.message);
      }
      
      // If mock token decoding failed but we have mock fields in body for dev testing
      if (req.body.firebaseUid) {
        req.user = {
          uid: req.body.firebaseUid,
          email: req.body.email || `user_${req.body.firebaseUid}@gstsaheli.com`,
          name: req.body.name || 'Saheli Member',
          phoneNumber: req.body.phoneNumber
        };
        return next();
      }

      return res.status(401).json({ success: false, message: 'Failed to verify mock token.' });
    }
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during session validation.' });
  }
};
