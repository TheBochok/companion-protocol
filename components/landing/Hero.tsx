import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative pt-20 pb-12 px-6 overflow-hidden" id="product">
      {/* Subtle top-left glow — asymmetric */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.09),transparent_65%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Left: Text ── */}
          <div>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3.5 py-1 mb-7">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.9)]" />
              <span className="text-indigo-300 text-[11px] font-semibold uppercase tracking-widest">
                GPS for Software
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-5xl sm:text-6xl lg:text-[64px] font-bold text-white leading-[1.06] tracking-tighter mb-5">
              The guide that
              <br />
              lives on your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-100">
                screen.
              </span>
            </h1>

            {/* Subhead */}
            <p className="text-slate-400 text-lg leading-relaxed mb-9 max-w-md">
              Via watches your screen and delivers real-time, context-aware guidance —
              exactly when you need it, without switching windows.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <Link
                href="/signup"
                className="bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl px-7 py-3 text-sm font-semibold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_32px_rgba(99,102,241,0.6)]"
              >
                Get Early Access
              </Link>
              <Link
                href="/signup"
                className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 text-white rounded-xl px-7 py-3 text-sm font-semibold transition-all"
              >
                For Teams →
              </Link>
            </div>

            <p className="text-slate-600 text-xs mt-4">No extensions. No integrations. No setup.</p>
          </div>

          {/* ── Right: Browser Mockup ── */}
          <div className="relative">
            {/* Glow behind */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.10),transparent_70%)] blur-2xl" />

            {/* Mac browser chrome */}
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]">
              {/* Title bar */}
              <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1f2e] border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-slate-800/60 rounded-md px-4 py-1 flex items-center gap-2 min-w-0 max-w-xs w-full">
                    <svg className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04.054-.09A13.916 13.916 0 0 0 8 11a4 4 0 1 1 8 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0 0 15.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 0 0 8 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                    <span className="text-[11px] text-slate-500 font-mono truncate">console.aws.amazon.com/iam</span>
                  </div>
                </div>
              </div>

              {/* Dense "AWS console" page content */}
              <div className="relative bg-[#0d1117] overflow-hidden" style={{ aspectRatio: '16/10' }}>

                {/* Console header */}
                <div className="px-5 pt-4 pb-3 border-b border-white/[0.05] bg-[#161b22]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-24 rounded bg-slate-700/60" />
                      <div className="text-slate-600 text-xs">/</div>
                      <div className="h-4 w-16 rounded bg-slate-700/40" />
                    </div>
                    {/* Search bar — the target of Via's highlight */}
                    <div className="relative">
                      <div className="flex items-center gap-2 bg-slate-800/80 border border-white/[0.08] rounded-md px-3 py-1.5 w-44">
                        <svg className="w-3 h-3 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                        <span className="text-slate-600 text-[11px] font-mono">Search services…</span>
                      </div>
                      {/* Glowing indigo highlight ring on search bar */}
                      <div className="absolute inset-0 rounded-md border border-indigo-500/80 shadow-[0_0_14px_rgba(99,102,241,0.6),inset_0_0_6px_rgba(99,102,241,0.1)] pointer-events-none animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Table / data area — blurred to look dense */}
                <div className="px-5 py-4 space-y-2" style={{ filter: 'blur(0.4px)' }}>
                  {/* Table header */}
                  <div className="grid grid-cols-4 gap-4 pb-2 border-b border-white/[0.04]">
                    {['Name', 'Type', 'Status', 'Last Activity'].map((h) => (
                      <div key={h} className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">{h}</div>
                    ))}
                  </div>
                  {/* Table rows */}
                  {[
                    ['AdministratorAccess', 'AWS managed', 'Active', '2h ago'],
                    ['ReadOnlyAccess', 'AWS managed', 'Active', '5d ago'],
                    ['PowerUserAccess', 'AWS managed', 'Inactive', '12d ago'],
                    ['S3FullAccess', 'Customer managed', 'Active', '1h ago'],
                    ['LambdaInvoker', 'Customer managed', 'Active', '23m ago'],
                    ['DynamoDBReader', 'Customer managed', 'Active', '3d ago'],
                  ].map(([name, type, status, last], i) => (
                    <div key={i} className="grid grid-cols-4 gap-4 py-1.5 border-b border-white/[0.03]">
                      <div className="text-[10px] text-indigo-400/70 font-mono truncate">{name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{type}</div>
                      <div className={`text-[10px] ${status === 'Active' ? 'text-green-500/60' : 'text-slate-600'}`}>{status}</div>
                      <div className="text-[10px] text-slate-600">{last}</div>
                    </div>
                  ))}
                </div>

                {/* Via floating glass card */}
                <div className="absolute bottom-4 right-4 w-56 bg-slate-900/90 backdrop-blur-xl border border-white/[0.12] rounded-xl shadow-[0_0_0_1px_rgba(99,102,241,0.2),0_8px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(99,102,241,0.15)] overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.07] bg-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-sm bg-indigo-400" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-300 tracking-tight">Via</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]" />
                      <span className="text-[9px] text-green-400">Live</span>
                    </div>
                  </div>
                  {/* Instruction */}
                  <div className="px-3 py-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1.5">Next step</div>
                    <p className="text-[12px] text-white font-medium leading-snug">
                      Type &ldquo;AI&rdquo; in the search box
                    </p>
                    <div className="mt-3 flex gap-1">
                      <div className="h-0.5 flex-1 rounded-full bg-indigo-500" />
                      <div className="h-0.5 flex-1 rounded-full bg-slate-700" />
                      <div className="h-0.5 flex-1 rounded-full bg-slate-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
