import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { deleteDocument, listDocuments, uploadDocument } from '../api'
import { DocumentSidebar } from '../components/DocumentSidebar'
import { PdfPreviewModal } from '../components/PdfPreviewModal'
import { QueryPanel } from '../components/QueryPanel'
import { TopBar } from '../components/TopBar'
import type { DocumentOut } from '../types'

export function Workspace() {
  const [documents, setDocuments] = useState<DocumentOut[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewDocument, setPreviewDocument] = useState<DocumentOut | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const refreshDocuments = async () => {
    try {
      setDocuments(await listDocuments())
    } catch {
      // Listing failure isn't actionable from here; the sidebar just stays empty/stale.
    }
  }

  useEffect(() => {
    void refreshDocuments()
  }, [])

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      await uploadDocument(file)
      await refreshDocuments()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (document: DocumentOut) => {
    if (selectedDocumentId === document.id) setSelectedDocumentId(null)
    setDocuments((prev) => prev.filter((d) => d.id !== document.id)) // optimistic — a stuck row should disappear immediately
    try {
      await deleteDocument(document.id)
    } catch {
      await refreshDocuments() // restore the real state if the delete didn't actually go through
    }
  }

  const selectedDocument = documents.find((d) => d.id === selectedDocumentId)
  const selectedDocumentLabel = selectedDocument ? selectedDocument.title ?? selectedDocument.filename : 'All documents'

  return (
    <div className="premium-bg flex h-screen w-screen flex-col overflow-hidden bg-slate-100 dark:bg-black">
      <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
        <TopBar documents={documents} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      </motion.div>
      <div className="relative flex flex-1 gap-3 overflow-hidden p-3">
        {/* Mobile backdrop — the sidebar itself is a fixed drawer below md, static
         * in-flow above it (the two-panel side-by-side layout has no room to spare
         * on a phone-width screen). */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          />
        )}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          className={`fixed inset-y-3 left-3 z-50 transition-transform duration-300 ease-out md:static md:z-auto md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%_+_0.75rem)]'
          }`}
        >
          <DocumentSidebar
            documents={documents}
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={(id) => {
              setSelectedDocumentId(id)
              setSidebarOpen(false) // a document pick should return focus to the chat on mobile
            }}
            onUpload={handleUpload}
            uploading={uploading}
            uploadError={uploadError}
            onPreview={setPreviewDocument}
            onDelete={handleDelete}
          />
        </motion.div>
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.18, ease: 'easeOut' }}
          className="flex-1 overflow-hidden rounded-[17px] bg-gradient-to-br from-indigo-200/60 via-white/40 to-violet-200/60 p-px shadow-xl shadow-slate-900/5 dark:from-indigo-500/20 dark:via-white/5 dark:to-violet-500/15 dark:shadow-black/30"
        >
          <main className="premium-bg h-full overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
            <QueryPanel
              selectedDocumentId={selectedDocumentId}
              selectedDocumentLabel={selectedDocumentLabel}
              hasDocuments={documents.some((d) => d.status === 'ready')}
            />
          </main>
        </motion.div>
      </div>
      <PdfPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
    </div>
  )
}
