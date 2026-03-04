import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}/app`)
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
