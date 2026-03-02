import { GoogleGenAI, Type } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { imageBase64, prevFrame, mimeType, goal, history = [], currentInstruction = '', userContext = '' } = await req.json()
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

  const userContextSection = userContext
    ? `The user has added context about the current situation: "${userContext}"\nTake this into account when deciding the next instruction — for example, if they say an element is disabled or not clickable, suggest an alternative path.\n\n`
    : ''

  const prompt = `You are helping a user accomplish this goal: "${goal}"

${historySection}${currentSection}${userContextSection}Analyze the current screenshot and identify the single best UI element the user should interact with NEXT to make progress toward the goal. Do not repeat steps that are already completed. Give exactly one action — never combine multiple actions into one instruction.

Keep guiding the user through every micro-step — never assume they will figure something out on their own. For example, after submitting a search query, wait for results to appear and then point to the most relevant result to click.

IMPORTANT: If the screenshot shows the Via guidance app itself (e.g. a screen with "What do you want to do?", "Via is active", "End Guide", or a goal input box), the user has not yet navigated to the right place. Do NOT instruct them to interact with the Via UI. Instead, tell them to open a new browser tab and navigate to the website or application needed for the goal (e.g. "Open a new tab and go to vercel.com").

If the next step requires the user to switch to a different browser tab (e.g. to copy information from one site to another, or because a link opened in a new tab), say so explicitly: "Switch to the [tab name or description] tab". Only suggest a tab switch when it is genuinely necessary — not as a default behaviour.

Return JSON with:
- "instruction": a specific, self-contained action the user can immediately follow (e.g. "Click the Search button", "Type 'AI alignment papers' in the search box", "Press Enter"). Always include the exact text to type when the action involves typing.
- "bbox": [ymin, xmin, ymax, xmax] with coordinates normalized 0–1000

Be very strict about what "Goal complete" means — interpret the goal literally:
- If the goal says "download", the file must actually be downloading or saved (e.g. a download bar, save dialog, or confirmation is visible). Opening a PDF viewer or preview page is NOT a download.
- If the goal says "find" or "search", the relevant result must be visible on screen.
- If the goal says "open", the target must be open and loaded.
- If the goal says "send" or "submit", the confirmation of delivery must be visible.
- When in doubt, keep guiding. Only set instruction to "Goal complete" (and omit "bbox") when the literal outcome described in the goal is unambiguously achieved on screen. Never declare completion at an intermediate step.

FINAL CHECK before returning "Goal complete": Can you point to a specific UI element or message visible RIGHT NOW on screen that proves the goal is done — not just that the user is on the right track or close to done? If you cannot identify concrete, visible evidence, return the next guiding step instead.`

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
