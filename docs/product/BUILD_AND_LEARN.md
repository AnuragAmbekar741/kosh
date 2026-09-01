# Finance Agent — Build + Learn Python Roadmap

> A living implementation guide for building the Finance Agent while learning Python and backend engineering with FastAPI.

## Repo mapping (read this first)

This guide’s folder names are **not** this repo’s layout. When the guide says:

| Guide path | Implement as |
|---|---|
| `apps/api/app/auth/models.py` | `packages/storage` models + `apps/api/src/api/routers/auth.py` |
| `apps/api/app/...` routers | `apps/api/src/api/routers/<feature>.py` |
| Auth helpers / JWT | `packages/security` |
| SQLAlchemy models | **SQLModel** in `packages/storage` |

Short docs for agents: [README.md](../README.md), [architecture/overview.md](../architecture/overview.md), [architecture/decisions.md](../architecture/decisions.md), [product/scope.md](./scope.md), [design/dashboard.md](../design/dashboard.md).

---

## 1. Goal

Build a personal finance application that allows a user to:

- Register and authenticate with email/password or Google.
- Upload financial documents such as PDFs, images, and DOCX files.
- Extract spending items from those documents.
- Review and manage spending items.
- View basic spending analytics.
- Interact with the application through a web dashboard.
- Interact with the same backend through an AI agent.
- Use WhatsApp as an additional agent interface.
- Later connect real bank accounts with Plaid.

This project is also a structured way to learn:

- Python fundamentals
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL
- Authentication
- Background processing
- API design
- Testing
- Agent/tool architecture
- Webhooks and third-party integrations

---

# 2. Product Principle

The main architectural rule:

```text
The Agent is NOT the application.

The Agent is one client/orchestrator on top of the application services.
```

Both the dashboard and the agent should use the same backend business logic.

```text
React Dashboard ───────────────┐
                               │
WhatsApp → Agent ──────────────┼──▶ Application Services
                               │
Document Worker ───────────────┘
```

The agent should never have unrestricted database access.

Bad:

```text
Agent → execute_sql() → Database
```

Good:

```text
Agent
  ↓
Tool
  ↓
SpendService
  ↓
Repository
  ↓
Database
```

---

# 3. V1 Scope

V1 should remain intentionally focused.

## Authentication

- Email/password registration
- Email/password login
- Google OAuth
- JWT access token
- Refresh-token rotation
- Logout
- Current-user endpoint

## Spending

- Create spending item
- List spending items
- View spending item
- Update spending item
- Delete spending item
- Filter by date/category/merchant/source

## Documents

Supported input:

- PDF
- Image
- DOCX

Document workflow:

```text
Upload
  ↓
Store original document
  ↓
Extract content
  ↓
LLM/structured extraction
  ↓
Create SpendItem candidates
  ↓
User review
  ↓
Confirm SpendItems
```

## Overview

Basic analytics:

- Total spending
- Monthly spending
- Spending by category
- Top merchants
- Spending over time
- Recent spending

## Dashboard

Primary routes:

```text
/overview
/spending
/documents
/chat
```

## Agent

V1 agent should:

- Answer spending questions.
- List spending items.
- Create spending items.
- Update spending items.
- Request confirmation before destructive operations.
- Check document processing status.
- Work from the dashboard chat interface.
- Later work through WhatsApp.

## WhatsApp

V1 WhatsApp support:

- Receive text messages.
- Identify/link users.
- Send messages to the agent.
- Receive PDFs/images/documents.
- Run those documents through the normal document pipeline.
- Confirm extracted spending items.

---

# 4. V2 Scope

Do not block V1 on these.

## Bank Connections

Use Plaid for:

- Connecting bank accounts
- Importing bank transactions
- Synchronizing transaction history

New spend source:

```text
source = plaid
```

## Bills

Potential functionality:

- Detect recurring bills.
- Store due dates.
- Track bill status.
- Surface upcoming bills.
- Agent queries such as:

```text
"What bills are due next week?"
```

## Splitwise

Potential functionality:

- Import shared expenses.
- View balances.
- Track money owed/owing.
- Eventually allow agent queries around shared expenses.

## Actual Payment Execution

Real money movement is **not currently part of V1 or initial V2**.

Connecting bank accounts and reading transactions is different from initiating payments.

---

# 5. Naming Decision: SpendItem, Not Payment

