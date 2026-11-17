# SpendWise - Smart Expense Tracker & Financial Analytics Platform

A full-stack MERN application: React + Vite frontend, Express REST API, MongoDB (Mongoose), JWT auth.

## Features

| Module | What it does |
|---|---|
| Auth | Register / login, bcrypt-hashed passwords, JWT-protected API and routes |
| Dashboard | Total income / expenses / balance / monthly savings, recent transactions, income-vs-expense chart, category pie, 30-day spending trend |
| Transactions | Add / edit / delete income and expenses, categories, notes, dates, filter (type, category, date range, search), sorting, pagination |
| Categories | Custom income and expense categories with icon + color, per-category totals (delete is blocked while in use) |
| Budgets | Overall and per-category monthly budgets, progress bars, remaining amount, warning at 80% and alert when exceeded |
| Analytics | Monthly / weekly / yearly reports, savings analysis, month-over-month comparison, top categories (Recharts) |
| Smart Insights | Rule-based (plain JavaScript, no paid AI): spending spikes, frequent categories, vs previous month, where to cut, budget overruns, savings rate |
| Reports | Monthly, yearly and custom-range reports + CSV export |

## Prerequisites

- Node.js 20 or newer
- MongoDB: either a local install (`mongodb://127.0.0.1:27017`) or a free MongoDB Atlas cluster

## Run it

Open two terminals.

**1. Backend**
```bash
cd backend
cp .env.example .env        # Windows: copy .env.example .env
# edit .env: set JWT_SECRET, and MONGO_URI if you use Atlas
npm install
npm run seed                # optional: demo user + 6 months of data
npm run dev                 # API on http://localhost:5000
```

**2. Frontend**
```bash
cd frontend
cp .env.example .env        # Windows: copy .env.example .env
npm install
npm run dev                 # App on http://localhost:5173
```

Demo login (after `npm run seed`): `demo@spendwise.com` / `Demo@1234`
Or just register a new account; default categories are created for you.

## Project structure

```
backend/
  config/db.js              MongoDB connection
  models/                   User, Category, Transaction, Budget
  middleware/               auth (JWT), error handling
  controllers/              business logic per module (analytics, insights, reports...)
  routes/                   URL -> controller mapping
  utils/                    dates, helpers, token, seed script
  server.js
frontend/src/
  api/axios.js              axios instance + JWT interceptor
  context/AuthContext.jsx   login state
  components/               Layout, Modal, TransactionModal, StatCard...
  pages/                    one file per module
```

## API overview

All routes except `/api/auth/register` and `/api/auth/login` need `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Auth, returns `{ token, user }` |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/categories` | List (`?type=&withTotals=true`) / create |
| PUT/DELETE | `/api/categories/:id` | Edit / delete |
| GET/POST | `/api/transactions` | List (`?page&limit&sortBy&order&type&category&from&to&search`) / create |
| PUT/DELETE | `/api/transactions/:id` | Edit / delete |
| GET/POST | `/api/budgets` | List with spending (`?month=YYYY-MM`) / create or update |
| DELETE | `/api/budgets/:id` | Delete |
| GET | `/api/analytics/summary` | Dashboard cards + recent transactions |
| GET | `/api/analytics/monthly?year=` | 12-month income / expense / savings |
| GET | `/api/analytics/categories` | Category breakdown (`month` or `from`/`to`) |
| GET | `/api/analytics/trends?period=daily\|weekly\|monthly\|yearly` | Trend data |
| GET | `/api/analytics/insights?month=` | Rule-based insights |
| GET | `/api/reports/monthly`, `/yearly`, `/custom` | Reports |
| GET | `/api/reports/export` | CSV download |

## Design notes worth knowing

- Dates are stored and compared in UTC so a transaction never shifts a day.
- Category `type` cannot be edited after creation, since that would silently flip past income into expenses.
- CSV export neutralises cells starting with `= + - @` to prevent spreadsheet formula injection.
- Insight thresholds (spike ratio, savings rate, etc.) are constants at the top of `controllers/insightsController.js`.
- Currency is set in one place: `frontend/src/utils/format.js` (default INR).
