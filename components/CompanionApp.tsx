'use client'

import { useEffect, useRef } from 'react'
import { useScreenShare } from '@/hooks/useScreenShare'
import { usePiP } from '@/hooks/usePiP'
import { useVision } from '@/hooks/useVision'
import { useGuide } from '@/hooks/useGuide'
import { useCoordinateStore, getCropBox } from '@/store/coordinateStore'
import { useFinder } from '@/hooks/useFinder'
import { useWorkflowStore } from '@/store/workflowStore'
import WorkflowEditor from '@/components/WorkflowEditor'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  drawHello,
  drawScanning,
  drawConnectionLost,
  drawZoomedView,
} from '@/lib/drawCanvas'

const ANALYSIS_WIDTH = 1280
const ANALYSIS_HEIGHT = 720

export default function CompanionApp() {
  const { stream, status, error, startSharing, stopSharing } = useScreenShare()
  const { outputCanvasRef, pipStatus, pipError, togglePiP } = usePiP()
  const { analysisCanvasRef, videoRef, foundText, foundWords, isProcessing } = useVision(stream)
  const { currentInstruction, currentStep } = useGuide(foundText)
  const stepsLength = useWorkflowStore(s => s.steps.length)
  useFinder(foundWords, 'search')
  const { target } = useCoordinateStore()

  // Ref keeps the label fresh inside the rAF closure without restarting the loop
  const instructionRef = useRef(currentInstruction)
  useEffect(() => { instructionRef.current = currentInstruction }, [currentInstruction])

  // Canvas loop — active whenever the stream is live
  useEffect(() => {
    if (status !== 'active') return

    const canvas = outputCanvasRef.current
    const video = videoRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // No target yet — show a static "Searching..." frame and wait
    if (!target || !video) {
      drawScanning(ctx)
      return
    }

    const cropBox = getCropBox(target)
    let rafId: number

    function draw() {
      if (video!.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        drawZoomedView(ctx!, video!, target!, cropBox, instructionRef.current)
      }
      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [status, target, outputCanvasRef, videoRef])  // target in deps: restarts rAF whenever coordinates change

  // Static canvas rendering — only for non-active states (active is handled by rAF loop)
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
          <span className="text-gray-500">Step {currentStep + 1} of {stepsLength}:</span>{' '}
          <span className="text-white">{currentInstruction}</span>
        </p>
      </div>

      <WorkflowEditor />

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
