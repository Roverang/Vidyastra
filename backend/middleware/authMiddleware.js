const User = require('../models/userModel');
const jwt = require('../utils/jwt');

// Verify JWT access token
exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = jwt.verifyToken(token);
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ message });
  }

  // Special-purpose tokens (e.g. password reset) are never valid as access tokens
  if (payload.purpose !== undefined) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const user = await User.findById(payload.sub).select('role tokenVersion');
    if (!user) {
      return res.status(401).json({ message: 'Invalid token: user no longer exists' });
    }
    if ((user.tokenVersion || 0) !== payload.tv) {
      return res.status(401).json({ message: 'Token has been revoked. Please log in again.' });
    }

    req.user = { id: user._id, role: user.role.toLowerCase() }; // Attach user info to request object
    next();
  } catch (error) {
    // e.g. a malformed `sub` that is not an ObjectId
    if (error.name === 'CastError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Error validating token', error: error.message });
  }
};

// Verify Admin Role
exports.verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

// Verify Faculty Role
exports.verifyFaculty = (req, res, next) => {
  if (req.user && req.user.role === 'faculty') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Faculty privileges required.' });
  }
};

// Verify Faculty or Admin Role
exports.verifyFacultyOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'faculty' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Faculty or Admin privileges required.' });
  }
};
