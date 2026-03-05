'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')

  async function handleSubmit() {
    if (!message.trim()) return
    setState('sending')
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
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
  const router = useRouter()
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
  const [chatInput, setChatInput] = useState('')
  const [isChatSending, setIsChatSending] = useState(false)
  const [liveChatMessages, setLiveChatMessages] = useState<ChatMsg[]>([])
  const liveChatRef = useRef<ChatMsg[]>([])
  // Mobile fallback state
  const [mobileEmail, setMobileEmail] = useState('')
  const [mobileEmailSent, setMobileEmailSent] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [appMode, setAppMode] = useState<'find' | 'create'>('find')
  const [creatorEmail, setCreatorEmail] = useState('')
  const [creatorEmailSent, setCreatorEmailSent] = useState(false)
  const [isSendingCreatorEmail, setIsSendingCreatorEmail] = useState(false)
  const liveGoalRef = useRef(goal)
  const liveInstructionRef = useRef('')

  const { analysisCanvasRef, videoRef, isProcessing, currentInstruction, injectContext, forceInstruction } = useVision(stream, goal, sessionId)
  const { target } = useCoordinateStore()

  // Ref so the canvas RAF loop always reads the latest instruction without restarting
  const instructionRef = useRef(currentInstruction)
  useEffect(() => { instructionRef.current = currentInstruction }, [currentInstruction])

  // Keep goal/instruction fresh inside handleChat without causing re-creation
  useEffect(() => { liveGoalRef.current = goal }, [goal])
  useEffect(() => { liveInstructionRef.current = currentInstruction }, [currentInstruction])

  const chatScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [liveChatMessages])

  const handleChat = useCallback(async (msg: string): Promise<string> => {
    const history = liveChatRef.current
    const withUser: ChatMsg[] = [...history, { role: 'user', content: msg }]
    liveChatRef.current = withUser
    setLiveChatMessages(withUser)
    // Inject context so vision loop re-aligns on the next frame
    injectContext(msg)
    setIsChatSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          goal: liveGoalRef.current,
          currentInstruction: liveInstructionRef.current,
          history,
        }),
      })
      const data = await res.json()
      const reply: string = data.reply ?? ''
      // Immediately redirect the guidance instruction from the chat response
      if (data.instruction) forceInstruction(data.instruction)
      const withReply: ChatMsg[] = [...withUser, { role: 'ai', content: reply }]
      liveChatRef.current = withReply
      setLiveChatMessages(withReply)
      return reply
    } catch {
      const errMsg = "Sorry, something went wrong."
      const withErr: ChatMsg[] = [...withUser, { role: 'ai', content: errMsg }]
      liveChatRef.current = withErr
      setLiveChatMessages(withErr)
      return errMsg
    } finally {
      setIsChatSending(false)
    }
  }, [injectContext, forceInstruction])

  // Reset clarification state when native stop-sharing is used
  useEffect(() => {
    if (status === 'ended') {
      setPhase('idle')
      setChatHistory([])
      setIsReady(false)
      setSessionId(null)
      setTriggerFeedback(false)
      setLiveChatMessages([])
      liveChatRef.current = []
    }
  }, [status])

  // Show feedback panel when goal is complete
  useEffect(() => {
    if (currentInstruction === 'Goal complete') setTriggerFeedback(true)
  }, [currentInstruction])

  // ── Document PiP: keep overlay in sync ────────────────────────────────────
  useEffect(() => {
    if (status !== 'active' || pipMode !== 'document') return
    updatePiP({ stream, target, instruction: currentInstruction, onCancel: handleEndGuide, triggerFeedback, onFeedback: handleFeedback, chatMessages: liveChatMessages, onChat: handleChat })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pipMode, pipStatus, stream, target, currentInstruction, triggerFeedback, liveChatMessages])

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
    setLiveChatMessages([])
    liveChatRef.current = []
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

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleMobileReminder() {
    if (!mobileEmail.trim()) return
    setIsSendingEmail(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Mobile reminder request: ${mobileEmail}` }),
      })
    } catch { /* optimistic */ }
    setMobileEmailSent(true)
    setIsSendingEmail(false)
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  async function handleCreatorSubmit() {
    if (!creatorEmail.trim()) return
    setIsSendingCreatorEmail(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `B2B early access request: ${creatorEmail}` }),
      })
    } catch { /* optimistic */ }
    setCreatorEmailSent(true)
    setIsSendingCreatorEmail(false)
  }

  const isActive = status === 'active'

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ── Top nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-14 grid grid-cols-3 items-center">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.3)]">
              <div className="w-2 h-2 rounded-sm bg-indigo-400" />
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">Via</span>
          </div>

          {/* Center: Mode toggle (hidden during active guide) */}
          <div className="flex justify-center">
            {!isActive && (
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
                <button
                  onClick={() => setAppMode('find')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    appMode === 'find'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Find a Guide
                </button>
                <button
                  onClick={() => setAppMode('create')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    appMode === 'create'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Create Guides
                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/25 px-1.5 py-0.5 rounded-full">✨ Beta</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Feedback + Sign out */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowFeedback(true)}
              className="flex items-center gap-1.5 text-indigo-300 hover:text-white border border-indigo-500/40 hover:border-indigo-400/60 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all text-xs font-semibold px-3 py-1.5 rounded-lg shadow-[0_0_10px_rgba(99,102,241,0.15)]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              Feedback
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] transition-all text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Fallback (visible only on small viewports) ── */}
      <div className="flex flex-col md:hidden min-h-screen items-center justify-center px-6 pt-14 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
        <div className="flex flex-col items-center w-full max-w-sm text-center">

          {/* Glowing monitor icon */}
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-indigo-500/15 blur-2xl" />
            <div className="relative w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_32px_rgba(99,102,241,0.2)]">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl text-white font-semibold mt-6">
            Built for the big screen.
          </h1>
          <p className="text-slate-400 mt-4 leading-relaxed">
            Via uses advanced screen-sharing and Picture-in-Picture to guide you through complex software. To experience the magic, open this link on your Mac or PC.
          </p>

          {/* Lead capture */}
          <div className="w-full mt-10">
            {mobileEmailSent ? (
              <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <p className="text-emerald-300 text-sm font-medium">Reminder sent!</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={mobileEmail}
                  onChange={e => setMobileEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleMobileReminder()}
                  className="flex-1 h-12 bg-white/[0.04] border border-white/10 rounded-xl px-4 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 focus:shadow-[0_0_0_1px_rgba(99,102,241,0.18)] transition-all"
                />
                <button
                  onClick={handleMobileReminder}
                  disabled={!mobileEmail.trim() || isSendingEmail}
                  className="h-12 px-5 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all shadow-[0_0_16px_rgba(99,102,241,0.3)] whitespace-nowrap"
                >
                  {isSendingEmail
                    ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : 'Send reminder'}
                </button>
              </div>
            )}

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-white mt-6 w-full transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
              </svg>
              {copiedLink ? 'Copied!' : 'or copy link to clipboard'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content (desktop only) ── */}
      <main className="min-h-screen hidden md:flex flex-col items-center justify-center px-6 pt-14">

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

              {/* Chat */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden mb-4">
                {liveChatMessages.length > 0 && (
                  <div ref={chatScrollRef} className="max-h-44 overflow-y-auto p-3 space-y-2">
                    {liveChatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-indigo-500/20 border border-indigo-500/25 text-indigo-100'
                            : 'bg-white/[0.05] border border-white/[0.07] text-slate-300'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isChatSending && (
                      <div className="flex justify-start">
                        <div className="bg-white/[0.05] border border-white/[0.07] rounded-xl px-3 py-2 flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className={`relative ${liveChatMessages.length > 0 ? 'border-t border-white/[0.04]' : ''}`}>
                  <input
                    className="w-full h-11 bg-transparent pl-4 pr-14 text-white text-sm placeholder:text-slate-600 focus:outline-none"
                    placeholder="Ask Via anything…"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && chatInput.trim() && !isChatSending) {
                        handleChat(chatInput.trim())
                        setChatInput('')
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!chatInput.trim() || isChatSending) return
                      handleChat(chatInput.trim())
                      setChatInput('')
                    }}
                    disabled={!chatInput.trim() || isChatSending}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-indigo-400 hover:text-indigo-300 disabled:text-slate-700 font-medium transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>

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
        {!isActive && phase === 'idle' && appMode === 'find' && (
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

            {/* Quick Start example chips */}
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {[
                { icon: '📚', text: 'Find a paper on computer vision on arXiv' },
                { icon: '🎨', text: 'Resize a canvas in Photopea' },
                { icon: '🔍', text: 'View the edit history on Wikipedia' },
              ].map(({ icon, text }) => (
                <button
                  key={text}
                  onClick={() => setGoal(text)}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-full px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-all"
                >
                  <span>{icon}</span>
                  <span>{text}</span>
                </button>
              ))}
            </div>

            {/* Micro-stepper */}
            <div className="flex items-center justify-center gap-3 mt-12 text-[10px] uppercase tracking-widest font-semibold text-slate-500">
              <span>1. Enter Goal</span>
              <span className="opacity-50">→</span>
              <span>2. Share Screen</span>
              <span className="opacity-50">→</span>
              <span>3. Follow the Guide</span>
            </div>
          </div>
        )}

        {/* ── CREATE GUIDES (B2B Lead Capture) ── */}
        {!isActive && phase === 'idle' && appMode === 'create' && (
          <div className="w-full max-w-2xl text-center">
            {/* Glowing record icon */}
            <div className="flex items-center justify-center mb-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-3xl scale-[2]" />
                <div className="relative w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_48px_rgba(99,102,241,0.2)]">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.8)]" />
                </div>
              </div>
            </div>

            <h1 className="text-4xl font-bold text-white tracking-tight mb-4 leading-tight">
              Stop writing documentation.<br />Start recording.
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-lg mx-auto">
              Via for Teams lets you record any workflow and instantly share it as an interactive, on-screen guide. No more Zoom support calls or outdated Notion docs.
            </p>

            {/* Email capture */}
            {creatorEmailSent ? (
              <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4 max-w-sm mx-auto">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <p className="text-emerald-300 text-sm font-medium">You&apos;re on the list!</p>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Enter your work email"
                    value={creatorEmail}
                    onChange={e => setCreatorEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreatorSubmit()}
                    className="w-64 h-12 bg-white/5 border border-white/10 rounded-l-xl px-4 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    onClick={handleCreatorSubmit}
                    disabled={!creatorEmail.trim() || isSendingCreatorEmail}
                    className="h-12 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-r-xl transition-all whitespace-nowrap"
                  >
                    {isSendingCreatorEmail
                      ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : 'Request Early Access'
                    }
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 mt-6 uppercase tracking-widest">
              Currently onboarding design, engineering, and CS teams.
            </p>
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
