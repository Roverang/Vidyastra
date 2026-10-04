import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { studentAPI } from '../../api/studentAPI';
import { apiErrorMessage } from '../../api/errorMessage';
import LectureSources from '../../components/LectureSources';

// Tailwind resets element styles, so give the Markdown elements explicit ones.
// react-markdown escapes raw HTML by default (no rehype-raw), so notes cannot inject markup.
// react-markdown passes the Markdown AST `node` to components; keep it off the DOM element.
const withoutNode = (props) => {
  const rest = { ...props };
  delete rest.node;
  return rest;
};

const styled = (Tag, className, extra = {}) => {
  const Styled = (props) => <Tag className={className} {...extra} {...withoutNode(props)} />;
  return Styled;
};

const MARKDOWN_COMPONENTS = {
  h1: styled('h1', 'text-lg font-extrabold text-slate-800 mt-1 mb-2'),
  h2: styled('h2', 'text-sm font-extrabold text-indigo-700 mt-5 mb-2'),
  h3: styled('h3', 'text-xs font-extrabold text-slate-800 mt-4 mb-1'),
  p: styled('p', 'text-xs text-slate-700 leading-relaxed my-2'),
  ul: styled('ul', 'list-disc pl-5 space-y-1 text-xs text-slate-700 my-2'),
  ol: styled('ol', 'list-decimal pl-5 space-y-1 text-xs text-slate-700 my-2'),
  li: styled('li', 'leading-relaxed'),
  strong: styled('strong', 'font-bold text-slate-900'),
  pre: styled('pre', 'bg-slate-900 text-slate-100 text-[11px] p-3 rounded-xl overflow-x-auto my-2'),
  // Fenced blocks carry a language-* class and are styled by <pre>; inline code gets a chip
  code: (props) => (
    <code
      {...withoutNode(props)}
      className={props.className || 'bg-slate-100 text-indigo-700 px-1 py-0.5 rounded text-[11px]'}
    />
  ),
  a: styled('a', 'text-indigo-600 underline', { target: '_blank', rel: 'noreferrer' }),
};

export default function AINotes() {
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState(null); // { topic, notes: markdown }
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setNotes(null);
    setSources([]);
    try {
      const res = await studentAPI.generateAiNotes({ topic: topic.trim() });
      const data = res.data?.data;
      if (typeof data?.notes !== 'string') {
        throw new Error(`Invalid response structure from server: ${JSON.stringify(res.data).slice(0, 300)}`);
      }
      setNotes(data);
      setSources(res.data?.sources || []);
    } catch (err) {
      console.error('Error generating AI notes:', err);
      setError(apiErrorMessage(err, 'AI Notes'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">AI Generated Notes</h2>
        <p className="text-xs text-slate-500 mt-0.5">Revision notes written from your indexed lectures</p>
      </div>

      {/* Generator */}
      <form
        onSubmit={handleGenerate}
        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1 space-y-1">
          <label className="text-[11px] font-extrabold uppercase text-indigo-600 tracking-wider">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Integrity constraints, Referential integrity"
            required
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Generating…' : '📑 Generate Notes'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-10 text-center text-xs font-bold text-slate-400">
          Reading your lectures and writing notes…
        </div>
      )}

      {notes && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-5">
          <article>
            <ReactMarkdown components={MARKDOWN_COMPONENTS}>{notes.notes}</ReactMarkdown>
          </article>

          <div className="pt-3 border-t border-slate-100">
            <LectureSources sources={sources} />
          </div>
        </div>
      )}
    </div>
  );
}
