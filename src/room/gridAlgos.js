import { Heap } from '../lib/heap.js'
import { OPEN } from './rooms.js'

// Cell states inside a frame snapshot.
export const UNSEEN = 0
export const FRONTIER = 1
export const EXPLORED = 2

export const manhattan = (room, a, b) =>
  Math.abs((a % room.cols) - (b % room.cols)) +
  Math.abs(Math.floor(a / room.cols) - Math.floor(b / room.cols))

// Runs Dijkstra or A* (4-neighbour, unit cost) and records one frame per pop,
// so every frame can be stepped to forwards or backwards.
export function runGrid(room, algo) {
  const { cols, rows, kind, start, key } = room
  const n = cols * rows
  const astar = algo === 'astar'
  const h = i => (astar ? manhattan(room, i, key) : 0)

  const g = new Int32Array(n).fill(-1)
  const parent = new Int32Array(n).fill(-1)
  const state = new Uint8Array(n)
  let seq = 0
  // Dijkstra: smallest g, FIFO on ties. A*: smallest f, then smallest h, then newest.
  const heap = new Heap((a, b) =>
    a.f !== b.f ? a.f < b.f : astar ? (a.h !== b.h ? a.h < b.h : a.seq > b.seq) : a.seq < b.seq,
  )

  const frames = []
  let explored = 0
  let frontier = 1
  const snap = (current, msg, path = null) =>
    frames.push({ current, explored, frontier, msg, path, state: state.slice(), g: g.slice() })

  g[start] = 0
  state[start] = FRONTIER
  heap.push({ i: start, f: h(start), h: h(start), seq: seq++ })
  snap(-1, 'Start: only the phone is in the frontier')

  while (heap.size) {
    const { i: cur } = heap.pop()
    if (state[cur] === EXPLORED) continue // stale heap entry
    state[cur] = EXPLORED
    explored++
    frontier--

    if (cur === key) {
      const path = []
      for (let p = cur; p !== -1; p = parent[p]) path.push(p)
      snap(cur, `Key found! Path length ${g[cur]}`, path.reverse())
      return frames
    }

    const x = cur % cols, y = Math.floor(cur / cols)
    const nbrs = [
      y > 0 && cur - cols,
      x < cols - 1 && cur + 1,
      y < rows - 1 && cur + cols,
      x > 0 && cur - 1,
    ]
    for (const nb of nbrs) {
      if (nb === false || kind[nb] !== OPEN || state[nb] === EXPLORED) continue
      const ng = g[cur] + 1
      if (g[nb] === -1 || ng < g[nb]) {
        if (state[nb] === UNSEEN) frontier++
        g[nb] = ng
        parent[nb] = cur
        state[nb] = FRONTIER
        heap.push({ i: nb, f: ng + h(nb), h: h(nb), seq: seq++ })
      }
    }
    const f = astar ? ` · f=${g[cur]}+${h(cur)}=${g[cur] + h(cur)}` : ''
    snap(cur, `Popped (${x},${y}) g=${g[cur]}${f} → locked`)
  }
  snap(-1, 'No path: the key is unreachable')
  return frames
}
