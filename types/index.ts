export interface WorkflowStep {
  step: number
  trigger: string
  instruction: string
}

export type ScreenShareStatus = 'idle' | 'active' | 'error' | 'ended'

export type PiPStatus = 'inactive' | 'active' | 'unsupported'
