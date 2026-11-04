// Cell kinds. 0 is open floor; everything else blocks movement.
export const OPEN = 0
export const WALL = 1
export const SOFA = 2
export const TABLE = 3
export const SHELF = 4

export const KIND_STYLE = {
  [WALL]: { bg: '#3b4252', label: 'Wall' },
  [SOFA]: { bg: '#7c3aed', label: 'Sofa' },
  [TABLE]: { bg: '#b45309', label: 'Table' },
  [SHELF]: { bg: '#0f766e', label: 'Shelf' },
}

function build({ cols, rows, items, start, key }) {
  const kind = new Uint8Array(cols * rows)
  for (let x = 0; x < cols; x++) {
    kind[x] = WALL
    kind[(rows - 1) * cols + x] = WALL
  }
  for (let y = 0; y < rows; y++) {
    kind[y * cols] = WALL
    kind[y * cols + cols - 1] = WALL
  }
  for (const it of items) {
    for (let y = it.y; y < it.y + it.h; y++)
      for (let x = it.x; x < it.x + it.w; x++) kind[y * cols + x] = it.kind
  }
  return {
    cols,
    rows,
    kind,
    labels: items.filter(it => it.label),
    start: start[1] * cols + start[0],
    key: key[1] * cols + key[0],
  }
}

export const ROOMS = {
  big: {
    name: 'Living room',
    hint: 'Big room: watch the explored-cell counts',
    make: () =>
      build({
        cols: 28,
        rows: 16,
        start: [3, 13],
        key: [23, 4],
        items: [
          // Bedroom wall with a doorway facing the living room.
          { kind: WALL, x: 18, y: 1, w: 1, h: 2 },
          { kind: WALL, x: 18, y: 6, w: 1, h: 3 },
          { kind: WALL, x: 19, y: 8, w: 5, h: 1 },
          { kind: SOFA, x: 5, y: 10, w: 7, h: 2, label: 'SOFA' },
          { kind: TABLE, x: 9, y: 4, w: 4, h: 3, label: 'TABLE' },
          { kind: SHELF, x: 1, y: 1, w: 5, h: 1 },
          { kind: TABLE, x: 21, y: 11, w: 3, h: 3, label: 'DESK' },
          { kind: SOFA, x: 23, y: 2, w: 4, h: 1, label: 'BED' },
        ],
      }),
  },
  close: {
    name: 'Close-up',
    hint: 'Close-up: cells big enough to read g, h and f',
    make: () =>
      build({
        cols: 12,
        rows: 9,
        start: [2, 6],
        key: [9, 2],
        items: [
          { kind: SOFA, x: 5, y: 2, w: 2, h: 4, label: 'SOFA' },
          { kind: TABLE, x: 8, y: 5, w: 2, h: 2, label: 'TABLE' },
        ],
      }),
  },
}
