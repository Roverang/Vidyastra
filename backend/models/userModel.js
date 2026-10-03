const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    salt: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    role: { type: String, enum: ['admin', 'faculty', 'student'], default: 'student' },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    isVerified: { type: Boolean, default: false },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    progress: {
      completedModules: { type: Number, default: 0 },
      totalModules: { type: Number, default: 10 },
      quizScores: [{ quizId: mongoose.Schema.Types.ObjectId, score: Number }],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
