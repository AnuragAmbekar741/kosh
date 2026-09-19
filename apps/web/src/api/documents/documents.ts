import { client } from "@/api/client"
import type { SpendItem } from "@/api/spend-items/spend-items.types"
import type {
  AddDocumentLineItemInput,
  ConfirmDocumentInput,
  DocumentDetail,
  DocumentSummary,
  ManualDocumentCreate,
} from "@/api/documents/documents.types"

export async function uploadDocument(
  file: File
): Promise<{ id: string; status: string }> {
  const body = new FormData()
  body.append("file", file)
  const { data } = await client.post<{ id: string; status: string }>(
    "/documents",
    body
  )
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
  ...body
}: ConfirmDocumentInput): Promise<SpendItem[]> {
  const { data } = await client.post<SpendItem[]>(
    `/documents/${documentId}/confirm`,
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
