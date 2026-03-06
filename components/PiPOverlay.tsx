'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import type { PiPRenderProps } from '@/hooks/usePiP'

const ZOOM_CYCLE_MS = 6400

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// Computes the displayed area of a video rendered with object-fit:contain.
// Returns {x, y, w, h} as fractions of the element's client size.
function useVideoDisplayArea(videoEl: HTMLVideoElement | null) {
  const [area, setArea] = useState({ x: 0, y: 0, w: 1, h: 1 })

  useEffect(() => {
    if (!videoEl) return

    function compute() {
      const vw = videoEl!.videoWidth,  vh = videoEl!.videoHeight
      const cw = videoEl!.clientWidth, ch = videoEl!.clientHeight
      if (!vw || !vh || !cw || !ch) return

      if (vw / vh > cw / ch) {
        const dh = cw / (vw / vh)
        setArea({ x: 0, y: (ch - dh) / 2 / ch, w: 1, h: dh / ch })
      } else {
        const dw = ch * (vw / vh)
        setArea({ x: (cw - dw) / 2 / cw, y: 0, w: dw / cw, h: 1 })
      }
    }

    videoEl.addEventListener('loadedmetadata', compute)
    videoEl.addEventListener('resize', compute)
    if (videoEl.readyState >= HTMLMediaElement.HAVE_METADATA) compute()

    return () => {
      videoEl.removeEventListener('loadedmetadata', compute)
      videoEl.removeEventListener('resize', compute)
    }
  }, [videoEl])

  return area
}

type FbState = 'none' | 'rating' | 'reason' | 'thanks'

