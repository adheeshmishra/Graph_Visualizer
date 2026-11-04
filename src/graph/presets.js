// Graph coordinates live in a 600 × 420 SVG viewBox. Edges are directed.
const N = (id, x, y) => ({ id, label: id, x, y })
const E = (from, to, w = 1) => ({ id: `${from}>${to}`, from, to, w })

export const PRESETS = {
  unweighted: {
    name: 'Unweighted',
    graph: {
      nodes: [N('S', 60, 210), N('A', 210, 90), N('B', 210, 330), N('C', 380, 90), N('D', 380, 330), N('E', 530, 330), N('T', 540, 150)],
      edges: [E('S', 'A'), E('S', 'B'), E('A', 'C'), E('B', 'D'), E('C', 'T'), E('D', 'C'), E('D', 'E'), E('E', 'T')],
    },
  },
  zeroOne: {
    name: '0/1 weighted',
    graph: {
      nodes: [N('S', 60, 210), N('A', 210, 90), N('B', 210, 330), N('C', 390, 330), N('D', 390, 90), N('T', 545, 210)],
      edges: [E('S', 'A', 1), E('S', 'B', 1), E('A', 'D', 1), E('B', 'C', 0), E('C', 'D', 0), E('C', 'T', 1), E('D', 'T', 1)],
    },
  },
  negEdge: {
    name: 'One negative edge',
    graph: {
      nodes: [N('S', 60, 210), N('A', 240, 80), N('B', 240, 340), N('C', 400, 210), N('T', 550, 210)],
      // Listed "backwards" on purpose so Bellman-Ford needs several passes.
      edges: [E('C', 'T', 2), E('A', 'C', 2), E('B', 'A', -3), E('B', 'C', 3), E('S', 'A', 6), E('S', 'B', 2)],
    },
  },
  negCycle: {
    name: 'Negative cycle',
    graph: {
      nodes: [N('S', 60, 210), N('A', 220, 90), N('B', 420, 90), N('C', 320, 320), N('T', 555, 230)],
      edges: [E('S', 'A', 1), E('A', 'B', 1), E('B', 'C', -3), E('C', 'A', 1), E('B', 'T', 2), E('S', 'C', 4)],
    },
  },
}

export const ALGOS = {
  bfs: { name: 'BFS', preset: 'unweighted', frontier: 'Queue (FIFO)' },
  zeroOne: { name: '0-1 BFS', preset: 'zeroOne', frontier: 'Deque' },
  bellman: { name: 'Bellman-Ford', preset: 'negEdge', frontier: 'Edge list (one sweep per pass)' },
  floyd: { name: 'Floyd-Warshall', preset: 'negEdge', frontier: 'Intermediate node k' },
}

export const clone = g => ({ nodes: g.nodes.map(n => ({ ...n })), edges: g.edges.map(e => ({ ...e })) })
