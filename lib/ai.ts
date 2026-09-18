import Anthropic from '@anthropic-ai/sdk'
import type { WaterTestValues, PoolType, SanitiserType } from './water-chemistry'
import { calculateDoses, classifyRisk, getRanges } from './water-chemistry'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Staff feedback / bug triage ────────────────────────────────────────────
const FEEDBACK_AI_SYSTEM = `You are triaging a bug/feature/improvement report for AquaPro,
a Next.js 16 (App Router, TypeScript) pool maintenance management app.

Codebase facts you should use when diagnosing:
- Single Supabase Postgres DB, no ORM. lib/supabase.ts exports two clients:
  "supabase" (anon key, respects RLS) and "supabaseAdmin" (service role key, bypasses RLS —
  used by all API routes). Confusing the two, or an RLS policy blocking supabaseAdmin's
  own writes, is a common root cause.
- Auth is cookie-based (lib/auth.ts), no NextAuth. The "aquapro_session" cookie holds
  staffId.hmacSignature (HMAC-SHA256 with SESSION_SECRET) — getSession() verifies the
  signature before trusting the staffId, then looks up the staff row. Password hashing lives in
  lib/password.ts: bcrypt now, with a legacy SHA-256(password + SESSION_SECRET) fallback that
  transparently upgrades a row to bcrypt on next successful login.
- Roles: admin, manager, technician, contractor, pool_manager. Four portals: /admin (a
  12-tab single-page dashboard, app/admin/page.tsx — a large file, one function per tab e.g.
  PoolsTab, WaterTestingTab, ChecklistsTab, RiskTab, ChemicalsTab, ClosuresTab, RemoteSitesTab,
  FeedbackTab),
  /technician (mobile-first, shift list, water test logging, plant room log),
  /contractor (minimal, assigned jobs), /pool-manager (read-only water status + compliance).
- Key tables: pools, staff, water_tests, water_test_targets, assets, asset_categories, shifts,
  service_routes/route_pools, iot_sensors, compliance_requirements/compliance_events, incidents,
  shift_checklists, shift_sessions, chemicals/chemical_usage_log/chemical_orders, water_closures,
  notifications, plant_logs, staff_feedback.
- Water test risk (green/yellow/orange/red) is computed in lib/water-chemistry.ts
  (classifyRisk/getRanges/calculateDoses) — a red result should close the pool.
- Known past gotchas: a check-constraint mismatch between the frontend dropdown and the DB
  schema (e.g. an enum option allowed in one column's CHECK but not another's) has caused a
  500 on submit before — if a report describes a form that "won't save" or "errors on submit",
  suspect a CHECK constraint / enum mismatch first. Next.js 16 removed "next lint" from the
  build pipeline entirely, so ESLint errors never block "next build" or a Vercel deploy —
  don't assume a red ESLint count means the app is broken.
- Email (lib/email.ts) uses Nodemailer via Gmail SMTP. AI calls (this file) use the
  Anthropic SDK directly, no framework.

Respond with ONLY a JSON object, no markdown fences, no other text:
{"root_cause": "...", "workaround": "...", "fix_approach": "..."}
Keep each field to 1-3 sentences. If you can't tell from the info given, say what extra
info (e.g. exact steps, console error, which portal) would let a developer diagnose it fast.`

interface FeedbackDiagnosis {
  root_cause: string
  workaround: string
  fix_approach: string
}

export async function diagnoseFeedback(
  type: string,
  title: string,
  description: string,
  pageUrl: string | null
): Promise<FeedbackDiagnosis | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: FEEDBACK_AI_SYSTEM,
      messages: [{
        role: 'user',
        content: `Type: ${type}\nPage: ${pageUrl ?? 'not given'}\nTitle: ${title}\nDetails: ${description || 'none given'}`,
      }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    const parsed = JSON.parse(text.slice(start, end + 1))
    if (!parsed.root_cause || !parsed.workaround || !parsed.fix_approach) return null
    return parsed
  } catch {
    return null
  }
}

interface WaterAdviceInput {
  poolName: string
  poolType: PoolType
  sanitiserType: SanitiserType
  volumeLitres: number
  values: WaterTestValues
}

export async function getWaterAdvice(input: WaterAdviceInput): Promise<string> {
  const { poolName, poolType, sanitiserType, volumeLitres, values } = input
  const risk = classifyRisk(values, poolType, sanitiserType)
  const doses = calculateDoses(values, poolType, sanitiserType, volumeLitres)
  const ranges = getRanges(poolType, sanitiserType)

  // Build a concise summary of what's out of range
  const outOfRange = Object.entries(values)
    .filter(([key, val]) => {
      if (val === undefined || val === null) return false
      const r = ranges[key]
      if (!r) return false
      return (val as number) < r.min || (val as number) > r.max
    })
    .map(([key, val]) => {
      const r = ranges[key]
      return `${r.label}: ${val}${r.unit} (target: ${r.min}–${r.max}${r.unit})`
    })

  const systemPrompt = `You are an expert pool water chemist and aquatic facility compliance officer.
You explain water chemistry problems and remediation steps clearly to pool technicians,
some of whom may not have deep chemistry backgrounds.
Be practical, safe, and specific. Format your response clearly with sections.
Always mention safety precautions for chemical handling.
Refer to Australian standards (AS/NZS 1838, health department requirements) where relevant.`

  const userPrompt = `
Pool: ${poolName} (${poolType}, ${sanitiserType}, ${volumeLitres.toLocaleString()}L)
Risk Level: ${risk.riskLevel.toUpperCase()}

Current Water Readings:
${Object.entries(values)
  .filter(([, v]) => v !== undefined && v !== null)
  .map(([k, v]) => {
    const r = ranges[k]
    return r ? `  • ${r.label}: ${v} ${r.unit}` : `  • ${k}: ${v}`
  })
  .join('\n')}

Parameters Out of Range:
${outOfRange.length ? outOfRange.map(o => `  ⚠ ${o}`).join('\n') : '  ✓ All in range'}

Calculated Chemical Doses:
${doses.length ? doses.map(d => `  • ${d.parameter}: Add ${d.dose} of ${d.chemical}. ${d.notes ?? ''}`).join('\n') : '  None required'}

Please provide:
1. A plain-English explanation of what is wrong (if anything) and why it matters for swimmer safety
2. Step-by-step corrective actions in the right order (chemistry sequence matters)
3. Safety warnings for chemical handling
4. When to re-test and what to expect
5. Whether the pool should remain open or be closed during treatment
${risk.riskLevel === 'red' ? '\n⚠ CRITICAL: This pool may need immediate closure. Address this urgently.' : ''}
`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
