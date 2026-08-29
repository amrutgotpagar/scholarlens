import { memo, useEffect, useState } from 'react'
import { GemSmoke, type GemSmokeProps } from '@paper-design/shaders-react'
import { cn } from '../../lib/utils'

type LiquidTextProps = {
  text: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: number
  /** Extra horizontal room around the measured glyphs, in px — the SVG mask's own text
   * rendering doesn't always match the canvas measurement exactly (see the font-fallback
   * note below), so a little slack keeps outer glyphs from clipping. Vertical padding is
   * deliberately not offered: it would inflate box height, and since an inline-block's CSS
   * baseline is its bottom margin edge, that shifts the whole word up relative to the
   * surrounding text baseline — worth an X/Y split, not a single symmetric `padding`. */
  paddingX?: number
  width?: number
  height?: number
  className?: string
} & Omit<GemSmokeProps, 'width' | 'height'>

type Box = { w: number; h: number; ascent: number }

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/** A text-shaped mask over a live WebGL gem-smoke shader — the glyphs are cut out of the
 * animated material rather than colored by it, so letterforms stay crisp while the fill
 * churns. `fontFamily`/`fontWeight` default to ScholarLens's own serif headline face
 * (Source Serif 4, see index.html) rather than a hardcoded sans-serif, so the
 * canvas-measured mask matches the glyph shapes the rest of the app actually uses. */
export const LiquidText = memo(function LiquidText({
  text,
  fontSize = 82,
  fontFamily = '"Source Serif 4", Georgia, serif',
  fontWeight = 600,
  paddingX = 0,
  width,
  height,
  className,
  ...shaderProps
}: LiquidTextProps) {
  const [box, setBox] = useState<Box | null>(null)

  useEffect(() => {
    let cancelled = false

    // Source Serif 4 loads async (see index.html's Google Fonts link) — measuring
    // before it's ready would size the mask against the Georgia/serif fallback
    // instead, so the shader glyphs would drift out of step with the real font.
    document.fonts.ready.then(() => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
      const metrics = ctx.measureText(text)

      const ascent = metrics.actualBoundingBoxAscent
      const descent = metrics.actualBoundingBoxDescent
      const measuredW = Math.ceil(metrics.width) + paddingX * 2
      const measuredH = Math.ceil(ascent + descent)

      const finalW = width ?? measuredW
      const finalH = height ?? measuredH

      setBox({
        w: finalW,
        h: finalH,
        ascent: ascent + (finalH - measuredH) / 2,
      })
    })

    return () => {
      cancelled = true
    }
  }, [text, fontSize, fontFamily, fontWeight, paddingX, width, height])

  if (!box) return null

  const escapedText = escapeXml(text)
  // fontFamily commonly carries literal double quotes ("Source Serif 4", Georgia, serif) —
  // interpolated raw into an XML attribute those quotes terminate the attribute early and
  // corrupt the whole SVG, so the mask silently fails to parse and the element renders as
  // fully masked out (invisible) rather than falling back to unmasked.
  const svgMask = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box.w} ${box.h}">
      <text
        x="50%" y="${box.ascent}"
        text-anchor="middle"
        dominant-baseline="alphabetic"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        font-family="${escapeXml(fontFamily)}"
        fill="white"
      >${escapedText}</text>
    </svg>
  `
  const maskUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(svgMask)}")`

  return (
    <div
      className={cn('inline-block', className)}
      style={{
        width: box.w,
        height: box.h,
        WebkitMaskImage: maskUrl,
        maskImage: maskUrl,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
      }}
    >
      <GemSmoke
        width={box.w}
        height={box.h}
        // No `image` prop: that only applies when deriving a custom shape from an
        // uploaded image. `shape="metaballs"` below is one of the shader's own built-in
        // procedural shapes and needs no image — passing one anyway (as the original
        // demo snippet did, pointing at the vendor's own diamond.svg) forces the shader
        // into image-texture mode instead, which renders fully transparent here since
        // that URL never resolves.
        // ScholarLens's own indigo brand palette (Logomark, MetalButton's "indigo"
        // variant, the icon gradients) rather than the shader's demo grey/diamond look.
        colors={['#c7d2fe', '#ffffff']}
        colorBack="#0f172a"
        colorInner="#4f46e5"
        shape="metaballs"
        innerDistortion={0.5}
        outerDistortion={0}
        outerGlow={0.51}
        innerGlow={1}
        offset={0}
        angle={152}
        size={0.35}
        speed={1}
        scale={4}
        {...shaderProps}
      />
    </div>
  )
})

export default LiquidText
