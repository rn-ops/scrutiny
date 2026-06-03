// app/api/context/route.ts

import { GoogleGenAI } from '@google/genai'

/**
 * POST /api/context
 * 
 * Generates a security-focused summary of a GitHub repository using Gemini AI.
 * Analyzes file structure and README to identify potential security concerns
 * and recommend review focus areas.
 * 
 * @param request - Next.js request object with { url: string, files: string[], readme?: string }
 * @returns JSON response with AI-generated security context or error message
 * 
 * @example
 * ```ts
 * const response = await fetch('/api/context', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     url: 'https://github.com/owner/repo',
 *     files: ['src/auth.ts', 'src/db.ts', ...],
 *     readme: '# Project Description...'
 *   })
 * })
 * const { context } = await response.json()
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

  const { url, files, readme } = payload as {
    url?: string
    files?: unknown
    readme?: string
  }

  // Validate required fields
  if (typeof url !== 'string' || !url.trim()) {
    return Response.json(
      { success: false, message: 'Missing or invalid repository URL' },
      { status: 400 }
    )
  }

  // Validate files is a non-empty array
  if (!Array.isArray(files) || files.length === 0) {
    return Response.json(
      { success: false, message: 'Missing or empty files array' },
      { status: 400 }
    )
  }

  // Validate API key is configured
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable is not set')
    return Response.json(
      { success: false, message: 'Gemini API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Initialize Gemini client with API key
    const ai = new GoogleGenAI({ apiKey })

    // Limit file tree to first 50 files to stay within token limits
    // Gemini 2.5 Flash has generous limits, but keeping it lean = faster + cheaper
    const MAX_FILES = 50
    const fileTree = files
      .slice(0, MAX_FILES)
      .filter((f): f is string => typeof f === 'string')
      .join('\n')
    
    const truncatedCount = files.length > MAX_FILES 
      ? files.length - MAX_FILES 
      : 0

    // Build prompt with truncation notice if needed
    let prompt = `You are a security-focused code reviewer. Given the following repository information, provide a brief security-minded summary.

Repository URL: ${url}

File Tree (first ${Math.min(MAX_FILES, files.length)} of ${files.length} files):
${fileTree}`

    if (truncatedCount > 0) {
      prompt += `\n\n(Note: ${truncatedCount} additional files omitted due to length limits)`
    }

    prompt += `\n\n${readme ? `README:\n${readme}` : '(No README found)'}

Provide a concise summary covering:
1. What this repository does (from a security perspective)
2. Key security concerns or risks based on file structure
3. Recommended focus areas for security review

Keep it to 2-3 paragraphs. Be direct, practical, and actionable.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Fast, cheap, and sufficient for summarization
      contents: prompt,
    })

    // response.text is the direct string output from Gemini
    const context = response.text ?? 'Unable to generate repository context'

    return Response.json({
      success: true,
      context
    })
  } catch (error) {
    console.error('Gemini API error:', error)
    
    // Provide user-friendly error message based on error type
    let message = 'Failed to generate repository context'
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        message = 'API quota exceeded. Please try again later.'
      } else if (error.message.includes('invalid') || error.message.includes('auth')) {
        message = 'Invalid API key configuration'
      } else if (error.message.includes('timeout')) {
        message = 'Request timed out. Please try again.'
      } else if (error.message.includes('rate limit')) {
        message = 'Rate limited. Please wait before retrying.'
      }
    }
    
    return Response.json(
      { success: false, message },
      { status: 500 }
    )
  }
}