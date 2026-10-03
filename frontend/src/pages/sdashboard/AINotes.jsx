import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../api/studentAPI';

export default function AINotes() {
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState('All Notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewNote, setPreviewNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch Notes from Backend on Mount
  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await studentAPI.getNotes();
      const fetchedNotes = response.data?.notes || response.notes || response.data || [];
      setNotes(fetchedNotes);
    } catch (err) {
      console.error('Error fetching AI notes:', err);
      setError('Failed to load notes from the server. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (id) => {
    // Optimistic UI update
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isBookmarked: !n.isBookmarked } : n))
    );

    try {
      await studentAPI.toggleBookmark(id);
    } catch (err) {
      console.error('Failed to update bookmark on backend:', err);
      // Revert if API fails
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isBookmarked: !n.isBookmarked } : n))
      );
    }
  };

  const filteredNotes = notes.filter((n) => {
    const matchesTab = activeTab === 'Bookmarked' ? n.isBookmarked : true;
    const matchesSearch =
      n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.course?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn relative">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">AI Generated Notes</h2>
          <p className="text-xs text-slate-500 mt-0.5">Automated concise revision notes generated from classroom lectures</p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="🔍 Search notes by topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-xs"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          {['All Notes', 'Bookmarked'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">Loading AI notes from server...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-4xl">📖</div>
            <p className="text-sm font-bold text-slate-600">No AI notes found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="p-5 rounded-3xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-indigo-100 transition shadow-xs hover:shadow-md space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                      {note.course}
                    </span>
                    <button
                      onClick={() => toggleBookmark(note.id)}
                      className="text-sm text-slate-400 hover:text-amber-500 transition"
                    >
                      {note.isBookmarked ? '⭐' : '☆'}
                    </button>
                  </div>

                  <h3 className="text-xs font-bold text-slate-800">{note.title}</h3>

                  <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">Key Takeaways:</p>
                    <ul className="space-y-1 text-xs text-slate-600 font-medium">
                      {note.keyPoints?.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-indigo-600">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setPreviewNote(note)}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-sm transition active:scale-95"
                  >
                    Read Full Notes 📑
                  </button>
                  <button
                    onClick={() => alert(`Downloading ${note.title} PDF...`)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition"
                    title="Download PDF"
                  >
                    📥
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Notes Preview Modal */}
      {previewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg p-6 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">{previewNote.title}</h3>
                <p className="text-[11px] text-indigo-600 font-bold">{previewNote.course}</p>
              </div>
              <button
                onClick={() => setPreviewNote(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 font-medium leading-relaxed">
              <p className="font-bold text-slate-900">Summary Overview:</p>
              <p>These AI notes were automatically compiled from the lecture recording on {previewNote.generatedDate || 'recent class'}.</p>
              
              <p className="font-bold text-slate-900 pt-2">Detailed Topics Covered:</p>
              <ul className="list-disc pl-4 space-y-1">
                {previewNote.keyPoints?.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPreviewNote(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl"
              >
                Close
              </button>
              <button
                onClick={() => alert(`Downloading ${previewNote.title} PDF...`)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl"
              >
                Download PDF 📥
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}