'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { PiPStatus } from '@/types'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/drawCanvas'

interface UsePiPReturn {
  outputCanvasRef: React.RefObject<HTMLCanvasElement>
  pipStatus: PiPStatus
  pipError: string | null
  togglePiP: () => Promise<void>
}

export function usePiP(): UsePiPReturn {
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [pipStatus, setPipStatus] = useState<PiPStatus>('inactive')
  const [pipError, setPipError] = useState<string | null>(null)

  useEffect(() => {
    // document.pictureInPictureEnabled may be absent in older browsers
    if (document.pictureInPictureEnabled === false) {
      setPipStatus('unsupported')
      return
    }

    // Create hidden video element and append to body (required by Safari)
    const video = document.createElement('video')
    video.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;'
    video.muted = true
    video.playsInline = true
    document.body.appendChild(video)
    videoRef.current = video

    video.addEventListener('leavepictureinpicture', () => {
      setPipStatus('inactive')
    })

    return () => {
      if (document.pictureInPictureElement === video) {
        document.exitPictureInPicture().catch(() => {})
      }
      document.body.removeChild(video)
      videoRef.current = null
    }
  }, [])

  const togglePiP = useCallback(async () => {
    const video = videoRef.current
    const canvas = outputCanvasRef.current
    if (!video || !canvas) return

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
      setPipStatus('inactive')
      return
    }

    setPipError(null)
    try {
      const stream = canvas.captureStream(30)
      video.srcObject = stream

      // Wait for 'playing' — required before requestPictureInPicture.
      // Do NOT await a rAF here: Chrome invalidates the user-gesture token
      // across macro-task boundaries, which would silently block PiP.
      await new Promise<void>((resolve, reject) => {
        video.addEventListener('playing', () => resolve(), { once: true })
        video.addEventListener('error', (e) => reject(e), { once: true })
        video.play().catch(reject)
      })

      await video.requestPictureInPicture()
      setPipStatus('active')
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      setPipError(msg)
      console.error('PiP error:', err)
    }
  }, [])

  return { outputCanvasRef, pipStatus, pipError, togglePiP }
}
