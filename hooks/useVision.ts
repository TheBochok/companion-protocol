'use client'

import { useRef, useState, useEffect } from 'react'
import { createWorker } from 'tesseract.js'

const ANALYSIS_WIDTH = 1280
const ANALYSIS_HEIGHT = 720

interface UseVisionReturn {
  analysisCanvasRef: React.RefObject<HTMLCanvasElement>
  foundText: string
  isProcessing: boolean
}

export function useVision(stream: MediaStream | null): UseVisionReturn {
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null)
  const [foundText, setFoundText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const workerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize Tesseract worker once
  useEffect(() => {
    let mounted = true

    async function initWorker() {
      const worker = await createWorker('eng', 1)
      if (mounted) {
        workerRef.current = worker
      } else {
        await worker.terminate()
      }
    }

    initWorker().catch(console.error)

    return () => {
      mounted = false
      workerRef.current?.terminate().catch(() => {})
      workerRef.current = null
    }
  }, [])

  // OCR loop — runs when stream is active
  useEffect(() => {
    if (!stream) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setFoundText('')
      setIsProcessing(false)
      return
    }

    // Create a hidden video element for frame extraction
    const video = document.createElement('video')
    video.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;'
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    document.body.appendChild(video)
    video.play().catch(console.error)

    intervalRef.current = setInterval(async () => {
      const canvas = analysisCanvasRef.current
      const worker = workerRef.current
      if (!canvas || !worker) return
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      try {
        setIsProcessing(true)
        ctx.drawImage(video, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT)
        const result = await worker.recognize(canvas)
        setFoundText(result.data.text.toLowerCase().trim())
      } catch {
        // Ignore transient OCR errors
      } finally {
        setIsProcessing(false)
      }
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      document.body.removeChild(video)
    }
  }, [stream])

  return { analysisCanvasRef, foundText, isProcessing }
}
