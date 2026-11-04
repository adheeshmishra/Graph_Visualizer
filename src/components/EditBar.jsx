// Tool picker shown while editing a room or graph.
export default function EditBar({ title, tools, tool, setTool, onDone, extra, hint }) {
  return (
    <div className="rounded-2xl border-2 border-pink-500/70 bg-pink-500/10 p-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-base font-black text-pink-300 tracking-wide">{title}</span>
        <div className="flex gap-1.5">
          {extra}
          <button onClick={onDone} className="h-9 px-4 rounded-lg bg-pink-500 text-black font-black">✓ Done</button>
        </div>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${tools.length}, minmax(0, 1fr))` }}>
        {tools.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`h-14 rounded-xl flex flex-col items-center justify-center leading-tight ${
              tool === t.id ? 'bg-white text-black' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-sm font-bold">{t.label}</span>
          </button>
        ))}
      </div>
      {hint && <p className="text-base font-semibold text-pink-200 leading-snug">{hint}</p>}
    </div>
  )
}
