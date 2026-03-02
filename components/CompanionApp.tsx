'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useScreenShare } from '@/hooks/useScreenShare'
import { usePiP } from '@/hooks/usePiP'
import { useVision } from '@/hooks/useVision'
import { useCoordinateStore } from '@/store/coordinateStore'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  drawScanning,
  drawConnectionLost,
  drawOverviewWithBox,
} from '@/lib/drawCanvas'

type Phase = 'idle' | 'clarifying' | 'active'
type ChatMsg = { role: 'ai' | 'user'; content: string }

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')

  async function handleSubmit() {
    if (!message.trim()) return
    setState('sending')
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, email }),
      })
      setState('done')
      setTimeout(onClose, 2000)
    } catch {
      setState('idle')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
        {state === 'done' ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-white font-medium">Thanks for the feedback!</p>
            <p className="text-slate-500 text-sm">I&apos;ll reach back if needed.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-base">Share feedback</h2>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <textarea
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              rows={4}
              placeholder="What's working well? What's broken? Any ideas?"
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 focus:shadow-[0_0_0_1px_rgba(99,102,241,0.18)] resize-none transition-all mb-3"
            />

            <input
              type="email"
              placeholder="Your email (optional, for follow-up)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 focus:shadow-[0_0_0_1px_rgba(99,102,241,0.18)] transition-all mb-4"
            />

            <button
              onClick={handleSubmit}
              disabled={!message.trim() || state === 'sending'}
              className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/40 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-[0_0_16px_rgba(99,102,241,0.3)]"
            >
              {state === 'sending' ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending…
                </>
              ) : 'Send feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function CompanionApp() {
  const { stream, status, error, startSharing, stopSharing } = useScreenShare()
  const { outputCanvasRef, pipStatus, pipMode, pipError, togglePiP, closePiP, updatePiP } = usePiP()
  const [goal, setGoal] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([])
  const [clarifyInput, setClarifyInput] = useState('')
  const [isClarifying, setIsClarifying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [triggerFeedback, setTriggerFeedback] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const { analysisCanvasRef, videoRef, isProcessing, currentInstruction } = useVision(stream, goal, sessionId)
  const { target } = useCoordinateStore()

  // Ref so the canvas RAF loop always reads the latest instruction without restarting
  const instructionRef = useRef(currentInstruction)
  useEffect(() => { instructionRef.current = currentInstruction }, [currentInstruction])

  // Reset clarification state when native stop-sharing is used
  useEffect(() => {
    if (status === 'ended') {
      setPhase('idle')
      setChatHistory([])
      setIsReady(false)
      setSessionId(null)
      setTriggerFeedback(false)
    }
  }, [status])

  // Show feedback panel when goal is complete
  useEffect(() => {
    if (currentInstruction === 'Goal complete') setTriggerFeedback(true)
  }, [currentInstruction])

  // ── Document PiP: keep overlay in sync ────────────────────────────────────
  useEffect(() => {
    if (status !== 'active' || pipMode !== 'document') return
    updatePiP({ stream, target, instruction: currentInstruction, onCancel: handleEndGuide, triggerFeedback, onFeedback: handleFeedback })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pipMode, pipStatus, stream, target, currentInstruction, triggerFeedback])

  // ── Canvas PiP fallback: resize output canvas to match video stream ───────
  useEffect(() => {
    if (status !== 'active' || pipMode !== 'canvas') return
    const video  = videoRef.current
    const canvas = outputCanvasRef.current
    if (!video || !canvas) return

    function applySize() {
      if (video!.videoWidth > 0) {
        canvas!.width  = video!.videoWidth
        canvas!.height = video!.videoHeight
      }
    }

    if (video.videoWidth > 0) {
      applySize()
    } else {
      video.addEventListener('loadedmetadata', applySize, { once: true })
      return () => video.removeEventListener('loadedmetadata', applySize)
    }
  }, [status, pipMode, videoRef, outputCanvasRef])

  // ── Canvas PiP fallback: drawing loop ─────────────────────────────────────
  useEffect(() => {
    if (status !== 'active' || pipMode !== 'canvas') return
    const canvas = outputCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!target) {
      drawScanning(ctx)
      return
    }

    let rafId: number
    function draw() {
      const vid = videoRef.current
      if (vid && vid.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        drawOverviewWithBox(ctx!, vid, target!, instructionRef.current)
      }
      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [status, pipMode, target, outputCanvasRef, videoRef])

  // ── Canvas PiP fallback: connection lost state ────────────────────────────
  useEffect(() => {
    if (pipMode !== 'canvas') return
    const canvas = outputCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (status === 'ended') drawConnectionLost(ctx)
  }, [status, pipMode, outputCanvasRef])

  // ── Clarification helpers ──────────────────────────────────────────────────

  async function callClarify(history: ChatMsg[]) {
    const res = await fetch('/api/clarify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, history }),
    })
    return res.json() as Promise<{ ready: boolean; question?: string }>
  }

  async function handleGoalSubmit() {
    if (!goal.trim()) return
    setPhase('clarifying')
    setIsClarifying(true)
    setChatHistory([])
    setIsReady(false)

    try {
      const data = await callClarify([])
      if (data.ready) {
        setIsReady(true)
      } else {
        setChatHistory([{ role: 'ai', content: data.question! }])
      }
    } catch {
      setIsReady(true)
    } finally {
      setIsClarifying(false)
    }
  }

  async function handleClarifyReply() {
    const userMsg = clarifyInput.trim()
    if (!userMsg) return

    const newHistory: ChatMsg[] = [...chatHistory, { role: 'user', content: userMsg }]
    setChatHistory(newHistory)
    setClarifyInput('')

    const aiCount = newHistory.filter(m => m.role === 'ai').length
    if (aiCount >= 2) {
      setIsReady(true)
      return
    }

    setIsClarifying(true)
    try {
      const data = await callClarify(newHistory)
      if (data.ready) {
        setIsReady(true)
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', content: data.question! }])
      }
    } catch {
      setIsReady(true)
    } finally {
      setIsClarifying(false)
    }
  }

  // ── Screen share + PiP ─────────────────────────────────────────────────────

  async function handleStartGuide() {
    setSessionId(crypto.randomUUID())
    setIsStarting(true)
    try {
      await startSharing()
      await togglePiP()
    } finally {
      setIsStarting(false)
    }
  }

  const handleEndGuide = useCallback(async () => {
    closePiP()
    stopSharing()
    setPhase('idle')
    setChatHistory([])
    setIsReady(false)
    setSessionId(null)
    setTriggerFeedback(false)
  }, [closePiP, stopSharing])

  const handleEndGuideRef = useRef(handleEndGuide)
  useEffect(() => { handleEndGuideRef.current = handleEndGuide }, [handleEndGuide])

  const handleFeedback = useCallback((rating: 'up' | 'down', reason?: string) => {
    if (sessionId && goal) {
      fetch('/api/analytics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, goal, rating, reason: reason ?? null }),
      }).catch(() => {})
    }
    setTimeout(() => handleEndGuideRef.current(), 1800)
  }, [sessionId, goal])

  function handleEditGoal() {
    setPhase('idle')
    setChatHistory([])
    setIsReady(false)
  }

  const isActive = status === 'active'

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ── Top nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.3)]">
              <div className="w-2 h-2 rounded-sm bg-indigo-400" />
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">Via</span>
          </div>
          <button
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-1.5 text-indigo-300 hover:text-white border border-indigo-500/40 hover:border-indigo-400/60 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all text-xs font-semibold px-3 py-1.5 rounded-lg shadow-[0_0_10px_rgba(99,102,241,0.15)]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            Feedback
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="min-h-screen flex flex-col items-center justify-center px-6 pt-14">

        {/* ── ACTIVE STATE ── */}
        {isActive && (
          <div className="w-full max-w-sm">
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
              <div className="flex items-center justify-center gap-2.5 mb-8">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                  <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" />
                </div>
                <span className="text-slate-300 text-sm font-medium">
                  {isProcessing ? 'Analysing…' : 'Status: Guiding'}
                </span>
              </div>

              <h2 className="text-xl font-bold text-white tracking-tight mb-2">
                Via is active in Picture-in-Picture.
              </h2>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                You can safely minimize this window.
              </p>

              {currentInstruction && (
                <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl px-5 py-4 mb-8 text-left">
                  <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-widest mb-1.5">Current step</p>
                  <p className="text-white text-sm leading-relaxed">{currentInstruction}</p>
                </div>
              )}

              {pipStatus !== 'active' && (
                <button
                  onClick={togglePiP}
                  className="w-full border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 rounded-xl py-2.5 text-sm font-medium transition-all mb-3"
                >
                  Re-open Via Window
                </button>
              )}

              <button
                onClick={handleEndGuide}
                className="w-full border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded-xl py-3 text-sm font-medium transition-all"
              >
                End Guide
              </button>
            </div>
          </div>
        )}

        {/* ── IDLE STATE ── */}
        {!isActive && phase === 'idle' && (
          <div className="w-full max-w-2xl">
            <p className="text-center text-indigo-400 text-[11px] uppercase tracking-widest font-semibold mb-5">
              Visual AI Guide
            </p>
            <h1 className="text-center text-5xl sm:text-[56px] font-bold text-white tracking-tighter mb-3 leading-tight">
              What do you want to do?
            </h1>
            <p className="text-center text-slate-400 text-sm mb-10">
              Via overlays step-by-step guidance on top of any software, in real time.
            </p>

            <div className="relative bg-white/[0.04] border border-white/10 rounded-2xl focus-within:border-indigo-500/40 focus-within:shadow-[0_0_0_1px_rgba(99,102,241,0.18),0_0_32px_rgba(99,102,241,0.07)] transition-all duration-200">
              <input
                className="w-full h-16 bg-transparent pl-6 pr-44 text-white text-lg placeholder:text-slate-600 focus:outline-none rounded-2xl"
                placeholder='e.g. "Invite a user in AWS IAM"'
                value={goal}
                onChange={e => setGoal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && goal.trim() && handleGoalSubmit()}
              />
              <button
                onClick={handleGoalSubmit}
                disabled={!goal.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/40 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-[0_0_16px_rgba(99,102,241,0.35)] hover:shadow-[0_0_24px_rgba(99,102,241,0.5)] whitespace-nowrap"
              >
                <span aria-hidden>✦</span>
                Start Guide
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-xs mt-3 text-center">{error}</p>
            )}
            {status === 'ended' && (
              <p className="text-slate-500 text-xs mt-3 text-center">
                Screen share ended. Start a new guide whenever you&apos;re ready.
              </p>
            )}
          </div>
        )}

        {/* ── CLARIFYING STATE ── */}
        {!isActive && phase === 'clarifying' && (
          <div className="w-full max-w-xl">

            {/* Frozen goal chip */}
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-3 mb-6">
              <span className="text-slate-600 text-xs font-mono uppercase tracking-wider flex-shrink-0">Goal</span>
              <span className="text-slate-300 text-sm truncate flex-1">{goal}</span>
              <button
                onClick={handleEditGoal}
                className="flex-shrink-0 text-slate-600 hover:text-slate-400 text-xs transition-colors px-2 py-1 rounded hover:bg-white/5"
              >
                Edit
              </button>
            </div>

            {/* Chat messages */}
            {(chatHistory.length > 0 || isClarifying) && (
              <div className="space-y-3 mb-4">
                {chatHistory.map((msg, i) =>
                  msg.role === 'ai' ? (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-sm bg-indigo-400" />
                      </div>
                      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 text-slate-200 text-sm leading-relaxed max-w-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-end">
                      <div className="bg-indigo-500/15 border border-indigo-500/20 rounded-2xl rounded-tr-sm px-4 py-3 text-indigo-100 text-sm leading-relaxed max-w-sm">
                        {msg.content}
                      </div>
                    </div>
                  )
                )}

                {isClarifying && (
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-sm bg-indigo-400" />
                    </div>
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                          style={{ animationDelay: `${i * 0.12}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reply input */}
            {!isClarifying && !isReady && chatHistory.at(-1)?.role === 'ai' && (
              <div className="relative bg-white/[0.04] border border-white/10 rounded-2xl focus-within:border-indigo-500/40 focus-within:shadow-[0_0_0_1px_rgba(99,102,241,0.18)] transition-all duration-200">
                <input
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="w-full h-14 bg-transparent pl-5 pr-36 text-white text-base placeholder:text-slate-600 focus:outline-none rounded-2xl"
                  placeholder="Type your answer…"
                  value={clarifyInput}
                  onChange={e => setClarifyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && clarifyInput.trim() && handleClarifyReply()}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    onClick={handleStartGuide}
                    className="text-slate-500 hover:text-slate-300 text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors whitespace-nowrap"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleClarifyReply}
                    disabled={!clarifyInput.trim()}
                    className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2 text-sm font-medium transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)] whitespace-nowrap"
                  >
                    Reply
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Ready → explicit CTA preserves user gesture for getDisplayMedia + PiP */}
            {!isClarifying && isReady && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <p className="text-slate-300 text-sm font-medium">
                    {chatHistory.length > 0 ? 'Got it. Ready to guide you.' : 'Goal is clear. Ready to guide you.'}
                  </p>
                </div>
                <button
                  onClick={handleStartGuide}
                  disabled={isStarting}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_28px_rgba(99,102,241,0.55)]"
                >
                  {isStarting ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>
                      Let&apos;s go
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}

            {(error || pipError) && (
              <p className="text-red-400 text-xs mt-3 text-center">{error || pipError}</p>
            )}
          </div>
        )}

      </main>

      {/* ── Feedback modal ── */}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      {/* Hidden output canvas — only used in canvas-PiP fallback mode */}
      <canvas
        ref={outputCanvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="fixed top-0 left-0 opacity-0 pointer-events-none"
        style={{ width: 1, height: 1 }}
      />

      {/* Hidden analysis canvas — used by useVision for OCR frame capture */}
      <canvas
        ref={analysisCanvasRef}
        width={1280}
        height={720}
        className="hidden"
      />
    </div>
  )
}
