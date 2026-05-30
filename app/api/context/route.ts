// 1. Change the import to the new SDK
import { GoogleGenAI } from '@google/genai'

export async function POST(request: Request) {
  const { url, files, readme } = await request.json()

  if (!url || !files || files.length === 0) {
    return Response.json(
      { success: false, message: 'Missing URL or files' },
      { status: 400 }
    )
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json(
      { success: false, message: 'Gemini API key not configured' },
      { status: 500 }
    )
  }

  try {
    // 2. Initialize the new GoogleGenAI client
    const ai = new GoogleGenAI({ apiKey })

    const fileTree = files.slice(0, 50).join('\n')

    const prompt = `You are a security-focused code reviewer. Given the following repository information, provide a brief security-minded summary.

Repository URL: ${url}

File Tree (first 50 files):
${fileTree}

${readme ? `README:\n${readme}` : '(No README found)'}

Provide a concise summary covering:
1. What this repository does (security perspective)
2. Key security concerns or risks based on file structure
3. Recommended focus areas for security review

Keep it to 2-3 paragraphs. Be direct and practical.`

    // 3. Update the method call pattern and pass the model inside the config object
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    // 4. Access the text directly from the response object
    const text = response.text

    return Response.json({
      success: true,
      context: text
    })
  } catch (error) {
    console.error('Gemini API error:', error)
    return Response.json(
      { success: false, message: 'Failed to generate repository context' },
      { status: 500 }
    )
  }
}
