import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { visibleOrgIds } from '@/lib/org-scope'

// The organisations this user can file a record under: their own, plus any they service.
// Populates the Organisation dropdown when adding a site or a staff member.
export async function GET() {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('organisations')
    .select('id, name, slug, is_service_provider')
    .in('id', await visibleOrgIds(user))
    .eq('is_active', true)
    .order('is_service_provider', { ascending: false })
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ organisations: data })
}
