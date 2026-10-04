const { getAIQuizResponseFromML } = require('../../services/mlService');

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 10;
const DEFAULT_QUESTIONS = 5;

const optionalString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

// Generate a quiz from the indexed lectures via the ML service
exports.generateOrFetchQuiz = async (req, res) => {
  try {
    const { topic, subject, difficulty, num_questions: numQuestionsRaw, lecture_id: lectureId } = req.body;

    if (typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Topic keyword is required to generate an AI quiz.',
      });
    }

    const normalizedDifficulty = difficulty === undefined || difficulty === null || difficulty === ''
      ? 'medium'
      : String(difficulty).trim().toLowerCase();
    if (!DIFFICULTIES.includes(normalizedDifficulty)) {
      return res.status(400).json({
        success: false,
        message: `Invalid difficulty. Allowed: ${DIFFICULTIES.join(', ')}.`,
      });
    }

    const numQuestions = numQuestionsRaw === undefined || numQuestionsRaw === null || numQuestionsRaw === ''
      ? DEFAULT_QUESTIONS
      : Number(numQuestionsRaw);
    if (!Number.isInteger(numQuestions) || numQuestions < MIN_QUESTIONS || numQuestions > MAX_QUESTIONS) {
      return res.status(400).json({
        success: false,
        message: `num_questions must be a whole number from ${MIN_QUESTIONS} to ${MAX_QUESTIONS}.`,
      });
    }

    const { quiz, sources } = await getAIQuizResponseFromML({
      topic: topic.trim(),
      subject: optionalString(subject),
      difficulty: normalizedDifficulty,
      num_questions: numQuestions,
      lecture_id: optionalString(lectureId),
    });

    res.status(200).json({
      success: true,
      data: { ...quiz, topic: topic.trim(), difficulty: normalizedDifficulty },
      sources,
    });
  } catch (error) {
    console.error('AI Quiz request failed:', error);
    res.status(error.status || 500).json({
      success: false,
      // e.g. "No indexed lecture covers 'X' yet." straight from the ML service
      message: typeof error.detail === 'string' ? error.detail : error.message,
      error: error.message,
    });
  }
};
