import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { hashPassword } from '@/lib/password'
import { sendWelcomeEmail } from '@/lib/email'
import { visibleOrgIds, canAccessStaff, orgForNewRecord } from '@/lib/org-scope'
import { isClientRole } from '@/lib/auth'

export async function GET() {
  const user = await getSession()
  if (!user || !['admin', 'manager', 'client_admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // A client admin sees only their own people; Ace sees its own plus the orgs it services.
  const orgs = user.role === 'client_admin' ? [user.orgId] : await visibleOrgIds(user)
  const { data, error } = await supabaseAdmin
    .from('staff')
    .select('id, email, first_name, last_name, role, phone, is_active, created_at, last_login_at, org_id')
    .in('org_id', orgs)
    .order('last_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'client_admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const orgId = await orgForNewRecord(user, body.org_id)
  if (!orgId) return NextResponse.json({ error: 'Unknown organisation' }, { status: 403 })

  // A client admin can only create people inside their own org, and only client roles —
  // otherwise they could mint themselves an Ace admin login.
  if (user.role === 'client_admin' && (orgId !== user.orgId || !isClientRole(body.role))) {
    return NextResponse.json({ error: 'You can only add staff to your own organisation' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('staff')
    .insert({
      org_id: orgId,
      email: body.email.toLowerCase().trim(),
      password_hash: await hashPassword(body.password),
      first_name: body.first_name,
      last_name: body.last_name,
      role: body.role,
      phone: body.phone || null,
    })
    .select('id, email, first_name, last_name, role')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Welcome email with their login — on by default, admin can untick it in the form.
  // Sent before responding so the admin sees whether it actually went.
  let email_sent: boolean | null = null
  let email_error: string | null = null
  if (body.send_email !== false) {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login`
    try {
      await sendWelcomeEmail(data.first_name, data.email, body.password, loginUrl, data.role)
      email_sent = true
    } catch (e: any) {
      console.error('Welcome email failed:', e)
      email_sent = false
      email_error = e?.message ?? String(e)
    }
  }
  return NextResponse.json({ staff: data, email_sent, email_error })
}

export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'client_admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, send_email, ...updates } = body
  if (!(await canAccessStaff(user, id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // A client admin cannot promote anyone out of the client roles.
  if (user.role === 'client_admin' && updates.role && !isClientRole(updates.role)) {
    return NextResponse.json({ error: 'You can only set client roles' }, { status: 403 })
  }
  delete updates.org_id   // nobody moves a person between organisations through this endpoint
  const newPassword: string | undefined = updates.password || undefined
  if (updates.password) {
    updates.password_hash = await hashPassword(updates.password)
    delete updates.password
  }

  const { data, error } = await supabaseAdmin
    .from('staff')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Re-send login details when a password is set and the admin asked for it
  let email_sent: boolean | null = null
  let email_error: string | null = null
  if (newPassword && send_email) {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login`
    try {
      await sendWelcomeEmail(data.first_name, data.email, newPassword, loginUrl, data.role)
      email_sent = true
    } catch (e: any) {
      console.error('Login email failed:', e)
      email_sent = false
      email_error = e?.message ?? String(e)
    }
  }
  return NextResponse.json({ staff: data, email_sent, email_error })
}
