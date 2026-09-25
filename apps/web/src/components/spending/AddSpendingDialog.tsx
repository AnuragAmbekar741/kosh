import { useState } from "react"
import { FileUpIcon, PenLineIcon, PlusIcon } from "lucide-react"

import { apiDetail } from "@/api/client"
import { AddDocumentFlow } from "@/components/spending/AddDocumentDialog"
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useCreateManualDocument } from "@/hooks/documents/use-documents"

type Step = "choose" | "upload" | "manual"

function DialogBackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} type="button" variant="outline">
      Back
    </Button>
  )
}

export function AddSpendingDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("choose")
  const [uploadStarted, setUploadStarted] = useState(false)
  const [title, setTitle] = useState("")
  const [validationError, setValidationError] = useState("")
  const createManual = useCreateManualDocument()
  const error = validationError || apiDetail(createManual.error)

  function goToChooser() {
    setStep("choose")
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setStep("choose")
      setTitle("")
      setValidationError("")
      createManual.reset()
    }
  }

  function finishUpload() {
    setUploadStarted(false)
    handleOpenChange(false)
  }

  async function saveManual() {
    const trimmed = title.trim()
    if (!trimmed) {
      setValidationError("Enter a name.")
      return
    }
    setValidationError("")
    try {
      await createManual.mutateAsync({ title: trimmed })
      handleOpenChange(false)
    } catch {
      // Mutation state renders the API error beside the field.
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger
        data-slot="add-spending-trigger"
        render={<Button size="sm" />}
      >
        <PlusIcon data-icon="inline-start" />
        Add spending
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-1rem)] max-w-[calc(100%-1rem)] gap-0 overflow-hidden p-0">
        {step === "choose" ? (
          <>
            <DialogHeader className="border-b px-5 py-5 pr-12 sm:px-6">
              <DialogTitle className="text-lg">Add spending</DialogTitle>
              <DialogDescription>
                Upload a receipt or start a bill by name, then add items.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 px-5 py-5 sm:px-6">
              <button
                className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={() => {
                  setUploadStarted(true)
                  setStep("upload")
                }}
                type="button"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent [&_svg]:size-4">
                  <FileUpIcon />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">Upload a file</span>
                  <span className="text-sm text-muted-foreground">
                    Extract spending from a receipt or statement.
                  </span>
                </span>
              </button>
              <button
                className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={() => setStep("manual")}
                type="button"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent [&_svg]:size-4">
                  <PenLineIcon />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">Add manually</span>
                  <span className="text-sm text-muted-foreground">
                    Name a bill, then add items in the ledger.
                  </span>
                </span>
              </button>
            </div>
          </>
        ) : null}

        {uploadStarted ? (
          <div
            className={
              step === "upload"
                ? "flex max-h-[calc(100svh-1rem)] min-h-0 flex-col"
                : "hidden"
            }
          >
            <AddDocumentFlow onBack={goToChooser} onConfirmed={finishUpload} />
          </div>
        ) : null}

        {step === "manual" ? (
          <>
            <DialogHeader className="border-b px-5 py-5 pr-12 sm:px-6">
              <DialogTitle className="text-lg">Add spending</DialogTitle>
              <DialogDescription>
                Give this bill a name. You can add items after it appears in
                Spending.
              </DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-4 px-5 py-5 sm:px-6"
              onSubmit={(event) => {
                event.preventDefault()
                void saveManual()
              }}
            >
              <FieldGroup>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="manual-spend-name">Name</FieldLabel>
                  <Input
                    aria-invalid={Boolean(error)}
                    autoFocus
                    disabled={createManual.isPending}
                    id="manual-spend-name"
                    onChange={(event) => {
                      setTitle(event.target.value)
                      setValidationError("")
                      createManual.reset()
                    }}
                    placeholder="Weekend trip"
                    value={title}
                  />
                  {error ? <FieldError>{error}</FieldError> : null}
                </Field>
              </FieldGroup>
              {createManual.isError && !apiDetail(createManual.error) ? (
                <Alert variant="destructive">
                  <AlertTitle>Spending not added</AlertTitle>
                  <AlertDescription>Please try again.</AlertDescription>
                </Alert>
              ) : null}
              <DialogFooter className="m-0 border-0 p-0">
                <DialogBackButton onClick={goToChooser} />
                <Button disabled={createManual.isPending} type="submit">
                  {createManual.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
