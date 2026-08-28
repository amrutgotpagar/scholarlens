import { memo } from 'react'
import { LiquidMetal as LiquidMetalShader } from '@paper-design/shaders-react'
import { cn } from '../../lib/utils'

interface LiquidMetalProps {
  colorBack?: string
  colorTint?: string
  speed?: number
  repetition?: number
  distortion?: number
  scale?: number
  className?: string
}

/** A thin, real-time WebGL liquid-metal shader (not a CSS gradient) — same
 * effect ScholarLens's RFE sibling project uses for its "chrome" button ring. */
export const LiquidMetal = memo(function LiquidMetal({
  colorBack = '#aaaaac',
  colorTint = '#ffffff',
  speed = 0.5,
  repetition = 4,
  distortion = 0.1,
  scale = 1,
  className,
}: LiquidMetalProps) {
  return (
    <div className={cn('absolute inset-0 z-0 overflow-hidden', className)}>
      <LiquidMetalShader
        colorBack={colorBack}
        colorTint={colorTint}
        speed={speed}
        repetition={repetition}
        distortion={distortion}
        softness={0}
        shiftRed={0.3}
        shiftBlue={-0.3}
        angle={45}
        shape="none"
        scale={scale}
        fit="cover"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
})
