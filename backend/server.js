require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { assertJwtConfig } = require('./utils/jwt');

// Fail fast if JWT configuration is missing or weak
try {
  assertJwtConfig();
} catch (error) {
  console.error(`Startup aborted: ${error.message}`);
  process.exit(1);
}

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mount Routes (Auth & Student folder structure)
app.use('/api/auth', require('./routes/authRoutes'));

// Student Sub-routes matching your routes/student/ directory
app.use('/api/student/courses', require('./routes/student/courses'));
app.use('/api/student/assignments', require('./routes/student/assignments'));
app.use('/api/student/lectures', require('./routes/student/lectureLibrary'));
app.use('/api/student/notifications', require('./routes/student/notifications'));
app.use('/api/student/dashboard', require('./routes/student/dashboard'));
app.use('/api/student/profile', require('./routes/student/profileSettings'));
app.use('/api/student/analytics', require('./routes/student/progressAnalytics'));

// AI Microservice Integration Routes
app.use('/api/student/ai/quiz', require('./routes/student/aiQuiz'));
app.use('/api/student/ai/notes', require('./routes/student/aiNotes'));
app.use('/api/student/ai/tutor', require('./routes/student/aiTutor'));

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'VidyAstra API is running successfully.' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server!', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});