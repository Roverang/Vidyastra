import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../api/studentAPI';

export default function AIQuiz() {
  const [quizzes, setQuizzes] = useState([]);
  const [activeTab, setActiveTab] = useState('Available'); // 'Available', 'Completed'
  
  // Active Quiz Attempt State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [timer, setTimer] = useState(0);

  // Custom AI Quiz Generator Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genTopic, setGenTopic] = useState('');
  const [genDifficulty, setGenDifficulty] = useState('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch Quizzes from API on mount
  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await studentAPI.getQuizzes();
      const fetchedQuizzes = response.data?.quizzes || response.quizzes || response.data || [];
      setQuizzes(fetchedQuizzes);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to load quizzes from the server. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  // Timer Effect during quiz
  useEffect(() => {
    let interval = null;
    if (activeQuiz && timer > 0 && !quizResult) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && activeQuiz && !quizResult) {
      handleFinalSubmit(); // Auto submit on timer end
    }
    return () => clearInterval(interval);
  }, [activeQuiz, timer, quizResult]);

  // Start Quiz Handler
  const handleStartQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setCurrentQIndex(0);
    setSelectedAnswers({});
    setQuizResult(null);
    setTimer((quiz.timeLimit || 5) * 60); // minutes to seconds
  };

  // Option Select
  const handleSelectOption = (questionId, optionIdx) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  // Submit Quiz Evaluation
  const handleFinalSubmit = async () => {
    let correctCount = 0;
    const questionsList = activeQuiz.questions || [];
    
    questionsList.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const total = questionsList.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const resultData = {
      score: `${correctCount}/${total}`,
      percentage: `${pct}%`,
      correctCount,
      total,
    };

    setQuizResult(resultData);

    try {
      await studentAPI.submitQuiz(activeQuiz.id, {
        answers: selectedAnswers,
        score: resultData.score,
        percentage: resultData.percentage,
      });
    } catch (err) {
      console.error('Failed to sync quiz result with backend:', err);
    }

    // Update list to completed locally
    setQuizzes((prev) =>
      prev.map((q) =>
        q.id === activeQuiz.id
          ? { ...q, status: 'Completed', score: resultData.score, percentage: resultData.percentage }
          : q
      )
    );
  };

  // Generate AI Quiz Submission via studentApi
  const handleGenerateAIQuiz = async (e) => {
    e.preventDefault();
    if (!genTopic.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      const response = await studentAPI.generateAIQuiz({
        topic: genTopic,
        difficulty: genDifficulty,
      });

      const newQuiz = response.data?.quiz || response.quiz || response.data;
      setQuizzes((prev) => [newQuiz, ...prev]);
      setIsGenerating(false);
      setIsGenerateModalOpen(false);
      setGenTopic('');
    } catch (err) {
      console.error('Error generating AI quiz:', err);
      setError('Failed to generate AI quiz from backend server.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn relative">
      
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">AI Quiz Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">Test your knowledge with automated adaptive quizzes</p>
        </div>

        <button
          onClick={() => setIsGenerateModalOpen(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 flex items-center gap-1.5"
        >
          ✨ Generate Custom AI Quiz
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6">
        
        {/* Navigation Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          {['Available', 'Completed'].map((tab) => {
            const count = quizzes.filter((q) => (tab === 'Available' ? q.status === 'Pending' || !q.status : q.status === 'Completed')).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab} Quizzes</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400">Loading quizzes from server...</div>
        ) : (
          /* Quiz List View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes
              .filter((q) => (activeTab === 'Available' ? (q.status === 'Pending' || !q.status) : q.status === 'Completed'))
              .map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-5 rounded-3xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-indigo-100 transition shadow-xs hover:shadow-md flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                        {quiz.course || 'Custom AI Generated'}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                        quiz.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                        quiz.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {quiz.difficulty || 'Medium'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800">{quiz.title}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      ❓ {quiz.questionsCount || (quiz.questions && quiz.questions.length) || 0} Questions • ⏱️ {quiz.timeLimit || 5} Mins
                    </p>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    {(!quiz.status || quiz.status === 'Pending') ? (
                      <button
                        onClick={() => handleStartQuiz(quiz)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-sm transition active:scale-95"
                      >
                        Start Quiz 🚀
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-2xl border border-emerald-100 text-xs font-bold">
                        <span>Score: {quiz.score}</span>
                        <span>Accuracy: {quiz.percentage}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

      </div>

      {/* QUIZ ATTEMPT MODAL POPUP */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-xl p-6 space-y-5 animate-fadeIn">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">{activeQuiz.title}</h3>
                <p className="text-[11px] text-indigo-600 font-bold">{activeQuiz.course || 'Custom AI Generated'}</p>
              </div>

              {!quizResult && (
                <div className="bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1">
                  ⏱️ {Math.floor(timer / 60)}:{timer % 60 < 10 ? `0${timer % 60}` : timer % 60}
                </div>
              )}
            </div>

            {/* Quiz Body */}
            {!quizResult ? (
              <div className="space-y-4">
                {/* Question Info */}
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                  <span>Question {currentQIndex + 1} of {activeQuiz.questions?.length || 0}</span>
                </div>

                {/* Current Question */}
                <h4 className="text-xs font-bold text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {activeQuiz.questions?.[currentQIndex]?.question}
                </h4>

                {/* Options List */}
                <div className="space-y-2">
                  {activeQuiz.questions?.[currentQIndex]?.options?.map((opt, idx) => {
                    const qId = activeQuiz.questions[currentQIndex].id;
                    const isSelected = selectedAnswers[qId] === idx;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(qId, idx)}
                        className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 border ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold border ${
                          isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-500'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex((prev) => prev - 1)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {currentQIndex < (activeQuiz.questions?.length || 0) - 1 ? (
                    <button
                      onClick={() => setCurrentQIndex((prev) => prev + 1)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl"
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      onClick={handleFinalSubmit}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md"
                    >
                      Submit Quiz 🏁
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Quiz Result Display */
              <div className="py-6 text-center space-y-4">
                <div className="text-5xl">🏆</div>
                <h3 className="text-lg font-bold text-slate-800">Quiz Completed!</h3>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 inline-block min-w-[200px] space-y-1">
                  <p className="text-xs text-slate-500 font-bold">Your Score</p>
                  <p className="text-2xl font-extrabold text-indigo-600">{quizResult.score}</p>
                  <p className="text-xs font-bold text-emerald-600">{quizResult.percentage} Accuracy</p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-center">
                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl"
                  >
                    Close & Return to Quizzes
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* GENERATE CUSTOM AI QUIZ MODAL */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md p-6 space-y-5 animate-fadeIn">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Generate AI Quiz</h3>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateAIQuiz} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Topic / Subject Keyword</label>
                <input
                  type="text"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g. Operating System Paging, Dynamic Programming"
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Difficulty Level</label>
                <select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Create Quiz 🎯'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}