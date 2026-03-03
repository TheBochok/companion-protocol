import { GoogleGenAI, Type } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

type ChatMsg = { role: 'user' | 'ai'; content: string }

export async function POST(req: NextRequest) {
  const { message, goal, currentInstruction, history = [] } = await req.json()

  if (!process.env.GEMINI_API_KEY)
    return NextResponse.json({ reply: '', instruction: '' }, { status: 500 })

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const historyText = (history as ChatMsg[]).length > 0
    ? (history as ChatMsg[]).map(m => `${m.role === 'user' ? 'User' : 'Via'}: ${m.content}`).join('\n') + '\n\n'
    : ''

  const prompt = `You are Via, a visual AI guide actively helping a user accomplish: "${goal}".${currentInstruction ? ` You are currently guiding them with: "${currentInstruction}".` : ''}

${historyText}User: ${message}

Return JSON with:
- "reply": a brief conversational response (1–2 sentences) acknowledging what they said or asked
- "instruction": the single most actionable next step the user should physically do right now to make progress. Use the same concise imperative format as visual guidance (e.g. "Click 'Credentials' in the left sidebar", "Navigate to console.cloud.google.com", "Paste the callback URL into the 'Authorized redirect URIs' field"). This should directly follow up on what the user asked — if they want to go somewhere, instruct them to go there; if they described a blocker, route around it. Never leave this empty.`

  try {
    const t0 = Date.now()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            instruction: { type: Type.STRING },
          },
          required: ['reply', 'instruction'],
        },
        thinkingConfig: { thinkingBudget: 0 },
      },
    })
    const result = JSON.parse(response.text ?? '{"reply":"","instruction":""}')
    console.log(`[chat] ${Date.now() - t0}ms | "${message.slice(0, 40)}" → reply="${result.reply?.slice(0, 50)}" instruction="${result.instruction?.slice(0, 50)}"`)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[chat] error:', err)
    return NextResponse.json({ reply: "Sorry, I couldn't process that.", instruction: '' })
  }
}
