import { useState } from 'react';
import { studentAPI } from '../../api/studentAPI';
import { apiErrorMessage } from '../../api/errorMessage';
import LectureSources from '../../components/LectureSources';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const MAX_QUESTIONS = 10;

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function AIQuiz() {
  // Generator form
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Generated quiz + attempt state
  const [quiz, setQuiz] = useState(null); // { title, questions, topic, difficulty }
  const [sources, setSources] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // question index -> chosen option index
  const [finished, setFinished] = useState(false);

  const questions = quiz?.questions || [];
  const current = questions[currentIndex];
  const chosen = answers[currentIndex];
  const answered = chosen !== undefined;
  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_index ? 1 : 0), 0);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setError(null);
    setQuiz(null);
    setSources([]);
    try {
      const res = await studentAPI.generateAiQuiz({
        topic: topic.trim(),
        difficulty,
        num_questions: Number(numQuestions),
      });
      const data = res.data?.data;
      if (!data?.questions?.length) {
        throw new Error(`Invalid response structure from server: ${JSON.stringify(res.data).slice(0, 300)}`);
      }
      setQuiz(data);
      setSources(res.data?.sources || []);
      setCurrentIndex(0);
      setAnswers({});
      setFinished(false);
    } catch (err) {
      console.error('Error generating AI quiz:', err);
      setError(apiErrorMessage(err, 'AI Quiz'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = (optionIdx) => {
    if (answered) return; // answers lock once chosen so the explanation is meaningful
    setAnswers((prev) => ({ ...prev, [currentIndex]: optionIdx }));
  };

  const optionClass = (idx) => {
    if (!answered) return 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
    if (idx === current.correct_index) return 'bg-emerald-50 border-emerald-500 text-emerald-800';
    if (idx === chosen) return 'bg-rose-50 border-rose-500 text-rose-700';
    return 'bg-white border-slate-200 text-slate-400';
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">AI Quiz Center</h2>
        <p className="text-xs text-slate-500 mt-0.5">Quizzes generated from your indexed lectures</p>
      </div>

      {/* Generator */}
      <form
        onSubmit={handleGenerate}
        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end"
      >
        <div className="space-y-1">
          <label className="text-[11px] font-extrabold uppercase text-indigo-600 tracking-wider">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Integrity constraints, Primary keys"
            required
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-extrabold uppercase text-indigo-600 tracking-wider">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{capitalize(d)}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-extrabold uppercase text-indigo-600 tracking-wider">Questions</label>
          <select
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {Array.from({ length: MAX_QUESTIONS }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <button
          type="submit"
          disabled={isGenerating || !topic.trim()}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50"
        >
          {isGenerating ? 'Generating…' : '✨ Generate Quiz'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}

      {isGenerating && (
        <div className="py-10 text-center text-xs font-bold text-slate-400">
          Reading your lectures and writing questions…
        </div>
      )}

      {quiz && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-5">
          <div className="flex justify-between items-start gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">{quiz.title}</h3>
              <p className="text-[11px] text-indigo-600 font-bold">{quiz.topic}</p>
            </div>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
              quiz.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700'
                : quiz.difficulty === 'hard' ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700'
            }`}>
              {capitalize(quiz.difficulty || 'medium')}
            </span>
          </div>

          {!finished ? (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 font-bold">
                Question {currentIndex + 1} of {questions.length}
              </div>

              <h4 className="text-xs font-bold text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {current.question}
              </h4>

              <div className="space-y-2">
                {current.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(idx)}
                    disabled={answered}
                    className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 border ${optionClass(idx)}`}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold border border-current shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>

              {answered && (
                <div className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                  chosen === current.correct_index
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                  <p className="font-extrabold">
                    {chosen === current.correct_index
                      ? '✅ Correct!'
                      : `❌ Not quite. The answer is ${String.fromCharCode(65 + current.correct_index)}.`}
                  </p>
                  <p className="mt-1 font-medium">{current.explanation}</p>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    disabled={!answered}
                    onClick={() => setCurrentIndex((i) => i + 1)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl disabled:opacity-40"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!answered}
                    onClick={() => setFinished(true)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md disabled:opacity-40"
                  >
                    See Score 🏁
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="text-4xl">🏆</div>
                <p className="text-xs text-slate-500 font-bold">Your Score</p>
                <p className="text-2xl font-extrabold text-indigo-600">{score}/{questions.length}</p>
                <p className="text-xs font-bold text-emerald-600">
                  {Math.round((score / questions.length) * 100)}% correct
                </p>
              </div>

              <ol className="space-y-2">
                {questions.map((q, i) => (
                  <li key={i} className="p-3 rounded-2xl border border-slate-100 bg-slate-50 text-xs space-y-1">
                    <p className="font-bold text-slate-800">
                      {answers[i] === q.correct_index ? '✅' : '❌'} {i + 1}. {q.question}
                    </p>
                    <p className="text-slate-600">
                      Answer: <span className="font-bold">{q.options[q.correct_index]}</span>
                      {answers[i] !== q.correct_index && answers[i] !== undefined && (
                        <span className="text-rose-600"> (you chose {q.options[answers[i]]})</span>
                      )}
                    </p>
                    <p className="text-slate-500">{q.explanation}</p>
                  </li>
                ))}
              </ol>

              <div className="flex justify-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setAnswers({}); setCurrentIndex(0); setFinished(false); }}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl"
                >
                  Retry Quiz
                </button>
                <button
                  type="button"
                  onClick={() => { setQuiz(null); setSources([]); }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl"
                >
                  New Quiz
                </button>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100">
            <LectureSources sources={sources} />
          </div>
        </div>
      )}
    </div>
  );
}
