import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { goal } = await req.json()
  if (!goal?.trim()) return NextResponse.json({ research: '' })

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ research: '' })
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const prompt = `A user wants to accomplish this goal on their computer: "${goal}"

Research this task and provide a concise briefing covering:
- What application or website they will most likely be using
- The typical workflow or sequence of steps to accomplish this goal
- Where key settings, menus, or features are located
- Any important terminology, pitfalls, or prerequisites
- Relevant URLs to navigate to, if applicable

Be factual and brief. This will be used as background context for a visual AI guide that watches the user's screen.`

  try {
    const t0 = Date.now()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ text: prompt }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    })
    const elapsed = Date.now() - t0
    const research = response.text ?? ''
    console.log(`[research] goal="${goal}" ${elapsed}ms ${research.length}ch`)
    return NextResponse.json({ research })
  } catch (err) {
    console.error('[research] error:', err)
    return NextResponse.json({ research: '' })
  }
}