The original whiteboard used `Payment`.

For V1, the better internal term is:

```text
SpendItem
```

Why?

A receipt transaction, a bank transaction, and an actual payment transfer are different concepts.

Using `SpendItem` prevents future ambiguity.

---

# 6. Core Tech Stack

## Frontend

```text
React
TypeScript
Vite
React Router / TanStack Router
TanStack Query
Tailwind
shadcn/ui
Vitest
React Testing Library
```

## Backend

```text
Python
FastAPI
Pydantic
SQLAlchemy
Alembic
PostgreSQL
pytest
```

## Async Processing

Start simple:

```text
FastAPI BackgroundTasks
```

Graduate later to:

```text
Redis
Celery or equivalent worker
```

The goal is to understand **why** a task queue is needed before introducing one.

## Files

Production:

```text
S3-compatible storage
```

Local development:

```text
MinIO
```

## API Contract

Use:

```text
FastAPI Pydantic models
        ↓
OpenAPI specification
        ↓
Generated TypeScript API types/client
        ↓
React
```

Do not manually maintain duplicate Python and TypeScript API types.

---

# 7. Monorepo Structure

Recommended direction:

```text
finance-agent/
│
├── apps/
│   │
│   ├── web/
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── api/
│   │   ├── app/
│   │   ├── tests/
│   │   └── pyproject.toml
│   │
│   └── worker/
│       ├── app/
│       ├── tests/
│       └── pyproject.toml
│
├── packages/
│   │
│   ├── ui/
│   │
│   ├── api-client/
│   │
│   └── config/
│
├── infra/
│   ├── docker/
│   └── scripts/
│
├── docs/
│   ├── PRD.md
│   └── BUILD_AND_LEARN.md
│
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### Rule

`apps/` contains deployable applications.

`packages/` contains code actually shared between applications.

Avoid creating shared packages prematurely.

---

# 8. FastAPI Structure

Use feature/domain-based modules.

```text
apps/api/
│
├── app/
│   │
│   ├── main.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── exceptions.py
│   │
│   ├── auth/
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── models.py
│   │   ├── service.py
│   │   └── repository.py
│   │
│   ├── users/
│   │
│   ├── spending/
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── models.py
│   │   ├── service.py
│   │   └── repository.py
│   │
│   ├── documents/
│   │
│   ├── overview/
│   │
│   ├── agent/
│   │
│   └── integrations/
│       ├── whatsapp/
│       └── plaid/
│
└── tests/
    ├── unit/
    ├── integration/
    └── api/
```

Dependency direction:

```text
Router
  ↓
Service
  ↓
Repository
  ↓
Database
```

Responsibilities:

| File | Responsibility |
|---|---|
| `router.py` | HTTP/API concerns |
| `schemas.py` | Pydantic request/response models |
| `models.py` | SQLAlchemy database models |
| `service.py` | Business rules |
| `repository.py` | Database queries |

---

# 9. Core Data Model

## User

```text
User
----
id
name
email
phone? 
created_at
updated_at
```

Do not store payment arrays or authentication-specific fields directly on the user.

Avoid collecting DOB/age unless the product actually needs it.

---

## AuthIdentity

```text
AuthIdentity
------------
id
user_id

provider
  local
  google

provider_subject
password_hash?

created_at
```

One user can have multiple authentication methods.

```text
User
 ├── Email/password
 └── Google
```

---

## RefreshSession

```text
RefreshSession
--------------
id
user_id
refresh_token_hash
expires_at
revoked_at
created_at
last_used_at
```

Never store a raw refresh token.

---

## SpendItem

```text
SpendItem
---------
id
user_id
document_id?

merchant
description?
amount
currency

transaction_type
  debit
  credit

transaction_date

category_id?

source
  manual
  document
  whatsapp
  plaid       # V2

status
  pending_review
  confirmed

confidence_score?

created_at
updated_at
```

---

## Category

```text
Category
--------
id
name
slug
parent_category_id?
```

Initial categories might include:

```text
Food
Transport
Housing
Entertainment
Shopping
Health
Utilities
Travel
Other
```

---

## Document

```text
Document
--------
id
user_id

filename
mime_type
storage_key

source
  dashboard
  whatsapp

status
  uploaded
  processing
  ready
  failed

