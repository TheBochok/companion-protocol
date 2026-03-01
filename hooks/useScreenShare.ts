'use client'

import { useState, useCallback, useRef } from 'react'
import type { ScreenShareStatus } from '@/types'

interface UseScreenShareReturn {
  stream: MediaStream | null
  status: ScreenShareStatus
  error: string | null
  startSharing: () => Promise<void>
  stopSharing: () => void
}

export function useScreenShare(): UseScreenShareReturn {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<ScreenShareStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopSharing = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setStream(null)
    setStatus('idle')
    setError(null)
  }, [])

  const startSharing = useCallback(async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30 } },
        audio: false,
      })

      // Listen for the native "Stop sharing" button
      mediaStream.getTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          streamRef.current = null
          setStream(null)
          setStatus('ended')
        })
      })

      streamRef.current = mediaStream
      setStream(mediaStream)
      setStatus('active')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        // User cancelled the permission dialog — silently ignore
        return
      }
      const message = err instanceof Error ? err.message : 'Screen share failed'
      setError(message)
      setStatus('error')
    }
  }, [])

  return { stream, status, error, startSharing, stopSharing }
}
