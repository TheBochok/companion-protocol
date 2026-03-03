export default function Solution() {
  return (
    <section className="py-16 md:py-24 px-6 overflow-hidden" id="use-cases">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: Text ── */}
          <div>
            <p className="text-indigo-400 text-xs uppercase tracking-widest font-semibold mb-4">
              How Via Works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tighter mb-5 leading-tight">
              Real-time visual guidance.
              <br />
              <span className="text-slate-400">Zero integration required.</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-10">
              Via doesn&apos;t rely on brittle code, HTML selectors, or APIs. It uses advanced
              Vision AI to &ldquo;see&rdquo; your screen exactly like a human does. It instantly
              finds buttons, menus, and text fields — even if the website updates or changes
              languages.
            </p>

            {/* Feature list */}
            <div className="space-y-5">
              {[
                {
                  title: 'Works on any software',
                  body: 'Electron apps, web tools, desktop software — if you can see it, Via can guide it.',
                },
                {
                  title: 'No extensions or DOM access',
                  body: 'Via runs alongside your work, not inside it. Nothing injected, nothing intercepted.',
                },
                {
                  title: 'Always in context',
                  body: 'Instructions adapt to exactly what\'s on screen right now, not a static screenshot from last year.',
                },
              ].map((f, i) => (
                <div key={f.title} className="flex gap-4">
                  <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-md bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-[11px] font-bold font-mono">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-0.5 tracking-tight">{f.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Eye / Scan visual ── */}
          <div className="relative flex items-center justify-center">
            {/* Outer glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12),transparent_65%)]" />

            {/* Concentric ring animation */}
            <div className="relative w-72 h-72">
              {/* Rings */}
              {[280, 220, 160, 100].map((size, i) => (
                <div
                  key={size}
                  className="absolute inset-0 m-auto rounded-full border border-indigo-500/20"
                  style={{
                    width: size,
                    height: size,
                    opacity: 1 - i * 0.18,
                  }}
                />
              ))}

              {/* Center: eye icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                  <svg
                    className="w-9 h-9 text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.25}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                  </svg>
                </div>
              </div>

              {/* Scan line — sweeping indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-[280px] h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent"
                  style={{ transform: 'translateY(-20px)' }}
                />
              </div>

              {/* Small floating tags */}
              <div className="absolute top-6 right-2 bg-slate-900/80 border border-white/[0.08] rounded-lg px-2.5 py-1.5 shadow-sm">
                <span className="text-[10px] text-indigo-300 font-mono">match: 94%</span>
              </div>
              <div className="absolute bottom-10 left-0 bg-slate-900/80 border border-white/[0.08] rounded-lg px-2.5 py-1.5 shadow-sm">
                <span className="text-[10px] text-green-400 font-mono">● scanning</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
