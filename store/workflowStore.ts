import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { workflow as defaultWorkflow } from '@/lib/workflow'
import type { WorkflowStep } from '@/types'

interface WorkflowState {
  steps: WorkflowStep[]
  currentStep: number
  currentInstruction: string
  advance: () => void
  reset: () => void
  addStep: () => void
  updateStep: (index: number, field: 'trigger' | 'instruction', value: string) => void
  removeStep: (index: number) => void
  resetToDefaults: () => void
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      steps: defaultWorkflow,
      currentStep: 0,
      currentInstruction: defaultWorkflow[0].instruction,

      advance() {
        const { currentStep, steps } = get()
        const next = currentStep + 1
        if (next >= steps.length) return
        set({ currentStep: next, currentInstruction: steps[next].instruction })
      },

      reset() {
        const { steps } = get()
        set({ currentStep: 0, currentInstruction: steps[0]?.instruction ?? '' })
      },

      addStep() {
        const { steps } = get()
        set({ steps: [...steps, { step: steps.length + 1, trigger: '', instruction: '' }] })
      },

      updateStep(index, field, value) {
        const { steps, currentStep, currentInstruction } = get()
        const updated = steps.map((s, i) => i === index ? { ...s, [field]: value } : s)
        const newInstruction = field === 'instruction' && index === currentStep ? value : currentInstruction
        set({ steps: updated, currentInstruction: newInstruction })
      },

      removeStep(index) {
        const { steps, currentStep } = get()
        const updated = steps
          .filter((_, i) => i !== index)
          .map((s, i) => ({ ...s, step: i + 1 }))
        const newStep = Math.min(currentStep, Math.max(0, updated.length - 1))
        set({ steps: updated, currentStep: newStep, currentInstruction: updated[newStep]?.instruction ?? '' })
      },

      resetToDefaults() {
        set({ steps: defaultWorkflow, currentStep: 0, currentInstruction: defaultWorkflow[0].instruction })
      },
    }),
    {
      name: 'companion-workflow',
      partialize: (state) => ({ steps: state.steps }),
    }
  )
)
