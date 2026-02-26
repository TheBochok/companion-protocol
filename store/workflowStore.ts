import { create } from 'zustand'
import { workflow } from '@/lib/workflow'

interface WorkflowState {
  currentStep: number
  currentInstruction: string
  advance: () => void
  reset: () => void
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  currentStep: 0,
  currentInstruction: workflow[0].instruction,

  advance() {
    const { currentStep } = get()
    const nextStep = currentStep + 1
    if (nextStep >= workflow.length) return
    set({
      currentStep: nextStep,
      currentInstruction: workflow[nextStep].instruction,
    })
  },

  reset() {
    set({
      currentStep: 0,
      currentInstruction: workflow[0].instruction,
    })
  },
}))
