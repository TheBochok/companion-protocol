'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useCoordinateStore } from '@/store/coordinateStore'

const DIFF_WIDTH = 64
const DIFF_HEIGHT = 36
const DIFF_INTERVAL = 150
const PIXEL_DELTA = 25
const CHANGE_THRESHOLD = 0.015
const BIG_CHANGE_THRESHOLD = 0.08
const HEARTBEAT_MS = 4000

const CAPTURE_MAX_W = 1920
const CAPTURE_MAX_H = 1080

const THUMB_W = 320
const THUMB_H = 180

interface UseVisionReturn {
  analysisCanvasRef: React.RefObject<HTMLCanvasElement>
  videoRef: React.RefObject<HTMLVideoElement | null>
  isProcessing: boolean
  currentInstruction: string
  injectContext: (text: string) => void
  forceInstruction: (instruction: string) => void
}

export function useVision(stream: MediaStream | null, goal: string, sessionId: string | null): UseVisionReturn {
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentInstruction, setCurrentInstruction] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const setTarget = useCoordinateStore((s) => s.setTarget)

  // Keep goal fresh inside the interval closure without restarting the loop
  const goalRef = useRef(goal)
  useEffect(() => {
    // Reset history when the goal changes
    if (goalRef.current !== goal) {
      historyRef.current = []
      prevInstructionRef.current = ''
      consecutiveCompleteRef.current = 0
      lastEventIdRef.current = null
      memoryRef.current = ''
    }
    goalRef.current = goal
  }, [goal])

  // Keep sessionId fresh
  const sessionIdRef = useRef<string | null>(sessionId)
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])

  // Accumulate completed steps: when instruction changes, the previous one was acted on
  const historyRef = useRef<string[]>([])
  const prevInstructionRef = useRef('')
  const prevFrameRef = useRef('')
  const memoryRef = useRef('')
  // Require N consecutive "Goal complete" responses before propagating to avoid false positives
  const consecutiveCompleteRef = useRef(0)
  const COMPLETIONS_REQUIRED = 2

  // Analytics: track the last logged event id so we can update its acted status later
  const lastEventIdRef = useRef<string | null>(null)

  // Generation counter — incremented by forceInstruction to invalidate in-flight requests
  const generationRef = useRef(0)

  // One-shot user context — included in the next vision call then cleared
  const pendingContextRef = useRef('')
  const injectContext = useCallback((text: string) => { pendingContextRef.current = text }, [])

  // Immediately override the displayed instruction (e.g. from chat redirect).
  // Increments generationRef so any in-flight vision request discards its result.
  const forceInstruction = useCallback((instruction: string) => {
    generationRef.current += 1
    prevInstructionRef.current = instruction
    setCurrentInstruction(instruction)
    setTarget(null)
  }, [setTarget])

  useEffect(() => {
    if (!stream) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setTarget(null)
      setCurrentInstruction('')
      setIsProcessing(false)
      historyRef.current = []
      prevInstructionRef.current = ''
      prevFrameRef.current = ''
      consecutiveCompleteRef.current = 0
      memoryRef.current = ''
      return
    }

    // Fire pre-flight research so Gemini starts with background context
    if (goal) {
      fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
        .then(r => r.json())
        .then((d: { research?: string }) => { if (d.research) memoryRef.current = d.research })
        .catch(() => {})
    }

    const video = document.createElement('video')
    video.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;'
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    document.body.appendChild(video)
    videoRef.current = video
    video.play().catch(console.error)

    video.addEventListener('loadedmetadata', () => {
      const canvas = analysisCanvasRef.current
      if (canvas && video.videoWidth > 0) {
        const scale = Math.min(1, CAPTURE_MAX_W / video.videoWidth, CAPTURE_MAX_H / video.videoHeight)
        canvas.width = Math.round(video.videoWidth * scale)
        canvas.height = Math.round(video.videoHeight * scale)
      }
    }, { once: true })

    const diffCanvas = document.createElement('canvas')
    diffCanvas.width = DIFF_WIDTH
    diffCanvas.height = DIFF_HEIGHT
    const diffCtx = diffCanvas.getContext('2d')

    // Thumbnail canvas for analytics keyframes
    const thumbCanvas = document.createElement('canvas')
    thumbCanvas.width = THUMB_W
    thumbCanvas.height = THUMB_H
    const thumbCtx = thumbCanvas.getContext('2d')

    let prevPixels: Uint8ClampedArray | null = null
    let lastCallTime = 0
    let isRunning = false
    let abortController: AbortController | null = null

    intervalRef.current = setInterval(() => {
      if (!diffCtx) return
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return

      diffCtx.drawImage(video, 0, 0, DIFF_WIDTH, DIFF_HEIGHT)
      const cur = diffCtx.getImageData(0, 0, DIFF_WIDTH, DIFF_HEIGHT).data

      const now = Date.now()
      const heartbeat = now - lastCallTime > HEARTBEAT_MS

      let changed = heartbeat
      let bigChange = false
      if (prevPixels) {
        let diffCount = 0
        for (let i = 0; i < cur.length; i += 4) {
          if (
            Math.abs(cur[i]     - prevPixels[i])     > PIXEL_DELTA ||
            Math.abs(cur[i + 1] - prevPixels[i + 1]) > PIXEL_DELTA ||
            Math.abs(cur[i + 2] - prevPixels[i + 2]) > PIXEL_DELTA
          ) diffCount++
        }
        const ratio = diffCount / (DIFF_WIDTH * DIFF_HEIGHT)
        bigChange = ratio > BIG_CHANGE_THRESHOLD
        if (!changed) changed = ratio > CHANGE_THRESHOLD
      }

      prevPixels = new Uint8ClampedArray(cur)

      if (!changed) return

      // If a big change happened while a request is in flight, abort and restart
      if (isRunning && bigChange && abortController) {
        abortController.abort()
        isRunning = false
      }

      if (isRunning) return

      const currentGoal = goalRef.current
      if (!currentGoal) return

      const canvas = analysisCanvasRef.current
      if (!canvas) return

      isRunning = true
      lastCallTime = now
      setIsProcessing(true)
      const myGeneration = generationRef.current

      const ctx = canvas.getContext('2d')
      if (!ctx) { isRunning = false; setIsProcessing(false); return }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]

      // Capture small keyframe for analytics (captured now, used in .then())
      let capturedKeyframe: string | null = null
      if (thumbCtx) {
        thumbCtx.drawImage(video, 0, 0, THUMB_W, THUMB_H)
        capturedKeyframe = thumbCanvas.toDataURL('image/jpeg', 0.6).split(',')[1]
      }

      abortController = new AbortController()
      // Consume pending context now (before async boundary) so it isn't sent twice
      const userContext = pendingContextRef.current
      pendingContextRef.current = ''

      fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, prevFrame: prevFrameRef.current, mimeType: 'image/jpeg', goal: currentGoal, history: historyRef.current, currentInstruction: prevInstructionRef.current, userContext: userContext || undefined, memory: memoryRef.current || undefined }),
        signal: abortController.signal,
      })
        .then(r => r.json())
        .then((result: { instruction?: string; bbox?: number[]; memory?: string }) => {
          // forceInstruction was called while this request was in flight — discard
          if (generationRef.current !== myGeneration) return

          const newInstruction = result.instruction ?? ''
          const isComplete = newInstruction === 'Goal complete'
          prevFrameRef.current = base64
          if (result.memory) memoryRef.current = result.memory

          if (isComplete) {
            consecutiveCompleteRef.current += 1
            // Wait for N consecutive confirmations before showing completion.
            // A false positive on a transitional frame will reset when the next
            // frame produces a different instruction.
            if (consecutiveCompleteRef.current < COMPLETIONS_REQUIRED) return
          } else {
            consecutiveCompleteRef.current = 0
          }

          // Analytics: when instruction changes, mark previous as acted and log new
          if (newInstruction !== prevInstructionRef.current) {
            const prevEventId = lastEventIdRef.current
            lastEventIdRef.current = null
            // Previous instruction was completed (user made progress or goal done)
            if (prevEventId) {
              fetch('/api/analytics', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: prevEventId, acted: true }),
              }).catch(() => {})
            }
            // Log new instruction (skip 'Goal complete' — it's not an actionable step)
            if (!isComplete && sessionIdRef.current) {
              fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: sessionIdRef.current,
                  goal: currentGoal,
                  instruction: newInstruction,
                  bbox: result.bbox ?? null,
                  screenshot: capturedKeyframe,
                }),
              })
                .then(r => r.json())
                .then((d: { id?: string }) => { if (d.id) lastEventIdRef.current = d.id })
                .catch(() => {})
            }
          }

          // When the instruction changes, the previous one was completed — record it
          if (prevInstructionRef.current && prevInstructionRef.current !== newInstruction) {
            historyRef.current = [...historyRef.current, prevInstructionRef.current].slice(-100)
          }
          prevInstructionRef.current = newInstruction
          setCurrentInstruction(newInstruction)
          const isTabSwitch = /switch.{0,20}tab|open.{0,20}(new tab|tab)/i.test(newInstruction)
          const isScroll = /\bscroll\b|\bswipe\b/i.test(newInstruction)
          if (!isTabSwitch && !isScroll && Array.isArray(result.bbox) && result.bbox.length === 4) {
            const [ymin, xmin, ymax, xmax] = result.bbox
            const origW = (xmax - xmin) / 1000
            const origH = (ymax - ymin) / 1000
            // Set coarse target immediately for responsive UI
            setTarget({
              x: xmin / 1000,
              y: ymin / 1000,
              width: origW,
              height: origH,
            })
            // Zoom-refine: crop the bbox region with padding and ask Gemini for precise center
            if (newInstruction !== 'Goal complete') {
              const canvas = analysisCanvasRef.current
              if (canvas && canvas.width > 0) {
                const PAD = 0.4
                const bw = xmax - xmin, bh = ymax - ymin
                const rx0 = Math.max(0, xmin - bw * PAD)
                const ry0 = Math.max(0, ymin - bh * PAD)
                const rx1 = Math.min(1000, xmax + bw * PAD)
                const ry1 = Math.min(1000, ymax + bh * PAD)
                const cropCanvas = document.createElement('canvas')
                cropCanvas.width = 400
                cropCanvas.height = 400
                const cropCtx = cropCanvas.getContext('2d')
                if (cropCtx) {
                  cropCtx.drawImage(
                    canvas,
                    (rx0 / 1000) * canvas.width, (ry0 / 1000) * canvas.height,
                    ((rx1 - rx0) / 1000) * canvas.width, ((ry1 - ry0) / 1000) * canvas.height,
                    0, 0, 400, 400,
                  )
                  const cropBase64 = cropCanvas.toDataURL('image/jpeg', 0.9).split(',')[1]
                  fetch('/api/refine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: cropBase64, instruction: newInstruction }),
                  })
                    .then(r => r.json())
                    .then((refined: { cx?: number; cy?: number }) => {
                      if (generationRef.current !== myGeneration) return
                      if (prevInstructionRef.current !== newInstruction) return
                      if (refined.cx == null || refined.cy == null) return
                      // Map refined center (within crop) back to full-image 0–1 coords
                      const fullX = (rx0 + (refined.cx / 1000) * (rx1 - rx0)) / 1000
                      const fullY = (ry0 + (refined.cy / 1000) * (ry1 - ry0)) / 1000
                      // Keep original bbox size but shift center to refined position
                      setTarget({
                        x: Math.max(0, fullX - origW / 2),
                        y: Math.max(0, fullY - origH / 2),
                        width: origW,
                        height: origH,
                      })
                    })
                    .catch(() => {})
                }
              }
            }
          } else {
            setTarget(null)
          }
        })
        .catch((err) => { if (err?.name !== 'AbortError') setTarget(null) })
        .finally(() => {
          isRunning = false
          lastCallTime = Date.now()
          setIsProcessing(false)
        })
    }, DIFF_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      abortController?.abort()
      document.body.removeChild(video)
      videoRef.current = null
      // Mark any pending analytics event as abandoned (session ended without completion)
      const pendingId = lastEventIdRef.current
      lastEventIdRef.current = null
      if (pendingId) {
        fetch('/api/analytics', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: pendingId, acted: false }),
        }).catch(() => {})
      }
    }
  }, [stream, setTarget])

  return { analysisCanvasRef, videoRef, isProcessing, currentInstruction, injectContext, forceInstruction }
}
