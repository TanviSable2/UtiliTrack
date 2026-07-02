# UtiliTrack — Smart Utility Billing System

A full-stack utility billing platform for residential property management. Built to solve real problems found in enterprise billing systems like Yardi Utility Billing.

**Live demo:** https://utilitrack-phi.vercel.app  
**Backend API:** https://utilitrack.onrender.com/api/health

---

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@utilitrack.com | admin123 |
| Tenant | amit@tenant.com | tenant123 |

> Tenants cannot self-register. Admin creates tenant accounts from the Tenants page.

---

## Why this project exists

Yardi Systems sells a real product called Yardi Utility Billing used by thousands of property companies. Real user reviews complain about billing delays, meter reading errors causing disputes, and water leaks going unnoticed for weeks. UtiliTrack is built to solve exactly these problems — making it directly relevant to Yardi's own product line.

---

## Features

**Admin**
- Manage buildings, units, and tenant accounts
- Enter monthly meter readings with optional photo proof uploaded to Cloudinary
- System validates readings before saving — catches impossible values and consumption spikes
- Generate bills for one unit or entire building in one click
- Download itemised PDF invoices and combined rent + utility statements
- Record payments and track paid, partial, and overdue status
- Review and resolve billing disputes raised by tenants — bill recalculates automatically
- Export overdue report as CSV
- Billing calendar showing meter reading deadlines per building
- Email alerts 3 days before reading deadline

**Tenant**
- View current bill with full breakdown
- Download PDF invoice and convergent rent + utility statement
- 6-month usage trend charts for electricity and water
- Full payment history
- Raise billing disputes — admin responds by email

**Smart alerts**
- Leak detection when water usage exceeds 2x the 3-month average
- Consumption anomaly flag when usage jumps more than 40% above average
- Flagged readings catch errors before bills are generated

---

## Tech stack

| | Technology |
|---|---|
| Frontend | React.js (Vite), Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Database | PostgreSQL on Neon |
| ORM | Prisma |
| PDF | PDFKit |
| Photos | Cloudinary |
| Email | Nodemailer, Mailtrap |
| Scheduled jobs | node-cron |
| Auth | JWT |
| Containers | Docker, docker-compose |
| Frontend deploy | Vercel |
| Backend deploy | Render |
| CI/CD | GitHub Actions |

---

## Architecture

```
GitHub push → GitHub Actions CI/CD
                    ↓
          Vercel (React frontend)
          https://utilitrack-phi.vercel.app
                    ↓ API calls
          Render (Node.js backend)
          https://utilitrack.onrender.com
                    ↓
     Neon PostgreSQL    Cloudinary    Mailtrap
     (database)         (photos)      (email)
```

---

## Local setup

**Requirements:** Node.js 20, Docker (optional)

### Option A — Docker (recommended, one command)

```bash
git clone https://github.com/TanviSable2/UtiliTrack.git
cd UtiliTrack
cp .env.example .env
# Fill in your values in .env
docker-compose up --build
```

Open http://localhost:3000

### Option B — Manual

**Backend**
```bash
cd Backend
npm install
cp .env.example .env
# Fill in your values
npx prisma migrate dev
npm run dev
```

**Frontend**
```bash
cd Frontend
npm install
# Create .env with VITE_API_URL=http://localhost:8080/api
npm run dev
```

### Environment variables needed

```
DATABASE_URL         Neon PostgreSQL connection string
JWT_SECRET           Any long random string
EMAIL_HOST           Mailtrap SMTP host
EMAIL_PORT           2525
EMAIL_USER           Mailtrap username
EMAIL_PASS           Mailtrap password
EMAIL_FROM           noreply@utilitrack.com
CLOUDINARY_CLOUD_NAME  From cloudinary.com dashboard
CLOUDINARY_API_KEY     From cloudinary.com dashboard
CLOUDINARY_API_SECRET  From cloudinary.com dashboard
```

---

## CI/CD pipeline

Every push to main triggers GitHub Actions:

1. Install backend dependencies and generate Prisma client
2. Build React frontend
3. Trigger Render deploy hook
4. Wait and verify backend health endpoint returns 200
5. Vercel detects the push and deploys frontend automatically

---

## Database schema

8 tables: `users`, `buildings`, `units`, `utility_rates`, `meter_readings`, `bills`, `bill_items`, `payments`, `disputes`

Key design decisions:
- Utility rates are stored historically — old bills keep the rate used at billing time
- Meter readings cannot be edited directly — corrections go through the dispute module for audit integrity  
- Tenant accounts are scoped to the admin who created them — full data isolation between property managers
- Meter photos go to Cloudinary — persists across deployments unlike local disk

---

## Scheduled jobs

| Job | When | What it does |
|---|---|---|
| Payment reminders | 10 PM IST daily | Emails tenants if bill is due within 7 days |
| Overdue marking | 10 PM IST daily | Marks unpaid bills as OVERDUE after due date |
| Calendar alerts | 9 AM IST daily | Emails admin 3 days before meter reading deadline |

---

## What this solves vs Yardi

| Yardi complaint | UtiliTrack solution |
|---|---|
| Bills arrive random months late | Billing calendar with enforced deadlines |
| Meter entry errors cause disputes | Reading validation catches errors before billing |
| Hard to resolve past-due balances | Dispute module with bill recalculation and email notification |
| Leaks discovered months later | Water usage monitoring with automatic alert |
| Confusing combined bills | One-click convergent PDF with rent and utility breakdown |

---

