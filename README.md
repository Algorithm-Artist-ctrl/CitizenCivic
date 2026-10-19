# CitizenCivic — JavaScript/TypeScript-First Civic Resolution Engine

CitizenCivic is an independently verified civic issue reporting, tracking, and municipal resolution platform designed for local waste remediation, community accountability, and municipal partnership in India.

---

## 🌟 Core Innovations

1. **Independent Verified Resolution:** An operator's closure claim remains separate from verified resolution. Closing a case requires on-ground after-cleanup photographic proof, citizen satisfaction confirmation, and independent auditor sign-off.
2. **Citizen Dispute Rights:** If a case is prematurely closed while waste remains on-ground, the citizen can exercise unilateral dispute authority, immediately reverting the status to `Disputed Closure` and alerting ward supervisors.
3. **Recurring Hotspot Protection:** Monitored locations are flagged as hotspots, scheduling automated 7-day and 30-day follow-up checks to prevent chronic dumping blackspots.
4. **Deterministic State Machine:**
   `Draft → Submitted → Reviewed → Forwarded → Acknowledged → In Progress → Resolution Reported → Verification Pending → Verified Resolved`
   (Also supports `Disputed Closure`, `Rejected`, `Escalated`, `Duplicate`, and `Unable to Resolve`).
5. **OpenAI Civic Intelligence:**
   - **Triage & Hazard Detection (`POST /api/v1/ai/triage`):** Analyzes complaint descriptions, suggests the correct category, estimates priority, and flags drainage or toxic hazards.
   - **Resolution Auditor (`POST /api/v1/ai/verify`):** Audits field operator resolution notes and photos against the original reported issue to evaluate cleanup completeness.
6. **Role-Based Access Control:** Dedicated portals and permissions for Citizen, Operator, Moderator/Verifier, Supervisor, and Administrator.
7. **Bilingual Localization:** Full English and Hindi (`हिंदी`) language support.
8. **Selective 3D & Motion UI:** High-performance React Three Fiber 3D municipal grid visualization and smooth motion primitives without generic AI templates or unnecessary visual clutter.

---

## 🚀 Architecture Overview

```
CitizenCivic/
├── server/             # Node.js + Express + TypeScript Backend API
│   ├── src/
│   │   ├── auth/       # PBKDF2 Django-compatible hashing, SimpleJWT compatibility, RBAC
│   │   ├── db/         # Neon PostgreSQL connection pool & queries
│   │   ├── routes/     # Auth, Areas, Cases, Rewards, AI, Health routes
│   │   ├── services/   # Multi-tier Storage (S3/local), OpenAI service, Audit logger
│   │   └── types/      # Domain TypeScript interfaces
│   └── tests/          # Vitest & Supertest automated API tests
├── frontend/           # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/ # Custom UI primitives, CivicSphere3D, Timeline, ImageUpload
│   │   ├── contexts/   # AuthContext with token management
│   │   ├── pages/      # Landing, Login, Register, Dashboard, Report, CaseList, Detail, Rewards
│   │   └── api/        # Centralized Axios client
├── render.yaml         # Render Infrastructure-as-Code (Web Service + Static Site)
└── .env.example        # Environment variable template with safe placeholders
```

---

## 💻 Local Quickstart

### 1. Prerequisites
- Node.js 20+ (Node.js 22+ recommended)
- PostgreSQL database (or Neon Serverless PostgreSQL account)

### 2. Backend Setup (Node.js + Express + TypeScript)

```bash
cd server
npm install

# Build TypeScript to dist
npm run build

# Run automated test suite (23 integration tests against Neon DB)
npm test

# Start development server (runs on http://localhost:8000)
npm run dev
```

### 3. Frontend Setup (React 19 + Vite)

```bash
cd frontend
npm install

# Start Vite development server (runs on http://localhost:5173)
npm run dev
```

### 4. Root Convenience Commands

From the project root:
```bash
# Build both server and frontend
npm run build

# Run all backend integration tests
npm test
```

---

## 👥 Pre-seeded Pilot Accounts

All existing accounts in Neon PostgreSQL continue to work seamlessly with password verification:

| Role | Email | Password | Display Name |
|---|---|---|---|
| **Citizen** | `citizen@example.com` | `Citizen123!` | Rahul Sharma |
| **Moderator / Verifier** | `moderator@example.com` | `Moderator123!` | Priya Nair |
| **Operator** | `operator@example.com` | `Operator123!` | Suresh Kumar |
| **Supervisor** | `supervisor@example.com` | `Supervisor123!` | Anita Desai |
| **Admin** | `admin@example.com` | `Admin123!` | System Administrator |

*(Note: The Login screen includes 1-click test role buttons to instantly authenticate into any role during development and review).*

---

## ☁️ Render Production Deployment

CitizenCivic deploys via Render using **two decoupled services**:

### Service 1: Backend Dynamic Web Service
- **Runtime:** Node
- **Root Directory:** `server`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- **Environment Variables:**
  - `NODE_ENV`: `production`
  - `PORT`: `8000` (Render dynamically maps this to external port)
  - `DATABASE_URL`: `postgresql://username:password@ep-host.region.aws.neon.tech/neondb?sslmode=require`
  - `JWT_SECRET`: `<generate-a-strong-random-secret>`
  - `OPENAI_API_KEY`: `sk-proj-...`
  - `CORS_ALLOWED_ORIGINS`: `https://citizencivic-frontend.onrender.com,http://localhost:5173`
  - `MEDIA_STORAGE_BACKEND`: `local` (or `s3` when S3 credentials provided)

### Service 2: Frontend Static Site
- **Runtime:** Static
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Rewrite Rule:** `/*` &rarr; `/index.html` (Action: `Rewrite`)
- **Environment Variables:**
  - `VITE_API_BASE_URL`: `https://citizencivic-backend.onrender.com`

---

## 🛡️ License & Standards
Built with open-source MIT-licensed components. Adheres to municipal data privacy guidelines with hashed phone numbers and verifiable cryptographic audit trails.
