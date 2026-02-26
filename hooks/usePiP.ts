'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { PiPStatus } from '@/types'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/drawCanvas'

interface UsePiPReturn {
  outputCanvasRef: React.RefObject<HTMLCanvasElement>
  pipStatus: PiPStatus
  togglePiP: () => Promise<void>
}

export function usePiP(): UsePiPReturn {
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [pipStatus, setPipStatus] = useState<PiPStatus>('inactive')

  useEffect(() => {
    if (!document.pictureInPictureEnabled) {
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

    try {
      // Capture canvas stream and wire up video
      const stream = canvas.captureStream(30)
      video.srcObject = stream
      await video.play()
      await video.requestPictureInPicture()
      setPipStatus('active')
    } catch (err) {
      console.error('PiP error:', err)
    }
  }, [])

  return { outputCanvasRef, pipStatus, togglePiP }
}
