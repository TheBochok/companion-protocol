const personalFeatures = [
  'Works with any desktop software',
  'Community workflow library',
  'Local processing — fully private',
  'Free tier available',
]

const enterpriseFeatures = [
  'White-label deployment',
  'Video ingestion workflow builder',
  'Analytics & completion tracking',
  'Dedicated onboarding support',
]

function Check() {
  return (
    <svg
      className="w-4 h-4 text-indigo-400 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function TwoWorlds() {
  return (
    <section className="py-16 md:py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Built for two worlds.
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
            Whether you&apos;re a power user or an enterprise deploying to thousands, Via fits.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* B2C — cool-blue aura */}
          <div className="relative bg-slate-800/25 backdrop-blur-xl border border-white/[0.07] rounded-2xl p-6 md:p-10 overflow-hidden">
            {/* Aura */}
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.08),transparent_60%)] pointer-events-none" />

            <div className="relative">
              <span className="inline-block text-[11px] font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-full px-3 py-1 mb-6">
                Personal
              </span>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-4">
                Via Co-Pilot
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                For individuals who want to move faster in the tools they already use. Create
                personal workflows, follow community guides, and get unstuck without leaving
                your flow.
              </p>
              <ul className="space-y-3">
                {personalFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* B2B — indigo aura */}
          <div className="relative bg-slate-800/25 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6 md:p-10 overflow-hidden">
            {/* Aura */}
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.10),transparent_60%)] pointer-events-none" />
            {/* Subtle glow ring */}
            <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_40px_rgba(99,102,241,0.05)] pointer-events-none" />

            <div className="relative">
              <span className="inline-block text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 mb-6">
                Enterprise
              </span>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-4">
                Via Integration Assistant
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                For software vendors who want to reduce integration drop-off. Embed Via
                guidance into your product, guide customers through complex setups, and
                eliminate support tickets.
              </p>
              <ul className="space-y-3">
                {enterpriseFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
