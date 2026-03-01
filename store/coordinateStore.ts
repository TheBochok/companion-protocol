import { create } from 'zustand'

export interface Target {
  x: number
  y: number
  width: number
  height: number
}

export interface CropBox {
  x: number
  y: number
  width: number
  height: number
}

export function getCropBox(target: Target, padding = 50): CropBox {
  return {
    x: Math.max(0, target.x - padding),
    y: Math.max(0, target.y - padding),
    width: target.width + padding * 2,
    height: target.height + padding * 2,
  }
}

interface CoordinateStore {
  target: Target | null
  setTarget: (target: Target | null) => void
}

export const useCoordinateStore = create<CoordinateStore>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
}))
