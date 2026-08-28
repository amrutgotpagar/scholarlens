interface Props {
  size?: number
  className?: string
}

/** ScholarLens's mark: a document (the paper) examined by a lens (the "Lens" in
 * ScholarLens) — self-contained with its own indigo background, same design as
 * public/favicon.svg, reused here instead of a generic icon dropped into a
 * separate gradient badge wrapper. */
export function Logomark({ size = 28, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#4f46e5" />
      <path d="M18 16h20l8 8v24a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4Z" fill="white" fillOpacity="0.95" />
      <path d="M38 16v8h8" stroke="#4f46e5" strokeWidth="2" strokeLinejoin="round" />
      <rect x="20" y="30" width="16" height="2.5" rx="1.25" fill="#c7d2fe" />
      <rect x="20" y="36" width="20" height="2.5" rx="1.25" fill="#c7d2fe" />
      <rect x="20" y="42" width="12" height="2.5" rx="1.25" fill="#c7d2fe" />
      <circle cx="46" cy="46" r="12" fill="#4f46e5" />
      <circle cx="43" cy="43" r="5.5" stroke="white" strokeWidth="2.4" fill="none" />
      <path d="M47.2 47.2 51 51" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
