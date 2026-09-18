import { supabaseAdmin } from './supabase'
import { queueIfLowStock, queueIfLowStockAtSite } from './chemical-orders'

// Record a dose and take it off stock. Quantity is in dose units (L/kg); stock is counted in
// containers (drum/bag), so convert via container_size (none = 1:1). Comes off the site's own
// stock when the site holds this chemical, otherwise off the depot. Used by the admin Log Usage
// form and by the technician water test ("chemicals added").
export async function logChemicalUsage(input: {
  pool_id: string
  chemical_id: string
  quantity: number
  applied_by: string
  applied_at?: string
  water_test_id?: string | null
  notes?: string | null
}) {
  const { data: usage, error } = await supabaseAdmin
    .from('chemical_usage_log')
    .insert({
      pool_id: input.pool_id,
      chemical_id: input.chemical_id,
      water_test_id: input.water_test_id ?? null,
      applied_by: input.applied_by,
      applied_at: input.applied_at ?? new Date().toISOString(),
      quantity: input.quantity,
      notes: input.notes ?? null,
    })
    .select('*, chemicals(name, unit, dose_unit), pools(name)')
    .single()
  if (error) throw new Error(error.message)

  const [{ data: chem }, { data: siteRow }] = await Promise.all([
    supabaseAdmin.from('chemicals').select('current_stock, container_size').eq('id', input.chemical_id).single(),
    supabaseAdmin.from('site_chemical_stock').select('id, quantity').match({ pool_id: input.pool_id, chemical_id: input.chemical_id }).maybeSingle(),
  ])
  const perContainer = Number(chem?.container_size) > 0 ? Number(chem!.container_size) : 1
  const used = Number(input.quantity) / perContainer
  const minus = (stock: number) => Math.max(0, Math.round((stock - used) * 100) / 100)
  if (siteRow) {
    await supabaseAdmin
      .from('site_chemical_stock')
      .update({ quantity: minus(Number(siteRow.quantity)), updated_at: new Date().toISOString() })
      .eq('id', siteRow.id)
    await queueIfLowStockAtSite(input.pool_id, input.chemical_id)
  } else if (chem && chem.current_stock !== null) {
    await supabaseAdmin
      .from('chemicals')
      .update({ current_stock: minus(Number(chem.current_stock)) })
      .eq('id', input.chemical_id)
    await queueIfLowStock(input.chemical_id)
  }
  return usage
}
