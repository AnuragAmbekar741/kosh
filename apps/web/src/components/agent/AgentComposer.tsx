import { ArrowUpIcon } from "lucide-react"
import { useState, type KeyboardEvent, type ReactNode, type Ref } from "react"

import { AgentAttachButton } from "@/components/agent/AgentAttachButton"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"
import { cn } from "@/lib/utils"

const MAX_LENGTH = 4000

type AgentComposerProps = {
  inputRef?: Ref<HTMLTextAreaElement>
  /**
   * `panel`: the desktop panel's bordered box. `phone`: a frosted pill with a
   * paperclip and a round send button.
   */
  variant?: "panel" | "phone"
  /** Phone: before the pill (the nav button). */
  leading?: ReactNode
}

export function AgentComposer({
  inputRef,
  variant = "panel",
  leading = null,
}: AgentComposerProps) {
  const phone = variant === "phone"
  const { chat } = useAgentPanel()
  const [text, setText] = useState("")
  const busy = Boolean(chat.turn?.streaming)
  const canSend = !busy && text.trim().length > 0

  function submit() {
    if (!canSend) return
    void chat.send(text.trim())
    setText("")
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return
    event.preventDefault()
    submit()
  }

  return (
    <form
      className={cn(
        "flex items-end gap-2",
        phone
          ? "px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          : "border-t p-3"
      )}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {leading}
      <InputGroup
        className={cn(
          phone &&
            // Frosted look without backdrop-filter: blurring what's behind the
            // box on every keystroke made typing lag on phones.
            "min-h-12 rounded-[22px] border-(--glass-border) bg-(--glass-strong) pl-1.5 shadow-(--glass-shadow)"
        )}
      >
        <InputGroupTextarea
          aria-label="Message the assistant"
          className={cn("max-h-32", phone ? "min-h-11.5" : "min-h-10")}
          maxLength={MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          // Phones: the nav button leaves room for a short line only.
          placeholder={phone ? "Ask a question…" : "Ask about your spending…"}
          ref={inputRef}
          rows={1}
          value={text}
        />
        <InputGroupAddon
          align="inline-end"
          className={cn("self-end", phone && "gap-1 py-[5px]")}
        >
          {phone ? <AgentAttachButton /> : null}
          <InputGroupButton
            aria-label="Send"
            disabled={!canSend}
            size={phone ? "icon-round" : "icon-sm"}
            type="submit"
            variant="default"
          >
            <ArrowUpIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