created_at
updated_at
```

The actual file should be stored in object storage, not PostgreSQL.

---

# 10. Initial ERD

```text
                    User
                     │
       ┌─────────────┼──────────────┐
       │             │              │
       ▼             ▼              ▼
 AuthIdentity   RefreshSession    Document
                                     │
                                     ▼
                                  SpendItem
                                     ▲
                                     │
                                  Category

User ─────────────────────────────▶ SpendItem
```

Agent tables will later extend this model.

---

# 11. Agent Data Model

## Conversation

```text
Conversation
------------
id
user_id
channel
created_at
```

Possible channels:

```text
dashboard
whatsapp
```

## Message

```text
Message
-------
id
conversation_id

role
  user
  assistant
  tool

content
created_at
```

## AgentRun

```text
AgentRun
--------
id
conversation_id
input_message_id

status
model
prompt_version

started_at
completed_at
```

## ToolExecution

```text
ToolExecution
-------------
id
agent_run_id

tool_name
arguments_json
result_json

risk_level
approval_status

created_at
completed_at
```

This gives an audit trail for agent behavior.

---

# 12. V1 API Design

## Authentication

```http
POST /auth/register
POST /auth/login
POST /auth/google
POST /auth/refresh
POST /auth/logout

GET /users/me
```

Prefer:

```text
GET /users/me
```

instead of exposing:

```text
GET /users/{id}
```

for normal profile retrieval.

---

## Spend Items

```http
POST   /spend-items
GET    /spend-items
GET    /spend-items/{id}
PATCH  /spend-items/{id}
DELETE /spend-items/{id}
```

Potential filters:

```http
GET /spend-items?category=food
GET /spend-items?merchant=Starbucks
GET /spend-items?source=document
GET /spend-items?from=2026-08-01&to=2026-08-31
```

---

## Documents

```http
POST /documents
GET  /documents
GET  /documents/{id}
```

Possible future endpoint:

```http
POST /documents/{id}/confirm
```

---

## Overview

```http
GET /overview
```

Example response:

```json
{
  "total_spend": 2100,
  "monthly_spend": 850,
  "category_breakdown": [],
  "top_merchants": [],
  "recent_spend": []
}
```

`Overview` should initially be a read model, not a separate database table.

---

# 13. Authentication Flow

Access token:

```text
Short lived
≈ 15 minutes
```

Refresh token:

```text
Longer lived
≈ 30 days
```

Flow:

```text
Login
  ↓
Access Token + Refresh Token
  ↓
Access expires
  ↓
Refresh endpoint
  ↓
New Access Token + New Refresh Token
  ↓
Old refresh token revoked
```

For browser clients:

```text
Refresh token → HttpOnly + Secure cookie
```

Avoid storing sensitive refresh tokens in `localStorage`.

---

# 14. Document Processing Architecture

The document API should not wait for long extraction work.

```text
POST /documents
       │
       ▼
Store file
       │
       ▼
Create Document row
       │
       ▼
Queue processing task
       │
       ▼
Worker
       │
       ├── PDF text extraction
       ├── OCR / vision when needed
       ├── DOCX extraction
       └── LLM structured extraction
       │
       ▼
SpendItem candidates
```

Document state:

```text
uploaded
   ↓
processing
   ↓
ready

or

failed
```

---

# 15. Agent Tool Model

Start with explicit tools.

## Read Tools

```text
get_spending_summary
list_spend_items
get_spend_item
list_documents
get_document_status
```

## Write Tools

```text
create_spend_item
update_spend_item
confirm_document_items
```

## Destructive Tools

```text
delete_spend_item
```

Each tool should define:

```text
name
description
input_schema
required_permissions
risk_level
confirmation_requirement
```

---

# 16. Agent Safety Model

Suggested execution flow:

```text
UNDERSTAND
    ↓
PLAN
    ↓
AUTHORIZE
    ↓
CONFIRM if required
    ↓
EXECUTE
    ↓
VERIFY
    ↓
RESPOND
```

Example:

```text
User:
"Delete all Starbucks transactions from last month."
```

Agent first retrieves matching items.

```text
12 transactions
$87.43 total
```

Then asks:

```text
"I found 12 Starbucks transactions totaling $87.43.
Delete all 12?"
```

Only after explicit confirmation should the destructive tool run.

---

# 17. WhatsApp Architecture

WhatsApp should be another interface into the same application.

```text
WhatsApp
   ↓
Webhook Endpoint
   ↓
Agent
   ↓
