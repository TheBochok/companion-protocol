import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Service role client — used only server-side, bypasses PostgREST restrictions.
// The table has all Data API access revoked, so this is the only way to reach it.
function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const auth = createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId, goal, instruction, bbox, screenshot } = await req.json()

  const { data, error } = await getDb()
    .from('guidance_events')
    .insert({
      user_id: user.id,
      session_id: sessionId,
      goal,
      instruction,
      bbox: bbox ?? null,
      screenshot: screenshot ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[analytics] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

export async function PATCH(req: NextRequest) {
  const auth = createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId, acted } = await req.json()

  const { error } = await getDb()
    .from('guidance_events')
    .update({ acted })
    .eq('id', eventId)
    .eq('user_id', user.id)  // still scope to the requesting user

  if (error) {
    console.error('[analytics] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