export default function PiPOverlay({ stream, target, instruction, onCancel, triggerFeedback, onFeedback, chatMessages, onChat, isProcessing = false }: PiPRenderProps) {
  const videoRef          = useRef<HTMLVideoElement | null>(null)
  const videoContainerRef = useRef<HTMLDivElement | null>(null)
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const area = useVideoDisplayArea(videoEl)

  // Refs so the RAF loop always reads fresh values without restarting
  const areaRef   = useRef(area)
  const targetRef = useRef(target)
  useEffect(() => { areaRef.current = area   }, [area])
  useEffect(() => { targetRef.current = target }, [target])

  // Chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleChatSend = useCallback(async () => {
    const msg = chatInput.trim()
    if (!msg || isSending) return
    setChatInput('')
    setIsSending(true)
    try {
      await onChat(msg)
    } finally {
      setIsSending(false)
    }
  }, [chatInput, isSending, onChat])

  const [fbState, setFbState] = useState<FbState>('none')
  useEffect(() => {
    if (triggerFeedback && fbState === 'none') setFbState('rating')
  }, [triggerFeedback, fbState])

  function handleDone() { setFbState('rating') }

  function handleRate(rating: 'up' | 'down') {
    if (rating === 'up') { setFbState('thanks'); onFeedback('up') }
    else setFbState('reason')
  }

  function handleReason(reason?: string) {
    setFbState('thanks')
    onFeedback('down', reason)
  }

  // Callback ref: set both the local ref and the state (for useVideoDisplayArea)
  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el
    setVideoEl(el)
  }

  // Connect stream to the video element
  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.play().catch(console.error)
    return () => { video.srcObject = null }
  }, [stream])

  // Zoom animation — single long-lived RAF loop; reads target + area from refs
  useEffect(() => {
    let rafId: number

    function animate() {
      const t  = targetRef.current
      const va = areaRef.current
      const container = videoContainerRef.current

      if (!container) { rafId = requestAnimationFrame(animate); return }

      if (!t) {
        container.style.transformOrigin = 'center center'
        container.style.transform = ''
        rafId = requestAnimationFrame(animate)
        return
      }

      // Target center in normalised container coords (accounts for letterbox)
      const tcx = va.x + (t.x + t.width  / 2) * va.w
      const tcy = va.y + (t.y + t.height / 2) * va.h

      // Target dimensions in container-normalised space
      const tw = t.width  * va.w
      const th = t.height * va.h

      // Scale to show ~3× the target size; cap at 10×
      const S = Math.min(1 / (Math.max(tw, 0.02) * 3), 1 / (Math.max(th, 0.02) * 3), 10)

      // Phase cycle: 0–15% full | 15–50% zoom in | 50–65% hold | 65–100% zoom out
      const phase = (Date.now() % ZOOM_CYCLE_MS) / ZOOM_CYCLE_MS
      let zoomT: number
      if      (phase < 0.15) zoomT = 0
      else if (phase < 0.50) zoomT = easeInOut((phase - 0.15) / 0.35)
      else if (phase < 0.65) zoomT = 1
      else                   zoomT = 1 - easeInOut((phase - 0.65) / 0.35)

      const St = 1 + (S - 1) * zoomT

      // Anchor the scale at the dot's position — no translate needed.
      // The dot stays fixed on screen while everything around it zooms in.
      container.style.transformOrigin = `${tcx * 100}% ${tcy * 100}%`
      container.style.transform = `scale(${St})`
      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(rafId)
      if (videoContainerRef.current) videoContainerRef.current.style.transform = ''
    }
  }, []) // intentionally empty — reads everything from refs

  // Detect scroll instructions — show swipe animation instead of dot
  const isScroll = /\bscroll\b|\bswipe\b/i.test(instruction)
  const scrollDir: 'up' | 'down' = /\bup\b/i.test(instruction) ? 'up' : 'down'

  // Dot position in container-normalised coords (only used when not scrolling)
  const dotX = !isScroll && target ? area.x + (target.x + target.width  / 2) * area.w : null
  const dotY = !isScroll && target ? area.y + (target.y + target.height / 2) * area.h : null

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>

      {/* ── Video + overlays (this div receives the zoom transform) ── */}
      <div
        ref={videoContainerRef}
        style={{ position: 'absolute', inset: 0, transformOrigin: 'center center' }}
      >
        <video
          ref={setVideoRef}
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />

        {/* ── Target dot indicator ── */}
        {dotX !== null && dotY !== null && (
          <>
            {/* Ping ring — wrapper handles position, inner div handles animation.
                Keeps the translate out of the keyframe so scale() fires from centre. */}
            <div
              style={{
                position: 'absolute',
                left: `${dotX * 100}%`,
                top:  `${dotY * 100}%`,
                width: 20, height: 20,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            >
              <div
                className="pip-ping"
                style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50%',
                  border: '2px solid rgba(99,102,241,0.55)',
                }}
              />
            </div>
            {/* Solid dot */}
            <div
              style={{
                position: 'absolute',
                left: `${dotX * 100}%`,
                top:  `${dotY * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: 10, height: 10, borderRadius: '50%',
                background: '#6366f1',
                boxShadow: '0 0 10px rgba(99,102,241,0.9), 0 0 20px rgba(99,102,241,0.5)',
                pointerEvents: 'none',
              }}
            />
          </>
        )}
      </div>

      {/* ── Swipe indicator for scroll instructions ── */}
      {isScroll && !!stream && fbState === 'none' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          marginLeft: -30, marginTop: -30,
          pointerEvents: 'none',
        }}>
          <div
            className={scrollDir === 'up' ? 'pip-swipe-up' : 'pip-swipe-down'}
            style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(99,102,241,0.2)',
              border: '2px solid rgba(99,102,241,0.65)',
              boxShadow: '0 0 28px rgba(99,102,241,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.85)" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d={scrollDir === 'up'
                  ? 'M4.5 15.75l7.5-7.5 7.5 7.5'
                  : 'M19.5 8.25l-7.5 7.5-7.5-7.5'}
              />
            </svg>
          </div>
        </div>
      )}

      {/* ── Scanning dots (outside the zoom container so they stay centered) ── */}
      {!target && !isScroll && !!stream && fbState === 'none' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', alignItems: 'center', gap: 7,
          pointerEvents: 'none',
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={isProcessing ? 'pip-think' : 'pip-pulse'}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isProcessing ? 'rgba(255,255,255,0.85)' : '#6366f1',
                animationDelay: `${i * (isProcessing ? 0.12 : 0.22)}s`,
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Chat panel (above the pill) ── */}
      {chatOpen && fbState === 'none' && (
        <div style={{
          position: 'absolute',
          bottom: 82,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '82%',
          maxWidth: 580,
          background: 'rgba(2, 6, 23, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 280,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
            minHeight: 48,
          }}>
            {chatMessages.length === 0 && !isSending && (
              <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', margin: 'auto' }}>
                Ask Via anything about this step…
              </p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%',
                  padding: '6px 11px',
                  borderRadius: msg.role === 'user' ? '13px 13px 4px 13px' : '13px 13px 13px 4px',
                  background: msg.role === 'user' ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.08)'}`,
                  color: msg.role === 'user' ? '#c7d2fe' : '#cbd5e1',
                  fontSize: 12,
                  lineHeight: 1.5,
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div style={{ display: 'flex', gap: 4, padding: '6px 11px', alignSelf: 'flex-start' }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="pip-pulse"
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animationDelay: `${i * 0.22}s` }}
                  />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          <div style={{
            padding: '7px 9px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleChatSend() }}
              placeholder="Ask Via anything…"
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 9999,
                padding: '5px 12px',
                color: '#e2e8f0',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              }}
            />
            <button
              onClick={handleChatSend}
              disabled={!chatInput.trim() || isSending}
              style={{
                background: chatInput.trim() && !isSending ? '#4f46e5' : 'rgba(99,102,241,0.18)',
                border: 'none',
                borderRadius: '50%',
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: chatInput.trim() && !isSending ? 'pointer' : 'not-allowed',
                color: '#fff',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Floating pill: instruction or feedback ── */}
      {fbState !== 'none' ? (
        <FeedbackPanel key={fbState} fbState={fbState as 'rating' | 'reason' | 'thanks'} onRate={handleRate} onReason={handleReason} />
      ) : instruction ? (
        <div
          className="pip-slide-up"
          style={{
            position: 'absolute', bottom: 28, left: '50%',
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '9px 10px 9px 20px',
            background: 'rgba(2, 6, 23, 0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 9999,
            boxShadow: '0 8px 32px rgba(99,102,241,0.18), 0 2px 10px rgba(0,0,0,0.5)',
            maxWidth: '88%',
            whiteSpace: 'nowrap',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }}
        >
          {/* Chat toggle */}
          <ChatToggle open={chatOpen} onClick={() => setChatOpen(o => !o)} unread={chatMessages.length > 0 && !chatOpen} />

          {/* Processing indicator dot */}
          <div
            className={isProcessing ? 'pip-think' : undefined}
            style={{
              flexShrink: 0,
              width: 6, height: 6, borderRadius: '50%',
              background: isProcessing ? '#818cf8' : '#1e293b',
              boxShadow: isProcessing ? '0 0 7px rgba(99,102,241,0.9)' : 'none',
              transition: 'background 0.4s, box-shadow 0.4s',
            }}
          />

          {/* Instruction */}
          <span style={{
            color: '#f1f5f9', fontSize: 13, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', flex: '1 1 auto', minWidth: 0,
          }}>
            {instruction}
          </span>

          {/* Done button */}
          <DoneButton onClick={handleDone} />
        </div>
      ) : null}
    </div>
  )
}

function ChatToggle({ open, onClick, unread }: { open: boolean; onClick: () => void; unread: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28,
        background: open
          ? 'rgba(99,102,241,0.25)'
          : hovered ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${open ? 'rgba(99,102,241,0.4)' : hovered ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 9999,
        cursor: 'pointer',
        transition: 'all 0.15s',
        color: open ? '#a5b4fc' : hovered ? '#818cf8' : '#64748b',
      }}
    >
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
      {unread && (
        <span style={{
          position: 'absolute', top: 0, right: 0,
          width: 7, height: 7, borderRadius: '50%',
          background: '#6366f1',
          border: '1.5px solid rgba(2,6,23,0.9)',
        }} />
      )}
    </button>
  )
}

function DoneButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 5,
        background: hovered ? '#4338ca' : '#4f46e5',
        color: '#fff',
        border: 'none', borderRadius: 9999, cursor: 'pointer',
        padding: '5px 13px', fontSize: 12, fontWeight: 600,
        boxShadow: '0 0 12px rgba(99,102,241,0.45)',
        transition: 'background 0.15s',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      Done
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    </button>
  )
}