Application Services
   ↓
Database
```

Not:

```text
WhatsApp → Separate Finance Backend
```

Text flow:

```text
User
  ↓
WhatsApp
  ↓
Webhook
  ↓
Parse message
  ↓
Identify user
  ↓
Agent
  ↓
Tool
  ↓
Service
  ↓
Response
  ↓
WhatsApp
```

Document flow:

```text
User sends receipt
       ↓
WhatsApp webhook
       ↓
Download media
       ↓
Store in object storage
       ↓
Create Document
       ↓
Process document
       ↓
Create SpendItem candidates
       ↓
Agent asks user to confirm
```

---

# 18. Python Learning Roadmap

The implementation order is deliberately aligned with learning Python.

---

## Phase 0 — Python Fundamentals

### Product Work

No production feature yet.

Create small finance-related exercises.

### Learn

- Variables
- Strings
- Numbers
- Lists
- Dictionaries
- Sets
- Tuples
- Functions
- Classes
- Dataclasses
- Type hints
- Exceptions
- Modules
- Imports

### Example

```python
from dataclasses import dataclass
from decimal import Decimal


@dataclass
class SpendItem:
    merchant: str
    amount: Decimal
    category: str


def calculate_total(items: list[SpendItem]) -> Decimal:
    return sum(
        (item.amount for item in items),
        Decimal("0"),
    )
```

### Suggested Exercises

- [ ] Calculate total spending.
- [ ] Group spending by category.
- [ ] Find the highest spending item.
- [ ] Filter transactions by merchant.
- [ ] Raise an exception for an invalid amount.

### Tests

- [ ] Empty transaction list.
- [ ] Single transaction.
- [ ] Multiple categories.
- [ ] Decimal amounts.
- [ ] Invalid amount.

---

# Phase 1 — FastAPI Foundation

## Product Milestone

```text
React
  ↓
GET /health
  ↓
FastAPI
  ↓
{"status": "ok"}
```

### Learn

- Python packages
- Imports
- Decorators
- `def`
- `async def`
- Type hints
- FastAPI application lifecycle

### Build

- [ ] Create `apps/api`.
- [ ] Create Python project configuration.
- [ ] Install FastAPI.
- [ ] Create `main.py`.
- [ ] Add `/health`.
- [ ] Connect React to the endpoint.

### Suggested Tests

- [ ] `/health` returns 200.
- [ ] Response contains expected JSON.
- [ ] React handles backend-unavailable state.

---

# Phase 2 — Pydantic + API Models

## Product Milestone

Create typed API contracts before authentication logic becomes large.

### Learn

- Pydantic `BaseModel`
- Validation
- `EmailStr`
- Optional fields
- Enums
- Request models
- Response models

Example:

```python
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
```

Important distinction:

```text
Database Model
      ≠
Request Model
      ≠
Response Model
```

### Suggested Tests

- [ ] Invalid email rejected.
- [ ] Missing name rejected.
- [ ] Password is never included in response models.

---

# Phase 3 — Authentication

## Product Milestone

Implement:

```http
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET /users/me
```

Google OAuth can be added after local auth works.

### Learn

- Password hashing
- JWT
- Exceptions
- Authentication dependencies
- Cookies
- Security boundaries
- Classes and services

### Suggested Tests

- [ ] Register valid user.
- [ ] Duplicate email rejected.
- [ ] Password stored hashed.
- [ ] Valid login succeeds.
- [ ] Wrong password rejected.
- [ ] Expired token rejected.
- [ ] Refresh token rotates.
- [ ] Revoked refresh token rejected.
- [ ] User cannot access protected route without token.

---

# Phase 4 — PostgreSQL + SQLAlchemy

## Product Milestone

Persist users and sessions.

### Learn

- ORM basics
- SQLAlchemy models
- Database sessions
- Transactions
- Context managers
- Dependency injection
- Migrations
- Alembic

Architecture:

```text
Router
  ↓
Service
  ↓
Repository
  ↓
SQLAlchemy
  ↓
