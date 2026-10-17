import { client } from "@/api/client"
import type { SpendItem } from "@/api/spend-items/spend-items.types"
import type {
  AddDocumentLineItemInput,
  ConfirmDocumentInput,
  DocumentDetail,
  DocumentSummary,
  ManualDocumentCreate,
  UpdateDocumentInput,
  UploadSource,
} from "@/api/documents/documents.types"

export async function uploadDocument(
  file: File,
  idempotencyKey?: string,
  source: UploadSource = "dashboard"
): Promise<{ id: string; status: string }> {
  const body = new FormData()
  body.append("file", file)
  body.append("source", source)
  const { data } = await client.post<{ id: string; status: string }>(
    "/documents",
    body,
    idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}
  )
  return data
}

export async function getDocumentInbox(
  signal?: AbortSignal
): Promise<DocumentSummary[]> {
  const { data } = await client.get<DocumentSummary[]>("/documents", {
    params: { inbox: true },
    signal,
  })
  return data
}

export async function getDocuments(
  signal?: AbortSignal
): Promise<DocumentSummary[]> {
  const { data } = await client.get<DocumentSummary[]>("/documents", { signal })
  return data
}

export async function getDocument(
  documentId: string,
  signal?: AbortSignal
): Promise<DocumentDetail> {
  const { data } = await client.get<DocumentDetail>(
    `/documents/${documentId}`,
    {
      signal,
    }
  )
  return data
}

export async function confirmDocument({
  documentId,
}: ConfirmDocumentInput): Promise<SpendItem[]> {
  const { data } = await client.post<SpendItem[]>(
    `/documents/${documentId}/confirm`,
    // Keep rolling deployments compatible with the previous required body.
    { mode: "line_items" }
  )
  return data
}

/** Moves the bill and every one of its lines to a new date. */
export async function updateDocument({
  documentId,
  ...body
}: UpdateDocumentInput): Promise<DocumentSummary> {
  const { data } = await client.patch<DocumentSummary>(
    `/documents/${documentId}`,
    body
  )
  return data
}

export async function deleteDocument(documentId: string): Promise<void> {
  await client.delete(`/documents/${documentId}`)
}

export async function createManualDocument(
  body: ManualDocumentCreate
): Promise<DocumentSummary> {
  const { data } = await client.post<DocumentSummary>("/documents/manual", body)
  return data
}

export async function addDocumentLineItem({
  documentId,
  ...body
}: AddDocumentLineItemInput): Promise<SpendItem> {
  const { data } = await client.post<SpendItem>(
    `/documents/${documentId}/line-items`,
    body
  )
  return data
}
