# Product

Personal spend ledger: documents and manual entry into one list, a React dashboard for overview, and later WhatsApp plus an agent on the same backend.

## Platform

web

## Audience

One person tracking their own spend. They open the app to log, confirm, or understand money — often quickly, often in the dark.

## Purpose

Operate. Design serves the task. Auth exists so the user can reach their ledger. The dashboard is the product; marketing chrome is not.

A neighbor app can also store receipts. The claim here is one ledger for manual rows, extracted documents, and later bank lines — same `SpendItem`, same confirmation step, same API the agent will call.

## Voice

Calm, dense, clinical. Linear product UI. Short labels. No hype, no productivity slogans, no “boost your finances.”

## Constraints

- V1: auth, spend CRUD, document drafts, overview. No Plaid, bills, or Splitwise.
- Dark is the default theme.
- Implementation map for tokens lives in `docs/design/global.md`. Visual laws live in `DESIGN.md`. Do not invent a second system.

## Anti-references

Purple gradients. Glassmorphism. Inter / AI-beige. Pill primary CTAs. A second chromatic marketing color. Emoji icons. Drop shadows on dark. “Boost your productivity.”
