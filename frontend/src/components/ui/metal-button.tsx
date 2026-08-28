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
  size?: 'default' | 'sm' | 'lg'
}

const sizeStyles = {
  default: 'gap-2 px-7 py-3 text-sm',
  sm: 'gap-1.5 px-5 py-2 text-xs',
  lg: 'gap-2.5 px-8 py-3.5 text-base',
}

export const MetalButton = React.forwardRef<HTMLButtonElement, MetalButtonProps>(
  ({ className, variant = 'primary', size = 'default', asChild = false, children, ...props }, ref) => {
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
        {/* The chrome ring (shader + padding) wraps Comp rather than the other way
         * round — Comp's only child is {children} itself (the caller's Link/text),
         * exactly like LiquidButton. Radix's Slot merges its props onto whatever
         * single child it's given, so nesting {children} any deeper here would
         * merge onto a decorative wrapper div instead of the real link/button. */}
        <div
          className="relative overflow-hidden rounded-full shadow-[0_20px_50px_-12px_rgba(79,70,229,0.45)]"
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
          <Comp
            ref={ref}
            className={cn(
              'relative z-10 flex items-center justify-center rounded-full font-semibold whitespace-nowrap transition-colors duration-200 [&_svg]:pointer-events-none [&_svg]:shrink-0',
              sizeStyles[size],
              variant === 'muted'
                ? 'bg-indigo-950/85 text-indigo-100 group-hover:bg-indigo-900/85'
                : 'bg-white text-slate-900 group-hover:bg-slate-50',
            )}
            {...props}
          >
            {children}
          </Comp>
        </div>
      </motion.div>
    )
  },
)
MetalButton.displayName = 'MetalButton'
