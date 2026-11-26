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

## Not implemented yet

- Authentication and per-user permissions. All actions are recorded as the owner.
- Automatic extraction from uploaded invoices (OCR). Documents are stored and reviewed by hand.
- Delivering WhatsApp or email reminders. Marking a reminder as sent only records it.
- AI replies in Catalyst. Messages are stored only.
- Database migrations (Flyway). The schema is created by Hibernate with `ddl-auto=update`.
- Dates and times are ISO-8601 (for example `2026-04-14T09:00:00Z`). The frontend currently
  shows display strings such as `14 Apr 2026`, so it will need a small adapter when connected.
