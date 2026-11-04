import { useEffect, useMemo, useRef, useState } from 'react'
import { ROOMS, OPEN, WALL } from './rooms.js'
import { runGrid } from './gridAlgos.js'
import RoomPanel from './RoomPanel.jsx'
import Controls from '../components/Controls.jsx'
import { useStepper } from '../lib/useStepper.js'
import { useWidth } from '../lib/useWidth.js'

const Swatch = ({ color, children }) => (
  <span className="flex items-center gap-1.5">
    <span className="inline-block w-4 h-4 rounded-sm" style={{ background: color }} />
    {children}
  </span>
)

export default function RoomTab({ active }) {
  const [roomId, setRoomId] = useState(() => (new URLSearchParams(location.search).get('room') === 'close' ? 'close' : 'big'))
  const [room, setRoom] = useState(() => ROOMS[roomId].make())
  const [edit, setEdit] = useState(false)
  const [hover, setHover] = useState(-1)
  const [ref, width] = useWidth()

  const dij = useMemo(() => runGrid(room, 'dijkstra'), [room])
  const ast = useMemo(() => runGrid(room, 'astar'), [room])
  const s = useStepper(Math.max(dij.length, ast.length), room, { defaultSpeed: 20, active })

  const fd = dij[Math.min(s.index, dij.length - 1)]
  const fa = ast[Math.min(s.index, ast.length - 1)]
  const dDone = s.index >= dij.length - 1
  const aDone = s.index >= ast.length - 1
  // Panel padding (2 × 12px) plus border.
  const cell = Math.max(8, Math.floor((width - 28) / room.cols))

  const loadRoom = id => {
    setRoomId(id)
    setRoom(ROOMS[id].make())
  }

  // Edit mode: drag the phone/key, or paint and erase walls.
  const drag = useRef(null)
  useEffect(() => {
    const up = () => (drag.current = null)
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])
  const interior = i => {
    const x = i % room.cols, y = Math.floor(i / room.cols)
    return x > 0 && y > 0 && x < room.cols - 1 && y < room.rows - 1
  }
  const apply = i => {
    const d = drag.current
    if (!d || i < 0 || !interior(i)) return
    setRoom(r => {
      if (d === 'start' || d === 'key') {
        if (r.kind[i] !== OPEN || i === r.start || i === r.key) return r
        return { ...r, [d]: i }
      }
      if (i === r.start || i === r.key || r.kind[i] === d.paint) return r
      const kind = r.kind.slice()
      kind[i] = d.paint
      return { ...r, kind }
    })
  }
  const pointer = edit ? {
    down(i) {
      if (i < 0) return
      if (i === room.start) drag.current = 'start'
      else if (i === room.key) drag.current = 'key'
      else if (interior(i)) {
        drag.current = { paint: room.kind[i] === OPEN ? WALL : OPEN }
        apply(i)
      }
    },
    move: apply,
    up() { drag.current = null },
  } : null

  const ratio = fa.explored ? fd.explored / fa.explored : 0

  return (
    <div ref={ref} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(ROOMS).map(([id, r]) => (
          <button
            key={id}
            onClick={() => loadRoom(id)}
            className={`px-4 h-11 rounded-xl text-lg font-semibold ${roomId === id ? 'bg-white text-black' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
          >
            {r.name}
          </button>
        ))}
        <button
          onClick={() => setEdit(e => !e)}
          className={`ml-auto px-4 h-11 rounded-xl text-lg font-semibold ${edit ? 'bg-pink-500 text-black' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
        >
          {edit ? '✎ Editing' : '✎ Edit room'}
        </button>
      </div>
      {edit && (
        <p className="text-base text-pink-300 -mt-2">
          Click or drag to add or remove walls. Drag 📱 or 🔑 to move them.
        </p>
      )}

      <Controls s={s} />

      <RoomPanel room={room} frame={fd} algo="dijkstra" cell={cell} done={dDone} hover={hover} setHover={setHover} pointer={pointer} />
      <RoomPanel
        room={room}
        frame={fa}
        algo="astar"
        cell={cell}
        done={aDone}
        hover={hover}
        setHover={setHover}
        pointer={pointer}
        badge={dDone && aDone && fa.path ? `${ratio.toFixed(1)}× fewer cells than Dijkstra` : null}
      />

    </div>
  )
}
