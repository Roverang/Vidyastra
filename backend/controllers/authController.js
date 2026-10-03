const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/userModel');
const Otp = require('../models/otpModel'); // Ensure you have an OTP model created
const { sendOTPEmail } = require('../services/otpService');
const { signToken, signResetToken, verifyResetToken } = require('../utils/jwt');
const { generateSalt, hashPassword, verifyPassword, validatePassword } = require('../utils/password');
const { HIDE_SENSITIVE_USER_FIELDS } = require('../utils/userFields');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

// Same response whether the email is unknown or the password is wrong (no user enumeration)
const INVALID_LOGIN_MESSAGE = 'Invalid email or password.';
const OTP_SENT_MESSAGE = 'If an account exists for this email, an OTP has been sent.';

// Login runs scrypt against this for unknown emails so both failure paths take about as long
const DUMMY_SALT = generateSalt();
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'), DUMMY_SALT);

const normalizeEmail = (email) => String(email).trim().toLowerCase();

// Constant-time string comparison that is safe for inputs of different lengths
const safeEqualStrings = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
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
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
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
      email: normalizeEmail(email),
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
    let isMatch = false;
    if (user) {
      isMatch = verifyPassword(password, user.salt, user.password);
    } else {
      verifyPassword(String(password ?? ''), DUMMY_SALT, DUMMY_HASH); // timing only; result ignored
    }
    if (!isMatch) {
      return res.status(401).json({ message: INVALID_LOGIN_MESSAGE });
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

// Send OTP (email verification after sign-up, and password reset).
// Always answers 200 with the same message so it cannot be used to discover which emails
// have accounts; the OTP is only generated and emailed when the account exists.
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail }).select('_id');
    if (user) {
      const otp = crypto.randomInt(100000, 1000000).toString();
      const otpExpires = Date.now() + OTP_TTL_MS;

      // A new OTP replaces any previous one and resets the wrong-attempt counter
      await Otp.findOneAndUpdate(
        { email: normalizedEmail },
        { otp, otpExpires, attempts: 0 },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Not awaited: waiting on SMTP would make responses for existing accounts measurably
      // slower than for unknown ones. Failures are logged server-side.
      sendOTPEmail(normalizedEmail, otp).catch((error) => {
        console.error('Failed to send OTP email:', error.message);
      });
    }

    res.status(200).json({ message: OTP_SENT_MESSAGE });
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
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
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
    const user = await User.findById(req.user.id).select(HIDE_SENSITIVE_USER_FIELDS);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};