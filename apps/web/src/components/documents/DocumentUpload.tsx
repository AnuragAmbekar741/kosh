import { useRef, useState } from "react"
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion"
import {
  AlertCircle,
  Camera,
  FileImage,
  FileText,
  Plus,
  ScanLine,
  Upload,
  X,
} from "lucide-react"

import { apiDetail } from "@/api/client"
import { DocumentReviewDialog } from "@/components/documents/DocumentReviewDialog"
import { Button } from "@/components/ui/button"
import {
  useDocument,
  useUploadDocuments,
} from "@/hooks/documents/use-documents"

const acceptedFileTypes = "image/*,.heic,.heif,.pdf,application/pdf"

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  )
}

function isAcceptedFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase()
  return (
    file.type.startsWith("image/") ||
    isPdfFile(file) ||
    extension === "heic" ||
    extension === "heif"
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type SelectedFileRowProps = {
  file: File
  onRemove: (key: string) => void
}

function SelectedFileRow({ file, onRemove }: SelectedFileRowProps) {
  const isPdf = isPdfFile(file)
  return (
    <motion.li
      animate={{ opacity: 1, y: 0 }}
      className="flex min-w-0 items-center gap-3 border-b border-border/70 py-3 last:border-0"
      exit={{ opacity: 0, x: 16 }}
      initial={{ opacity: 0, y: 8 }}
      layout
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-brand-ink">
        {isPdf ? (
          <FileText className="size-4" />
        ) : (
          <FileImage className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{file.name}</span>
        <span className="block text-xs text-muted-foreground">
          {isPdf ? "PDF" : "Image"} · {formatFileSize(file.size)}
        </span>
      </span>
      <Button
        aria-label={`Remove ${file.name}`}
        onClick={() => onRemove(fileKey(file))}
        size="icon"
        title={`Remove ${file.name}`}
        type="button"
        variant="ghost"
      >
        <X />
      </Button>
    </motion.li>
  )
}

function ExtractionProgress({
  filename,
  queued,
}: {
  filename: string
  queued: number
}) {
  return (
    <section
      aria-live="polite"
      className="rounded-xl border border-border bg-card px-5 py-5 sm:px-6"
      role="status"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative size-9 shrink-0">
          <span className="absolute inset-0 rounded-full border-2 border-muted" />
          <motion.span
            animate={{ rotate: 360 }}
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
            transition={{ duration: 1, ease: "linear", repeat: Infinity }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium">Extracting details</h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {filename}
          </p>
        </div>
        {queued > 0 ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {queued} queued
          </span>
        ) : null}
      </div>
    </section>
  )
}

export function DocumentUpload() {
  const reduceMotion = useReducedMotion()
  const uploadInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [submittedFiles, setSubmittedFiles] = useState<File[]>([])
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [rejectedCount, setRejectedCount] = useState(0)
  const [dismissedReviewId, setDismissedReviewId] = useState<string | null>(
    null
  )
  const upload = useUploadDocuments()
  const activeId = documentIds[activeIndex] ?? null
  const document = useDocument(activeId)

  function addFiles(incoming: FileList | File[]) {
    const nextFiles = Array.from(incoming)
    const accepted = nextFiles.filter(isAcceptedFile)
    setRejectedCount(nextFiles.length - accepted.length)
    setFiles((current) => {
      const unique = new Map(current.map((file) => [fileKey(file), file]))
      accepted.forEach((file) => unique.set(fileKey(file), file))
      return Array.from(unique.values())
    })
  }

  function removeFile(key: string) {
    setFiles((current) => current.filter((file) => fileKey(file) !== key))
  }

  function startExtraction() {
    const next = [...files]
    upload.mutate(next, {
      onSuccess: (results) => {
        setSubmittedFiles(next)
        setDocumentIds(results.map((item) => item.id))
        setActiveIndex(0)
        setFiles([])
      },
    })
  }

  function advanceQueue() {
    setDismissedReviewId(null)
    if (activeIndex < documentIds.length - 1)
      setActiveIndex((index) => index + 1)
    else {
      setDocumentIds([])
      setSubmittedFiles([])
      setActiveIndex(0)
    }
  }

  const isExtracting =
    Boolean(activeId) &&
    (document.isPending ||
      document.data?.status === "uploaded" ||
      document.data?.status === "processing")

  return (
    <MotionConfig reducedMotion="user">
      <motion.main
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-12 sm:py-16"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        transition={{
          duration: reduceMotion ? 0 : 0.32,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl leading-tight font-light sm:text-4xl">
            Upload documents
          </h1>
          <p className="mx-auto mt-3 text-sm leading-relaxed font-light text-muted-foreground">
            Add receipts or statements to review and save.
          </p>
        </div>

        {isExtracting ? (
          <ExtractionProgress
            filename={
              submittedFiles[activeIndex]?.name ??
              document.data?.filename ??
              "Document"
            }
            queued={Math.max(0, documentIds.length - activeIndex - 1)}
          />
        ) : document.data?.status === "failed" ? (
          <section className="rounded-xl border border-destructive/20 bg-card p-7 text-center shadow-sm">
            <AlertCircle className="mx-auto size-6 text-destructive" />
            <h2 className="mt-4 text-lg font-normal">
              We couldn’t read this document
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {document.data.error || "Try a clearer image or another file."}
            </p>
            <Button className="mt-6" onClick={advanceQueue} variant="outline">
              Continue
            </Button>
          </section>
        ) : document.data?.status === "ready" ? (
          <section className="rounded-xl border border-primary/30 bg-card p-7 text-center shadow-sm">
            <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-brand-ink">
              <ScanLine className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-normal">Your review is ready</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We found the details. Give them a quick check before saving.
            </p>
            <Button className="mt-6" onClick={() => setDismissedReviewId(null)}>
              Review extraction
            </Button>
          </section>
        ) : (
          <section
            aria-label="Document upload"
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            <div
              className={`relative hidden min-h-56 flex-col items-center justify-center px-8 text-center transition-colors duration-200 sm:flex ${isDragging ? "bg-primary/10" : "bg-card"}`}
              onDragEnter={(event) => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setIsDragging(false)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                setIsDragging(false)
                addFiles(event.dataTransfer.files)
              }}
            >
              <motion.span
                animate={{ scale: isDragging && !reduceMotion ? 1.05 : 1 }}
                className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-brand-ink"
              >
                <Upload className="size-4" />
              </motion.span>
              <h2 className="text-lg font-normal">
                {isDragging ? "Drop to begin" : "Drop documents here"}
              </h2>
              <p className="mt-1.5 text-sm font-light text-muted-foreground">
                HEIC, images, and PDFs
              </p>
              <Button
                className="mt-5 min-w-32"
                onClick={() => uploadInput.current?.click()}
                type="button"
              >
                <Plus data-icon="inline-start" /> Choose files
              </Button>
            </div>

            <div className="flex flex-col gap-3 p-5 sm:hidden">
              <div className="mb-2 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-brand-ink">
                  <Upload className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-normal">Choose a document</h2>
                  <p className="text-xs font-light text-muted-foreground">
                    HEIC, image, or PDF
                  </p>
                </div>
              </div>
              <Button
                onClick={() => uploadInput.current?.click()}
                type="button"
              >
                <Upload data-icon="inline-start" /> Choose files
              </Button>
              <Button
                onClick={() => cameraInput.current?.click()}
                type="button"
                variant="outline"
              >
                <Camera data-icon="inline-start" /> Scan with camera
              </Button>
            </div>

            <input
              ref={uploadInput}
              accept={acceptedFileTypes}
              aria-label="Choose receipt photos or PDF statements"
              className="sr-only"
              multiple
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files)
                event.target.value = ""
              }}
              type="file"
            />
            <input
              ref={cameraInput}
              accept="image/*"
              aria-label="Scan a document with the camera"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files)
                event.target.value = ""
              }}
              type="file"
            />

            <AnimatePresence initial={false}>
              {rejectedCount > 0 ? (
                <motion.p
                  animate={{ height: "auto", opacity: 1 }}
                  className="border-t border-destructive/20 bg-destructive/10 px-5 py-3 text-sm text-destructive"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  role="alert"
                >
                  {rejectedCount === 1 ? "One file" : `${rejectedCount} files`}{" "}
                  could not be added.
                </motion.p>
              ) : null}

              {files.length > 0 ? (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="border-t border-border px-5 pb-5 sm:px-6 sm:pb-6"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                >
                  <div className="flex items-center justify-between pt-5">
                    <p aria-live="polite" className="text-sm font-medium">
                      {files.length}{" "}
                      {files.length === 1 ? "document" : "documents"}
                    </p>
                    <Button
                      onClick={() => uploadInput.current?.click()}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Plus /> Add more
                    </Button>
                  </div>
                  <motion.ul layout>
                    <AnimatePresence initial={false}>
                      {files.map((file) => (
                        <SelectedFileRow
                          key={fileKey(file)}
                          file={file}
                          onRemove={removeFile}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.ul>
                  <Button
                    className="mt-4 w-full"
                    disabled={upload.isPending}
                    onClick={startExtraction}
                  >
                    {upload.isPending
                      ? "Uploading…"
                      : `Extract ${files.length === 1 ? "document" : `${files.length} documents`}`}
                    {!upload.isPending ? (
                      <ScanLine data-icon="inline-end" />
                    ) : null}
                  </Button>
                  {upload.isError ? (
                    <p className="mt-3 text-sm text-destructive" role="alert">
                      {apiDetail(upload.error) ||
                        "Upload failed. Please try again."}
                    </p>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        )}
      </motion.main>

      {document.data?.status === "ready" ? (
        <DocumentReviewDialog
          document={document.data}
          key={document.data.id}
          onConfirmed={advanceQueue}
          onOpenChange={(open) => setDismissedReviewId(open ? null : activeId)}
          open={dismissedReviewId !== document.data.id}
        />
      ) : null}
    </MotionConfig>
  )
}
