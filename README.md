# CitizenCivic — Real-World Civic Resolution Engine

CitizenCivic is a production-minded civic problem reporting, tracking, and independently verified resolution platform designed for local waste resolution and community accountability in India.

---

## 🌟 Core Innovations

1. **Independent Verified Resolution:** An operator's closure claim remains separate from verified resolution. Closing a case requires after-cleanup photographic proof, citizen satisfaction confirmation, or moderator audit.
2. **Citizen Dispute Rights:** If a case is prematurely closed while garbage remains on-ground, the reporting citizen can raise a formal dispute, triggering automatic escalation back into progress.
3. **Recurring Hotspot Protection:** Monitored locations are flagged as hotspots, scheduling automated 7-day and 30-day follow-up checks to prevent chronic dumping blackspots.
4. **Explicit State Machine:**
   `Draft → Submitted → Reviewed → Forwarded → Acknowledged → In Progress → Resolution Reported → Verification Pending → Verified Resolved`
   (Also supports `Disputed Closure`, `Rejected`, `Escalated`, `Duplicate`, and `Unable to Resolve`).
5. **Role-Based Access Control:** Separate portals and permissions for Citizen, Operator, Moderator, Supervisor, and Administrator.
6. **Bilingual Localization:** Full English and Hindi (`हिंदी`) language support.

---

## 🚀 Quickstart Guide

### 1. Backend Setup (Django REST Framework)

```bash
cd backend
source venv/bin/activate

# Apply migrations
python manage.py migrate

# Seed pilot demonstration data (categories, service areas, test accounts, cases)
python manage.py seed_data

# Run tests
python manage.py test

# Start API server (runs on http://localhost:8000)
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Setup (React + TypeScript + Vite + Tailwind CSS)

```bash
cd frontend

# Install dependencies (already completed)
npm install

# Build for production
npm run build

# Start dev server (runs on http://localhost:5173, proxies /api to port 8000)
npm run dev
```

---

## 👥 Pre-seeded Pilot Accounts

| Role | Email | Password | Display Name | Capabilities |
|---|---|---|---|---|
| **Citizen** | `citizen@example.com` | `Citizen123!` | Rahul Sharma | Report issues, track timeline, dispute closures, earn points |
| **Moderator** | `moderator@example.com` | `Moderator123!` | Priya Nair | Review reports, forward to partner unit, audit closures |
| **Operator** | `operator@example.com` | `Operator123!` | Suresh Kumar | Acknowledge cases, update progress, upload after-cleanup evidence |
| **Supervisor** | `supervisor@example.com` | `Supervisor123!` | Anita Desai | Monitor SLA, resolve disputes, review hotspot recurrences |
| **Admin** | `admin@example.com` | `Admin123!` | System Administrator | Full platform configuration and directory management |

*(Note: The Login screen includes 1-click role buttons to instantly test any of these profiles!)*

---

## 📊 Pilot Wards Configured

1. **Indiranagar Ward 82 (Bangalore):** CMH Road, 100ft Road, and residential avenues. Operating Unit: *Indiranagar Solid Waste Operations Unit*.
2. **Koramangala 4th Block (Bangalore):** 80ft Road and residential blocks. Operating Unit: *Koramangala Sanitation Wing*.

---

## 🛡️ Technology Stack

- **Backend:** Python 3.9, Django 4.2 LTS, Django REST Framework, SimpleJWT authentication, SQLite (development) / PostgreSQL (production ready)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, i18next (English & Hindi)
- **State Machine:** Server-enforced transition matrix with immutable `CaseTransition` and `AuditLog` records.
