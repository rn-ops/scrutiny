// app/api/file/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getFileContent, parseGithubRepoUrl } from '@/lib/github'

/**
 * POST /api/file
 * 
 * Fetches the raw content of a specific file from a GitHub repository.
 * Used by the Scrutiny scanner to retrieve individual file contents for analysis.
 * 
 * @param request - Next.js request object containing { url: string, path: string } in body
 * @returns JSON response with { success: boolean, path?: string, content?: string, message?: string }
 * 
 * @example
 * ```ts
 * const response = await fetch('/api/file', {
 *   method: 'POST',
 *   body: JSON.stringify({ 
 *     url: 'https://github.com/owner/repo',
 *     path: 'src/index.ts'
 *   })
 * })
 * const { content } = await response.json()
 * ```
 * 
 * @see {@link parseGithubRepoUrl} - Extracts owner/repo from URL
 * @see {@link getFileContent} - Fetches raw file content from GitHub API
 */
export async function POST(request: NextRequest) {
  // Parse request body (silent fail - body may be malformed or missing)
  const body = await request.json().catch(() => null)
  const repoUrl = body?.url
  const filePath = body?.path

  // Validate: Repository URL must be present and non-empty
  if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
    return NextResponse.json(
      { success: false, message: 'Missing repository URL' },
      { status: 400 }
    )
  }

  // Validate: File path must be present and non-empty
  if (typeof filePath !== 'string' || !filePath.trim()) {
    return NextResponse.json(
      { success: false, message: 'Missing file path' },
      { status: 400 }
    )
  }

  // Validate: URL must be a valid GitHub repository format
  const repo = parseGithubRepoUrl(repoUrl.trim())
  if (!repo) {
    return NextResponse.json(
      { success: false, message: 'Invalid GitHub repository URL' },
      { status: 400 }
    )
  }

  // Attempt to fetch file content from GitHub API
  try {
    const content = await getFileContent(repo.owner, repo.repo, filePath)
    return NextResponse.json({ success: true, path: filePath, content })
  } catch (error) {
    // Log full error for debugging, but return safe message to client
    console.error('Failed to fetch file content:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Unable to fetch file content' 
      },
      { status: 502 } // 502 Bad Gateway - GitHub API likely failed
    )
  }
}