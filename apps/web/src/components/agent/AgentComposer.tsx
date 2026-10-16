import { ArrowUpIcon } from "lucide-react"
import { useState, type KeyboardEvent, type Ref } from "react"

import { AgentScanButtons } from "@/components/agent/AgentScanButtons"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"

const MAX_LENGTH = 4000

type AgentComposerProps = {
  inputRef?: Ref<HTMLTextAreaElement>
  /** Phone chat: camera and gallery buttons before the text box. */
  scan?: boolean
}

export function AgentComposer({ inputRef, scan = false }: AgentComposerProps) {
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
      className="flex items-end gap-2 border-t p-3"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {scan ? <AgentScanButtons /> : null}
      <InputGroup>
        <InputGroupTextarea
          aria-label="Message the assistant"
          className="max-h-32 min-h-10"
          maxLength={MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          // Phones: the scan buttons leave room for a short line only.
          placeholder={scan ? "Ask a question…" : "Ask about your spending…"}
          ref={inputRef}
          rows={1}
          value={text}
        />
        <InputGroupAddon align="inline-end" className="self-end">
          <InputGroupButton
            aria-label="Send"
            disabled={!canSend}
            size="icon-sm"
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
