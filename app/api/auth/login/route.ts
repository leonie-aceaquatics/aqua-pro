import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { setSessionCookie } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/password'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })

  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id, role, first_name, last_name, is_active, password_hash')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!staff || !staff.is_active) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const { valid, legacy } = await verifyPassword(password, staff.password_hash)
  if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  if (legacy) {
    // Transparently upgrade this account to bcrypt now that we know the plaintext.
    await supabaseAdmin.from('staff').update({ password_hash: await hashPassword(password) }).eq('id', staff.id)
  }

  await supabaseAdmin.from('staff').update({ last_login_at: new Date().toISOString() }).eq('id', staff.id)

  const redirect = staff.role === 'technician' ? '/technician'
    : staff.role === 'contractor' ? '/contractor'
    : staff.role === 'pool_manager' ? '/pool-manager'
    : '/admin'

  // Admins and managers can work in either the office dashboard or the technician app
  const res = NextResponse.json({ ok: true, redirect, role: staff.role, canChoose: ['admin', 'manager'].includes(staff.role) })
  res.headers.set('Set-Cookie', setSessionCookie(staff.id))
  return res
}
