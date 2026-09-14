import { useRef, useState } from "react"
import {
  FileImageIcon,
  FileTextIcon,
  PlusIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { apiDetail } from "@/api/client"
import { DocumentReview } from "@/components/spending/DocumentReview"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useUploadDocuments } from "@/hooks/documents/use-documents"
import { cn } from "@/lib/utils"

const acceptedFileTypes =
  ".pdf,.heic,.heif,.png,.jpg,.jpeg,.gif,.webp,application/pdf,image/jpeg,image/png,image/gif,image/webp"
const maxFileBytes = 15 * 1024 * 1024
const acceptedExtensions = new Set([
  "pdf",
  "heic",
  "heif",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
])

function isPdf(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  )
}

function isAccepted(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase()
  return extension ? acceptedExtensions.has(extension) : false
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AddDocumentDialog() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const upload = useUploadDocuments()

  function chooseFile(nextFile: File | undefined) {
    setFile(null)
    setError(null)
    upload.reset()
    if (!nextFile) return
    if (!isAccepted(nextFile)) {
      setError("Choose a PDF, HEIC, or image file.")
      return
    }
    if (nextFile.size > maxFileBytes) {
      setError("Choose a file smaller than 15 MB.")
      return
    }
    setFile(nextFile)
  }

  function reset() {
    setFile(null)
    setDocumentId(null)
    setError(null)
    upload.reset()
  }

  function startExtraction() {
    if (!file) return
    upload.mutate([file], {
      onSuccess: ([result]) => setDocumentId(result.id),
    })
  }

  function complete() {
    reset()
    setOpen(false)
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger data-slot="add-document-trigger" render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Add Document
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-1rem)] max-w-[calc(100%-1rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 py-5 pr-12 sm:px-6">
          <DialogTitle className="text-lg">Add document</DialogTitle>
          <DialogDescription>
            Upload a receipt or statement. We’ll extract the spending details
            for you to review.
          </DialogDescription>
        </DialogHeader>

        {documentId ? (
          <DocumentReview
            documentId={documentId}
            onConfirmed={complete}
            onTryAnother={reset}
          />
        ) : (
          <>
            <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
              <button
                className={cn(
                  "flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background px-6 text-center transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  isDragging && "border-foreground bg-muted/50"
                )}
                onClick={() => fileInput.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  ) {
                    setIsDragging(false)
                  }
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  chooseFile(event.dataTransfer.files[0])
                }}
                type="button"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-foreground [&_svg]:size-4">
                  <UploadIcon />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-medium">
                    {isDragging
                      ? "Drop your document here"
                      : "Choose a document"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    PDF, HEIC, PNG, JPG, GIF, or WebP · up to 15 MB
                  </span>
                </span>
              </button>

              <input
                ref={fileInput}
                accept={acceptedFileTypes}
                className="hidden"
                onChange={(event) => {
                  chooseFile(event.target.files?.[0])
                  event.target.value = ""
                }}
                type="file"
              />

              {file ? (
                <div className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent [&_svg]:size-4">
                    {isPdf(file) ? <FileTextIcon /> : <FileImageIcon />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {file.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {isPdf(file) ? "PDF" : "Image"} ·{" "}
                      {formatFileSize(file.size)}
                    </span>
                  </span>
                  <Button
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setFile(null)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon />
                  </Button>
                </div>
              ) : null}

              {error || upload.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Document not uploaded</AlertTitle>
                  <AlertDescription>
                    {error ||
                      apiDetail(upload.error) ||
                      "Please check the file and try again."}
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            <DialogFooter className="m-0 rounded-none">
              <Button
                disabled={!file || upload.isPending}
                onClick={startExtraction}
              >
                {upload.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <UploadIcon data-icon="inline-start" />
                )}
                Upload and extract
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
