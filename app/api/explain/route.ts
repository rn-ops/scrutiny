// app/api/explain/route.ts

import { GoogleGenAI } from '@google/genai'

/**
 * POST /api/explain
 * 
 * Generates an AI-powered security explanation for a code finding.
 * Uses Google's Gemini 2.5 Flash model to provide beginner-friendly
 * security analysis with attack scenarios and fix recommendations.
 * 
 * @param request - Next.js request object with explanation payload
 * @returns JSON response with AI-generated explanation or error message
 * 
 * @example
 * ```ts
 * const response = await fetch('/api/explain', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     title: 'SQL Injection Vulnerability',
 *     file: 'src/auth/login.ts',
 *     line: 42,
 *     code: 'const query = `SELECT * FROM users WHERE id = ${userId}`',
 *     snippet: '... surrounding code context ...'
 *   })
 * })
 * const { explanation } = await response.json()
 * ```
 */
export async function POST(request: Request) {
  // Parse request body with error handling for malformed JSON
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json(
      { success: false, message: 'Invalid JSON payload' },
      { status: 400 }
    )
  }

  const { title, file, line, code, snippet } = payload as {
    title?: string
    file?: string
    line?: number
    code?: string
    snippet?: string
  }

  // Validate all required fields are present
  if (!title || !file || !line || !code || !snippet) {
    return Response.json(
      { 
        success: false, 
        message: 'Missing explanation payload. Required: title, file, line, code, snippet' 
      },
      { status: 400 }
    )
  }

  // Check API key is configured in environment
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set in environment variables')
    return Response.json(
      { success: false, message: 'Gemini API key not configured' },
      { status: 500 }
    )
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    
    // Structured prompt ensures consistent, high-quality responses
    // Breaking into sections helps Gemini understand what we need
    const prompt = `You are a security analyst helping developers understand security findings.

Finding Type: ${title}
File: ${file}
Line: ${line}
Code: ${code}

Context snippet:
${snippet}

Explain the security issue with:
1. **Why risky** - What makes this pattern dangerous?
2. **Attack scenario** - How could an attacker exploit this?
3. **Better fix** - Show corrected code example
4. **Beginner explanation** - Simple terms for junior developers

Return as clean markdown with short sections. Be actionable and clear.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Fast and cheap for explanation generation
      contents: prompt,
    })

    // Gemini returns response.text as string - verified in testing
    const explanation = response.text ?? 'No explanation generated'
    
    return Response.json({ success: true, explanation })
  } catch (error) {
    console.error('Gemini API error:', error)
    
    // Don't expose internal error details to client
    const errorMessage = error instanceof Error && error.message.includes('API key')
      ? 'Invalid Gemini API key'
      : 'Failed to generate AI explanation'
    
    return Response.json(
      { success: false, message: errorMessage },
      { status: 500 }
    )
  }
}