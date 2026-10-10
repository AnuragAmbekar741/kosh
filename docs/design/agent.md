# Assistant widget

The chat assistant on every signed-in page. Operate mode: it answers a
question about the user's own ledger and gets out of the way. Tokens and
controls are the ones in [global.md](./global.md); behaviour behind it is in
[architecture/agent.md](../architecture/agent.md).

## Placement

- **Launcher:** a primary `Button` (`size="icon-lg"`, MessageCircle icon; X
  while open) fixed bottom-right, 16px from the edges on phones and 24px from `sm`.
  Mounted once in `AppShell`, so it exists on every signed-in page and never on
  login. Square like every icon button; never a pill.
- **Panel:** a non-modal floating `section` (`role="dialog"`) above the
  launcher, 400px wide and up to 640px tall (`min(40rem, 100svh − 6.5rem)`).
  It uses the incumbent floating-surface treatment from `Popover`:
  `bg-popover`, `ring-1 ring-foreground/10`, `shadow-md`, `rounded-xl`.
  Below `sm` it fills the screen and the launcher hides; the header's ✕ closes.
- **Stays open while navigating**, so the user can ask about the page they are
  on. Esc (inside the panel) or ✕ closes it and returns focus to the launcher.
- **Toasts moved to bottom-center**; bottom-right belongs to the launcher.

Opening uses one motion: fade + 8px rise + 0.98 → 1 scale from the bottom-right
origin, 220ms exponential ease-out. Reduced motion keeps only a 120ms fade.

## Anatomy

```
┌ header 48px ─────────────────────────────┐
│ 💬 Assistant         [history] [new] [✕] │  ghost icon-sm buttons with tooltips
├──────────────────────────────────────────┤
│ thread (MessageScroller)                  │
│                     ┌ user: Bubble ─────┐ │  secondary bubble, right
│                     └───────────────────┘ │
│ reply: Bubble ghost, markdown, left       │
│ Marker + shimmer: "Adding up your spending…"
├──────────────────────────────────────────┤
│ InputGroup: Textarea + Send (inline end)  │  Enter sends · Shift+Enter new line
└──────────────────────────────────────────┘
```

- **Thread:** shadcn `MessageScroller` (auto-follow while streaming, the
  user's question anchored, jump-to-latest button), `Message` rows, `Bubble`
  surfaces, `Marker` for status lines. No hand-rolled scroll or bubble divs.
- **User messages:** `Bubble variant="secondary"`, right, text as typed
  (`whitespace-pre-wrap`).
- **Replies:** `Bubble variant="ghost"`, left, full width, rendered with
  `react-markdown` limited to paragraphs, bold, italics, lists, links and code.
  Raw HTML is never rendered; headings, tables and images collapse to text.
  Numbers use `tabular-nums`; links use `brand-ink`.
- **Composer:** `InputGroup` + `InputGroupTextarea` (one line, grows to
  128px, 4000 characters) with only the placeholder "Ask about your spending…",
  no hint text. A primary `icon-sm` send button sits at the inline end, pinned
  to the bottom as the text grows, and is disabled while a reply is streaming or
  the text is blank. Enter sends; Shift+Enter adds a line.
- **Icon:** `MessageCircle` marks the assistant everywhere (launcher, panel
  header, new-chat empty state).

## States

| State | Shows |
|---|---|
| New chat | `Empty variant="plain"`: "Ask about your spending", that answers come from confirmed bills and nothing changes from chat, and three example questions as outline buttons that send on click |
| Loading a saved chat | Two `Skeleton` rows |
| Sending | The question at once, then a shimmering `Marker`: "Thinking…" until a tool runs, then its label ("Adding up your spending…", "Looking through your purchases…", "Checking your bills…") |
| Reply | Replaces the marker; the saved transcript takes over when the stream ends |
| Refused before streaming | Under the question: 409 "Still answering your last message", 429 daily limit, 503 not set up, 404 chat gone; offline: "Couldn't reach Kosh"; each with Retry |
| Reply failed | Under the saved question: "Couldn't answer this one." with Retry (resends the text) |
| Past chats | Header history button switches the panel to a list of chats (title, relative time, current one highlighted); ← returns |
| No chats yet | `Empty variant="plain"`: "No chats yet" |

Tool names, ids and JSON never appear; `agent-copy.ts` owns every label and
message.

## Memory

The open chat is remembered per browser (`localStorage`,
`kosh.agent.conversation`) so reopening the panel continues it. A remembered
chat that returns 404 (another account on the same browser) is forgotten and
the panel starts fresh. A reply keeps streaming while the panel is closed or the
user changes page, because the widget never unmounts.

## Code

```
src/api/agent/            agent.ts (axios + fetch SSE), agent.types.ts
src/hooks/agent/          query-keys, use-conversations, use-conversation,
                          use-send-message (the turn being streamed),
                          use-agent-panel (widget state + context)
src/components/agent/     AgentWidget, AgentLauncher, AgentPanel, AgentThread,
                          AgentMessage, AgentEmpty, AgentComposer, AgentHistory,
                          agent-copy.ts
src/components/ui/        message-scroller, message, bubble, marker (shadcn)
```

Adding the shadcn chat components wanted to overwrite `ui/button.tsx` with
upstream sizes; the local file was kept, since its sizes are the control scale
in [global.md](./global.md).
