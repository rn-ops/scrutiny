import { GoogleGenAI } from '@google/genai'

export async function POST(request: Request) {
  const { title, file, line, code, snippet } = await request.json()

  if (!title || !file || !line || !code || !snippet) {
    return Response.json({ success: false, message: 'Missing explanation payload' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ success: false, message: 'Gemini API key not configured' }, { status: 500 })
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const prompt = `You are a security analyst helping developers understand security findings.

Finding Type: ${title}
File: ${file}
Line: ${line}
Code: ${code}

Context snippet:
${snippet}

Explain:
- Why risky
- Realistic attack scenario
- Better fix
- Beginner-friendly explanation

Return the answer as a short, clear markdown summary.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    return Response.json({ success: true, explanation: response.text })
  } catch (error) {
    console.error('Gemini explain API error:', error)
    return Response.json({ success: false, message: 'Failed to generate AI explanation' }, { status: 500 })
  }
}
