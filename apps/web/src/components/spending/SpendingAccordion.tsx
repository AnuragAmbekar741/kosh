import { useState } from "react"
import {
  EllipsisVerticalIcon,
  FileTextIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { apiDetail } from "@/api/client"
import type { DocumentSummary } from "@/api/documents/documents.types"
import type { SpendItem } from "@/api/spend-items/spend-items.types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useDeleteDocument } from "@/hooks/documents/use-documents"
import {
  useDeleteSpendItem,
  useUpdateSpendItem,
} from "@/hooks/spend-items/use-spend-items"
import { cn } from "@/lib/utils"

import { CategoryBadge } from "./CategoryBadge"
import { SpendingAddLineRow } from "./SpendingAddLineRow"
import { formatDate, formatMoney } from "./spending-formatters"

type SpendingAccordionProps = {
  emptyManual?: DocumentSummary[]
  items: SpendItem[]
}

type SpendingGroup = {
  id: string
  title: string
  spentAt: string
  currency: string
  source: "manual" | "document"
  items: SpendItem[]
}

type SpendingBillRowProps = {
  editingItemId: string
  group: SpendingGroup
  onDeleteBill: (group: SpendingGroup) => void
  onDeleteItem: (item: SpendItem) => void
  onEditBill: (group: SpendingGroup) => void
  onEditItem: (itemId: string) => void
  onStopEditing: () => void
}

type SpendingLineRowProps = {
  isEditing: boolean
  item: SpendItem
  index: number
  onDelete: (item: SpendItem) => void
  onEdit: (itemId: string) => void
  onStopEditing: () => void
}

type PendingDelete =
  { group: SpendingGroup; kind: "bill" } | { item: SpendItem; kind: "item" }

function sortLineItems(left: SpendItem, right: SpendItem) {
  const leftIndex = left.line_index ?? Number.MAX_SAFE_INTEGER
  const rightIndex = right.line_index ?? Number.MAX_SAFE_INTEGER
  if (leftIndex !== rightIndex) return leftIndex - rightIndex
  return left.spent_at.localeCompare(right.spent_at)
}

function groupSource(item: SpendItem): SpendingGroup["source"] {
  return item.source === "manual" ? "manual" : "document"
}

function canAddLine(group: SpendingGroup) {
  if (group.id.startsWith("manual-")) return false
  if (group.source === "manual") return true
  return group.items.some((item) => item.line_index != null)
}

function groupSpendItems(
  items: SpendItem[],
  emptyManual: DocumentSummary[]
) {
  const groups = new Map<string, SpendingGroup>()

  for (const item of items) {
    const id = item.document_id ?? `manual-${item.id}`
    const group = groups.get(id)
    if (group) group.items.push(item)
    else {
      groups.set(id, {
        id,
        title: item.merchant,
        spentAt: item.spent_at,
        currency: item.currency,
        source: groupSource(item),
        items: [item],
      })
    }
  }

  for (const document of emptyManual) {
    if (groups.has(document.id)) continue
    groups.set(document.id, {
      id: document.id,
      title: document.filename,
      spentAt: document.created_at,
      currency: "USD",
      source: "manual",
      items: [],
    })
  }

  for (const group of groups.values()) {
    group.items.sort(sortLineItems)
  }

  return Array.from(groups.values()).sort((left, right) =>
    right.spentAt.localeCompare(left.spentAt)
  )
}

function itemName(item: SpendItem) {
  return item.description || item.merchant
}

function SpendingLineRow({
  isEditing,
  item,
  index,
  onDelete,
  onEdit,
  onStopEditing,
}: SpendingLineRowProps) {
  const label = itemName(item)
  const [name, setName] = useState(label)
  const [validationError, setValidationError] = useState("")
  const updateItem = useUpdateSpendItem()
  const error = validationError || apiDetail(updateItem.error)
  const inputId = `spend-item-name-${item.id}`

  function startEditing() {
    setName(label)
    setValidationError("")
    updateItem.reset()
    onEdit(item.id)
  }

  function cancelEditing() {
    setName(label)
    setValidationError("")
    updateItem.reset()
    onStopEditing()
  }

  async function saveName() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setValidationError("Enter an item name.")
      return
    }
    if (trimmedName === label) {
      onStopEditing()
      return
    }

    setValidationError("")
    const updates = item.document_id
      ? { description: trimmedName }
      : item.description
        ? { description: trimmedName }
        : { merchant: trimmedName }
    try {
      await updateItem.mutateAsync({ id: item.id, updates })
      setName(trimmedName)
      onStopEditing()
    } catch {
      // Mutation state renders the API error beside the input.
    }
  }

  async function saveCategory(category: string) {
    if (category === item.category) return
    setValidationError("")
    updateItem.reset()
    try {
      await updateItem.mutateAsync({ id: item.id, updates: { category } })
    } catch {
      // Mutation state renders the API error beside the badge.
    }
  }

  const categoryBadge = (
    <CategoryBadge
      category={item.category}
      disabled={updateItem.isPending}
      onSelect={(category) => void saveCategory(category)}
    />
  )

  return (
    <div
      className={cn(
        "grid items-center gap-3 py-3 pr-4 pl-16 not-first:border-t sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:pr-5 sm:pl-17",
        isEditing
          ? "grid-cols-[2rem_minmax(0,1fr)]"
          : "grid-cols-[2rem_minmax(0,1fr)_auto]"
      )}
    >
      <span className="text-xs text-muted-foreground tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        {isEditing ? (
          <Field className="gap-1" data-invalid={Boolean(error)}>
            <FieldLabel className="sr-only" htmlFor={inputId}>
              Item name
            </FieldLabel>
            <div className="inline-flex w-full max-w-full flex-nowrap items-center gap-2">
              <Input
                aria-invalid={Boolean(error)}
                autoFocus
                className="w-1/2 min-w-0 shrink-0"
                disabled={updateItem.isPending}
                id={inputId}
                onBlur={() => void saveName()}
                onChange={(event) => {
                  setName(event.target.value)
                  setValidationError("")
                  updateItem.reset()
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    event.currentTarget.blur()
                  }
                  if (event.key === "Escape") {
                    event.preventDefault()
                    cancelEditing()
                  }
                }}
                value={name}
              />
              {categoryBadge}
            </div>
            {error ? (
              <FieldError className="text-xs">{error}</FieldError>
            ) : null}
          </Field>
        ) : (
          <div className="inline-flex max-w-full flex-nowrap items-center gap-2">
            <button
              aria-label={`Edit ${label}. Double-click, or press Enter.`}
              className="max-w-full shrink cursor-text truncate rounded-sm text-left text-sm font-normal outline-none hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring"
              onClick={(event) => {
                if (event.detail === 0) startEditing()
              }}
              onDoubleClick={startEditing}
              onPointerUp={(event) => {
                if (event.pointerType === "touch") startEditing()
              }}
              title="Double-click to edit"
              type="button"
            >
              {label}
            </button>
            {categoryBadge}
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex shrink-0 items-center gap-2",
          isEditing &&
            "col-start-2 justify-self-end sm:col-start-3 sm:row-start-1"
        )}
      >
        <p className="text-sm font-normal tabular-nums">
          {formatMoney(item.amount, item.currency)}
        </p>
        {isEditing ? (
          <Button
            aria-label={`Delete ${label}`}
            disabled={updateItem.isPending}
            onClick={() => onDelete(item)}
            onPointerDown={(event) => event.preventDefault()}
            size="icon-sm"
            title="Delete item"
            variant="destructive"
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function SpendingBillRow({
  editingItemId,
  group,
  onDeleteBill,
  onDeleteItem,
  onEditBill,
  onEditItem,
  onStopEditing,
}: SpendingBillRowProps) {
  const total = group.items.reduce((sum, item) => sum + Number(item.amount), 0)
  const itemLabel = group.items.length === 1 ? "item" : "items"
  const showAddRow = canAddLine(group)

  return (
    <AccordionItem className="group/bill" value={group.id}>
      <AccordionTrigger
        actions={
          <span className="flex shrink-0 items-center gap-3">
            <span className="font-medium tabular-nums">
              {formatMoney(total, group.currency)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Actions for ${group.title}`}
                render={
                  <Button
                    className="size-9 rounded-lg bg-accent hover:bg-accent"
                    size="icon"
                    variant="ghost"
                  />
                }
              >
                <EllipsisVerticalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditBill(group)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDeleteBill(group)}
                  variant="destructive"
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        }
        className="cursor-pointer items-center rounded-none py-0 hover:no-underline **:data-[slot=accordion-trigger-icon]:hidden"
        headerClassName="px-4 py-4 hover:bg-muted/50 group-data-open/bill:hover:bg-transparent sm:px-5 sm:py-5"
      >
        <span className="flex min-w-0 items-center gap-3 text-left">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent [&_svg]:size-4">
            <FileTextIcon />
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-medium">{group.title}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              <Badge variant="outline">{formatDate(group.spentAt)}</Badge>
              <Badge variant="outline">
                {group.source === "manual" ? "Manual entry" : "Document"}
              </Badge>
              <Badge variant="outline">
                {group.items.length} {itemLabel}
              </Badge>
            </span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="h-auto border-t pb-0 [&_p]:mb-0 [&_p:not(:last-child)]:mb-0">
        {group.items.map((item, index) => (
          <SpendingLineRow
            index={index}
            isEditing={editingItemId === item.id}
            item={item}
            key={item.id}
            onDelete={onDeleteItem}
            onEdit={onEditItem}
            onStopEditing={onStopEditing}
          />
        ))}
        {showAddRow ? (
          <SpendingAddLineRow
            documentId={group.id}
            index={group.items.length}
            startOpen={group.items.length === 0}
          />
        ) : null}
      </AccordionContent>
    </AccordionItem>
  )
}

export function SpendingAccordion({
  emptyManual = [],
  items,
}: SpendingAccordionProps) {
  const groups = groupSpendItems(items, emptyManual)
  const newestEmptyId = groups.find((group) => group.items.length === 0)?.id ?? ""
  const [openBill, setOpenBill] = useState(newestEmptyId)
  const [openedEmptyId, setOpenedEmptyId] = useState(newestEmptyId)
  const [editingItemId, setEditingItemId] = useState("")
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const deleteDocument = useDeleteDocument()
  const deleteSpendItem = useDeleteSpendItem()
  const isPending = deleteDocument.isPending || deleteSpendItem.isPending
  const error = deleteDocument.error ?? deleteSpendItem.error
  const pendingGroup =
    pendingDelete?.kind === "bill" ? pendingDelete.group : null
  const pendingItem = pendingDelete?.kind === "item" ? pendingDelete.item : null
  const pendingFirst = pendingGroup?.items[0]
  const pendingCount = pendingGroup?.items.length ?? 0
  const pendingItemLabel = pendingCount === 1 ? "item" : "items"

  if (newestEmptyId && newestEmptyId !== openedEmptyId) {
    setOpenBill(newestEmptyId)
    setOpenedEmptyId(newestEmptyId)
  }

  function resetDeleteMutations() {
    deleteDocument.reset()
    deleteSpendItem.reset()
  }

  function requestDeleteBill(group: SpendingGroup) {
    resetDeleteMutations()
    setPendingDelete({ group, kind: "bill" })
  }

  function requestDeleteItem(item: SpendItem) {
    resetDeleteMutations()
    setEditingItemId("")
    setPendingDelete({ item, kind: "item" })
  }

  function editBill(group: SpendingGroup) {
    setOpenBill(group.id)
    if (group.items[0]) setEditingItemId(group.items[0].id)
  }

  function billDocumentId(group: SpendingGroup) {
    return group.items[0]?.document_id ?? (canAddLine(group) ? group.id : null)
  }

  function closeDeleteDialog() {
    if (isPending) return
    setPendingDelete(null)
    resetDeleteMutations()
  }

  function confirmDelete() {
    if (!pendingDelete) return
    const documentId = pendingGroup ? billDocumentId(pendingGroup) : null
    const request =
      pendingDelete.kind === "item"
        ? deleteSpendItem.mutateAsync(pendingDelete.item.id)
        : documentId
          ? deleteDocument.mutateAsync(documentId)
          : pendingFirst
            ? deleteSpendItem.mutateAsync(pendingFirst.id)
            : null
    if (!request) return
    void request.then(() => {
      setPendingDelete(null)
    })
  }

  return (
    <>
      <Accordion
        className="overflow-hidden rounded-xl border"
        onValueChange={(next) => {
          setOpenBill(next[0] ?? "")
          setEditingItemId("")
        }}
        value={openBill ? [openBill] : []}
      >
        {groups.map((group) => (
          <SpendingBillRow
            editingItemId={editingItemId}
            group={group}
            key={group.id}
            onDeleteBill={requestDeleteBill}
            onDeleteItem={requestDeleteItem}
            onEditBill={editBill}
            onEditItem={setEditingItemId}
            onStopEditing={() => setEditingItemId("")}
          />
        ))}
      </Accordion>

      <Dialog
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog()
        }}
        open={pendingDelete !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingItem ? "Delete this item?" : "Delete this bill?"}
            </DialogTitle>
            <DialogDescription>
              {pendingItem
                ? `This removes ${itemName(pendingItem)} from ${pendingItem.merchant}. The rest of the bill and its source file stay available. This cannot be undone.`
                : pendingGroup?.source === "manual"
                  ? pendingCount
                    ? `This removes ${pendingGroup.title} and its ${pendingCount} ${pendingItemLabel} from Spending. This cannot be undone.`
                    : `This removes ${pendingGroup.title} from Spending. This cannot be undone.`
                  : pendingFirst?.document_id
                    ? `This removes ${pendingFirst.merchant} and its ${pendingCount} ${pendingItemLabel} from Spending, including the source file. This cannot be undone.`
                    : pendingFirst
                      ? `This removes ${pendingFirst.merchant} from Spending. This cannot be undone.`
                      : null}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>
                {pendingItem ? "Item not deleted" : "Bill not deleted"}
              </AlertTitle>
              <AlertDescription>
                {apiDetail(error) || "Please try again."}
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={closeDeleteDialog}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isPending}
              onClick={confirmDelete}
              variant="destructive"
            >
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
