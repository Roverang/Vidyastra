const { getAITutorResponseFromML } = require('../../services/mlService');

// Handle AI Tutor chat interactions by proxying to the ML service
exports.handleAITutorChat = async (req, res) => {
  try {
    const { message, subject, topic } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required.',
      });
    }

    // Communicate strictly with the ML service
    const { reply, sources } = await getAITutorResponseFromML({
      message,
      subject: subject || 'General',
      topic: topic || 'General',
    });

    res.status(200).json({
      success: true,
      reply,
      sources,
    });
  } catch (error) {
    console.error('AI Tutor request failed:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      error: error.message,
    });
  }
};