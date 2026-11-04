import { OPEN, KIND_STYLE } from './rooms.js'
import { EXPLORED, FRONTIER, manhattan } from './gridAlgos.js'

export const THEMES = {
  dijkstra: {
    name: 'Dijkstra',
    tag: 'floods outward in every direction',
    explored: '#1e40af',
    frontier: '#22d3ee',
    accent: '#38bdf8',
  },
  astar: {
    name: 'A*',
    tag: 'reaches toward the key',
    explored: '#c2410c',
    frontier: '#fde047',
    accent: '#fb923c',
  },
}

const FLOOR = '#111827'
const PATH = '#22c55e'

export default function RoomPanel({ room, frame, algo, cell, done, hover, setHover, pointer, badge }) {
  const t = THEMES[algo]
  const { cols, rows, kind } = room
  const pathSet = frame.path ? new Set(frame.path) : null
  const big = cell >= 40
  const showLock = algo === 'dijkstra' && cell >= 16

  const cellAt = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = Math.floor((e.clientX - r.left) / cell)
    const y = Math.floor((e.clientY - r.top) / cell)
    return x >= 0 && y >= 0 && x < cols && y < rows ? y * cols + x : -1
  }

  const cells = []
  for (let i = 0; i < cols * rows; i++) {
    const k = kind[i]
    const st = frame.state[i]
    let bg = FLOOR
    if (k !== OPEN) bg = KIND_STYLE[k].bg
    else if (pathSet?.has(i)) bg = PATH
    else if (st === EXPLORED) bg = t.explored
    else if (st === FRONTIER) bg = t.frontier

    const isCur = i === frame.current
    const g = frame.g[i]
    const h = manhattan(room, i, room.key)
    const dark = st === FRONTIER && !pathSet?.has(i)
    let content = null
    if (i === room.start || i === room.key) content = null
    else if (big && g >= 0 && k === OPEN) {
      content =
        algo === 'astar' ? (
          <div className={`w-full h-full flex flex-col justify-between p-0.5 leading-none ${dark ? 'text-black' : 'text-white'}`}>
            <span className="text-[11px] font-bold opacity-80 self-start">g{g}</span>
            <span className="text-lg font-black self-center">{g + h}</span>
            <span className="text-[11px] font-bold opacity-80 self-end">h{h}</span>
          </div>
        ) : (
          <span className={`text-lg font-black ${dark ? 'text-black' : 'text-white'}`}>{g}</span>
        )
    } else if (isCur && showLock) content = <span style={{ fontSize: cell * 0.6 }}>🔒</span>

    cells.push(
      <div
        key={i}
        className={`flex items-center justify-center ${isCur ? 'cell-current' : ''}`}
        style={{
          background: bg,
          outline: isCur ? '2px solid #fff' : hover === i ? '2px solid #f472b6' : 'none',
          outlineOffset: -1,
          boxShadow: k === OPEN ? 'inset 0 0 0 0.5px rgba(255,255,255,0.06)' : 'none',
        }}
      >
        {content}
      </div>,
    )
  }

  const hg = hover >= 0 ? frame.g[hover] : -1
  const hh = hover >= 0 ? manhattan(room, hover, room.key) : 0
  let info = ''
  if (hover >= 0) {
    const xy = `(${hover % cols},${Math.floor(hover / cols)})`
    if (kind[hover] !== OPEN) info = `${xy} blocked by ${KIND_STYLE[kind[hover]].label.toLowerCase()}`
    else if (hg < 0) info = `${xy} not reached yet`
    else info = algo === 'astar' ? `${xy}  g=${hg}  h=${hh}  f=${hg + hh}` : `${xy}  distance g=${hg}`
  }

  return (
    <section className="rounded-2xl border-2 p-3 bg-slate-950" style={{ borderColor: t.accent + '66' }}>
      <header className="flex items-center justify-between mb-2 gap-3">
        <div>
          <h2 className="text-3xl font-black leading-none" style={{ color: t.accent }}>{t.name}</h2>
          <div className="text-base mt-1">{badge ? <span className="text-yellow-300 font-black text-lg">{badge}</span> : <span className="text-slate-300">{t.tag}</span>}</div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl sm:text-6xl font-black tnum leading-none" style={{ color: t.accent }}>{frame.explored}</span>
          <span className="text-lg font-bold text-white leading-tight">cells<br />explored</span>
        </div>
      </header>

      <div
        className="relative mx-auto select-none touch-none"
        style={{ width: cols * cell, height: rows * cell }}
        onPointerMove={e => {
          const i = cellAt(e)
          setHover(i)
          pointer?.move(i)
        }}
        onPointerLeave={() => setHover(-1)}
        onPointerDown={e => pointer?.down(cellAt(e))}
        onPointerUp={() => pointer?.up()}
      >
        <div
          className="grid absolute inset-0"
          style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridTemplateRows: `repeat(${rows}, ${cell}px)` }}
        >
          {cells}
        </div>
        {room.labels.map(l => (
          <div
            key={l.label + l.x + l.y}
            className="absolute z-10 flex items-center justify-center font-black tracking-widest text-white/90 pointer-events-none"
            style={{ left: l.x * cell, top: l.y * cell, width: l.w * cell, height: l.h * cell, fontSize: Math.max(10, Math.min(cell * 0.7, 22)) }}
          >
            {l.label}
          </div>
        ))}
        {[[room.start, '📱'], [room.key, '🔑']].map(([i, emoji]) => {
          const size = Math.min(cell * 1.6, 56)
          return (
            <div
              key={emoji}
              className="absolute z-10 flex items-center justify-center pointer-events-none drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]"
              style={{
                left: (i % cols) * cell + cell / 2 - size / 2,
                top: Math.floor(i / cols) * cell + cell / 2 - size / 2,
                width: size,
                height: size,
                fontSize: size * 0.8,
              }}
            >
              {emoji}
            </div>
          )
        })}
      </div>

      <div className={`mt-2 text-center text-lg tnum truncate ${hover >= 0 ? 'text-pink-300' : done && frame.path ? 'text-green-400 font-bold' : 'text-slate-300'}`}>
        {hover >= 0 ? info : done && frame.path ? `✓ Key found · frontier ${frame.frontier}` : `${frame.msg} · frontier ${frame.frontier}`}
      </div>
    </section>
  )
}
