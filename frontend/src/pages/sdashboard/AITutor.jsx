import React, { useState, useRef, useEffect } from 'react';
import { studentAPI } from '../../api/studentAPI';

// Topic Data mapping for efficiency
const TOPICS_DATA = {
  'Data Structures & Algorithms': [
    'Arrays & Linked Lists',
    'Binary Search & Sorting',
    'Trees & Graphs',
    'Dynamic Programming',
  ],
  'Database Management Systems': [
    'SQL Queries & Joins',
    'Normalization & ER Diagrams',
    'Indexing & B-Trees',
    'Transactions & ACID',
  ],
  'Data Science & AI': [
    'Python for Data Science',
    'Exploratory Data Analysis (EDA)',
    'Supervised Learning',
    'Neural Networks & Deep Learning',
  ],
  'Operating Systems': [
    'Process Scheduling',
    'Memory Management & Paging',
    'Deadlocks & Synchronization',
    'File Systems',
  ]
};

export default function AITutor() {
  const [selectedSubject, setSelectedSubject] = useState('Data Structures & Algorithms');
  const [selectedTopic, setSelectedTopic] = useState('Binary Search & Sorting');
  
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I am your AI Tutor. Select a subject & topic above to get context-specific explanations, code snippets, and interview prep questions.',
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Subject Change
  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject);
    const firstTopic = TOPICS_DATA[subject][0];
    setSelectedTopic(firstTopic);
    
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'ai',
        text: `Switched context to **${subject} → ${firstTopic}**. How can I assist you with this topic?`,
      }
    ]);
  };

  // Send Message via studentApi without mock fallbacks
  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const res = await studentAPI.sendAiTutorMessage({
        message: query,
        subject: selectedSubject,
        topic: selectedTopic,
      });

      const aiReply = res.data?.reply;
      if (!aiReply) {
        throw new Error(`Invalid response structure from server: ${JSON.stringify(res.data)}`);
      }

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiReply,
        sources: res.data?.sources || [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error communicating with AI Tutor API:', err);
      const data = err.response?.data;
      const reason = data?.message || data?.error || err.message;
      setError(err.response ? `AI Tutor error (${err.response.status}): ${reason}` : `AI Tutor request failed: ${reason}`);
    } finally {
      setLoading(false);
    }
  };

  // Reset Chat
  const handleNewChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'ai',
        text: `New session started for **${selectedSubject} (${selectedTopic})**. What would you like to learn today?`,
      }
    ]);
    setError(null);
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-6xl mx-auto">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">AI Tutor</h2>
          <p className="text-xs text-slate-500">Interactive personalized AI assistant for your coursework</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            🔄 New Chat
          </button>
        </div>
      </div>

      {/* TOPIC & SUBJECT SELECTION BAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Subject Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold uppercase text-indigo-600 tracking-wider">
              1. Select Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
            >
              {Object.keys(TOPICS_DATA).map((subj) => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>

          {/* Sub-Topic Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold uppercase text-indigo-600 tracking-wider">
              2. Target Topic / Module
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
            >
              {TOPICS_DATA[selectedSubject].map((top) => (
                <option key={top} value={top}>{top}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Active Context Chip Banner */}
        <div className="flex items-center justify-between bg-indigo-50/60 px-4 py-2 rounded-2xl border border-indigo-100/60">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-extrabold text-indigo-700">🎯 Active Learning Focus:</span>
            <span className="font-bold text-slate-700">{selectedSubject}</span>
            <span className="text-slate-400">→</span>
            <span className="font-extrabold text-indigo-600 bg-white px-2 py-0.5 rounded-lg shadow-xs">{selectedTopic}</span>
          </div>
          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">Live API Mode</span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-[520px]">
        
        {/* Chat Stream Window */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold shadow-inner flex-shrink-0">
                  🤖
                </div>
              )}

              <div
                className={`max-w-[80%] p-4 rounded-3xl text-xs font-medium leading-relaxed whitespace-pre-line shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
                }`}
              >
                {msg.text}

                {msg.sender === 'ai' && msg.sources?.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 space-y-1.5 whitespace-normal">
                    <span className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">
                      📚 Sources
                    </span>
                    {msg.sources.map((src, idx) => (
                      <details
                        key={`${src.lecture_id}-${src.chunk_index}-${idx}`}
                        className="bg-white border border-slate-100 rounded-xl px-2.5 py-1.5"
                      >
                        <summary className="cursor-pointer text-[11px] font-bold text-slate-700">
                          {src.lecture_title || 'Untitled lecture'}
                          <span className="ml-1 text-slate-400 font-medium">· part {Number(src.chunk_index) + 1}</span>
                        </summary>
                        <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{src.excerpt}…</p>
                      </details>
                    ))}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-2xl bg-slate-800 text-white flex items-center justify-center text-xs font-bold shadow-inner flex-shrink-0">
                  👤
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold animate-bounce">
                🤖
              </div>
              <div className="bg-slate-50 text-slate-500 text-xs font-bold px-4 py-3 rounded-2xl border border-slate-100">
                Contacting AI Tutor API...
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl">
              {error}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Quick Prompts based on Topic */}
        <div className="px-6 py-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto bg-slate-50/50">
          <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Suggested:</span>
          {[
            `Explain ${selectedTopic} with real-world analogy`,
            `Give code snippet / example for ${selectedTopic}`,
            `Ask me 3 quiz questions on ${selectedTopic}`,
          ].map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(promptText)}
              className="px-3 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 text-[11px] font-bold rounded-xl transition whitespace-nowrap active:scale-95 shadow-xs"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-white rounded-b-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Ask anything about ${selectedTopic}...`}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50"
            >
              Send 🚀
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}