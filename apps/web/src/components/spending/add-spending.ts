// ponytail: the header owns the dialog; empty states open it through this event.
export const ADD_SPENDING_EVENT = "kosh:add-spending"

export type AddSpendingStart = "choose" | "upload"

export function openAddSpending(start: AddSpendingStart = "choose") {
  window.dispatchEvent(new CustomEvent(ADD_SPENDING_EVENT, { detail: start }))
}
