import { useCallback, useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { uploadDocument, deleteDocument, listDocuments } from '@/services/api'
import type { DocumentInfo } from '@/types/api'
import type { UploadProgress } from '@/hooks/useDocuments'

interface DocumentUploadProps {
  documents: DocumentInfo[]
  uploading: UploadProgress | null
  onDocumentsChange: (updater: (prev: DocumentInfo[]) => DocumentInfo[]) => void
  onUploadStart: (filename: string) => void
  onUploadProgress: (filename: string, progress: number) => void
  onUploadEnd: () => void
  onError: (message: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

/**
 * Only `.md` is accepted, matching `ALLOWED_UPLOAD_EXTENSIONS` in
 * `backend/config.py`. The picker used to offer .txt/.pdf/.html as well, which
 * let people choose a file the server would reject with a 400 -- the failure
 * arrived after the upload rather than before it.
 */
const ACCEPT = '.md'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentUpload({
  documents,
  uploading,
  onDocumentsChange,
  onUploadStart,
  onUploadProgress,
  onUploadEnd,
  onError,
  isExpanded,
  onToggleExpand,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const uploadFile = useCallback(
    async (file: File) => {
      onUploadStart(file.name)
      try {
        await uploadDocument(file, (pct) => onUploadProgress(file.name, pct))
        // Re-read the listing rather than reconstructing the entry locally.
        // POST /documents returns only document_id and filename, so building a
        // DocumentInfo here would mean inventing size, content_type and
        // version_hash -- the server is the only thing that knows them.
        const { documents: latest } = await listDocuments()
        onDocumentsChange(() => latest)
      } catch (err: unknown) {
        onError(err instanceof Error ? err.message : '上傳失敗')
      } finally {
        onUploadEnd()
      }
    },
    [onDocumentsChange, onError, onUploadEnd, onUploadProgress, onUploadStart],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      Array.from(e.dataTransfer.files).forEach((f) => void uploadFile(f))
    },
    [uploadFile],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      Array.from(e.target.files ?? []).forEach((f) => void uploadFile(f))
      // Reset so re-selecting the same file fires onChange again.
      e.target.value = ''
    },
    [uploadFile],
  )

  const removeDocument = useCallback(
    async (id: string) => {
      try {
        await deleteDocument(id)
        onDocumentsChange((prev) => prev.filter((d) => d.document_id !== id))
      } catch {
        onError('刪除文件失敗')
      }
    },
    [onDocumentsChange, onError],
  )

  const collapsed = !isExpanded && documents.length === 0 && !uploading

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleExpand}
        className="mb-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground transition-colors hover:text-primary"
      >
        <Upload className="h-3.5 w-3.5" />
        上傳文件
      </button>
    )
  }

  return (
    <div className="mb-2.5">
      {isExpanded && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragging(false)
          }}
          onDrop={handleDrop}
          className={cn(
            'relative rounded-sm border border-dashed px-4 py-5 transition-colors',
            isDragging ? 'border-primary bg-primary/8' : 'border-border-strong',
          )}
        >
          <input
            type="file"
            multiple
            accept={ACCEPT}
            onChange={handleFileInput}
            aria-label="選擇要上傳的 Markdown 文件"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div className="pointer-events-none flex flex-col items-center gap-1.5 text-center">
            <Upload
              className={cn('h-4 w-4 transition-colors', isDragging ? 'text-primary' : 'text-faint')}
            />
            <p className="text-xs text-secondary-foreground">拖曳檔案到這裡，或點擊選擇</p>
            <p className="font-mono text-[10.5px] text-faint">僅接受 {ACCEPT}</p>
          </div>
        </div>
      )}

      {uploading && (
        <div className="mt-2 flex items-center gap-2.5 rounded-sm border border-border bg-card px-3 py-2">
          <FileText className="h-3.5 w-3.5 shrink-0 text-faint" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-secondary-foreground">{uploading.filename}</p>
            <Progress value={uploading.progress} className="mt-1.5 h-[3px]" />
          </div>
          <span className="font-mono text-[10.5px] text-faint">{uploading.progress}%</span>
        </div>
      )}

      {documents.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-sm border border-border bg-card">
          {documents.map((doc) => (
            <li
              key={doc.document_id}
              className="flex items-center gap-2.5 px-3 py-1.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border/70"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-faint" />
              <span className="min-w-0 flex-1 truncate text-xs text-secondary-foreground">
                {doc.filename}
              </span>
              <span className="font-mono text-[10.5px] whitespace-nowrap text-faint">
                {formatSize(doc.size)}
              </span>
              <span className="font-mono text-[10.5px] text-up">已索引</span>
              <button
                type="button"
                onClick={() => void removeDocument(doc.document_id)}
                aria-label={`移除 ${doc.filename}`}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-sm text-faint transition-colors hover:text-down"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onToggleExpand}
        className="mt-1.5 font-mono text-[10.5px] text-faint transition-colors hover:text-primary"
      >
        {isExpanded ? '收合' : '新增文件'}
      </button>
    </div>
  )
}
