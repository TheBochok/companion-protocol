const bullets = [
  {
    title: "Zero 'Bot Anxiety'",
    body: "Via guides your actions with visual overlays. It never takes over your mouse or clicks for you.",
  },
  {
    title: 'Secure by Design',
    body: "No DOM injections. We don't read your underlying code, intercept requests, or touch your data.",
  },
  {
    title: 'Privacy First',
    body: 'Visual processing happens purely in context. We only see what you ask us to see.',
  },
]

export default function Vision() {
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-[#060a13]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(99,102,241,0.06),transparent_60%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/15 to-transparent" />

      <div className="relative max-w-2xl mx-auto text-center">
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_32px_rgba(99,102,241,0.2)]">
          <svg
            className="w-7 h-7 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>

        <p className="text-indigo-400 text-xs uppercase tracking-widest font-semibold mb-4">
          Security & Privacy
        </p>
        <h2 className="text-4xl font-bold text-white tracking-tighter mb-10 leading-tight">
          Guides you.
          <br />
          <span className="text-slate-400">Never controls you.</span>
        </h2>

        {/* Bullets */}
        <div className="space-y-5 text-left">
          {bullets.map((b) => (
            <div
              key={b.title}
              className="flex gap-4 bg-slate-800/20 border border-white/[0.05] rounded-xl px-6 py-5"
            >
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="w-4 h-4 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm mb-0.5 tracking-tight">{b.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
