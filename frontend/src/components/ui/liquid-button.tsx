import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const liquidButtonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap outline-none transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // ScholarLens's own indigo/violet palette rather than shadcn's CSS-variable
        // tokens (--primary etc.), which this project's Tailwind config doesn't define.
        light: 'bg-white text-slate-900',
        dark: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
        indigo: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white',
      },
      size: {
        default: 'h-11 px-6',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-8 text-base',
      },
    },
    defaultVariants: {
      variant: 'light',
      size: 'default',
    },
  },
)

export interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof liquidButtonVariants> {
  asChild?: boolean
}

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      // Radix's Slot requires exactly one child to merge props onto — the decorative
      // overlays have to live outside it, in a plain wrapping span, rather than as
      // siblings passed into Comp alongside {children}.
      // `className` is merged onto both the wrapper and Comp: layout utilities like
      // w-full or margins need to land on the wrapper (Comp alone can't stretch an
      // inline-flex wrapper that's sized to hug it — that's circular), while visual
      // utilities like border/bg land on Comp where they're actually meant to render.
      // Harmless overlap either way since they resolve independently per twMerge call.
      <span className={cn('group relative inline-flex', className)}>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_2px_2px_1px_-1px_rgba(255,255,255,0.6),inset_-2px_-2px_1px_-1px_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.12)] transition-opacity group-hover:opacity-80"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-full"
          style={{ backdropFilter: 'url("#liquid-glass-filter")' }}
        />
        <Comp ref={ref} className={cn(liquidButtonVariants({ variant, size }), 'relative z-10', className)} {...props}>
          {children}
        </Comp>
      </span>
    )
  },
)
LiquidButton.displayName = 'LiquidButton'

/** The shared SVG filter every LiquidButton references by id — mount this once
 * near the app root (not per-button; url() resolves by id regardless of which
 * element defines it, so duplicating it per instance would be pure waste). */
export function LiquidGlassFilterDefs() {
  return (
    <svg className="absolute h-0 w-0" aria-hidden>
      <defs>
        <filter id="liquid-glass-filter" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="45"
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>
      </defs>
    </svg>
  )
}
