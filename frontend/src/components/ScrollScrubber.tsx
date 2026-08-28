import { useEffect, useRef, useState } from 'react'
import { useMotionValueEvent, useScroll } from 'framer-motion'

// The source export has 240 frames; every other one is visually indistinguishable
// for a slow hand-writing motion and halves both network requests and decode work,
// which is what was actually making scroll feel heavy (240 in-flight image loads
// plus a full-res decode on every scroll tick).
const SOURCE_FRAME_COUNT = 240
const FRAME_COUNT = 120
const frameUrl = (i: number) => {
  const sourceIndex = Math.round((i * (SOURCE_FRAME_COUNT - 1)) / (FRAME_COUNT - 1))
  return `/scrub/ezgif-frame-${String(sourceIndex + 1).padStart(3, '0')}.jpg`
}

interface Props {
  /** Rendered inside the pinned viewport, on top of the canvas. */
  children?: React.ReactNode
  /** How many viewport-heights of scroll the sequence plays across. */
  scrollHeight?: number
  /** Share the pinned/scroll container with a parent so it can track the same progress. */
  containerRef?: React.RefObject<HTMLDivElement | null>
}

export function ScrollScrubber({ children, scrollHeight = 3, containerRef: externalRef }: Props) {
  const ownRef = useRef<HTMLDivElement>(null)
  const containerRef = externalRef ?? ownRef
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const drawnFrameRef = useRef(-1)
  const [loadedCount, setLoadedCount] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = () => setReducedMotion(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    let cancelled = false
    let count = 0
    let flushScheduled = false
    const images: HTMLImageElement[] = []

    // 240 onload callbacks fire in rapid succession as the browser finishes each
    // request; a setState per callback means 240 re-renders back to back, which
    // starves the main thread badly enough to make scrolling stutter during load.
    // Batch them to at most one state update per animation frame instead.
    const scheduleFlush = () => {
      if (flushScheduled) return
      flushScheduled = true
      requestAnimationFrame(() => {
        flushScheduled = false
        if (!cancelled) setLoadedCount(count)
      })
    }

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image()
      img.src = frameUrl(i)
      img.onload = () => {
        if (cancelled) return
        count += 1
        scheduleFlush()
      }
      images.push(img)
    }
    imagesRef.current = images
    return () => {
      cancelled = true
    }
  }, [])

  const drawFrame = (index: number) => {
    const canvas = canvasRef.current
    const img = imagesRef.current[index]
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return
    if (drawnFrameRef.current === index) return
    drawnFrameRef.current = index

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    // Source frames are 1280x720 — DPR 2 on a ~1280px-wide viewport would upsample
    // past the source resolution for no visible gain, just extra fill-rate cost on
    // every scroll tick. Cap low enough to stay a no-op on typical hero widths.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const cssWidth = canvas.clientWidth
    const cssHeight = canvas.clientHeight
    if (canvas.width !== cssWidth * dpr || canvas.height !== cssHeight * dpr) {
      canvas.width = cssWidth * dpr
      canvas.height = cssHeight * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // object-fit: cover
    const scale = Math.max(cssWidth / img.naturalWidth, cssHeight / img.naturalHeight)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    const x = (cssWidth - w) / 2
    const y = (cssHeight - h) / 2
    ctx.drawImage(img, x, y, w, h)
  }

  // useMotionValueEvent's callback can fire many times per scroll gesture (once per
  // wheel/touch delta, not once per frame). Collapsing to the latest requested index
  // and drawing at most once per animation frame keeps fast scrolls from queuing up a
  // backlog of canvas draws the browser can't keep pace with.
  const pendingIndexRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    const index = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(progress * (FRAME_COUNT - 1))))
    pendingIndexRef.current = index
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      if (pendingIndexRef.current !== null) drawFrame(pendingIndexRef.current)
    })
  })

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    if (loadedCount === 0) return
    drawFrame(Math.round(scrollYProgress.get() * (FRAME_COUNT - 1)))
  }, [loadedCount, scrollYProgress])

  useEffect(() => {
    const onResize = () => {
      drawnFrameRef.current = -1
      drawFrame(Math.round(scrollYProgress.get() * (FRAME_COUNT - 1)))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProgress = loadedCount / FRAME_COUNT

  if (reducedMotion) {
    return (
      <div className="relative h-screen w-full overflow-hidden">
        <img
          src={frameUrl(FRAME_COUNT - 1)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center">{children}</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ height: `${scrollHeight * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/40"
        />
        {loadProgress < 1 && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-900/10 dark:bg-white/10">
            <div
              className="h-full bg-indigo-500 transition-[width] duration-150 ease-out"
              style={{ width: `${loadProgress * 100}%` }}
            />
          </div>
        )}
        <div className="absolute inset-0 flex items-center">{children}</div>
      </div>
    </div>
  )
}
