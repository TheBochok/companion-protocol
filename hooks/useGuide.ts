'use client'

import { useEffect } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { workflow } from '@/lib/workflow'

interface UseGuideReturn {
  currentInstruction: string
  currentStep: number
}

export function useGuide(foundText: string): UseGuideReturn {
  const { currentStep, currentInstruction, advance } = useWorkflowStore()

  useEffect(() => {
    if (!foundText) return
    if (currentStep >= workflow.length) return

    const trigger = workflow[currentStep].trigger
    if (foundText.includes(trigger)) {
      advance()
    }
  }, [foundText, currentStep, advance])

  return { currentInstruction, currentStep }
}