PostgreSQL
```

### Suggested Tests

- [ ] User persists correctly.
- [ ] Unique email constraint works.
- [ ] Repository returns correct user.
- [ ] Transaction rollback works on failure.
- [ ] Migrations run from an empty database.

---

# Phase 5 — SpendItem CRUD

## Product Milestone

Implement:

```http
POST   /spend-items
GET    /spend-items
GET    /spend-items/{id}
PATCH  /spend-items/{id}
DELETE /spend-items/{id}
```

### Learn

- Domain modeling
- Enums
- `Decimal`
- `date`
- Optional values
- Service/repository separation
- Ownership checks
- Query parameters

Example:

```python
class SpendItemCreate(BaseModel):
    merchant: str
    amount: Decimal
    currency: str = "USD"
    transaction_date: date
```

### Suggested Tests

- [ ] Create transaction.
- [ ] Read transaction.
- [ ] Update transaction.
- [ ] Delete transaction.
- [ ] User cannot access another user's transaction.
- [ ] Invalid negative/zero amount behavior is defined.
- [ ] Invalid category handled.
- [ ] Filters work correctly.
- [ ] Pagination behavior is tested.

---

# Phase 6 — Overview Analytics

## Product Milestone

Implement:

```http
GET /overview
```

### Learn

Python:

- Dictionaries
- Comprehensions
- Aggregation
- Sorting

Database:

- `SUM`
- `COUNT`
- `GROUP BY`
- Date filtering
- Index basics

Important lesson:

```text
Do not load 1,000,000 rows into Python
just to calculate SUM(amount).
```

Let PostgreSQL perform database aggregations when appropriate.

### Suggested Tests

- [ ] Empty account returns zeros.
- [ ] Monthly totals are correct.
- [ ] Category totals are correct.
- [ ] Top merchant calculation is correct.
- [ ] Only current user's data is included.
- [ ] Date boundaries behave correctly.

---

# Phase 7 — Document Upload

## Product Milestone

Implement:

```http
POST /documents
GET /documents
GET /documents/{id}
```

### Learn

- Files
- Bytes
- Streams
- `pathlib`
- MIME types
- Upload validation
- Object storage
- Async I/O

Example:

```python
from pathlib import Path

extension = Path(file.filename).suffix.lower()
```

### Suggested Tests

- [ ] PDF accepted.
- [ ] Image accepted.
- [ ] DOCX accepted.
- [ ] Unsupported file rejected.
- [ ] Oversized file rejected.
- [ ] Storage failure handled.
- [ ] User cannot access another user's document.

---

# Phase 8 — Background Document Processing

## Product Milestone

Process documents outside the request-response cycle.

### Learn

- Background processing
- Queues
- Retry logic
- Serialization
- Worker processes
- Idempotency
- Failure handling

Start:

```text
FastAPI BackgroundTasks
```

Then move to:

```text
Redis + Worker
```

when the limitations become clear.

### Suggested Tests

- [ ] Processing state changes correctly.
- [ ] Failed processing marks document as failed.
- [ ] Retrying does not create duplicate SpendItems.
- [ ] Same job cannot be processed twice incorrectly.
- [ ] Extraction result validates through Pydantic.

---

# Phase 9 — Document Extraction

## Product Milestone

Turn:

```text
PDF / image / DOCX
```

into:

```text
SpendItem candidates
```

### Learn

- Third-party libraries
- Structured parsing
- Adapter patterns
- Pydantic structured outputs
- Error handling
- LLM integration

Suggested abstraction:

```text
DocumentExtractor
  ├── PdfExtractor
  ├── ImageExtractor
  └── DocxExtractor
```

### Suggested Tests

- [ ] Known receipt fixture produces expected merchant.
- [ ] Known receipt fixture produces expected total.
- [ ] Missing fields handled safely.
- [ ] Invalid LLM result rejected.
- [ ] Confidence score stored.
- [ ] Extracted items remain pending until confirmation.

---

# Phase 10 — Agent Core

## Product Milestone

Dashboard chat can answer:

```text
"How much did I spend this month?"
```

### Learn

- First-class functions
- Dictionaries of functions
- Protocols/interfaces
- Dependency inversion
- Tool registries
- Structured inputs
- Agent state

Example concept:

```python
TOOLS = {
    "list_spend_items": list_spend_items,
    "get_spending_summary": get_spending_summary,
}
```

### Suggested Tests

- [ ] Correct tool selected for spending summary.
- [ ] Invalid tool arguments rejected.
- [ ] Agent cannot access another user's resources.
- [ ] Read tool requires no destructive confirmation.
- [ ] Delete operation requires confirmation.
- [ ] Tool calls are audited.
- [ ] Agent cannot execute arbitrary SQL.

---

# Phase 11 — Dashboard Chat

## Product Milestone

React `/chat` interface.

Examples:

```text
"How much did I spend on food last month?"

