import { GoogleGenAI, Type } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { imageBase64, prevFrame, mimeType, goal, history = [], currentInstruction = '' } = await req.json()
  const imageSizeKB = Math.round(imageBase64.length * 0.75 / 1024)
  console.log(`[vision] → request  mime=${mimeType} size=${imageSizeKB}KB goal="${goal}" history=${history.length}`)

  if (!process.env.GEMINI_API_KEY) {
    console.error('[vision] ✗ GEMINI_API_KEY is not set')
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const historySection = history.length > 0
    ? `Steps already completed:\n${history.map((s: string) => `- ${s}`).join('\n')}\n\n`
    : ''

  const currentSection = currentInstruction
    ? `Your current instruction to the user is: "${currentInstruction}"\n${prevFrame ? 'Compare the previous and current screenshots to detect whether the user has acted on this. ' : ''}Only change this if the user has clearly made progress (navigated to a new screen, completed the action). Otherwise return the exact same instruction and bbox.\n\n`
    : ''

  const prompt = `You are helping a user accomplish this goal: "${goal}"

${historySection}${currentSection}Analyze the current screenshot and identify the single best UI element the user should interact with NEXT to make progress toward the goal. Do not repeat steps that are already completed. Give exactly one action — never combine multiple actions into one instruction.

Keep guiding the user through every micro-step — never assume they will figure something out on their own. For example, after submitting a search query, wait for results to appear and then point to the most relevant result to click.

Return JSON with:
- "instruction": a specific, self-contained action the user can immediately follow (e.g. "Click the Search button", "Type 'AI alignment papers' in the search box", "Press Enter"). Always include the exact text to type when the action involves typing.
- "bbox": [ymin, xmin, ymax, xmax] with coordinates normalized 0–1000

Only set instruction to "Goal complete" (and omit "bbox") when the goal's final result is clearly visible on screen and confirmed — for example, the target page has loaded, the file has been saved, or the expected output is shown. Never declare completion just because an action was submitted; wait for the result.`

  try {
    const t0 = Date.now()
    const contents = prevFrame
      ? [
          { text: 'Previous screenshot:' },
          { inlineData: { mimeType, data: prevFrame } },
          { text: 'Current screenshot:' },
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt },
        ]
      : [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt },
        ]

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            instruction: { type: Type.STRING },
            bbox: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          },
          required: ['instruction'],
        },
        thinkingConfig: { thinkingBudget: 0 },
      },
    })

    const elapsed = Date.now() - t0
    const result = JSON.parse(response.text ?? '{"instruction":""}')
    console.log(`[vision] ← gemini   ${elapsed}ms | instruction="${result.instruction}" bbox=${JSON.stringify(result.bbox)}`)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[vision] ✗ Gemini API error:', err)
    return NextResponse.json({ error: 'Gemini API call failed' }, { status: 502 })
  }
}
