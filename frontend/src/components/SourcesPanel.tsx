import type { Citation } from '../types'

interface Props {
  citations: Citation[]
  highlightedRefId: number | null
}

export function SourcesPanel({ citations, highlightedRefId }: Props) {
  if (citations.length === 0) return null

  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wide">Sources</h3>
      <div className="space-y-2">
        {citations.map((citation) => (
          <div
            key={citation.ref_id}
            id={`source-${citation.ref_id}`}
            className={`scroll-mt-4 rounded-lg border p-3 text-sm transition-colors duration-300 ${
              highlightedRefId === citation.ref_id
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">[{citation.ref_id}]</span>
              <span className="truncate">{citation.document_title}</span>
              {citation.page_number !== null && <span>· page {citation.page_number}</span>}
            </div>
            <p className="text-slate-700">{citation.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
