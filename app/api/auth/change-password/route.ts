import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/password'

// Staff change their own password (any role). Admin resets for other people stay in /api/admin/staff.
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { current_password, new_password } = await req.json()
  if (!current_password || !new_password) return NextResponse.json({ error: 'Current and new password required' }, { status: 400 })
  if (String(new_password).length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })

  const { data: staff } = await supabaseAdmin.from('staff').select('password_hash').eq('id', user.id).single()
  if (!staff) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const { valid } = await verifyPassword(current_password, staff.password_hash)
  if (!valid) return NextResponse.json({ error: 'Current password is wrong' }, { status: 401 })

  const { error } = await supabaseAdmin.from('staff').update({ password_hash: await hashPassword(new_password) }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
