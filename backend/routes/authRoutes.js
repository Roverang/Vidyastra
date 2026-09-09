const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  sendOtp,
  verifyOtp,
  resetPassword,
  getProfile,
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware'); // Added middleware import

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.get('/profile', verifyToken, getProfile); // Added verifyToken protection

module.exports = router;