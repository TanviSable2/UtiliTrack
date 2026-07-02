# UtiliTrack — Smart Utility Billing System

A full-stack utility billing platform built for residential property management. Designed to solve real problems found in enterprise billing systems like Yardi Utility Billing — billing delays, meter reading errors, manual dispute resolution, and lack of leak detection.

Built as a portfolio project targeting Yardi Systems (Pune) and Pratiti Technologies.


## Features

### Admin / Landlord
- Add and manage buildings, units, and tenants
- Enter monthly meter readings with optional photo proof
- Auto-validate readings before saving — catches typos and impossible values
- Generate bills for individual units or all units in a building with one click
- Download itemised PDF invoices and convergent rent + utility statements
- Record payments and track paid / partial / overdue status
- Review and resolve billing disputes raised by tenants
- Export overdue report as CSV
- View billing calendar with meter reading deadlines per building
- Receive email alerts 3 days before reading deadline

### Tenant
- View current month bill with full breakdown
- Download PDF invoice and convergent statement
- See 6-month usage trend charts for electricity and water
- View complete payment history
- Raise billing disputes with reason — admin responds by email

### Smart alerts on admin dashboard
- Leak detection — flags if water usage is more than 2x the 3-month average
- Consumption anomaly — flags if usage jumped more than 40% above average
- Flagged readings — catches lower-than-previous or spike readings before billing
- Open disputes counter

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React.js (Vite), Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Database | PostgreSQL on Neon (cloud hosted) |
| ORM | Prisma |
| PDF generation | PDFKit |
| File storage | Cloudinary (meter photos) |
| Email | Nodemailer with Mailtrap (dev) / Gmail SMTP (production) |
| Scheduled jobs | node-cron |
| Authentication | JWT |
| Frontend deploy | AWS Amplify |
| Backend deploy | AWS App Runner |
| CI/CD | GitHub Actions |

---

## Architecture

```text
GitHub → GitHub Actions CI/CD
              ↓
AWS Amplify (React frontend)
              ↓ API calls
AWS App Runner (Node.js backend)
              ↓
Neon PostgreSQL    Cloudinary       Mailtrap/Gmail
(database)         (meter photos)   (email)
```

---

## Database schema — 7 tables

| Table | Purpose |
|---|---|
| users | Admin and tenant accounts with role-based access |
| buildings | Properties managed by each admin |
| units | Individual flats with tenant assignment and monthly rent |
| utility_rates | Rate history per utility type — old bills keep the rate used at billing time |
| meter_readings | Monthly readings with photo URL, flag status, and flag reason |
| bills | Generated invoices with rent, utility breakdown, and payment status |
| payments | Individual payment records linked to bills |
| disputes | Full dispute history with tenant reason and admin response |

---

## Project structure

```text
UtiliTrack/
├── Backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/     → HTTP request/response logic
│   │   ├── routes/          → Route definitions only
│   │   ├── services/        → Business logic (billing engine, PDF, email, Cloudinary)
│   │   ├── middleware/      → JWT auth and role checks
│   │   ├── cron/            → Scheduled jobs (reminders, overdue marking, calendar alerts)
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── api/             → All API call functions
│   │   ├── components/      → Reusable UI components and layout
│   │   ├── context/         → Auth context
│   │   ├── hooks/           → Custom hooks
│   │   ├── pages/           → Admin pages and tenant portal
│   │   └── utils/           → Helper functions
│   └── package.json
│
└── .github/
    └── workflows/
        └── deploy.yml       → CI/CD pipeline
```

---

## Local setup

### Requirements
- Node.js 20+
- A Neon PostgreSQL database (free at neon.tech)
- A Cloudinary account (free at cloudinary.com)
- A Mailtrap account (free at mailtrap.io)

### Backend

```bash
cd Backend
npm install
```

Create `Backend/.env`:

