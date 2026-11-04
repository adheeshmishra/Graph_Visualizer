// Each algorithm returns a list of frames. A frame is a full snapshot:
// { status[], dist[], edge, msg, tone, list, pass, pathEdges, cycleEdges, matrix, hi }
// status values: idle | frontier | current | done

const INF = Infinity
export const fmt = d => (d === INF ? '∞' : String(d))
const plus = (a, b) => (b < 0 ? `${a} + (${b})` : `${a} + ${b}`)

function setup(graph) {
  const idx = new Map(graph.nodes.map((n, i) => [n.id, i]))
  const out = graph.nodes.map(() => [])
  for (const e of graph.edges) out[idx.get(e.from)].push(e)
  return { idx, out, n: graph.nodes.length, L: i => graph.nodes[i].label }
}

function tracePath(graph, idx, parentEdge, s, t) {
  const edges = []
  const seen = new Set()
  for (let v = t; v !== s; ) {
    const e = parentEdge[v]
    if (!e || seen.has(v)) return null
    seen.add(v)
    edges.push(e.id)
    v = idx.get(e.from)
  }
  return edges.reverse()
}

function recorder(n) {
  const frames = []
  const base = { status: Array(n).fill('idle'), dist: Array(n).fill(INF), edge: null, pathEdges: [], cycleEdges: [], list: null, pass: null, matrix: null, hi: [] }
  return {
    frames,
    push(f) {
      frames.push({ ...base, ...f, status: [...f.status], dist: [...f.dist] })
    },
  }
}

function finish(rec, ctx, { status, dist, list, pass }) {
  const { graph, idx, parentEdge, s, t, L } = ctx
  const path = dist[t] === INF ? null : tracePath(graph, idx, parentEdge, s, t)
  rec.push({
    status, dist, list, pass,
    pathEdges: path || [],
    msg: path ? `Shortest path to ${L(t)}: cost ${fmt(dist[t])}` : `${L(t)} is unreachable`,
    tone: path ? 'good' : 'bad',
  })
  return rec.frames
}

export function bfs(graph, sid, tid) {
  const { idx, out, n, L } = setup(graph)
  const s = idx.get(sid), t = idx.get(tid)
  const rec = recorder(n)
  const dist = Array(n).fill(INF)
  const status = Array(n).fill('idle')
  const parentEdge = Array(n).fill(null)
  let queue = []
  let added = null
  const list = () => ({
    front: 'front ← dequeue', back: 'enqueue → back',
    items: queue.map(v => ({ key: L(v), label: L(v), sub: `d=${dist[v]}`, tag: v === added ? 'back' : null, badge: 'enqueue' })),
  })

  dist[s] = 0
  status[s] = 'frontier'
  queue.push(s)
  added = s
  rec.push({ status, dist, list: list(), msg: `Start at ${L(s)}: d=0, enqueue`, tone: 'info' })

  while (queue.length) {
    const u = queue.shift()
    added = null
    status[u] = 'current'
    rec.push({ status, dist, list: list(), msg: `Dequeue ${L(u)} (d=${dist[u]})`, tone: 'info' })
    if (u === t) break
    for (const e of out[u]) {
      const v = idx.get(e.to)
      if (dist[v] === INF) {
        dist[v] = dist[u] + 1
        parentEdge[v] = e
        status[v] = 'frontier'
        queue.push(v)
        added = v
        rec.push({ status, dist, list: list(), edge: { id: e.id, kind: 'relax' }, msg: `Discover ${L(v)}: d=${dist[v]}, enqueue at back`, tone: 'good' })
      } else {
        added = null
        const longer = dist[u] + 1 > dist[v]
        rec.push({
          status, dist, list: list(), edge: { id: e.id, kind: 'skip' },
          msg: longer
            ? `SKIP ${L(v)}: already reached by a shorter path (d=${dist[v]}). This path would give ${dist[u] + 1}.`
            : `SKIP ${L(v)}: already reached (d=${dist[v]})`,
          tone: 'bad',
        })
      }
    }
    status[u] = 'done'
  }
  status.forEach((st, i) => st === 'current' && (status[i] = 'done'))
  return finish(rec, { graph, idx, parentEdge, s, t, L }, { status, dist, list: list() })
}

