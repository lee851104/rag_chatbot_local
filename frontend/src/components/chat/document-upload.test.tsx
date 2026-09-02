/* eslint-disable sonarjs/assertions-in-tests */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { DocumentUpload } from "./document-upload"

const documents = [
  {
    document_id: "doc-1",
    filename: "company-handbook.md",
    size: 2048,
    content_type: "text/markdown",
    version_hash: "version-1",
  },
]

const renderDocumentUpload = (
  isExpanded: boolean,
  currentDocuments = documents,
) =>
  renderToStaticMarkup(
    <DocumentUpload
      documents={currentDocuments}
      uploading={null}
      onDocumentsChange={vi.fn()}
      onUploadStart={vi.fn()}
      onUploadProgress={vi.fn()}
      onUploadEnd={vi.fn()}
      onError={vi.fn()}
      isExpanded={isExpanded}
      onToggleExpand={vi.fn()}
    />,
  )

describe("DocumentUpload", () => {
  it("hides uploaded filenames while the document section is collapsed", () => {
    const markup = renderDocumentUpload(false)

    expect(markup).not.toContain("company-handbook.md")
  })

  it("exposes the collapsed state and uploaded document count", () => {
    const markup = renderDocumentUpload(false)

    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toMatch(/>1 document<\/span>/)
  })

  it("keeps the controlled document region available while collapsed", () => {
    const markup = renderDocumentUpload(false)

    expect(markup).toContain('aria-controls="uploaded-documents"')
    expect(markup).toContain('id="uploaded-documents"')
    expect(markup).toContain("hidden")
  })

  it("shows uploaded filenames and the expanded state when opened", () => {
    const markup = renderDocumentUpload(true)

    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('id="uploaded-documents"')
    expect(markup).toContain("company-handbook.md")
    expect(markup).not.toMatch(/id="uploaded-documents"[^>]*hidden/)
  })

  it("links the empty document trigger to its collapsed region", () => {
    const markup = renderDocumentUpload(false, [])

    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toContain('aria-controls="uploaded-documents"')
    expect(markup).toContain('id="uploaded-documents"')
  })
})