```text
DATABASE_URL=your_neon_postgresql_url
PORT=8080
JWT_SECRET=your_secret_key

EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_user
EMAIL_PASS=your_mailtrap_pass
EMAIL_FROM=noreply@utilitrack.com

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Run migrations and start:

```bash
npx prisma migrate dev
npm run dev
```

Backend runs on `http://localhost:8080`

### Frontend

```bash
cd Frontend
npm install
```

Create `Frontend/.env`:

```text
VITE_API_URL=http://localhost:8080/api
```

Start:

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

### First time setup after running locally

1. Register as admin on the login page
2. Go to Utility rates — add rates for ELECTRICITY, WATER, GAS
3. Go to Buildings — add your building
4. Go to Tenants — add tenant accounts and share credentials with them
5. Go to Units — add units and assign tenants
6. Go to Meter readings — enter previous month readings first, then current month
7. Go to Bills — generate bills
8. Record payments as tenants pay

---

## CI/CD pipeline

On every push to `main`, GitHub Actions runs four jobs:

1. **Backend CI** — installs dependencies, generates Prisma client, checks syntax
2. **Frontend CI** — installs dependencies, builds the React app
3. **Deploy backend** — triggers AWS App Runner deployment, waits 90 seconds, verifies health endpoint returns 200
4. **Deploy frontend** — AWS Amplify detects the push and deploys automatically

Secrets stored in GitHub repository secrets — never in code.

---

## Key design decisions

**Why no meter reading edit button?**  
Readings cannot be edited directly. Corrections go through the dispute module which creates a full audit trail — tenant raises dispute, admin reviews, corrects the reading, bill recalculates automatically. This matches enterprise compliance requirements.

**Why email is scoped per admin?**  
Each admin manages their own buildings and tenants. A tenant created by Admin A is invisible to Admin B. This is the correct multi-tenant data isolation pattern for property management software.

**Why historical rates are preserved?**  
Adding a new utility rate creates a new record. All previously generated bills keep the rate that was active at billing time. This ensures bills are never retroactively changed.

**Why Cloudinary for photos?**  
Meter reading photos need to persist across deployments. Local disk storage on App Runner disappears on redeploy. Cloudinary provides a permanent URL that works in development and production without code changes.

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register admin |
| POST | /api/auth/register-tenant | Admin creates tenant |
| GET | /api/buildings | Get admin's buildings |
| GET | /api/buildings/calendar | Billing calendar with deadlines |
| GET | /api/units | Get units (scoped to admin) |
| GET | /api/rates/current | Current utility rates |
| POST | /api/meters | Save meter reading with optional photo |
| POST | /api/meters/validate | Validate reading before saving |
| GET | /api/meters/flagged | Get flagged readings |
| POST | /api/bills/generate | Generate bill for one unit |
| POST | /api/bills/generate-bulk | Generate bills for entire building |
| GET | /api/bills/:id/pdf | Download PDF invoice |
| GET | /api/bills/:id/convergent-pdf | Download rent + utility combined PDF |
| GET | /api/bills/leaks | Leak detection alerts |
| GET | /api/bills/anomalies | Consumption anomaly flags |
| GET | /api/bills/overdue-report | Download overdue CSV |
| POST | /api/payments | Record payment |
| POST | /api/disputes | Tenant raises dispute |
| PUT | /api/disputes/:id/resolve | Admin resolves dispute |
| PUT | /api/disputes/:id/recalculate | Recalculate bill after correction |
| GET | /api/dashboard/admin | Admin dashboard data |
| GET | /api/dashboard/tenant | Tenant portal data |
| GET | /api/health | Health check |

---

## Scheduled jobs

| Job | Schedule | What it does |
|---|---|---|
| Payment reminders | 10 PM IST daily | Sends reminder email if bill due within 7 days |
| Overdue marking | 10 PM IST daily | Marks bills as OVERDUE if past due date |
| Calendar alerts | 9 AM IST daily | Emails admin 3 days before meter reading deadline |

