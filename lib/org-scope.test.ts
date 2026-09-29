import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// The fence only holds if every route that can reach more than one organisation's data goes
// through lib/org-scope. This walks the API routes and fails if one touches a scoped table
// without using a scope helper, so a new endpoint cannot quietly skip it.
//
// If a route legitimately does not need scoping, add it to ALLOWED with the reason.

const API_DIR = join(process.cwd(), 'app/api')

/** Tables that hold more than one organisation's data. */
const SCOPED_TABLES = [
  'pools', 'staff', 'chemicals', 'service_routes', 'site_tasks', 'compliance_requirements',
  'water_tests', 'microbiology_tests', 'plant_logs', 'shifts', 'site_task_completions',
  'site_chemical_stock', 'chemical_usage_log', 'incidents', 'water_closures', 'assets',
  'attachments', 'corrective_actions', 'risk_register_entries', 'pool_contacts', 'iot_sensors',
]

const SCOPE_HELPERS = [
  'visibleOrgIds', 'visiblePoolIds', 'canAccessPool', 'canAccessStaff', 'canAccessEntity',
  'orgForNewRecord',
]

const ALLOWED: Record<string, string> = {
  'auth/login/route.ts': 'looks a user up by email before any session exists',
  'auth/me/route.ts': 'returns only the caller’s own session',
  'auth/logout/route.ts': 'no data access',
  'auth/change-password/route.ts': 'scoped to the caller’s own id',
  'technician/today/route.ts': 'filtered to the caller’s own staff_id',
  'technician/week/route.ts': 'filtered to the caller’s own staff_id',
  'technician/shift/route.ts': 'creates a shift for the caller; pool checked on the task routes',
  'technician/shift/[id]/route.ts': 'update restricted to the caller’s own staff_id',
  'technician/checklist/route.ts': 'lifeguard checklist, hidden feature, no client access',
  'pool-manager/my-pool/route.ts': 'filtered to pools where the caller is the named manager',
  'admin/reporting/route.ts': 'aggregate counts for the office overview',
  'admin/attachments/upload/route.ts': 'issues an upload token only; the row insert is checked',
  'feedback/route.ts': 'bug reports about the app itself',
  'feedback/[id]/route.ts': 'bug reports about the app itself',
  'feedback/upload/route.ts': 'bug report screenshot upload',
  'cron/compliance-check/route.ts': 'scheduled job, runs across all orgs by design',
  'cron/maintenance-reminders/route.ts': 'scheduled job, runs across all orgs by design',
  'iot/ingest/route.ts': 'authenticated by a per-sensor key, not a user session',
}

function routeFiles(dir: string, base = ''): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    const rel = base ? `${base}/${entry}` : entry
    if (statSync(full).isDirectory()) return routeFiles(full, rel)
    return entry === 'route.ts' ? [rel] : []
  })
}

describe('organisation scoping', () => {
  const files = routeFiles(API_DIR)

  it('finds the API routes', () => {
    expect(files.length).toBeGreaterThan(30)
  })

  it('every route touching shared data uses a scope helper', () => {
    const unscoped: string[] = []

    for (const rel of files) {
      if (rel in ALLOWED) continue
      const src = readFileSync(join(API_DIR, rel), 'utf8')
      const touchesScoped = SCOPED_TABLES.some(t => src.includes(`from('${t}')`))
      if (!touchesScoped) continue
      if (SCOPE_HELPERS.some(h => src.includes(h))) continue
      unscoped.push(rel)
    }

    expect(unscoped, `these routes read shared tables without scoping them to the caller's organisation:\n  ${unscoped.join('\n  ')}\n\nUse a helper from lib/org-scope, or add the route to ALLOWED in this test with the reason.`).toEqual([])
  })

  it('allowlisted routes still exist, so the list cannot rot', () => {
    const missing = Object.keys(ALLOWED).filter(f => !files.includes(f))
    expect(missing, `ALLOWED names routes that no longer exist: ${missing.join(', ')}`).toEqual([])
  })
})
