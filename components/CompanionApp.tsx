'use client'

import { useEffect } from 'react'
import { useScreenShare } from '@/hooks/useScreenShare'
import { usePiP } from '@/hooks/usePiP'
import { useVision } from '@/hooks/useVision'
import { useGuide } from '@/hooks/useGuide'
import { workflow } from '@/lib/workflow'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  drawHello,
  drawInstruction,
  drawScanning,
  drawConnectionLost,
} from '@/lib/drawCanvas'

const ANALYSIS_WIDTH = 1280
const ANALYSIS_HEIGHT = 720

export default function CompanionApp() {
  const { stream, status, error, startSharing, stopSharing } = useScreenShare()
  const { outputCanvasRef, pipStatus, togglePiP } = usePiP()
  const { analysisCanvasRef, foundText, isProcessing } = useVision(stream)
  const { currentInstruction, currentStep } = useGuide(foundText)

  // Canvas rendering loop
  useEffect(() => {
    const canvas = outputCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (status === 'ended') {
      drawConnectionLost(ctx)
      return
    }

    if (status !== 'active') {
      drawHello(ctx)
      return
    }

    if (isProcessing || !foundText) {
      drawScanning(ctx)
      return
    }

    drawInstruction(ctx, currentInstruction, currentStep + 1, workflow.length)
  }, [status, isProcessing, foundText, currentInstruction, currentStep, outputCanvasRef])

  // Keep "Hello World" timestamp updating when idle
  useEffect(() => {
    if (status !== 'idle' && status !== 'error') return
    const canvas = outputCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const id = setInterval(() => {
      drawHello(ctx)
    }, 1000)
    drawHello(ctx)
    return () => clearInterval(id)
  }, [status, outputCanvasRef])

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Companion Protocol</h1>

      {/* Controls */}
      <div className="flex gap-4">
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
        <p className="text-red-400 text-sm">Error: {error}</p>
      )}

      {/* PiP preview canvas (visible on page as debug preview) */}
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
          <span className="text-gray-500">👀 Seeing:</span>{' '}
          <span className="text-yellow-300 break-all">
            {foundText ? `"${foundText.slice(0, 120)}${foundText.length > 120 ? '…' : ''}"` : '—'}
          </span>
        </p>
        <p>
          <span className="text-gray-500">Step {currentStep + 1} of {workflow.length}:</span>{' '}
          <span className="text-white">{currentInstruction}</span>
        </p>
      </div>

      {/* Hidden analysis canvas — sized for OCR resolution */}
      <canvas
        ref={analysisCanvasRef}
        width={ANALYSIS_WIDTH}
        height={ANALYSIS_HEIGHT}
        className="hidden"
      />
    </main>
  )
}
