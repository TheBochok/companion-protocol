'use client'

import { useEffect, useRef, useState } from 'react'
import { useScreenShare } from '@/hooks/useScreenShare'
import { usePiP } from '@/hooks/usePiP'
import { useVision } from '@/hooks/useVision'
import { useCoordinateStore } from '@/store/coordinateStore'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  drawHello,
  drawScanning,
  drawConnectionLost,
  drawOverviewWithBox,
} from '@/lib/drawCanvas'

export default function CompanionApp() {
  const { stream, status, error, startSharing, stopSharing } = useScreenShare()
  const { outputCanvasRef, pipStatus, pipError, togglePiP } = usePiP()
  const [goal, setGoal] = useState('')
  const { analysisCanvasRef, videoRef, isProcessing, currentInstruction } = useVision(stream, goal)
  const { target } = useCoordinateStore()

  // Ref keeps the label fresh inside the rAF closure without restarting the loop
  const instructionRef = useRef(currentInstruction)
  useEffect(() => { instructionRef.current = currentInstruction }, [currentInstruction])

  // Resize output canvas to match the video stream's actual dimensions
  useEffect(() => {
    if (status !== 'active') return
    const video = videoRef.current
    const canvas = outputCanvasRef.current
    if (!video || !canvas) return

    function applySize() {
      if (video!.videoWidth > 0) {
        canvas!.width = video!.videoWidth
        canvas!.height = video!.videoHeight
      }
    }

    if (video.videoWidth > 0) {
      applySize()
    } else {
      video.addEventListener('loadedmetadata', applySize, { once: true })
      return () => video.removeEventListener('loadedmetadata', applySize)
    }
  }, [status, videoRef, outputCanvasRef])

  // Canvas loop — active whenever the stream is live
  useEffect(() => {
    if (status !== 'active') return

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
  }, [status, target, outputCanvasRef, videoRef])

  // Static canvas rendering — only for non-active states
  useEffect(() => {
    if (status === 'active') return

    const canvas = outputCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (status === 'ended') {
      drawConnectionLost(ctx)
    } else {
      drawHello(ctx)
    }
  }, [status, outputCanvasRef])

  // Keep "Hello World" timestamp updating when idle
  useEffect(() => {
    if (status !== 'idle' && status !== 'error') return
    const canvas = outputCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const id = setInterval(() => { drawHello(ctx) }, 1000)
    drawHello(ctx)
    return () => clearInterval(id)
  }, [status, outputCanvasRef])

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Companion Protocol</h1>

      {/* Goal input */}
      <div className="w-full max-w-lg">
        <input
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          placeholder='What do you want to do? e.g. "Search for a paper on AI"'
          value={goal}
          onChange={e => setGoal(e.target.value)}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-4 flex-wrap justify-center">
        {status === 'active' ? (
          <button
            onClick={stopSharing}
            className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold transition-colors"
          >
            Stop Sharing
          </button>
        ) : (
          <button
            onClick={startSharing}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition-colors"
          >
            Start Sharing
          </button>
        )}

        <button
          onClick={togglePiP}
          disabled={pipStatus === 'unsupported'}
          className="px-5 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pipStatus === 'active' ? 'Close Companion' : 'Toggle Companion Mode'}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm">Screen share error: {error}</p>
      )}
      {pipError && (
        <p className="text-orange-400 text-sm">PiP error: {pipError}</p>
      )}

      {/* PiP preview canvas */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <canvas
          ref={outputCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block"
        />
      </div>

      {/* Debug info */}
      <div className="w-full max-w-lg bg-gray-900 rounded-lg p-4 text-sm font-mono space-y-1">
        <p>
          <span className="text-gray-500">Status:</span>{' '}
          <span className={
            status === 'active' ? 'text-green-400' :
            status === 'ended' ? 'text-red-400' :
            status === 'error' ? 'text-orange-400' :
            'text-gray-400'
          }>
            {status}
          </span>
        </p>
        <p>
          <span className="text-gray-500">PiP:</span>{' '}
          <span className="text-gray-300">{pipStatus}</span>
        </p>
        <p>
          <span className="text-gray-500">Processing:</span>{' '}
          <span className="text-gray-300">{isProcessing ? 'yes' : 'no'}</span>
        </p>
        <p>
          <span className="text-gray-500">Next action:</span>{' '}
          <span className="text-yellow-300">{currentInstruction || '—'}</span>
        </p>
      </div>

      {/* Hidden analysis canvas */}
      <canvas
        ref={analysisCanvasRef}
        width={1280}
        height={720}
        className="hidden"
      />
    </main>
  )
}
