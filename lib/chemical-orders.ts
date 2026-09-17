import { supabaseAdmin } from './supabase'

// Queue a chemical on the To Order list if it has dropped to/below its reorder point —
// unless it's already pending or ordered there — so this is safe to call after every
// stock change (usage logging, manual update, stock take, edit).

async function alreadyQueued(chemicalId: string, poolId: string | null) {
  let q = supabaseAdmin
    .from('chemical_orders')
    .select('id')
    .eq('chemical_id', chemicalId)
    .in('status', ['pending', 'ordered'])
    .limit(1)
  q = poolId ? q.eq('pool_id', poolId) : q.is('pool_id', null)
  const { data } = await q
  return !!(data && data.length > 0)
}

// Depot / central stock (chemicals.current_stock)
export async function queueIfLowStock(chemicalId: string) {
  const { data: chemical } = await supabaseAdmin
    .from('chemicals')
    .select('current_stock, reorder_point')
    .eq('id', chemicalId)
    .single()

  if (!chemical || !chemical.reorder_point || Number(chemical.current_stock) > Number(chemical.reorder_point)) return
  if (await alreadyQueued(chemicalId, null)) return
  await supabaseAdmin.from('chemical_orders').insert({ chemical_id: chemicalId, status: 'pending' })
}

// Stock held at one site (site_chemical_stock). The chemical's reorder point applies per site.
export async function queueIfLowStockAtSite(poolId: string, chemicalId: string) {
  const [{ data: row }, { data: chemical }] = await Promise.all([
    supabaseAdmin.from('site_chemical_stock').select('quantity').match({ pool_id: poolId, chemical_id: chemicalId }).maybeSingle(),
    supabaseAdmin.from('chemicals').select('reorder_point').eq('id', chemicalId).single(),
  ])
  if (!row || !chemical || !chemical.reorder_point || Number(row.quantity) > Number(chemical.reorder_point)) return
  if (await alreadyQueued(chemicalId, poolId)) return
  await supabaseAdmin.from('chemical_orders').insert({ chemical_id: chemicalId, pool_id: poolId, status: 'pending' })
}
