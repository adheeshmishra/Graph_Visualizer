# AirTag Brain

A visualizer for how pathfinding algorithms search a space, built for teaching content and screen recording.

- **Room tab:** Dijkstra and A* run on the same room, one above the other. Dijkstra floods outward; A* reaches for the key. The large counters show how many cells each one explored.
- **Graph tab:** BFS, 0-1 BFS, Bellman-Ford and Floyd-Warshall run on an editable node-and-edge graph. You can see the node being processed, distances updating, the frontier (queue, deque, edge list or k), visited nodes, and the final path.

The layout is a single column, at most 640px wide, so it survives a 9:16 vertical crop.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Controls

| Key | Action |
| --- | --- |
| Space | Play / pause |
| ← / → | Step back / forward |
| Home / End | First / last frame |

Every frame is a precomputed snapshot, so stepping back is exact. The lower slider scrubs through frames.

**Deep links** open on a specific frame, which helps when recording:

```
?step=120                                  room tab, frame 120
?room=close&step=30                        close-up room (g/h/f visible)
?tab=graph&algo=zeroOne&step=9             0-1 BFS, addFirst moment
?tab=graph&algo=bellman&preset=negCycle    Bellman-Ford on the negative cycle
```

`algo` is `bfs`, `zeroOne`, `bellman` or `floyd`. `preset` is `unweighted`, `zeroOne`, `negEdge` or `negCycle`.

**Room editor:** click **Edit room**, then click or drag to add or remove walls. Drag 📱 or 🔑 to move them.

**Graph editor:** click **Edit graph**, then:

- click empty space to add a node
- drag from one node to another to add a directed edge
- drag a node into empty space to move it
- click an edge to set its weight (negative weights allowed)
- right-click a node or edge to delete it

## The algorithms

**BFS (breadth-first search):** explores in rings of equal hop count using a FIFO queue. The first time a node is reached is via a shortest path. Any later, longer path to it is skipped. Unweighted graphs only.
*Time O(V + E), space O(V).*

**0-1 BFS:** BFS with a deque for graphs whose weights are only 0 or 1. A 0-weight edge doesn't add distance, so the node goes to the *front* (addFirst). A 1-weight edge goes to the *back* (addLast). The deque stays sorted without a heap.
*Time O(V + E), space O(V).*

**Dijkstra:** always expands the closest unsettled node, taken from a min-heap. Once a node is popped it is *locked*, because its distance can no longer improve when all weights are non-negative. It searches evenly in every direction.
*Time O((V + E) log V) with a binary heap, space O(V).*

**A\*:** Dijkstra ordered by f = g + h, where g is the distance so far and h is a heuristic estimate of the distance left (Manhattan distance here). With an admissible h it still finds a shortest path, but it skips most of the space that leads away from the target.
*Worst case is the same as Dijkstra. In practice it explores far fewer nodes.*

**Bellman-Ford:** relaxes every edge, V − 1 times. Each pass lets shortest paths grow by one more edge, which is why it handles negative weights. If an edge can still be relaxed on an extra V-th pass, the graph has a negative cycle.
*Time O(V · E), space O(V).*

**Floyd-Warshall:** all-pairs shortest paths using dynamic programming. For each node k in turn, it checks whether going i → k → j beats the best known i → j. A negative value on the diagonal means a negative cycle.
*Time O(V³), space O(V²).*

## Deploy

**Vercel:** import the repo. The framework is auto-detected as Vite, the build command is `npm run build`, and the output directory is `dist`.

**GitHub Pages:** push to `main` and enable Pages with the source set to **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and publishes the site. `base: './'` in `vite.config.js` makes it work under any sub-path.

## Stack

React 18, Vite, Tailwind CSS 4. No backend.

## License

[MIT](LICENSE)
