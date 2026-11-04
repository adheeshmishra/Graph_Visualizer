import { useEffect, useRef, useState } from 'react'

// ?step=N opens on a given frame, handy for recording a specific moment.
const urlStep = Number(new URLSearchParams(location.search).get('step')) || 0

// Playback over a precomputed list of frames. Because frames are snapshots,
// stepping back is just index - 1.
export function useStepper(total, resetKey, { defaultSpeed = 10, active = true } = {}) {
  const [index, setIndex] = useState(() => Math.min(urlStep, total - 1))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(defaultSpeed)

  const first = useRef(true)
  useEffect(() => {
    if (first.current) return void (first.current = false)
    setIndex(0)
    setPlaying(false)
  }, [resetKey])

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setIndex(i => Math.min(i + 1, total - 1)), 1000 / speed)
    return () => clearInterval(id)
  }, [playing, speed, total])

  useEffect(() => {
    if (index >= total - 1) setPlaying(false)
  }, [index, total])

  const last = total - 1
  const api = {
    index,
    total,
    playing,
    speed,
    setSpeed,
    setIndex: i => setIndex(Math.max(0, Math.min(last, i))),
    toggle: () => {
      if (!playing && index >= last) setIndex(0)
      setPlaying(p => !p)
    },
    stepForward: () => { setPlaying(false); setIndex(i => Math.min(last, i + 1)) },
    stepBack: () => { setPlaying(false); setIndex(i => Math.max(0, i - 1)) },
    toStart: () => { setPlaying(false); setIndex(0) },
    toEnd: () => { setPlaying(false); setIndex(last) },
  }

  useEffect(() => {
    if (!active) return
    const onKey = e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return
      const map = { ' ': api.toggle, ArrowRight: api.stepForward, ArrowLeft: api.stepBack, Home: api.toStart, End: api.toEnd }
      const fn = map[e.key]
      if (fn) {
        e.preventDefault()
        fn()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return api
}
