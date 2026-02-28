'use client'

import { useWorkflowStore } from '@/store/workflowStore'

export default function WorkflowEditor() {
  const { steps, addStep, updateStep, removeStep, resetToDefaults } = useWorkflowStore()

  return (
    <div className="w-full max-w-2xl bg-gray-900 rounded-lg p-4 text-sm space-y-3">
      <h2 className="text-gray-400 font-semibold uppercase tracking-wider text-xs">Workflow Steps</h2>
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-gray-500 w-5 shrink-0">{i + 1}.</span>
          <input
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-28 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500"
            placeholder="trigger"
            value={step.trigger}
            onChange={e => updateStep(i, 'trigger', e.target.value)}
          />
          <input
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 flex-1 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500"
            placeholder="instruction shown in PiP"
            value={step.instruction}
            onChange={e => updateStep(i, 'instruction', e.target.value)}
          />
          <button
            onClick={() => removeStep(i)}
            className="text-gray-600 hover:text-red-400 transition-colors px-1"
            title="Remove step"
          >✕</button>
        </div>
      ))}
      <div className="flex gap-3 pt-1">
        <button
          onClick={addStep}
          className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >+ Add Step</button>
        <button
          onClick={resetToDefaults}
          className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-500 transition-colors"
        >Reset to defaults</button>
      </div>
    </div>
  )
}
