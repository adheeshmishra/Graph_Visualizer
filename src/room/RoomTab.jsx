import { useEffect, useMemo, useRef, useState } from 'react'
import { ROOMS, OPEN, WALL } from './rooms.js'
import { runGrid } from './gridAlgos.js'
import RoomPanel from './RoomPanel.jsx'
import Controls from '../components/Controls.jsx'
import EditBar from '../components/EditBar.jsx'
import { useStepper } from '../lib/useStepper.js'
import { useWidth } from '../lib/useWidth.js'

const TOOLS = [
  { id: 'walls', icon: '🧱', label: 'Walls' },
  { id: 'start', icon: '📱', label: 'Place phone' },
  { id: 'key', icon: '🔑', label: 'Place key' },
]
const HINTS = {
  walls: 'Click or drag on the floor to build walls. Click a wall or furniture to remove it.',
  start: 'Click any floor cell to move the phone (where the search starts).',
  key: 'Click any floor cell to hide the key there.',
}

export default function RoomTab({ active }) {
  const [roomId, setRoomId] = useState(() => (new URLSearchParams(location.search).get('room') === 'close' ? 'close' : 'big'))
  const [room, setRoom] = useState(() => ROOMS[roomId].make())
  const [tool, setTool] = useState(null) // null = not editing
  const [hover, setHover] = useState(-1)
  const [ref, width] = useWidth()

  const dij = useMemo(() => runGrid(room, 'dijkstra'), [room])
  const ast = useMemo(() => runGrid(room, 'astar'), [room])
  const s = useStepper(Math.max(dij.length, ast.length), room, { defaultSpeed: 20, active })

  const fd = dij[Math.min(s.index, dij.length - 1)]
  const fa = ast[Math.min(s.index, ast.length - 1)]
  const dDone = s.index >= dij.length - 1
  const aDone = s.index >= ast.length - 1
  // Side by side once the container is wider than the phone layout.
  const wide = width > 700
  const panelWidth = wide ? (width - 12) / 2 : width
  // Panel padding (2 × 12px) plus border.
  const cell = Math.max(8, Math.floor((panelWidth - 28) / room.cols))

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
  const pointer = tool ? {
    down(i) {
      if (i < 0 || !interior(i)) return
      if (tool === 'start' || tool === 'key') {
        drag.current = tool
        apply(i)
      } else if (i === room.start) drag.current = 'start'
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
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(ROOMS).map(([id, r]) => (
            <button
              key={id}
              onClick={() => loadRoom(id)}
              title={r.hint}
              className={`px-4 h-11 rounded-xl text-lg font-semibold ${roomId === id ? 'bg-white text-black' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
            >
              {r.name}
            </button>
          ))}
          {!tool && (
            <button onClick={() => setTool('walls')} className="ml-auto px-4 h-11 rounded-xl text-lg font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700">
              ✎ Edit room
            </button>
          )}
          <p className="w-full text-base text-slate-400">{ROOMS[roomId].hint}. Hover any cell to see its values.</p>
        </div>
        <Controls s={s} />
      </div>

      {tool && (
        <EditBar
          title="EDIT ROOM · pick a tool"
          tools={TOOLS}
          tool={tool}
          setTool={setTool}
          onDone={() => setTool(null)}
          hint={HINTS[tool]}
          extra={
            <button onClick={() => loadRoom(roomId)} className="h-9 px-3 rounded-lg bg-slate-800 font-bold text-slate-200" title="Undo all edits">
              Reset
            </button>
          }
        />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
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
    </div>
  )
}
