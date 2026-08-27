import { useEffect, useState } from 'react'
import { listDocuments, uploadDocument } from './api'
import { DocumentSidebar } from './components/DocumentSidebar'
import { QueryPanel } from './components/QueryPanel'
import type { DocumentOut } from './types'

function App() {
  const [documents, setDocuments] = useState<DocumentOut[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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

  const selectedDocument = documents.find((d) => d.id === selectedDocumentId)
  const selectedDocumentLabel = selectedDocument ? selectedDocument.title ?? selectedDocument.filename : 'All documents'

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <DocumentSidebar
        documents={documents}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={setSelectedDocumentId}
        onUpload={handleUpload}
        uploading={uploading}
        uploadError={uploadError}
      />
      <main className="flex-1 overflow-hidden">
        <QueryPanel selectedDocumentId={selectedDocumentId} selectedDocumentLabel={selectedDocumentLabel} />
      </main>
    </div>
  )
}

export default App
