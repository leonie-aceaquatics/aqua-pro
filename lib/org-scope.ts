import { cache } from 'react'
import { supabaseAdmin } from './supabase'
import type { SessionUser } from './auth'

// The fence. Every query that can reach more than one organisation's data goes through here.
//
// Only six tables carry an org_id (pools, staff, chemicals, service_routes, site_tasks,
// compliance_requirements). Everything else hangs off a pool, so `visiblePoolIds` is the anchor
// for water tests, plant logs, shifts, stock, incidents, attachments and the rest.
//
// Results are memoised per request by React's cache(), so a route can call these freely.

/** The orgs this user may see: their own, plus any they service. */
export const visibleOrgIds = cache(async (user: SessionUser): Promise<string[]> => {
  if (!user.isServiceProvider) return [user.orgId]
  const { data } = await supabaseAdmin
    .from('provider_clients')
    .select('client_org_id')
    .eq('provider_org_id', user.orgId)
  return [user.orgId, ...(data ?? []).map(r => r.client_org_id)]
})

/** Pool ids this user may see. The anchor for every child table. */
export const visiblePoolIds = cache(async (user: SessionUser): Promise<string[]> => {
  const orgs = await visibleOrgIds(user)
  const { data } = await supabaseAdmin.from('pools').select('id').in('org_id', orgs)
  return (data ?? []).map(p => p.id)
})

/** True if this user may touch this pool. Use before any write keyed on a pool_id. */
export async function canAccessPool(user: SessionUser, poolId: string | null | undefined): Promise<boolean> {
  if (!poolId) return false
  const pools = await visiblePoolIds(user)
  return pools.includes(poolId)
}

/** True if this user may touch this staff member (same org, or an org they service). */
export async function canAccessStaff(user: SessionUser, staffId: string | null | undefined): Promise<boolean> {
  if (!staffId) return false
  if (staffId === user.id) return true
  const orgs = await visibleOrgIds(user)
  const { data } = await supabaseAdmin.from('staff').select('org_id').eq('id', staffId).single()
  return !!data && orgs.includes(data.org_id)
}

/**
 * The org a new record should belong to. A provider creating a record for a client passes the
 * client's org explicitly; anyone else can only create inside their own org.
 */
export async function orgForNewRecord(user: SessionUser, requestedOrgId?: string | null): Promise<string | null> {
  if (!requestedOrgId || requestedOrgId === user.orgId) return user.orgId
  const orgs = await visibleOrgIds(user)
  return orgs.includes(requestedOrgId) ? requestedOrgId : null
}

/**
 * Attachments are polymorphic — entity_type + entity_id — so there is no org_id to filter on.
 * Each type is resolved back to the pool it belongs to, and that pool is checked.
 * An unknown type is refused rather than allowed: a new attachment type must be added here
 * deliberately, not inherit access by being forgotten.
 */
const ENTITY_POOL_LOOKUP: Record<string, { table: string; column?: string }> = {
  water_test:           { table: 'water_tests' },
  plant_log:            { table: 'plant_logs' },
  site_task_completion: { table: 'site_task_completions' },
  incident:             { table: 'incidents' },
  microbiology_test:    { table: 'microbiology_tests' },
  corrective_action:    { table: 'corrective_actions' },
  pool_access:          { table: 'pools', column: 'id' },
}

export async function canAccessEntity(user: SessionUser, entityType: string, entityId: string): Promise<boolean> {
  if (!entityType || !entityId) return false

  // The service log hangs off an asset, which hangs off a pool.
  if (entityType === 'asset_service_log') {
    const { data } = await supabaseAdmin
      .from('asset_service_log').select('assets(pool_id)').eq('id', entityId).single()
    const asset = data?.assets as { pool_id?: string } | { pool_id?: string }[] | undefined
    const poolId = Array.isArray(asset) ? asset[0]?.pool_id : asset?.pool_id
    return canAccessPool(user, poolId)
  }

  const lookup = ENTITY_POOL_LOOKUP[entityType]
  if (!lookup) return false

  if (lookup.column === 'id') return canAccessPool(user, entityId)

  const { data } = await supabaseAdmin.from(lookup.table).select('pool_id').eq('id', entityId).single()
  return canAccessPool(user, data?.pool_id)
}
