# AquaPro — Pool Maintenance Management System

A full-stack web application for managing commercial pool maintenance operations. Built as a Buffer Zone Software alternative.

## Tech Stack

- **Framework**: Next.js 16 (App Router) · React 19 · TypeScript 5
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS 4 + inline styles · dark navy theme
- **AI**: Anthropic Claude Sonnet (water chemistry advice)
- **Email**: Nodemailer via Gmail SMTP
- **Icons**: Lucide React · Charts: Recharts

---

## Setup & Deploy

### 1. Database

Create a new Supabase project, then run these SQL files in order via the Supabase SQL editor:

```
supabase-schema.sql                    ← core schema + seeded categories & water test targets
add-checklists-migration.sql           ← shift checklists + sessions tables
add-plant-logs-migration.sql           ← plant room log
add-staff-feedback-migration.sql       ← Error Log / staff feedback system
add-chemical-orders-migration.sql      ← chemical stock take + reorder queue
add-staff-last-login-migration.sql     ← staff.last_login_at tracking
add-chemical-dose-units-migration.sql  ← chemicals.dose_unit + container_size (count stock in drums, log doses in litres)
add-site-tasks-migration.sql           ← simple per-site visit task list (admin defines, technicians tick off daily)
add-site-tasks-seed.sql                ← site_tasks.category + the standard 36-item per-visit list for all sites
add-site-stock-migration.sql           ← per-site chemical stock (site_chemical_stock), chemical_orders.pool_id, stock-count site task
```

After running each migration, run `NOTIFY pgrst, 'reload schema';` in the SQL editor so PostgREST picks up the new tables/columns immediately instead of erroring on the next request.

### 2. Environment Variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Email (Gmail App Password — not your regular password)
EMAIL_USER=your@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Auth
SESSION_SECRET=any-long-random-string-32-chars-min

# Cron protection
CRON_SECRET=any-long-random-string

# App URL (used in email links)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Twilio (SMS — wired but optional; leave blank if not using SMS yet)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

### 3. Seed First Admin User

Run this in Supabase SQL editor (replace values):

```sql
insert into staff (email, password_hash, first_name, last_name, role)
values (
  'admin@yourcompany.com',
  -- bcrypt hash of your chosen password — generate at https://bcrypt-generator.com (rounds: 10)
  '$2b$10$...',
  'Admin',
  'User',
  'admin'
);
```

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add all `.env.local` variables as Vercel Environment Variables in your project settings.

### 5. Schedule Daily Crons

In Vercel → Settings → Cron Jobs, or via any cron service:

```
GET https://your-domain.vercel.app/api/cron/compliance-check
Authorization: Bearer <CRON_SECRET>
Schedule: 0 8 * * *   (8am daily)

GET https://your-domain.vercel.app/api/cron/maintenance-reminders
Authorization: Bearer <CRON_SECRET>
Schedule: 0 7 * * *   (7am daily)
```

---

## Portals

| URL | Role | Access |
|-----|------|--------|
| `/login` | All | Login page |
| `/admin` | admin, manager | Full dashboard — 12 tabs |
| `/technician` | technician | Today's jobs, water testing, checklists |
| `/pool-manager` | pool_manager | Read-only water status + compliance |
| `/contractor` | contractor | Assigned jobs + sign-off |
| `/sales` | Public | Sales pitch PDF (⌘P → Save as PDF) |

---

## Admin Dashboard Tabs

| Tab | What it does |
|-----|-------------|
| Overview | KPI tiles + recent water tests |
| Pools | Pool register CRUD |
| Water Testing | Log tests, AI chemistry advice, view history |
| Staff & Shifts | Shifts · Staff (incl. last login) · Service Routes · Unavailability |
| Checklists | Review submitted shift checklists, flag drill-down |
| Asset Register | Equipment CRUD + service log history |
| Compliance | Events calendar · Requirements library |
| Chemicals | Inventory · Usage log · Stock Take · To Order queue |
| Pool Closures | Close/reopen pools, closure history |
| Risk | Pool risk status, incident reporting (open + resolve) |
| Remote Sites | Register/edit/deactivate IoT sensors, view ingest endpoint |
| Error Log | Staff-submitted bug/feature reports with AI-assisted triage |

---

## IoT Sensor Integration

Any device that can POST JSON to a URL can send readings automatically.

**Endpoint:** `POST /api/iot/ingest`

**Payload:**
```json
{
  "sensor_key": "your-64-char-hex-key",
  "free_chlorine": 2.1,
  "ph": 7.4,
  "temperature_c": 28.5,
  "total_alkalinity": 95,
  "salt_level": 3000
}
```

Register sensors in Admin → Remote Sites. The sensor key is shown **once** on registration — copy it immediately.

---

## Roles & Permissions

| Role | Can do |
|------|--------|
| `admin` | Everything |
| `manager` | Everything except staff password management |
| `technician` | View/complete shifts, log water tests, submit checklists |
| `contractor` | View assigned shifts, mark complete |
| `pool_manager` | Read-only pool status + compliance calendar |

---

## Development

```bash
npm install
npm run dev        # starts on http://localhost:3000
```

The technician portal uses port 3000 by default. To match the sales page reference to port 3004, set `PORT=3004` or adjust as needed.

---

## Handoff Checklist

- [ ] Supabase project created and all 6 SQL files run, in order, `NOTIFY pgrst, 'reload schema';` run after
- [ ] `.env.local` values filled and added to Vercel (note: `EMAIL_USER`/`EMAIL_PASS`, not `GMAIL_USER`/`GMAIL_APP_PASSWORD`)
- [ ] First admin user seeded via SQL (bcrypt hash, not the legacy SHA-256 scheme — see Auth section below)
- [ ] Deployed to Vercel **via git push**, not a bare `vercel --prod` from an uncommitted working tree — confirm `git status` is clean before every deploy
- [ ] `vercel.json` cron config present and Vercel Cron Jobs showing as active in the project dashboard
- [ ] Client staff added via Admin → Staff & Shifts → Staff
- [ ] Pools added via Admin → Pools
- [ ] Compliance requirements set up via Admin → Compliance → Requirements
- [ ] Chemicals added via Admin → Chemicals
- [ ] IoT sensors registered if applicable (Admin → Remote Sites)
- [ ] Sales PDF generated from `/sales` (if needed)
- [ ] Confirm RLS is enabled on every table in the Supabase dashboard (Database → Tables → each table's RLS toggle) before any real client data goes in

## Auth Notes

- Passwords are hashed with bcrypt (12 rounds). A handful of very early accounts may still carry
  a legacy SHA-256 hash — `verifyPassword()` in `lib/password.ts` detects and transparently
  upgrades these to bcrypt the next time that user logs in. No forced reset needed.
- The session cookie (`aquapro_session`) is HMAC-signed using `SESSION_SECRET` — treat that value
  as sensitive as a password. Rotating it invalidates every active session (forces re-login for
  all staff), which is the correct way to kill all sessions at once if ever needed.
