import { useMemo, useState } from 'react'
import { PRESETS, ALGOS, clone } from './presets.js'
import { RUNNERS } from './graphAlgos.js'
import GraphCanvas from './GraphCanvas.jsx'
import EditBar from '../components/EditBar.jsx'
import { FrontierList, DistRow, Matrix } from './Panels.jsx'
import Controls from '../components/Controls.jsx'
import { useStepper } from '../lib/useStepper.js'

const TONE = {
  info: 'text-white',
  good: 'text-green-300',
  warn: 'text-amber-300',
  bad: 'text-red-400',
  muted: 'text-slate-400',
}

const Pill = ({ on, onClick, children, color = 'bg-white text-black' }) => (
  <button
    onClick={onClick}
    className={`px-3.5 h-11 rounded-xl text-lg font-semibold ${on ? color : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
  >
    {children}
  </button>
)

const TOOLS = [
  { id: 'node', icon: '➕', label: 'Add node' },
  { id: 'edge', icon: '↗', label: 'Connect' },
  { id: 'move', icon: '✋', label: 'Move' },
  { id: 'delete', icon: '🗑', label: 'Delete' },
]

const params = new URLSearchParams(location.search)
const startAlgo = ALGOS[params.get('algo')] ? params.get('algo') : 'bfs'
const startPreset = PRESETS[params.get('preset')] ? params.get('preset') : ALGOS[startAlgo].preset

export default function GraphTab({ active }) {
  const [algo, setAlgo] = useState(startAlgo)
  const [presetId, setPresetId] = useState(startPreset)
  const [graph, setGraph] = useState(() => clone(PRESETS[startPreset].graph))
  const [tool, setTool] = useState(null) // null = not editing
  const [src, setSrc] = useState('S')
  const [dst, setDst] = useState('T')

  const ids = graph.nodes.map(n => n.id)
  const source = ids.includes(src) ? src : ids[0]
  const target = ids.includes(dst) ? dst : ids[ids.length - 1]

  const frames = useMemo(() => RUNNERS[algo](graph, source, target), [algo, graph, source, target])
  const s = useStepper(frames.length, frames, { defaultSpeed: 2, active })
  const frame = frames[s.index]
  const prev = s.index > 0 ? frames[s.index - 1] : null

  const loadPreset = id => {
    setPresetId(id)
    setGraph(clone(PRESETS[id].graph))
    setSrc('S')
    setDst('T')
  }
  const pickAlgo = id => {
    setAlgo(id)
    loadPreset(ALGOS[id].preset)
  }
  const onChange = g => {
    setPresetId(null)
    setGraph(g)
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
      {/* Setup: algorithm, graph, playback. Top right on wide screens, first on narrow. */}
      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
        <div className="grid grid-cols-4 gap-1 bg-slate-900 rounded-2xl p-1">
          {Object.entries(ALGOS).map(([id, a]) => (
            <button
              key={id}
              onClick={() => pickAlgo(id)}
              className={`h-12 px-1 rounded-xl text-sm sm:text-lg font-black leading-tight ${algo === id ? 'bg-yellow-400 text-black' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              {a.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-lg">
          <select
            value={presetId || ''}
            onChange={e => loadPreset(e.target.value)}
            className="h-11 min-w-40 flex-1 rounded-xl bg-slate-800 px-3 font-bold"
            title="Example graph"
          >
            {!presetId && <option value="">Your graph</option>}
            {Object.entries(PRESETS).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}
          </select>
          <label className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-green-400">START</span>
            <select value={source} onChange={e => setSrc(e.target.value)} className="h-11 rounded-xl bg-slate-800 px-2 font-bold text-green-400">
              {ids.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-pink-400">GOAL</span>
            <select value={target} onChange={e => setDst(e.target.value)} className="h-11 rounded-xl bg-slate-800 px-2 font-bold text-pink-400">
              {ids.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          {!tool && (
            <Pill onClick={() => setTool('node')}>✎ Edit graph</Pill>
          )}
        </div>

        {tool && (
          <EditBar
            title="EDIT GRAPH · pick a tool"
            tools={TOOLS}
            tool={tool}
            setTool={setTool}
            onDone={() => setTool(null)}
            extra={
              <button onClick={() => onChange({ nodes: graph.nodes.slice(0, 2), edges: [] })} className="h-9 px-3 rounded-lg bg-slate-800 font-bold text-slate-200" title="Start from two empty nodes">
                Clear
              </button>
            }
          />
        )}
        {algo === 'bfs' && graph.edges.some(e => e.w !== 1) && (
          <p className="text-base text-amber-300">BFS counts hops and ignores weights.</p>
        )}

        <Controls s={s} />
      </div>

      {/* Stage: what's happening now, and the graph. Left column on wide screens. */}
      <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1 lg:row-span-2">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 px-3 py-2 min-h-20 flex items-center gap-3">
          {frame.pass && (
            <div className={`shrink-0 rounded-xl px-3 py-2 text-center ${frame.pass.extra ? 'bg-red-600' : 'bg-yellow-400 text-black'}`}>
              <div className="text-xs font-black tracking-widest">{frame.pass.extra ? 'EXTRA PASS' : 'PASS'}</div>
              <div className="text-4xl font-black tnum leading-none">
                {frame.pass.n}
                {!frame.pass.extra && <span className="text-xl opacity-70">/{frame.pass.total}</span>}
              </div>
            </div>
          )}
          {frame.matrix?.hi?.k !== undefined && (
            <div className="shrink-0 rounded-xl px-3 py-2 text-center bg-yellow-400 text-black">
              <div className="text-xs font-black tracking-widest">VIA</div>
              <div className="text-4xl font-black leading-none">k={graph.nodes[frame.matrix.hi.k]?.label}</div>
            </div>
          )}
          <p className={`text-xl font-bold leading-snug ${TONE[frame.tone] || 'text-white'}`}>{frame.msg}</p>
        </div>

        <GraphCanvas graph={graph} frame={frame} tool={tool} onChange={onChange} source={source} target={target} />

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-yellow-400" />{algo === 'floyd' ? 'k' : 'processing'}</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full border-4 border-amber-400" />{algo === 'floyd' ? 'i, j' : 'in frontier'}</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-blue-600" />{algo === 'bellman' ? 'reached' : 'visited'}</span>
          <span className="flex items-center gap-1.5"><span className="w-5 h-1.5 bg-green-500" />path</span>
          <span className="flex items-center gap-1.5"><span className="w-5 h-1.5 bg-red-500" />skip / cycle</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full border-2 border-dashed border-green-400" />start</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full border-2 border-dashed border-pink-400" />goal</span>
        </div>
      </div>

      {/* Data: frontier and distances. Bottom right on wide screens, last on narrow. */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 flex flex-col gap-3 lg:col-start-2 lg:row-start-2">
        <FrontierList title={ALGOS[algo].frontier} list={frame.list} />
        {frame.matrix ? (
          <Matrix nodes={graph.nodes} matrix={frame.matrix} />
        ) : (
          <DistRow nodes={graph.nodes} frame={frame} prev={prev} />
        )}
      </div>
    </div>
  )
}
