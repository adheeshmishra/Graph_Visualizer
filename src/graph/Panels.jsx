import { fmt } from './graphAlgos.js'

const CHIP = {
  front: 'bg-green-400 text-black ring-4 ring-green-300/50 chip-new',
  back: 'bg-sky-400 text-black ring-4 ring-sky-300/40 chip-new',
  stale: 'bg-slate-800 text-slate-500 line-through',
  current: 'bg-yellow-400 text-black ring-4 ring-yellow-200/50',
  relaxed: 'bg-slate-800 text-green-300 ring-2 ring-green-400',
}

export function FrontierList({ title, list }) {
  const items = list?.items || []
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-lg font-bold text-slate-300">{title}</h3>
        <span className="text-base text-slate-500 tnum">{items.length} items</span>
      </div>
      {list?.front && (
        <div className="flex justify-between text-sm font-semibold text-slate-400 mb-3 px-1">
          <span>{list.front}</span>
          <span>{list.back}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2 min-h-14 items-start pt-1">
        {items.length === 0 && <span className="text-lg text-slate-600 self-center">empty</span>}
        {items.map((it, i) => (
          <div key={it.key} className="relative">
            {(it.tag === 'front' || it.tag === 'back') && (
              <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[11px] font-black px-1.5 rounded ${it.tag === 'front' ? 'bg-green-300 text-black' : 'bg-sky-300 text-black'}`}>
                {it.badge || (it.tag === 'front' ? 'addFirst' : 'addLast')}
              </span>
            )}
            <div className={`rounded-xl px-3 py-2 text-center min-w-14 ${CHIP[it.tag] || 'bg-slate-800 text-white'} ${i === 0 && list.front ? 'outline-2 outline-white/40' : ''}`}>
              <div className="text-xl font-black leading-tight">{it.label}</div>
              {it.sub && <div className="text-sm font-semibold opacity-80 tnum">{it.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DistRow({ nodes, frame, prev, title = 'Distances from source' }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-slate-300 mb-1.5">{title}</h3>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(nodes.length, 8)}, minmax(0, 1fr))` }}>
        {nodes.map((n, i) => {
          const v = frame.dist[i]
          const changed = prev && prev.dist[i] !== v
          return (
            <div key={n.id} className="rounded-xl bg-slate-800 text-center py-1">
              <div className="text-sm text-slate-400 font-bold leading-tight">{n.label}</div>
              <div key={changed ? `${v}-${frame.msg}` : 'same'} className={`text-2xl font-black tnum rounded ${changed ? 'flash' : ''} ${v === Infinity ? 'text-slate-500' : v < 0 ? 'text-pink-300' : 'text-yellow-200'}`}>
                {fmt(v)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Matrix({ nodes, matrix }) {
  const { d, hi, updated } = matrix
  const n = nodes.length
  return (
    <div>
      <h3 className="text-lg font-bold text-slate-300 mb-1">Distance matrix d[row][col]</h3>
      <table className="w-full border-separate border-spacing-1 text-center">
        <thead>
          <tr>
            <th />
            {nodes.map((nd, j) => (
              <th key={nd.id} className={`text-lg font-black ${hi?.k === j ? 'text-yellow-300' : 'text-slate-400'}`}>{nd.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.map((row, i) => (
            <tr key={i}>
              <th className={`text-lg font-black ${hi?.k === i ? 'text-yellow-300' : 'text-slate-400'}`}>{nodes[i].label}</th>
              {row.map((v, j) => {
                const isTarget = hi && hi.i === i && hi.j === j
                const isLeg = hi && hi.k !== undefined && hi.i !== undefined && ((i === hi.i && j === hi.k) || (i === hi.k && j === hi.j))
                const inK = hi && (i === hi.k || j === hi.k)
                let cls = 'bg-slate-800'
                if (isTarget) cls = updated ? 'bg-green-500 text-black flash' : 'bg-slate-700 ring-2 ring-white'
                else if (isLeg) cls = 'bg-amber-500/30 ring-2 ring-amber-400'
                else if (inK) cls = 'bg-yellow-400/10'
                if (i === j && v < 0) cls = 'bg-red-600 text-white'
                return (
                  <td key={j} className={`rounded-lg py-1 text-xl font-black tnum ${cls} ${v === Infinity && !isTarget ? 'text-slate-500' : ''}`}>
                    {fmt(v)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {n > 0 && (
        <p className="mt-2 text-sm text-slate-400">
          <span className="text-amber-300">amber</span> = d[i][k] and d[k][j] · <span className="text-green-400">green</span> = d[i][j] improved
        </p>
      )}
    </div>
  )
}
