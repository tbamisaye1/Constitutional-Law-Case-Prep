import { useEffect, useState } from 'react'

/**
 * Track an element's content-box size. Used to feed react-arborist a real
 * height so Add page / Add section footers can stay pinned in view.
 */
export function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined

    const update = () => {
      const rect = el.getBoundingClientRect()
      setSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return size
}
