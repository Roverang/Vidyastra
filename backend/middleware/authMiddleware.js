const User = require('../models/userModel');

// Verify Token via stored auth token
exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const user = await User.findOne({ authToken: token });
    if (!user) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }

    req.user = { id: user._id, role: user.role.toLowerCase() }; // Attach user info to request object
    next();
  } catch (error) {
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