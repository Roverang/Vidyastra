const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/userModel');
const Otp = require('../models/otpModel'); // Ensure you have an OTP model created
const { sendOTPEmail } = require('../services/otpService');
const { signToken, signResetToken, verifyResetToken } = require('../utils/jwt');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH = 6;

const normalizeEmail = (email) => String(email).trim().toLowerCase();

// Constant-time string comparison that is safe for inputs of different lengths
const safeEqualStrings = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const generateSalt = () => crypto.randomBytes(16).toString('hex');
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');

// Constant-time comparison of a password against the stored hex scrypt hash
const verifyPassword = (password, salt, storedHash) => {
  if (typeof password !== 'string' || typeof storedHash !== 'string' || !salt) return false;
  const candidate = Buffer.from(hashPassword(password, salt), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
};

// Roles that may be chosen on the public registration form; admins are created out of band
const SELF_REGISTER_ROLES = ['student', 'faculty'];

// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const normalizedRole = role === undefined || role === null || role === '' ? 'student' : String(role).trim().toLowerCase();
    if (!SELF_REGISTER_ROLES.includes(normalizedRole)) {
      return res.status(400).json({ message: `Invalid role. Allowed roles: ${SELF_REGISTER_ROLES.join(', ')}.` });
    }

    const existingUser = await User.findOne({ email: normalizeEmail(email) });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      salt,
      role: normalizedRole,
    });

    await newUser.save();
    res.status(201).json({
      message: 'Registration successful. Please login.',
      userId: newUser._id,
      token: signToken(newUser),
      role: newUser.role,
    });
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
    const user = await User.findOne({ email: normalizeEmail(email || '') });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = verifyPassword(password, user.salt, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = signToken(user);

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

    const normalizedEmail = normalizeEmail(email);

    // Verify user exists before sending OTP
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpires = Date.now() + OTP_TTL_MS;

    // A new OTP replaces any previous one and resets the wrong-attempt counter
    await Otp.findOneAndUpdate(
      { email: normalizedEmail },
      { otp, otpExpires, attempts: 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOTPEmail(normalizedEmail, otp);

    res.status(200).json({ message: 'OTP sent successfully to email.' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending OTP', error: error.message });
  }
};

// Verify OTP (Checks against the separate Otp collection).
// On success returns a short-lived single-use `resetToken` for the password reset step.
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const otpRecord = await Otp.findOne({ email: normalizedEmail });

    if (!otpRecord || otpRecord.otpExpires < Date.now() || otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      if (otpRecord) await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    }

    if (!safeEqualStrings(otpRecord.otp, String(otp).trim())) {
      const updated = await Otp.findOneAndUpdate(
        { _id: otpRecord._id },
        { $inc: { attempts: 1 } },
        { new: true }
      );
      const remaining = MAX_OTP_ATTEMPTS - (updated?.attempts ?? MAX_OTP_ATTEMPTS);
      if (remaining <= 0) {
        await Otp.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
      }
      return res.status(400).json({ message: `Invalid OTP. ${remaining} attempt(s) left.` });
    }

    // Single use: only the request that actually deletes the record succeeds
    const { deletedCount } = await Otp.deleteOne({ _id: otpRecord._id });
    if (deletedCount !== 1) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    }

    const user = await User.findOneAndUpdate({ email: normalizedEmail }, { isVerified: true }, { new: true });

    res.status(200).json({
      message: 'OTP verified successfully.',
      ...(user && { resetToken: signResetToken(user) }),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

// Reset Password: requires the resetToken issued by verifyOtp
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword, resetToken } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' });
    }
    if (!resetToken) {
      return res.status(400).json({ message: 'Reset token is required. Verify the OTP sent to your email first.' });
    }
    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
    }

    let payload;
    try {
      payload = verifyResetToken(resetToken);
    } catch (error) {
      const message = error.name === 'TokenExpiredError'
        ? 'Reset token expired. Please verify a new OTP.'
        : 'Invalid reset token.';
      return res.status(401).json({ message });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user || String(user._id) !== payload.sub) {
      return res.status(401).json({ message: 'Invalid reset token.' });
    }

    const salt = generateSalt();
    const hashedPassword = hashPassword(newPassword, salt);

    // Only applies if tokenVersion still equals the token's tv. Bumping it makes this reset token
    // single-use and revokes every access token issued before the reset, atomically.
    // (tv 0 also matches users created before tokenVersion existed.)
    const updated = await User.findOneAndUpdate(
      { _id: user._id, tokenVersion: payload.tv === 0 ? { $in: [0, null] } : payload.tv },
      { $set: { password: hashedPassword, salt }, $inc: { tokenVersion: 1 } }
    );
    if (!updated) {
      return res.status(401).json({ message: 'Reset token has already been used or is no longer valid.' });
    }

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