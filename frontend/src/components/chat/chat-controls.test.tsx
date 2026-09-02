/* eslint-disable sonarjs/assertions-in-tests */
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { ChatInput } from "./chat-input"
import { ModeToggle } from "./mode-toggle"

const documents = [
  {
    document_id: "doc-1",
    filename: "company-handbook.md",
    size: 2048,
    content_type: "text/markdown",
    version_hash: "version-1",
  },
]

describe("chat controls", () => {
  it("gives the compact RAG toggle a persistent accessible name", () => {
    const markup = renderToStaticMarkup(
      <ModeToggle modes={{ rag: false }} onModesChange={vi.fn()} />,
    )

    expect(markup).toContain('aria-label="RAG Mode"')
  })

  it("links the attachment control to the document disclosure region", () => {
    const markup = renderToStaticMarkup(
      <ChatInput
        onSend={vi.fn()}
        isLoading={false}
        modes={{ rag: false }}
        onModesChange={vi.fn()}
        documents={documents}
        uploading={null}
        onDocumentsChange={vi.fn()}
        onUploadStart={vi.fn()}
        onUploadProgress={vi.fn()}
        onUploadEnd={vi.fn()}
        onError={vi.fn()}
      />,
    )

    expect(markup).toMatch(
      /aria-label="Toggle documents"[^>]*aria-controls="uploaded-documents"/,
    )
  })
})
