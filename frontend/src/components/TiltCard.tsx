import { useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { CornerFrame } from './CornerFrame'

interface Props {
  children: ReactNode
  className?: string
}

/** A card that tilts in 3D toward the cursor, with a soft glare that tracks it. */
export function TiltCard({ children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  const springConfig = { stiffness: 150, damping: 18, mass: 0.5 }
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [10, -10]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-10, 10]), springConfig)
  const glareX = useTransform(mouseX, [0, 1], [0, 100])
  const glareY = useTransform(mouseY, [0, 1], [0, 100])
  const glareBackground = useTransform(
    [glareX, glareY],
    ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(99,102,241,0.15), transparent 60%)`,
  )

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width)
    mouseY.set((e.clientY - rect.top) / rect.height)
  }

  const handleMouseLeave = () => {
    mouseX.set(0.5)
    mouseY.set(0.5)
  }

  return (
    <div style={{ perspective: 1000 }} className={className}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="group relative h-full rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20"
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ background: glareBackground }}
        />
        <CornerFrame color="rgb(99 102 241)" size={12} inset={10} />
        <div style={{ transform: 'translateZ(40px)', transformStyle: 'preserve-3d' }} className="relative h-full">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
