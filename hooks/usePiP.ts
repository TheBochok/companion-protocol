'use client'

import { useRef, useState, useCallback, useEffect, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import PiPOverlay from '@/components/PiPOverlay'
import type { PiPStatus } from '@/types'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/drawCanvas'

export type PiPMode = 'document' | 'canvas' | null

export interface PiPRenderProps {
  stream: MediaStream | null
  target: { x: number; y: number; width: number; height: number } | null
  instruction: string
  onCancel: () => void
  triggerFeedback: boolean
  onFeedback: (rating: 'up' | 'down', reason?: string) => void
  chatMessages: { role: 'user' | 'ai'; content: string }[]
  onChat: (msg: string) => Promise<string>
}

interface UsePiPReturn {
  outputCanvasRef: React.RefObject<HTMLCanvasElement>
  pipStatus: PiPStatus
  pipMode: PiPMode
  pipError: string | null
  togglePiP: () => Promise<void>
  closePiP: () => void
  updatePiP: (props: PiPRenderProps) => void
}

const CRITICAL_CSS = `
  @keyframes pip-ping {
    75%, 100% { transform: scale(1.3); opacity: 0; }
  }
  @keyframes pip-slide-up {
    from { transform: translateX(-50%) translateY(18px); opacity: 0; }
    to   { transform: translateX(-50%) translateY(0);   opacity: 1; }
  }
  @keyframes pip-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.45; }
  }
  @keyframes pip-swipe-up {
    0%   { transform: translateY(28px);  opacity: 0; }
    18%  { transform: translateY(28px);  opacity: 1; }
    80%  { transform: translateY(-28px); opacity: 1; }
    100% { transform: translateY(-28px); opacity: 0; }
  }
  @keyframes pip-swipe-down {
    0%   { transform: translateY(-28px); opacity: 0; }
    18%  { transform: translateY(-28px); opacity: 1; }
    80%  { transform: translateY(28px);  opacity: 1; }
    100% { transform: translateY(28px);  opacity: 0; }
  }
  .pip-ping       { animation: pip-ping       1.5s cubic-bezier(0,0,0.2,1) infinite; }
  .pip-slide-up   { animation: pip-slide-up   0.35s ease-out both; }
  .pip-pulse      { animation: pip-pulse      2s    ease-in-out infinite; }
  .pip-swipe-up   { animation: pip-swipe-up   1.3s  ease-in-out infinite; }
  .pip-swipe-down { animation: pip-swipe-down 1.3s  ease-in-out infinite; }
`

export function usePiP(): UsePiPReturn {
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasVideoRef  = useRef<HTMLVideoElement | null>(null) // canvas-PiP fallback
  const pipWindowRef    = useRef<Window | null>(null)           // document-PiP
  const reactRootRef    = useRef<Root | null>(null)

  const [pipStatus, setPipStatus] = useState<PiPStatus>('inactive')
  const [pipMode,   setPipMode]   = useState<PiPMode>(null)
  const [pipError,  setPipError]  = useState<string | null>(null)

  // Hidden video element for canvas-PiP fallback (Safari requires it in body)
  useEffect(() => {
    const video = document.createElement('video')
    video.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;'
    video.muted = true
    video.playsInline = true
    document.body.appendChild(video)
    canvasVideoRef.current = video

    video.addEventListener('leavepictureinpicture', () => {
      setPipStatus('inactive')
      setPipMode(null)
    })

    return () => {
      if (document.pictureInPictureElement === video) {
        document.exitPictureInPicture().catch(() => {})
      }
      document.body.removeChild(video)
      canvasVideoRef.current = null
    }
  }, [])

  // Unmount React root on hook destroy
  useEffect(() => () => {
    reactRootRef.current?.unmount()
    reactRootRef.current = null
  }, [])

  const closePiP = useCallback(() => {
    // Document PiP
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close()
    }
    reactRootRef.current?.unmount()
    reactRootRef.current = null
    pipWindowRef.current = null

    // Canvas PiP
    const cv = canvasVideoRef.current
    if (cv && document.pictureInPictureElement === cv) {
      document.exitPictureInPicture().catch(() => {})
    }

    setPipStatus('inactive')
    setPipMode(null)
  }, [])

  const togglePiP = useCallback(async () => {
    const isDocOpen    = pipWindowRef.current && !pipWindowRef.current.closed
    const isCanvasOpen = canvasVideoRef.current &&
      document.pictureInPictureElement === canvasVideoRef.current

    if (isDocOpen || isCanvasOpen) {
      closePiP()
      return
    }

    setPipError(null)

    // ── 1. Try Document PiP (Chrome 116+) ────────────────────────────────────
    if (window.documentPictureInPicture) {
      try {
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 854,
          height: 480,
        })
        pipWindowRef.current = pipWin

        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            const cssText = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n')
            const style = pipWin.document.createElement('style')
            style.textContent = cssText
            pipWin.document.head.appendChild(style)
          } catch {
            if (sheet.href) {
              const link = pipWin.document.createElement('link')
              link.rel = 'stylesheet'
              link.href = sheet.href
              pipWin.document.head.appendChild(link)
            }
          }
        })

        const criticalStyle = pipWin.document.createElement('style')
        criticalStyle.textContent = CRITICAL_CSS
        pipWin.document.head.appendChild(criticalStyle)

        pipWin.document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:#000;'
        const container = pipWin.document.createElement('div')
        container.style.cssText = 'width:100%;height:100vh;position:relative;overflow:hidden;'
        pipWin.document.body.appendChild(container)

        reactRootRef.current = createRoot(container)

        pipWin.addEventListener('pagehide', () => {
          reactRootRef.current?.unmount()
          reactRootRef.current = null
          pipWindowRef.current = null
          setPipStatus('inactive')
          setPipMode(null)
        })

        setPipMode('document')
        setPipStatus('active')
        return
      } catch (err) {
        console.warn('[PiP] Document PiP failed, falling back to canvas PiP:', err)
        // fall through
      }
    }

    // ── 2. Canvas PiP fallback ────────────────────────────────────────────────
    const video  = canvasVideoRef.current
    const canvas = outputCanvasRef.current
    if (!video || !canvas) return

    try {
      const stream = canvas.captureStream(30)
      video.srcObject = stream

      await new Promise<void>((resolve, reject) => {
        video.addEventListener('playing', () => resolve(), { once: true })
        video.addEventListener('error',   (e) => reject(e), { once: true })
        video.play().catch(reject)
      })

      await video.requestPictureInPicture()
      setPipMode('canvas')
      setPipStatus('active')
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      setPipError(msg)
      console.error('PiP error:', err)
    }
  }, [closePiP])

  const updatePiP = useCallback((props: PiPRenderProps) => {
    reactRootRef.current?.render(createElement(PiPOverlay, props))
  }, [])

  return {
    outputCanvasRef,
    pipStatus,
    pipMode,
    pipError,
    togglePiP,
    closePiP,
    updatePiP,
  }
}
