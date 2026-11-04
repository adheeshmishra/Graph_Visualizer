const Btn = ({ onClick, title, children, primary, disabled }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`h-11 shrink-0 rounded-xl text-lg font-bold transition disabled:opacity-30 ${
      primary ? 'bg-yellow-400 text-black hover:bg-yellow-300 w-24' : 'bg-slate-800 hover:bg-slate-700 text-white w-11'
    }`}
  >
    {children}
  </button>
)

export default function Controls({ s }) {
  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Btn onClick={s.toStart} title="Start (Home)" disabled={s.index === 0}>⏮</Btn>
        <Btn onClick={s.stepBack} title="Step back (←)" disabled={s.index === 0}>◀</Btn>
        <Btn onClick={s.toggle} title="Play / pause (Space)" primary>
          {s.playing ? '❚❚ Pause' : '▶ Play'}
        </Btn>
        <Btn onClick={s.stepForward} title="Step forward (→)" disabled={s.index >= s.total - 1}>▶</Btn>
        <Btn onClick={s.toEnd} title="End (End)" disabled={s.index >= s.total - 1}>⏭</Btn>
        <label className="flex-1 min-w-0 flex items-center gap-2 ml-2" title="Speed">
          <span className="text-xl">🐢</span>
          <input type="range" min={1} max={60} value={s.speed} onChange={e => s.setSpeed(+e.target.value)} className="flex-1 min-w-0" />
          <span className="tnum text-sm text-slate-300 w-9 text-right">{s.speed}/s</span>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={Math.max(0, s.total - 1)}
          value={s.index}
          onChange={e => s.setIndex(+e.target.value)}
          className="flex-1"
          title="Scrub through frames (Space play, ← → step)"
        />
        <span className="tnum text-sm text-slate-400 w-16 text-right">{s.index}/{s.total - 1}</span>
      </div>
    </div>
  )
}
