export default function HowItWorks() {
  return (
    <section className="py-16 md:py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-indigo-400 text-xs uppercase tracking-widest font-semibold mb-4">
            Why Use Via
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tighter mb-4 leading-tight">
            Stop answering{' '}
            <span className="text-slate-400">&ldquo;How do I do this?&rdquo;</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Whether you&apos;re helping yourself, or helping your team.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">

          {/* Card 1 — For Teams */}
          <div className="relative bg-slate-800/20 border border-white/[0.06] rounded-2xl p-6 md:p-10 overflow-hidden">
            {/* Aura */}
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.07),transparent_60%)] pointer-events-none" />

            <div className="relative">
              <span className="inline-block text-[11px] font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-full px-3 py-1 mb-7">
                For Teams
              </span>

              <h3 className="text-2xl font-bold text-white tracking-tight mb-4 leading-snug">
                Onboard & Support.
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm">
                Record yourself doing a task once. Via instantly turns it into an interactive,
                step-by-step overlay for your team or customers. No more Zoom calls.
              </p>

              {/* Mini visual — record → guide flow */}
              <div className="flex items-center gap-3 bg-slate-900/50 border border-white/[0.05] rounded-xl p-4">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-indigo-500/50" />
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div className="text-[11px] text-slate-500 ml-1">Record once → Guide forever</div>
              </div>
            </div>
          </div>

          {/* Card 2 — For Individuals */}
          <div className="relative bg-slate-800/20 border border-indigo-500/15 rounded-2xl p-6 md:p-10 overflow-hidden">
            {/* Aura */}
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.09),transparent_60%)] pointer-events-none" />

            <div className="relative">
              <span className="inline-block text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-7">
                For Individuals
              </span>

              <h3 className="text-2xl font-bold text-white tracking-tight mb-4 leading-snug">
                The Universal Co-Pilot.
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm">
                Ask Via how to do anything in any app. It maps the interface and guides you to the
                exact right clicks. Get unstuck instantly.
              </p>

              {/* Mini visual — any app logos placeholder */}
              <div className="flex items-center flex-wrap gap-2">
                {['Figma', 'AWS', 'Jira', 'Notion', '+ more'].map((label, i) => (
                  <div
                    key={label}
                    className="bg-slate-800/60 border border-white/[0.06] rounded-lg px-3 py-1.5 text-[10px] text-slate-400 font-medium"
                    style={{ opacity: 1 - i * 0.12 }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