export function zeroOneBfs(graph, sid, tid) {
  const { idx, out, n, L } = setup(graph)
  const s = idx.get(sid), t = idx.get(tid)
  const rec = recorder(n)
  const bad = graph.edges.find(e => e.w !== 0 && e.w !== 1)
  if (bad) {
    rec.push({ status: Array(n).fill('idle'), dist: Array(n).fill(INF), msg: `0-1 BFS needs every weight to be 0 or 1. Edge ${bad.from}→${bad.to} has ${bad.w}.`, tone: 'bad' })
    return rec.frames
  }
  const dist = Array(n).fill(INF)
  const status = Array(n).fill('idle')
  const parentEdge = Array(n).fill(null)
  const done = Array(n).fill(false)
  let dq = [] // entries: { v, d, id }
  let uid = 0
  let added = null
  const list = () => ({
    front: 'front ← pop', back: 'back',
    items: dq.map(x => ({
      key: x.id, label: L(x.v), sub: `d=${x.d}`,
      tag: x.id === added?.id ? added.op : done[x.v] || x.d > dist[x.v] ? 'stale' : null,
    })),
  })

  dist[s] = 0
  status[s] = 'frontier'
  dq.push({ v: s, d: 0, id: uid++ })
  rec.push({ status, dist, list: list(), msg: `Start at ${L(s)}: d=0`, tone: 'info' })

  while (dq.length) {
    const { v: u, d } = dq.shift()
    added = null
    if (done[u] || d > dist[u]) {
      rec.push({ status, dist, list: list(), msg: `Pop ${L(u)} (d=${d}): stale entry, already settled at d=${dist[u]}. Discard.`, tone: 'warn' })
      continue
    }
    done[u] = true
    status[u] = 'current'
    rec.push({ status, dist, list: list(), msg: `Pop ${L(u)} from the front (d=${dist[u]})`, tone: 'info' })
    if (u === t) break
    for (const e of out[u]) {
      const v = idx.get(e.to)
      const nd = dist[u] + e.w
      if (nd < dist[v]) {
        dist[v] = nd
        parentEdge[v] = e
        if (!done[v]) status[v] = 'frontier'
        const entry = { v, d: nd, id: uid++ }
        if (e.w === 0) dq.unshift(entry)
        else dq.push(entry)
        added = { id: entry.id, op: e.w === 0 ? 'front' : 'back' }
        rec.push({
          status, dist, list: list(), edge: { id: e.id, kind: e.w === 0 ? 'front' : 'back' },
          msg: e.w === 0
            ? `Weight 0 → addFirst(${L(v)}). Same distance ${nd}, so it jumps to the FRONT.`
            : `Weight 1 → addLast(${L(v)}). Distance ${nd}, joins the BACK.`,
          tone: e.w === 0 ? 'good' : 'info',
        })
      } else {
        added = null
        rec.push({ status, dist, list: list(), edge: { id: e.id, kind: 'skip' }, msg: `${L(u)}→${L(v)} gives ${nd}, not better than ${fmt(dist[v])}. Skip.`, tone: 'warn' })
      }
    }
    status[u] = 'done'
  }
  status.forEach((st, i) => st === 'current' && (status[i] = 'done'))
  added = null
  return finish(rec, { graph, idx, parentEdge, s, t, L }, { status, dist, list: list() })
}

