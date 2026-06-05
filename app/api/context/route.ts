import { GoogleGenAI } from '@google/genai'

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 })
  }

  const { url, analysis, mode } = payload as {
    url?: string
    analysis?: unknown
    mode?: 'repo' | 'dev'
  }

  if (typeof url !== 'string' || !url.trim()) {
    return Response.json({ success: false, message: 'Missing or invalid repository URL' }, { status: 400 })
  }

  if (!analysis || typeof analysis !== 'object') {
    return Response.json({ success: false, message: 'Missing compact analysis payload' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ success: false, message: 'Gemini API key not configured' }, { status: 500 })
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const compact = JSON.stringify(analysis)
    const prompt = `You are a senior application security reviewer.

Use only this compact static-analysis payload. It includes security findings and AST-derived file/module metadata for files the user has scanned so far.

Mode: ${mode === 'dev' ? 'single pasted file / dev mode' : 'repository scan'}
Source: ${url}

Compact analysis JSON:
${compact}

Return concise markdown with:
1. Repository or file purpose in security terms
2. Highest-risk findings and why they matter
3. Architectural hotspots from module metadata
4. Practical next review steps

Do not ask for full source. Do not invent files that are not in the payload.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    })

    return Response.json({ success: true, context: response.text ?? 'Unable to generate insights' })
  } catch (error) {
    console.error('Gemini insights error:', error)
    return Response.json({ success: false, message: 'Failed to generate insights' }, { status: 500 })
  }
}
