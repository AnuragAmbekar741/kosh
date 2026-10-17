import axios from "axios"
import {
  AlertTriangleIcon,
  CircleCheckIcon,
  PencilIcon,
  ReceiptTextIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

import type { BillAction } from "@/api/agent/agent.types"
import { apiDetail } from "@/api/client"
import type { SpendItem } from "@/api/spend-items/spend-items.types"
import { ReviewDocumentDialog } from "@/components/notifications/ReviewDocumentDialog"
import {
  formatDate,
  formatMoney,
} from "@/components/spending/spending-formatters"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  useConfirmDocument,
  useDeleteDocument,
  useDocument,
} from "@/hooks/documents/use-documents"
import { useBillSavedToast } from "@/hooks/spend-items/use-bill-saved-toast"

const SHOWN_LINES = 4

function lineName(item: SpendItem) {
  return item.description || item.merchant
}

type LineRowProps = {
  item: SpendItem
}

function LineRow({ item }: LineRowProps) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 truncate">{lineName(item)}</span>
      <span className="shrink-0 tabular-nums">
        {formatMoney(item.amount, item.currency)}
      </span>
    </li>
  )
}

type AgentBillCardProps = {
  action: BillAction
}

/**
 * A bill the agent offered to save. The agent can't save it: Save bill is the
 * same confirm as the review dialog, and the card follows the bill's live
 * state, so it reads Saved or Discarded however the bill was decided.
 */
export function AgentBillCard({ action }: AgentBillCardProps) {
  const document = useDocument(action.document_id)
  const confirm = useConfirmDocument()
  const discard = useDeleteDocument()
  const billSaved = useBillSavedToast()
  const [reviewing, setReviewing] = useState(false)
  const [discarding, setDiscarding] = useState(false)

  const data = document.data
  const gone =
    axios.isAxiosError(document.error) &&
    document.error.response?.status === 404
  const saved = data?.status === "ready" && !data.needs_review
  const lines = data?.drafts ?? []
  const totals = Object.entries(action.totals)
    .map(([currency, total]) => formatMoney(total, currency))
    .join(" · ")
  const busy = confirm.isPending || discard.isPending
  const error = apiDetail(confirm.error) ?? apiDetail(discard.error)

  function save() {
    confirm.mutate(
      { documentId: action.document_id },
      {
        onSuccess: () => billSaved(`Saved ${action.merchant}`, action.spent_at),
      }
    )
  }

  return (
    <section
      aria-label={`Bill from ${action.merchant}`}
      className="flex flex-col gap-3 rounded-2xl glass-strong p-4 text-sm"
    >
      <header className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent [&_svg]:size-4">
          <ReceiptTextIcon />
        </span>
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-medium">{action.merchant}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(action.spent_at)} · {action.line_count}{" "}
            {action.line_count === 1 ? "line" : "lines"}
          </span>
        </span>
        <span className="shrink-0 font-medium tabular-nums">{totals}</span>
      </header>

      {gone ? (
        <p className="text-muted-foreground">Discarded.</p>
      ) : saved ? (
        <p className="flex items-center gap-2">
          <CircleCheckIcon className="size-4 text-muted-foreground" />
          Saved.
          <Link
            className="ml-auto text-brand-ink underline-offset-4 hover:underline"
            to="/spending/bills"
          >
            View in Bills
          </Link>
        </p>
      ) : (
        <>
          {lines.length ? (
            <ul className="flex flex-col gap-1 border-t pt-3 text-muted-foreground">
              {lines.slice(0, SHOWN_LINES).map((item) => (
                <LineRow item={item} key={item.id} />
              ))}
              {lines.length > SHOWN_LINES ? (
                <li className="text-xs">
                  +{lines.length - SHOWN_LINES} more in Edit
                </li>
              ) : null}
            </ul>
          ) : null}
          {action.possible_duplicates ? (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangleIcon className="mt-px size-3.5 shrink-0" />
              Looks like a bill you’ve already saved. Check before saving.
            </p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {discarding ? (
            <div className="flex items-center gap-2">
              <span className="flex-1">Discard this bill?</span>
              <Button
                disabled={busy}
                onClick={() => setDiscarding(false)}
                size="sm"
                variant="ghost"
              >
                Keep
              </Button>
              <Button
                disabled={busy}
                onClick={() => discard.mutate(action.document_id)}
                size="sm"
                variant="destructive"
              >
                {discard.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                Discard
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                className="flex-1"
                disabled={busy || !data}
                onClick={save}
              >
                {confirm.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                Save bill
              </Button>
              <Button
                disabled={busy || !data}
                onClick={() => setReviewing(true)}
                variant="outline"
              >
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
              <Button
                aria-label="Discard bill"
                disabled={busy}
                onClick={() => setDiscarding(true)}
                size="icon"
                variant="ghost"
              >
                <Trash2Icon />
              </Button>
            </div>
          )}
        </>
      )}

      <ReviewDocumentDialog
        documentId={reviewing ? action.document_id : null}
        onClose={() => setReviewing(false)}
      />
    </section>
  )
}