"Show my biggest purchases."

"Add $18.75 for lunch at Chipotle."
```

### Learn

Backend:

- Conversation state
- Streaming responses if needed
- Error boundaries

Frontend:

- Chat state
- Server state
- Optimistic/pending UI
- Tool/action status

### Suggested Tests

- [ ] Conversation persists.
- [ ] User messages appear correctly.
- [ ] Backend failure shown gracefully.
- [ ] Tool confirmation UI works.
- [ ] Refreshing the page restores conversation.

---

# Phase 12 — WhatsApp

## Product Milestone

Use WhatsApp as another client of the agent.

### Learn

- Webhooks
- HTTP clients
- Async requests
- Signatures
- Environment configuration
- External API adapters
- Idempotency

### Suggested Tests

- [ ] Webhook verification works.
- [ ] Invalid signature rejected.
- [ ] Duplicate webhook does not duplicate actions.
- [ ] Known WhatsApp user maps to correct application user.
- [ ] Unknown user receives account-link flow.
- [ ] Text message reaches agent.
- [ ] Agent response sends through WhatsApp adapter.

---

# Phase 13 — WhatsApp Documents

## Product Milestone

User can send a receipt through WhatsApp.

Flow:

```text
WhatsApp receipt
      ↓
Media download
      ↓
Object storage
      ↓
Document
      ↓
Worker
      ↓
SpendItem candidates
      ↓
Confirmation
```

### Suggested Tests

- [ ] Media downloads successfully.
- [ ] Unsupported media rejected.
- [ ] Document source is recorded as `whatsapp`.
- [ ] Duplicate webhook doesn't duplicate document.
- [ ] Extraction follows normal document workflow.
- [ ] Confirmation creates expected SpendItems.

---

# Phase 14 — Hardening

## Product Milestone

Prepare V1 for realistic use.

### Learn

- Logging
- Metrics
- Rate limiting
- Tracing
- Retry strategies
- Idempotency
- Secure configuration
- Threat modeling
- Prompt-injection defenses

### Suggested Tests

- [ ] Authentication rate limits.
- [ ] File size limits.
- [ ] Malicious filenames.
- [ ] Invalid JWTs.
- [ ] Cross-user resource access.
- [ ] Replayed refresh tokens.
- [ ] Duplicate webhooks.
- [ ] Prompt injection in uploaded documents.
- [ ] Agent destructive-action confirmation.
- [ ] Database failures.
- [ ] External API timeouts.

---

# 19. Testing Strategy

Testing should be added during every phase, not at the end.

## Unit Tests

Test:

```text
Service logic
Pure Python functions
Validators
Agent permission logic
Extraction normalization
```

## Repository Tests

Test:

```text
Database queries
Ownership filtering
Constraints
Transactions
```

## API Tests

Test:

```text
HTTP status codes
Authentication
Request validation
Response formats
```

## Integration Tests

Test:

```text
FastAPI + PostgreSQL
Document storage
Worker flows
WhatsApp adapters
```

## Frontend Tests

Test:

```text
Important user flows
Loading/error states
Forms
CRUD interactions
Agent confirmation UI
```

## E2E Tests

Eventually test the main vertical slice:

```text
Register
  ↓
Login
  ↓
Upload receipt
  ↓
Process
  ↓
Review
  ↓
Confirm
  ↓
See spending overview
```

---

# 20. Recommended First Vertical Slice

Do not start by building the agent.

Build this first:

```text
Register
   ↓
Login
   ↓
Dashboard
   ↓
Upload receipt
   ↓
Extract transaction
   ↓
Review transaction
   ↓
Save
   ↓
See it in overview
```

When that works, expose the same services to the agent.

---

# 21. How to Use This Project to Learn Python

For every phase use the same loop:

```text
1. Learn the Python concept
        ↓
2. Solve 2–3 tiny examples
        ↓
3. Apply it to the Finance Agent
        ↓
4. Write tests
        ↓
5. Review the implementation
        ↓
6. Refactor if needed
        ↓