export function bellmanFord(graph, sid, tid) {
  const { idx, n, L } = setup(graph)
  const s = idx.get(sid), t = idx.get(tid)
  const rec = recorder(n)
  const dist = Array(n).fill(INF)
  const parentEdge = Array(n).fill(null)
  const edges = graph.edges
  const total = Math.max(1, n - 1)
  let relaxedThisPass = new Set()
  const status = () => dist.map(d => (d === INF ? 'idle' : 'done'))
  const list = cur => ({
    items: edges.map(e => ({
      key: e.id, label: `${e.from}→${e.to}`, sub: `w=${e.w}`,
      tag: e.id === cur ? 'current' : relaxedThisPass.has(e.id) ? 'relaxed' : null,
    })),
  })

  dist[s] = 0
  rec.push({ status: status(), dist, list: list(), msg: `Start: d(${L(s)})=0, everything else ∞. Up to ${total} passes over every edge.`, tone: 'info', pass: null })

  for (let p = 1; p <= total; p++) {
    relaxedThisPass = new Set()
    const pass = { n: p, total, extra: false }
    rec.push({ status: status(), dist, list: list(), pass, msg: `Pass ${p} of ${total}: relax every edge`, tone: 'info' })
    let changed = false
    for (const e of edges) {
      const u = idx.get(e.from), v = idx.get(e.to)
      const st = status()
      st[u] = 'current'
      if (dist[u] === INF) {
        rec.push({ status: st, dist, list: list(e.id), pass, edge: { id: e.id, kind: 'check' }, msg: `${e.from}→${e.to}: ${e.from} not reached yet, nothing to relax`, tone: 'muted' })
      } else if (dist[u] + e.w < dist[v]) {
        const before = dist[v]
        dist[v] = dist[u] + e.w
        parentEdge[v] = e
        relaxedThisPass.add(e.id)
        changed = true
        rec.push({ status: st, dist, list: list(e.id), pass, edge: { id: e.id, kind: 'relax' }, msg: `Relax ${e.from}→${e.to}: ${fmt(before)} → ${dist[u]} + (${e.w}) = ${dist[v]}`, tone: 'good' })
      } else {
        rec.push({ status: st, dist, list: list(e.id), pass, edge: { id: e.id, kind: 'check' }, msg: `${e.from}→${e.to}: ${dist[u]} + (${e.w}) = ${dist[u] + e.w}, not better than ${fmt(dist[v])}`, tone: 'muted' })
      }
    }
    if (!changed) {
      rec.push({ status: status(), dist, list: list(), pass, msg: `Pass ${p}: no updates, so distances are final and there's no negative cycle`, tone: 'good' })
      return finish(rec, { graph, idx, parentEdge, s, t, L }, { status: status(), dist, list: list(), pass })
    }
  }

  // Extra pass: anything that still improves proves a negative cycle.
  relaxedThisPass = new Set()
  const pass = { n: total + 1, total, extra: true }
  rec.push({ status: status(), dist, list: list(), pass, msg: `Extra pass ${total + 1}: if ANY edge still relaxes, there is a negative cycle`, tone: 'warn' })
  for (const e of edges) {
    const u = idx.get(e.from), v = idx.get(e.to)
    const st = status()
    st[u] = 'current'
    if (dist[u] !== INF && dist[u] + e.w < dist[v]) {
      // Walk parents n times to land inside the cycle, then collect it.
      const pe = [...parentEdge]
      pe[v] = e
      let x = v
      for (let i = 0; i < n; i++) x = idx.get(pe[x].from)
      const cycle = []
      let y = x
      do {
        cycle.push(pe[y].id)
        y = idx.get(pe[y].from)
      } while (y !== x && cycle.length <= n)
      const sum = cycle.reduce((a, id) => a + edges.find(ed => ed.id === id).w, 0)
      rec.push({ status: st, dist, list: list(e.id), pass, edge: { id: e.id, kind: 'skip' }, msg: `${e.from}→${e.to} still improves (${dist[u]} + (${e.w}) < ${dist[v]}) after ${total} passes!`, tone: 'bad' })
      rec.push({ status: status(), dist, list: list(), pass, cycleEdges: cycle, msg: `NEGATIVE CYCLE detected (total weight ${sum}). Shortest paths are undefined.`, tone: 'bad' })
      return rec.frames
    }
    rec.push({ status: st, dist, list: list(e.id), pass, edge: { id: e.id, kind: 'check' }, msg: `${e.from}→${e.to}: no improvement`, tone: 'muted' })
  }
  rec.push({ status: status(), dist, list: list(), pass, msg: 'Extra pass changed nothing, so there is no negative cycle', tone: 'good' })
  return finish(rec, { graph, idx, parentEdge, s, t, L }, { status: status(), dist, list: list(), pass })
}

