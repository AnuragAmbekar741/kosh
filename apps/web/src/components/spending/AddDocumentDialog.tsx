import { useRef, useState } from "react"
import { FileImageIcon, FileTextIcon, UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { isInFlight, useDocumentInbox } from "@/hooks/documents/use-documents"
import {
  MAX_PENDING_DOCUMENTS,
  useUploads,
} from "@/hooks/documents/use-uploads"
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

type AddDocumentFlowProps = {
  onBack: () => void
  onStarted: () => void
}

type Rejected = { name: string; reason: string }

function isPdf(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  )
}

function isAccepted(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase()
  return extension ? acceptedExtensions.has(extension) : false
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function SelectedFileRow({
  file,
  onRemove,
}: {
  file: File
  onRemove: () => void
}) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent [&_svg]:size-4">
        {isPdf(file) ? <FileTextIcon /> : <FileImageIcon />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium" title={file.name}>
          {file.name}
        </span>
        <span className="block text-xs text-muted-foreground">
          {isPdf(file) ? "PDF" : "Image"} · {formatFileSize(file.size)}
        </span>
      </span>
      <Button
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <XIcon />
      </Button>
    </li>
  )
}

export function AddDocumentFlow({ onBack, onStarted }: AddDocumentFlowProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [rejected, setRejected] = useState<Rejected[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const uploads = useUploads()
  const inbox = useDocumentInbox()
  const pending =
    (inbox.data ?? []).filter(isInFlight).length +
    uploads.uploads.filter((item) => item.status !== "failed").length
  const slots = Math.max(0, MAX_PENDING_DOCUMENTS - pending)

  function chooseFiles(list: FileList | null) {
    const next = [...files]
    const skipped: Rejected[] = []
    for (const file of Array.from(list ?? [])) {
      if (!isAccepted(file)) {
        skipped.push({ name: file.name, reason: "not a PDF, HEIC, or image" })
      } else if (file.size > maxFileBytes) {
        skipped.push({ name: file.name, reason: "larger than 15 MB" })
      } else if (next.some((chosen) => fileKey(chosen) === fileKey(file))) {
        continue
      } else if (next.length >= slots) {
        skipped.push({
          name: file.name,
          reason: `only ${MAX_PENDING_DOCUMENTS} documents can be processed at a time`,
        })
      } else {
        next.push(file)
      }
    }
    setFiles(next)
    setRejected(skipped)
  }

  function start() {
    if (files.length === 0) return
    uploads.add(files)
    toast(
      files.length === 1
        ? `Uploading ${files[0].name}`
        : `Uploading ${files.length} documents`,
      { description: "Track progress from the bell in the header." }
    )
    onStarted()
  }

  return (
    <>
      <DialogHeader className="border-b px-5 py-5 pr-12 sm:px-6">
        <DialogTitle className="text-lg">Add documents</DialogTitle>
        <DialogDescription>
          Upload receipts or statements. We’ll extract the spending details and
          let you know when they’re ready to review.
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6">
        <button
          className={cn(
            "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background px-6 text-center transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            isDragging && "border-foreground bg-muted/50"
          )}
          disabled={slots === 0}
          onClick={() => fileInput.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDragging(false)
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            chooseFiles(event.dataTransfer.files)
          }}
          type="button"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-foreground [&_svg]:size-4">
            <UploadIcon />
          </span>
          <span className="flex flex-col gap-1">
            <span className="font-medium">
              {isDragging ? "Drop your documents here" : "Choose documents"}
            </span>
            <span className="text-sm text-muted-foreground">
              PDF, HEIC, PNG, JPG, GIF, or WebP · up to 15 MB · up to{" "}
              {MAX_PENDING_DOCUMENTS} at a time
            </span>
          </span>
        </button>

        <input
          ref={fileInput}
          accept={acceptedFileTypes}
          className="hidden"
          multiple
          onChange={(event) => {
            chooseFiles(event.target.files)
            event.target.value = ""
          }}
          type="file"
        />

        {slots === 0 && files.length === 0 ? (
          <Alert>
            <AlertTitle>
              {MAX_PENDING_DOCUMENTS} documents are already processing
            </AlertTitle>
            <AlertDescription>
              You can add more as soon as one finishes. Progress is in the bell
              in the header.
            </AlertDescription>
          </Alert>
        ) : null}

        {files.length ? (
          <ul className="flex flex-col gap-2">
            {files.map((file) => (
              <SelectedFileRow
                file={file}
                key={fileKey(file)}
                onRemove={() =>
                  setFiles((current) =>
                    current.filter((chosen) => chosen !== file)
                  )
                }
              />
            ))}
          </ul>
        ) : null}

        {rejected.length ? (
          <Alert variant="destructive">
            <AlertTitle>
              {rejected.length === 1
                ? "1 file wasn’t added"
                : `${rejected.length} files weren’t added`}
            </AlertTitle>
            <AlertDescription>
              <ul>
                {rejected.map((item) => (
                  <li key={`${item.name}:${item.reason}`}>
                    {item.name}: {item.reason}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <DialogFooter className="m-0 rounded-none">
        <Button onClick={onBack} type="button" variant="outline">
          Back
        </Button>
        <Button disabled={files.length === 0} onClick={start}>
          <UploadIcon data-icon="inline-start" />
          {files.length > 1
            ? `Upload and extract ${files.length}`
            : "Upload and extract"}
        </Button>
      </DialogFooter>
    </>
  )
}
