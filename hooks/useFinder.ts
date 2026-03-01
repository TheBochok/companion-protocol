'use client'

import { useEffect } from 'react'
import { useCoordinateStore } from '@/store/coordinateStore'
import type { WordBox } from '@/types'

export function useFinder(foundWords: WordBox[], searchTarget: string): void {
  const setTarget = useCoordinateStore((s) => s.setTarget)

  useEffect(() => {
    const lower = searchTarget.toLowerCase()
    const match = foundWords.find((w) => w.text.includes(lower))
    console.log(`[finder] looking for "${lower}" in ${foundWords.length} words →`, match
      ? `FOUND at (${Math.round(match.bbox.x0)},${Math.round(match.bbox.y0)}) ${Math.round(match.bbox.x1 - match.bbox.x0)}x${Math.round(match.bbox.y1 - match.bbox.y0)}`
      : 'not found'
    )

    if (match) {
      setTarget({
        x: match.bbox.x0,
        y: match.bbox.y0,
        width: match.bbox.x1 - match.bbox.x0,
        height: match.bbox.y1 - match.bbox.y0,
      })
    } else {
      setTarget(null)
    }
  }, [foundWords, searchTarget, setTarget])
}
