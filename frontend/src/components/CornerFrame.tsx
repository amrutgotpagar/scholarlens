interface Props {
  color?: string
  size?: number
  inset?: number
  alwaysOn?: boolean
  className?: string
}

/** Viewfinder-style registration marks — a camera-autofocus-bracket accent
 * used as a signature frame instead of a generic border/glow. */
export function CornerFrame({ color = 'currentColor', size = 14, inset = 10, alwaysOn = false, className = '' }: Props) {
  const base = `absolute border-current transition-opacity duration-300 ${
    alwaysOn ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
  }`
  const dim = { width: size, height: size }

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} style={{ color }}>
      <span className={`${base} border-t border-l`} style={{ ...dim, top: inset, left: inset }} />
      <span className={`${base} border-t border-r`} style={{ ...dim, top: inset, right: inset }} />
      <span className={`${base} border-b border-l`} style={{ ...dim, bottom: inset, left: inset }} />
      <span className={`${base} border-b border-r`} style={{ ...dim, bottom: inset, right: inset }} />
    </div>
  )
}
