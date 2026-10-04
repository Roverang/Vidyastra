/**
 * @file otpModel.js
 * @description Mongoose model for storing temporary One-Time Passwords (OTPs) associated with email addresses.
 */

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  // Wrong guesses so far; the OTP is invalidated after MAX_OTP_ATTEMPTS
  attempts: {
    type: Number,
    default: 0
  },
  otpExpires: {
    type: Date,
    required: true,
    // Automatically delete documents after they expire using MongoDB TTL index (expires after 0 seconds past otpExpires)
    index: { expires: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Otp', otpSchema);