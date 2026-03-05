import { GoogleGenAI, Type } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType = 'image/jpeg', instruction } = await req.json()

  if (!process.env.GEMINI_API_KEY || !imageBase64 || !instruction) {
    return NextResponse.json({ cx: 500, cy: 500 })
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  try {
    const t0 = Date.now()
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: `The user needs to: "${instruction}"\n\nThis is a zoomed-in crop of the screen centered on the target element. Return the exact center point (cx, cy) where the user should click. Coordinates are normalized 0–1000.` },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cx: { type: Type.NUMBER },
            cy: { type: Type.NUMBER },
          },
          required: ['cx', 'cy'],
        },
        thinkingConfig: { thinkingBudget: 0 },
      },
    })

    const elapsed = Date.now() - t0
    const result = JSON.parse(response.text ?? '{"cx":500,"cy":500}')
    console.log(`[refine] ${elapsed}ms cx=${result.cx} cy=${result.cy}`)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[refine] error:', err)
    return NextResponse.json({ cx: 500, cy: 500 })
  }
}
