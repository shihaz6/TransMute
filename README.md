# TransMute

TransMute is an ERP for a grocery and food distribution business. It covers:

- **Customers and sales orders**, with credit-limit checks and owner overrides
- **Inventory and purchasing**, including suppliers, purchase orders and goods received
- **Supplier documents**, with upload, review and approval
- **Collections**, with payment reminders that can be emailed to customers
- **Accounting**, with a ledger, payments, cheques and bank lines
- **Alerts, reports and a dashboard**
- **An AI action log**, the **Catalyst** chat, and a **daily haiku**

## Repository layout

| Folder | What it is |
| --- | --- |
| `backend/` | Spring Boot 4 REST API on Java 21, with H2 and Flyway migrations |
| `frontend/` | React 19, TypeScript, Vite and Tailwind CSS v4 single-page app |

## Quick start

### Backend

Requires JDK 21 or newer. The Maven wrapper is included.

```bash
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```

The API listens on `http://localhost:8080`. Health check: `GET /actuator/health`.

### Frontend

Requires Node.js and pnpm. The lockfile is `pnpm-lock.yaml`.

```bash
cd frontend
pnpm install
pnpm dev
```

The dev server runs on port **8443** by default (from `frontend/vite.config.ts`, which reads the `PORT` environment variable). Port 5173 is also allowed by the backend's CORS setting, so use it if you set `PORT=5173`.

Start the backend first. The frontend calls `http://localhost:8080` unless `VITE_API_URL` is set.

## Environment variables

Set these in the shell before starting the backend.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OWNER_USERNAME` | Yes, to sign in | Owner account, created on first start |
| `OWNER_PASSWORD` | Yes, to sign in | Password for the owner account |
| `GROQ_API_KEY` | No | Enables the daily haiku, Catalyst replies and invoice reading from images |
| `MAIL_HOST` | No | SMTP host for reminder email. Leave unset to keep email off |
| `MAIL_PORT` | No | SMTP port (defaults to 587) |
| `MAIL_USERNAME` | No | SMTP username |
| `MAIL_PASSWORD` | No | SMTP password |
| `MAIL_FROM` | No | Sender address for reminder email |

Without `GROQ_API_KEY`, the app shows a fixed haiku and Catalyst reports that AI replies are off.

## Running tests

```bash
cd backend
./mvnw test                   # Windows: mvnw.cmd test
```

The main flows are covered by `ErpFlowIntegrationTest`, which runs over HTTP against an in-memory database.

## More detail

See [`backend/README.md`](backend/README.md) for the API endpoint table, the business rules the server enforces, configuration keys, and the list of features not yet implemented.
