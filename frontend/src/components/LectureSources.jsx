// Lecture chunks an AI answer was grounded in: title + collapsible excerpt (same look as AI Tutor).
export default function LectureSources({ sources }) {
  if (!sources?.length) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">
        📚 Sources from your lectures
      </span>
      {sources.map((src, idx) => (
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
  );
}
