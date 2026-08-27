import type { ReactNode } from 'react'

const CITATION_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\]/g

interface Props {
  text: string
  validRefIds: Set<number>
  onCitationClick: (refId: number) => void
}

/** Renders answer text, turning "[1]" / "[1, 3]" markers into clickable badges that jump to
 * the matching source card. Markers referencing an unknown ref id render as plain text. */
export function AnswerText({ text, validRefIds, onCitationClick }: Props) {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  // matchAll (rather than a manual exec loop) doesn't mutate CITATION_PATTERN.lastIndex,
  // so concurrent renders can't corrupt each other's match position on the shared regex.
  for (const match of text.matchAll(CITATION_PATTERN)) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const refIds = match[1].split(',').map((s) => Number.parseInt(s.trim(), 10))
    const allValid = refIds.every((id) => validRefIds.has(id))

    if (allValid) {
      parts.push(
        <button
          key={`cite-${key++}`}
          type="button"
          onClick={() => onCitationClick(refIds[0])}
          className="mx-0.5 rounded bg-indigo-100 px-1 font-mono text-xs text-indigo-700 hover:bg-indigo-200"
        >
          {match[0]}
        </button>,
      )
    } else {
      parts.push(match[0])
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <p className="whitespace-pre-wrap text-slate-800">{parts}</p>
}
