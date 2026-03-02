'use client'

import { useRef, useState, useEffect } from 'react'
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

export default function PiPOverlay({ stream, target, instruction, onCancel }: PiPRenderProps) {
  const videoRef          = useRef<HTMLVideoElement | null>(null)
  const videoContainerRef = useRef<HTMLDivElement | null>(null)
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const area = useVideoDisplayArea(videoEl)

  // Refs so the RAF loop always reads fresh values without restarting
  const areaRef   = useRef(area)
  const targetRef = useRef(target)
  useEffect(() => { areaRef.current = area   }, [area])
  useEffect(() => { targetRef.current = target }, [target])

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

  // Dot position in container-normalised coords
  const dotX = target ? area.x + (target.x + target.width  / 2) * area.w : null
  const dotY = target ? area.y + (target.y + target.height / 2) * area.h : null

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

      {/* ── Scanning dots (outside the zoom container so they stay centered) ── */}
      {!target && !!stream && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', alignItems: 'center', gap: 7,
          pointerEvents: 'none',
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="pip-pulse"
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#6366f1',
                animationDelay: `${i * 0.22}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Floating glass pill (outside zoom container, always at bottom center) ── */}
      {instruction && (
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
          {/* Instruction */}
          <span style={{
            color: '#f1f5f9', fontSize: 13, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 360,
          }}>
            {instruction}
          </span>

          {/* Done button */}
          <DoneButton onClick={onCancel} />
        </div>
      )}
    </div>
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
