import { FileText } from 'lucide-react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import type { Citation } from '../types'

const CITATION_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\]/g
const CITE_HREF_PREFIX = 'cite:'

interface Props {
  text: string
  citations: Citation[]
  onCitationClick: (refId: number) => void
  isStreaming?: boolean
}

/** Rewrites "[1]" / "[1, 3]" markers into markdown links pointing at a synthetic
 * "cite:1" href, so they ride through react-markdown's normal parsing instead of
 * needing a separate text-splitting pass. Markers referencing an unknown ref id
 * are left as plain text. */
function linkifyCitations(text: string, validRefIds: Set<number>): string {
  return text.replace(CITATION_PATTERN, (match, idsPart: string) => {
    const refIds = idsPart.split(',').map((s) => Number.parseInt(s.trim(), 10))
    if (!refIds.every((id) => validRefIds.has(id))) return match
    return `[${match}](${CITE_HREF_PREFIX}${refIds[0]})`
  })
}

function shortTitle(title: string): string {
  return title.length > 22 ? `${title.slice(0, 21)}…` : title
}

export function AnswerText({ text, citations, onCitationClick, isStreaming }: Props) {
  const citationsByRefId = new Map(citations.map((c) => [c.ref_id, c]))
  const validRefIds = new Set(citations.map((c) => c.ref_id))

  return (
    <div className="prose prose-slate dark:prose-invert prose-p:leading-relaxed prose-p:my-3 first:prose-p:mt-0 prose-strong:font-semibold prose-strong:text-slate-900 dark:prose-strong:text-white max-w-none font-serif text-[16.5px]">
      <ReactMarkdown
        // react-markdown's default sanitizer blanks any URL scheme it doesn't recognize
        // (http/https/mailto/etc.) — our synthetic "cite:1" hrefs need an explicit carve-out
        // or they're silently stripped to "" before the `a` component below ever sees them.
        urlTransform={(url) => (url.startsWith(CITE_HREF_PREFIX) ? url : defaultUrlTransform(url))}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith(CITE_HREF_PREFIX)) {
              const refId = Number.parseInt(href.slice(CITE_HREF_PREFIX.length), 10)
              const citation = citationsByRefId.get(refId)
              return (
                <button
                  type="button"
                  onClick={() => onCitationClick(refId)}
                  className="mx-0.5 inline-flex translate-y-[3px] items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50/80 px-1.5 py-0.5 align-baseline font-sans text-[11px] font-medium text-indigo-700 no-underline transition-colors hover:border-indigo-200 hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                >
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                    <FileText size={8} />
                  </span>
                  {citation ? shortTitle(citation.document_title) : children}
                </button>
              )
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          },
        }}
      >
        {linkifyCitations(text, validRefIds)}
      </ReactMarkdown>
      {isStreaming && (
        <span className="animate-blink ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-indigo-400 dark:bg-indigo-500" />
      )}
    </div>
  )
}
