'use client'

import { useEffect } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'

interface UseGuideReturn {
  currentInstruction: string
  currentStep: number
}

export function useGuide(foundText: string): UseGuideReturn {
  const { currentStep, currentInstruction, steps, advance } = useWorkflowStore()

  useEffect(() => {
    if (!foundText) return
    if (currentStep >= steps.length) return
    const trigger = steps[currentStep].trigger
    if (trigger && foundText.includes(trigger)) {
      advance()
    }
  }, [foundText, currentStep, steps, advance])

  return { currentInstruction, currentStep }
}
