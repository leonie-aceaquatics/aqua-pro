import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { visibleOrgIds, visiblePoolIds, canAccessPool } from '@/lib/org-scope'
import { hashSensorKey } from '@/lib/sensor-key'

export async function GET() {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('iot_sensors')
    .select('*, pools(name, site_code)')
    .in('pool_id', await visiblePoolIds(user))
    .order('installed_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sensors: data })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  // Generate a cryptographically random sensor key
  const sensorKey = randomBytes(32).toString('hex')

  const { data, error } = await supabaseAdmin
    .from('iot_sensors')
    .insert({
      pool_id: body.pool_id,
      sensor_key: hashSensorKey(sensorKey),
      device_type: body.device_type || null,
      manufacturer: body.manufacturer || null,
      serial_number: body.serial_number || null,
      installed_at: new Date().toISOString(),
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Return the raw key once — only its hash is stored, so this is the only time it's ever visible
  return NextResponse.json({ sensor: data, sensor_key: sensorKey })
}

export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const key of ['pool_id', 'device_type', 'manufacturer', 'serial_number', 'notes', 'is_active']) {
    if (key in rest) updates[key] = key === 'is_active' ? rest[key] : (rest[key] || null)
  }

  const { data, error } = await supabaseAdmin
    .from('iot_sensors')
    .update(updates)
    .eq('id', id)
    .select('*, pools(name, site_code)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sensor: data })
}