export function floydWarshall(graph, s, t) {
  const { idx, n, L } = setup(graph)
  const rec = recorder(n)
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)))
  const next = Array.from({ length: n }, () => Array(n).fill(-1))
  for (let i = 0; i < n; i++) next[i][i] = i
  for (const e of graph.edges) {
    const u = idx.get(e.from), v = idx.get(e.to)
    if (e.w < d[u][v]) {
      d[u][v] = e.w
      next[u][v] = v
    }
  }
  const si = idx.get(s), ti = idx.get(t)
  const snapM = (hi, updated) => ({ d: d.map(r => [...r]), hi, updated })
  const list = k => ({
    items: graph.nodes.map((nd, i) => ({ key: nd.id, label: nd.label, tag: i === k ? 'current' : k !== null && i < k ? 'relaxed' : null })),
  })
  const status = (k, i, j) => graph.nodes.map((_, x) => (x === k ? 'current' : x === i || x === j ? 'frontier' : k !== null && x < k ? 'done' : 'idle'))

  rec.push({ status: status(null), dist: d[si], list: list(null), matrix: snapM(null), msg: 'Start: the matrix holds direct edge weights only', tone: 'info' })
  for (let k = 0; k < n; k++) {
    rec.push({ status: status(k), dist: d[si], list: list(k), matrix: snapM({ k }), msg: `k = ${L(k)}: now paths may pass through ${L(k)}`, tone: 'info' })
    for (let i = 0; i < n; i++) {
      if (i === k || d[i][k] === INF) continue
      for (let j = 0; j < n; j++) {
        if (j === k || d[k][j] === INF) continue
        const via = d[i][k] + d[k][j]
        const hi = { i, j, k }
        if (via < d[i][j]) {
          const before = d[i][j]
          d[i][j] = via
          next[i][j] = next[i][k]
          rec.push({ status: status(k, i, j), dist: d[si], list: list(k), matrix: snapM(hi, true), msg: `d[${L(i)}][${L(j)}]: ${fmt(before)} → ${L(i)}→${L(k)}→${L(j)} = ${plus(d[i][k], d[k][j])} = ${via}`, tone: 'good' })
        } else {
          rec.push({ status: status(k, i, j), dist: d[si], list: list(k), matrix: snapM(hi, false), msg: `d[${L(i)}][${L(j)}]: via ${L(k)} = ${via}, keep ${fmt(d[i][j])}`, tone: 'muted' })
        }
      }
    }
  }
  const all = graph.nodes.map(() => 'done')
  const neg = d.findIndex((r, i) => r[i] < 0)
  if (neg !== -1) {
    rec.push({ status: all, dist: d[si], list: list(n), matrix: snapM({ i: neg, j: neg }), msg: `NEGATIVE CYCLE: d[${L(neg)}][${L(neg)}] = ${d[neg][neg]} < 0. A node is cheaper than itself.`, tone: 'bad' })
    return rec.frames
  }
  const pathEdges = []
  if (d[si][ti] !== INF) {
    for (let u = si; u !== ti; ) {
      const v = next[u][ti]
      pathEdges.push(`${graph.nodes[u].id}>${graph.nodes[v].id}`)
      u = v
    }
  }
  rec.push({
    status: all, dist: d[si], list: list(n), matrix: snapM({ i: si, j: ti }), pathEdges,
    msg: d[si][ti] === INF ? `${L(ti)} unreachable from ${L(si)}` : `All pairs done. ${L(si)}→${L(ti)} costs ${d[si][ti]}`,
    tone: d[si][ti] === INF ? 'bad' : 'good',
  })
  return rec.frames
}

export const RUNNERS = { bfs, zeroOne: zeroOneBfs, bellman: bellmanFord, floyd: floydWarshall }
