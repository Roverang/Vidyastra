const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/userModel');
const Otp = require('../models/otpModel'); // Ensure you have an OTP model created
const { sendOTPEmail } = require('../services/otpService');

const generateSalt = () => crypto.randomBytes(16).toString('hex');
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
const generateToken = () => crypto.randomBytes(32).toString('hex');

// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);
    const authToken = generateToken();

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      salt,
      authToken,
      role: role ? role.toLowerCase() : 'Student',
    });

    await newUser.save();
    res.status(201).json({ message: 'Registration successful. Please login.', userId: newUser._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    // 1. Verify CAPTCHA Token
    if (!captchaToken) {
      return res.status(400).json({ message: 'CAPTCHA verification is required.' });
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    // Send verification request with URLSearchParams
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', captchaToken);

    const googleResponse = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      params
    );

    // Debugging output to see exact Google error codes if it fails
    if (!googleResponse.data.success) {
      console.error('reCAPTCHA Error Codes:', googleResponse.data['error-codes']);
      return res.status(400).json({ 
        message: `CAPTCHA verification failed (${googleResponse.data['error-codes']?.join(', ') || 'invalid key'}).` 
      });
    }

    // 2. Validate User Credentials
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = user.password === hashPassword(password, user.salt);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken();
    user.authToken = token;
    await user.save();

    res.status(200).json({
      message: 'Login successful',
      token,
      role: user.role,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// Send OTP (Stores email & OTP in a separate Otp collection without requiring prior user lookup)
// Send OTP
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    // Verify user exists before sending OTP
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    await Otp.findOneAndUpdate(
      { email },
      { otp, otpExpires },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOTPEmail(email, otp);

    res.status(200).json({ message: 'OTP sent successfully to email.' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending OTP', error: error.message });
  }
};

// Verify OTP (Checks against the separate Otp collection)
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord || otpRecord.otp !== otp || otpRecord.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Remove OTP record after successful verification
    await Otp.deleteOne({ email });

    // Optional: If you also want to mark the user as verified if they exist
    await User.updateOne({ email }, { isVerified: true });

    res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

// Add to controllers/authController.js

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const salt = generateSalt();
    const hashedPassword = hashPassword(newPassword, salt);

    user.password = hashedPassword;
    user.salt = salt;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

// Get User Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -salt');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};