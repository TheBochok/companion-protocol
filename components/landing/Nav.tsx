import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-slate-900/60 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.3)]">
            <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
          </div>
          <span className="text-[17px] font-bold text-white tracking-tight">Via</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="ml-2 text-sm bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl px-4 py-2 font-medium transition-all shadow-[0_0_16px_rgba(99,102,241,0.35)] hover:shadow-[0_0_24px_rgba(99,102,241,0.5)]"
          >
            Try for free
          </Link>
        </div>
      </div>
    </nav>
  )
}