function FeedbackPanel({
  fbState, onRate, onReason,
}: {
  fbState: 'rating' | 'reason' | 'thanks'
  onRate: (r: 'up' | 'down') => void
  onReason: (reason?: string) => void
}) {
  const pillBase = {
    position: 'absolute' as const,
    bottom: 28,
    left: '50%',
    background: 'rgba(2, 6, 23, 0.88)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 8px 32px rgba(99,102,241,0.18), 0 2px 10px rgba(0,0,0,0.5)',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    maxWidth: '88%',
  }

  if (fbState === 'rating') return (
    <div
      className="pip-slide-up"
      style={{ ...pillBase, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9999 }}
    >
      <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' as const }}>
        How did it go?
      </span>
      <ThumbButton emoji="👍" onClick={() => onRate('up')} />
      <ThumbButton emoji="👎" onClick={() => onRate('down')} />
    </div>
  )

  if (fbState === 'reason') return (
    <div
      className="pip-slide-up"
      style={{ ...pillBase, display: 'flex', flexDirection: 'column' as const, gap: 8, padding: '12px 16px', borderRadius: 18 }}
    >
      <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>What went wrong?</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
        <ReasonChip label="Step skipped" value="step_skipped" onReason={onReason} />
        <ReasonChip label="Wrong button" value="wrong_button" onReason={onReason} />
        <ReasonChip label="Confusing"    value="confusing"    onReason={onReason} />
        <ReasonChip label="Skip →"       value={undefined}    onReason={onReason} muted />
      </div>
    </div>
  )

  return (
    <div
      className="pip-slide-up"
      style={{ ...pillBase, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 9999 }}
    >
      <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 500 }}>✓ Thanks for the feedback!</span>
    </div>
  )
}

function ThumbButton({ emoji, onClick }: { emoji: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${hovered ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 9999, cursor: 'pointer',
        padding: '5px 10px', fontSize: 18, lineHeight: '1',
        transition: 'all 0.15s',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {emoji}
    </button>
  )
}

function ReasonChip({ label, value, onReason, muted = false }: {
  label: string
  value: string | undefined
  onReason: (r?: string) => void
  muted?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={() => onReason(value)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: muted ? 'transparent' : hovered ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
        color: muted ? '#475569' : hovered ? '#a5b4fc' : '#94a3b8',
        border: `1px solid ${muted ? 'rgba(255,255,255,0.06)' : hovered ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 9999, cursor: 'pointer',
        padding: '4px 12px', fontSize: 12, fontWeight: 500,
        transition: 'all 0.15s',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {label}
    </button>
  )
}
