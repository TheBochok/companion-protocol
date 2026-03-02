import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const { message, email } = await req.json()
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Attach user_id if logged in, but feedback is allowed without auth too
  let userId: string | null = null
  try {
    const auth = createServerClient()
    const { data: { user } } = await auth.auth.getUser()
    if (user) userId = user.id
  } catch {}

  const { error } = await getDb()
    .from('general_feedback')
    .insert({
      user_id: userId ?? undefined,
      email: email?.trim() || null,
      message: message.trim(),
    })

  if (error) {
    console.error('[feedback] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
