import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'

const CITATION_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\]/g
const CITE_HREF_PREFIX = 'cite:'

interface Props {
  text: string
  validRefIds: Set<number>
  onCitationClick: (refId: number) => void
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

export function AnswerText({ text, validRefIds, onCitationClick }: Props) {
  return (
    <div className="prose prose-slate dark:prose-invert prose-p:leading-relaxed prose-p:my-3 first:prose-p:mt-0 max-w-none text-[15px]">
      <ReactMarkdown
        // react-markdown's default sanitizer blanks any URL scheme it doesn't recognize
        // (http/https/mailto/etc.) — our synthetic "cite:1" hrefs need an explicit carve-out
        // or they're silently stripped to "" before the `a` component below ever sees them.
        urlTransform={(url) => (url.startsWith(CITE_HREF_PREFIX) ? url : defaultUrlTransform(url))}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith(CITE_HREF_PREFIX)) {
              const refId = Number.parseInt(href.slice(CITE_HREF_PREFIX.length), 10)
              return (
                <button
                  type="button"
                  onClick={() => onCitationClick(refId)}
                  className="mx-0.5 rounded bg-indigo-100 px-1 py-0.5 font-mono text-xs font-medium text-indigo-700 no-underline hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
                >
                  {children}
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
    </div>
  )
}
