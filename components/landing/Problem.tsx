export default function Problem() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section label */}
        <p className="text-indigo-400 text-xs uppercase tracking-widest font-semibold mb-4">
          The Problem
        </p>
        <h2 className="text-4xl font-bold text-white tracking-tighter mb-12 leading-tight">
          Software is powerful.
          <br />
          <span className="text-slate-400">Learning it is broken.</span>
        </h2>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Large card — spans 2 columns */}
          <div className="md:col-span-2 relative bg-slate-800/20 border border-white/[0.06] rounded-2xl p-10 overflow-hidden">
            {/* Corner glow */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.07),transparent_60%)] pointer-events-none" />

            <div className="relative">
              {/* Big eyebrow number */}
              <span className="text-[80px] font-black text-white/[0.04] leading-none select-none absolute -top-4 -right-2">01</span>

              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center mb-7">
                <svg className="w-5 h-5 text-red-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-white tracking-tight mb-4 leading-snug">
                Video tutorials are broken.
              </h3>
              <p className="text-slate-400 text-base leading-relaxed max-w-sm">
                Watch, pause, switch tabs, forget, repeat. Every tutorial means leaving the thing
                you&apos;re trying to learn — and starting the whole frustrating cycle over.
              </p>
            </div>
          </div>

          {/* Right column — two stacked cards */}
          <div className="flex flex-col gap-4">

            {/* Card 2 */}
            <div className="relative bg-slate-800/20 border border-white/[0.06] rounded-2xl p-7 overflow-hidden flex-1">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_bottom_right,rgba(251,191,36,0.05),transparent_60%)] pointer-events-none" />
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/15 flex items-center justify-center mb-5">
                  <svg className="w-4 h-4 text-yellow-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-semibold text-white tracking-tight mb-2 leading-snug">
                  Text guides fail when the UI changes.
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Screenshots go stale. Docs go outdated. The button moves, and suddenly nobody can follow the guide.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="relative bg-slate-800/20 border border-white/[0.06] rounded-2xl p-7 overflow-hidden flex-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.06),transparent_60%)] pointer-events-none" />
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mb-5">
                  <svg className="w-4 h-4 text-indigo-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-semibold text-white tracking-tight mb-2 leading-snug">
                  Context-switching kills your flow.
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Every tab you open to find an answer is momentum you lose. The cost compounds all day.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
