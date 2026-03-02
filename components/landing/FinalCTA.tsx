'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FinalCTA() {
  const [email, setEmail] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = email ? `?email=${encodeURIComponent(email)}` : ''
    router.push(`/signup${params}`)
  }

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.12)_0%,transparent_65%)]" />
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

      <div className="relative max-w-2xl mx-auto text-center">
        <h2 className="text-5xl font-bold text-white tracking-tighter mb-4 leading-tight">
          End the
          <br />
          Alt-Tab Hell.
        </h2>
        <p className="text-slate-400 text-base mb-12">
          Join the early access list. Be the first to create and share Via workflows.
        </p>

        {/* Command-line style input */}
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3.5 shadow-[0_0_40px_rgba(0,0,0,0.4)] focus-within:border-indigo-500/40 focus-within:shadow-[0_0_40px_rgba(99,102,241,0.1)] transition-all">
            <span className="text-indigo-400 font-mono text-sm select-none">$</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-transparent text-white text-sm font-mono placeholder:text-slate-600 outline-none"
            />
            <button
              type="submit"
              className="flex-shrink-0 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-all shadow-[0_0_16px_rgba(99,102,241,0.35)] hover:shadow-[0_0_24px_rgba(99,102,241,0.5)] whitespace-nowrap"
            >
              Get Early Access
            </button>
          </div>
        </form>

        <p className="text-slate-600 text-xs mt-5">
          No spam. No credit card. Cancel anytime.
        </p>

        {/* Footer */}
        <div className="mt-24 pt-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-sm bg-indigo-400" />
            </div>
            <span className="text-sm font-bold text-slate-400 tracking-tight">Via</span>
          </div>
          <p className="text-slate-600 text-xs">
            © 2025 Via. GPS for Software.
          </p>
          <div className="flex gap-4 text-xs text-slate-600">
            <a href="/login" className="hover:text-slate-400 transition-colors">Sign In</a>
            <a href="/signup" className="hover:text-slate-400 transition-colors">Sign Up</a>
          </div>
        </div>
      </div>
    </section>
  )
}
