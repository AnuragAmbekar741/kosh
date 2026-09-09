import { useRef, useState } from "react"
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion"
import {
  Camera,
  Check,
  FileImage,
  FileText,
  Plus,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const acceptedFileTypes = "image/*,.pdf,application/pdf"

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  )
}

function isAcceptedFile(file: File) {
  return file.type.startsWith("image/") || isPdfFile(file)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

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
          <FileText className="size-4" strokeWidth={1.5} />
        ) : (
          <FileImage className="size-4" strokeWidth={1.5} />
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

export function DocumentUpload() {
  const reduceMotion = useReducedMotion()
  const uploadInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [rejectedCount, setRejectedCount] = useState(0)
  const [isReady, setIsReady] = useState(false)

  function addFiles(incoming: FileList | File[]) {
    const nextFiles = Array.from(incoming)
    const accepted = nextFiles.filter(isAcceptedFile)

    setRejectedCount(nextFiles.length - accepted.length)
    setIsReady(false)
    setFiles((current) => {
      const unique = new Map(current.map((file) => [fileKey(file), file]))
      accepted.forEach((file) => unique.set(fileKey(file), file))
      return Array.from(unique.values())
    })
  }

  function removeFile(key: string) {
    setIsReady(false)
    setFiles((current) => current.filter((file) => fileKey(file) !== key))
  }

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
            Add receipt photos or PDF statements.
          </p>
        </div>

        <section
          aria-label="Document upload"
          className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        >
          <div
            className={`relative hidden min-h-56 flex-col items-center justify-center px-8 text-center transition-colors duration-200 sm:flex ${isDragging ? "bg-primary/10" : "bg-card"}`}
            onDragEnter={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={(event) => {
              const nextTarget = event.relatedTarget
              if (
                !(nextTarget instanceof Node) ||
                !event.currentTarget.contains(nextTarget)
              ) {
                setIsDragging(false)
              }
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
              className="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-brand-ink"
              transition={{ duration: 0.2 }}
            >
              <Upload className="size-4" strokeWidth={1.5} />
            </motion.span>
            <h2 className="text-lg font-normal">
              {isDragging ? "Drop to add files" : "Drop files here"}
            </h2>
            <p className="mt-1.5 text-sm font-light text-muted-foreground">
              Images and PDFs are supported
            </p>
            <Button
              className="mt-5 min-w-32"
              onClick={() => uploadInput.current?.click()}
              type="button"
            >
              <Plus data-icon="inline-start" />
              Choose files
            </Button>
          </div>

          <div className="flex flex-col gap-3 p-5 sm:hidden">
            <div className="mb-2 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-brand-ink">
                <Upload className="size-5" strokeWidth={1.5} />
              </span>
              <div>
                <h2 className="text-base font-normal">Choose a document</h2>
                <p className="text-xs font-light text-muted-foreground">
                  Image or PDF
                </p>
              </div>
            </div>
            <Button onClick={() => uploadInput.current?.click()} type="button">
              <Upload data-icon="inline-start" />
              Choose files
            </Button>
            <Button
              onClick={() => cameraInput.current?.click()}
              type="button"
              variant="outline"
            >
              <Camera data-icon="inline-start" />
              Scan with camera
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
                could not be added. Choose images or PDFs.
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

                <AnimatePresence mode="wait">
                  {isReady ? (
                    <motion.div
                      key="ready"
                      animate={{ opacity: 1, y: 0 }}
                      aria-live="polite"
                      className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 text-sm text-brand-ink"
                      initial={{ opacity: 0, y: 8 }}
                      role="status"
                    >
                      <Check className="size-4" />
                      Ready for upload
                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirm"
                      animate={{ opacity: 1 }}
                      initial={{ opacity: 0 }}
                    >
                      <Button
                        className="mt-4 w-full"
                        onClick={() => setIsReady(true)}
                        type="button"
                      >
                        Confirm selection
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      </motion.main>
    </MotionConfig>
  )
}
