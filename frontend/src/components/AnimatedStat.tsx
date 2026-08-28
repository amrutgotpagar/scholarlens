import { useEffect, useRef } from 'react'
import { animate, useInView, useMotionValue, useMotionValueEvent } from 'framer-motion'

interface Props {
  /** e.g. "100%", "$0", "29/29" — only the first number found is animated. */
  value: string
  className?: string
}

/** Counts up to the numeric part of `value` once scrolled into view, keeping any
 * surrounding text (%, $, "/29") static so odd formats don't need special-casing. */
export function AnimatedStat({ value, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const match = value.match(/-?\d+(\.\d+)?/)
  const target = match ? parseFloat(match[0]) : null
  const count = useMotionValue(0)
  const displayRef = useRef<HTMLSpanElement>(null)

  useMotionValueEvent(count, 'change', (latest) => {
    if (!displayRef.current || target === null || !match) return
    const rounded = Number.isInteger(target) ? Math.round(latest) : Math.round(latest * 10) / 10
    displayRef.current.textContent = value.slice(0, match.index) + rounded + value.slice(match.index! + match[0].length)
  })

  useEffect(() => {
    if (!inView || target === null) return
    const controls = animate(count, target, { duration: 1.1, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [inView, target, count])

  if (target === null) {
    return (
      <span ref={ref} className={className}>
        {value}
      </span>
    )
  }

  return (
    <span ref={ref} className={className}>
      <span ref={displayRef}>{value.slice(0, match!.index)}0{value.slice(match!.index! + match![0].length)}</span>
    </span>
  )
}
