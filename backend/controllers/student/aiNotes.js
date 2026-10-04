const { getAINotesResponseFromML } = require('../../services/mlService');

const optionalString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

// Generate Markdown revision notes from the indexed lectures via the ML service
exports.generateOrFetchNotes = async (req, res) => {
  try {
    const { topic, subject, lecture_id: lectureId } = req.body;

    if (typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Topic keyword is required to generate AI revision notes.',
      });
    }

    const { notes, sources } = await getAINotesResponseFromML({
      topic: topic.trim(),
      subject: optionalString(subject),
      lecture_id: optionalString(lectureId),
    });

    res.status(200).json({
      success: true,
      data: { topic: topic.trim(), notes },
      sources,
    });
  } catch (error) {
    console.error('AI Notes request failed:', error);
    res.status(error.status || 500).json({
      success: false,
      // e.g. "No indexed lecture covers 'X' yet." straight from the ML service
      message: typeof error.detail === 'string' ? error.detail : error.message,
      error: error.message,
    });
  }
};
