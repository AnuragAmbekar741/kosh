import { ArrowUpIcon } from "lucide-react"
import { useState, type KeyboardEvent, type Ref } from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { useAgentPanel } from "@/hooks/agent/use-agent-panel"

const MAX_LENGTH = 4000

type AgentComposerProps = {
  inputRef?: Ref<HTMLTextAreaElement>
}

export function AgentComposer({ inputRef }: AgentComposerProps) {
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
      className="border-t p-3"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <InputGroup>
        <InputGroupTextarea
          aria-label="Message the assistant"
          className="max-h-32 min-h-10"
          maxLength={MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about your spending…"
          ref={inputRef}
          rows={1}
          value={text}
        />
        <InputGroupAddon align="block-end">
          <InputGroupText className="font-normal">
            Enter to send · Shift+Enter for a new line
          </InputGroupText>
          <InputGroupButton
            aria-label="Send"
            className="ml-auto"
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
