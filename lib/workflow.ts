import type { WorkflowStep } from '@/types'

export const workflow: WorkflowStep[] = [
  { step: 1, trigger: 'settings', instruction: "Click 'Settings' ⚙️ in the sidebar" },
  { step: 2, trigger: 'api keys', instruction: "Select 'API Keys' tab" },
  { step: 3, trigger: 'secret', instruction: 'DONE! Copy your key.' },
]
