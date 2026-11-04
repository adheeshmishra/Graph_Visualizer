import { useEffect, useRef, useState } from 'react'
import { fmt } from './graphAlgos.js'

export const VW = 600
export const VH = 420
const R = 24

const NODE_STYLE = {
  idle: { fill: '#1e293b', stroke: '#64748b', text: '#e2e8f0' },
  frontier: { fill: '#1e293b', stroke: '#fbbf24', text: '#fde68a' },
  current: { fill: '#facc15', stroke: '#ffffff', text: '#000000' },
  done: { fill: '#2563eb', stroke: '#93c5fd', text: '#ffffff' },
}

const EDGE_COLOR = {
  base: '#64748b',
  relax: '#4ade80',
  check: '#ffffff',
  skip: '#f87171',
  front: '#4ade80',
  back: '#38bdf8',
  path: '#22c55e',
  cycle: '#ef4444',
}

function geometry(a, b, curved) {
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  const off = curved ? 34 : 0
  const cx = (a.x + b.x) / 2 + nx * off
  const cy = (a.y + b.y) / 2 + ny * off
  // Trim both ends so the arrowhead stops at the node's edge.
  const trim = (p, q, r) => {
    const l = Math.hypot(q.x - p.x, q.y - p.y) || 1
    return { x: p.x + ((q.x - p.x) / l) * r, y: p.y + ((q.y - p.y) / l) * r }
  }
  const c = { x: cx, y: cy }
  const p1 = trim(a, c, R)
  const p2 = trim(b, c, R + 4)
  return {
    d: `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`,
    mx: 0.25 * p1.x + 0.5 * cx + 0.25 * p2.x,
    my: 0.25 * p1.y + 0.5 * cy + 0.25 * p2.y,
  }
}

// Put each distance label on the side of the node with the most room between edges.
const SLOTS = [90, -90, 0, 180, 45, 135, -45, -135].map(a => (a * Math.PI) / 180)
function labelOffset(node, graph, byId) {
  const angles = []
  for (const e of graph.edges) {
    const other = e.from === node.id ? byId[e.to] : e.to === node.id ? byId[e.from] : null
    if (other) angles.push(Math.atan2(other.y - node.y, other.x - node.x))
  }
  const r = R + 26
  const pos = s => ({ x: Math.cos(s) * (r + 6), y: Math.sin(s) * r })
  let best = SLOTS[0], bestGap = -1
  for (const s of SLOTS) {
    const p = pos(s)
    const x = node.x + p.x, y = node.y + p.y
    if (x < 26 || x > VW - 26 || y < 15 || y > VH - 15) continue
    const gap = Math.min(Math.PI, ...angles.map(a => Math.abs(Math.atan2(Math.sin(a - s), Math.cos(a - s)))))
    if (gap > bestGap + 0.01) {
      best = s
      bestGap = gap
    }
  }
  return pos(best)
}

// What each edit tool tells the user, shown in a bar above the canvas.
export function toolHint(tool, pending) {
  if (tool === 'node') return 'Click anywhere on the empty canvas to drop a new node.'
  if (tool === 'edge')
    return pending
      ? `Now click the node the arrow should point to (from ${pending}). Click ${pending} again to cancel.`
      : 'Click the node the arrow starts from, then the node it points to. Click any weight to change it.'
  if (tool === 'move') return 'Drag a node to reposition it. Click any weight to change it.'
  if (tool === 'delete') return 'Click a node or an edge to remove it.'
  return ''
}

