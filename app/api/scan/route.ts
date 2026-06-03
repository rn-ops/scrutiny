// app/api/scan/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { fetchRepoTree, parseGithubRepoUrl } from '@/lib/github'

/**
 * POST /api/scan
 * 
 * Accepts a GitHub repository URL and returns the repository's file tree.
 * Used by the Scrutiny scanner to fetch source files for analysis.
 * 
 * @param request - Next.js request object containing { url: string } in body
 * @returns JSON response with { success: boolean, files?: FileNode[], message?: string }
 * 
 * @example
 * ```ts
 * const response = await fetch('/api/scan', {
 *   method: 'POST',
 *   body: JSON.stringify({ url: 'https://github.com/owner/repo' })
 * })
 * const { files } = await response.json()
 * ```
 * 
 * @see {@link parseGithubRepoUrl} - Extracts owner/repo from URL
 * @see {@link fetchRepoTree} - Recursively fetches GitHub file tree
 */
export async function POST(request: NextRequest) {
  // Parse request body (silent fail - body may be malformed or missing)
  const body = await request.json().catch(() => null)
  const repoUrl = body?.url

  // Validate: URL must be present and non-empty
  if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
    return NextResponse.json(
      { success: false, message: 'Missing repository URL' },
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

  // Attempt to fetch file tree from GitHub API
  try {
    const files = await fetchRepoTree(repo.owner, repo.repo)
    return NextResponse.json({ success: true, files })
  } catch (error) {
    // Log full error for debugging, but return safe message to client
    console.error('Scan route error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unable to fetch repository files' 
      },
      { status: 502 } // 502 Bad Gateway - GitHub API likely failed
    )
  }
}