7. Move to the next phase
```

Do not copy large amounts of generated Python without understanding them.

For each implementation, be able to answer:

- What does this Python syntax mean?
- Why is this function `async` or not `async`?
- Why is this a class?
- Why does this logic belong in the service?
- Why is this query in the repository?
- What can fail?
- How is the failure handled?
- How would I test this?
- What changes if traffic grows?

---

# 22. Python Topics Checklist

## Fundamentals

- [ ] Variables
- [ ] Strings
- [ ] Numbers
- [ ] Lists
- [ ] Tuples
- [ ] Sets
- [ ] Dictionaries
- [ ] Conditions
- [ ] Loops
- [ ] Functions
- [ ] Comprehensions

## Intermediate Python

- [ ] Type hints
- [ ] Dataclasses
- [ ] Classes
- [ ] Inheritance basics
- [ ] Composition
- [ ] Enums
- [ ] Exceptions
- [ ] Modules
- [ ] Packages
- [ ] Context managers
- [ ] Generators
- [ ] Iterators

## Backend Python

- [ ] Pydantic
- [ ] FastAPI
- [ ] Dependency injection
- [ ] `async` / `await`
- [ ] HTTP
- [ ] SQLAlchemy
- [ ] PostgreSQL
- [ ] Alembic
- [ ] pytest
- [ ] Mocking
- [ ] Logging

## Advanced Concepts Used by the Project

- [ ] Protocols
- [ ] First-class functions
- [ ] Adapter pattern
- [ ] Repository pattern
- [ ] Service layer
- [ ] Background jobs
- [ ] Queue semantics
- [ ] Idempotency
- [ ] Concurrency
- [ ] Webhooks

---

# 23. Current Architecture Decisions

These decisions came from the initial whiteboard review and should remain the default unless a future requirement changes them.

- [x] React frontend.
- [x] FastAPI backend.
- [x] Monorepo.
- [x] Feature/domain-based backend structure.
- [x] PostgreSQL as main relational database.
- [x] Object storage for uploaded files.
- [x] `SpendItem` instead of `Payment` for V1 financial records.
- [x] Authentication identities separate from `User`.
- [x] Refresh sessions stored server-side.
- [x] Refresh tokens stored hashed.
- [x] `Document` is a first-class entity.
- [x] Document processing should become asynchronous.
- [x] Overview is initially computed/read-only, not a dedicated table.
- [x] Agent uses application services, never arbitrary database access.
- [x] WhatsApp uses the same backend/agent as the web dashboard.
- [x] Destructive agent operations require confirmation.
- [x] Plaid belongs in V2.
- [x] Actual money movement is outside current V1/V2 scope.
- [x] Bills and Splitwise belong after the V1 foundation.

---

# 24. Immediate Next Steps

## Step 1

Set up the monorepo:

```text
apps/web
apps/api
packages/ui
packages/api-client
```

## Step 2

Do the Python fundamentals exercises using finance-domain examples.

## Step 3

Create FastAPI:

```http
GET /health
```

## Step 4

Connect the React app to `/health`.

## Step 5

Introduce Pydantic request/response schemas.

## Step 6

Start authentication.

---

# 25. Definition of V1 Complete

V1 is complete when a user can:

- [ ] Register.
- [ ] Log in.
- [ ] Log out.
- [ ] Use Google OAuth.
- [ ] Access protected dashboard routes.
- [ ] Manually create a SpendItem.
- [ ] Edit a SpendItem.
- [ ] Delete a SpendItem.
- [ ] Upload a supported financial document.
- [ ] Have the document processed asynchronously.
- [ ] Review extracted SpendItems.
- [ ] Confirm extracted SpendItems.
- [ ] View spending analytics.
- [ ] Ask spending questions through dashboard chat.
- [ ] Perform safe finance actions through the agent.
- [ ] Communicate with the agent through WhatsApp.
- [ ] Send a receipt/document through WhatsApp.
- [ ] Receive a confirmation before destructive agent actions.
- [ ] Have important agent/tool actions recorded for auditing.

---

# 26. Build Philosophy

Keep the system simple until the product forces additional complexity.

Prefer:

```text
Modular monolith
```

over:

```text
Many microservices
```

for V1.

Prefer:

```text
Understand the problem
  ↓
Build the simplest correct version
  ↓
Observe limitations
  ↓
Introduce infrastructure
```

instead of adding Redis, queues, event buses, vector databases, and multiple services before they solve an observed problem.

The goal is not merely to finish the application.

The goal is to understand enough of every layer that you could explain and redesign it during a backend/system-design interview.
