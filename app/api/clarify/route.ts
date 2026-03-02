import { GoogleGenAI, Type } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a pre-flight assistant for a visual screen guidance tool called Via.
Your ONLY job: decide if the user's goal is specific enough to begin guiding, or ask ONE clarifying question.

A goal is ready when:
- The target application or website is identifiable (or doesn't matter)
- The desired end-state is unambiguous
- There is no dangerous ambiguity about what counts as "done"

A goal needs clarification when it is genuinely vague (e.g. "do something in AWS", "use Figma") and knowing one extra fact would meaningfully improve guidance.

Rules:
- Ask AT MOST one short, friendly question (under 15 words)
- Default to ready=true when in doubt — do not be annoying
- If the conversation history shows the user already answered a clarifying question, return ready=true
- Never ask multiple questions in one turn`

export async function POST(req: NextRequest) {
  const { goal, history = [] } = await req.json()

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ ready: true })
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  // Build a single user turn that summarises the conversation
  const conversationText = history.length > 0
    ? history.map((m: { role: string; content: string }) =>
        `${m.role === 'ai' ? 'Via' : 'User'}: ${m.content}`
      ).join('\n')
    : ''

  const userTurn = `Goal: "${goal}"${conversationText ? `\n\nConversation so far:\n${conversationText}` : ''}`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: userTurn }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ready: { type: Type.BOOLEAN },
            question: { type: Type.STRING },
          },
          required: ['ready'],
        },
        thinkingConfig: { thinkingBudget: 0 },
      },
    })

    const result = JSON.parse(response.text ?? '{"ready":true}')
    return NextResponse.json(result)
  } catch (err) {
    console.error('[clarify] Gemini error:', err)
    // Fail open — don't block the user
    return NextResponse.json({ ready: true })
  }
}
