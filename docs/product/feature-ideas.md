# Feature ideas

Candidates for what to build next. Plans for the first two already exist; the rest are unplanned.

| Feature | Description |
|---|---|
| **Agent phase 2: attachments** | Drop a receipt in chat; the agent waits for extraction and shows a confirm card that creates the bill. See [agent-plan.md](./agent-plan.md). |
| **Recurring products** | Group receipt lines across brands and stores under one product, show how often and how much each is bought, and let one correction fix similar lines. See [recurring-products-plan.md](./recurring-products-plan.md). |
| **Category budgets** | Monthly limit per category, progress bars on Overview, and alerts in the notification center at 80% and 100%. |
| **Duplicate bill detection** | Warn in the review dialog when an upload matches an existing bill on merchant, date, and total. |
| **Agent concurrency fix** | Async streaming and a global cap on replies in progress, so live chats don't slow every route. Needed before deploying. |
| **Export and month-end summary** | CSV download for any ledger filter; a monthly recap of top categories, the biggest change from last month, and the largest bills. |
