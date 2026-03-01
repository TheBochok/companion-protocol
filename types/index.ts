export interface WorkflowStep {
  step: number
  trigger: string
  instruction: string
}

export type ScreenShareStatus = 'idle' | 'active' | 'error' | 'ended'

export type PiPStatus = 'inactive' | 'active' | 'unsupported'

export interface WordBox {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}
