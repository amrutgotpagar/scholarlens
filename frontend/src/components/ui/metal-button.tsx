import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { LiquidMetal } from './LiquidMetal'
import { cn } from '../../lib/utils'

/** A gentle magnetic pull toward the cursor — the button leans into your mouse
 * as it nears and springs back once it leaves. Kept subtle so it reads as
 * tactile weight, not a gimmick — same feel as ScholarLens's RFE sibling. */
function useMagnetic(strength = 0.3) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.2 })
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.2 })

  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength)
  }

  const onMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return { style: { x: springX, y: springY }, onMouseMove, onMouseLeave }
}

export interface MetalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  /** 'primary': white chrome fill. 'muted': translucent indigo fill, for secondary use. */
  variant?: 'primary' | 'muted'
}

export const MetalButton = React.forwardRef<HTMLButtonElement, MetalButtonProps>(
  ({ className, variant = 'primary', asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const magnetic = useMagnetic()

    return (
      <motion.div
        style={magnetic.style}
        onMouseMove={magnetic.onMouseMove}
        onMouseLeave={magnetic.onMouseLeave}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className={cn('group inline-block', className)}
      >
        <Comp ref={ref} {...props}>
          <div
            className="relative w-full overflow-hidden rounded-full shadow-[0_20px_50px_-12px_rgba(79,70,229,0.45)]"
            style={{ padding: 3 }}
          >
            <LiquidMetal
              colorBack="#2e2470"
              colorTint="#e3d9ff"
              speed={0.4}
              repetition={4}
              distortion={0.15}
              className="absolute inset-0 z-0 rounded-full"
            />
            <div
              className={cn(
                'relative z-10 flex w-full items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200',
                variant === 'muted'
                  ? 'bg-indigo-950/85 text-indigo-100 group-hover:bg-indigo-900/85'
                  : 'bg-white text-slate-900 group-hover:bg-slate-50',
              )}
            >
              {children}
            </div>
          </div>
        </Comp>
      </motion.div>
    )
  },
)
MetalButton.displayName = 'MetalButton'
