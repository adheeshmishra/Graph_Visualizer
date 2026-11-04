import { useEffect, useRef, useState } from 'react'

export function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(600)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}