export default function GraphCanvas({ graph, frame, tool, onChange, source, target }) {
  const svgRef = useRef(null)
  const [drag, setDrag] = useState(null) // { from, x, y, moved }
  const [pending, setPending] = useState(null) // edge start node while connecting
  const [cursor, setCursor] = useState(null)
  const [editing, setEditing] = useState(null) // edge id
  const [draft, setDraft] = useState('')
  const edit = !!tool

  // While moving, draw the dragged node at the pointer.
  const nodes = graph.nodes.map(n => (drag?.moved && tool === 'move' && drag.from === n.id ? { ...n, x: drag.x, y: drag.y } : n))
  const shown = { ...graph, nodes }
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
  const idx = Object.fromEntries(nodes.map((n, i) => [n.id, i]))
  const edgeSet = new Set(graph.edges.map(e => e.id))
  const pathSet = new Set(frame?.pathEdges || [])
  const cycleSet = new Set(frame?.cycleEdges || [])
  useEffect(() => {
    if (!tool || (pending && !graph.nodes.some(n => n.id === pending))) setPending(null)
  }, [tool, graph, pending])

  const toSvg = e => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM().inverse())
    return { x: Math.max(R, Math.min(VW - R, p.x)), y: Math.max(R, Math.min(VH - R, p.y)) }
  }
  const nodeAt = p => graph.nodes.find(n => Math.hypot(n.x - p.x, n.y - p.y) <= R + 4)

  const nextLabel = () => {
    const used = new Set(graph.nodes.map(n => n.id))
    for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') if (!used.has(c)) return c
    for (let i = 1; ; i++) if (!used.has('N' + i)) return 'N' + i
  }

  const openEditor = id => {
    const e = graph.edges.find(x => x.id === id)
    setDraft(String(e ? e.w : 1))
    setEditing(id)
  }
  const commit = () => {
    const w = Number(draft)
    if (draft.trim() !== '' && Number.isFinite(w)) onChange({ ...graph, edges: graph.edges.map(e => (e.id === editing ? { ...e, w } : e)) })
    setEditing(null)
  }
  const addEdge = (from, to) => {
    const id = `${from}>${to}`
    if (!edgeSet.has(id)) onChange({ ...graph, edges: [...graph.edges, { id, from, to, w: 1 }] })
    openEditor(id)
  }
  const removeEdge = id => {
    onChange({ ...graph, edges: graph.edges.filter(e => e.id !== id) })
    setEditing(null)
  }
  const removeNode = id => {
    if (graph.nodes.length <= 2) return
    onChange({ nodes: graph.nodes.filter(n => n.id !== id), edges: graph.edges.filter(e => e.from !== id && e.to !== id) })
  }

  const onBackground = e => {
    if (editing) return setEditing(null)
    if (tool === 'node') {
      const p = toSvg(e)
      if (nodeAt(p)) return
      const id = nextLabel()
      onChange({ ...graph, nodes: [...graph.nodes, { id, label: id, ...p }] })
    }
    if (tool === 'edge') setPending(null)
  }

  const onNodeDown = (e, n) => {
    if (!edit) return
    e.stopPropagation()
    setEditing(null)
    if (tool === 'delete') return removeNode(n.id)
    if (tool === 'move' || tool === 'edge') setDrag({ from: n.id, x: n.x, y: n.y, moved: false })
  }

  const onPointerMove = e => {
    if (!drag && !pending) return
    const p = toSvg(e)
    setCursor(p)
    if (drag) setDrag(d => (Math.hypot(p.x - d.x, p.y - d.y) > 4 || d.moved ? { ...d, ...p, moved: true } : d))
  }

  const onPointerUp = e => {
    if (!drag) return
    const p = toSvg(e)
    const over = nodeAt(p)
    if (tool === 'move' && drag.moved) {
      onChange({ ...graph, nodes: graph.nodes.map(n => (n.id === drag.from ? { ...n, ...p } : n)) })
    } else if (tool === 'edge') {
      if (drag.moved) {
        // Dragging from one node to another also connects them.
        if (over && over.id !== drag.from) addEdge(drag.from, over.id)
        setPending(null)
      } else if (!pending) setPending(drag.from)
      else if (pending === drag.from) setPending(null)
      else {
        addEdge(pending, drag.from)
        setPending(null)
      }
    }
    setDrag(null)
  }

  const edgeEls = graph.edges.map(e => {
    const a = byId[e.from], b = byId[e.to]
    const geo = geometry(a, b, edgeSet.has(`${e.to}>${e.from}`))
    let kind = 'base'
    if (cycleSet.has(e.id)) kind = 'cycle'
    else if (frame?.edge?.id === e.id) kind = frame.edge.kind
    else if (pathSet.has(e.id)) kind = 'path'
    if (editing === e.id) kind = 'check'
    const color = EDGE_COLOR[kind]
    const hot = kind !== 'base'
    const width = kind === 'path' || kind === 'cycle' ? 7 : hot ? 6 : 3
    const neg = e.w < 0
    const onEdge = ev => {
      ev.stopPropagation()
      if (!edit) return
      if (tool === 'delete') removeEdge(e.id)
      else openEditor(e.id)
    }
    return (
      <g key={e.id}>
        <path
          d={geo.d}
          fill="none"
          stroke="transparent"
          strokeWidth={22}
          style={{ cursor: edit ? 'pointer' : 'default' }}
          onClick={onEdge}
          onContextMenu={ev => { if (edit) { ev.preventDefault(); removeEdge(e.id) } }}
        />
        <path
          d={geo.d}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeDasharray={kind === 'skip' ? '10 7' : undefined}
          markerEnd={`url(#arrow-${kind})`}
          pointerEvents="none"
          style={hot ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
        />
        {kind === 'skip' && (
          <text x={geo.mx} y={geo.my - 30} textAnchor="middle" fontSize="20" fontWeight="900" fill="#f87171" pointerEvents="none">
            ✕ SKIP
          </text>
        )}
        {kind === 'front' && (
          <text x={geo.mx} y={geo.my - 30} textAnchor="middle" fontSize="18" fontWeight="900" fill="#4ade80" pointerEvents="none">
            addFirst
          </text>
        )}
        {kind === 'back' && (
          <text x={geo.mx} y={geo.my - 30} textAnchor="middle" fontSize="18" fontWeight="900" fill="#38bdf8" pointerEvents="none">
            addLast
          </text>
        )}
        <g onClick={onEdge} style={{ cursor: edit ? 'pointer' : 'default' }}>
          <rect
            x={geo.mx - (String(e.w).length > 1 ? 26 : 20)}
            y={geo.my - 18}
            width={String(e.w).length > 1 ? 52 : 40}
            height={36}
            rx={10}
            fill={neg ? '#db2777' : '#f8fafc'}
            stroke={hot ? color : neg ? '#fbcfe8' : '#0f172a'}
            strokeWidth={hot ? 4 : 2}
          />
          <text x={geo.mx} y={geo.my + 9} textAnchor="middle" fontSize="26" fontWeight="900" fill={neg ? '#ffffff' : '#0f172a'} pointerEvents="none">
            {e.w}
          </text>
        </g>
      </g>
    )
  })

  const editingEdge = editing && graph.edges.find(e => e.id === editing)
  let editorPos = null
  if (editingEdge) {
    const geo = geometry(byId[editingEdge.from], byId[editingEdge.to], edgeSet.has(`${editingEdge.to}>${editingEdge.from}`))
    editorPos = { left: `${(geo.mx / VW) * 100}%`, top: `${Math.min(88, (geo.my / VH) * 100 + 12)}%` }
  }

  const lineFrom = tool === 'edge' && (drag?.moved ? byId[drag.from] : pending ? byId[pending] : null)
  const lineTo = drag?.moved ? drag : cursor

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className={`w-full rounded-2xl bg-slate-950 border-2 select-none touch-none ${edit ? 'border-pink-500/70' : 'border-slate-800'}`}
        style={{ cursor: tool === 'node' ? 'crosshair' : 'default' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { setDrag(null); setCursor(null) }}
      >
        <defs>
          {Object.entries(EDGE_COLOR).map(([k, c]) => (
            <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth={k === 'base' ? 5 : 3.6} markerHeight={k === 'base' ? 5 : 3.6} orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
            </marker>
          ))}
        </defs>
        <rect width={VW} height={VH} fill="transparent" onClick={onBackground} />
        {edgeEls}
        {lineFrom && lineTo && (
          <line x1={lineFrom.x} y1={lineFrom.y} x2={lineTo.x} y2={lineTo.y} stroke="#f472b6" strokeWidth={4} strokeDasharray="8 6" pointerEvents="none" />
        )}
        {nodes.map(n => {
          const i = idx[n.id]
          const st = frame?.status[i] || 'idle'
          const style = NODE_STYLE[st]
          const d = frame?.dist[i]
          const lo = labelOffset(n, shown, byId)
          const ring = n.id === source ? '#4ade80' : n.id === target ? '#f472b6' : null
          const cursorStyle = !edit ? 'default' : tool === 'move' ? 'grab' : tool === 'node' ? 'not-allowed' : 'pointer'
          return (
            <g
              key={n.id}
              transform={`translate(${n.x} ${n.y})`}
              style={{ cursor: cursorStyle }}
              onPointerDown={e => onNodeDown(e, n)}
              onContextMenu={e => { if (edit) { e.preventDefault(); removeNode(n.id) } }}
            >
              {pending === n.id && <circle r={R + 10} fill="#f472b6" opacity={0.35} />}
              {tool === 'delete' && <circle r={R + 6} fill="none" stroke="#f87171" strokeWidth={2} strokeDasharray="3 4" />}
              {ring && <circle r={R + 7} fill="none" stroke={ring} strokeWidth={3} strokeDasharray="5 4" />}
              {st === 'current' && <circle r={R + 12} fill="none" stroke="#facc15" strokeWidth={3} opacity={0.6} />}
              <circle r={R} fill={style.fill} stroke={style.stroke} strokeWidth={st === 'frontier' ? 5 : 3} />
              <text y={8} textAnchor="middle" fontSize="23" fontWeight="900" fill={style.text} pointerEvents="none">
                {n.label}
              </text>
              {frame && !edit && (
                <rect x={lo.x - 24} y={lo.y - 13} width={48} height={26} rx={8} fill="#020617" opacity={0.92} pointerEvents="none" />
              )}
              {frame && !edit && (
                <text x={lo.x} y={lo.y + 7} textAnchor="middle" fontSize="19" fontWeight="800" fill={d === Infinity ? '#64748b' : '#fde68a'} pointerEvents="none" className="tnum">
                  {fmt(d)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {edit && (
        <div className="absolute top-2 left-2 right-2 rounded-xl bg-pink-500/95 text-black text-base font-bold px-3 py-1.5 pointer-events-none shadow-lg">
          {toolHint(tool, pending)}
        </div>
      )}

      {editorPos && (
        <div className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-slate-900 border-2 border-pink-400 rounded-xl p-2 shadow-2xl z-20" style={editorPos}>
          <span className="text-base font-bold text-pink-300 whitespace-nowrap">
            {editingEdge.from}→{editingEdge.to} weight
          </span>
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onFocus={e => e.target.select()}
            onKeyDown={e => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setEditing(null)
            }}
            className="w-20 h-10 rounded-lg bg-slate-800 text-xl text-center font-bold"
          />
          <button onClick={commit} className="h-10 px-3 rounded-lg bg-pink-500 text-black font-bold">OK</button>
          <button onClick={() => removeEdge(editing)} className="h-10 px-2.5 rounded-lg bg-slate-700 font-bold" title="Delete this edge">🗑</button>
        </div>
      )}
    </div>
  )
}
