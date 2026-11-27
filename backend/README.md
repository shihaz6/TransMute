# TransMute Backend

Spring Boot 4 REST API for the TransMute ERP: customers, sales orders, inventory,
purchasing, supplier documents, collections, accounting, alerts, reports and the AI action log.

## Requirements

- JDK 21 or newer (the Maven wrapper is included, so Maven does not need to be installed)

## Run

```bash
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```

The API listens on `http://localhost:8080`. Health check: `GET /actuator/health`.

## Test

```bash
./mvnw test
```

`ErpFlowIntegrationTest` runs the main flows over HTTP against an in-memory database.

## Configuration

`src/main/resources/application.properties`:

| Key | Purpose |
| --- | --- |
| `spring.datasource.url` | H2 file database under `./data` (git-ignored). Swap for PostgreSQL in production. |
| `transmute.storage.dir` | Where uploaded supplier documents are stored (`./data/uploads`). |
| `transmute.cors.allowed-origins` | Frontend origins allowed to call `/api/**` (Vite dev server by default). |

## Endpoints

| Area | Endpoints |
| --- | --- |
| Customers | `GET/POST /api/customers`, `GET/PUT /api/customers/{id}` |
| Inventory | `GET/POST /api/inventory`, `GET/PUT /api/inventory/{id}`, `POST /api/inventory/{id}/stock` |
| Sales orders | `GET/POST /api/orders`, `GET /api/orders/{id}`, `POST /api/orders/{id}/confirm` |
| Suppliers | `GET/POST /api/suppliers`, `GET/PUT /api/suppliers/{id}` |
| Purchase orders | `GET/POST /api/purchase-orders`, `POST /api/purchase-orders/from-inventory/{itemId}`, `POST /api/purchase-orders/{id}/send`, `POST /api/purchase-orders/{id}/receive` |
| Goods received | `GET /api/goods-received-notes`, `GET /api/goods-received-notes/{id}` |
| Documents | `GET/POST /api/documents` (multipart upload), `GET /api/documents/{id}`, `PATCH /api/documents/{id}`, `POST /api/documents/{id}/approve`, `POST /api/documents/{id}/reject`, `GET /api/documents/{id}/file` |
| Collections | `GET /api/collections`, `POST /api/collections/sync`, `PATCH /api/collections/{id}/tone`, `PATCH /api/collections/{id}/draft`, `POST /api/collections/{id}/send`, `POST /api/collections/{id}/promise` |
| Accounting | `GET/POST /api/accounting/ledger`, `GET/POST /api/accounting/payments`, `PATCH /api/accounting/payments/{id}/cheque-status`, `GET/POST /api/accounting/bank-lines`, `POST /api/accounting/bank-lines/{id}/accept` |
| Alerts | `GET/POST /api/alerts`, `PATCH /api/alerts/{id}/status` |
| Reports | `GET /api/reports/receivables`, `/api/reports/stock`, `/api/reports/purchase-orders` |
| Dashboard | `GET /api/dashboard` |
| Settings | `GET/POST /api/settings/approval-rules`, `PATCH /api/settings/approval-rules/{id}`, `GET /api/settings/ai`, `PATCH /api/settings/ai/{id}` |
| Catalyst chat | `GET/POST /api/catalyst/messages` |
| Audit log | `GET /api/audit-log?module=` |
| Sign-in | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |

Errors return JSON: `{"status": 400, "message": "...", "fields": {...}}`.

## Business rules enforced here

- Order totals are calculated from line items on the server.
- An order that takes a customer past their credit limit is held as `pending-review`
  with a credit warning. Confirming it is an owner override and is logged.
- Goods can only be received against an open purchase order. Quantities cannot exceed
  what is outstanding, and a rejected receipt changes no stock.
- A supplier document cannot be approved until its supplier, invoice number and total
  are filled in.
- Cheques move `received → deposited → cleared | bounced`. Clearing a cheque posts the
  amount to the ledger, and the running balance is maintained by the service.
- Every change that matters is written to the audit log.

## Sign-in, AI and email

- **Sign-in.** Every `/api/**` call needs a session. `POST /api/auth/login` with
  `{"username","password"}` starts one, `GET /api/auth/me` returns the signed-in account,
  and `POST /api/auth/logout` ends it. Writes need the CSRF token from the `XSRF-TOKEN`
  cookie, sent back in the `X-XSRF-TOKEN` header. The frontend does this already.
- **Owner account.** Created on first start from `OWNER_USERNAME` and `OWNER_PASSWORD`.
  Changing those variables later does not change an existing account. Without both,
  nobody can sign in.
- **AI.** `GROQ_API_KEY` turns on the daily haiku, Catalyst replies and invoice reading
  (a Groq vision model reads header fields from uploaded image invoices, filling only blank
  fields; PDFs are not read yet). Without the key, the fixed haiku is shown and Catalyst
  says AI replies are off.
- **Reminder email.** Set `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` and
  `MAIL_FROM`. Sending an approved reminder emails it to the customer's `email` and then
  marks it sent. Without a customer email or SMTP settings, it is refused and nothing is marked sent.
  Customer email can be set through `PUT /api/customers/{id}`; the frontend has no customer
  edit form yet.
- **Schema.** Flyway migrations in `src/main/resources/db/migration` (V1 is the baseline).
  Hibernate only validates the schema (`ddl-auto=validate`).

## Not implemented yet

- Per-user permissions. There is one owner role, and all actions are recorded as the owner.
- WhatsApp delivery. Reminders go by email only.
- Reading PDF invoices. Only images are read automatically.
- A customer edit form in the frontend (email and phone cannot be entered from the UI yet).
