import { useCallback, useState } from "react"
import {
  ChevronDown,
  File,
  FileCode,
  FileText,
  ImageIcon,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { UploadProgress } from "@/hooks/useDocuments"
import { cn } from "@/lib/utils"
import { deleteDocument, listDocuments, uploadDocument } from "@/services/api"
import type { DocumentInfo } from "@/types/api"

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
}: Readonly<DocumentUploadProps>) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    Array.from(event.dataTransfer.files).forEach((file) => handleUploadFile(file))
  }

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(event.target.files || []).forEach((file) => handleUploadFile(file))
    event.target.value = ""
  }

  const handleUploadFile = async (file: File) => {
    onUploadStart(file.name)
    try {
      await uploadDocument(file, (progress) => {
        onUploadProgress(file.name, progress)
      })
      const { documents: latest } = await listDocuments()
      onDocumentsChange(() => latest)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Upload failed"
      onError(message)
    } finally {
      onUploadEnd()
    }
  }

  const removeDocument = async (id: string) => {
    try {
      await deleteDocument(id)
      onDocumentsChange((current) =>
        current.filter((document) => document.document_id !== id),
      )
    } catch {
      onError("Failed to delete document")
    }
  }

  if (!isExpanded && documents.length === 0 && !uploading) {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          aria-expanded={false}
          aria-controls="uploaded-documents"
          className="h-9 rounded-sm px-3 text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <Upload className="h-4 w-4" />
          Add documents
        </Button>
        <div id="uploaded-documents" hidden />
      </>
    )
  }

  return (
    <section className="animate-fade-in-up">
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-controls="uploaded-documents"
        className="w-full min-h-10 flex items-center gap-3 rounded-sm px-3 text-left text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">Documents</span>
        <span className="text-xs text-muted-foreground">
          {documents.length} {documents.length === 1 ? "document" : "documents"}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {uploading && (
        <div className="mt-2 flex items-center gap-3 px-3 py-2 bg-secondary rounded-sm">
          <File className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-foreground truncate">{uploading.filename}</p>
              <span className="text-xs text-muted-foreground">
                {Math.round(uploading.progress)}%
              </span>
            </div>
            <Progress value={uploading.progress} className="h-1 mt-2" />
          </div>
        </div>
      )}

      <div
        id="uploaded-documents"
        hidden={!isExpanded}
        className="mt-2 space-y-2"
      >
        {isExpanded && (
          <>
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex items-center justify-center gap-3 min-h-20 rounded-sm border border-dashed px-4 cursor-pointer transition-colors duration-300",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:bg-secondary",
            )}
          >
            <input
              type="file"
              multiple
              accept=".md,.txt,.pdf,.html"
              onChange={handleFileInput}
              className="sr-only"
            />
            <Upload
              className={cn(
                "h-4 w-4",
                isDragging ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span className="text-sm text-muted-foreground">
              Drop files here or browse
            </span>
          </label>

          {documents.length > 0 && (
            <div className="divide-y divide-border">
              {documents.map((document) => (
                <div
                  key={document.document_id}
                  className="flex items-center gap-3 px-3 py-3"
                >
                  <div className="text-muted-foreground">
                    {getFileIcon(document.content_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {document.filename}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFileSize(document.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDocument(document.document_id)}
                    aria-label={`Remove ${document.filename}`}
                    className="h-8 w-8 rounded-sm text-muted-foreground hover:text-destructive hover:bg-secondary"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          </>
        )}
      </div>
    </section>
  )
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
  if (type.includes("pdf")) return <FileText className="h-4 w-4" />
  if (
    type.includes("code") ||
    type.includes("javascript") ||
    type.includes("typescript")
  ) {
    return <FileCode className="h-4 w-4" />
  }
  return <File className="h-4 w-4" />
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
